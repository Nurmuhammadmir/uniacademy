import orderModel from '../models/LamusOrder.js'
import clientModel from '../models/LamusClient.js'
import { getOrCreateStock } from './lamusStockController.js'
import financialSettingsModel from '../models/LamusFinancialSettings.js'
import financialTransactionModel from '../models/LamusFinancialTransaction.js'

const ORDER_PAYMENT_METHODS = ['cash', 'card', 'transfer', 'later']

// record a delivery - unlike addClient, an order never needs the caller to pick a manager: the
// client being delivered to already has one (set when the client was created), so an admin
// recording an order just inherits that client's existing manager rather than choosing separately
// (keeps every one of a client's orders attributed to the same manager as the client itself).
export const recordOrder = async (req, res) => {
  try {
    const { clientId, notes, paymentAmount = 0, paymentMethod = 'later' } = req.body
    const client = await clientModel.findById(clientId)
    if (!client) return res.json({ success: false, message: 'Client not found' })
    // a manager can only ever record deliveries for their own clients - without this, any manager
    // could (by guessing/reusing a clientId) move bottles/money on a client they don't actually
    // serve, and the order would end up attributed to the WRONG manager (ownerId below), silently
    // disagreeing with the client's own managerId. Admin has no such restriction (route-level scope).
    if (req.userRole !== 'admin' && client.managerId.toString() !== req.userId) {
      return res.json({ success: false, message: 'Not authorized' })
    }
    const ownerId = req.userRole === 'admin' ? client.managerId : req.userId

    // bottlesGiven/bottlesReturned/paymentAmount previously flowed straight from req.body with no
    // validation at all - a missing/garbage value silently produced NaN, which would then corrupt
    // client.bottlesHeld and the warehouse stock count via $inc (NaN propagates through arithmetic
    // forever once it lands in a stored total). Confirmed real gap, not just theoretical.
    const given = Number(req.body.bottlesGiven)
    const returned = Number(req.body.bottlesReturned)
    if (!Number.isInteger(given) || given < 0) return res.json({ success: false, message: 'Bottles given must be a whole number, 0 or more' })
    if (!Number.isInteger(returned) || returned < 0) return res.json({ success: false, message: 'Bottles returned must be a whole number, 0 or more' })
    const paid = Number(paymentAmount)
    if (!Number.isFinite(paid) || paid < 0) return res.json({ success: false, message: 'Payment amount must be a number, 0 or more' })
    if (!ORDER_PAYMENT_METHODS.includes(paymentMethod)) return res.json({ success: false, message: 'Invalid payment method' })
    // a client can't physically return more empty bottles than they're actually holding - almost
    // always a typo (e.g. 20 instead of 2), and letting it through drives bottlesHeld negative,
    // which then corrupts every later order's own math for this client.
    if (returned > 0 && returned > client.bottlesHeld) return res.json({ success: false, message: "Can't return more bottles than the client currently holds" })
    // nothing given, nothing returned, nothing paid - there's genuinely nothing to record. A
    // payment-only visit (given=0, returned=0, paymentAmount>0 - collecting a debt payment with no
    // delivery) is a legitimate real case and stays allowed.
    if (given === 0 && returned === 0 && paid === 0) return res.json({ success: false, message: 'Nothing to record - set bottles given/returned or a payment amount' })

    const settings = await financialSettingsModel.findOne({}) || await financialSettingsModel.create({})
    const saleAmount = given * settings.bottlePrice
    const net = given - returned
    const order = new orderModel({
      clientId,
      managerId: ownerId,
      bottlesGiven: given,
      bottlesReturned: returned,
      netBottles: net,
      unitPrice: settings.bottlePrice,
      saleAmount,
      paymentAmount: paid,
      paymentMethod,
      notes,
    })
    await order.save()
    // update client bottle balance
    await clientModel.findByIdAndUpdate(clientId, { $inc: { bottlesHeld: net, balance: saleAmount - paid } })
    if (paid > 0) await financialTransactionModel.create({ type: 'payment', amount: paid, category: paymentMethod, notes: `Order payment`, clientId, orderId: order._id, createdBy: req.userId })
    // bottles given leave the warehouse, bottles returned come back to it. Clamped at 0 rather than
    // rejected (matches lamusStockController.addStock's own clamping) - a manager who genuinely ran
    // short mid-route still needs to be able to log the delivery; `stockWarning` on the response
    // tells the caller this happened instead of silently hiding the shortfall (previously: nothing
    // was ever shown, so a warehouse quietly running out looked no different from a normal delivery).
    const stock = await getOrCreateStock()
    const wouldGoNegative = stock.totalBottles - net < 0
    stock.totalBottles = Math.max(0, stock.totalBottles - net)
    await stock.save()
    res.json({ success: true, order, stockWarning: wouldGoNegative ? true : undefined })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

// get manager's orders
export const getMyOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({ managerId: req.userId })
      .populate('clientId', 'name')
      .sort({ createdAt: -1 })
    res.json({ success: true, orders })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

// get a single client's delivery history (manager must own the client)
export const getClientOrders = async (req, res) => {
  try {
    const { clientId } = req.params
    const client = await clientModel.findById(clientId)
    if (!client || client.managerId.toString() !== req.userId) {
      return res.json({ success: false, message: 'Not authorized' })
    }
    const orders = await orderModel.find({ clientId }).sort({ createdAt: -1 })
    res.json({ success: true, orders })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}
