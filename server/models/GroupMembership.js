import mongoose from "mongoose"

// exactly which group a student was enrolled in, and for how long, for one language track. Needed
// to split a single billing period's cost proportionally BY DAY between an old and new teacher when
// a student switches groups partway through an already-paid period (see
// attribution.service.js's splitPeriodByMembership) - Group.studentIds alone only tells you WHO is
// in a group RIGHT NOW, not when they joined or left, so it can't answer "who was teaching this
// student on day 15 of a month that started with a different teacher".
// `leftAt: null` means still an active member of that group right now.
const groupMembershipSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
    joinedAt: { type: Date, required: true },
    leftAt: { type: Date, default: null },
}, { timestamps: true })

groupMembershipSchema.index({ studentId: 1, languageId: 1, joinedAt: 1 })
groupMembershipSchema.index({ studentId: 1, groupId: 1, leftAt: 1 })

const GroupMembership = mongoose.models.GroupMembership || mongoose.model('GroupMembership', groupMembershipSchema)
export default GroupMembership
