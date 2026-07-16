import mongoose from "mongoose"

// The exam is no longer a director-curated question bank - it's auto-assembled per attempt from
// content the student has already been taught (see studentController.getExam): 25 vocab + 25
// grammar exercises (one random exercise from one random already-learned day, 25 times each) plus
// 3 whole reading texts (each with its own 10 exercises) drawn from already-learned days. This
// model now only holds the per-level exam SETTINGS a director controls.
const examSchema = new mongoose.Schema({
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
    levelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Level', required: true },
    durationMinutes: { type: Number, required: true, default: 90 },
    passScore: { type: Number, required: true, default: 70 },
}, { timestamps: true })

examSchema.index({ languageId: 1, levelId: 1 }, { unique: true })

const Exam = mongoose.models.Exam || mongoose.model('Exam', examSchema)
export default Exam
