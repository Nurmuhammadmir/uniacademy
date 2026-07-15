import mongoose from "mongoose"
const studentProgressSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    day: { type: Number, required: true },
    vocabDone: { type: Boolean, default: false },
    vocabScore: { type: Number, default: null },
    grammarScore: { type: Number, default: null },
    readingScore: { type: Number, default: null },
    status: { type: String, enum: ['locked', 'open', 'expired', 'done'], default: 'locked' },
    completedAt: { type: Date, default: null },
}, { timestamps: true })
const StudentProgress = mongoose.models.StudentProgress || mongoose.model('StudentProgress', studentProgressSchema)
export default StudentProgress
