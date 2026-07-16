// The WHOLE group advances to the next level together once it finishes a level's homework window
// (dayCounter reaches durationDays) - completely independent of anyone's exam result. A student
// who scored poorly still moves up with their cohort; it's an admin's manual call afterwards
// (looking at ExamAttempt history) whether that student needs to be moved back down or given
// extra help. This mirrors the old per-student "next cohort" logic in examPromotion.service.js,
// just applied to every student in the group at once instead of one at a time on exam pass.
import Level from "../models/Level.js"
import Group from "../models/Group.js"
import User from "../models/User.js"
import StudentProgress from "../models/StudentProgress.js"

const findOrCreateNextGroup = async (group, nextLevel) => {
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
    return nextGroup
}

// called lazily whenever a group's dayCounter gets recomputed (see studentController's
// getGroupAndSyncWindow) - idempotent via `group.status`, so it only ever fires once per group
export const promoteGroupIfLevelComplete = async (group, durationDays) => {
    if (group.status !== 'active') return
    if (group.dayCounter < durationDays) return
    if (group.studentIds.length === 0) { group.status = 'completed'; await group.save(); return }

    const currentLevel = await Level.findById(group.levelId)
    const nextLevel = await Level.findOne({ languageId: group.languageId, order: { $gt: currentLevel.order } }).sort({ order: 1 })

    if (!nextLevel) {
        // top of the ladder for this language - nothing further to promote into
        group.status = 'completed'
        await group.save()
        return
    }

    const nextGroup = await findOrCreateNextGroup(group, nextLevel)
    for (const studentId of group.studentIds) {
        nextGroup.studentIds.push(studentId)
        const student = await User.findById(studentId)
        const courseEntry = student?.courses.find(c => String(c.languageId) === String(group.languageId))
        if (courseEntry) {
            courseEntry.levelId = nextLevel._id
            await student.save()
        }
        await StudentProgress.create({ studentId, groupId: nextGroup._id, day: 1, status: 'open' })
    }
    await nextGroup.save()

    group.status = 'completed'
    group.studentIds = []
    await group.save()
}
