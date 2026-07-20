import mongoose from "mongoose"

// real-calendar attendance for the Group Details "Davomat" grid - richer than the homework
// day-counter Attendance model (which only ever records present-by-row-existence). A cell with no
// row at all is implicitly 'unmarked'; this only gets a row once someone actually sets a status.
const lessonAttendanceSchema = new mongoose.Schema({
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['unmarked', 'present', 'absent', 'late', 'excused'], default: 'unmarked' },
}, { timestamps: true })

lessonAttendanceSchema.index({ lessonId: 1, studentId: 1 }, { unique: true })

const LessonAttendance = mongoose.models.LessonAttendance || mongoose.model('LessonAttendance', lessonAttendanceSchema)
export default LessonAttendance
