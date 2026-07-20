import User from "../models/User.js"
import Group from "../models/Group.js"
import Lesson from "../models/Lesson.js"
import LessonAttendance from "../models/LessonAttendance.js"
import { sendPushToParent } from "./pushNotification.service.js"

// real-time - fires the moment a student's own QR scan marks them present, so a parent finds out
// the same day their child actually attended, not the next morning in a digest. Silent on any
// failure (a missing/broken push subscription should never surface as an error to the student
// scanning their own attendance QR).
export const notifyParentsOfAttendance = async (studentId, studentName) => {
    try {
        const parents = await User.find({ role: 'parent', childStudentIds: studentId }).select('_id')
        for (const parent of parents) {
            await sendPushToParent(parent._id, {
                title: 'Attendance',
                body: `${studentName} attended class today.`,
                tag: `attendance-${studentId}-${new Date().toISOString().slice(0, 10)}`,
            })
        }
    } catch (error) {
        console.log('notifyParentsOfAttendance failed', error)
    }
}

// once-a-day job (see server.js's cron wiring): for every parent, for every child, for every
// active group that actually had a lesson YESTERDAY, notify if the child wasn't marked present -
// this is the "your child did NOT attend" half; the "DID attend" half is real-time (above), not
// part of this digest, so a child who attended isn't double-notified.
// Also nags about any course that currently needs payment - repeats every day this job runs until
// the course is paid up again, by design (a payment reminder that stops after one try isn't useful).
export const sendDailyParentDigest = async () => {
    const yesterday = new Date()
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    const dayStart = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate()))
    const dayEnd = new Date(dayStart)
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)

    const parents = await User.find({ role: 'parent' }).select('_id childStudentIds')

    for (const parent of parents) {
        for (const childId of parent.childStudentIds) {
            const child = await User.findById(childId).select('name courses')
            if (!child) continue

            const groups = await Group.find({ studentIds: childId, status: 'active' })
            for (const group of groups) {
                const lesson = await Lesson.findOne({ groupId: group._id, date: { $gte: dayStart, $lt: dayEnd } })
                if (!lesson) continue // group had no lesson yesterday - nothing to judge

                const attendance = await LessonAttendance.findOne({ lessonId: lesson._id, studentId: childId })
                if (!attendance || attendance.status === 'unmarked' || attendance.status === 'absent') {
                    await sendPushToParent(parent._id, {
                        title: 'Attendance',
                        body: `${child.name} did not attend class yesterday.`,
                        tag: `absence-${childId}-${dayStart.toISOString().slice(0, 10)}`,
                    })
                }
            }

            for (const course of child.courses || []) {
                const needsPayment = !course.isActive || (course.subscriptionExpiresAt && new Date(course.subscriptionExpiresAt) < new Date())
                if (needsPayment) {
                    await sendPushToParent(parent._id, {
                        title: 'Payment due',
                        body: `You need to pay for ${child.name}'s course.`,
                        tag: `payment-${childId}-${String(course._id)}`,
                    })
                }
            }
        }
    }
}
