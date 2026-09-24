// A "bonus" is free goods handed to a client along with a sale (ShantiSale.bonusItems). The client
// pays nothing for it, but it isn't free to us: it leaves finished-goods stock exactly like a sold
// item, and its cost is booked as a cash expense in the "Бонус" category. Each sale with bonus
// lines owns exactly ONE linked ShantiExpense (ShantiExpense.saleId), kept in sync here on every
// create/edit/delete of the sale, so Expenses, the cash balance and the dashboard all pick it up
// without knowing bonuses exist.
import ShantiProduct from "../models/ShantiProduct.js"
import ShantiExpense from "../models/ShantiExpense.js"
import ShantiExpenseCategory from "../models/ShantiExpenseCategory.js"

export const BONUS_EXPENSE_CATEGORY = 'Бонус'

// Validates the bonus lines and resolves each one's per-unit cost. The user only picks product and
// quantity - any `price` sent by the client is deliberately ignored, the price is never user input.
// Precedence: the price already saved for that product on this sale (so re-saving an old sale never
// silently reprices a past expense), else the product's catalog price, else - for products whose
// catalog price is 0 - the price that same product was sold at on THIS sale. Refuses to save a line
// that still ends up with no price, since it would book a zero-cost expense.
// Returns { items } or { error }.
export const resolveBonusItems = async (bonusItems, saleItems, existingBonusItems = []) => {
    if (!Array.isArray(bonusItems)) return { error: 'invalid_bonus_item' }
    const items = []
    for (const line of bonusItems) {
        const quantity = Number(line?.quantity)
        if (!line?.productId || !(quantity > 0)) return { error: 'invalid_bonus_item' }
        const product = await ShantiProduct.findById(line.productId).select('price').lean()
        if (!product) return { error: 'product_not_found' }
        const saved = existingBonusItems.find(i => String(i.productId) === String(line.productId) && i.price > 0)?.price
        const soldAt = saleItems.find(i => String(i.productId) === String(line.productId) && i.price > 0)?.price
        const price = saved || (product.price > 0 ? product.price : (soldAt || 0))
        if (!(price > 0)) return { error: 'bonus_price_required' }
        items.push({ productId: line.productId, quantity, price })
    }
    return { items }
}

const bonusCost = (bonusItems) => bonusItems.reduce((sum, i) => sum + i.quantity * i.price, 0)

// brings the sale's linked expense in line with its current bonusItems: created on the first bonus,
// updated as the bonus/date/client change, removed once the sale has no bonus left. Category is
// only set on creation, so renaming the "Бонус" category by hand isn't undone on the next edit.
export const syncBonusExpense = async (sale, clientName, createdBy) => {
    const existing = await ShantiExpense.findOne({ saleId: sale._id })
    const amount = bonusCost(sale.bonusItems)
    if (!(amount > 0)) {
        if (existing) await existing.deleteOne()
        return
    }

    const products = await ShantiProduct.find({ _id: { $in: sale.bonusItems.map(i => i.productId) } }).select('name').lean()
    const nameById = Object.fromEntries(products.map(p => [String(p._id), p.name]))
    const comment = `${clientName}: ${sale.bonusItems.map(i => `${nameById[String(i.productId)] || '?'} ×${i.quantity}`).join(', ')}`

    if (existing) {
        existing.amount = amount
        existing.date = sale.date
        existing.comment = comment
        await existing.save()
        return
    }
    await ShantiExpenseCategory.findOneAndUpdate(
        { name: BONUS_EXPENSE_CATEGORY },
        { $setOnInsert: { name: BONUS_EXPENSE_CATEGORY, color: '#F59E0B' } },
        { upsert: true }
    )
    await ShantiExpense.create({
        category: BONUS_EXPENSE_CATEGORY, amount, date: sale.date, method: 'cash', methodBreakdown: [],
        saleId: sale._id, comment, createdBy,
    })
}

export const removeBonusExpense = (saleId) => ShantiExpense.deleteOne({ saleId })
