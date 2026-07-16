import 'dotenv/config'
import mongoose from 'mongoose'

await mongoose.connect(process.env.MONGO_URI + "/uniacademy")

const TeacherAttendance = mongoose.models.TeacherAttendance || mongoose.model('TeacherAttendance', new mongoose.Schema({
  teacherId: mongoose.Schema.Types.ObjectId,
  date: Date,
  scannedAt: Date,
}, { timestamps: true, strict: false }))

const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }))

const all = await TeacherAttendance.find({}).sort({ createdAt: -1 }).limit(10)
console.log("=== Recent TeacherAttendance records ===")
for (const r of all) {
  console.log(JSON.stringify({
    _id: r._id.toString(),
    teacherId: r.teacherId?.toString(),
    date: r.date,
    dateISO: r.date?.toISOString(),
    scannedAt: r.scannedAt,
    scannedAtISO: r.scannedAt?.toISOString(),
    createdAt: r.createdAt,
  }, null, 2))
}

console.log("\n=== Server 'now' info ===")
const now = new Date()
console.log("now:", now.toString())
console.log("now ISO (UTC):", now.toISOString())
console.log("TZ offset (min):", now.getTimezoneOffset())

// Replicate teacherController's "today" (used at check-in time)
const todayLocal = new Date(); todayLocal.setHours(0,0,0,0)
console.log("\ntodayLocal (teacherController style):", todayLocal.toString(), todayLocal.toISOString())

// Replicate director frontend's todayISO()
const todayISOFrontend = new Date().toISOString().slice(0,10)
console.log("todayISO (frontend style, UTC slice):", todayISOFrontend)

// Replicate directorController's startOfDay using that frontend-provided date string
const requestedDate = new Date(todayISOFrontend)
const startOfDay = new Date(requestedDate); startOfDay.setHours(0,0,0,0)
console.log("requestedDate (parsed from ISO date string):", requestedDate.toString(), requestedDate.toISOString())
console.log("startOfDay (directorController style):", startOfDay.toString(), startOfDay.toISOString())

console.log("\nDoes startOfDay equal todayLocal?", startOfDay.getTime() === todayLocal.getTime())

// Now actually run directorController's exact query against real data
const match = await TeacherAttendance.find({ date: startOfDay })
console.log("\nTeacherAttendance.find({date: startOfDay}) count:", match.length)

// And query with todayLocal for comparison
const match2 = await TeacherAttendance.find({ date: todayLocal })
console.log("TeacherAttendance.find({date: todayLocal}) count:", match2.length)

await mongoose.disconnect()
