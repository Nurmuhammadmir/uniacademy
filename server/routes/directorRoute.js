import express from "express"
import requireRole from "../middleware/auth.js"
import {
    getStats, getMapData, getAllStudents, getStudentProfile, getBranchProfile,
    createAdmin, listAdmins, updateAdmin, deleteAdmin, getAdminProfile,
    createTeacher, listTeachers, updateTeacher, deleteTeacher, getTeacherProfile,
    upsertPricing, listPricing, deletePricing, getAttendanceOverview,
    createBranch, updateBranch, deleteBranch,
    createLanguage, updateLanguage, deleteLanguage,
    createLevel, updateLevel, deleteLevel,
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
directorRouter.use(requireRole('director'))

// ==== homework builder (content authoring) ====
directorRouter.get('/content/summary', getLevelContentSummary)
directorRouter.get('/content/day', getDayContent)
directorRouter.put('/content/vocab', saveVocab)
directorRouter.put('/content/vocab/word-bank', fillVocabWordBank)
directorRouter.put('/content/grammar', saveGrammar)
directorRouter.put('/content/grammar/word-bank', fillGrammarBank)
directorRouter.put('/content/reading', saveReading)
directorRouter.put('/content/reading/word-bank', fillReadingBank)
directorRouter.post('/content/upload/:kind', uploadMiddleware, uploadImage)
directorRouter.get('/content/resolve-image/:kind', resolveImage)

// ==== exam settings (pass mark + time limit) - the exam itself is auto-assembled from already-
// learned daily content, see studentController.getExam ====
directorRouter.get('/exam', getExamConfig)
directorRouter.put('/exam', saveExamConfig)

directorRouter.get('/branches', listBranches)
directorRouter.get('/branches/:id', getBranchProfile)
directorRouter.post('/branches', createBranch)
directorRouter.put('/branches/:id', updateBranch)
directorRouter.delete('/branches/:id', deleteBranch)

directorRouter.get('/languages', listLanguages)
directorRouter.post('/languages', createLanguage)
directorRouter.put('/languages/:id', updateLanguage)
directorRouter.delete('/languages/:id', deleteLanguage)

directorRouter.get('/levels', listLevels)
directorRouter.post('/levels', createLevel)
directorRouter.put('/levels/:id', updateLevel)
directorRouter.delete('/levels/:id', deleteLevel)

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

directorRouter.get('/stats', getStats)
directorRouter.get('/map-data', getMapData)
directorRouter.get('/students', getAllStudents)
directorRouter.get('/students/:id', getStudentProfile)

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
