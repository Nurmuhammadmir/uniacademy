// one document per person, role field decides what they can do (see middleware/auth.js)
import mongoose from "mongoose"

// a student can study MORE THAN ONE language at once (e.g. English + German), but never the same
// language twice - that uniqueness is enforced in adminController.addStudentCourse, not here
const courseSchema = new mongoose.Schema({
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
    // no longer required at creation - a course can exist with no level yet ("taking English" without
    // saying which level) until the first payment (or the admin's "correct level" tool) assigns one
    levelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Level', default: null },
    isActive: { type: Boolean, default: false },          // false until balance covers this course's price (rule #1)
    balance: { type: Number, default: 0 },                // unspent payment credit for THIS course/language
    subscriptionExpiresAt: { type: Date, default: null }, // this course's own paid-through date
    courseCompleted: { type: Boolean, default: false },   // set once a group graduates past this language's final level (groupPromotion.service.js) - distinguishes "finished everything" from "never enrolled"/"no active group yet" everywhere the student app reads courses
}, { timestamps: true })

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['director', 'admin', 'teacher', 'student', 'parent'], required: true },
    // student-only: archiving replaces hard-deleting a student - their payment/course/exam history
    // stays intact (a hard delete would orphan every Payment/CoursePeriod row that references them),
    // they just stop appearing in the active roster and can no longer log in. Reversible via unarchive.
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null }, // null only for director/parent; teacher-only, this is their "home" branch
    additionalBranchIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }], default: [] }, // teacher-only: other branches they're also allowed to teach in
    address: { type: String, default: '' },        // student-only, director-visible only (not admin)
    passportInfo: { type: String, default: '' },    // student-only, free text (ID/passport number etc) - required or optional per Settings.passportRequired
    geo: { lat: { type: Number, default: null }, lng: { type: Number, default: null } },
    courses: { type: [courseSchema], default: [] }, // student-only: one entry per language they study
    notes: { type: String, default: '' }, // student-only: free-text admin/director notes about this student
    createdByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // student-only: which admin registered them
    // parent-only: which student(s) this login can see - a phone number can be linked to more than
    // one child (siblings share one parent account), each just gets pushed into this same array
    childStudentIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', userSchema)
export default User
