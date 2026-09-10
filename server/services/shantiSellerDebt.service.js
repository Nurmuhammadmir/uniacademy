// A seller's real outstanding debt is our unpaid purchase balance with them minus whatever we've
// since paid down via a seller-linked expense (ShantiExpense.sellerId) - the exact mirror of
// shantiDebt.service.js on the client/sales side. Expenses never touch the Purchase documents
// themselves, so this is computed fresh on every read.
import ShantiPurchase from "../models/ShantiPurchase.js"
import ShantiExpense from "../models/ShantiExpense.js"

export const getSellerDebtMap = async () => {
    const [purchaseAgg, expenseAgg] = await Promise.all([
        ShantiPurchase.aggregate([
            { $match: { sellerId: { $ne: null } } },
            { $addFields: { debt: { $subtract: ['$amount', '$paidAmount'] } } },
            { $group: { _id: '$sellerId', purchaseDebt: { $sum: '$debt' }, purchaseCount: { $sum: { $cond: [{ $gt: ['$debt', 0] }, 1, 0] } } } },
        ]),
        ShantiExpense.aggregate([
            { $match: { sellerId: { $ne: null } } },
            { $group: { _id: '$sellerId', paid: { $sum: '$amount' } } },
        ]),
    ])
    const paidMap = Object.fromEntries(expenseAgg.map(e => [String(e._id), e.paid]))
    const map = new Map()
    for (const row of purchaseAgg) {
        const id = String(row._id)
        map.set(id, { debt: row.purchaseDebt - (paidMap[id] || 0), purchaseCount: row.purchaseCount })
    }
    return map
}

export const getSellerDebt = async (sellerId) => {
    const map = await getSellerDebtMap()
    return map.get(String(sellerId))?.debt || 0
}
