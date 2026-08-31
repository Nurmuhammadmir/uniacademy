// a genuine, permanent, irreversible delete - unlike the existing "archive" (deleteGroup in
// adminController.js), which deliberately keeps a group's history intact by only flipping
// status:'archived', this actually erases the Group document and every collection that's
// exclusively owned by it. Records owned by something else (a student's Payment/CoursePeriod)
// only get their groupId reference cleared, never deleted, so financial history survives.
import Group from "../models/Group.js"
import Lesson from "../models/Lesson.js"
import LessonAttendance from "../models/LessonAttendance.js"
import Attendance from "../models/Attendance.js"
import AttendanceSession from "../models/AttendanceSession.js"
import GroupMembership from "../models/GroupMembership.js"
import GroupMaterial from "../models/GroupMaterial.js"
import GroupComment from "../models/GroupComment.js"
import StudentProgress from "../models/StudentProgress.js"
import ExtraLesson from "../models/ExtraLesson.js"
import TeacherPayRate from "../models/TeacherPayRate.js"
import Payment from "../models/Payment.js"
import LedgerEntry from "../models/LedgerEntry.js"
import User from "../models/User.js"

export const hardDeleteGroup = async (groupId) => {
    const lessons = await Lesson.find({ groupId }).select('_id')
    const lessonIds = lessons.map(l => l._id)

    await Promise.all([
        LessonAttendance.deleteMany({ lessonId: { $in: lessonIds } }),
        Lesson.deleteMany({ groupId }),
        Attendance.deleteMany({ groupId }),
        AttendanceSession.deleteMany({ groupId }),
        GroupMembership.deleteMany({ groupId }),
        GroupMaterial.deleteMany({ groupId }),
        GroupComment.deleteMany({ groupId }),
        StudentProgress.deleteMany({ groupId }),
        ExtraLesson.deleteMany({ groupId }),
        TeacherPayRate.deleteMany({ groupId }),
        Payment.updateMany({ groupId }, { $set: { groupId: null } }),
        LedgerEntry.updateMany({ groupId }, { $set: { groupId: null } }),
        // every student's OWN course entry pointing at this group needs the same reference clear -
        // missing this left a permanent "ghost" course on a student's profile (real price lookup
        // fails forever since the group is gone, showing an unexplainable blank price stuck at
        // "unpaid") every time a group they'd been in was permanently deleted
        User.updateMany(
            { 'courses.groupId': groupId },
            { $set: { 'courses.$[c].groupId': null } },
            { arrayFilters: [{ 'c.groupId': groupId }] },
        ),
    ])
    await Group.deleteOne({ _id: groupId })
}
