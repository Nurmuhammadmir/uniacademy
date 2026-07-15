import mongoose from "mongoose"
const translationSchema = new mongoose.Schema({
    conceptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept', required: true },
    nativeLanguageCode: { type: String, enum: ['ru', 'uz', 'kaa'], required: true },
    text: { type: String, required: true },
}, { timestamps: true })
const Translation = mongoose.models.Translation || mongoose.model('Translation', translationSchema)
export default Translation
