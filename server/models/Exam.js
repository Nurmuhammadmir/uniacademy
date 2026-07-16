import mongoose from "mongoose"

// one exam question is self-contained (not tied to a Concept/WordForm/day like homework content) -
// the exam pulls from a level-wide bank the director builds independently of the daily curriculum,
// so vocab/reading questions carry their own text+image directly instead of referencing other docs
const examQuestionSchema = new mongoose.Schema({
    section: { type: String, enum: ['vocab', 'grammar', 'reading'], required: true },
    type: {
        type: String,
        enum: ['multiple_choice', 'fill_gap', 'reorder', 'error_correction', 'true_false', 'matching', 'picture_match', 'translation_match', 'sequencing', 'summary_gap_fill'],
        required: true,
    },
    passage: { type: String, default: '' }, // optional short reading text shown above a reading question
    question: { type: String, default: '' },
    image: { type: String, default: '' }, // resolved /static/images/... path, for vocab picture_match or a reading illustration
    options: { type: mongoose.Schema.Types.Mixed, default: [] },
    correct: { type: mongoose.Schema.Types.Mixed, required: true },
})

const examSchema = new mongoose.Schema({
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
    levelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Level', required: true },
    // how many questions a single attempt draws (at random) from the bank below - lets the director
    // paste a much bigger bank than any one student ever sees in one sitting
    questionCount: { type: Number, required: true, default: 100 },
    durationMinutes: { type: Number, required: true, default: 60 },
    passScore: { type: Number, required: true, default: 70 },
    questions: { type: [examQuestionSchema], default: [] },
}, { timestamps: true })

examSchema.index({ languageId: 1, levelId: 1 }, { unique: true })

const Exam = mongoose.models.Exam || mongoose.model('Exam', examSchema)
export default Exam
