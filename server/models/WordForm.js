import mongoose from "mongoose"
const wordFormSchema = new mongoose.Schema({
    conceptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept', required: true },
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
    word: { type: String, required: true },
    example: { type: String, required: true },
}, { timestamps: true })
const WordForm = mongoose.models.WordForm || mongoose.model('WordForm', wordFormSchema)
export default WordForm
