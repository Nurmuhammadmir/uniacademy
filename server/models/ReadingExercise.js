import mongoose from "mongoose"
const readingExerciseSchema = new mongoose.Schema({
    readingTextId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReadingText', required: true },
    type: { type: String, enum: ['true_false', 'multiple_choice', 'sequencing', 'summary_gap_fill'], required: true },
    paragraphRef: { type: String, default: '' },
    question: { type: String, required: true },
    options: { type: mongoose.Schema.Types.Mixed, default: [] },
    correct: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true })
const ReadingExercise = mongoose.models.ReadingExercise || mongoose.model('ReadingExercise', readingExerciseSchema)
export default ReadingExercise
