// RULE #1 — payment gate: a student must have an ACTIVE course entry for the exact language+level
// a group teaches before they can be placed into it. "Has paid something once" is not enough - the
// specific course's balance must have covered its price (see adminController.recalculateCourseBilling).
import User from "../models/User.js"

export const assertStudentHasPaid = async (studentId, languageId, levelId) => {
    const student = await User.findById(studentId)
    const course = student?.courses.find(c => String(c.languageId) === String(languageId) && String(c.levelId) === String(levelId))
    if (!student || !course || !course.isActive) {
        const err = new Error('payment_required')
        err.status = 403
        err.code = 'payment_required'
        throw err
    }
}
