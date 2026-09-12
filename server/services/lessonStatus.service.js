import LessonAttendance from "../models/LessonAttendance.js"
import Group from "../models/Group.js"
import TeacherAttendance from "../models/TeacherAttendance.js"

// a lesson's real "was it conducted" status is derived from either of two independent signals -
// ANY student attendance ever recorded for it (a QR scan, or a teacher manually marking a
// phone-less student present), OR the group's own teacher checking into that GROUP'S OWN BRANCH on
// the lesson's own calendar day (TeacherAttendance - the branch front-desk QR). Confirmed with the
// user: student-attendance-taking can be entered from anywhere (even from home), so on its own it
// proves nothing about whether the teacher actually showed up - a physical branch check-in that day
// is the stronger, harder-to-fake signal, so it's enough on its own too. Neither replaces the other
// - a lesson with real student attendance but no check-in that day (e.g. the QR display was down)
// still correctly shows conducted. Never a manual admin toggle, so it can't be biased by someone
// just clicking a cell. The one exception is 'substituted' - genuinely a human judgment call
// (someone else taught it that day), which stays admin-settable and always wins over the computed
// value. A lesson with neither signal yet stays 'unmarked' until its own calendar day has fully
// passed, at which point it resolves to 'not_conducted' - "give the day a chance to still happen"
// before judging it, same spirit as dayCounter.service.js's isPastLevelEnd waiting a full day past a
// level's end before promoting.
export const computeEffectiveLessonStatuses = async (lessons) => {
    if (lessons.length === 0) return {}
    const records = await LessonAttendance.find({ lessonId: { $in: lessons.map(l => l._id) } }).select('lessonId')
    const lessonsWithAttendance = new Set(records.map(r => String(r.lessonId)))

    const groupIds = [...new Set(lessons.map(l => String(l.groupId)))]
    const groups = await Group.find({ _id: { $in: groupIds } }).select('teacherId branchId').lean()
    const groupById = new Map(groups.map(g => [String(g._id), g]))

    // one bulk range query (by teacherId only - branch/date are matched in JS below) instead of one
    // query per lesson; TeacherAttendance.date is already stamped to UTC midnight by
    // teacherController.scanOwnAttendance, matching Lesson.date's own convention exactly, so a plain
    // getTime() comparison is exact - no timezone normalization needed here.
    const teacherIds = [...new Set(groups.map(g => String(g.teacherId)))]
    const lessonTimes = lessons.map(l => l.date.getTime())
    const checkIns = teacherIds.length
        ? await TeacherAttendance.find({
            teacherId: { $in: teacherIds }, date: { $gte: new Date(Math.min(...lessonTimes)), $lte: new Date(Math.max(...lessonTimes)) },
        }).select('teacherId branchId date').lean()
        : []
    const checkedIn = (teacherId, branchId, date) => checkIns.some(c =>
        String(c.teacherId) === String(teacherId) && String(c.branchId) === String(branchId) && c.date.getTime() === date.getTime())

    const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()))

    const statusByLessonId = {}
    for (const lesson of lessons) {
        if (lesson.teacherStatus === 'substituted') {
            statusByLessonId[String(lesson._id)] = 'substituted'
            continue
        }
        const group = groupById.get(String(lesson.groupId))
        if (lessonsWithAttendance.has(String(lesson._id)) || (group && checkedIn(group.teacherId, group.branchId, lesson.date))) {
            statusByLessonId[String(lesson._id)] = 'conducted'
            continue
        }
        const lessonDay = new Date(Date.UTC(lesson.date.getUTCFullYear(), lesson.date.getUTCMonth(), lesson.date.getUTCDate()))
        statusByLessonId[String(lesson._id)] = lessonDay < today ? 'not_conducted' : 'unmarked'
    }
    return statusByLessonId
}

// single-lesson convenience wrapper for call sites that only ever look at one lesson at a time
export const computeEffectiveLessonStatus = async (lesson) => (await computeEffectiveLessonStatuses([lesson]))[String(lesson._id)]
