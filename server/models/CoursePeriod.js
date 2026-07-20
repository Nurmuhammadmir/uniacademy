import mongoose from "mongoose"

// one row per DAY-ACCURATE SEGMENT of a billing period actually consumed/activated by
// recalculateCourseBilling - a whole month usually produces exactly one row (the student was with
// the same group/teacher the entire month), but if the student switched groups partway through, the
// month splits into one row per group, each carrying only its proportional share of the month's
// cost (see attribution.service.js's splitPeriodByMembership for the day-counting logic). This is
// what salaryCalculation.service.js's percent_of_revenue rate type sums, instead of Payment.amount
// by Payment.teacherId (which freezes at payment time and can't split a month across a switch), so a
// teacher's revenue share always reflects exactly how many days they actually had the student.
const coursePeriodSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
    levelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Level', default: null },
    // the ORIGINAL, unsplit billing period's own start date (always the 1st of a month, or the
    // payment date for a partial first month) - the idempotency anchor: recalculateCourseBilling
    // checks THIS field (not periodStart) to decide "have I already processed this whole period",
    // since periodStart/periodEnd below describe one SEGMENT within it, not the full period
    periodKey: { type: Date, required: true },
    periodStart: { type: Date, required: true }, // this segment's own start (>= periodKey)
    periodEnd: { type: Date, required: true },   // this segment's own end (<= the period's real end)
    amount: { type: Number, required: true }, // this segment's proportional share of the period's total cost
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })

// one segment per student+language+periodKey+periodStart - never recreated once it exists, so
// historical attribution stays frozen even when recalculateCourseBilling replays everything from
// scratch again on a later payment/refund (see the schema comment above for why that matters)
coursePeriodSchema.index({ studentId: 1, languageId: 1, periodKey: 1, periodStart: 1 }, { unique: true })
coursePeriodSchema.index({ teacherId: 1, periodStart: 1 })
coursePeriodSchema.index({ groupId: 1 })

const CoursePeriod = mongoose.models.CoursePeriod || mongoose.model('CoursePeriod', coursePeriodSchema)
export default CoursePeriod
