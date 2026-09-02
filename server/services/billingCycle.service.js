import mongoose from "mongoose"
import User from "../models/User.js"
import Group from "../models/Group.js"
import Account from "../models/Account.js"
import LedgerEntry from "../models/LedgerEntry.js"
import { getOrCreateAccount, postEntry, computePeriodCost, dateOnlyUTC, startOfNextMonthUTC } from "./ledger.service.js"

// the kinds computeAccountAllocation/computeCoveredDebtPeriodsBatch both need fetched, in one place
// so neither can silently drift out of sync with what the other reads
const ALLOCATION_KINDS = ['debt', 'payment', 'refund', 'expense', 'discount', 'debt_reversal']

// the actual fold+FIFO math, given an already-fetched list of one account's entries (any kind in
// ALLOCATION_KINDS) - factored out so computeAccountAllocation (one account) and
// computeCoveredDebtPeriodsBatch (many accounts, one bulk query) share this ONE implementation
// instead of two copies that already drifted apart once (computeCoveredDebtPeriodsBatch's own
// predecessor never learned about debt_reversal at all, so a group's revenue calc kept crediting a
// teacher for days a student was refunded for after leaving - a real bug, caught by the reversal
// feature's own verification test, not by inspection).
const foldReversalsAndAllocate = (entries) => {
    // a debt_reversal (posted when a student is removed from a group mid-period - see
    // removeStudentFromGroup) directly shrinks the exact debt entry it corrects (sourceId points at
    // it), folded in right here before either pass below runs - so the rest of this function, and
    // every caller of it, never needs to know reversals exist at all. This is deliberately NOT
    // treated as "cash available" the way a payment/discount is: it's not money that arrived, it's
    // the underlying charge itself turning out smaller than first billed, so it correctly shrinks
    // both what the student owes AND the teacher's revenue share for that period, instead of
    // (wrongly) freeing up cash that could cover some OTHER course's debt.
    const reversedAmountByDebtId = new Map()
    for (const e of entries) {
        if (e.kind === 'debt_reversal' && e.sourceType === 'ledgerEntry' && e.sourceId) {
            const key = String(e.sourceId)
            reversedAmountByDebtId.set(key, (reversedAmountByDebtId.get(key) || 0) + e.amount)
        }
    }
    // originalAmount/reversedAmount are carried alongside the (possibly folded) amount so a display
    // layer can still show the debt row's real, as-posted amount (matching its own immutable
    // description) instead of a silently-shrunk number that would no longer match what its own
    // description says it is - see studentLedger.service.js's computeCourseStatement.
    // a plain object, not a clone of the Mongoose document - every caller only ever reads plain
    // fields off these (.amount, .languageId, ._id, ...), and trying to keep it a real Document (e.g.
    // via Object.create(Object.getPrototypeOf(e))) crashes the moment anything touches a
    // schema-mapped property, since that half-built clone has none of Document's own internal
    // (un-enumerable) bookkeeping state a real one gets from its constructor.
    const relevantEntries = entries
        .filter(e => e.kind !== 'debt_reversal')
        .map(e => {
            if (e.kind !== 'debt') return e
            const reversed = reversedAmountByDebtId.get(String(e._id)) || 0
            if (!reversed) return e
            const plain = typeof e.toObject === 'function' ? e.toObject() : e
            return { ...plain, amount: e.amount - reversed, originalAmount: e.amount, reversedAmount: reversed }
        })

    // pass 1: total cash the wallet has ever actually received, regardless of which course (if any)
    // it was nominally recorded against - a discount/expense settles a debt exactly like a real
    // payment as far as teacher revenue is concerned, a refund gives cash back out.
    let cashAvailable = 0
    for (const e of relevantEntries) {
        if (e.kind === 'payment' || e.kind === 'expense' || e.kind === 'discount') cashAvailable += e.amount
        else if (e.kind === 'refund') cashAvailable -= e.amount
    }

    // pass 2: spend that one pool against every debt ever posted, oldest first, regardless of which
    // course each debt belongs to - a student who overpaid on course A and is then billed for course
    // B gets B's debt covered immediately out of the SAME pool, exactly like a real wallet.
    const allocations = []
    for (const e of relevantEntries) {
        if (e.kind !== 'debt') continue
        const covered = Math.min(e.amount, Math.max(0, cashAvailable))
        cashAvailable -= covered
        allocations.push({ entry: e, covered })
    }
    return allocations
}

// a payment is a deposit into the student's ONE shared wallet, never earmarked for a specific
// course (confirmed spec: no per-course payment - paying just adds to the account's overall
// balance). So "how much of course X's debt is still unpaid" can't be answered by looking at course
// X's own entries in isolation anymore - it has to walk the WHOLE account's chronological history
// (every course interleaved) applying its cash oldest-debt-first, then ask how much of THAT
// allocation landed on course X's own debts. This is the one place that walk happens for a single
// account; every per-course figure (owed, covered-for-teacher-revenue) is a filter over this SAME
// result, so they can never silently disagree with each other or with the account's own stored
// balance. computeCoveredDebtPeriodsBatch below runs the identical foldReversalsAndAllocate logic
// for many accounts at once instead of calling this in a loop.
export const computeAccountAllocation = async (accountId) => {
    const entries = await LedgerEntry.find({
        accountId: new mongoose.Types.ObjectId(accountId), kind: { $in: ALLOCATION_KINDS },
    }).sort({ date: 1, _id: 1 })
    return foldReversalsAndAllocate(entries)
}

// how much is still owed for ONE specific course (languageId) - a simple filter over the account's
// one shared-wallet allocation above, not a second/independent computation.
export const computeCourseOwed = async (accountId, languageId) => {
    const allocations = await computeAccountAllocation(accountId)
    let debt = 0, covered = 0
    for (const a of allocations) {
        if (String(a.entry.languageId) !== String(languageId)) continue
        debt += a.entry.amount
        covered += a.covered
    }
    return debt - covered
}

// how much of ONE specific course's debt has actually been settled (by any money in the wallet,
// regardless of which course it was originally paid toward) - the direct counterpart to
// computeCourseOwed, used wherever a "total paid toward this course" figure is shown.
export const computeCourseCovered = async (accountId, languageId) => {
    const allocations = await computeAccountAllocation(accountId)
    return allocations.filter(a => String(a.entry.languageId) === String(languageId)).reduce((sum, a) => sum + a.covered, 0)
}

// recognizes exactly ONE billing chunk for a student's course, if one is actually due - safe to call
// unconditionally (the enrollment flow calls it once immediately; the daily job calls it for every
// enrolled course every day) since it no-ops until the real-world date/state says a chunk is due:
//   - nothing to do if the course has no group yet, or the group's billing window hasn't reached
//     this chunk's start day yet, or the STUDENT (whole account) is frozen, or the window is past
//     the group's endDate
// Confirmed cadence: the FIRST chunk (right at enrollment) is day-prorated from the enrollment date
// to the end of that calendar month; every chunk after that is a full month, starting the 1st.
export const recognizeNextPeriod = async (student, course, { createdBy = null, enrolledAt = null } = {}) => {
    if (!course.groupId) return null
    const group = await Group.findById(course.groupId)
    if (!group) return null
    // confirmed real incident: a group with a null/non-numeric price crashed this function entirely
    // (group.price.toLocaleString() on null) - the daily cron's own try/catch now stops that from
    // taking down every OTHER student's billing too, but this ONE course would otherwise silently
    // fail to bill forever, every single day, with nothing but an invisible console.log to show for
    // it. Bailing out cleanly here instead means it just never posts (same as any other "not due
    // yet" no-op) - loud enough to notice via a stuck balance, not a crash loop nobody sees.
    if (typeof group.price !== 'number' || !Number.isFinite(group.price) || group.price < 0) return null

    const today = dateOnlyUTC(new Date())
    // enrolledAt only ever affects the very FIRST period (recognizedThrough not set yet) - once a
    // course has a real billing history, every later period is always "the 1st of whatever month is
    // next", never backdated, so this can't retroactively touch anything already recognized.
    const firstWindowStart = enrolledAt ? dateOnlyUTC(enrolledAt) : today
    const windowStart = course.recognizedThrough ? startOfNextMonthUTC(course.recognizedThrough) : firstWindowStart
    if (windowStart > today) return null // not due yet
    if (windowStart > group.endDate) return null // course's billing window is over
    if (student.frozen) return null // freeze pauses billing only, whole-account - nothing posts, recognizedThrough does NOT advance, so the paused period is picked back up whenever unfrozen

    // course price is never discounted here (confirmed spec) - a discount is a separate, immediate
    // transaction (see discountApplication.service.js: a real "Chegirma" branch expense crediting the
    // student's balance), not a reduction baked into this month's charge
    const natural = computePeriodCost(group.price, windowStart)
    let cost = natural.rawCost
    let windowEnd = natural.windowEnd
    let isFullMonth = natural.isFullMonth

    // if the course itself ends partway through this calendar month (group.endDate falls before the
    // month's natural last day), the last chunk must stop there too - otherwise a course ending
    // mid-month (e.g. group runs Aug 10 - Sep 10) still got billed for the FULL September price even
    // though it only actually runs 10 of September's days. Same day-proration formula as a partial
    // FIRST month (price * daysCharged / daysInMonth), just applied to the tail end instead.
    if (group.endDate && group.endDate < windowEnd) {
        windowEnd = group.endDate
        const daysCharged = Math.round((windowEnd - windowStart) / 86400000) + 1
        cost = Math.round(group.price * daysCharged / natural.daysInMonth)
        isFullMonth = false
    }

    const dayLabel = isFullMonth
        ? `${windowStart.toISOString().slice(0, 10)} – ${windowEnd.toISOString().slice(0, 10)}`
        : `${windowStart.toISOString().slice(0, 10)} – ${windowEnd.toISOString().slice(0, 10)} (partial month)`
    const description = `${dayLabel} · ${group.price.toLocaleString()}/mo = ${cost.toLocaleString()}`

    // a deliberately backdated first period is dated to when it actually started (windowStart), not
    // "today" (when the admin happens to be entering it), so it sorts correctly against anything
    // else backdated around the same real-world date - every other case (a normal, non-backdated
    // enrollment, or any later recurring monthly period) keeps dating by `today` exactly as before,
    // completely untouched, including the already-discussed/confirmed 3am cron timing behavior.
    const isBackdatedFirstPeriod = !course.recognizedThrough && enrolledAt
    let entry = null
    if (cost > 0) {
        const studentAccount = await getOrCreateAccount('student', student._id)
        entry = await postEntry({
            accountId: studentAccount._id,
            direction: 'increase',
            amount: cost,
            kind: 'debt',
            meta: {
                studentId: student._id, groupId: group._id, languageId: course.languageId, levelId: course.levelId,
                teacherId: group.teacherId, periodStart: windowStart, periodEnd: windowEnd,
            },
            description,
            createdBy,
            date: isBackdatedFirstPeriod ? windowStart : today,
        })
    }

    course.recognizedThrough = windowEnd
    await recomputeEnrollmentStatus(student)
    await student.save()
    return entry
}

// flips EVERY one of a student's group-assigned courses between 'inactive'/'active' together,
// based on the account's own OVERALL pooled balance - confirmed spec: a student is "one wallet",
// not a separate purse per course, so credit built up on one course (an overpayment, a discount)
// covers debt on any other course they're enrolled in, and every course activates the moment the
// account as a whole owes nothing. This is deliberately NOT the same figure computeCourseOwed
// answers (that stays per-course, still correct/necessary for billing/teacher-revenue/discount
// math below, which must never let one teacher's course get credited for money paid toward a
// DIFFERENT teacher's course) - only this display status is judged by the pooled total.
// Courses with no group at all are left untouched - "active" means nothing for one that was never
// actually placed anywhere.
export const recomputeEnrollmentStatus = async (student) => {
    const account = await getOrCreateAccount('student', student._id)
    const status = account.balance > 0 ? 'inactive' : 'active'
    for (const course of student.courses) {
        if (course.groupId) course.enrollmentStatus = status
    }
}

// called once, immediately, when an admin assigns a student to a group (see adminController's
// addStudentToGroup) - posts the first (day-prorated) debt right away rather than waiting for the
// daily job, per the confirmed "debt recorded at enrollment, not lazily after payment" requirement.
// enrolledAt is optional - confirmed spec: an admin can backdate WHEN a student actually joined (they
// really joined weeks ago, only being entered into the system now), and the first period's debt is
// prorated from that real date instead of always from today.
export const recognizeEnrollmentDebt = async (student, course, createdBy, enrolledAt = null) => {
    return recognizeNextPeriod(student, course, { createdBy, enrolledAt })
}

// called when an admin removes a student from a group (see adminController's removeStudentFromGroup)
// - confirmed spec: the unused days of whatever billing period is currently in progress for this
// course get returned to the student's balance, not kept as if the full period had been taught.
// recognizeNextPeriod never posts a future period in advance (its own due-date guard), so at most
// ONE debt entry can ever have periodStart <= today <= periodEnd for a course at any moment - that's
// the one this reverses, prorated by the days strictly after today (today itself still counts as
// attended). Safe to call unconditionally: no-ops if there's no currently-open period, or if today
// is already the period's last day (nothing left to return).
export const reverseUnusedPeriod = async (student, course, group, createdBy = null, reason = 'Removed from group') => {
    const studentAccount = await getOrCreateAccount('student', student._id)
    const today = dateOnlyUTC(new Date())

    const currentDebt = await LedgerEntry.findOne({
        accountId: studentAccount._id, languageId: course.languageId, kind: 'debt',
        periodStart: { $lte: today }, periodEnd: { $gte: today },
    }).sort({ periodStart: -1 })
    if (!currentDebt) return null

    const periodStart = dateOnlyUTC(currentDebt.periodStart)
    const periodEnd = dateOnlyUTC(currentDebt.periodEnd)
    const totalDays = Math.round((periodEnd - periodStart) / 86400000) + 1
    const unusedDays = Math.round((periodEnd - today) / 86400000)
    if (unusedDays <= 0) return null

    const reversalAmount = Math.round(currentDebt.amount * unusedDays / totalDays)
    if (reversalAmount <= 0) return null

    const entry = await postEntry({
        accountId: studentAccount._id,
        direction: 'decrease',
        amount: reversalAmount,
        kind: 'debt_reversal',
        meta: {
            studentId: student._id, groupId: group._id, languageId: course.languageId, levelId: course.levelId,
            teacherId: group.teacherId, periodStart: currentDebt.periodStart, periodEnd: currentDebt.periodEnd,
            sourceType: 'ledgerEntry', sourceId: currentDebt._id,
        },
        description: `${reason} ${today.toISOString().slice(0, 10)} - ${unusedDays}/${totalDays} unused days of ${currentDebt.amount.toLocaleString()} returned = ${reversalAmount.toLocaleString()}`,
        createdBy,
        date: today,
    })

    // confirmed real bug (found live, on production data): course.recognizedThrough was left pointing
    // at the END of the now-partially-reversed period, so re-adding this student to a group for the
    // same language later THIS SAME MONTH saw "already recognized through end of month" and silently
    // skipped billing them for the rest of it entirely - a free ride. Clearing it here (the one place
    // both removeStudentFromGroup and setStudentFreeze route through) makes recognizeNextPeriod treat
    // the next call exactly like a fresh mid-month enrollment - it re-prorates from whatever day
    // they're actually re-added/unfrozen on, instead of jumping straight to next month.
    if (entry) course.recognizedThrough = null

    return entry
}

// cash-basis on purpose (confirmed): a teacher's revenue share is only ever earned on a period
// that's actually been settled, never on debt that's merely been charged but not yet resolved -
// e.g. a student billed 100,000 who's only paid 20,000 credits the teacher's share against the
// 20,000, not the full 100,000, until more of it gets paid. A discount settles a period the same way
// a payment does (confirmed): the school books the discount as a real cost specifically so a
// promotional price never shrinks what the teacher earns - a 100,000 course discounted 50% still
// pays the teacher their full cut of 100,000, half funded by the student's own 50,000 payment, half
// by the school's own 50,000 expense. Confirmed spec: a payment is NEVER earmarked for one specific
// course - it's a deposit into the student's one shared wallet, and whichever debt happens to be
// oldest (regardless of which course) is what it pays down first.
//
// Same computation as computing one account's allocation (see computeAccountAllocation above), for
// MANY students at once - used wherever a whole group/branch's revenue needs summing (salary
// calculation, group revenue reports). Both share the exact same foldReversalsAndAllocate logic, so
// a debt_reversal (a student removed from a group mid-period - see removeStudentFromGroup) shrinks
// the teacher's revenue share here exactly as reliably as it shrinks computeCourseOwed's figure -
// these two used to be separate implementations that could (and once did) silently disagree. One
// account-wide ledger read per student (never pre-filtered to one language - a payment isn't tied to
// one, so filtering the QUERY by language would silently drop the very entries that fund a DIFFERENT
// course's debt), FIFO-allocated across every course they have, THEN filtered down to the one
// language the caller asked about. Batched (2 queries total, regardless of student count) instead of
// ~3 DB round-trips per student.
export const computeCoveredDebtPeriodsBatch = async (studentIds, languageId) => {
    const result = new Map(studentIds.map(id => [String(id), []]))
    if (studentIds.length === 0) return result

    const accounts = await Account.find({ ownerType: 'student', ownerId: { $in: studentIds } }).select('ownerId').lean()
    if (accounts.length === 0) return result // nobody here has ever had a billing event yet

    const studentIdByAccount = new Map(accounts.map(a => [String(a._id), String(a.ownerId)]))
    const entries = await LedgerEntry.find({
        accountId: { $in: accounts.map(a => a._id) }, kind: { $in: ALLOCATION_KINDS },
    }).sort({ date: 1, _id: 1 })

    const entriesByStudent = new Map()
    for (const e of entries) {
        const studentId = studentIdByAccount.get(String(e.accountId))
        if (!entriesByStudent.has(studentId)) entriesByStudent.set(studentId, [])
        entriesByStudent.get(studentId).push(e)
    }

    for (const [studentId, studentEntries] of entriesByStudent) {
        const covered = foldReversalsAndAllocate(studentEntries)
            .filter(a => a.covered > 0 && String(a.entry.languageId) === String(languageId))
            .map(a => ({
                studentId, languageId: a.entry.languageId, groupId: a.entry.groupId, teacherId: a.entry.teacherId,
                periodStart: a.entry.periodStart, periodEnd: a.entry.periodEnd, amount: a.covered,
            }))
        result.set(studentId, covered)
    }
    return result
}

// the daily job - walks every student with at least one group-assigned, not-yet-completed course and
// gives each one a chance to recognize its next chunk. Each call is independently safe/idempotent
// (see recognizeNextPeriod's own due-date guard), so running this twice in a day, or missing a day
// and catching up the next, both self-correct with no special-casing needed here.
// Each course is wrapped in its own try/catch (confirmed real incident: one bad course/group used to
// throw and abort the WHOLE run - every OTHER student across every branch silently got skipped for
// the rest of that day, with no trace beyond a console.log line nobody was watching). One student's
// bad data can no longer take the entire platform's billing down for the day - it's logged and
// skipped, everyone else still gets processed normally.
export const runDailyBillingCycle = async () => {
    // confirmed real incident (found live, on production data): { 'courses.groupId': { $ne: null } }
    // looks like "at least one course has a group", but MongoDB's $ne on an ARRAY field actually
    // means "NO element equals the value" - so this only matched students whose EVERY course had a
    // group. A student with even one group-less course (removed from a group, never placed in one
    // yet - an extremely common, completely normal state) was excluded from this query ENTIRELY,
    // silently skipping billing for ALL their other, perfectly valid, group-assigned courses too,
    // forever, with zero visible symptom besides a balance that quietly stopped updating. $elemMatch
    // is the correct way to ask "does at least one array element satisfy this" in MongoDB.
    const students = await User.find({ role: 'student', courses: { $elemMatch: { groupId: { $ne: null }, courseCompleted: false } } })
    let recognized = 0
    const failures = []
    for (const student of students) {
        for (const course of student.courses) {
            if (!course.groupId || course.courseCompleted) continue
            try {
                const entry = await recognizeNextPeriod(student, course, {})
                if (entry) recognized++
            } catch (error) {
                console.log('runDailyBillingCycle: failed for student', student._id, 'course', course._id, error)
                failures.push({ studentId: student._id, courseId: course._id, error: error.message })
            }
        }
    }
    return { studentsChecked: students.length, entriesRecognized: recognized, failures }
}
