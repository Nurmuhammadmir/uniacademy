import mongoose from "mongoose"
const readingTextSchema = new mongoose.Schema({
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
    levelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Level', required: true },
    day: { type: Number, required: true },
    title: { type: String, required: true },
    image: { type: String, default: '' },
    // the raw filename the director typed/pasted, kept even when the file hasn't been dropped onto
    // the server yet - without this, an unresolved photo pasted via the bulk reading bank would be
    // lost forever with no way to recheck it once the file actually arrives
    imageHint: { type: String, default: '' },
    paragraphs: [{ id: { type: String, required: true }, text: { type: String, required: true } }],
}, { timestamps: true })
readingTextSchema.index({ languageId: 1, levelId: 1, day: 1 })
const ReadingText = mongoose.models.ReadingText || mongoose.model('ReadingText', readingTextSchema)
export default ReadingText
