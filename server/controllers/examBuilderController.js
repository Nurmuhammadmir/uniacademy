// Director-side exam settings (pass mark + time limit). The exam itself is no longer a
// director-curated question bank - it's auto-assembled per attempt straight from content the
// student has already been taught (see studentController.getExam): 25 vocab + 25 grammar
// exercises, one random exercise from one random already-learned day, drawn 25 times each, plus 3
// whole reading texts (kept intact with their own 10 exercises) from already-learned days.
import Exam from "../models/Exam.js"

export const getExamConfig = async (req, res) => {
    try {
        const { languageId, levelId } = req.query
        if (!languageId || !levelId) return res.status(400).json({ error: 'missing_params' })
        const exam = await Exam.findOne({ languageId, levelId })
        res.json({
            exam: exam
                ? { _id: exam._id, durationMinutes: exam.durationMinutes, passScore: exam.passScore }
                : { durationMinutes: 90, passScore: 70 },
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const saveExamConfig = async (req, res) => {
    try {
        const { languageId, levelId, durationMinutes, passScore } = req.body
        if (!languageId || !levelId) return res.status(400).json({ error: 'missing_params' })
        const exam = await Exam.findOneAndUpdate(
            { languageId, levelId },
            { languageId, levelId, durationMinutes: durationMinutes || 90, passScore: passScore ?? 70 },
            { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
        )
        res.json({ exam })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
