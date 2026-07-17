import { createContext, useEffect, useState } from "react"
import axios from 'axios'
import { toast } from 'react-toastify'
import { confirm } from '../lib/confirm.js'

export const StudentContext = createContext()

const StudentContextProvider = (props) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    const [token, setToken] = useState(localStorage.getItem('token') ? localStorage.getItem('token') : false)
    const [me, setMe] = useState(false)
    const [week, setWeek] = useState(false)
    const [progress, setProgress] = useState(false)
    const [settings, setSettings] = useState(false)

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
                    setMe(false); setWeek(false); setProgress(false)
                    toast.error('your session has expired - please log in again')
                }
                return Promise.reject(error)
            }
        )
        return () => axios.interceptors.response.eject(interceptorId)
    }, [])

    const login = async (phone, password) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/auth/login', { phone, password })
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
        setMe(false); setWeek(false); setProgress(false)
    }

    // api to fetch the student's own profile - now returns an array of courses (a student can
    // study more than one language at once)
    const getMe = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/student/me', authHeader)
            setMe(data)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load profile')
        }
    }

    const getHomeworkWeek = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/student/homework/week', authHeader)
            setWeek(data)
            return data
        } catch (error) {
            if (error.response?.data?.error === 'subscription_expired') {
                toast.error('your subscription has expired - contact your branch admin')
            } else if (error.response?.data?.error !== 'no_active_group') {
                toast.error(error.response?.data?.error || 'could not load homework')
            }
            return null
        }
    }

    const getHomeworkForDay = async (day) => {
        if (!Number.isInteger(day)) return null
        try {
            const { data } = await axios.get(backendUrl + '/api/student/homework/day/' + day, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || 'this day is not available')
            return null
        }
    }

    const submitVocab = async (groupId, day, answers) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/student/homework/vocab/submit', { groupId, day, answers }, authHeader)
            getHomeworkWeek()
            getProgress()
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || 'submit failed')
            return null
        }
    }

    const submitGrammar = async (groupId, day, answers) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/student/homework/grammar/submit', { groupId, day, answers }, authHeader)
            getHomeworkWeek()
            getProgress()
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || 'submit failed')
            return null
        }
    }

    const submitReading = async (groupId, day, answers) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/student/homework/reading/submit', { groupId, day, answers }, authHeader)
            getHomeworkWeek()
            getProgress()
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || 'submit failed')
            return null
        }
    }

    // enabledStudentLanguages here controls which UI languages the app's language switcher offers
    const getSettings = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/student/settings', authHeader)
            setSettings(data.settings)
        } catch (error) {
            // quiet - this only gates the language switcher, not worth alarming the student over
        }
    }

    const getProgress = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/student/progress', authHeader)
            setProgress(data)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load progress')
        }
    }

    const getGroupRanking = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/student/group-ranking', authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load ranking')
            return null
        }
    }

    // api for the full roster with everyone's day-by-day progress, used by the enhanced Ranking page
    const getGroupProgress = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/student/group-progress', authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load group progress')
            return null
        }
    }

    // returns { examId, durationMinutes, questions } - questions never include the correct answer,
    // grading happens entirely server-side in submitExam below
    const getExam = async (levelId) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/student/exam/' + levelId, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || 'no exam available yet')
            return null
        }
    }

    // answers: [{ questionId, answer }]
    const submitExam = async (examId, answers) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/student/exam/' + examId + '/submit', { answers }, authHeader)
            return data
        } catch (error) {
            if (error.response?.data?.error === 'exam_already_attempted') {
                toast.error('you have already taken this exam - ask your admin about a retake')
            } else {
                toast.error(error.response?.data?.error || 'submit failed')
            }
            return null
        }
    }

    // api to mark yourself present by scanning your teacher's attendance QR code
    const scanAttendance = async (qrToken) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/student/attendance/scan', { token: qrToken }, authHeader)
            return { ok: true, ...data }
        } catch (error) {
            const code = error.response?.data?.error
            if (code === 'qr_expired') toast.error('this QR code has expired - ask your teacher to regenerate it')
            else if (code === 'not_in_this_group') toast.error("this code isn't for a group you're in")
            else toast.error(code || 'could not check in')
            return { ok: false }
        }
    }

    const value = {
        backendUrl, token, setToken, login, logout,
        me, getMe,
        week, getHomeworkWeek, getHomeworkForDay,
        submitVocab, submitGrammar, submitReading,
        progress, getProgress, getGroupRanking, getGroupProgress, getExam, submitExam,
        scanAttendance,
        settings, getSettings,
    }

    useEffect(() => {
        if (token) {
            getHomeworkWeek()
            getProgress()
            getMe()
            getSettings()
        }
    }, [token])

    return (
        <StudentContext.Provider value={value}>
            {props.children}
        </StudentContext.Provider>
    )
}

export default StudentContextProvider
