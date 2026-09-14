import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import validator from 'validator'
import userModel from '../models/LamusUser.js'
import clientModel from '../models/LamusClient.js'
import orderModel from '../models/LamusOrder.js'
import managerLocationModel from '../models/LamusManagerLocation.js'

// admin login
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await userModel.findOne({ email, role: 'admin' })
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

// get all managers
export const getAllManagers = async (req, res) => {
  try {
    const managers = await userModel.find({ role: 'manager' }).select('-password')
    res.json({ success: true, managers })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

// add manager
export const addManager = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body
    if (!validator.isEmail(email)) return res.json({ success: false, message: 'Invalid email' })
    if (password.length < 6) return res.json({ success: false, message: 'Password too short' })
    const exists = await userModel.findOne({ email })
    if (exists) return res.json({ success: false, message: 'Email already in use' })
    const salt = await bcrypt.genSalt(10)
    const hashed = await bcrypt.hash(password, salt)
    const manager = new userModel({ name, email, password: hashed, role: 'manager', phone: phone || '' })
    await manager.save()
    res.json({ success: true, manager: { _id: manager._id, name: manager.name, email: manager.email, role: manager.role } })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

// edit manager
export const editManager = async (req, res) => {
  try {
    const { managerId } = req.params
    const { name, email, phone, password } = req.body
    const update = { name, email, phone }
    if (password) {
      if (password.length < 6) return res.json({ success: false, message: 'Password too short' })
      const salt = await bcrypt.genSalt(10)
      update.password = await bcrypt.hash(password, salt)
    }
    await userModel.findByIdAndUpdate(managerId, update)
    res.json({ success: true, message: 'Manager updated' })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

// remove manager
export const removeManager = async (req, res) => {
  try {
    const { managerId } = req.params
    await userModel.findByIdAndDelete(managerId)
    res.json({ success: true, message: 'Manager removed' })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

// get all operations log
export const getOperations = async (req, res) => {
  try {
    const orders = await orderModel.find({})
      .populate('clientId', 'name')
      .populate('managerId', 'name')
      .sort({ createdAt: -1 })
    res.json({ success: true, orders })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

// get all clients (admin view)
export const getAllClients = async (req, res) => {
  try {
    const clients = await clientModel.find({}).populate('managerId', 'name email')
    res.json({ success: true, clients })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

// get all admins
export const getAllAdmins = async (req, res) => {
  try {
    const admins = await userModel.find({ role: 'admin' }).select('-password')
    res.json({ success: true, admins })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

// add admin
export const addAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!validator.isEmail(email)) return res.json({ success: false, message: 'Invalid email' })
    if (password.length < 6) return res.json({ success: false, message: 'Password too short' })
    const exists = await userModel.findOne({ email })
    if (exists) return res.json({ success: false, message: 'Email already in use' })
    const salt = await bcrypt.genSalt(10)
    const hashed = await bcrypt.hash(password, salt)
    const admin = new userModel({ name, email, password: hashed, role: 'admin' })
    await admin.save()
    res.json({ success: true })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

// edit admin
export const editAdmin = async (req, res) => {
  try {
    const { adminId } = req.params
    const { name, email } = req.body
    await userModel.findByIdAndUpdate(adminId, { name, email })
    res.json({ success: true, message: 'Admin updated' })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

// remove admin
export const removeAdmin = async (req, res) => {
  try {
    const { adminId } = req.params
    if (adminId === req.userId) return res.json({ success: false, message: "Can't remove yourself" })
    await userModel.findByIdAndDelete(adminId)
    res.json({ success: true, message: 'Admin removed' })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

// last known location per manager, reported by their own app while open
export const getManagerLocations = async (req, res) => {
  try {
    const locations = await managerLocationModel.find({}).populate('managerId', 'name')
    res.json({ success: true, locations })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}
