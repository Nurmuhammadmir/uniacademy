// RULE #8 — exam result -> level transition (rewritten per updated business rules)
//
// PASS (automatic, day-30 self-service exam): student is pulled out of their current group and
// auto-placed into a "next cohort" group at the next level (same branch/teacher/schedule/time,
// merging with other students who passed on the same day) - their course record's levelId updates
// to the next level. If there is no next level, the course is marked complete.
//
// FAIL (automatic, day-30 self-service exam): student is pulled out of their current group. Level
// does NOT change. They have NO group until an admin manually re-tests them offline and adds them
// to a group via the normal admin UI (services/paymentGate + adminController.addStudentToGroup).
// Payment/subscription is deliberately left untouched - failing an exam should never cost extra.
//
// The ONE retake happens via adminController.retakeExam (a manual, admin-entered score, not a
// self-service student action) - a student can never resubmit the same exam themselves twice
// (enforced in studentController.submitExam).
import Level from "../models/Level.js"
import Group from "../models/Group.js"
import ExamAttempt from "../models/ExamAttempt.js"
import StudentProgress from "../models/StudentProgress.js"

const removeStudentFromGroup = async (student, group) => {
    if (!group) return
    group.studentIds = group.studentIds.filter(id => String(id) !== String(student._id))
    if (group.studentIds.length === 0) group.status = 'completed'
    await group.save()
}

// finds a same-day "next cohort" group already forming for this teacher/schedule/level, or creates
// a fresh one - so multiple students passing the same day's exam land in ONE shared new group
// instead of each spawning their own
const findOrCreateNextGroup = async (group, nextLevel, student) => {
    let nextGroup = await Group.findOne({
        branchId: group.branchId,
        languageId: group.languageId,
        levelId: nextLevel._id,
        teacherId: group.teacherId,
        schedulePattern: group.schedulePattern,
        time: group.time,
        status: 'active',
        dayCounter: 1,
    })

    if (!nextGroup) {
        nextGroup = await Group.create({
            branchId: group.branchId,
            languageId: group.languageId,
            levelId: nextLevel._id,
            teacherId: group.teacherId,
            schedulePattern: group.schedulePattern,
            time: group.time,
            startDate: new Date(),
            dayCounter: 1,
            studentIds: [],
        })
    }

    nextGroup.studentIds.push(student._id)
    await nextGroup.save()
    await StudentProgress.create({ studentId: student._id, groupId: nextGroup._id, day: 1, status: 'open' })
    return nextGroup
}

export const handleExamResult = async ({ student, exam, group, score }) => {
    const passed = score >= exam.passScore
    const attemptCount = await ExamAttempt.countDocuments({ studentId: student._id, examId: exam._id })
    const attempt = await ExamAttempt.create({
        studentId: student._id,
        examId: exam._id,
        score,
        passed,
        attemptNumber: attemptCount + 1,
    })

    await removeStudentFromGroup(student, group)

    const courseEntry = student.courses.find(c => String(c.languageId) === String(exam.languageId))

    if (passed) {
        const currentLevel = await Level.findById(exam.levelId)
        const nextLevel = await Level.findOne({ languageId: exam.languageId, order: { $gt: currentLevel.order } }).sort({ order: 1 })

        if (!nextLevel) {
            return { attempt, outcome: 'course_completed' }
        }

        if (courseEntry) {
            courseEntry.levelId = nextLevel._id
            await student.save()
        }

        const nextGroup = await findOrCreateNextGroup(group, nextLevel, student)
        return { attempt, outcome: 'promoted', newGroup: nextGroup }
    }

    // failed - level unchanged, no group, payment untouched. The single retake (if any) happens
    // through adminController.retakeExam, entirely separately from this automatic flow.
    return { attempt, outcome: 'failed_awaiting_manual_retake' }
}
