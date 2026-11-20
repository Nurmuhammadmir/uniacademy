import mongoose from "mongoose"

// New Year mode's "write a letter to Ded Moroz" feature (really just to the director, Salamatdin
// aga, framed playfully for the season) - an admin signs their name and writes a wish, the director
// sees every letter ever sent. Deliberately no edit/delete from the admin side once sent (same
// "immutable, append-only" spirit as the ledger) - this is a note to the boss, not a draft.
const santaLetterSchema = new mongoose.Schema({
    fromName: { type: String, required: true, trim: true, maxlength: 200 },
    wish: { type: String, required: true, trim: true, maxlength: 2000 },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })

const SantaLetter = mongoose.models.SantaLetter || mongoose.model('SantaLetter', santaLetterSchema)
export default SantaLetter
