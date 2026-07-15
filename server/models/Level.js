import mongoose from "mongoose"
const levelSchema = new mongoose.Schema({
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
    name: { type: String, required: true },
    order: { type: Number, required: true },
}, { timestamps: true })
const Level = mongoose.models.Level || mongoose.model('Level', levelSchema)
export default Level
