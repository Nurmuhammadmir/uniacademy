import clientModel from '../models/LamusClient.js'
import userModel from '../models/LamusUser.js'

// add client - a manager always owns their own new client, but an admin creating one on a
// manager's behalf (the admin app has no delivery route of its own) must say which manager it
// belongs to, since there's no sensible default owner for an admin-created client otherwise.
export const addClient = async (req, res) => {
  try {
    const { name, phone, address, lat, lng, notes, managerId } = req.body
    let ownerId = req.userId
    if (req.userRole === 'admin') {
      if (!managerId) return res.json({ success: false, message: 'Manager is required' })
      const manager = await userModel.findOne({ _id: managerId, role: 'manager' })
      if (!manager) return res.json({ success: false, message: 'Manager not found' })
      ownerId = managerId
    }
    const client = new clientModel({ name, phone, address, lat, lng, notes, managerId: ownerId })
    await client.save()
    res.json({ success: true, client })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

// get manager's clients
export const getMyClients = async (req, res) => {
  try {
    const clients = await clientModel.find({ managerId: req.userId }).sort({ createdAt: -1 })
    res.json({ success: true, clients })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

// update client
export const updateClient = async (req, res) => {
  try {
    const { clientId } = req.params
    const { name, phone, address, lat, lng, notes } = req.body
    await clientModel.findByIdAndUpdate(clientId, { name, phone, address, lat, lng, notes })
    res.json({ success: true, message: 'Client updated' })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

// delete client
export const deleteClient = async (req, res) => {
  try {
    const { clientId } = req.params
    await clientModel.findByIdAndDelete(clientId)
    res.json({ success: true, message: 'Client removed' })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}
