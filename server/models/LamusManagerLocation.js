import mongoose from 'mongoose'
import lamusConnection from '../config/lamusMongodb.js'

// One doc per manager — only the latest known position, reported by the manager's own app while
// it's open in the foreground (browser geolocation requires an explicit permission grant and a
// visible OS indicator; there is no way to report location while the app is closed).
const managerLocationSchema = new mongoose.Schema({
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, unique: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
}, { timestamps: true })

const managerLocationModel = lamusConnection.models.managerLocation || lamusConnection.model('managerLocation', managerLocationSchema)
export default managerLocationModel
