import mongoose from "mongoose"
const examSchema = new mongoose.Schema({
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
    levelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Level', required: true },
    passScore: { type: Number, required: true, default: 70 },
    questions: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true })
const Exam = mongoose.models.Exam || mongoose.model('Exam', examSchema)
export default Exam
