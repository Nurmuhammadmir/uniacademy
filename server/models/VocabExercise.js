import mongoose from "mongoose"
const vocabExerciseSchema = new mongoose.Schema({
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
    levelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Level', required: true },
    day: { type: Number, required: true },
    type: { type: String, enum: ['picture_match', 'translation_match', 'fill_gap'], required: true },
    conceptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept', required: true },
    options: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Concept' }], required: true },
    correct: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept', required: true },
}, { timestamps: true })
vocabExerciseSchema.index({ languageId: 1, levelId: 1, day: 1 })
const VocabExercise = mongoose.models.VocabExercise || mongoose.model('VocabExercise', vocabExerciseSchema)
export default VocabExercise
