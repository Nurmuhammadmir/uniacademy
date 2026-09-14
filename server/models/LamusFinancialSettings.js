import mongoose from 'mongoose'
import lamusConnection from '../config/lamusMongodb.js'

const financialSettingsSchema = new mongoose.Schema({
  bottlePrice: { type: Number, required: true, default: 0 },
  currency: { type: String, default: 'UZS' },
  expenseCategories: { type: [String], default: ['Rent', 'Fuel', 'Salary', 'Maintenance', 'Utilities', 'Other'] },
  // Manually-set starting balances for money that existed before this system started tracking
  // transactions (e.g. an already-running business) — added as a constant baseline on top of every
  // computed cash/card/transfer balance.
  openingBalance: {
    cash: { type: Number, default: 0 },
    card: { type: Number, default: 0 },
    transfer: { type: Number, default: 0 },
  },
}, { timestamps: true })

const financialSettingsModel = lamusConnection.models.financialSettings || lamusConnection.model('financialSettings', financialSettingsSchema)
export default financialSettingsModel
