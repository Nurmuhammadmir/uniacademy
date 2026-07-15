import express from "express"
import requireRole from "../middleware/auth.js"
import {
    createStudent, listStudents, updateStudent, deleteStudent, getStudentProfile, addStudentCourse, updateStudentCourse,
    createPayment, listPayments, deletePayment,
    createGroup, listGroups, getGroupProfile, updateGroup, deleteGroup, unarchiveGroup, suggestGroup, addStudentToGroup, removeStudentFromGroup,
    retakeExam, listBranchTeachers, getTeacherProfile, getMe, createTeacherAttendanceQR, listTeacherAttendanceQRs,
} from "../controllers/adminController.js"
import { listLanguages, listLevels, getSettings } from "../controllers/catalogController.js"

const adminRouter = express.Router()
adminRouter.use(requireRole('admin'))

adminRouter.get('/me', getMe)
adminRouter.get('/settings', getSettings)
adminRouter.get('/languages', listLanguages)
adminRouter.get('/levels', listLevels)
adminRouter.get('/teachers', listBranchTeachers)
adminRouter.get('/teachers/:id', getTeacherProfile)
adminRouter.get('/attendance-qr', listTeacherAttendanceQRs)
adminRouter.post('/attendance-qr', createTeacherAttendanceQR)

adminRouter.get('/students', listStudents)
adminRouter.post('/students', createStudent)
adminRouter.get('/students/:id', getStudentProfile)
adminRouter.put('/students/:id', updateStudent)
adminRouter.delete('/students/:id', deleteStudent)
adminRouter.post('/students/:id/courses', addStudentCourse)
adminRouter.put('/students/:id/courses/:courseId', updateStudentCourse)

adminRouter.get('/groups', listGroups)
adminRouter.post('/groups', createGroup)
adminRouter.get('/groups/suggest', suggestGroup)
adminRouter.get('/groups/:id', getGroupProfile)
adminRouter.put('/groups/:id', updateGroup)
adminRouter.delete('/groups/:id', deleteGroup)
adminRouter.post('/groups/:id/unarchive', unarchiveGroup)
adminRouter.post('/groups/:id/students', addStudentToGroup)
adminRouter.delete('/groups/:id/students/:studentId', removeStudentFromGroup)

adminRouter.get('/payments', listPayments)
adminRouter.post('/payments', createPayment)
adminRouter.delete('/payments/:id', deletePayment)

adminRouter.post('/exams/:id/retake/:studentId', retakeExam)

export default adminRouter
