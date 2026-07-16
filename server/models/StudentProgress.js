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
// {studentId,groupId} prefix serves the per-student lookups; {groupId,status} serves ranking/roster reads
studentProgressSchema.index({ studentId: 1, groupId: 1, day: 1 })
studentProgressSchema.index({ groupId: 1, status: 1 })
const StudentProgress = mongoose.models.StudentProgress || mongoose.model('StudentProgress', studentProgressSchema)
export default StudentProgress
