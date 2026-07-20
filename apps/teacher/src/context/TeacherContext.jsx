import { createContext, useEffect, useState } from "react"
import axios from 'axios'
import { toast } from 'react-toastify'
import { confirm } from '../lib/confirm.js'

export const TeacherContext = createContext()

const TeacherContextProvider = (props) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    const [token, setToken] = useState(localStorage.getItem('token') ? localStorage.getItem('token') : false)
    const [groups, setGroups] = useState([])
    const [nextLesson, setNextLesson] = useState(null)
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
                    setGroups([])
                    setNextLesson(null)
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
            if (data.user.role !== 'teacher') {
                toast.error('this account is not a teacher account')
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
        setGroups([])
        setNextLesson(null)
    }

    const getMyGroups = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/teacher/my-groups', authHeader)
            setGroups(data.groups)
            setNextLesson(data.nextLesson || null)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load groups')
        }
    }

    const getGroupStudents = async (groupId) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/teacher/my-groups/${groupId}/students`, authHeader)
            return data.students
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load roster')
            return []
        }
    }

    const getStudentDayDetail = async (groupId, studentId) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/teacher/my-groups/${groupId}/students/${studentId}/days`, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load student detail')
            return null
        }
    }

    // api to generate a fresh 2-minute attendance QR token for today's session
    const createAttendanceSession = async (groupId) => {
        try {
            const { data } = await axios.post(backendUrl + `/api/teacher/my-groups/${groupId}/attendance/session`, {}, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not generate QR code')
            return null
        }
    }

    // api to see who has scanned in for a given day
    const getAttendanceForDay = async (groupId, day) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/teacher/my-groups/${groupId}/attendance/${day}`, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load attendance')
            return null
        }
    }

    const getMyTimetable = async (date) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/teacher/timetable' + (date ? `?date=${date}` : ''), authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load timetable')
            return null
        }
    }

    // teacher's own Davomat-style month grid (tick/cross per day) - their own check-in history
    const getMyAttendanceGrid = async (month) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/teacher/attendance-grid' + (month ? `?month=${month}` : ''), authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load attendance')
            return null
        }
    }

    const getMe = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/teacher/me', authHeader)
            setMe(data)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load profile')
        }
    }

    // api for the teacher to check THEMSELVES in for today via the admin-generated daily QR
    const scanOwnAttendance = async (qrToken) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/teacher/attendance/scan-self', { token: qrToken }, authHeader)
            return { ok: true, ...data }
        } catch (error) {
            const code = error.response?.data?.error
            if (code === 'invalid_qr') toast.error("that doesn't look like a valid check-in code")
            else if (code === 'qr_expired') toast.error("that code just expired - ask the front desk to refresh it")
            else toast.error(code || 'could not check in')
            return { ok: false }
        }
    }

    // api to manually mark a student present/absent - for students without a phone to scan with
    const markStudentAttendance = async (groupId, day, studentId, present) => {
        try {
            await axios.put(backendUrl + `/api/teacher/my-groups/${groupId}/attendance/${day}/students/${studentId}`, { present }, authHeader)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not update attendance')
            return false
        }
    }

    const value = { token, login, logout, groups, nextLesson, getMyGroups, getGroupStudents, getStudentDayDetail, createAttendanceSession, getAttendanceForDay, me, getMe, scanOwnAttendance, markStudentAttendance, getMyTimetable, getMyAttendanceGrid }

    useEffect(() => { if (token) { getMyGroups(); getMe() } }, [token])

    return (
        <TeacherContext.Provider value={value}>
            {props.children}
        </TeacherContext.Provider>
    )
}

export default TeacherContextProvider
