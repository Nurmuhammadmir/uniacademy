import mongoose from "mongoose"
const readingExerciseSchema = new mongoose.Schema({
    readingTextId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReadingText', required: true },
    type: { type: String, enum: ['true_false', 'multiple_choice', 'sequencing', 'summary_gap_fill'], required: true },
    paragraphRef: { type: String, default: '' },
    // optional - "sequencing" exercises have no question text, only items + a correct order
    question: { type: String, default: '' },
    options: { type: mongoose.Schema.Types.Mixed, default: [] },
    correct: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true })
readingExerciseSchema.index({ readingTextId: 1 })
const ReadingExercise = mongoose.models.ReadingExercise || mongoose.model('ReadingExercise', readingExerciseSchema)
export default ReadingExercise
