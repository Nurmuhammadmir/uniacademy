import mongoose from "mongoose"
const conceptSchema = new mongoose.Schema({
    image: { type: String, required: true },
    category: { type: String, required: true },
}, { timestamps: true })
const Concept = mongoose.models.Concept || mongoose.model('Concept', conceptSchema)
export default Concept
