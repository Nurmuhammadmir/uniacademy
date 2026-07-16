import express from "express"
import requireRole from "../middleware/auth.js"
import { requireActiveSubscription } from "../services/subscription.service.js"
import { getSettings } from "../controllers/catalogController.js"
import {
    getHomeworkWeek, getHomeworkForDay, submitVocab, submitGrammar, submitReading,
    getProgress, getGroupRanking, getGroupProgress, getExam, submitExam, getMe, scanAttendance,
} from "../controllers/studentController.js"

const studentRouter = express.Router()
studentRouter.use(requireRole('student'))

studentRouter.get('/me', getMe)
studentRouter.get('/settings', getSettings)
studentRouter.post('/attendance/scan', scanAttendance)

studentRouter.get('/homework/week', requireActiveSubscription, getHomeworkWeek)
studentRouter.get('/homework/day/:day', requireActiveSubscription, getHomeworkForDay)
studentRouter.post('/homework/vocab/submit', requireActiveSubscription, submitVocab)
studentRouter.post('/homework/grammar/submit', requireActiveSubscription, submitGrammar)
studentRouter.post('/homework/reading/submit', requireActiveSubscription, submitReading)

studentRouter.get('/progress', getProgress)
studentRouter.get('/group-ranking', getGroupRanking)
studentRouter.get('/group-progress', getGroupProgress)
studentRouter.get('/exam/:levelId', getExam)
studentRouter.post('/exam/:id/submit', submitExam)

export default studentRouter
