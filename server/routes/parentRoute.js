import express from "express"
import requireRole from "../middleware/auth.js"
import {
    getMe, getChildAttendance, getChildProgress, getChildPayments, getChildExtraLessons,
    subscribeToPush, unsubscribeFromPush,
} from "../controllers/parentController.js"

const parentRouter = express.Router()
parentRouter.use(requireRole('parent'))

parentRouter.get('/me', getMe)
parentRouter.get('/children/:studentId/attendance', getChildAttendance)
parentRouter.get('/children/:studentId/progress', getChildProgress)
parentRouter.get('/children/:studentId/payments', getChildPayments)
parentRouter.get('/children/:studentId/extra-lessons', getChildExtraLessons)
parentRouter.post('/push/subscribe', subscribeToPush)
parentRouter.post('/push/unsubscribe', unsubscribeFromPush)

export default parentRouter
