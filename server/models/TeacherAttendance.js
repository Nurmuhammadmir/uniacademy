// one row per teacher self-check-in scan - separate from student Attendance (different QR,
// different scanning party, different meaning). `branchId` is which branch's QR was actually
// scanned (from TeacherAttendanceQR), so a check-in at one branch never leaks into another
// branch's "who's here today" view for a teacher who works at several. Deliberately NOT unique per
// {teacherId, date} - a teacher can scan several times in one day (e.g. leaves after a morning
// lesson, comes back hours later for an evening one), and each real scan is its own row so admin
// sees every actual arrival time, not just the first.
import mongoose from "mongoose"

const teacherAttendanceSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    date: { type: Date, required: true }, // truncated to start-of-day, for the by-day queries
    scannedAt: { type: Date, default: Date.now },
}, { timestamps: true })

teacherAttendanceSchema.index({ teacherId: 1, branchId: 1, date: 1 })

const TeacherAttendance = mongoose.models.TeacherAttendance || mongoose.model('TeacherAttendance', teacherAttendanceSchema)
export default TeacherAttendance
