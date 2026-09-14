import mongoose from 'mongoose'
import lamusConnection from '../config/lamusMongodb.js'

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  notes: { type: String, default: '' },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  bottlesHeld: { type: Number, default: 0 },
  // Positive means the client owes the company; negative means prepaid credit.
  balance: { type: Number, default: 0 },
}, { timestamps: true })

const clientModel = lamusConnection.models.client || lamusConnection.model('client', clientSchema)
export default clientModel
