import mongoose from "mongoose"
const groupSchema = new mongoose.Schema({
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
    levelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Level', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    schedulePattern: { type: String, enum: ['MON_WED_FRI', 'TUE_THU_SAT'], required: true },
    time: { type: String, required: true },
    startDate: { type: Date, required: true },
    dayCounter: { type: Number, default: 1 },
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    capacity: { type: Number, default: 20 },
    status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
}, { timestamps: true })
// finds "this student's active group" - hit on every homework/progress/ranking request
groupSchema.index({ studentIds: 1, status: 1 })
groupSchema.index({ teacherId: 1 })
groupSchema.index({ branchId: 1 })
const Group = mongoose.models.Group || mongoose.model('Group', groupSchema)
export default Group
