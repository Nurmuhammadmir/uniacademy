import mongoose from "mongoose"
const levelSchema = new mongoose.Schema({
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
    name: { type: String, required: true },
    order: { type: Number, required: true },
    // how many homework days this level runs for. Defaults to 30. The director sets/edits this
    // on the Courses page; the homework builder renders exactly this many days.
    durationDays: { type: Number, required: true, default: 30, min: 1, max: 300 },
    // some levels (e.g. absolute beginner) skip the reading section entirely - only vocab+grammar
    // apply. Defaults true so every existing level keeps behaving exactly as before.
    hasReading: { type: Boolean, default: true },
}, { timestamps: true })
levelSchema.index({ languageId: 1, order: 1 })
const Level = mongoose.models.Level || mongoose.model('Level', levelSchema)
export default Level
