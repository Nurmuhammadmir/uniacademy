import orderModel from '../models/LamusOrder.js'
import clientModel from '../models/LamusClient.js'
import { getOrCreateStock } from './lamusStockController.js'
import financialSettingsModel from '../models/LamusFinancialSettings.js'
import financialTransactionModel from '../models/LamusFinancialTransaction.js'

// record a delivery
export const recordOrder = async (req, res) => {
  try {
    const { clientId, bottlesGiven, bottlesReturned, notes, paymentAmount = 0, paymentMethod = 'later' } = req.body
    const settings = await financialSettingsModel.findOne({}) || await financialSettingsModel.create({})
    const paid = Math.max(0, Number(paymentAmount) || 0)
    const saleAmount = Math.max(0, Number(bottlesGiven) || 0) * settings.bottlePrice
    const net = bottlesGiven - bottlesReturned
    const order = new orderModel({
      clientId,
      managerId: req.userId,
      bottlesGiven,
      bottlesReturned,
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
    // bottles given leave the warehouse, bottles returned come back to it
    const stock = await getOrCreateStock()
    stock.totalBottles = Math.max(0, stock.totalBottles - net)
    await stock.save()
    res.json({ success: true, order })
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
