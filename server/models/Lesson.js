import mongoose from "mongoose"

// one real scheduled class occurrence for a group, on a real calendar date - generated from the
// group's schedulePattern/time/startDate/endDate by lessonGenerator.service.js. This is deliberately
// a SEPARATE system from the homework day-counter (StudentProgress/Attendance keyed by relative
// day 1..30) - that system stays untouched since exam/progress/promotion logic already depends on
// it; this one exists purely for the real-calendar Group Details/timetable views.
const lessonSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    date: { type: Date, required: true }, // UTC midnight of the lesson's calendar day
    startTime: { type: String, required: true }, // 'HH:MM'
    endTime: { type: String, required: true },   // 'HH:MM' - startTime + 1h30m by convention
    // the group's own assigned teacher's attendance for THIS specific real-calendar lesson -
    // separate from TeacherAttendance (which is just "checked into the branch that day", not tied
    // to any one lesson). 'substituted' means someone else actually ran it (substituteTeacherId).
    teacherStatus: { type: String, enum: ['unmarked', 'conducted', 'not_conducted', 'substituted'], default: 'unmarked' },
    substituteTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    teacherNote: { type: String, default: '' },
}, { timestamps: true })

lessonSchema.index({ groupId: 1, date: 1 }, { unique: true })

const Lesson = mongoose.models.Lesson || mongoose.model('Lesson', lessonSchema)
export default Lesson
