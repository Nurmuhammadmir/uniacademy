// a genuine, permanent, irreversible delete - unlike the existing "archive" (deleteStudent in
// adminController.js), which deliberately keeps a student's history intact by only flipping
// status:'archived', this actually erases the User document and every other collection that
// references them, so nothing is ever left orphaned pointing at a deleted id.
import User from "../models/User.js"
import Group from "../models/Group.js"
import Attendance from "../models/Attendance.js"
import Account from "../models/Account.js"
import Discount from "../models/Discount.js"
import ExamAttempt from "../models/ExamAttempt.js"
import ExamSession from "../models/ExamSession.js"
import ExtraLesson from "../models/ExtraLesson.js"
import GroupMembership from "../models/GroupMembership.js"
import LessonAttendance from "../models/LessonAttendance.js"
import Payment from "../models/Payment.js"
import StudentProgress from "../models/StudentProgress.js"
import { deleteEntries } from "./ledger.service.js"

export const hardDeleteStudent = async (studentId) => {
    const account = await Account.findOne({ ownerType: 'student', ownerId: studentId }).select('_id').lean()
    // confirmed spec: a permanent delete must leave NOTHING behind anywhere in the ledger, on
    // EITHER side of any transaction this student was ever part of - a payment/refund posts two
    // legs (the student's own decrease, the branch's own increase) sharing one transactionId, so a
    // bare LedgerEntry.deleteMany scoped to just the student's own account used to remove only
    // their half, leaving the branch's half permanently dangling (pointing at a Payment document
    // about to be deleted right below - a phantom entry nothing could ever explain or edit again).
    // deleteEntries finds and reverses BOTH legs of every one of the student's transactions,
    // correctly walking the branch's balance back down too, so deleting a student really does
    // leave the branch's books exactly as if that student, and everything they ever paid, never
    // existed - not a half-erased trace of them sitting in someone else's ledger forever.
    if (account) await deleteEntries({ accountId: account._id })
    await Promise.all([
        Attendance.deleteMany({ studentId }),
        ...(account ? [Account.deleteOne({ _id: account._id })] : []),
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
