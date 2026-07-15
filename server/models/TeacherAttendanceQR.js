// ONE shared check-in QR per branch (not per-teacher) - any teacher who scans it is marked present
// for today under their OWN identity (from their auth token, not from the QR itself). Never
// expires by design: it's meant to be printed once and left at the front desk indefinitely. An
// admin can generate additional codes (e.g. a second copy for a different entrance) - all of them
// stay valid forever, there's no single "the" QR to invalidate.
import mongoose from "mongoose"

const teacherAttendanceQRSchema = new mongoose.Schema({
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    token: { type: String, required: true, unique: true },
}, { timestamps: true })

const TeacherAttendanceQR = mongoose.models.TeacherAttendanceQR || mongoose.model('TeacherAttendanceQR', teacherAttendanceQRSchema)
export default TeacherAttendanceQR
