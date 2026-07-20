import mongoose from "mongoose"

// shared with adminController and directorController (both validate an incoming rateType against
// this same list) so the two never drift apart the way a locally-duplicated constant in each file could
export const PAY_RATE_TYPES = ['per_student_month', 'per_lesson', 'per_hour', 'fixed_monthly', 'percent_of_revenue']

// a teacherId:null row is the branch-wide default; a row with a specific teacherId overrides it for
// that teacher only. rateValue's unit depends on rateType - e.g. per_student_month means "this many
// so'm per active student per month", percent_of_revenue means "this % of the payments attributed
// to this teacher's groups".
const teacherPayRateSchema = new mongoose.Schema({
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rateType: { type: String, enum: PAY_RATE_TYPES, required: true },
    rateValue: { type: Number, required: true },
}, { timestamps: true })

teacherPayRateSchema.index({ branchId: 1, teacherId: 1 }, { unique: true })

const TeacherPayRate = mongoose.models.TeacherPayRate || mongoose.model('TeacherPayRate', teacherPayRateSchema)
export default TeacherPayRate
