import mongoose from 'mongoose'

// Singleton: one document tracks warehouse bottle inventory for the whole business.
const stockSchema = new mongoose.Schema({
  totalBottles: { type: Number, required: true, default: 0 },
}, { timestamps: true })

const stockModel = mongoose.models.LamusStock || mongoose.model('LamusStock', stockSchema)
export default stockModel
