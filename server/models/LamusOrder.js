import mongoose from 'mongoose'
import lamusConnection from '../config/lamusMongodb.js'

const orderSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'client', required: true },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  bottlesGiven: { type: Number, required: true, default: 0 },
  bottlesReturned: { type: Number, required: true, default: 0 },
  netBottles: { type: Number, required: true, default: 0 },
  unitPrice: { type: Number, required: true, default: 0 },
  saleAmount: { type: Number, required: true, default: 0 },
  paymentAmount: { type: Number, required: true, default: 0 },
  paymentMethod: { type: String, enum: ['cash', 'card', 'transfer', 'later'], default: 'later' },
  notes: { type: String, default: '' },
}, { timestamps: true })

const orderModel = lamusConnection.models.order || lamusConnection.model('order', orderSchema)
export default orderModel
