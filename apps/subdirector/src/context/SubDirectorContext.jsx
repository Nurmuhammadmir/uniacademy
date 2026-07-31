import { createContext, useEffect, useState } from "react"
import axios from 'axios'
import { toast } from 'react-toastify'
import { confirm } from '../lib/confirm.js'
import { t } from '../i18n/LanguageContext.jsx'

// this app is a sub_director's whole world - every request below hits the exact same
// /api/director/* endpoints the director app uses, just scoped server-side to this sub_director's
// own branch. There is no Overview/Branches-map/Homework here at all (not hidden - just not
// built), since those stay director-only both in the UI and on the backend.
export const SubDirectorContext = createContext()

const SubDirectorContextProvider = (props) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    const [token, setToken] = useState(localStorage.getItem('token') ? localStorage.getItem('token') : false)
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
    const [me, setMe] = useState(false)

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
                    setAdmins([]); setTeachers([]); setPricing([]); setAllStudents([])
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
            if (data.user.role !== 'sub_director') {
                toast.error(t('accountNotSubDirector'))
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
        setMe(false)
        setAdmins([]); setTeachers([]); setPricing([]); setAllStudents([])
    }

    // tells the app its own branchId - mostly so the sidebar can show which branch this account
    // manages; every real endpoint enforces the branch scoping itself regardless of this
    const getMe = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/me', authHeader)
            setMe(data)
            return data
        } catch (error) {
            return null
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

    // "Admins" here only ever means plain admin accounts within this sub_director's own branch -
    // the server rejects (and hides) anything else, see directorController.js's isSubDirector checks
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

    const getAdminProfile = async (id) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/admins/' + id, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadAdminProfile'))
            return null
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

    // always resolves to just this sub_director's own single branch (server-scoped) - kept as a
    // list (not a single object) so it drops straight into the same branch-switcher UI patterns
    // the director app uses, just naturally showing one option
    const getBranches = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/branches', authHeader)
            setBranches(data.branches)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadBranches'))
        }
    }

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

    const prepaySalary = async (branchId, teacherId, amount, dateFrom, dateTo, method) => {
        try {
            await axios.post(backendUrl + '/api/director/salary/prepay', { branchId, teacherId, amount, dateFrom, dateTo, method }, authHeader)
            toast.success(t('prepaymentRecorded'))
            return true
        } catch (error) {
            const code = error.response?.data?.error
            if (code === 'salary_already_paid') toast.error(t('salaryAlreadyPaidError'))
            else toast.error(code === 'invalid_method' ? t('invalidPaymentMethodError') : (code || t('couldNotPrepaySalary')))
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

    const getAttendanceOverview = async (date) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/attendance' + (date ? `?date=${date}` : ''), authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadAttendance'))
            return null
        }
    }

    // ==== languages (courses) - catalog-wide, not branch-scoped, same as the director app ====
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

    // ==== groups (this branch only, server-scoped) ====
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
        me, getMe,
        allStudents, getAllStudents, getStudentProfile,
        admins, getAdmins, createAdmin, updateAdmin, deleteAdminAccount, getAdminProfile,
        teachers, getTeachers, createTeacher, updateTeacher, deleteTeacherAccount, getTeacherProfile,
        pricing, getPricing, upsertPricing, deletePricing,
        branches, getBranches, getTimetable,
        languages, getLanguages, createLanguage, updateLanguage, deleteLanguage,
        levels, getLevels, createLevel, updateLevel, deleteLevel,
        getAttendanceOverview,
        settings, getSettings, updateSettings,
        allGroups, getAllGroups, updateGroupLimits,
        getFinanceOverview, getPaymentDetail, getBusinessLedger,
        payRates, getPayRates, setPayRate, deletePayRate, calculateSalary, getSalaryDetail, paySalary, prepaySalary,
        backendUrl,
    }

    useEffect(() => {
        if (token) {
            getMe(); getAdmins(); getTeachers(); getPricing()
            getBranches(); getLanguages(); getAllStudents(); getSettings(); getAllGroups()

            // lightweight polling - a different admin/teacher's actions happen in a totally separate
            // browser tab/app with its own React state, so there's no way for this tab to be pushed
            // an update instantly without websockets. Polling every 20s is the practical middle
            // ground: numbers here catch up on their own, no manual refresh needed.
            const interval = setInterval(() => {
                getAllStudents()
            }, 20000)
            return () => clearInterval(interval)
        }
    }, [token])

    return (
        <SubDirectorContext.Provider value={value}>
            {props.children}
        </SubDirectorContext.Provider>
    )
}

export default SubDirectorContextProvider
