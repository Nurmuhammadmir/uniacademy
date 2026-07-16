import mongoose from "mongoose"
const readingTextSchema = new mongoose.Schema({
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
    levelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Level', required: true },
    day: { type: Number, required: true },
    title: { type: String, required: true },
    image: { type: String, default: '' },
    paragraphs: [{ id: { type: String, required: true }, text: { type: String, required: true } }],
}, { timestamps: true })
readingTextSchema.index({ languageId: 1, levelId: 1, day: 1 })
const ReadingText = mongoose.models.ReadingText || mongoose.model('ReadingText', readingTextSchema)
export default ReadingText
