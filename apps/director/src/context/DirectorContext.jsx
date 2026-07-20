import { createContext, useEffect, useState } from "react"
import axios from 'axios'
import { toast } from 'react-toastify'
import { confirm } from '../lib/confirm.js'
import { t } from '../i18n/LanguageContext.jsx'

export const DirectorContext = createContext()

const DirectorContextProvider = (props) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    const [token, setToken] = useState(localStorage.getItem('token') ? localStorage.getItem('token') : false)
    const [stats, setStats] = useState(false)
    const [mapData, setMapData] = useState(false)
    const [allStudents, setAllStudents] = useState([])
    const [admins, setAdmins] = useState([])
    const [teachers, setTeachers] = useState([])
    const [pricing, setPricing] = useState([])
    const [branches, setBranches] = useState([])
    const [languages, setLanguages] = useState([])
    const [levels, setLevels] = useState([])
    const [allGroups, setAllGroups] = useState([])
    const [settings, setSettings] = useState(false)
    const [payRates, setPayRatesState] = useState([])

    const authHeader = { headers: { Authorization: `Bearer ${token}` } }

    // a stale/invalid token (expired JWT, or a password changed elsewhere) makes every
    // authenticated request 401 forever with no way back to the login screen short of manually
    // clearing localStorage - catch it globally once and drop the user back to login instead
    useEffect(() => {
        const interceptorId = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                const isLoginRequest = error.config?.url?.includes('/api/auth/login')
                if (error.response?.status === 401 && !isLoginRequest && localStorage.getItem('token')) {
                    localStorage.removeItem('token')
                    setToken(false)
                    setStats(false); setMapData(false); setAdmins([]); setTeachers([]); setPricing([]); setAllStudents([])
                    toast.error(t('sessionExpired'))
                }
                return Promise.reject(error)
            }
        )
        return () => axios.interceptors.response.eject(interceptorId)
    }, [])

    const login = async (phone, password) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/auth/login', { phone, password })
            if (data.user.role !== 'director') {
                toast.error(t('accountNotDirector'))
                return false
            }
            localStorage.setItem('token', data.token)
            setToken(data.token)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('loginFailed'))
            return false
        }
    }

    const logout = async () => {
        if (!(await confirm(t('confirmSignOut')))) return
        localStorage.removeItem('token')
        setToken(false)
        setStats(false); setMapData(false); setAdmins([]); setTeachers([]); setPricing([]); setAllStudents([])
    }

    const getStats = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/stats', authHeader)
            setStats(data)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadStats'))
        }
    }

    const getMapData = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/map-data', authHeader)
            setMapData(data.byBranch)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadMapData'))
        }
    }

    const getAllStudents = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/students', authHeader)
            setAllStudents(data.students)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadStudents'))
        }
    }

    const getStudentProfile = async (id) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/students/' + id, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadStudentProfile'))
            return null
        }
    }

    // api for the branch detail modal - admins/teachers/students/revenue for one branch
    const getBranchProfile = async (id) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/branches/' + id, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadBranchProfile'))
            return null
        }
    }

    const getAdmins = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/admins', authHeader)
            setAdmins(data.admins)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadAdmins'))
        }
    }

    const createAdmin = async (payload) => {
        try {
            await axios.post(backendUrl + '/api/director/admins', payload, authHeader)
            toast.success(t('adminCreated'))
            getAdmins()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotCreateAdmin'))
            return false
        }
    }

    const updateAdmin = async (id, payload) => {
        try {
            await axios.put(backendUrl + '/api/director/admins/' + id, payload, authHeader)
            toast.success(t('adminUpdated'))
            getAdmins()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotUpdateAdmin'))
            return false
        }
    }

    const deleteAdminAccount = async (id) => {
        if (!(await confirm(t('confirmRemoveAdmin')))) return
        try {
            await axios.delete(backendUrl + '/api/director/admins/' + id, authHeader)
            toast.success(t('adminRemoved'))
            getAdmins()
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotRemoveAdmin'))
        }
    }

    const getTeachers = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/teachers', authHeader)
            setTeachers(data.teachers)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadTeachers'))
        }
    }

    const getTeacherProfile = async (id) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/teachers/' + id, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadTeacherProfile'))
            return null
        }
    }

    const createTeacher = async (payload) => {
        try {
            await axios.post(backendUrl + '/api/director/teachers', payload, authHeader)
            toast.success(t('teacherCreated'))
            getTeachers()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotCreateTeacher'))
            return false
        }
    }

    const updateTeacher = async (id, payload) => {
        try {
            await axios.put(backendUrl + '/api/director/teachers/' + id, payload, authHeader)
            toast.success(t('teacherUpdated'))
            getTeachers()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotUpdateTeacher'))
            return false
        }
    }

    const deleteTeacherAccount = async (id) => {
        if (!(await confirm(t('confirmRemoveTeacher')))) return
        try {
            await axios.delete(backendUrl + '/api/director/teachers/' + id, authHeader)
            toast.success(t('teacherRemoved'))
            getTeachers()
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotRemoveTeacher'))
        }
    }

    const getPricing = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/pricing', authHeader)
            setPricing(data.pricing)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadPricing'))
        }
    }

    const upsertPricing = async (payload) => {
        try {
            await axios.post(backendUrl + '/api/director/pricing', payload, authHeader)
            toast.success(t('pricingSaved'))
            getPricing()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotSavePricing'))
            return false
        }
    }

    const deletePricing = async (id) => {
        if (!(await confirm(t('confirmRemovePricing')))) return
        try {
            await axios.delete(backendUrl + '/api/director/pricing/' + id, authHeader)
            toast.success(t('pricingRemoved'))
            getPricing()
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotRemovePricing'))
        }
    }

    const getBranches = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/branches', authHeader)
            setBranches(data.branches)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadBranches'))
        }
    }

    // rooms/lessons are inherently per-branch - a branchId must be chosen, there's no single
    // combined "every room across every branch" grid that would make sense to render at once
    const getTimetable = async (branchId, date) => {
        if (!branchId) return null
        try {
            const { data } = await axios.get(backendUrl + `/api/director/timetable?branchId=${branchId}` + (date ? `&date=${date}` : ''), authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadTimetable'))
            return null
        }
    }

    // ==== Finance / Salary (branch explicitly chosen by the caller via the Finance page's branch
    // switcher - a director has no single home branch, unlike admin) ====
    const getFinanceOverview = async (branchId, params) => {
        if (!branchId) return null
        try {
            const query = new URLSearchParams({ branchId, ...params }).toString()
            const { data } = await axios.get(backendUrl + `/api/director/finance?${query}`, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadFinance'))
            return null
        }
    }

    const getPaymentDetail = async (id) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/payments/' + id, authHeader)
            return data.payment
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadPayments'))
            return null
        }
    }

    const getBusinessLedger = async (branchId, params) => {
        if (!branchId) return null
        try {
            const query = new URLSearchParams({ branchId, ...params }).toString()
            const { data } = await axios.get(backendUrl + `/api/director/business-ledger?${query}`, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadFinance'))
            return null
        }
    }

    const getPayRates = async (branchId) => {
        if (!branchId) { setPayRatesState([]); return }
        try {
            const { data } = await axios.get(backendUrl + `/api/director/pay-rates?branchId=${branchId}`, authHeader)
            setPayRatesState(data.rates)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadPayRates'))
        }
    }

    const setPayRate = async (branchId, payload) => {
        try {
            await axios.post(backendUrl + '/api/director/pay-rates', { branchId, ...payload }, authHeader)
            toast.success(t('payRateSaved'))
            getPayRates(branchId)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotSavePayRate'))
            return false
        }
    }

    const deletePayRate = async (branchId, id) => {
        if (!(await confirm(t('confirmDeletePayRate')))) return
        try {
            await axios.delete(backendUrl + `/api/director/pay-rates/${id}?branchId=${branchId}`, authHeader)
            toast.success(t('payRateDeleted'))
            getPayRates(branchId)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotDeletePayRate'))
        }
    }

    const calculateSalary = async (branchId, dateFrom, dateTo) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/director/salary/calculate?branchId=${branchId}&dateFrom=${dateFrom}&dateTo=${dateTo}`, authHeader)
            return data.results
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotCalculateSalary'))
            return null
        }
    }

    const getSalaryDetail = async (branchId, teacherId, dateFrom, dateTo) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/director/salary/detail/${teacherId}?branchId=${branchId}&dateFrom=${dateFrom}&dateTo=${dateTo}`, authHeader)
            return data.detail
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadSalaryDetail'))
            return null
        }
    }

    const paySalary = async (branchId, teacherId, amount, dateFrom, dateTo, method) => {
        try {
            await axios.post(backendUrl + '/api/director/salary/pay', { branchId, teacherId, amount, dateFrom, dateTo, method }, authHeader)
            toast.success(t('salaryPaid'))
            return true
        } catch (error) {
            const code = error.response?.data?.error
            toast.error(code === 'invalid_method' ? t('invalidPaymentMethodError') : (code || t('couldNotPaySalary')))
            return false
        }
    }

    const getLanguages = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/languages', authHeader)
            setLanguages(data.languages)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadLanguages'))
        }
    }

    const getLevels = async (languageId) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/levels' + (languageId ? `?languageId=${languageId}` : ''), authHeader)
            setLevels(data.levels)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadLevels'))
        }
    }

    const getAdminProfile = async (id) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/admins/' + id, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadAdminProfile'))
            return null
        }
    }

    const getAttendanceOverview = async (date) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/attendance' + (date ? `?date=${date}` : ''), authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadAttendance'))
            return null
        }
    }

    // ==== branches ====
    const createBranch = async (name) => {
        try {
            await axios.post(backendUrl + '/api/director/branches', { name }, authHeader)
            toast.success(t('branchAdded'))
            getBranches()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotAddBranch'))
            return false
        }
    }

    const updateBranch = async (id, name) => {
        try {
            await axios.put(backendUrl + '/api/director/branches/' + id, { name }, authHeader)
            toast.success(t('branchUpdated'))
            getBranches()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotUpdateBranch'))
            return false
        }
    }

    const deleteBranch = async (id) => {
        if (!(await confirm(t('confirmDeleteBranch')))) return false
        try {
            await axios.delete(backendUrl + '/api/director/branches/' + id, authHeader)
            toast.success(t('branchDeleted'))
            getBranches()
            return true
        } catch (error) {
            const errCode = error.response?.data?.error
            if (errCode === 'branch_not_empty') {
                const { peopleCount, activeGroupCount } = error.response.data
                toast.error(t('branchNotEmpty', { people: peopleCount, groups: activeGroupCount }))
            } else {
                toast.error(errCode || t('couldNotDeleteBranch'))
            }
            return false
        }
    }

    // ==== languages (courses) ====
    const createLanguage = async (payload) => {
        try {
            await axios.post(backendUrl + '/api/director/languages', payload, authHeader)
            toast.success(t('courseAdded'))
            getLanguages()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotAddCourse'))
            return false
        }
    }

    const updateLanguage = async (id, payload) => {
        try {
            await axios.put(backendUrl + '/api/director/languages/' + id, payload, authHeader)
            toast.success(t('courseUpdated'))
            getLanguages()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotUpdateCourse'))
            return false
        }
    }

    const deleteLanguage = async (id) => {
        if (!(await confirm(t('confirmDeleteCourse')))) return false
        try {
            await axios.delete(backendUrl + '/api/director/languages/' + id, authHeader)
            toast.success(t('courseDeleted'))
            getLanguages()
            getLevels()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotDeleteCourse'))
            return false
        }
    }

    // ==== levels ====
    const createLevel = async (payload) => {
        try {
            await axios.post(backendUrl + '/api/director/levels', payload, authHeader)
            toast.success(t('levelAdded'))
            getLevels(payload.languageId)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotAddLevel'))
            return false
        }
    }

    const updateLevel = async (id, payload, languageId) => {
        try {
            await axios.put(backendUrl + '/api/director/levels/' + id, payload, authHeader)
            toast.success(t('levelUpdated'))
            getLevels(languageId)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotUpdateLevel'))
            return false
        }
    }

    const deleteLevel = async (id, languageId) => {
        if (!(await confirm(t('confirmDeleteLevel')))) return false
        try {
            await axios.delete(backendUrl + '/api/director/levels/' + id, authHeader)
            toast.success(t('levelDeleted'))
            getLevels(languageId)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotDeleteLevel'))
            return false
        }
    }

    // ==== settings ====
    const getSettings = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/settings', authHeader)
            setSettings(data.settings)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadSettings'))
        }
    }

    const updateSettings = async (payload) => {
        try {
            const { data } = await axios.put(backendUrl + '/api/director/settings', payload, authHeader)
            setSettings(data.settings)
            toast.success(t('settingsSaved'))
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotSaveSettings'))
            return false
        }
    }

    // ==== homework builder (content) ====
    const getContentSummary = async (languageId, levelId) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/director/content/summary?languageId=${languageId}&levelId=${levelId}`, authHeader)
            return data.summary
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadContentSummary'))
            return {}
        }
    }

    const getDayContent = async (languageId, levelId, day) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/director/content/day?languageId=${languageId}&levelId=${levelId}&day=${day}`, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadDayContent'))
            return null
        }
    }

    const saveVocab = async (payload) => {
        try {
            const { data } = await axios.put(backendUrl + '/api/director/content/vocab', payload, authHeader)
            toast.success(t('vocabSaved', { words: data.wordCount, exercises: data.exerciseCount }))
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotSaveVocab'))
            return false
        }
    }

    const saveGrammar = async (payload) => {
        try {
            const { data } = await axios.put(backendUrl + '/api/director/content/grammar', payload, authHeader)
            toast.success(t('grammarSaved', { exercises: data.exerciseCount }))
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotSaveGrammar'))
            return false
        }
    }

    const saveReading = async (payload) => {
        try {
            const { data } = await axios.put(backendUrl + '/api/director/content/reading', payload, authHeader)
            toast.success(data.cleared ? t('readingClearedMsg') : t('readingSaved', { exercises: data.exerciseCount }))
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotSaveReading'))
            return false
        }
    }

    // pastes an unlimited word bank for one level - fills every day in that level that has no
    // vocab yet, 10 words per day in day order, until either the bank or the empty days run out.
    // Returns the fill summary (or null on failure) so the caller can show it to the director.
    const fillVocabWordBank = async (languageId, levelId, words) => {
        try {
            const { data } = await axios.put(backendUrl + '/api/director/content/vocab/word-bank', { languageId, levelId, words }, authHeader)
            const skipNote = data.skippedCount > 0 ? t('skippedAsDuplicates', { count: data.skippedCount }) : ''
            toast.success(data.daysFilled > 0 ? t('filledDaysMsg', { days: data.daysFilled, plural: data.daysFilled === 1 ? '' : 's', used: data.wordsUsed, unit: 'words', skipNote }) : t('noEmptyDaysMsg'))
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotFillWordBank'))
            return null
        }
    }

    // same idea as the vocab word bank, but for grammar - paste an unlimited list of exercises and
    // it fills every day in the level that has no grammar yet, 5 per day, in day order.
    const fillGrammarBank = async (languageId, levelId, exercises) => {
        try {
            const { data } = await axios.put(backendUrl + '/api/director/content/grammar/word-bank', { languageId, levelId, exercises }, authHeader)
            const skipNote = data.skippedCount > 0 ? t('skippedAsDuplicates', { count: data.skippedCount }) : ''
            toast.success(data.daysFilled > 0 ? t('filledDaysMsg', { days: data.daysFilled, plural: data.daysFilled === 1 ? '' : 's', used: data.questionsUsed, unit: 'questions', skipNote }) : t('noEmptyDaysMsg'))
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotFillGrammarBank'))
            return null
        }
    }

    // same idea again, for reading - paste an unlimited list of complete readings (title,
    // paragraphs, exercises, image filename) and it fills every day in the level that has no
    // reading yet, ONE reading per day since a reading is already a whole day's content.
    const fillReadingBank = async (languageId, levelId, readings) => {
        try {
            const { data } = await axios.put(backendUrl + '/api/director/content/reading/word-bank', { languageId, levelId, readings }, authHeader)
            const skipNote = data.skippedCount > 0 ? t('skippedAsDuplicates', { count: data.skippedCount }) : ''
            toast.success(data.daysFilled > 0 ? t('filledDaysMsg', { days: data.daysFilled, plural: data.daysFilled === 1 ? '' : 's', used: data.readingsUsed, unit: 'readings', skipNote }) : t('noEmptyDaysMsg'))
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotFillReadingBank'))
            return null
        }
    }

    // ==== exam builder (level-wide, independent of the daily curriculum) ====
    const getExamConfig = async (languageId, levelId) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/director/exam?languageId=${languageId}&levelId=${levelId}`, authHeader)
            return data.exam
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadExam'))
            return null
        }
    }

    const saveExamConfig = async (payload) => {
        try {
            const { data } = await axios.put(backendUrl + '/api/director/exam', payload, authHeader)
            toast.success(t('examSettingsSaved'))
            return data.exam
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotSaveExamSettings'))
            return null
        }
    }

    // uploads a photo, named after `name`, into /static/images/<kind>. Returns the served path.
    const uploadContentImage = async (kind, name, file) => {
        try {
            const form = new FormData()
            form.append('image', file)
            const { data } = await axios.post(
                backendUrl + `/api/director/content/upload/${kind}?name=${encodeURIComponent(name)}`,
                form,
                { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
            )
            return data.path
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotUploadImage'))
            return null
        }
    }

    // looks for a photo already sitting in server/public/images/<kind> - by word (name) for vocab,
    // or by exact filename for reading. Returns the served path, or null if nothing matches yet.
    const resolveContentImage = async (kind, { name, filename } = {}) => {
        try {
            const q = filename ? `filename=${encodeURIComponent(filename)}` : `name=${encodeURIComponent(name || '')}`
            const { data } = await axios.get(backendUrl + `/api/director/content/resolve-image/${kind}?${q}`, authHeader)
            return data.path
        } catch (error) {
            // silent - this runs automatically as the director types, "no match yet" is normal
            return null
        }
    }

    // ==== groups (director-wide) ====
    const getAllGroups = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/groups', authHeader)
            setAllGroups(data.groups)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadGroups'))
        }
    }

    const updateGroupLimits = async (id, payload) => {
        try {
            await axios.put(backendUrl + '/api/director/groups/' + id, payload, authHeader)
            toast.success(t('groupUpdated'))
            getAllGroups()
            return true
        } catch (error) {
            if (error.response?.data?.error === 'teacher_schedule_conflict') {
                toast.error(t('teacherScheduleConflict'))
            } else {
                toast.error(error.response?.data?.error || t('couldNotUpdateGroup'))
            }
            return false
        }
    }

    const value = {
        token, login, logout,
        stats, getStats,
        mapData, getMapData,
        allStudents, getAllStudents, getStudentProfile,
        getBranchProfile,
        admins, getAdmins, createAdmin, updateAdmin, deleteAdminAccount, getAdminProfile,
        teachers, getTeachers, createTeacher, updateTeacher, deleteTeacherAccount, getTeacherProfile,
        pricing, getPricing, upsertPricing, deletePricing,
        branches, getBranches, createBranch, updateBranch, deleteBranch, getTimetable,
        languages, getLanguages, createLanguage, updateLanguage, deleteLanguage,
        levels, getLevels, createLevel, updateLevel, deleteLevel,
        getAttendanceOverview,
        settings, getSettings, updateSettings,
        allGroups, getAllGroups, updateGroupLimits,
        getFinanceOverview, getPaymentDetail, getBusinessLedger,
        payRates, getPayRates, setPayRate, deletePayRate, calculateSalary, getSalaryDetail, paySalary,
        backendUrl,
        getContentSummary, getDayContent, saveVocab, saveGrammar, saveReading, uploadContentImage, resolveContentImage,
        fillVocabWordBank, fillGrammarBank, fillReadingBank,
        getExamConfig, saveExamConfig,
    }

    useEffect(() => {
        if (token) {
            getStats(); getMapData(); getAdmins(); getTeachers(); getPricing()
            getBranches(); getLanguages(); getAllStudents(); getSettings(); getAllGroups()

            // lightweight polling - a different admin/teacher's actions happen in a totally separate
            // browser tab/app with its own React state, so there's no way for this tab to be pushed
            // an update instantly without websockets. Polling every 20s is the practical middle
            // ground: numbers here catch up on their own, no manual refresh needed.
            const interval = setInterval(() => {
                getStats(); getAllStudents()
            }, 20000)
            return () => clearInterval(interval)
        }
    }, [token])

    return (
        <DirectorContext.Provider value={value}>
            {props.children}
        </DirectorContext.Provider>
    )
}

export default DirectorContextProvider
