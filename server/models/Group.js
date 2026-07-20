import mongoose from "mongoose"
const groupSchema = new mongoose.Schema({
    // optional admin-given label ("Evening A1", "Kids Group 2") - purely cosmetic, shown instead of
    // the language·level·teacher composite everywhere a group is listed once set; falls back to that
    // composite (computed client-side) when left blank, so this never needed a backfill
    name: { type: String, default: '' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
    levelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Level', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    schedulePattern: { type: String, enum: ['MON_WED_FRI', 'TUE_THU_SAT', 'CUSTOM'], required: true },
    customDays: { type: [Number], default: [] }, // 0=Sun..6=Sat - only meaningful when schedulePattern is 'CUSTOM'
    time: { type: String, required: true },
    durationMinutes: { type: Number, default: 90 }, // how long each lesson runs - defaults to the original fixed "1h30m" convention
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null }, // explicit if set by an admin; otherwise derived from startDate+level.durationDays wherever needed
    dayCounter: { type: Number, default: 1 },
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    capacity: { type: Number, default: 20 },
    status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
    discountPercent: { type: Number, default: 0 }, // informational only for now - not yet wired into recalculateCourseBilling's pricing lookup
}, { timestamps: true })
// finds "this student's active group" - hit on every homework/progress/ranking request
groupSchema.index({ studentIds: 1, status: 1 })
groupSchema.index({ teacherId: 1 })
groupSchema.index({ branchId: 1 })
const Group = mongoose.models.Group || mongoose.model('Group', groupSchema)
export default Group
