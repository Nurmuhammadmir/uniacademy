import mongoose from 'mongoose'
import lamusConnection from '../config/lamusMongodb.js'

const financialTransactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['income', 'expense', 'payment', 'adjustment'], required: true },
  amount: { type: Number, required: true, min: 0 },
  // Where the money physically is/was: cash on hand, card, or bank transfer.
  paymentMethod: { type: String, enum: ['cash', 'card', 'transfer'], default: 'cash' },
  category: { type: String, default: '' },
  notes: { type: String, default: '' },
  // The transaction's effective date, editable by the admin (e.g. logging a backdated expense) —
  // separate from createdAt, which stays an untouched audit timestamp of when the record was
  // actually entered.
  date: { type: Date, default: Date.now },
  // Required for 'income' — all income comes from a client (e.g. an advance payment not tied to a
  // specific delivery); not used for 'expense'.
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'client', default: null },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'order', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
}, { timestamps: true })

const financialTransactionModel = lamusConnection.models.financialTransaction || lamusConnection.model('financialTransaction', financialTransactionSchema)
export default financialTransactionModel
