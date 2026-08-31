import mongoose from "mongoose"

// one stored balance per owner - the single source of truth for "how much does X owe/have", instead
// of the old approach of replaying Payment/Expense/CoursePeriod history live on every request. Sign
// convention (every future reader needs to internalize this - see ledger.service.js for where every
// entry actually gets posted):
//   student account: balance > 0 = student owes that much. balance < 0 = credit (overpaid).
//   branch account:  balance = net cash position (all payments in, minus all expenses out).
//   teacher account: balance > 0 = amount currently owed TO the teacher, accrued and unpaid.
// Never write to `balance` directly from a controller - always go through ledger.service.js's
// postTransfer/postEntry, which update it atomically alongside the LedgerEntry row that explains it,
// so a balance can never exist without a matching, immutable trail of exactly how it got there.
const accountSchema = new mongoose.Schema({
    ownerType: { type: String, enum: ['student', 'branch', 'teacher'], required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true }, // ref User (student/teacher) or Branch, depending on ownerType
    balance: { type: Number, default: 0 },
}, { timestamps: true })

accountSchema.index({ ownerType: 1, ownerId: 1 }, { unique: true })

const Account = mongoose.models.Account || mongoose.model('Account', accountSchema)
export default Account
