import mongoose from "mongoose"

// one immutable row per LEG of a transaction - a real payment posts exactly two rows (decrease on
// the student's account, increase on the branch's), sharing one transactionId, so every cent that
// moves is visible on both sides of where it came from and where it went. Never edited after
// creation (the same immutability convention the old CoursePeriod model used) - a correction is a
// NEW entry, never a mutation of an old one, so the history stays a true audit trail. This also
// absorbs CoursePeriod's old role (which group/teacher/period a charge belongs to) via the metadata
// fields below, instead of that being a separate collection.
const ledgerEntrySchema = new mongoose.Schema({
    transactionId: { type: mongoose.Schema.Types.ObjectId, required: true }, // groups the paired legs of one event together
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    direction: { type: String, enum: ['increase', 'decrease'], required: true }, // relative to THIS account's own balance - see Account.js's sign convention
    amount: { type: Number, required: true }, // always positive
    balanceAfter: { type: Number, required: true }, // snapshot right after this entry posted, for instant statement rendering with no replay
    // 'discount' posts ONLY on the student's own account (never the branch's) - confirmed spec: a
    // discount must settle the debt and count toward teacher revenue exactly like a payment, but
    // stay fully invisible everywhere else (no Payment/Expense record, never shows in the branch
    // ledger, Payments list, Expenses list, or Finance totals) - see discountApplication.service.js.
    // 'debt_reversal' posts ONLY on the student's own account too, when they're removed from a
    // group mid-period - confirmed spec: unlike a discount (a real cost the school absorbs so the
    // teacher's earnings never shrink), a debt_reversal genuinely shrinks the underlying debt itself
    // for the days of that period they'll no longer attend, so it correctly reduces both what they
    // owe AND the teacher's revenue share for that period - see billingCycle.service.js's
    // computeAccountAllocation for how it folds into the debt it corrects, and sourceId below for
    // which debt entry that is.
    // 'opening_balance' is a single-sided backfill row (no counterpart account, single-sided by
    // convention like a real accounting "beginning balance" journal entry) - used only to document a
    // balance an Account already carried before its own ledger history began (e.g. real cash a
    // branch already had when it started using this system), so openingBalance/byMethod reads
    // reconcile with the true balance instead of silently missing whatever came before entry #1.
    kind: { type: String, enum: ['payment', 'debt', 'refund', 'expense', 'salary_accrual', 'salary_payout', 'discount', 'debt_reversal', 'opening_balance'], required: true },
    method: { type: String, default: null }, // payment/expense method (cash/card/click/bank_transfer/payme/apelsin) - carried here so a per-method branch balance is a simple grouped query instead of a live aggregate
    // metadata - which of these are set depends on `kind`; all optional so one schema covers every event type
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', default: null },
    levelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Level', default: null },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },
    // points back to the originating document (Payment or Expense) for display fields this schema
    // deliberately doesn't duplicate (expense category, recipient, refund status, etc.) - 'ledgerEntry'
    // is the one exception, used only by 'debt_reversal' rows to point at the exact debt entry they
    // correct (sourceId is that debt's own _id, not a Payment/Expense document at all)
    sourceType: { type: String, enum: ['payment', 'expense', 'ledgerEntry', null], default: null },
    sourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    // human-readable breakdown of exactly how `amount` was derived (e.g. "Aug 12-31 (20/31 days) ·
    // English B1 · 650,000/mo - 10% discount = 419,355") - see ledger.service.js/billingCycle.service.js
    // for where this gets built. This is the direct answer to "never a mystery number": every
    // statement/payout view renders this string next to the figure it explains.
    description: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    date: { type: Date, default: Date.now },
}, { timestamps: true })

ledgerEntrySchema.index({ accountId: 1, date: 1 })
ledgerEntrySchema.index({ transactionId: 1 })
ledgerEntrySchema.index({ studentId: 1, languageId: 1 })
ledgerEntrySchema.index({ teacherId: 1, periodStart: 1 })
ledgerEntrySchema.index({ groupId: 1 })

const LedgerEntry = mongoose.models.LedgerEntry || mongoose.model('LedgerEntry', ledgerEntrySchema)
export default LedgerEntry
