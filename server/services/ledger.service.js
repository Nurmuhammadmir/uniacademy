import mongoose from "mongoose"
import Account from "../models/Account.js"
import LedgerEntry from "../models/LedgerEntry.js"

// ---- date helpers -----------------------------------------------------------------------------
// the ONE place billing-period math lives now - previously this exact formula was independently
// copy-pasted in four places (recalculateCourseBilling, getPaymentPreview, listStudents' owed calc,
// computeCourseStatement's chunkCost), kept in sync only by convention. Everything routes through
// computePeriodCost below from now on.
export const daysInMonthUTC = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
// bare midnight UTC of the month's last calendar day - NOT end-of-day (23:59:59.999) on purpose.
// Every other date this billing system stores/compares (periodStart, windowStart, dateOnlyUTC) is
// bare midnight; a 23:59:59.999 periodEnd was the one exception, and it caused a real bug: displaying
// it via `.toLocaleDateString()` converts to the VIEWER's own timezone first, so anyone east of UTC
// (Tashkent is UTC+5) saw the last day of August roll over and render as September 1st. Every
// downstream day-count (attribution.service.js's daysBetweenInclusive) already normalizes both ends
// to date-only before diffing, so this carries zero effect on any proration/revenue-share math -
// changing it only removes a display footgun, it does not change how much anything costs.
export const endOfMonthUTC = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
export const startOfNextMonthUTC = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
export const dateOnlyUTC = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
export const monthKeyUTC = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`

// windowStart = the first day of the billing chunk being charged (either the 1st of a month for a
// full month, or some other day for a partial first/only month - a course can run as short as 15
// days, so a chunk never assumes it reaches a full month). Returns the (rounded) raw cost for that
// one chunk before any discount, plus the chunk's own end (always the last calendar day of that
// month - billing chunks are always calendar-month-aligned, never rolling N-day windows).
export const computePeriodCost = (price, windowStart) => {
    const daysInMonth = daysInMonthUTC(windowStart)
    const dayOfMonth = windowStart.getUTCDate()
    const isFullMonth = dayOfMonth === 1
    const daysRemaining = daysInMonth - dayOfMonth + 1
    const rawCost = isFullMonth ? price : Math.round(price * daysRemaining / daysInMonth)
    return { rawCost, isFullMonth, daysRemaining, daysInMonth, windowEnd: endOfMonthUTC(windowStart) }
}

// ---- account access -----------------------------------------------------------------------------
// upsert instead of find-then-create - two concurrent requests touching the same not-yet-existing
// account (e.g. a student's profile and their statement loading at once) used to both pass the
// find-nothing check and both attempt Account.create, crashing the second one on the unique
// ownerType+ownerId index. The upsert itself can still occasionally lose an equivalent race at the
// storage-engine level (a documented Mongo edge case, not fixed by upsert alone) - the catch below
// covers that last case by just re-reading whatever the winner created, instead of surfacing a 500
// for what is, from the caller's perspective, a plain "get me this account" request.
export const getOrCreateAccount = async (ownerType, ownerId, session = null) => {
    try {
        return await Account.findOneAndUpdate(
            { ownerType, ownerId },
            { $setOnInsert: { balance: 0 } },
            { upsert: true, new: true, session }
        )
    } catch (error) {
        if (error.code === 11000) {
            const existing = await Account.findOne({ ownerType, ownerId }).session(session)
            if (existing) return existing
        }
        throw error
    }
}

// ---- posting --------------------------------------------------------------------------------
// the only two functions allowed to ever change an Account's balance. Both run inside a Mongo
// transaction so the LedgerEntry row(s) and the balance update(s) they describe can never partially
// apply - a crash mid-write leaves either both sides done or neither, never a balance with no entry
// explaining it (or an entry that doesn't match the balance). Requires MongoDB running as a replica
// set (Atlas always is) - transactions aren't available against a bare standalone instance.
const applyEntry = async (account, direction, amount, session) => {
    account.balance += direction === 'increase' ? amount : -amount
    await account.save({ session })
    return account.balance
}

// the common two-leg case - money (or debt) moving from one account to another in the same event.
// e.g. a payment: decrease the student's balance, increase the branch's, both legs sharing one
// transactionId so the UI can always show "this payment is the other half of that revenue entry".
export const postTransfer = async ({
    fromAccountId, toAccountId, fromDirection = 'decrease', toDirection = 'increase',
    amount, kind, method = null, meta = {}, description = '', createdBy = null, date = new Date(),
}) => {
    if (!amount || amount <= 0) return null
    const session = await mongoose.startSession()
    let entries
    try {
        await session.withTransaction(async () => {
            const [fromAccount, toAccount] = await Promise.all([
                Account.findById(fromAccountId).session(session),
                Account.findById(toAccountId).session(session),
            ])
            const transactionId = new mongoose.Types.ObjectId()
            const fromBalanceAfter = await applyEntry(fromAccount, fromDirection, amount, session)
            const toBalanceAfter = await applyEntry(toAccount, toDirection, amount, session)
            // `ordered: true` is required by Mongoose whenever `create()` is called with an array of
            // MULTIPLE documents inside a session - without it, it throws instead of inserting either
            // (this was silently breaking every real payment until the sample-data script caught it)
            entries = await LedgerEntry.create([
                { transactionId, accountId: fromAccountId, direction: fromDirection, amount, balanceAfter: fromBalanceAfter, kind, method, description, createdBy, date, ...meta },
                { transactionId, accountId: toAccountId, direction: toDirection, amount, balanceAfter: toBalanceAfter, kind, method, description, createdBy, date, ...meta },
            ], { session, ordered: true })
        })
    } finally {
        await session.endSession()
    }
    return entries
}

// the single-leg case - money leaving the world the ledger models entirely (e.g. rent paid to an
// outside vendor: the branch account decreases, but there's no "vendor account" to increase). A
// salary payout still uses this on the teacher's side (their balance decreases) paired with a
// separate postTransfer-less Expense record for the branch's own outflow - see billingCycle logic.
export const postEntry = async ({
    accountId, direction, amount, kind, method = null, meta = {}, description = '', createdBy = null, date = new Date(),
}) => {
    if (!amount || amount <= 0) return null
    const session = await mongoose.startSession()
    let entry
    try {
        await session.withTransaction(async () => {
            const account = await Account.findById(accountId).session(session)
            const transactionId = new mongoose.Types.ObjectId()
            const balanceAfter = await applyEntry(account, direction, amount, session)
            ;[entry] = await LedgerEntry.create([
                { transactionId, accountId, direction, amount, balanceAfter, kind, method, description, createdBy, date, ...meta },
            ], { session, ordered: true })
        })
    } finally {
        await session.endSession()
    }
    return entry
}

// genuinely erases every entry matching `filter` (and every OTHER entry that shares any of their
// transactionIds, so a transfer's two legs are always removed together even if `filter` only
// matched one side) - confirmed product decision: deleting a payment or expense from the
// Payments/Expenses screens must remove its ledger footprint entirely, not just net it to zero with
// a new reversing entry (the earlier "immutable audit trail" design). Each account's balance is
// walked back by exactly what that entry did to it before the row is deleted, so `balance` stays
// mathematically equal to "sum of this account's own remaining entries" - the same invariant
// postTransfer/postEntry maintain when they ADD an entry, just run in reverse.
export const deleteEntries = async (filter) => {
    const session = await mongoose.startSession()
    try {
        await session.withTransaction(async () => {
            const matched = await LedgerEntry.find(filter).select('transactionId').session(session)
            const transactionIds = [...new Set(matched.map(e => String(e.transactionId)))]
            if (transactionIds.length === 0) return
            const entries = await LedgerEntry.find({ transactionId: { $in: transactionIds } }).session(session)
            const affectedAccountIds = new Set(entries.map(e => String(e.accountId)))
            for (const entry of entries) {
                const account = await Account.findById(entry.accountId).session(session)
                if (account) await applyEntry(account, entry.direction === 'increase' ? 'decrease' : 'increase', entry.amount, session)
            }
            await LedgerEntry.deleteMany({ transactionId: { $in: transactionIds } }).session(session)

            // balanceAfter is a per-row SNAPSHOT (see LedgerEntry.js) - deleting an entry from the
            // middle of an account's history leaves every LATER entry's snapshot stale (it no longer
            // equals "sum of everything up to and including this row"), even though the account's
            // final balance itself is already correct from the reversal above. Every remaining entry
            // on each affected account is replayed in date order and re-stamped so balanceAfter stays
            // trustworthy everywhere, not just at the current moment.
            for (const accountId of affectedAccountIds) {
                const remaining = await LedgerEntry.find({ accountId }).sort({ date: 1, _id: 1 }).session(session)
                let running = 0
                for (const entry of remaining) {
                    running += entry.direction === 'increase' ? entry.amount : -entry.amount
                    if (entry.balanceAfter !== running) {
                        entry.balanceAfter = running
                        await entry.save({ session })
                    }
                }
            }
        })
    } finally {
        await session.endSession()
    }
}
