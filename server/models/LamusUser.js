import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager'], required: true },
  phone: { type: String, default: '' },
}, { timestamps: true })

const userModel = mongoose.models.LamusUser || mongoose.model('LamusUser', userSchema)
export default userModel
