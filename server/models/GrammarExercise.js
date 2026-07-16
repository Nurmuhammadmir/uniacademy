import mongoose from "mongoose"
const grammarExerciseSchema = new mongoose.Schema({
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
    levelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Level', required: true },
    day: { type: Number, required: true },
    type: { type: String, enum: ['multiple_choice', 'fill_gap', 'reorder', 'error_correction', 'true_false', 'matching'], required: true },
    question: { type: String, required: true },
    options: { type: [String], default: [] },
    correct: { type: String, required: true },
}, { timestamps: true })
grammarExerciseSchema.index({ languageId: 1, levelId: 1, day: 1 })
const GrammarExercise = mongoose.models.GrammarExercise || mongoose.model('GrammarExercise', grammarExerciseSchema)
export default GrammarExercise
