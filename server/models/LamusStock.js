import mongoose from 'mongoose'
import lamusConnection from '../config/lamusMongodb.js'

// Singleton: one document tracks warehouse bottle inventory for the whole business.
const stockSchema = new mongoose.Schema({
  totalBottles: { type: Number, required: true, default: 0 },
}, { timestamps: true })

const stockModel = lamusConnection.models.stock || lamusConnection.model('stock', stockSchema)
export default stockModel
