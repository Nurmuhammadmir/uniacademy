import mongoose from "mongoose"
const curriculumSchema = new mongoose.Schema({
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
    levelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Level', required: true },
    day: { type: Number, required: true, min: 1, max: 300 },
    conceptIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Concept' }], required: true },
}, { timestamps: true })
// every homework/content-builder read filters on this triple (or its {languageId,levelId} prefix)
curriculumSchema.index({ languageId: 1, levelId: 1, day: 1 })
const Curriculum = mongoose.models.Curriculum || mongoose.model('Curriculum', curriculumSchema)
export default Curriculum
