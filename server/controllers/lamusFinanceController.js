import financialSettingsModel from '../models/LamusFinancialSettings.js'
import financialTransactionModel from '../models/LamusFinancialTransaction.js'
import clientModel from '../models/LamusClient.js'
import orderModel from '../models/LamusOrder.js'

export const settings = async (req, res) => { try { const value = await financialSettingsModel.findOne({}) || await financialSettingsModel.create({}); res.json({ success: true, settings: value }) } catch (error) { res.json({ success: false, message: error.message }) } }
export const updateSettings = async (req, res) => {
  try {
    const price = Number(req.body.bottlePrice)
    if (!Number.isFinite(price) || price < 0) return res.json({ success: false, message: 'Price must be a non-negative number' })
    const update = { bottlePrice: price, currency: req.body.currency || 'UZS' }
    if (Array.isArray(req.body.expenseCategories)) {
      const seen = new Set()
      update.expenseCategories = req.body.expenseCategories
        .map(c => String(c).trim())
        .filter(c => c && !seen.has(c) && seen.add(c))
        .slice(0, 30)
    }
    if (req.body.openingBalance && typeof req.body.openingBalance === 'object') {
      const ob = req.body.openingBalance
      const cash = Number(ob.cash), card = Number(ob.card), transfer = Number(ob.transfer)
      if (![cash, card, transfer].every(Number.isFinite)) return res.json({ success: false, message: 'Opening balance must be numbers' })
      update.openingBalance = { cash, card, transfer }
    }
    const value = await financialSettingsModel.findOneAndUpdate({}, update, { new: true, upsert: true })
    res.json({ success: true, settings: value })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}
const PAYMENT_METHODS = ['cash', 'card', 'transfer']

const parseTxDate = (value) => {
  if (!value) return new Date()
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? new Date() : d
}

// All income comes from clients — a manual 'income' entry is money received outside of a delivery
// (e.g. an advance/prepayment), so it must name the client and immediately reduces what that client
// owes (or adds credit).
export const addTransaction = async (req, res) => {
  try {
    const { type, amount, category, notes, clientId, paymentMethod, date } = req.body
    if (!['income', 'expense', 'adjustment'].includes(type)) return res.json({ success: false, message: 'Invalid transaction' })
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) return res.json({ success: false, message: 'Invalid transaction' })
    if (!PAYMENT_METHODS.includes(paymentMethod)) return res.json({ success: false, message: 'Invalid payment method' })

    if (type === 'income') {
      if (!clientId) return res.json({ success: false, message: 'Client is required for income' })
      const client = await clientModel.findById(clientId)
      if (!client) return res.json({ success: false, message: 'Client not found' })
      await clientModel.findByIdAndUpdate(clientId, { $inc: { balance: -amt } })
    }

    const transaction = await financialTransactionModel.create({
      type, amount: amt, category, notes, paymentMethod,
      clientId: type === 'income' ? clientId : null,
      date: parseTxDate(date),
      createdBy: req.userId,
    })
    res.json({ success: true, transaction })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

// Manual entries only — a 'payment' transaction is generated automatically from an order and must
// stay in sync with it, so it can't be edited or deleted here independently of the order that
// created it.
export const updateTransaction = async (req, res) => {
  try {
    const existing = await financialTransactionModel.findById(req.params.id)
    if (!existing) return res.json({ success: false, message: 'Transaction not found' })
    if (existing.type === 'payment') return res.json({ success: false, message: 'Order payments can\'t be edited here' })

    const { type, amount, category, notes, clientId, paymentMethod, date } = req.body
    if (!['income', 'expense', 'adjustment'].includes(type)) return res.json({ success: false, message: 'Invalid transaction' })
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) return res.json({ success: false, message: 'Invalid transaction' })
    if (!PAYMENT_METHODS.includes(paymentMethod)) return res.json({ success: false, message: 'Invalid payment method' })
    if (type === 'income' && !clientId) return res.json({ success: false, message: 'Client is required for income' })

    if (existing.type === 'income' && existing.clientId) {
      await clientModel.findByIdAndUpdate(existing.clientId, { $inc: { balance: existing.amount } })
    }
    if (type === 'income') {
      const client = await clientModel.findById(clientId)
      if (!client) return res.json({ success: false, message: 'Client not found' })
      await clientModel.findByIdAndUpdate(clientId, { $inc: { balance: -amt } })
    }

    existing.type = type
    existing.amount = amt
    existing.category = category || ''
    existing.notes = notes || ''
    existing.paymentMethod = paymentMethod
    existing.clientId = type === 'income' ? clientId : null
    existing.date = parseTxDate(date)
    await existing.save()

    res.json({ success: true, transaction: existing })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

export const deleteTransaction = async (req, res) => {
  try {
    const existing = await financialTransactionModel.findById(req.params.id)
    if (!existing) return res.json({ success: false, message: 'Transaction not found' })
    if (existing.type === 'payment') return res.json({ success: false, message: 'Order payments can\'t be deleted here' })

    if (existing.type === 'income' && existing.clientId) {
      await clientModel.findByIdAndUpdate(existing.clientId, { $inc: { balance: existing.amount } })
    }
    await existing.deleteOne()

    res.json({ success: true })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

// Cash-basis view: net profit is money actually collected minus expenses — it excludes what clients
// still owe (that's tracked separately as "receivable"). byMethod breaks down where the money
// physically sits (cash / card / bank transfer) after expenses paid from each.
export const report = async (req, res) => {
  try {
    const [transactions, clients, orders, settingsDoc] = await Promise.all([
      financialTransactionModel.find({}).populate('clientId', 'name').sort({ date: -1 }).limit(1000),
      clientModel.find({}),
      orderModel.find({}),
      financialSettingsModel.findOne({}),
    ])

    const opening = settingsDoc?.openingBalance || { cash: 0, card: 0, transfer: 0 }
    const byMethod = { cash: opening.cash || 0, card: opening.card || 0, transfer: opening.transfer || 0 }
    orders.forEach(o => {
      if (o.paymentAmount > 0 && PAYMENT_METHODS.includes(o.paymentMethod)) byMethod[o.paymentMethod] += o.paymentAmount
    })

    const incomeTx = transactions.filter(t => t.type === 'income')
    const expenseTx = transactions.filter(t => t.type === 'expense')
    incomeTx.forEach(t => { if (PAYMENT_METHODS.includes(t.paymentMethod)) byMethod[t.paymentMethod] += t.amount })
    expenseTx.forEach(t => { if (PAYMENT_METHODS.includes(t.paymentMethod)) byMethod[t.paymentMethod] -= t.amount })

    // lamusOrderController also logs a 'payment' transaction for every paid order (same amount as
    // order.paymentAmount) purely for the audit trail below — summing orders directly here avoids
    // double-counting that entry.
    const collected = orders.reduce((s, o) => s + o.paymentAmount, 0) + incomeTx.reduce((s, t) => s + t.amount, 0)
    const expenses = expenseTx.reduce((s, t) => s + t.amount, 0)
    const receivable = clients.reduce((s, c) => s + Math.max(0, c.balance), 0)

    res.json({ success: true, transactions, summary: { collected, expenses, netProfit: collected - expenses, receivable, byMethod } })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}
