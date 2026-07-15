import mongoose from "mongoose"
const languageSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
}, { timestamps: true })
const Language = mongoose.models.Language || mongoose.model('Language', languageSchema)
export default Language
