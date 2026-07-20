// a short-lived (2 min) check-in QR - any teacher who scans it before it expires is marked
// present for today under their OWN identity (from their auth token, not from the QR itself).
// Meant to be displayed live on a screen at the front desk and auto-refreshed by the admin app
// (see adminController.createTeacherAttendanceQR), not printed - a printed/static code would let
// anyone check in at any time of day just by keeping a photo of it.
import mongoose from "mongoose"

const teacherAttendanceQRSchema = new mongoose.Schema({
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
}, { timestamps: true })

const TeacherAttendanceQR = mongoose.models.TeacherAttendanceQR || mongoose.model('TeacherAttendanceQR', teacherAttendanceQRSchema)
export default TeacherAttendanceQR
