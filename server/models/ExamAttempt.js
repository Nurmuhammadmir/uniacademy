import mongoose from "mongoose"
const examAttemptSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    score: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    attemptNumber: { type: Number, required: true },
    date: { type: Date, default: Date.now },
}, { timestamps: true })
const ExamAttempt = mongoose.models.ExamAttempt || mongoose.model('ExamAttempt', examAttemptSchema)
export default ExamAttempt
