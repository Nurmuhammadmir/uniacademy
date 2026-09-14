import mongoose from 'mongoose'
import lamusConnection from '../config/lamusMongodb.js'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager'], required: true },
  phone: { type: String, default: '' },
}, { timestamps: true })

const userModel = lamusConnection.models.user || lamusConnection.model('user', userSchema)
export default userModel
