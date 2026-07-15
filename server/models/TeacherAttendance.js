// one row per teacher per calendar day they checked themselves in - separate from student
// Attendance (different QR, different scanning party, different meaning)
import mongoose from "mongoose"

const teacherAttendanceSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true }, // truncated to start-of-day, for the uniqueness index
    scannedAt: { type: Date, default: Date.now },
}, { timestamps: true })

teacherAttendanceSchema.index({ teacherId: 1, date: 1 }, { unique: true })

const TeacherAttendance = mongoose.models.TeacherAttendance || mongoose.model('TeacherAttendance', teacherAttendanceSchema)
export default TeacherAttendance
