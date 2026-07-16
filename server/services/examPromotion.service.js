// RULE #8 (revised) — the exam result no longer drives group/level changes by itself. Every
// student in a group advances to the next level TOGETHER once the group finishes the level (see
// groupPromotion.service.js), regardless of any individual student's exam score. This function
// only ever records the attempt (score/passed/attemptNumber) so directors/admins can see how each
// student did - deciding whether a low score means someone needs to be moved back down (or given
// extra help) is a manual admin call, not an automatic one.
import ExamAttempt from "../models/ExamAttempt.js"

export const handleExamResult = async ({ student, exam, score }) => {
    const passed = score >= exam.passScore
    const attemptCount = await ExamAttempt.countDocuments({ studentId: student._id, examId: exam._id })
    const attempt = await ExamAttempt.create({
        studentId: student._id,
        examId: exam._id,
        score,
        passed,
        attemptNumber: attemptCount + 1,
    })

    return { attempt, outcome: passed ? 'passed' : 'not_passed' }
}
