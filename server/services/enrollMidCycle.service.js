// RULE #6 — joining a group mid-cycle starts at the group's current day, not day 1
import StudentProgress from "../models/StudentProgress.js"

export const enrollStudentMidCycle = async (studentId, group) => {
    return StudentProgress.create({ studentId, groupId: group._id, day: group.dayCounter, status: 'open' })
}
