import { createContext, useEffect, useState } from "react"
import axios from 'axios'
import { toast } from 'react-toastify'
import { confirm } from '../lib/confirm.js'
import { formatMoney } from '../lib/format.js'

export const AdminContext = createContext()

const AdminContextProvider = (props) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    const [token, setToken] = useState(localStorage.getItem('token') ? localStorage.getItem('token') : false)
    const [students, setStudents] = useState([])
    const [groups, setGroups] = useState([])
    const [payments, setPayments] = useState([])
    const [teachers, setTeachers] = useState([])
    const [languages, setLanguages] = useState([])
    const [levels, setLevels] = useState([])
    const [me, setMe] = useState(false)
    const [settings, setSettings] = useState(false)
    const [teacherAttendanceQRs, setTeacherAttendanceQRs] = useState([])

    const authHeader = { headers: { Authorization: `Bearer ${token}` } }

    const login = async (phone, password) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/auth/login', { phone, password })
            if (data.user.role !== 'admin') {
                toast.error('this account is not an admin account')
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
        setStudents([]); setGroups([]); setPayments([])
    }

    const getStudents = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/students', authHeader)
            setStudents(data.students)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load students')
        }
    }

    const createStudent = async (payload) => {
        try {
            await axios.post(backendUrl + '/api/admin/students', payload, authHeader)
            toast.success('student created')
            getStudents()
            return true
        } catch (error) {
            if (error.response?.data?.error === 'passport_info_required') {
                toast.error('passport/ID info is required for new students')
            } else {
                toast.error(error.response?.data?.error || 'could not create student')
            }
            return false
        }
    }

    const updateStudent = async (id, payload) => {
        try {
            await axios.put(backendUrl + '/api/admin/students/' + id, payload, authHeader)
            toast.success('student updated')
            getStudents()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not update student')
            return false
        }
    }

    const deleteStudent = async (id) => {
        if (!(await confirm('Remove this student? This cannot be undone.'))) return
        try {
            await axios.delete(backendUrl + '/api/admin/students/' + id, authHeader)
            toast.success('student removed')
            getStudents()
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not remove student')
        }
    }

    const getStudentProfile = async (id) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/students/' + id, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load student profile')
            return null
        }
    }

    // api to correct a student's level within an existing course (e.g. after a placement test)
    const updateStudentCourse = async (studentId, courseId, levelId) => {
        try {
            await axios.put(backendUrl + `/api/admin/students/${studentId}/courses/${courseId}`, { levelId }, authHeader)
            toast.success('course level updated')
            getStudents()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not update course level')
            return false
        }
    }

    const addStudentCourse = async (studentId, languageId, levelId) => {
        try {
            await axios.post(backendUrl + `/api/admin/students/${studentId}/courses`, { languageId, levelId }, authHeader)
            toast.success('course added')
            getStudents()
            return true
        } catch (error) {
            if (error.response?.data?.error === 'language_already_enrolled') {
                toast.error('this student already studies that language')
            } else {
                toast.error(error.response?.data?.error || 'could not add course')
            }
            return false
        }
    }

    const createPayment = async (studentId, languageId, amount) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/admin/payments', { studentId, languageId, amount }, authHeader)
            if (data.isActive) {
                toast.success('payment recorded - course is now active')
            } else {
                toast.success(`payment recorded - ${formatMoney(data.amountStillNeeded)} more needed to activate`)
            }
            getStudents(); getPayments()
            return true
        } catch (error) {
            if (error.response?.data?.error === 'student_has_no_course') {
                toast.error("this student isn't enrolled in that course yet")
            } else {
                toast.error(error.response?.data?.error || 'could not record payment')
            }
            return false
        }
    }

    const getPayments = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/payments', authHeader)
            setPayments(data.payments)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load payments')
        }
    }

    const deletePayment = async (id) => {
        if (!(await confirm("Void this payment? The course's balance and active status will be recalculated."))) return
        try {
            await axios.delete(backendUrl + '/api/admin/payments/' + id, authHeader)
            toast.success('payment voided')
            getPayments(); getStudents()
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not void payment')
        }
    }

    const getGroups = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/groups', authHeader)
            setGroups(data.groups)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load groups')
        }
    }

    const createGroup = async (payload) => {
        try {
            await axios.post(backendUrl + '/api/admin/groups', payload, authHeader)
            toast.success('group created')
            getGroups()
            return true
        } catch (error) {
            if (error.response?.data?.error === 'teacher_schedule_conflict') {
                toast.error('this teacher already has a class at that time')
            } else {
                toast.error(error.response?.data?.error || 'could not create group')
            }
            return false
        }
    }

    const getGroupProfile = async (id) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/groups/' + id, authHeader)
            return data.group
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load group')
            return null
        }
    }

    const updateGroup = async (id, payload) => {
        try {
            await axios.put(backendUrl + '/api/admin/groups/' + id, payload, authHeader)
            toast.success('group updated')
            getGroups()
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

    const deleteGroup = async (id) => {
        if (!(await confirm('Archive this group? Students keep their history but the group stops being active.'))) return
        try {
            await axios.delete(backendUrl + '/api/admin/groups/' + id, authHeader)
            toast.success('group archived')
            getGroups()
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not archive group')
        }
    }

    const unarchiveGroup = async (id) => {
        if (!(await confirm('Reactivate this group?'))) return
        try {
            await axios.post(backendUrl + `/api/admin/groups/${id}/unarchive`, {}, authHeader)
            toast.success('group reactivated')
            getGroups()
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not reactivate group')
        }
    }

    const removeStudentFromGroup = async (groupId, studentId) => {
        if (!(await confirm('Remove this student from the group?'))) return
        try {
            await axios.delete(backendUrl + `/api/admin/groups/${groupId}/students/${studentId}`, authHeader)
            toast.success('student removed from group')
            getGroups()
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not remove student')
        }
    }

    const suggestGroup = async (languageId, levelId) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/admin/groups/suggest?languageId=${languageId}&levelId=${levelId}`, authHeader)
            return data.suggestion
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not fetch suggestion')
            return null
        }
    }

    const addStudentToGroup = async (groupId, studentId) => {
        try {
            await axios.post(backendUrl + `/api/admin/groups/${groupId}/students`, { studentId }, authHeader)
            toast.success('student added to group')
            getGroups()
            return true
        } catch (error) {
            if (error.response?.data?.error === 'payment_required') {
                toast.error("this student's course for this language/level isn't active yet")
            } else if (error.response?.data?.error === 'group_full') {
                toast.error('this group is already full')
            } else if (error.response?.data?.error === 'already_in_language_group') {
                toast.error('this student is already in another active group for this same language')
            } else {
                toast.error(error.response?.data?.error || 'could not add student')
            }
            return false
        }
    }

    const retakeExam = async (examId, studentId, score) => {
        try {
            const { data } = await axios.post(backendUrl + `/api/admin/exams/${examId}/retake/${studentId}`, { score }, authHeader)
            toast.success(`retake recorded: ${data.outcome}`)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not record retake')
            return null
        }
    }

    const getTeachers = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/teachers', authHeader)
            setTeachers(data.teachers)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load teachers')
        }
    }

    const getLanguages = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/languages', authHeader)
            setLanguages(data.languages)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load languages')
        }
    }

    const getLevels = async (languageId) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/levels' + (languageId ? `?languageId=${languageId}` : ''), authHeader)
            setLevels(data.levels)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load levels')
        }
    }

    const getSettings = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/settings', authHeader)
            setSettings(data.settings)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load settings')
        }
    }

    const getMe = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/me', authHeader)
            setMe(data)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load profile')
        }
    }

    const getTeacherProfile = async (id) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/teachers/' + id, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load teacher profile')
            return null
        }
    }

    // api to generate a new permanent, shared teacher check-in QR for this branch
    const createTeacherAttendanceQR = async () => {
        try {
            const { data } = await axios.post(backendUrl + '/api/admin/attendance-qr', {}, authHeader)
            toast.success('check-in QR generated')
            getTeacherAttendanceQRs()
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not generate QR code')
            return null
        }
    }

    // api to list this branch's existing check-in QR codes
    const getTeacherAttendanceQRs = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/attendance-qr', authHeader)
            setTeacherAttendanceQRs(data.qrs)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load QR codes')
        }
    }

    const value = {
        token, login, logout,
        students, getStudents, createStudent, updateStudent, deleteStudent, getStudentProfile, addStudentCourse, updateStudentCourse,
        payments, getPayments, createPayment, deletePayment,
        groups, getGroups, createGroup, getGroupProfile, updateGroup, deleteGroup, unarchiveGroup, suggestGroup, addStudentToGroup, removeStudentFromGroup, retakeExam,
        teachers, getTeachers,
        languages, getLanguages,
        levels, getLevels,
        me, getMe,
        settings, getSettings,
        createTeacherAttendanceQR, getTeacherAttendanceQRs, teacherAttendanceQRs, getTeacherProfile,
    }

    useEffect(() => {
        if (token) {
            getStudents(); getGroups(); getPayments(); getTeachers(); getLanguages(); getMe(); getSettings(); getTeacherAttendanceQRs()
        }
    }, [token])

    return (
        <AdminContext.Provider value={value}>
            {props.children}
        </AdminContext.Provider>
    )
}

export default AdminContextProvider
