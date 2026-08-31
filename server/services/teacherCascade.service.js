// a genuine, permanent, irreversible delete - mirrors studentCascade.service.js's hardDeleteStudent.
// Before this, deleteTeacher (directorController.js) did a bare User.deleteOne() with no cleanup at
// all: the teacher's own Account and every LedgerEntry on it were left behind forever (a balance with
// no owner left to view it), and TeacherPayRate/TeacherAttendance rows dangled pointing at a deleted
// user. A salary/prepayment payout posts two INDEPENDENT single-leg entries (the branch's own
// decrease, the teacher's own decrease - see adminController.paySalary/prepaySalary, each its own
// postEntry call, not a single postTransfer) - deleteEntries, scoped to the teacher's own account,
// still finds and removes the teacher's half correctly; the branch's own half is deliberately left
// alone (it's a different transactionId entirely, and the branch's Expense record of having paid
// this now-deleted teacher is real historical spending that stays on the books either way).
import User from "../models/User.js"
import Account from "../models/Account.js"
import TeacherPayRate from "../models/TeacherPayRate.js"
import TeacherAttendance from "../models/TeacherAttendance.js"
import { deleteEntries } from "./ledger.service.js"

export const hardDeleteTeacher = async (teacherId) => {
    const account = await Account.findOne({ ownerType: 'teacher', ownerId: teacherId }).select('_id').lean()
    if (account) await deleteEntries({ accountId: account._id })
    await Promise.all([
        TeacherAttendance.deleteMany({ teacherId }),
        TeacherPayRate.deleteMany({ teacherId }),
        ...(account ? [Account.deleteOne({ _id: account._id })] : []),
    ])
    await User.deleteOne({ _id: teacherId })
}
