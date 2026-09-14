import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import userModel from '../models/LamusUser.js'
import managerLocationModel from '../models/LamusManagerLocation.js'

// manager login
export const loginManager = async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await userModel.findOne({ email, role: 'manager' })
    if (!user) return res.json({ success: false, message: 'Invalid credentials' })
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.json({ success: false, message: 'Invalid credentials' })
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.LAMUS_JWT_SECRET)
    res.json({ success: true, token, user: { _id: user._id, name: user.name, email: user.email, role: user.role } })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

// get manager profile
export const getProfile = async (req, res) => {
  try {
    const user = await userModel.findById(req.userId).select('-password')
    res.json({ success: true, user })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

// reported by the manager's own device while the app is open in the foreground
export const updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body
    if (typeof lat !== 'number' || typeof lng !== 'number') return res.json({ success: false, message: 'Invalid coordinates' })
    const location = await managerLocationModel.findOneAndUpdate(
      { managerId: req.userId },
      { lat, lng },
      { new: true, upsert: true }
    )
    res.json({ success: true, location })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}
