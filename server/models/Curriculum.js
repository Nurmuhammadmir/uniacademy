import mongoose from "mongoose"
const curriculumSchema = new mongoose.Schema({
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
    levelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Level', required: true },
    day: { type: Number, required: true, min: 1, max: 300 },
    conceptIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Concept' }], required: true },
}, { timestamps: true })
const Curriculum = mongoose.models.Curriculum || mongoose.model('Curriculum', curriculumSchema)
export default Curriculum
