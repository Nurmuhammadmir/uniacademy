// a single-document, platform-wide settings collection (there's only ever one row) - director-
// controlled toggles that affect validation rules elsewhere (e.g. whether passport info is
// mandatory when an admin registers a new student)
import mongoose from "mongoose"

const settingsSchema = new mongoose.Schema({
    passportRequired: { type: Boolean, default: true },
}, { timestamps: true })

const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema)
export default Settings
