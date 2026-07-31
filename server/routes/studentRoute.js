import express from "express"
import requireRole from "../middleware/auth.js"
import { requireActiveSubscription } from "../services/subscription.service.js"
import { getSettings } from "../controllers/catalogController.js"
import {
    getHomeworkWeek, getHomeworkForDay, submitVocab, submitGrammar, submitReading,
    getHomeworkReview, submitReviewVocab, submitReviewGrammar,
    getProgress, getGroupRanking, getGroupProgress, getExam, submitExam, getMe, scanAttendance,
    getAttendanceSummary, getMyGroups,
} from "../controllers/studentController.js"

const studentRouter = express.Router()
studentRouter.use(requireRole('student'))

studentRouter.get('/me', getMe)
studentRouter.get('/my-groups', getMyGroups)
studentRouter.get('/settings', getSettings)
studentRouter.post('/attendance/scan', scanAttendance)

studentRouter.get('/homework/week', requireActiveSubscription, getHomeworkWeek)
studentRouter.get('/homework/day/:day', requireActiveSubscription, getHomeworkForDay)
studentRouter.post('/homework/vocab/submit', requireActiveSubscription, submitVocab)
studentRouter.post('/homework/grammar/submit', requireActiveSubscription, submitGrammar)
studentRouter.post('/homework/reading/submit', requireActiveSubscription, submitReading)

// Sunday's "review" recap - a random re-draw of already-covered vocab/grammar, gated the same way
// as any other homework (an unpaid student shouldn't get free practice either) but never gates,
// unlocks, or persists anything itself - see reviewHomework.service.js
studentRouter.get('/homework/review', requireActiveSubscription, getHomeworkReview)
studentRouter.post('/homework/review/vocab/submit', requireActiveSubscription, submitReviewVocab)
studentRouter.post('/homework/review/grammar/submit', requireActiveSubscription, submitReviewGrammar)

studentRouter.get('/progress', getProgress)
studentRouter.get('/attendance-summary', getAttendanceSummary)
studentRouter.get('/group-ranking', getGroupRanking)
studentRouter.get('/group-progress', getGroupProgress)
studentRouter.get('/exam/:levelId', getExam)
studentRouter.post('/exam/:id/submit', submitExam)

export default studentRouter
