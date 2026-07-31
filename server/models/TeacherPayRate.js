import mongoose from "mongoose"

// shared with adminController and directorController (both validate an incoming rateType against
// this same list) so the two never drift apart the way a locally-duplicated constant in each file could
export const PAY_RATE_TYPES = ['per_student_month', 'per_lesson', 'per_hour', 'fixed_monthly', 'percent_of_revenue']

// three levels of specificity, most specific wins (see salaryCalculation.service.js's
// resolveRateForGroup): a {teacherId:null, groupId:null} row is the branch-wide default; a
// {teacherId, groupId:null} row overrides it for that teacher across every group they run; a
// {teacherId, groupId} row overrides THAT for one specific group only - e.g. a teacher earning 30%
// from one group and a flat 500,000 from another. rateValue's unit depends on rateType -
// per_student_month means "this many so'm per active student per month", percent_of_revenue means
// "this % of the revenue attributed to this teacher for this group".
const teacherPayRateSchema = new mongoose.Schema({
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null }, // only meaningful alongside a teacherId - a group-only override with no teacher isn't a supported case
    rateType: { type: String, enum: PAY_RATE_TYPES, required: true },
    rateValue: { type: Number, required: true },
}, { timestamps: true })

teacherPayRateSchema.index({ branchId: 1, teacherId: 1, groupId: 1 }, { unique: true })

const TeacherPayRate = mongoose.models.TeacherPayRate || mongoose.model('TeacherPayRate', teacherPayRateSchema)
export default TeacherPayRate
