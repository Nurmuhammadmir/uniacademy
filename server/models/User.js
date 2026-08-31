// one document per person, role field decides what they can do (see middleware/auth.js)
import mongoose from "mongoose"

// a student can study MORE THAN ONE language at once (e.g. English + German), but never the same
// language twice - that uniqueness is enforced in adminController.addStudentCourse, not here.
//
// Balance itself is NOT stored here anymore - that's server/models/Account.js (one balance per
// STUDENT, aggregated across every course they're enrolled in). What stays here is the per-course
// enrollment state the billing-cycle job needs to know what to do next for THIS specific course:
const courseSchema = new mongoose.Schema({
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
    // no longer required at creation - a course can exist with no level yet ("taking English" without
    // saying which level) until the first payment (or the admin's "correct level" tool) assigns one
    levelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Level', default: null },
    // which group this course-enrollment is currently tied to - billing (price, endDate) now comes
    // from the group, not a bare language+level Pricing lookup. Null until the admin assigns a group
    // (see adminController.addStudentToGroup) - a student can exist with a course entry and no group
    // yet, exactly like today's "taking English, not placed yet" state.
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    // replaces the old `isActive` boolean - 'inactive' from the moment a group is assigned (debt is
    // recorded immediately, before any payment) until every recognized period for this course is
    // fully paid off, at which point billingCycle.service.js flips it to 'active'. Direct analog of
    // the old isActive, just driven by the ledger instead of a live replay.
    enrollmentStatus: { type: String, enum: ['inactive', 'active'], default: 'inactive' },
    // up to which date debt has been recognized/posted for this course - the billing-cycle job's own
    // bookmark for "what's the next chunk to charge". Replaces the old subscriptionExpiresAt (which
    // meant "paid through"); this means "charged through" instead, since debt now posts proactively
    // rather than only after a payment arrives.
    recognizedThrough: { type: Date, default: null },
    courseCompleted: { type: Boolean, default: false },   // set once a group graduates past this language's final level (groupPromotion.service.js) - distinguishes "finished everything" from "never enrolled"/"no active group yet" everywhere the student app reads courses
}, { timestamps: true })

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['director', 'sub_director', 'admin', 'teacher', 'student', 'parent'], required: true },
    // student-only: archiving replaces hard-deleting a student - their payment/course/exam history
    // stays intact (a hard delete would orphan every Payment/CoursePeriod row that references them),
    // they just stop appearing in the active roster and can no longer log in. Reversible via unarchive.
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    // null only for director/parent (they aren't tied to one branch); required in practice (enforced
    // in directorController.createAdmin) for sub_director - a sub_director IS one branch's scope,
    // everything they can see/do is filtered down to this id. teacher-only, this is their "home" branch
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    additionalBranchIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }], default: [] }, // teacher-only: other branches they're also allowed to teach in
    address: { type: String, default: '' },        // student-only, director-visible only (not admin)
    dateOfBirth: { type: Date, default: null },     // student-only, optional
    passportInfo: { type: String, default: '' },    // student-only, free text (ID/passport number etc) - required or optional per Settings.passportRequired
    geo: { lat: { type: Number, default: null }, lng: { type: Number, default: null } },
    courses: { type: [courseSchema], default: [] }, // student-only: one entry per language they study
    // student-only, whole-account freeze - pauses billing for EVERY course at once (confirmed: not
    // per-course, not per-group). Attendance/homework are untouched, since those are driven by
    // Group.schedulePattern/dayCounter, an entirely separate system. Toggled from the student
    // profile when they say they can't come for a while (e.g. travelling abroad) - no new debt
    // accrues on any of their courses until they're unfrozen, and money already on their balance
    // just sits there rather than being consumed by a period they weren't billed for.
    frozen: { type: Boolean, default: false },
    frozenAt: { type: Date, default: null },
    frozenReason: { type: String, default: '' },
    notes: { type: String, default: '' }, // student-only: free-text admin/director notes about this student
    createdByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // student-only: which admin registered them
    // parent-only: which student(s) this login can see - a phone number can be linked to more than
    // one child (siblings share one parent account), each just gets pushed into this same array
    childStudentIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
}, { timestamps: true })

// almost every admin/director list/report query filters by branchId+role together (student
// rosters, teacher lists, salary calculation, finance overview, attendance grids) - without this,
// each of those does a full collection scan as the platform's user count grows
userSchema.index({ branchId: 1, role: 1 })

const User = mongoose.models.User || mongoose.model('User', userSchema)
export default User
