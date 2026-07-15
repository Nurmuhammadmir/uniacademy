// one document per person, role field decides what they can do (see middleware/auth.js)
import mongoose from "mongoose"

// a student can study MORE THAN ONE language at once (e.g. English + German), but never the same
// language twice - that uniqueness is enforced in adminController.addStudentCourse, not here
const courseSchema = new mongoose.Schema({
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
    levelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Level', required: true },
    isActive: { type: Boolean, default: false },          // false until balance covers this course's price (rule #1)
    balance: { type: Number, default: 0 },                // unspent payment credit for THIS course/language
    subscriptionExpiresAt: { type: Date, default: null }, // this course's own paid-through date
}, { timestamps: true })

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['director', 'admin', 'teacher', 'student'], required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null }, // null only for director
    address: { type: String, default: '' },        // student-only, director-visible only (not admin)
    passportInfo: { type: String, default: '' },    // student-only, free text (ID/passport number etc) - required or optional per Settings.passportRequired
    geo: { lat: { type: Number, default: null }, lng: { type: Number, default: null } },
    courses: { type: [courseSchema], default: [] }, // student-only: one entry per language they study
    createdByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // student-only: which admin registered them
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', userSchema)
export default User
