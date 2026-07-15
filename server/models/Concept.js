import mongoose from "mongoose"
const conceptSchema = new mongoose.Schema({
    // optional - director can save a word before its photo file exists in server/public/images/vocab
    image: { type: String, default: '' },
    category: { type: String, required: true },
}, { timestamps: true })
const Concept = mongoose.models.Concept || mongoose.model('Concept', conceptSchema)
export default Concept
