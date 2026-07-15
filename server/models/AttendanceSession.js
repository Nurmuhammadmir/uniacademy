// a short-lived token a teacher generates and displays as a QR code for one class session - students
// scan it with their phone to mark themselves present. Expires quickly on purpose (2 minutes) so a
// screenshot of the code can't be shared and reused after class is over.
import mongoose from "mongoose"

const attendanceSessionSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    day: { type: Number, required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
}, { timestamps: true })

const AttendanceSession = mongoose.models.AttendanceSession || mongoose.model('AttendanceSession', attendanceSessionSchema)
export default AttendanceSession
