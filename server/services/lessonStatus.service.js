import LessonAttendance from "../models/LessonAttendance.js"

// a lesson's real "was it conducted" status is derived from whether ANY student attendance was
// ever recorded for it (a QR scan, or a teacher manually marking a phone-less student present) -
// never a manual admin toggle, so it can't be biased by someone just clicking a cell. The one
// exception is 'substituted' - genuinely a human judgment call (someone else taught it that day),
// which stays admin-settable and always wins over the computed value. A lesson with no attendance
// yet stays 'unmarked' until its own calendar day has fully passed, at which point it resolves to
// 'not_conducted' - "give the day a chance to still happen" before judging it, same spirit as
// dayCounter.service.js's isPastLevelEnd waiting a full day past a level's end before promoting.
export const computeEffectiveLessonStatuses = async (lessons) => {
    if (lessons.length === 0) return {}
    const records = await LessonAttendance.find({ lessonId: { $in: lessons.map(l => l._id) } }).select('lessonId')
    const lessonsWithAttendance = new Set(records.map(r => String(r.lessonId)))
    const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()))

    const statusByLessonId = {}
    for (const lesson of lessons) {
        if (lesson.teacherStatus === 'substituted') {
            statusByLessonId[String(lesson._id)] = 'substituted'
            continue
        }
        if (lessonsWithAttendance.has(String(lesson._id))) {
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
