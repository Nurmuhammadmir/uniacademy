// teacher can only ever see their own groups - filtered by req.auth.userId, never trusts a client-supplied id
import crypto from "crypto"
import Group from "../models/Group.js"
import Level from "../models/Level.js"
import User from "../models/User.js"
import StudentProgress from "../models/StudentProgress.js"
import ExamAttempt from "../models/ExamAttempt.js"
import Attendance from "../models/Attendance.js"
import AttendanceSession from "../models/AttendanceSession.js"
import TeacherAttendance from "../models/TeacherAttendance.js"
import TeacherAttendanceQR from "../models/TeacherAttendanceQR.js"
import Lesson from "../models/Lesson.js"
import LessonAttendance from "../models/LessonAttendance.js"
import VocabExercise from "../models/VocabExercise.js"
import GrammarExercise from "../models/GrammarExercise.js"
import ReadingText from "../models/ReadingText.js"
import ReadingExercise from "../models/ReadingExercise.js"
import Curriculum from "../models/Curriculum.js"
import Concept from "../models/Concept.js" // required so mongoose can resolve populate('conceptId'/'options'/'correct') refs below
import WordForm from "../models/WordForm.js"
import Translation from "../models/Translation.js"
import { computeDayCounter } from "../services/dayCounter.service.js"
import { ensureLessonsGenerated } from "../services/lessonGenerator.service.js"
import { getNextLessonDate, timeToMinutes, earliestLessonTimeOnDate, isLateCheckIn } from "../services/scheduleDays.service.js"
import { computeEffectiveLessonStatuses } from "../services/lessonStatus.service.js"

export const getMyGroups = async (req, res) => {
    try {
        // active only - a completed/archived group still exists for historical reporting (its
        // roster is deliberately kept, see groupPromotion.service.js), but a teacher's own "my
        // groups" list is for classes they're actually running today, not a history browser
        const groups = await Group.find({ teacherId: req.auth.userId, status: 'active' })
            .populate('languageId', 'name code')
            .populate('levelId', 'name order durationDays')
            .populate('roomId', 'name')

        const groupIds = groups.map(g => g._id)
        const doneRows = await StudentProgress.find({ groupId: { $in: groupIds }, status: 'done' })

        const withFreshDay = groups.map(g => {
            const rowsForGroup = doneRows.filter(r => String(r.groupId) === String(g._id))
            const averageScore = rowsForGroup.length > 0
                ? Math.round(rowsForGroup.reduce((sum, r) => sum + ((r.vocabScore || 0) + (r.grammarScore || 0) + (r.readingScore || 0)) / 3, 0) / rowsForGroup.length)
                : null
            return { ...g.toObject(), dayCounter: computeDayCounter(g.startDate, g.levelId?.durationDays || 30), averageScore }
        })

        // the single soonest upcoming class across every group this teacher runs - shown as a
        // banner at the top of My Groups so they don't have to scan the whole list to know what's next
        const now = new Date()
        let nextLesson = null
        for (const g of groups) {
            const date = getNextLessonDate(g, now)
            if (!date) continue
            const better = !nextLesson || date < nextLesson.date
                || (date.getTime() === nextLesson.date.getTime() && timeToMinutes(g.time) < timeToMinutes(nextLesson.time))
            if (better) {
                nextLesson = {
                    date, time: g.time, groupId: g._id, name: g.name || null,
                    language: g.languageId?.name, level: g.levelId?.name, room: g.roomId?.name || null,
                }
            }
        }

        res.json({ groups: withFreshDay, nextLesson })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api for the teacher's own timetable - their real-calendar lessons for a given date (today by
// default), across every room. Reuses the same Lesson rows generated for the admin Group Details
// Davomat tab - a teacher's timetable and a group's own lesson calendar are the same underlying data.
export const getMyTimetable = async (req, res) => {
    try {
        const requestedDate = req.query.date ? new Date(req.query.date) : new Date()
        const startOfDay = new Date(Date.UTC(requestedDate.getUTCFullYear(), requestedDate.getUTCMonth(), requestedDate.getUTCDate()))
        const endOfDay = new Date(startOfDay); endOfDay.setUTCDate(endOfDay.getUTCDate() + 1)

        const myGroups = await Group.find({ teacherId: req.auth.userId, status: 'active' })
            .populate('languageId', 'name').populate('levelId', 'name').populate('roomId', 'name')
        const groupIds = myGroups.map(g => g._id)

        const lessons = await Lesson.find({ groupId: { $in: groupIds }, date: { $gte: startOfDay, $lt: endOfDay } }).sort({ startTime: 1 })
        const rows = lessons.map(l => {
            const group = myGroups.find(g => String(g._id) === String(l.groupId))
            return {
                lessonId: l._id, startTime: l.startTime, endTime: l.endTime,
                room: group?.roomId?.name || '—', name: group?.name || null, language: group?.languageId?.name, level: group?.levelId?.name,
                groupId: group?._id, studentCount: group?.studentIds.length || 0,
            }
        })

        res.json({ date: startOfDay, lessons: rows })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to list one group's students with their completion percentage so far (auto-graded, teacher never scores)
export const getGroupStudents = async (req, res) => {
    try {
        const group = await Group.findOne({ _id: req.params.id, teacherId: req.auth.userId }).populate('studentIds', 'name phone')
        if (!group) return res.status(404).json({ error: 'not_found' })

        const progressRows = await StudentProgress.find({ groupId: group._id })

        const students = group.studentIds.map(student => {
            const rows = progressRows.filter(p => String(p.studentId) === String(student._id))
            const done = rows.filter(r => r.status === 'done').length
            const total = rows.length || 1
            return {
                id: student._id,
                name: student.name,
                phone: student.phone,
                completionPercent: Math.round((done / total) * 100),
            }
        })

        // "what will my students actually be asked to do today" - the group's current day (e.g.
        // 4/30) plus whether each of the 3 sections actually has content assigned for that day in
        // the curriculum (a day can legitimately be missing one, e.g. no reading text yet), so the
        // teacher sees the same shape of homework her students see on their own Today page, without
        // having to go check a student's phone
        const level = await Level.findById(group.levelId).select('durationDays')
        const durationDays = level?.durationDays || 30
        const dayCounter = computeDayCounter(group.startDate, durationDays)
        const [vocabCount, grammarCount, readingText] = await Promise.all([
            VocabExercise.countDocuments({ languageId: group.languageId, levelId: group.levelId, day: dayCounter }),
            GrammarExercise.countDocuments({ languageId: group.languageId, levelId: group.levelId, day: dayCounter }),
            ReadingText.exists({ languageId: group.languageId, levelId: group.levelId, day: dayCounter }),
        ])

        res.json({
            students,
            today: {
                dayCounter, durationDays,
                vocab: vocabCount > 0, grammar: grammarCount > 0, reading: !!readingText,
            },
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// the actual real content behind today's homework for this group - not just "is there content"
// (getGroupStudents' `today` flags already cover that), the real vocab/grammar/reading questions
// themselves, so a teacher can see and try exactly what her students will see, before class. Purely
// read-only: no StudentProgress row is ever touched here, nothing about this is graded or saved -
// this mirrors studentController.getHomeworkForDay's content-loading half, just without any of the
// day-locked/expired gating or progress-row bookkeeping a real student submission needs.
export const getTodayHomework = async (req, res) => {
    try {
        const group = await Group.findOne({ _id: req.params.id, teacherId: req.auth.userId, status: 'active' })
        if (!group) return res.status(404).json({ error: 'not_found' })

        const level = await Level.findById(group.levelId).select('durationDays')
        const durationDays = level?.durationDays || 30
        const dayCounter = computeDayCounter(group.startDate, durationDays)

        const curriculum = await Curriculum.findOne({ languageId: group.languageId, levelId: group.levelId, day: dayCounter }).populate('conceptIds')
        const vocab = await VocabExercise.find({ languageId: group.languageId, levelId: group.levelId, day: dayCounter })
            .populate('conceptId').populate('options').populate('correct')
        const grammar = await GrammarExercise.find({ languageId: group.languageId, levelId: group.levelId, day: dayCounter })
        const readingText = await ReadingText.findOne({ languageId: group.languageId, levelId: group.levelId, day: dayCounter })
        const readingExercises = readingText ? await ReadingExercise.find({ readingTextId: readingText._id }) : []

        // same word/translation enrichment studentController.getHomeworkForDay does, so a vocab
        // prompt here renders identically to what the student actually sees on their own phone
        const conceptIds = new Set()
        ;(curriculum?.conceptIds || []).forEach(c => conceptIds.add(String(c._id)))
        vocab.forEach(v => {
            if (v.conceptId) conceptIds.add(String(v.conceptId._id))
            ;(v.options || []).forEach(o => conceptIds.add(String(o._id)))
            if (v.correct) conceptIds.add(String(v.correct._id))
        })
        const wordForms = await WordForm.find({ conceptId: { $in: [...conceptIds] }, languageId: group.languageId })
        const wordFormByConceptId = Object.fromEntries(wordForms.map(w => [String(w.conceptId), w]))
        const translations = await Translation.find({ conceptId: { $in: [...conceptIds] } })
        const translationsByConceptId = {}
        translations.forEach(t => {
            const key = String(t.conceptId)
            if (!translationsByConceptId[key]) translationsByConceptId[key] = {}
            translationsByConceptId[key][t.nativeLanguageCode] = t.text
        })
        const withWord = (concept) => {
            if (!concept) return concept
            const obj = concept.toObject ? concept.toObject() : concept
            const wf = wordFormByConceptId[String(obj._id)]
            const tr = translationsByConceptId[String(obj._id)] || {}
            return { ...obj, word: wf?.word || '', example: wf?.example || '', translations: { ru: tr.ru || '', uz: tr.uz || '', kaa: tr.kaa || '' } }
        }
        const enrichedVocab = vocab.map(v => ({
            ...v.toObject(),
            conceptId: withWord(v.conceptId),
            options: (v.options || []).map(withWord),
            correct: withWord(v.correct),
        }))

        res.json({
            dayCounter, durationDays,
            vocab: enrichedVocab, grammar, readingText, readingExercises,
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to see one student's full day-by-day breakdown within this group
export const getStudentDayDetail = async (req, res) => {
    try {
        const { id: groupId, studentId } = req.params
        const group = await Group.findOne({ _id: groupId, teacherId: req.auth.userId })
        if (!group) return res.status(404).json({ error: 'not_found' })

        const student = await User.findOne({ _id: studentId, role: 'student' }).select('name phone')
        if (!student) return res.status(404).json({ error: 'not_found' })

        // a full day-by-day table for every day the group has actually reached so far (1..dayCounter),
        // not just whichever days happen to already have a StudentProgress row - a day the student
        // hasn't opened/submitted yet has no row at all, which was silently dropping it from this
        // view entirely instead of showing it as "not started yet". Same day-count math getMyGroups uses.
        const level = await Level.findById(group.levelId).select('durationDays')
        const dayCounter = computeDayCounter(group.startDate, level?.durationDays || 30)

        const existingRows = await StudentProgress.find({ groupId, studentId })
        const rowByDay = Object.fromEntries(existingRows.map(r => [r.day, r]))
        const days = Array.from({ length: dayCounter }, (_, i) => i + 1).map(day => {
            const row = rowByDay[day]
            return {
                day,
                status: row?.status || 'open',
                vocabDone: row?.vocabDone || false,
                vocabScore: row?.vocabScore ?? null,
                grammarScore: row?.grammarScore ?? null,
                readingScore: row?.readingScore ?? null,
            }
        })

        const examAttempts = await ExamAttempt.find({ studentId }).sort({ date: -1 })
            .populate({ path: 'examId', populate: [{ path: 'languageId', select: 'name' }, { path: 'levelId', select: 'name' }] })

        // real-calendar attendance history - every lesson that has actually happened so far (up to
        // today, or the group's end date if it already finished), with this student's marked status.
        // Separate from the homework day-counter `rows` above - this is real attendance (present at
        // the lesson), not homework completion.
        const today = new Date()
        const rangeEnd = group.endDate && group.endDate < today ? group.endDate : today
        const lessons = await ensureLessonsGenerated(group, group.startDate, rangeEnd)
        const records = await LessonAttendance.find({ lessonId: { $in: lessons.map(l => l._id) }, studentId })
        const statusByLesson = Object.fromEntries(records.map(r => [String(r.lessonId), r.status]))
        const attendance = lessons.map(l => ({ lessonId: l._id, date: l.date, status: statusByLesson[String(l._id)] || 'unmarked' }))

        res.json({ student, days, examAttempts, attendance })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to generate a fresh attendance QR token for today's session - short-lived on purpose (2 min)
// so a screenshot can't be reused after class ends. Calling this again before it expires just
// issues a new one; the old one silently stops working.
export const createAttendanceSession = async (req, res) => {
    try {
        // status:'active' matters now that a completed group's studentIds are kept (not cleared)
        // for historical reporting - without this filter a teacher could still open a live
        // attendance QR for a group that finished and already promoted its students onward
        const group = await Group.findOne({ _id: req.params.id, teacherId: req.auth.userId, status: 'active' })
        if (!group) return res.status(404).json({ error: 'not_found' })

        const level = await Level.findById(group.levelId).select('durationDays')
        const day = computeDayCounter(group.startDate, level?.durationDays || 30)
        const token = crypto.randomBytes(16).toString('hex')
        const expiresAt = new Date(Date.now() + 2 * 60 * 1000)

        const session = await AttendanceSession.create({ groupId: group._id, day, token, expiresAt })
        res.status(201).json({ token: session.token, expiresAt: session.expiresAt, day })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to see who has scanned in for a given day - roster with present/absent per student
export const getAttendanceForDay = async (req, res) => {
    try {
        const group = await Group.findOne({ _id: req.params.id, teacherId: req.auth.userId }).populate('studentIds', 'name phone')
        if (!group) return res.status(404).json({ error: 'not_found' })

        const day = Number(req.params.day)
        const records = await Attendance.find({ groupId: group._id, day })
        const presentIds = new Set(records.map(r => String(r.studentId)))

        const roster = group.studentIds.map(s => ({
            studentId: s._id,
            name: s.name,
            present: presentIds.has(String(s._id)),
            scannedAt: records.find(r => String(r.studentId) === String(s._id))?.scannedAt || null,
        }))

        res.json({ day, roster, presentCount: presentIds.size, totalCount: group.studentIds.length })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api for the teacher's own profile screen
export const getMe = async (req, res) => {
    try {
        const teacher = await User.findById(req.auth.userId).select('-passwordHash').populate('branchId', 'name')
        if (!teacher) return res.status(404).json({ error: 'not_found' })

        const groups = await Group.find({ teacherId: teacher._id })
        const activeGroups = groups.filter(g => g.status === 'active')
        const uniqueStudentIds = new Set()
        activeGroups.forEach(g => g.studentIds.forEach(id => uniqueStudentIds.add(String(id))))

        // today's own check-in status + whether it was on time against her own earliest lesson
        // today - same judgment admin/director see, just from the teacher's own side
        const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0)
        const endOfDay = new Date(startOfDay); endOfDay.setUTCDate(endOfDay.getUTCDate() + 1)
        const todayCheckIn = await TeacherAttendance.findOne({ teacherId: teacher._id, date: { $gte: startOfDay, $lt: endOfDay } })
        const firstLessonTime = earliestLessonTimeOnDate(activeGroups, startOfDay)

        res.json({
            teacher,
            employedSince: teacher.createdAt,
            activeGroupsCount: activeGroups.length,
            totalStudents: uniqueStudentIds.size,
            todayAttendance: {
                checkedIn: !!todayCheckIn,
                scannedAt: todayCheckIn?.scannedAt || null,
                firstLessonTime,
                late: isLateCheckIn(todayCheckIn?.scannedAt || null, firstLessonTime),
            },
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api for a teacher to check THEMSELVES in for today by scanning the QR their admin generated -
// the token must belong to THIS teacher (not just any valid session) and not be expired
export const scanOwnAttendance = async (req, res) => {
    try {
        const { token } = req.body
        const qr = await TeacherAttendanceQR.findOne({ token })
        if (!qr || qr.expiresAt < new Date()) {
            return res.status(400).json({ error: qr ? 'qr_expired' : 'invalid_qr' })
        }

        // UTC, not local server time - directorController.getAttendanceOverview parses "today" from
        // a plain YYYY-MM-DD string, which JS always treats as UTC midnight; zeroing locally here
        // would silently disagree with that read-side calculation on any non-UTC server timezone,
        // making a real check-in invisible to the director's attendance overview
        const today = new Date(); today.setUTCHours(0, 0, 0, 0)
        const existing = await TeacherAttendance.findOne({ teacherId: req.auth.userId, date: today })
        if (existing) return res.json({ alreadyMarked: true })

        try {
            await TeacherAttendance.create({ teacherId: req.auth.userId, date: today })
        } catch (createError) {
            if (createError.code === 11000) return res.json({ alreadyMarked: true })
            throw createError
        }

        res.status(201).json({ alreadyMarked: false })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// a teacher's own Davomat-style month grid, grouped by their own group - same shape/logic as the
// admin version in adminController.getTeacherAttendanceGrid, just scoped to req.auth.userId (no
// branch-membership check needed since it's always their own record) and read-only: a teacher can
// see their own conducted/not-conducted marks here, but only an admin can set them
export const getMyAttendanceGrid = async (req, res) => {
    try {
        const month = req.query.month || new Date().toISOString().slice(0, 7)
        const [year, mo] = month.split('-').map(Number)
        const rangeStart = new Date(Date.UTC(year, mo - 1, 1))
        const rangeEnd = new Date(Date.UTC(year, mo, 0))

        const groupDocs = await Group.find({ teacherId: req.auth.userId, status: 'active' })
            .populate('languageId', 'name').populate('levelId', 'name')

        let conducted = 0, total = 0
        const groups = []
        for (const group of groupDocs) {
            const lessons = await ensureLessonsGenerated(group, rangeStart, rangeEnd)
            const statusByLessonId = await computeEffectiveLessonStatuses(lessons)
            const lessonRows = lessons.map(l => {
                total++
                const teacherStatus = statusByLessonId[String(l._id)]
                if (teacherStatus === 'conducted' || teacherStatus === 'substituted') conducted++
                return {
                    lessonId: l._id, date: l.date.toISOString().slice(0, 10),
                    dayOfWeek: l.date.getUTCDay(), startTime: l.startTime, endTime: l.endTime,
                    teacherStatus,
                }
            })
            groups.push({ groupId: group._id, languageName: group.languageId?.name, levelName: group.levelId?.name, lessons: lessonRows })
        }

        res.json({ groups, stats: { conducted, total, percent: total > 0 ? Math.round((conducted / total) * 100) : 0 } })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api for a teacher to manually mark a student present/absent - covers students without a phone
// to scan with. Marking present creates the same Attendance record a QR scan would; marking absent
// removes it (a student never has a "false" attendance row, they simply have none for that day).
export const markStudentAttendance = async (req, res) => {
    try {
        const { id: groupId, studentId, day } = req.params
        const { present } = req.body

        // status:'active' - see createAttendanceSession's comment above
        const group = await Group.findOne({ _id: groupId, teacherId: req.auth.userId, status: 'active' })
        if (!group) return res.status(404).json({ error: 'not_found' })

        if (present) {
            await Attendance.findOneAndUpdate(
                { studentId, groupId, day: Number(day) },
                { studentId, groupId, day: Number(day), scannedAt: new Date() },
                { upsert: true }
            )
        } else {
            await Attendance.findOneAndDelete({ studentId, groupId, day: Number(day) })
        }

        // also keeps the real-calendar LessonAttendance in sync - relative day N of the homework
        // counter always corresponds to exactly startDate + (N-1) calendar days (see
        // computeDayCounter), so the matching real Lesson can be resolved directly with no search.
        // This is what makes manually marking a phone-less student ALSO count toward that lesson
        // being "conducted" (see lessonStatus.service.js) - not just a QR scan.
        const dayDate = new Date(group.startDate)
        dayDate.setUTCDate(dayDate.getUTCDate() + (Number(day) - 1))
        const dayStart = new Date(Date.UTC(dayDate.getUTCFullYear(), dayDate.getUTCMonth(), dayDate.getUTCDate()))
        const [lesson] = await ensureLessonsGenerated(group, dayStart, dayStart)
        if (lesson) {
            if (present) {
                await LessonAttendance.findOneAndUpdate(
                    { lessonId: lesson._id, studentId },
                    { status: 'present' },
                    { upsert: true, runValidators: true }
                )
            } else {
                await LessonAttendance.findOneAndDelete({ lessonId: lesson._id, studentId })
            }
        }

        res.json({ present: !!present })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
