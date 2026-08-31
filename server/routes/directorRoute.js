import express from "express"
import requireRole from "../middleware/auth.js"
import {
    getMe, getStats, getMapData, getAllStudents, getStudentProfile, permanentlyDeleteStudent, getBranchProfile,
    createAdmin, listAdmins, updateAdmin, deleteAdmin, getAdminProfile,
    createTeacher, listTeachers, updateTeacher, deleteTeacher, getTeacherProfile,
    upsertPricing, listPricing, deletePricing, getAttendanceOverview,
    createBranch, updateBranch, deleteBranch,
    createLanguage, updateLanguage, deleteLanguage,
    listCourseCategories, createCourseCategory, updateCourseCategory, deleteCourseCategory,
    createLevel, updateLevel, deleteLevel, deleteLastLesson,
    updateSettings,
    listAllGroups, updateGroupLimits, getTodayTimetable,
    getFinanceOverview, getPaymentDetail, listPayRates, setPayRate, deletePayRate, calculateSalary, getSalaryDetail, paySalary, prepaySalary, getBusinessLedger,
} from "../controllers/directorController.js"
import { listLanguages, listLevels, listBranches, getSettings } from "../controllers/catalogController.js"
import {
    getDayContent, saveVocab, saveGrammar, saveReading, getLevelContentSummary,
    fillVocabWordBank, fillGrammarBank, fillReadingBank,
} from "../controllers/contentController.js"
import { uploadMiddleware, uploadImage, resolveImage } from "../controllers/uploadController.js"
import { getExamConfig, saveExamConfig } from "../controllers/examBuilderController.js"

const directorRouter = express.Router()
// broad gate - a sub_director is a director scoped to one branch (directorController.js filters
// every list/lookup down to req.auth.branchId for that role). `directorOnly` below is stacked on
// top of THIS for the handful of routes a sub_director must never reach at all: Overview
// (stats/map-data - these ARE the Branches map page, see catalogController.listBranches comment),
// Admins (admin/sub_director account management - only a real director creates either), and the
// Homework content/exam builder.
directorRouter.use(requireRole('director', 'sub_director'))
const directorOnly = requireRole('director')

directorRouter.get('/me', getMe)

// ==== homework builder (content authoring) - director only ====
directorRouter.get('/content/summary', directorOnly, getLevelContentSummary)
directorRouter.get('/content/day', directorOnly, getDayContent)
directorRouter.put('/content/vocab', directorOnly, saveVocab)
directorRouter.put('/content/vocab/word-bank', directorOnly, fillVocabWordBank)
directorRouter.put('/content/grammar', directorOnly, saveGrammar)
directorRouter.put('/content/grammar/word-bank', directorOnly, fillGrammarBank)
directorRouter.put('/content/reading', directorOnly, saveReading)
directorRouter.put('/content/reading/word-bank', directorOnly, fillReadingBank)
directorRouter.post('/content/upload/:kind', directorOnly, uploadMiddleware, uploadImage)
directorRouter.get('/content/resolve-image/:kind', directorOnly, resolveImage)

// ==== exam settings (pass mark + time limit) - the exam itself is auto-assembled from already-
// learned daily content, see studentController.getExam - director only ====
directorRouter.get('/exam', directorOnly, getExamConfig)
directorRouter.put('/exam', directorOnly, saveExamConfig)

// branch list is sub_director-visible (scoped to their own branch, see listBranches) - creating,
// renaming, deleting a branch, and viewing any branch's full cross-role profile is director only
directorRouter.get('/branches', listBranches)
directorRouter.get('/branches/:id', directorOnly, getBranchProfile)
directorRouter.post('/branches', directorOnly, createBranch)
directorRouter.put('/branches/:id', directorOnly, updateBranch)
directorRouter.delete('/branches/:id', directorOnly, deleteBranch)

directorRouter.get('/languages', listLanguages)
directorRouter.post('/languages', createLanguage)
directorRouter.put('/languages/:id', updateLanguage)
directorRouter.delete('/languages/:id', deleteLanguage)

directorRouter.get('/course-categories', listCourseCategories)
directorRouter.post('/course-categories', createCourseCategory)
directorRouter.put('/course-categories/:id', updateCourseCategory)
directorRouter.delete('/course-categories/:id', deleteCourseCategory)

directorRouter.get('/levels', listLevels)
directorRouter.post('/levels', createLevel)
directorRouter.put('/levels/:id', updateLevel)
directorRouter.delete('/levels/:id', deleteLevel)
// content-deleting, unlike the level metadata routes above - part of the Homework builder, so
// director-only like the rest of /content and /exam (see the gate note at the top of this file)
directorRouter.delete('/levels/:id/lessons/last', directorOnly, deleteLastLesson)

directorRouter.get('/settings', getSettings)
directorRouter.put('/settings', updateSettings)

directorRouter.get('/groups', listAllGroups)
directorRouter.put('/groups/:id', updateGroupLimits)

directorRouter.get('/attendance', getAttendanceOverview)
directorRouter.get('/timetable', getTodayTimetable)

directorRouter.get('/finance', getFinanceOverview)
directorRouter.get('/business-ledger', getBusinessLedger)
directorRouter.get('/payments/:id', getPaymentDetail)
directorRouter.get('/pay-rates', listPayRates)
directorRouter.post('/pay-rates', setPayRate)
directorRouter.delete('/pay-rates/:id', deletePayRate)
directorRouter.get('/salary/calculate', calculateSalary)
directorRouter.get('/salary/detail/:teacherId', getSalaryDetail)
directorRouter.post('/salary/pay', paySalary)
directorRouter.post('/salary/prepay', prepaySalary)

directorRouter.get('/stats', directorOnly, getStats)
directorRouter.get('/map-data', directorOnly, getMapData)
directorRouter.get('/students', getAllStudents)
directorRouter.get('/students/:id', getStudentProfile)
directorRouter.delete('/students/:id/permanent', permanentlyDeleteStudent)

// Admins is sub_director-reachable (scoped to plain 'admin' accounts in their own branch only -
// see the isSubDirector checks in each function) - unlike Overview/Branches/Homework, which stay
// directorOnly below
directorRouter.get('/admins', listAdmins)
directorRouter.post('/admins', createAdmin)
directorRouter.get('/admins/:id', getAdminProfile)
directorRouter.put('/admins/:id', updateAdmin)
directorRouter.delete('/admins/:id', deleteAdmin)

directorRouter.get('/teachers', listTeachers)
directorRouter.get('/teachers/:id', getTeacherProfile)
directorRouter.post('/teachers', createTeacher)
directorRouter.put('/teachers/:id', updateTeacher)
directorRouter.delete('/teachers/:id', deleteTeacher)

directorRouter.get('/pricing', listPricing)
directorRouter.post('/pricing', upsertPricing)
directorRouter.delete('/pricing/:id', deletePricing)

export default directorRouter
