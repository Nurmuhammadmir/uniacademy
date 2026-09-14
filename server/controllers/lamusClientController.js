import clientModel from '../models/LamusClient.js'

// add client
export const addClient = async (req, res) => {
  try {
    const { name, phone, address, lat, lng, notes } = req.body
    const client = new clientModel({ name, phone, address, lat, lng, notes, managerId: req.userId })
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
