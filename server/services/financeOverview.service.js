import mongoose from "mongoose"
import User from "../models/User.js"
import Group from "../models/Group.js"
import Payment from "../models/Payment.js"
import Expense from "../models/Expense.js"
import { startOfLocalDay, endOfLocalDay } from "./businessTime.service.js"

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
    const languageIdsOnPage = [...new Set(payments.map(p => String(p.languageId?._id || p.languageId)))]
    const currentGroups = await Group.find({
        studentIds: { $in: studentIdsOnPage }, languageId: { $in: languageIdsOnPage }, status: 'active',
    }).select('studentIds languageId teacherId').populate('teacherId', 'name')
    const currentTeacherFor = (studentId, languageId) => {
        const group = currentGroups.find(g => String(g.languageId) === String(languageId)
            && g.studentIds.some(id => String(id) === String(studentId)))
        return group?.teacherId || null
    }
    const paymentsWithCurrentTeacher = payments.map(p => ({
        ...p.toObject(), currentTeacherId: currentTeacherFor(p.studentId?._id, p.languageId?._id),
    }))

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
