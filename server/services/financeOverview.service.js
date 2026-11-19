import mongoose from "mongoose"
import User from "../models/User.js"
import Payment from "../models/Payment.js"
import Expense from "../models/Expense.js"
import Account from "../models/Account.js"
import LedgerEntry from "../models/LedgerEntry.js"
import Language from "../models/Language.js"
import Level from "../models/Level.js"
import { startOfLocalDay, endOfLocalDay } from "./businessTime.service.js"
import { DISPLAY_KINDS, computeCoverageFromEntries } from "./billingCycle.service.js"

const isoWeekLabel = (date) => {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}
const monthLabel = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`

// always the trailing 12 weeks or 12 months ending today, regardless of the table's own date
// filter - the chart is a fixed-length trend line, not a view of whatever range is currently
// being searched. Every period label is pre-built (even ones with zero payments) so the line
// doesn't silently skip empty stretches.
const buildTrailingPeriods = (groupBy) => {
    const now = new Date()
    const periods = []
    if (groupBy === 'week') {
        const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
        cursor.setUTCDate(cursor.getUTCDate() - 11 * 7)
        for (let i = 0; i < 12; i++) {
            periods.push(isoWeekLabel(cursor))
            cursor.setUTCDate(cursor.getUTCDate() + 7)
        }
        const rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
        rangeStart.setUTCDate(rangeStart.getUTCDate() - 11 * 7)
        return { periods, rangeStart, dateFormat: '%G-W%V' }
    }
    const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1))
    for (let i = 0; i < 12; i++) {
        periods.push(monthLabel(cursor))
        cursor.setUTCMonth(cursor.getUTCMonth() + 1)
    }
    const rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1))
    return { periods, rangeStart, dateFormat: '%Y-%m' }
}

// api backing the Finance "Barcha to'lovlar" (All Payments) page - filterable/sortable/paginated,
// plus a monthly-bucketed total series for the chart and the two summary numbers. Payments carry
// their own branchId as of the enrollment-restructure phase, but older rows predate that field, so
// branch attribution falls back to "this branch's students" for any payment missing it - same
// fallback every branch/revenue read used before branchId existed on Payment at all.
// Extracted out of adminController so directorController can drive the exact same computation for
// whichever branch the director has picked, instead of duplicating this logic a second time.
export const getFinanceOverview = async (branchIdRaw, query) => {
    const { dateFrom, dateTo, search, groupId, teacherId, method, amount, page, limit, sortBy, sortOrder, groupBy } = query

    const branchId = new mongoose.Types.ObjectId(branchIdRaw)
    const groupIdObj = groupId ? new mongoose.Types.ObjectId(groupId) : null
    const teacherIdObj = teacherId ? new mongoose.Types.ObjectId(teacherId) : null

    const branchStudents = await User.find({ branchId, role: 'student' }).select('_id')
    const branchStudentIds = branchStudents.map(s => s._id)

    const conditions = [
        { $or: [{ branchId }, { branchId: null, studentId: { $in: branchStudentIds } }] },
    ]
    if (dateFrom || dateTo) {
        const dateRange = {}
        if (dateFrom) dateRange.$gte = startOfLocalDay(dateFrom)
        if (dateTo) dateRange.$lte = endOfLocalDay(dateTo)
        conditions.push({ date: dateRange })
    }
    // NOT fixed yet (separate, bigger gap - flagged live 2026-11-19): this filters Payment's own
    // groupId/teacherId fields, which are the same dead legacy attribution snapshot
    // paymentsWithCurrentTeacher below works around for the list columns - never set on any payment
    // recorded after the shared-wallet rework. Filtering by group/teacher here currently matches
    // close to nothing on real data. A real fix needs coverage computed BEFORE paging (every
    // candidate payment, not just the current page), not just before display.
    if (groupIdObj) conditions.push({ groupId: groupIdObj })
    if (teacherIdObj) conditions.push({ teacherId: teacherIdObj })
    if (method) conditions.push({ method })
    if (amount) conditions.push({ amount: Number(amount) })
    if (search) {
        const q = search.trim()
        const matching = await User.find({
            branchId, role: 'student',
            $or: [{ name: new RegExp(q, 'i') }, { phone: new RegExp(q, 'i') }],
        }).select('_id')
        conditions.push({ studentId: { $in: matching.map(s => s._id) } })
    }
    const match = { $and: conditions }

    const pageNum = Math.max(1, Number(page) || 1)
    const pageSize = Math.min(100, Number(limit) || 25)
    const sortField = ['date', 'amount'].includes(sortBy) ? sortBy : 'date'
    const sortDir = sortOrder === 'asc' ? 1 : -1

    const totalCount = await Payment.countDocuments(match)
    const payments = await Payment.find(match)
        .sort({ [sortField]: sortDir })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .populate('studentId', 'name phone')
        .populate('languageId', 'name')
        .populate('levelId', 'name')
        .populate('teacherId', 'name')
        .populate('adminId', 'name')

    const studentIdsOnPage = [...new Set(payments.map(p => String(p.studentId?._id || p.studentId)))]

    // which course/teacher a payment's own money actually settled can't be read off a stored field
    // (Payment.languageId/teacherId are dead legacy fields, never set since the shared-wallet
    // rework - see Payment.js's own comment and computeCoverageFromEntries's). Computed fresh from
    // the ledger instead, batched one account-fetch per STUDENT on this page (not per payment) -
    // a page of 25 payments is very often the same handful of students paying more than once.
    const studentAccounts = studentIdsOnPage.length
        ? await Account.find({ ownerType: 'student', ownerId: { $in: studentIdsOnPage } }).select('ownerId').lean()
        : []
    const accountIdByStudent = new Map(studentAccounts.map(a => [String(a.ownerId), String(a._id)]))
    const accountIds = studentAccounts.map(a => a._id)
    const allEntries = accountIds.length
        ? await LedgerEntry.find({ accountId: { $in: accountIds }, kind: { $in: DISPLAY_KINDS } }).sort({ date: 1, _id: 1 }).lean()
        : []
    const entriesByAccount = new Map()
    for (const e of allEntries) {
        const key = String(e.accountId)
        if (!entriesByAccount.has(key)) entriesByAccount.set(key, [])
        entriesByAccount.get(key).push(e)
    }

    const coverageByPaymentId = new Map()
    const languageIds = new Set(), levelIds = new Set(), teacherIds = new Set()
    for (const p of payments) {
        const accountId = accountIdByStudent.get(String(p.studentId?._id || p.studentId))
        if (!accountId) continue
        const studentEntries = entriesByAccount.get(accountId) || []
        const paymentEntry = studentEntries.find(e => e.kind === 'payment' && String(e.sourceId) === String(p._id))
        if (!paymentEntry) continue
        const coverage = computeCoverageFromEntries(studentEntries, paymentEntry._id)
        coverageByPaymentId.set(String(p._id), coverage)
        for (const c of coverage) {
            if (c.languageId) languageIds.add(String(c.languageId))
            if (c.levelId) levelIds.add(String(c.levelId))
            if (c.teacherId) teacherIds.add(String(c.teacherId))
        }
    }
    const [languages, levels, teachers] = await Promise.all([
        languageIds.size ? Language.find({ _id: { $in: [...languageIds] } }).select('name').lean() : [],
        levelIds.size ? Level.find({ _id: { $in: [...levelIds] } }).select('name').lean() : [],
        teacherIds.size ? User.find({ _id: { $in: [...teacherIds] } }).select('name').lean() : [],
    ])
    const languageById = new Map(languages.map(l => [String(l._id), l]))
    const levelById = new Map(levels.map(l => [String(l._id), l]))
    const teacherById = new Map(teachers.map(t => [String(t._id), t]))

    const paymentsWithCurrentTeacher = payments.map(p => {
        // the single biggest course this payment's cash landed on, for the one-line list display -
        // computeCoverageFromEntries already sorts largest-amount first. The detail page shows every
        // course it touched; this list row only has room for one.
        const top = (coverageByPaymentId.get(String(p._id)) || [])[0]
        const topLanguage = top?.languageId ? languageById.get(String(top.languageId)) : null
        const topLevel = top?.levelId ? levelById.get(String(top.levelId)) : null
        return {
            ...p.toObject(),
            currentTeacherId: top?.teacherId ? teacherById.get(String(top.teacherId)) || null : null,
            coveredCourseLabel: topLanguage ? `${topLanguage.name}${topLevel?.name ? ' · ' + topLevel.name : ''}` : null,
        }
    })

    // revenue is cash-basis (confirmed, final answer): counted the moment a real payment happens,
    // dated when it was paid. Never deferred to whichever future month's debt a prepayment happens
    // to eventually settle: a student who pays 300,000 against a 100,000/mo course has genuinely
    // handed over 300,000 THIS month - that's this month's revenue in full. The extra two months'
    // worth just sits as credit and silently cancels out each future month's debt with no new
    // revenue event then, since no new payment actually happened that month.
    // A discount is deliberately invisible here (confirmed spec, see discountApplication.service.js):
    // it's a single ledger entry on the student's own account only, never a Payment or Expense
    // document, so it never touches totalAmount/totalExpenses/netProfit below at all - the only place
    // it's ever visible is the "Chegirma" line on the student's own profile.
    const totalAgg = await Payment.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$amount' } } }])
    const totalAmount = totalAgg[0]?.total || 0

    const expenseMatch = { branchId }
    if (dateFrom || dateTo) {
        expenseMatch.date = {}
        if (dateFrom) expenseMatch.date.$gte = startOfLocalDay(dateFrom)
        if (dateTo) expenseMatch.date.$lte = endOfLocalDay(dateTo)
    }
    const expenseAgg = await Expense.aggregate([{ $match: expenseMatch }, { $group: { _id: null, total: { $sum: '$amount' } } }])
    const totalExpenses = expenseAgg[0]?.total || 0

    // same cash-basis as the summary card above, so the chart doesn't quietly disagree with the
    // number sitting right next to it
    const { periods, rangeStart, dateFormat } = buildTrailingPeriods(groupBy)
    const seriesAgg = await Payment.aggregate([
        { $match: { $and: [
            { $or: [{ branchId }, { branchId: null, studentId: { $in: branchStudentIds } }] },
            { date: { $gte: rangeStart } },
        ] } },
        { $group: { _id: { $dateToString: { format: dateFormat, date: '$date' } }, total: { $sum: '$amount' } } },
    ])
    const totalByPeriod = Object.fromEntries(seriesAgg.map(s => [s._id, s.total]))
    const series = periods.map(p => ({ month: p, total: totalByPeriod[p] || 0 }))

    return {
        payments: paymentsWithCurrentTeacher, totalCount, page: pageNum, pageSize,
        totalAmount,
        netProfit: totalAmount - totalExpenses,
        monthlySeries: series,
    }
}
