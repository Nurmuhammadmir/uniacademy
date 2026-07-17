import mongoose from "mongoose"
const examAttemptSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    score: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    attemptNumber: { type: Number, required: true },
    // 'self' = the student's own one-time exam submission (studentController.submitExam);
    // 'admin_retake' = adminController.retakeExam's manually-entered score. A student can have at
    // most one 'self' attempt per exam (enforced below) but any number of admin retakes.
    source: { type: String, enum: ['self', 'admin_retake'], default: 'self' },
    date: { type: Date, default: Date.now },
}, { timestamps: true })
examAttemptSchema.index({ studentId: 1, examId: 1 })
// DB-level backstop against a double-click/double-submit race slipping past the
// exists-then-create check in studentController.submitExam - only the SELF-service slot is
// unique, so adminController.retakeExam can still freely add further attempts for the same pair.
examAttemptSchema.index({ studentId: 1, examId: 1, source: 1 }, { unique: true, partialFilterExpression: { source: 'self' } })
const ExamAttempt = mongoose.models.ExamAttempt || mongoose.model('ExamAttempt', examAttemptSchema)
export default ExamAttempt
