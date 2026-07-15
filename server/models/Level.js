import mongoose from "mongoose"
const levelSchema = new mongoose.Schema({
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
    name: { type: String, required: true },
    order: { type: Number, required: true },
    // how many homework days this level runs for. Defaults to 30. The director sets/edits this
    // on the Courses page; the homework builder renders exactly this many days.
    durationDays: { type: Number, required: true, default: 30, min: 1, max: 300 },
}, { timestamps: true })
const Level = mongoose.models.Level || mongoose.model('Level', levelSchema)
export default Level
