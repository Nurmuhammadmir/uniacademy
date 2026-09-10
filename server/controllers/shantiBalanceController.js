// LasummaShanti's real cash position by payment method - shown persistently in the navbar. A
// sale's paidAmount is real money IN (however it was actually paid), a purchase's paidAmount is
// real money OUT - the balance for a method is just sales minus purchases actually paid that way,
// same idiom as the school's businessLedger.service.js byMethod breakdown.
import ShantiPurchase from "../models/ShantiPurchase.js"
import ShantiSale from "../models/ShantiSale.js"
import ShantiPayment from "../models/ShantiPayment.js"
import ShantiBalanceAdjustment from "../models/ShantiBalanceAdjustment.js"
import ShantiExpense from "../models/ShantiExpense.js"
import { SHANTI_METHODS } from "../models/shantiConstants.js"
import { methodBreakdownAggregation } from "../services/shantiMethodBreakdown.service.js"

export const getBalance = async (req, res) => {
    try {
        const [purchaseAgg, saleAgg, paymentAgg, adjustmentAgg, expenseAgg] = await Promise.all([
            ShantiPurchase.aggregate(methodBreakdownAggregation('paidAmount')),
            ShantiSale.aggregate(methodBreakdownAggregation('paidAmount')),
            ShantiPayment.aggregate(methodBreakdownAggregation('amount')),
            ShantiBalanceAdjustment.aggregate(methodBreakdownAggregation('amount')),
            ShantiExpense.aggregate(methodBreakdownAggregation('amount')),
        ])
        const purchaseByMethod = Object.fromEntries(purchaseAgg.map(r => [r._id, r.total]))
        const saleByMethod = Object.fromEntries(saleAgg.map(r => [r._id, r.total]))
        const paymentByMethod = Object.fromEntries(paymentAgg.map(r => [r._id, r.total]))
        const adjustmentByMethod = Object.fromEntries(adjustmentAgg.map(r => [r._id, r.total]))
        const expenseByMethod = Object.fromEntries(expenseAgg.map(r => [r._id, r.total]))
        const balance = Object.fromEntries(SHANTI_METHODS.map(m => [m,
            (saleByMethod[m] || 0) + (paymentByMethod[m] || 0) + (adjustmentByMethod[m] || 0)
            - (purchaseByMethod[m] || 0) - (expenseByMethod[m] || 0),
        ]))
        res.json({ balance })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
