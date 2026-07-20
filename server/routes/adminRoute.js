import express from "express"
import requireRole from "../middleware/auth.js"
import {
    createStudent, listStudents, updateStudent, deleteStudent, unarchiveStudent, getStudentProfile, addStudentCourse, updateStudentCourse, linkParent,
    createPayment, listPayments, refundPayment, deletePayment, updatePayment, getFinanceOverview, getPaymentPreview, getPaymentDetail,
    createGroup, listGroups, getGroupProfile, updateGroup, deleteGroup, unarchiveGroup, suggestGroup, addStudentToGroup, removeStudentFromGroup,
    retakeExam, listBranchTeachers, getTeacherProfile, getTeacherAttendanceGrid, getStudentAttendanceGrid, getLessonDetail, setLessonTeacherStatus,
    getMe, createTeacherAttendanceQR, listTeacherAttendanceQRs, getAttendanceOverview,
    listPayRates, setPayRate, deletePayRate, calculateSalary, paySalary, getSalaryDetail,
    getStudentStatement, getReconciliation, getBusinessLedger, setStudentDiscount,
    listMyNotes, createMyNote, deleteMyNote,
} from "../controllers/adminController.js"
import { listLanguages, listLevels, getSettings } from "../controllers/catalogController.js"
import {
    listRooms, createRoom, updateRoom, deleteRoom,
    getGroupDetails, updateGroupDiscount, getGroupAttendanceGrid, setLessonAttendance,
    listGroupMaterials, addGroupMaterial, deleteGroupMaterial,
    listGroupComments, addGroupComment, deleteGroupComment,
    listExtraLessons, createExtraLesson, deleteExtraLesson,
    getGroupExamsTab, getTodayTimetable,
} from "../controllers/groupDetailsController.js"
import {
    getLeadsBoard, createColumn, updateColumn, deleteColumn,
    createSubgroup, updateSubgroup, deleteSubgroup,
    createLead, updateLead, deleteLead,
    listLeadSources, createLeadSource, updateLeadSource, deleteLeadSource,
    listLeadForms, getLeadForm, createLeadForm, updateLeadForm, deleteLeadForm,
} from "../controllers/leadsController.js"
import {
    listExpenseCategories, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
    getExpensesOverview, createExpense, updateExpense, deleteExpense, getExpenseDetail,
} from "../controllers/expenseController.js"

const adminRouter = express.Router()
adminRouter.use(requireRole('admin'))

adminRouter.get('/me', getMe)
adminRouter.get('/notes', listMyNotes)
adminRouter.post('/notes', createMyNote)
adminRouter.delete('/notes/:id', deleteMyNote)
adminRouter.get('/settings', getSettings)
adminRouter.get('/languages', listLanguages)
adminRouter.get('/levels', listLevels)
adminRouter.get('/teachers', listBranchTeachers)
adminRouter.get('/teachers/:id', getTeacherProfile)
adminRouter.get('/teachers/:id/attendance-grid', getTeacherAttendanceGrid)
adminRouter.get('/lessons/:id', getLessonDetail)
adminRouter.put('/lessons/:id/teacher-status', setLessonTeacherStatus)
adminRouter.get('/attendance-qr', listTeacherAttendanceQRs)
adminRouter.post('/attendance-qr', createTeacherAttendanceQR)
adminRouter.get('/attendance', getAttendanceOverview)

adminRouter.get('/students', listStudents)
adminRouter.post('/students', createStudent)
adminRouter.get('/students/:id', getStudentProfile)
adminRouter.get('/students/:id/attendance-grid', getStudentAttendanceGrid)
adminRouter.get('/students/:id/statement', getStudentStatement)
adminRouter.put('/students/:id', updateStudent)
adminRouter.delete('/students/:id', deleteStudent)
adminRouter.post('/students/:id/unarchive', unarchiveStudent)
adminRouter.post('/students/:id/parent', linkParent)
adminRouter.post('/students/:id/courses', addStudentCourse)
adminRouter.put('/students/:id/courses/:courseId', updateStudentCourse)
adminRouter.post('/students/:id/discounts', setStudentDiscount)

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
adminRouter.get('/payments/preview', getPaymentPreview)
adminRouter.get('/payments/:id', getPaymentDetail)
adminRouter.get('/finance', getFinanceOverview)
adminRouter.get('/reconciliation', getReconciliation)
adminRouter.get('/business-ledger', getBusinessLedger)
adminRouter.post('/payments', createPayment)
adminRouter.put('/payments/:id', updatePayment)
adminRouter.post('/payments/:id/refund', refundPayment)
adminRouter.delete('/payments/:id', deletePayment)

adminRouter.post('/exams/:id/retake/:studentId', retakeExam)

adminRouter.get('/pay-rates', listPayRates)
adminRouter.post('/pay-rates', setPayRate)
adminRouter.delete('/pay-rates/:id', deletePayRate)
adminRouter.get('/salary/calculate', calculateSalary)
adminRouter.get('/salary/detail/:teacherId', getSalaryDetail)
adminRouter.post('/salary/pay', paySalary)

adminRouter.get('/rooms', listRooms)
adminRouter.post('/rooms', createRoom)
adminRouter.put('/rooms/:id', updateRoom)
adminRouter.delete('/rooms/:id', deleteRoom)
adminRouter.get('/timetable', getTodayTimetable)

adminRouter.get('/groups/:id/details', getGroupDetails)
adminRouter.put('/groups/:id/discount', updateGroupDiscount)
adminRouter.get('/groups/:id/attendance-grid', getGroupAttendanceGrid)
adminRouter.put('/lesson-attendance', setLessonAttendance)
adminRouter.get('/groups/:id/materials', listGroupMaterials)
adminRouter.post('/groups/:id/materials', addGroupMaterial)
adminRouter.delete('/groups/:id/materials/:materialId', deleteGroupMaterial)
adminRouter.get('/groups/:id/extra-lessons', listExtraLessons)
adminRouter.post('/groups/:id/extra-lessons', createExtraLesson)
adminRouter.delete('/groups/:id/extra-lessons/:extraLessonId', deleteExtraLesson)
adminRouter.get('/groups/:id/comments', listGroupComments)
adminRouter.post('/groups/:id/comments', addGroupComment)
adminRouter.delete('/groups/:id/comments/:commentId', deleteGroupComment)
adminRouter.get('/groups/:id/exams-tab', getGroupExamsTab)

adminRouter.get('/leads/board', getLeadsBoard)
adminRouter.post('/leads/columns', createColumn)
adminRouter.put('/leads/columns/:id', updateColumn)
adminRouter.delete('/leads/columns/:id', deleteColumn)
adminRouter.post('/leads/columns/:columnId/subgroups', createSubgroup)
adminRouter.put('/leads/subgroups/:id', updateSubgroup)
adminRouter.delete('/leads/subgroups/:id', deleteSubgroup)
adminRouter.post('/leads', createLead)
adminRouter.put('/leads/:id', updateLead)
adminRouter.delete('/leads/:id', deleteLead)

adminRouter.get('/leads/sources', listLeadSources)
adminRouter.post('/leads/sources', createLeadSource)
adminRouter.put('/leads/sources/:id', updateLeadSource)
adminRouter.delete('/leads/sources/:id', deleteLeadSource)

adminRouter.get('/leads/forms', listLeadForms)
adminRouter.get('/leads/forms/:id', getLeadForm)
adminRouter.post('/leads/forms', createLeadForm)
adminRouter.put('/leads/forms/:id', updateLeadForm)
adminRouter.delete('/leads/forms/:id', deleteLeadForm)

adminRouter.get('/expense-categories', listExpenseCategories)
adminRouter.post('/expense-categories', createExpenseCategory)
adminRouter.put('/expense-categories/:id', updateExpenseCategory)
adminRouter.delete('/expense-categories/:id', deleteExpenseCategory)
adminRouter.get('/expenses', getExpensesOverview)
adminRouter.post('/expenses', createExpense)
adminRouter.get('/expenses/:id', getExpenseDetail)
adminRouter.put('/expenses/:id', updateExpense)
adminRouter.delete('/expenses/:id', deleteExpense)

export default adminRouter
