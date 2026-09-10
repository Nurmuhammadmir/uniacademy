// A client's real outstanding debt is their unpaid sales balance minus whatever debt-collection
// payments (ShantiPayment) have since come in against them - payments never touch the Sale
// documents themselves, so this is computed fresh on every read, same idiom as amount-paidAmount
// elsewhere in Shanti. Shared by the debtors list, dashboard summary, and payment validation so
// there is exactly one definition of "how much does this client owe".
import ShantiSale from "../models/ShantiSale.js"
import ShantiPayment from "../models/ShantiPayment.js"

export const getClientDebtMap = async () => {
    const [saleAgg, paymentAgg] = await Promise.all([
        ShantiSale.aggregate([
            { $addFields: { debt: { $subtract: ['$amount', '$paidAmount'] } } },
            { $group: { _id: '$clientId', saleDebt: { $sum: '$debt' }, saleCount: { $sum: { $cond: [{ $gt: ['$debt', 0] }, 1, 0] } } } },
        ]),
        ShantiPayment.aggregate([
            { $group: { _id: '$clientId', paid: { $sum: '$amount' } } },
        ]),
    ])
    const paidMap = Object.fromEntries(paymentAgg.map(p => [String(p._id), p.paid]))
    const map = new Map()
    for (const row of saleAgg) {
        const id = String(row._id)
        map.set(id, { debt: row.saleDebt - (paidMap[id] || 0), saleCount: row.saleCount })
    }
    return map
}

export const getClientDebt = async (clientId) => {
    const map = await getClientDebtMap()
    return map.get(String(clientId))?.debt || 0
}
