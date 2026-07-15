import express from "express"
import requireRole from "../middleware/auth.js"
import {
    getMyGroups, getGroupStudents, getStudentDayDetail,
    createAttendanceSession, getAttendanceForDay, markStudentAttendance,
    scanOwnAttendance, getMe,
} from "../controllers/teacherController.js"

const teacherRouter = express.Router()
teacherRouter.use(requireRole('teacher'))

teacherRouter.get('/me', getMe)
teacherRouter.post('/attendance/scan-self', scanOwnAttendance)

teacherRouter.get('/my-groups', getMyGroups)
teacherRouter.get('/my-groups/:id/students', getGroupStudents)
teacherRouter.get('/my-groups/:id/students/:studentId/days', getStudentDayDetail)
teacherRouter.post('/my-groups/:id/attendance/session', createAttendanceSession)
teacherRouter.get('/my-groups/:id/attendance/:day', getAttendanceForDay)
teacherRouter.put('/my-groups/:id/attendance/:day/students/:studentId', markStudentAttendance)

export default teacherRouter
