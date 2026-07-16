import { createContext, useEffect, useState } from "react"
import axios from 'axios'
import { toast } from 'react-toastify'
import { confirm } from '../lib/confirm.js'
import { formatMoney } from '../lib/format.js'
import { t } from '../i18n/LanguageContext.jsx'

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
                toast.error(t('accountNotAdmin'))
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
        setStudents([]); setGroups([]); setPayments([])
    }

    const getStudents = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/students', authHeader)
            setStudents(data.students)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadStudents'))
        }
    }

    const createStudent = async (payload) => {
        try {
            await axios.post(backendUrl + '/api/admin/students', payload, authHeader)
            toast.success(t('studentCreated'))
            getStudents()
            return true
        } catch (error) {
            if (error.response?.data?.error === 'passport_info_required') {
                toast.error(t('passportRequiredError'))
            } else {
                toast.error(error.response?.data?.error || t('couldNotCreateStudent'))
            }
            return false
        }
    }

    const updateStudent = async (id, payload) => {
        try {
            await axios.put(backendUrl + '/api/admin/students/' + id, payload, authHeader)
            toast.success(t('studentUpdated'))
            getStudents()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotUpdateStudent'))
            return false
        }
    }

    const deleteStudent = async (id) => {
        if (!(await confirm(t('confirmRemoveStudent')))) return
        try {
            await axios.delete(backendUrl + '/api/admin/students/' + id, authHeader)
            toast.success(t('studentRemoved'))
            getStudents()
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotRemoveStudent'))
        }
    }

    const getStudentProfile = async (id) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/students/' + id, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadStudentProfile'))
            return null
        }
    }

    // api to correct a student's level within an existing course (e.g. after a placement test)
    const updateStudentCourse = async (studentId, courseId, levelId) => {
        try {
            await axios.put(backendUrl + `/api/admin/students/${studentId}/courses/${courseId}`, { levelId }, authHeader)
            toast.success(t('courseLevelUpdated'))
            getStudents()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotUpdateCourseLevel'))
            return false
        }
    }

    const addStudentCourse = async (studentId, languageId, levelId) => {
        try {
            await axios.post(backendUrl + `/api/admin/students/${studentId}/courses`, { languageId, levelId }, authHeader)
            toast.success(t('courseAdded'))
            getStudents()
            return true
        } catch (error) {
            if (error.response?.data?.error === 'language_already_enrolled') {
                toast.error(t('alreadyEnrolledError'))
            } else {
                toast.error(error.response?.data?.error || t('couldNotAddCourse'))
            }
            return false
        }
    }

    const createPayment = async (studentId, languageId, amount) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/admin/payments', { studentId, languageId, amount }, authHeader)
            if (data.isActive) {
                toast.success(t('paymentRecordedActive'))
            } else {
                toast.success(t('paymentRecordedMoreNeeded', { amount: formatMoney(data.amountStillNeeded) }))
            }
            getStudents(); getPayments()
            return true
        } catch (error) {
            if (error.response?.data?.error === 'student_has_no_course') {
                toast.error(t('studentNoCourseError'))
            } else {
                toast.error(error.response?.data?.error || t('couldNotRecordPayment'))
            }
            return false
        }
    }

    const getPayments = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/payments', authHeader)
            setPayments(data.payments)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadPayments'))
        }
    }

    const deletePayment = async (id) => {
        if (!(await confirm(t('confirmVoidPayment')))) return
        try {
            await axios.delete(backendUrl + '/api/admin/payments/' + id, authHeader)
            toast.success(t('paymentVoided'))
            getPayments(); getStudents()
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotVoidPayment'))
        }
    }

    const getGroups = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/groups', authHeader)
            setGroups(data.groups)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadGroups'))
        }
    }

    const createGroup = async (payload) => {
        try {
            await axios.post(backendUrl + '/api/admin/groups', payload, authHeader)
            toast.success(t('groupCreated'))
            getGroups()
            return true
        } catch (error) {
            if (error.response?.data?.error === 'teacher_schedule_conflict') {
                toast.error(t('teacherScheduleConflict'))
            } else {
                toast.error(error.response?.data?.error || t('couldNotCreateGroup'))
            }
            return false
        }
    }

    const getGroupProfile = async (id) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/groups/' + id, authHeader)
            return data.group
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadGroup'))
            return null
        }
    }

    const updateGroup = async (id, payload) => {
        try {
            await axios.put(backendUrl + '/api/admin/groups/' + id, payload, authHeader)
            toast.success(t('groupUpdated'))
            getGroups()
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

    const deleteGroup = async (id) => {
        if (!(await confirm(t('confirmArchiveGroup')))) return
        try {
            await axios.delete(backendUrl + '/api/admin/groups/' + id, authHeader)
            toast.success(t('groupArchived'))
            getGroups()
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotArchiveGroup'))
        }
    }

    const unarchiveGroup = async (id) => {
        if (!(await confirm(t('confirmReactivateGroup')))) return
        try {
            await axios.post(backendUrl + `/api/admin/groups/${id}/unarchive`, {}, authHeader)
            toast.success(t('groupReactivated'))
            getGroups()
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotReactivateGroup'))
        }
    }

    const removeStudentFromGroup = async (groupId, studentId) => {
        if (!(await confirm(t('confirmRemoveStudentFromGroup')))) return
        try {
            await axios.delete(backendUrl + `/api/admin/groups/${groupId}/students/${studentId}`, authHeader)
            toast.success(t('studentRemovedFromGroup'))
            getGroups()
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotRemoveStudentFromGroup'))
        }
    }

    const suggestGroup = async (languageId, levelId) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/admin/groups/suggest?languageId=${languageId}&levelId=${levelId}`, authHeader)
            return data.suggestion
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotFetchSuggestion'))
            return null
        }
    }

    const addStudentToGroup = async (groupId, studentId) => {
        try {
            await axios.post(backendUrl + `/api/admin/groups/${groupId}/students`, { studentId }, authHeader)
            toast.success(t('studentAddedToGroup'))
            getGroups()
            return true
        } catch (error) {
            if (error.response?.data?.error === 'payment_required') {
                toast.error(t('paymentRequiredError'))
            } else if (error.response?.data?.error === 'group_full') {
                toast.error(t('groupFullError'))
            } else if (error.response?.data?.error === 'already_in_language_group') {
                toast.error(t('alreadyInLanguageGroupError'))
            } else {
                toast.error(error.response?.data?.error || t('couldNotAddStudent'))
            }
            return false
        }
    }

    const retakeExam = async (examId, studentId, score) => {
        try {
            const { data } = await axios.post(backendUrl + `/api/admin/exams/${examId}/retake/${studentId}`, { score }, authHeader)
            toast.success(t('retakeRecorded', { outcome: data.outcome }))
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotRecordRetake'))
            return null
        }
    }

    const getTeachers = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/teachers', authHeader)
            setTeachers(data.teachers)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadTeachers'))
        }
    }

    const getLanguages = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/languages', authHeader)
            setLanguages(data.languages)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadLanguages'))
        }
    }

    const getLevels = async (languageId) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/levels' + (languageId ? `?languageId=${languageId}` : ''), authHeader)
            setLevels(data.levels)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadLevels'))
        }
    }

    const getSettings = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/settings', authHeader)
            setSettings(data.settings)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadSettings'))
        }
    }

    const getMe = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/me', authHeader)
            setMe(data)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadProfile'))
        }
    }

    const getTeacherProfile = async (id) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/teachers/' + id, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadTeacherProfile'))
            return null
        }
    }

    // api to generate a new permanent, shared teacher check-in QR for this branch
    const createTeacherAttendanceQR = async () => {
        try {
            const { data } = await axios.post(backendUrl + '/api/admin/attendance-qr', {}, authHeader)
            toast.success(t('checkInQrGenerated'))
            getTeacherAttendanceQRs()
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotGenerateQr'))
            return null
        }
    }

    // api to list this branch's existing check-in QR codes
    const getTeacherAttendanceQRs = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/attendance-qr', authHeader)
            setTeacherAttendanceQRs(data.qrs)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadQrCodes'))
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
