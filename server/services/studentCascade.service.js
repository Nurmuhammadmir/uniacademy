// a genuine, permanent, irreversible delete - unlike the existing "archive" (deleteStudent in
// adminController.js), which deliberately keeps a student's history intact by only flipping
// status:'archived', this actually erases the User document and every other collection that
// references them, so nothing is ever left orphaned pointing at a deleted id.
import User from "../models/User.js"
import Group from "../models/Group.js"
import Attendance from "../models/Attendance.js"
import CoursePeriod from "../models/CoursePeriod.js"
import Discount from "../models/Discount.js"
import ExamAttempt from "../models/ExamAttempt.js"
import ExamSession from "../models/ExamSession.js"
import ExtraLesson from "../models/ExtraLesson.js"
import GroupMembership from "../models/GroupMembership.js"
import LessonAttendance from "../models/LessonAttendance.js"
import Payment from "../models/Payment.js"
import StudentProgress from "../models/StudentProgress.js"

export const hardDeleteStudent = async (studentId) => {
    await Promise.all([
        Attendance.deleteMany({ studentId }),
        CoursePeriod.deleteMany({ studentId }),
        Discount.deleteMany({ studentId }),
        ExamAttempt.deleteMany({ studentId }),
        ExamSession.deleteMany({ studentId }),
        StudentProgress.deleteMany({ studentId }),
        GroupMembership.deleteMany({ studentId }),
        LessonAttendance.deleteMany({ studentId }),
        Payment.deleteMany({ studentId }),
        ExtraLesson.updateMany({ studentIds: studentId }, { $pull: { studentIds: studentId } }),
        Group.updateMany({ studentIds: studentId }, { $pull: { studentIds: studentId } }),
        // a parent may have this student linked as a child - drop the link rather than leaving a
        // dangling id the parent app would otherwise try (and fail) to load
        User.updateMany({ childStudentIds: studentId }, { $pull: { childStudentIds: studentId } }),
    ])
    await User.deleteOne({ _id: studentId })
}
