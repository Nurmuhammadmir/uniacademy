import { createContext, useEffect, useState } from "react"
import axios from 'axios'
import { toast } from 'react-toastify'
import { confirm } from '../lib/confirm.js'

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

    const authHeader = { headers: { Authorization: `Bearer ${token}` } }

    const login = async (phone, password) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/auth/login', { phone, password })
            if (data.user.role !== 'director') {
                toast.error('this account is not a director account')
                return false
            }
            localStorage.setItem('token', data.token)
            setToken(data.token)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || 'login failed')
            return false
        }
    }

    const logout = async () => {
        if (!(await confirm('Sign out of UniAcademy?'))) return
        localStorage.removeItem('token')
        setToken(false)
        setStats(false); setMapData(false); setAdmins([]); setTeachers([]); setPricing([]); setAllStudents([])
    }

    const getStats = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/stats', authHeader)
            setStats(data)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load stats')
        }
    }

    const getMapData = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/map-data', authHeader)
            setMapData(data.byBranch)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load map data')
        }
    }

    const getAllStudents = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/students', authHeader)
            setAllStudents(data.students)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load students')
        }
    }

    const getStudentProfile = async (id) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/students/' + id, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load student profile')
            return null
        }
    }

    // api for the branch detail modal - admins/teachers/students/revenue for one branch
    const getBranchProfile = async (id) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/branches/' + id, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load branch profile')
            return null
        }
    }

    const getAdmins = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/admins', authHeader)
            setAdmins(data.admins)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load admins')
        }
    }

    const createAdmin = async (payload) => {
        try {
            await axios.post(backendUrl + '/api/director/admins', payload, authHeader)
            toast.success('admin created')
            getAdmins()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not create admin')
            return false
        }
    }

    const updateAdmin = async (id, payload) => {
        try {
            await axios.put(backendUrl + '/api/director/admins/' + id, payload, authHeader)
            toast.success('admin updated')
            getAdmins()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not update admin')
            return false
        }
    }

    const deleteAdminAccount = async (id) => {
        if (!(await confirm('Remove this admin account?'))) return
        try {
            await axios.delete(backendUrl + '/api/director/admins/' + id, authHeader)
            toast.success('admin removed')
            getAdmins()
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not remove admin')
        }
    }

    const getTeachers = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/teachers', authHeader)
            setTeachers(data.teachers)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load teachers')
        }
    }

    const getTeacherProfile = async (id) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/teachers/' + id, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load teacher profile')
            return null
        }
    }

    const createTeacher = async (payload) => {
        try {
            await axios.post(backendUrl + '/api/director/teachers', payload, authHeader)
            toast.success('teacher created')
            getTeachers()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not create teacher')
            return false
        }
    }

    const updateTeacher = async (id, payload) => {
        try {
            await axios.put(backendUrl + '/api/director/teachers/' + id, payload, authHeader)
            toast.success('teacher updated')
            getTeachers()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not update teacher')
            return false
        }
    }

    const deleteTeacherAccount = async (id) => {
        if (!(await confirm('Remove this teacher account? Their existing groups will keep running but stay assigned to them until reassigned.'))) return
        try {
            await axios.delete(backendUrl + '/api/director/teachers/' + id, authHeader)
            toast.success('teacher removed')
            getTeachers()
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not remove teacher')
        }
    }

    const getPricing = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/pricing', authHeader)
            setPricing(data.pricing)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load pricing')
        }
    }

    const upsertPricing = async (payload) => {
        try {
            await axios.post(backendUrl + '/api/director/pricing', payload, authHeader)
            toast.success('pricing saved')
            getPricing()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not save pricing')
            return false
        }
    }

    const deletePricing = async (id) => {
        if (!(await confirm('Remove this price? Students on this course will not activate on new payments until a price is set again.'))) return
        try {
            await axios.delete(backendUrl + '/api/director/pricing/' + id, authHeader)
            toast.success('pricing removed')
            getPricing()
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not remove pricing')
        }
    }

    const getBranches = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/branches', authHeader)
            setBranches(data.branches)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load branches')
        }
    }

    const getLanguages = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/languages', authHeader)
            setLanguages(data.languages)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load languages')
        }
    }

    const getLevels = async (languageId) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/levels' + (languageId ? `?languageId=${languageId}` : ''), authHeader)
            setLevels(data.levels)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load levels')
        }
    }

    const getAdminProfile = async (id) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/admins/' + id, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load admin profile')
            return null
        }
    }

    const getAttendanceOverview = async (date) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/attendance' + (date ? `?date=${date}` : ''), authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load attendance overview')
            return null
        }
    }

    // ==== branches ====
    const createBranch = async (name) => {
        try {
            await axios.post(backendUrl + '/api/director/branches', { name }, authHeader)
            toast.success('branch added')
            getBranches()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not add branch')
            return false
        }
    }

    const updateBranch = async (id, name) => {
        try {
            await axios.put(backendUrl + '/api/director/branches/' + id, { name }, authHeader)
            toast.success('branch updated')
            getBranches()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not update branch')
            return false
        }
    }

    // ==== languages (courses) ====
    const createLanguage = async (payload) => {
        try {
            await axios.post(backendUrl + '/api/director/languages', payload, authHeader)
            toast.success('course added')
            getLanguages()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not add course')
            return false
        }
    }

    const updateLanguage = async (id, payload) => {
        try {
            await axios.put(backendUrl + '/api/director/languages/' + id, payload, authHeader)
            toast.success('course updated')
            getLanguages()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not update course')
            return false
        }
    }

    // ==== levels ====
    const createLevel = async (payload) => {
        try {
            await axios.post(backendUrl + '/api/director/levels', payload, authHeader)
            toast.success('level added')
            getLevels(payload.languageId)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not add level')
            return false
        }
    }

    const updateLevel = async (id, payload, languageId) => {
        try {
            await axios.put(backendUrl + '/api/director/levels/' + id, payload, authHeader)
            toast.success('level updated')
            getLevels(languageId)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not update level')
            return false
        }
    }

    // ==== settings ====
    const getSettings = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/settings', authHeader)
            setSettings(data.settings)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load settings')
        }
    }

    const updateSettings = async (payload) => {
        try {
            const { data } = await axios.put(backendUrl + '/api/director/settings', payload, authHeader)
            setSettings(data.settings)
            toast.success('settings saved')
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not save settings')
            return false
        }
    }

    // ==== homework builder (content) ====
    const getContentSummary = async (languageId, levelId) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/director/content/summary?languageId=${languageId}&levelId=${levelId}`, authHeader)
            return data.summary
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load content summary')
            return {}
        }
    }

    const getDayContent = async (languageId, levelId, day) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/director/content/day?languageId=${languageId}&levelId=${levelId}&day=${day}`, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load day content')
            return null
        }
    }

    const saveVocab = async (payload) => {
        try {
            const { data } = await axios.put(backendUrl + '/api/director/content/vocab', payload, authHeader)
            toast.success(`Vocab saved (${data.wordCount} words, ${data.exerciseCount} test questions)`)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not save vocab')
            return false
        }
    }

    const saveGrammar = async (payload) => {
        try {
            const { data } = await axios.put(backendUrl + '/api/director/content/grammar', payload, authHeader)
            toast.success(`Grammar saved (${data.exerciseCount} exercises)`)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not save grammar')
            return false
        }
    }

    const saveReading = async (payload) => {
        try {
            const { data } = await axios.put(backendUrl + '/api/director/content/reading', payload, authHeader)
            toast.success(data.cleared ? 'Reading cleared' : `Reading saved (${data.exerciseCount} exercises)`)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not save reading')
            return false
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
            toast.error(error.response?.data?.error || 'could not upload image')
            return null
        }
    }

    // ==== groups (director-wide) ====
    const getAllGroups = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/director/groups', authHeader)
            setAllGroups(data.groups)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load groups')
        }
    }

    const updateGroupLimits = async (id, payload) => {
        try {
            await axios.put(backendUrl + '/api/director/groups/' + id, payload, authHeader)
            toast.success('group updated')
            getAllGroups()
            return true
        } catch (error) {
            if (error.response?.data?.error === 'teacher_schedule_conflict') {
                toast.error('this teacher already has a class at that time')
            } else {
                toast.error(error.response?.data?.error || 'could not update group')
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
        branches, getBranches, createBranch, updateBranch,
        languages, getLanguages, createLanguage, updateLanguage,
        levels, getLevels, createLevel, updateLevel,
        getAttendanceOverview,
        settings, getSettings, updateSettings,
        allGroups, getAllGroups, updateGroupLimits,
        backendUrl,
        getContentSummary, getDayContent, saveVocab, saveGrammar, saveReading, uploadContentImage,
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
