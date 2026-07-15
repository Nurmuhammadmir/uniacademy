import express from "express"
import requireRole from "../middleware/auth.js"
import {
    getStats, getMapData, getAllStudents, getStudentProfile, getBranchProfile,
    createAdmin, listAdmins, updateAdmin, deleteAdmin, getAdminProfile,
    createTeacher, listTeachers, updateTeacher, deleteTeacher, getTeacherProfile,
    upsertPricing, listPricing, deletePricing, getAttendanceOverview,
    createBranch, updateBranch,
    createLanguage, updateLanguage,
    createLevel, updateLevel,
    updateSettings,
    listAllGroups, updateGroupLimits,
} from "../controllers/directorController.js"
import { listLanguages, listLevels, listBranches, getSettings } from "../controllers/catalogController.js"
import {
    getDayContent, saveVocab, saveGrammar, saveReading, getLevelContentSummary,
} from "../controllers/contentController.js"
import { uploadMiddleware, uploadImage } from "../controllers/uploadController.js"

const directorRouter = express.Router()
directorRouter.use(requireRole('director'))

// ==== homework builder (content authoring) ====
directorRouter.get('/content/summary', getLevelContentSummary)
directorRouter.get('/content/day', getDayContent)
directorRouter.put('/content/vocab', saveVocab)
directorRouter.put('/content/grammar', saveGrammar)
directorRouter.put('/content/reading', saveReading)
directorRouter.post('/content/upload/:kind', uploadMiddleware, uploadImage)

directorRouter.get('/branches', listBranches)
directorRouter.get('/branches/:id', getBranchProfile)
directorRouter.post('/branches', createBranch)
directorRouter.put('/branches/:id', updateBranch)

directorRouter.get('/languages', listLanguages)
directorRouter.post('/languages', createLanguage)
directorRouter.put('/languages/:id', updateLanguage)

directorRouter.get('/levels', listLevels)
directorRouter.post('/levels', createLevel)
directorRouter.put('/levels/:id', updateLevel)

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
