import mongoose from 'mongoose'

// One doc per manager — only the latest known position, reported by the manager's own app while
// it's open in the foreground (browser geolocation requires an explicit permission grant and a
// visible OS indicator; there is no way to report location while the app is closed).
const managerLocationSchema = new mongoose.Schema({
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'LamusUser', required: true, unique: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
}, { timestamps: true })

const managerLocationModel = mongoose.models.LamusManagerLocation || mongoose.model('LamusManagerLocation', managerLocationSchema)
export default managerLocationModel
