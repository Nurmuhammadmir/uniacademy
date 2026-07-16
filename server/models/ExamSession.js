import mongoose from "mongoose"

// the exact question set a student was shown, persisted the first time they open the exam so
// leaving and reopening resumes the SAME attempt instead of drawing a fresh random set - a student
// can't back out and re-enter to get an easier draw. `startedAt` also anchors the countdown
// server-side, so repeatedly reopening the page can't pause or extend the time limit.
const examSessionSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    startedAt: { type: Date, default: Date.now },
    questions: { type: mongoose.Schema.Types.Mixed, required: true },
    readingTexts: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true })

examSessionSchema.index({ studentId: 1, examId: 1 }, { unique: true })

const ExamSession = mongoose.models.ExamSession || mongoose.model('ExamSession', examSessionSchema)
export default ExamSession
