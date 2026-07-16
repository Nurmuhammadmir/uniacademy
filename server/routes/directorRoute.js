import express from "express"
import requireRole from "../middleware/auth.js"
import {
    getStats, getMapData, getAllStudents, getStudentProfile, getBranchProfile,
    createAdmin, listAdmins, updateAdmin, deleteAdmin, getAdminProfile,
    createTeacher, listTeachers, updateTeacher, deleteTeacher, getTeacherProfile,
    upsertPricing, listPricing, deletePricing, getAttendanceOverview,
    createBranch, updateBranch,
    createLanguage, updateLanguage, deleteLanguage,
    createLevel, updateLevel, deleteLevel,
    updateSettings,
    listAllGroups, updateGroupLimits,
} from "../controllers/directorController.js"
import { listLanguages, listLevels, listBranches, getSettings } from "../controllers/catalogController.js"
import {
    getDayContent, saveVocab, saveGrammar, saveReading, getLevelContentSummary,
    fillVocabWordBank, fillGrammarBank, fillReadingBank,
} from "../controllers/contentController.js"
import { uploadMiddleware, uploadImage, resolveImage } from "../controllers/uploadController.js"
import { getExamConfig, saveExamConfig, addExamQuestions, clearExamQuestions } from "../controllers/examBuilderController.js"

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

// ==== exam builder (level-wide question bank, independent of the daily curriculum) ====
directorRouter.get('/exam', getExamConfig)
directorRouter.put('/exam', saveExamConfig)
directorRouter.put('/exam/questions', addExamQuestions)
directorRouter.delete('/exam/questions', clearExamQuestions)

directorRouter.get('/branches', listBranches)
directorRouter.get('/branches/:id', getBranchProfile)
directorRouter.post('/branches', createBranch)
directorRouter.put('/branches/:id', updateBranch)

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
