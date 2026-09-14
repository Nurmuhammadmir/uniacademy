import stockModel from '../models/LamusStock.js'

export const getOrCreateStock = async () => {
  let stock = await stockModel.findOne({})
  if (!stock) stock = await stockModel.create({ totalBottles: 0 })
  return stock
}

// get current warehouse stock
export const getStock = async (req, res) => {
  try {
    const stock = await getOrCreateStock()
    res.json({ success: true, stock })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

// add or remove bottles from the warehouse (restock or manual correction)
export const addStock = async (req, res) => {
  try {
    const { amount } = req.body
    if (typeof amount !== 'number' || Number.isNaN(amount)) {
      return res.json({ success: false, message: 'Amount must be a number' })
    }
    const current = await getOrCreateStock()
    current.totalBottles = Math.max(0, current.totalBottles + amount)
    await current.save()
    res.json({ success: true, stock: current })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}
