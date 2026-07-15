// one row per student per class session actually attended - created only when a student scans
// their teacher's QR code, never editable after the fact (that's the whole point of QR attendance:
// you had to physically be in the room to scan it)
import mongoose from "mongoose"

const attendanceSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    day: { type: Number, required: true },
    scannedAt: { type: Date, default: Date.now },
}, { timestamps: true })

// a student can only be marked present once per group per day
attendanceSchema.index({ studentId: 1, groupId: 1, day: 1 }, { unique: true })

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema)
export default Attendance
