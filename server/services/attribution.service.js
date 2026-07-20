import GroupMembership from "../models/GroupMembership.js"
import Group from "../models/Group.js"

const ONE_DAY = 24 * 60 * 60 * 1000

// splits ONE billing period [periodStart, periodEnd] into day-accurate segments, one per group the
// student was actually enrolled in (for this language) during that stretch - so if a student joins
// a new group/teacher on day 15 of a 30-day period, the period's cost gets split ~half to the old
// teacher, ~half to the new one, instead of the whole period going to whichever teacher happened to
// be active at the single moment the period was consumed.
// Known limits (same spirit as this codebase's other "can't reconstruct exact history" notes):
//   - if a student is in two groups of the same language at once, the more-recently-joined one wins
//     for any day they overlap - there's no clean way to split a single day between two teachers.
//   - a segment's teacher is resolved from the group's CURRENT teacherId - reassigning a group to a
//     different teacher later does not retroactively re-attribute past segments.
//   - days with no covering membership at all (e.g. history predates this feature and was never
//     backfilled) come back with groupId/teacherId: null - unattributed, not guessed at.
export const splitPeriodByMembership = async (studentId, languageId, periodStart, periodEnd) => {
    const memberships = await GroupMembership.find({
        studentId, languageId,
        joinedAt: { $lte: periodEnd },
        $or: [{ leftAt: null }, { leftAt: { $gte: periodStart } }],
    }).sort({ joinedAt: 1 })

    if (memberships.length === 0) {
        return [{ segmentStart: periodStart, segmentEnd: periodEnd, groupId: null, teacherId: null }]
    }

    const dayGroupIds = []
    for (let t = periodStart.getTime(); t <= periodEnd.getTime(); t += ONE_DAY) {
        const day = new Date(t)
        const covering = memberships.filter(m => m.joinedAt <= day && (!m.leftAt || m.leftAt >= day))
        dayGroupIds.push(covering.length > 0 ? String(covering[covering.length - 1].groupId) : null)
    }

    // collapse consecutive same-group days into segments
    const segments = []
    let segStartIdx = 0
    for (let i = 1; i <= dayGroupIds.length; i++) {
        if (i === dayGroupIds.length || dayGroupIds[i] !== dayGroupIds[segStartIdx]) {
            segments.push({
                segmentStart: new Date(periodStart.getTime() + segStartIdx * ONE_DAY),
                segmentEnd: new Date(periodStart.getTime() + (i - 1) * ONE_DAY),
                groupId: dayGroupIds[segStartIdx],
            })
            segStartIdx = i
        }
    }

    const groupIds = [...new Set(segments.map(s => s.groupId).filter(Boolean))]
    const groups = await Group.find({ _id: { $in: groupIds } }).select('teacherId')
    const teacherByGroup = Object.fromEntries(groups.map(g => [String(g._id), g.teacherId]))

    return segments.map(s => ({ ...s, teacherId: s.groupId ? teacherByGroup[s.groupId] : null }))
}

// strips the time-of-day before diffing dates - periodEnd on a CoursePeriod is always bare
// midnight, but a few callers (e.g. computeCourseStatement's pendingCharge) build their period
// bounds with endOfMonthUTC, which carries a 23:59:59.999 suffix. Diffing raw timestamps in that
// case silently rounds the day-count up by one (exactly the bug that under-counted every teacher's
// percent_of_revenue share before it was caught) - normalizing to a clean date first avoids that
// whole bug class regardless of which kind of Date object a caller hands in.
const toDateOnlyUTC = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
const daysBetweenInclusive = (start, end) => Math.round((toDateOnlyUTC(end) - toDateOnlyUTC(start)) / ONE_DAY) + 1

// slices `amount` (which covers the full [periodStart, periodEnd] span) down to just the portion
// whose days fall inside [dateFrom, dateTo] - so revenue-share salary for "day 1-10" of a full
// 30-day, 600,000-cost month shows ~10/30 of it (~200,000), not the whole 600,000. Querying day
// 11-30 separately still sums back to exactly the original 600,000 instead of either double- or
// under-counting a period that only partially overlaps whatever range is being asked about.
export const prorateByDateOverlap = (amount, periodStart, periodEnd, dateFrom, dateTo) => {
    const overlapStart = periodStart > dateFrom ? periodStart : dateFrom
    const overlapEnd = periodEnd < dateTo ? periodEnd : dateTo
    if (overlapStart > overlapEnd) return 0
    const periodDays = daysBetweenInclusive(periodStart, periodEnd)
    const overlapDays = daysBetweenInclusive(overlapStart, overlapEnd)
    return Math.round(amount * overlapDays / periodDays)
}
