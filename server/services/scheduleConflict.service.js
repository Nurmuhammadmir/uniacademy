// RULE #4 — teacher schedule conflict
import Group from "../models/Group.js"

export const assertNoTeacherConflict = async (teacherId, schedulePattern, time, excludeGroupId = null) => {
    const query = { teacherId, schedulePattern, time, status: 'active' }
    if (excludeGroupId) query._id = { $ne: excludeGroupId }

    const conflict = await Group.exists(query)
    if (conflict) {
        const err = new Error('teacher_schedule_conflict')
        err.status = 409
        err.code = 'teacher_schedule_conflict'
        throw err
    }
}
