import mongoose from "mongoose"
const groupSchema = new mongoose.Schema({
    // optional admin-given label ("Evening A1", "Kids Group 2") - purely cosmetic, shown instead of
    // the language·level·teacher composite everywhere a group is listed once set; falls back to that
    // composite (computed client-side) when left blank, so this never needed a backfill
    name: { type: String, default: '' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
    // optional - a course can legitimately have zero levels defined (a flat course with no
    // sub-divisions), in which case a group for it simply has no level. Only required (enforced in
    // adminController.createGroup) when the course DOES have at least one level defined.
    levelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Level', default: null },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    schedulePattern: { type: String, enum: ['MON_WED_FRI', 'TUE_THU_SAT', 'CUSTOM'], required: true },
    customDays: { type: [Number], default: [] }, // 0=Sun..6=Sat - only meaningful when schedulePattern is 'CUSTOM'
    time: { type: String, required: true },
    durationMinutes: { type: Number, default: 90 }, // how long each lesson runs - defaults to the original fixed "1h30m" convention
    // startDate/endDate are now the group's real billing window (not just a display estimate) - the
    // billing-cycle job (server/services/billingCycle.service.js) stops recognizing new monthly debt
    // once past endDate. Both are freely chosen by the admin with no day-of-month constraint (a
    // course can be as short as 15 days), so endDate is required going forward - a group's billing
    // window must always be explicit, never implied.
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    // snapshot of Pricing.monthlyPrice at the moment this group was created - locked in rather than
    // looked up live, so a later director price change never silently reprices a group that's
    // already running (matches how Payment already snapshots teacherId/groupId at creation time).
    price: { type: Number, required: true },
    dayCounter: { type: Number, default: 1 },
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    capacity: { type: Number, default: 20 },
    // only these two - confirmed spec: the system never sets a group's status automatically, ever,
    // for ANY reason (not an empty roster, not a passed end date, not a finished level). 'archived'
    // is exclusively an admin's own manual action. Whole-cohort level graduation
    // (groupPromotion.service.js) still happens on schedule, but the OLD group it graduates away
    // from just keeps whatever status it already had - see levelCompletedAt below for how that flow
    // avoids re-triggering without repurposing status as a "done" flag.
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    // internal-only marker so promoteGroupIfLevelComplete promotes a cohort exactly once - deliberately
    // NOT surfaced anywhere in the UI and NOT a status value; a group that's graduated its cohort away
    // simply sits there (still 'active', 0 students) until an admin notices and archives it themselves
    levelCompletedAt: { type: Date, default: null },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
}, { timestamps: true })
// finds "this student's active group" - hit on every homework/progress/ranking request
groupSchema.index({ studentIds: 1, status: 1 })
groupSchema.index({ teacherId: 1 })
groupSchema.index({ branchId: 1 })
const Group = mongoose.models.Group || mongoose.model('Group', groupSchema)
export default Group
