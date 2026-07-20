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
                    setStudents([]); setGroups([]); setPayments([])
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
            const code = error.response?.data?.error
            if (code === 'passport_info_required') toast.error(t('passportRequiredError'))
            else if (code === 'parent_password_required') toast.error(t('parentPasswordRequiredError'))
            else if (code === 'phone_already_in_use') toast.error(t('phoneAlreadyInUseError'))
            else toast.error(code || t('couldNotCreateStudent'))
            return false
        }
    }

    const linkParent = async (studentId, parentPhone, parentPassword) => {
        try {
            await axios.post(backendUrl + `/api/admin/students/${studentId}/parent`, { parentPhone, parentPassword }, authHeader)
            toast.success(t('parentLinked'))
            return true
        } catch (error) {
            const code = error.response?.data?.error
            if (code === 'parent_password_required') toast.error(t('parentPasswordRequiredError'))
            else if (code === 'phone_already_in_use') toast.error(t('phoneAlreadyInUseError'))
            else toast.error(code || t('couldNotLinkParent'))
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
        if (!(await confirm(t('confirmArchiveStudent')))) return
        try {
            await axios.delete(backendUrl + '/api/admin/students/' + id, authHeader)
            toast.success(t('studentArchived'))
            getStudents()
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotArchiveStudent'))
        }
    }

    const unarchiveStudent = async (id) => {
        try {
            await axios.post(backendUrl + '/api/admin/students/' + id + '/unarchive', {}, authHeader)
            toast.success(t('studentUnarchived'))
            getStudents()
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotUnarchiveStudent'))
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
            if (!levelId) { toast.error(t('levelRequiredError')); return false }
            await axios.put(backendUrl + `/api/admin/students/${studentId}/courses/${courseId}`, { levelId }, authHeader)
            toast.success(t('courseLevelUpdated'))
            getStudents()
            return true
        } catch (error) {
            const code = error.response?.data?.error
            toast.error(code === 'level_required' ? t('levelRequiredError') : (code || t('couldNotUpdateCourseLevel')))
            return false
        }
    }

    // a genuine price reduction for one student's course for one month (not an expense) - see
    // discount.service.js. Applies to potentially several students at once (a bulk selection from
    // the Students list), so the summary toast counts successes/failures across all of them rather
    // than firing one toast per student
    const applyDiscountToStudents = async (studentIds, payload) => {
        const results = await Promise.all(studentIds.map(async (studentId) => {
            try {
                await axios.post(backendUrl + `/api/admin/students/${studentId}/discounts`, payload, authHeader)
                return true
            } catch (error) {
                return false
            }
        }))
        const failCount = results.filter(ok => !ok).length
        if (failCount === 0) toast.success(t('discountAppliedToAll', { count: studentIds.length }))
        else toast.error(t('discountAppliedPartially', { ok: results.length - failCount, total: results.length }))
        getStudents()
        return failCount === 0
    }

    // never blocks on "already enrolled" - the caller (Students.jsx/StudentProfile.jsx) confirms
    // with the admin BEFORE calling this, when they can see the student already has that language,
    // so by the time this fires the intent is already confirmed. The server responds 200 (not an
    // error) when the language already exists, so this only ever returns false on a real failure.
    const addStudentCourse = async (studentId, languageId) => {
        try {
            const { data } = await axios.post(backendUrl + `/api/admin/students/${studentId}/courses`, { languageId }, authHeader)
            toast.success(data.alreadyEnrolled ? t('alreadyEnrolledNotice') : t('courseAdded'))
            getStudents()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotAddCourse'))
            return false
        }
    }

    const createPayment = async (studentId, languageId, levelId, amount, method) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/admin/payments', { studentId, languageId, levelId, amount, method }, authHeader)
            if (data.isActive) {
                toast.success(t('paymentRecordedActive'))
            } else {
                toast.success(t('paymentRecordedMoreNeeded', { amount: formatMoney(data.amountStillNeeded) }))
            }
            getStudents(); getPayments()
            return true
        } catch (error) {
            const code = error.response?.data?.error
            if (code === 'student_has_no_course') toast.error(t('studentNoCourseError'))
            else if (code === 'invalid_payment_method') toast.error(t('invalidPaymentMethodError'))
            else if (code === 'level_required') toast.error(t('levelRequiredError'))
            else if (code === 'level_mismatch') toast.error(t('levelMismatchError'))
            else toast.error(code || t('couldNotRecordPayment'))
            return false
        }
    }

    // read-only, no toast - a silent lookup the payment form polls as the admin picks a
    // language/level, purely to render a "this covers you through X" hint before they submit
    const getPaymentPreview = async (studentId, languageId, levelId) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/payments/preview', { params: { studentId, languageId, levelId }, ...authHeader })
            return data
        } catch (error) {
            return null
        }
    }

    // backs the Finance page's "click a transaction row" detail view - every field, fully populated
    const getPaymentDetail = async (id) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/payments/' + id, authHeader)
            return data.payment
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadTransaction'))
            return null
        }
    }

    // the accounting page's "лицевой счёт" - every course's own chronological Debit/Credit ledger
    const getStudentStatement = async (studentId) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/admin/students/${studentId}/statement`, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadStatement'))
            return null
        }
    }

    // the accounting page's "Акт сверки" - opening/charges/payments/closing for a date range,
    // scoped to one student, one group's roster, or the whole branch
    const getReconciliation = async ({ scope, studentId, groupId, dateFrom, dateTo }) => {
        try {
            const params = { scope, dateFrom, dateTo }
            if (studentId) params.studentId = studentId
            if (groupId) params.groupId = groupId
            const { data } = await axios.get(backendUrl + '/api/admin/reconciliation', { params, ...authHeader })
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadReconciliation'))
            return null
        }
    }

    // the Ledger page's "all financial operations" view - every payment + every expense (rent,
    // salary, refunds, everything) merged into one chronological timeline for the whole branch
    const getBusinessLedger = async ({ dateFrom, dateTo }) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/business-ledger', { params: { dateFrom, dateTo }, ...authHeader })
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadBusinessLedger'))
            return null
        }
    }

    const updatePayment = async (id, payload) => {
        try {
            await axios.put(backendUrl + '/api/admin/payments/' + id, payload, authHeader)
            toast.success(t('paymentUpdated'))
            getPayments(); getStudents()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotUpdatePayment'))
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

    // backs the Finance "All Payments" page - filters is a plain object of query params
    // (dateFrom/dateTo/search/groupId/teacherId/method/amount/page/limit/sortBy/sortOrder)
    const getFinanceOverview = async (filters = {}) => {
        try {
            const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== undefined))
            const { data } = await axios.get(backendUrl + '/api/admin/finance?' + params.toString(), authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadFinance'))
            return null
        }
    }

    // ==== Salary ("Ish haqi") ====
    const [payRates, setPayRatesState] = useState([])

    const getPayRates = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/pay-rates', authHeader)
            setPayRatesState(data.rates)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadPayRates'))
        }
    }

    const setPayRate = async (payload) => {
        try {
            await axios.post(backendUrl + '/api/admin/pay-rates', payload, authHeader)
            toast.success(t('payRateSaved'))
            getPayRates()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotSavePayRate'))
            return false
        }
    }

    const deletePayRate = async (id) => {
        if (!(await confirm(t('confirmDeletePayRate')))) return
        try {
            await axios.delete(backendUrl + '/api/admin/pay-rates/' + id, authHeader)
            toast.success(t('payRateDeleted'))
            getPayRates()
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotDeletePayRate'))
        }
    }

    const calculateSalary = async (dateFrom, dateTo) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/admin/salary/calculate?dateFrom=${dateFrom}&dateTo=${dateTo}`, authHeader)
            return data.results
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotCalculateSalary'))
            return null
        }
    }

    // itemized per-teacher breakdown backing the Salary page's "Details" button
    const getSalaryDetail = async (teacherId, dateFrom, dateTo) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/admin/salary/detail/${teacherId}?dateFrom=${dateFrom}&dateTo=${dateTo}`, authHeader)
            return data.detail
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadSalaryDetail'))
            return null
        }
    }

    // confirmation happens in the Pay Salary modal itself (it needs a payment-method choice, not
    // just OK/Cancel), same reason refundPayment below doesn't use the generic confirm() dialog either
    const paySalary = async (teacherId, amount, dateFrom, dateTo, method) => {
        try {
            await axios.post(backendUrl + '/api/admin/salary/pay', { teacherId, amount, dateFrom, dateTo, method }, authHeader)
            toast.success(t('salaryPaid'))
            return true
        } catch (error) {
            const code = error.response?.data?.error
            toast.error(code === 'invalid_method' ? t('invalidPaymentMethodError') : (code || t('couldNotPaySalary')))
            return false
        }
    }

    // an advance against a teacher's salary, booked as its own 'Prepayment' expense category -
    // blocked server-side once the real salary for this exact period has already been paid
    const prepaySalary = async (teacherId, amount, dateFrom, dateTo, method) => {
        try {
            await axios.post(backendUrl + '/api/admin/salary/prepay', { teacherId, amount, dateFrom, dateTo, method }, authHeader)
            toast.success(t('prepaymentRecorded'))
            return true
        } catch (error) {
            const code = error.response?.data?.error
            if (code === 'salary_already_paid') toast.error(t('salaryAlreadyPaidError'))
            else toast.error(code === 'invalid_method' ? t('invalidPaymentMethodError') : (code || t('couldNotPrepaySalary')))
            return false
        }
    }

    // amount is optional - omitting it refunds whatever remains (a full refund); passing a specific
    // amount does a partial refund instead. Confirmation happens in the refund modal itself (it
    // needs a number input, not just OK/Cancel), so this doesn't use the generic confirm() dialog.
    const refundPayment = async (paymentId, amount) => {
        try {
            await axios.post(backendUrl + '/api/admin/payments/' + paymentId + '/refund', amount !== undefined ? { amount } : {}, authHeader)
            toast.success(t('paymentRefunded'))
            getPayments(); getStudents()
            return true
        } catch (error) {
            const code = error.response?.data?.error
            if (code === 'invalid_refund_amount') toast.error(t('invalidRefundAmountError'))
            else if (code === 'already_refunded') toast.error(t('alreadyRefundedError'))
            else toast.error(code || t('couldNotRefundPayment'))
            return false
        }
    }

    // permanent, unlike refundPayment - only offered from the accounting Ledger page, with its own
    // stronger confirm wording so it's never confused with the reversible Refund action
    const deletePayment = async (paymentId) => {
        if (!(await confirm(t('confirmDeletePayment')))) return false
        try {
            await axios.delete(backendUrl + '/api/admin/payments/' + paymentId, authHeader)
            toast.success(t('paymentDeleted'))
            getPayments(); getStudents()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotDeletePayment'))
            return false
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
            const { data } = await axios.post(backendUrl + '/api/admin/groups', payload, authHeader)
            toast.success(t('groupCreated'))
            getGroups()
            return data.group
        } catch (error) {
            const code = error.response?.data?.error
            if (code === 'teacher_schedule_conflict') toast.error(t('teacherScheduleConflict'))
            else if (code === 'room_schedule_conflict') toast.error(t('roomScheduleConflict'))
            else toast.error(code || t('couldNotCreateGroup'))
            return null
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

    // `silent` skips the success toast - used for drag-and-drop moves on the Jadval scheduler so
    // dragging a card doesn't spam a toast on every drop, while the edit-booking form still shows one
    const updateGroup = async (id, payload, silent = false) => {
        try {
            const { data } = await axios.put(backendUrl + '/api/admin/groups/' + id, payload, authHeader)
            if (!silent) toast.success(t('groupUpdated'))
            getGroups()
            return data.group
        } catch (error) {
            const code = error.response?.data?.error
            if (code === 'teacher_schedule_conflict') toast.error(t('teacherScheduleConflict'))
            else if (code === 'room_schedule_conflict') toast.error(t('roomScheduleConflict'))
            else toast.error(code || t('couldNotUpdateGroup'))
            return null
        }
    }

    const deleteGroup = async (id) => {
        if (!(await confirm(t('confirmArchiveGroup')))) return false
        try {
            await axios.delete(backendUrl + '/api/admin/groups/' + id, authHeader)
            toast.success(t('groupArchived'))
            getGroups()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotArchiveGroup'))
            return false
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
            } else if (error.response?.data?.error === 'already_in_this_group') {
                toast.error(t('alreadyInThisGroupError'))
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

    // api to generate a fresh, short-lived (2 min) teacher check-in QR for this branch - the live
    // display page calls this every ~90s, so `silent` skips the success toast on auto-refresh
    const createTeacherAttendanceQR = async (silent = false) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/admin/attendance-qr', {}, authHeader)
            if (!silent) toast.success(t('checkInQrGenerated'))
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotGenerateQr'))
            return null
        }
    }

    const getAttendanceOverview = async (date) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/attendance' + (date ? `?date=${date}` : ''), authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadAttendance'))
            return null
        }
    }

    // ==== Rooms ====
    const [rooms, setRooms] = useState([])

    const getRooms = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/rooms', authHeader)
            setRooms(data.rooms)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadRooms'))
        }
    }

    const createRoom = async (payload) => {
        try {
            await axios.post(backendUrl + '/api/admin/rooms', payload, authHeader)
            toast.success(t('roomSaved'))
            getRooms()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotSaveRoom'))
            return false
        }
    }

    const updateRoom = async (id, payload) => {
        try {
            await axios.put(backendUrl + '/api/admin/rooms/' + id, payload, authHeader)
            toast.success(t('roomSaved'))
            getRooms()
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotSaveRoom'))
            return false
        }
    }

    const deleteRoom = async (id) => {
        if (!(await confirm(t('confirmDeleteRoom')))) return
        try {
            await axios.delete(backendUrl + '/api/admin/rooms/' + id, authHeader)
            toast.success(t('roomDeleted'))
            getRooms()
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotDeleteRoom'))
        }
    }

    // ==== Group Details page ====
    const getGroupDetails = async (id) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/groups/' + id + '/details', authHeader)
            return data.group
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadGroupDetails'))
            return null
        }
    }

    const updateGroupDiscount = async (id, discountPercent) => {
        try {
            await axios.put(backendUrl + '/api/admin/groups/' + id + '/discount', { discountPercent }, authHeader)
            toast.success(t('discountSaved'))
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotSaveDiscount'))
            return false
        }
    }

    const getGroupAttendanceGrid = async (id, month) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/admin/groups/${id}/attendance-grid?month=${month}`, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadAttendanceGrid'))
            return null
        }
    }

    const getGroupMaterials = async (id) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/admin/groups/${id}/materials`, authHeader)
            return data.materials
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadMaterials'))
            return []
        }
    }

    const addGroupMaterial = async (id, payload) => {
        try {
            await axios.post(backendUrl + `/api/admin/groups/${id}/materials`, payload, authHeader)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotAddMaterial'))
            return false
        }
    }

    const deleteGroupMaterial = async (id, materialId) => {
        try {
            await axios.delete(backendUrl + `/api/admin/groups/${id}/materials/${materialId}`, authHeader)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotDeleteMaterial'))
            return false
        }
    }

    const getExtraLessons = async (id) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/admin/groups/${id}/extra-lessons`, authHeader)
            return data.extraLessons
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadExtraLessons'))
            return []
        }
    }

    const createExtraLesson = async (id, payload) => {
        try {
            await axios.post(backendUrl + `/api/admin/groups/${id}/extra-lessons`, payload, authHeader)
            toast.success(t('extraLessonAdded'))
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotAddExtraLesson'))
            return false
        }
    }

    const deleteExtraLesson = async (id, extraLessonId) => {
        if (!(await confirm(t('confirmDeleteExtraLesson')))) return false
        try {
            await axios.delete(backendUrl + `/api/admin/groups/${id}/extra-lessons/${extraLessonId}`, authHeader)
            toast.success(t('extraLessonDeleted'))
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotDeleteExtraLesson'))
            return false
        }
    }

    const getGroupComments = async (id) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/admin/groups/${id}/comments`, authHeader)
            return data.comments
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadComments'))
            return []
        }
    }

    const addGroupComment = async (id, text) => {
        try {
            await axios.post(backendUrl + `/api/admin/groups/${id}/comments`, { text }, authHeader)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotAddComment'))
            return false
        }
    }

    const deleteGroupComment = async (id, commentId) => {
        try {
            await axios.delete(backendUrl + `/api/admin/groups/${id}/comments/${commentId}`, authHeader)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotDeleteComment'))
            return false
        }
    }

    // private personal scratchpad - never shared with other admins/director
    const getMyNotes = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/notes', authHeader)
            return data.notes
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadNotes'))
            return []
        }
    }

    const createMyNote = async (text) => {
        try {
            await axios.post(backendUrl + '/api/admin/notes', { text }, authHeader)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotAddNote'))
            return false
        }
    }

    const deleteMyNote = async (id) => {
        try {
            await axios.delete(backendUrl + '/api/admin/notes/' + id, authHeader)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotDeleteNote'))
            return false
        }
    }

    const getGroupExamsTab = async (id) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/admin/groups/${id}/exams-tab`, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadExamsTab'))
            return null
        }
    }

    const getTimetable = async (date) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/timetable' + (date ? `?date=${date}` : ''), authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadTimetable'))
            return null
        }
    }

    const getTeacherAttendanceGrid = async (teacherId, month) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/admin/teachers/${teacherId}/attendance-grid?month=${month}`, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadAttendanceGrid'))
            return null
        }
    }

    const getStudentAttendanceGrid = async (studentId, month) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/admin/students/${studentId}/attendance-grid?month=${month}`, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadAttendanceGrid'))
            return null
        }
    }

    const getLessonDetail = async (lessonId) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/lessons/' + lessonId, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadLessonDetail'))
            return null
        }
    }

    const setLessonTeacherStatus = async (lessonId, payload) => {
        try {
            const { data } = await axios.put(backendUrl + `/api/admin/lessons/${lessonId}/teacher-status`, payload, authHeader)
            return data.lesson
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotSaveTeacherStatus'))
            return null
        }
    }

    // ==== Expenses (Xarajatlar) ====
    const [expenseCategories, setExpenseCategories] = useState([])

    const getExpenseCategories = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/expense-categories', authHeader)
            setExpenseCategories(data.categories)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadExpenseCategories'))
        }
    }

    const createExpenseCategory = async (payload) => {
        try {
            await axios.post(backendUrl + '/api/admin/expense-categories', payload, authHeader)
            getExpenseCategories()
            return true
        } catch (error) {
            const code = error.response?.data?.error
            if (code === 'category_already_exists') toast.error(t('categoryAlreadyExistsError'))
            else toast.error(code || t('couldNotSaveCategory'))
            return false
        }
    }

    const updateExpenseCategory = async (id, payload) => {
        try {
            await axios.put(backendUrl + '/api/admin/expense-categories/' + id, payload, authHeader)
            getExpenseCategories()
            return true
        } catch (error) {
            const code = error.response?.data?.error
            if (code === 'category_already_exists') toast.error(t('categoryAlreadyExistsError'))
            else toast.error(code || t('couldNotSaveCategory'))
            return false
        }
    }

    const deleteExpenseCategory = async (id) => {
        if (!(await confirm(t('confirmDeleteCategory')))) return false
        try {
            await axios.delete(backendUrl + '/api/admin/expense-categories/' + id, authHeader)
            getExpenseCategories()
            return true
        } catch (error) {
            const code = error.response?.data?.error
            if (code === 'cannot_delete_other') toast.error(t('cannotDeleteOtherError'))
            else toast.error(code || t('couldNotDeleteCategory'))
            return false
        }
    }

    const getExpensesOverview = async (filters = {}) => {
        try {
            const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== undefined))
            const { data } = await axios.get(backendUrl + '/api/admin/expenses?' + params.toString(), authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadExpenses'))
            return null
        }
    }

    // backs the Finance page's "click a transaction row" detail view - every field, fully populated
    const getExpenseDetail = async (id) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/expenses/' + id, authHeader)
            return data.expense
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadTransaction'))
            return null
        }
    }

    const createExpense = async (payload) => {
        try {
            await axios.post(backendUrl + '/api/admin/expenses', payload, authHeader)
            toast.success(t('expenseSaved'))
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotSaveExpense'))
            return false
        }
    }

    const updateExpense = async (id, payload) => {
        try {
            await axios.put(backendUrl + '/api/admin/expenses/' + id, payload, authHeader)
            toast.success(t('expenseSaved'))
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotSaveExpense'))
            return false
        }
    }

    const deleteExpense = async (id) => {
        if (!(await confirm(t('confirmDeleteExpense')))) return false
        try {
            await axios.delete(backendUrl + '/api/admin/expenses/' + id, authHeader)
            toast.success(t('expenseDeleted'))
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotDeleteExpense'))
            return false
        }
    }

    // ==== Leads (Kanban CRM) ====
    const getLeadsBoard = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/leads/board', authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadLeadsBoard'))
            return null
        }
    }

    const createLeadColumn = async (name) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/admin/leads/columns', { name }, authHeader)
            return data.column
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotCreateColumn'))
            return null
        }
    }

    const updateLeadColumn = async (id, payload) => {
        try {
            await axios.put(backendUrl + '/api/admin/leads/columns/' + id, payload, authHeader)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotUpdateColumn'))
            return false
        }
    }

    const deleteLeadColumn = async (id) => {
        if (!(await confirm(t('confirmDeleteColumn')))) return false
        try {
            await axios.delete(backendUrl + '/api/admin/leads/columns/' + id, authHeader)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotDeleteColumn'))
            return false
        }
    }

    const createLeadSubgroup = async (columnId, name) => {
        try {
            const { data } = await axios.post(backendUrl + `/api/admin/leads/columns/${columnId}/subgroups`, { name }, authHeader)
            return data.subgroup
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotCreateSubgroup'))
            return null
        }
    }

    const updateLeadSubgroup = async (id, payload) => {
        try {
            await axios.put(backendUrl + '/api/admin/leads/subgroups/' + id, payload, authHeader)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotUpdateSubgroup'))
            return false
        }
    }

    const deleteLeadSubgroup = async (id) => {
        if (!(await confirm(t('confirmDeleteSubgroup')))) return false
        try {
            await axios.delete(backendUrl + '/api/admin/leads/subgroups/' + id, authHeader)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotDeleteSubgroup'))
            return false
        }
    }

    const createLead = async (payload) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/admin/leads', payload, authHeader)
            return data.lead
        } catch (error) {
            const code = error.response?.data?.error
            if (code === 'column_locked') toast.error(t('columnLockedError'))
            else toast.error(code || t('couldNotCreateLead'))
            return null
        }
    }

    const updateLead = async (id, payload) => {
        try {
            const { data } = await axios.put(backendUrl + '/api/admin/leads/' + id, payload, authHeader)
            return data.lead
        } catch (error) {
            const code = error.response?.data?.error
            if (code === 'column_locked') toast.error(t('columnLockedError'))
            else toast.error(code || t('couldNotUpdateLead'))
            return null
        }
    }

    const deleteLead = async (id) => {
        if (!(await confirm(t('confirmDeleteLead')))) return false
        try {
            await axios.delete(backendUrl + '/api/admin/leads/' + id, authHeader)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotDeleteLead'))
            return false
        }
    }

    // ==== Lead sources (manageable list, used by the board filter, subgroup auto-intake, and forms) ====
    const [leadSources, setLeadSources] = useState([])

    const getLeadSources = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/leads/sources', authHeader)
            setLeadSources(data.sources)
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadSources'))
        }
    }

    const createLeadSource = async (payload) => {
        try {
            await axios.post(backendUrl + '/api/admin/leads/sources', payload, authHeader)
            getLeadSources()
            return true
        } catch (error) {
            const code = error.response?.data?.error
            if (code === 'source_already_exists') toast.error(t('sourceAlreadyExistsError'))
            else toast.error(code || t('couldNotSaveSource'))
            return false
        }
    }

    const updateLeadSource = async (id, payload) => {
        try {
            await axios.put(backendUrl + '/api/admin/leads/sources/' + id, payload, authHeader)
            getLeadSources()
            return true
        } catch (error) {
            const code = error.response?.data?.error
            if (code === 'source_already_exists') toast.error(t('sourceAlreadyExistsError'))
            else toast.error(code || t('couldNotSaveSource'))
            return false
        }
    }

    const deleteLeadSource = async (id) => {
        if (!(await confirm(t('confirmDeleteSource')))) return false
        try {
            await axios.delete(backendUrl + '/api/admin/leads/sources/' + id, authHeader)
            getLeadSources()
            return true
        } catch (error) {
            const code = error.response?.data?.error
            if (code === 'cannot_delete_other') toast.error(t('cannotDeleteOtherSourceError'))
            else toast.error(code || t('couldNotDeleteSource'))
            return false
        }
    }

    // ==== Lead intake forms ====
    const getLeadForms = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/leads/forms', authHeader)
            return data.forms
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadForms'))
            return []
        }
    }

    const getLeadForm = async (id) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/leads/forms/' + id, authHeader)
            return data.form
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotLoadForm'))
            return null
        }
    }

    const createLeadForm = async (payload) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/admin/leads/forms', payload, authHeader)
            return data.form
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotCreateForm'))
            return null
        }
    }

    const updateLeadForm = async (id, payload) => {
        try {
            const { data } = await axios.put(backendUrl + '/api/admin/leads/forms/' + id, payload, authHeader)
            toast.success(t('formSaved'))
            return data.form
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotSaveForm'))
            return null
        }
    }

    const deleteLeadForm = async (id) => {
        if (!(await confirm(t('confirmDeleteForm')))) return false
        try {
            await axios.delete(backendUrl + '/api/admin/leads/forms/' + id, authHeader)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || t('couldNotDeleteForm'))
            return false
        }
    }

    const value = {
        token, login, logout,
        students, getStudents, createStudent, updateStudent, deleteStudent, unarchiveStudent, getStudentProfile, addStudentCourse, updateStudentCourse, linkParent,
        applyDiscountToStudents,
        payments, getPayments, createPayment, refundPayment, updatePayment, getFinanceOverview, getPaymentPreview, getPaymentDetail,
        getStudentStatement, getReconciliation, deletePayment, getBusinessLedger,
        payRates, getPayRates, setPayRate, deletePayRate, calculateSalary, paySalary, prepaySalary, getSalaryDetail,
        groups, getGroups, createGroup, getGroupProfile, updateGroup, deleteGroup, unarchiveGroup, suggestGroup, addStudentToGroup, removeStudentFromGroup, retakeExam,
        teachers, getTeachers,
        languages, getLanguages,
        levels, getLevels,
        me, getMe,
        settings, getSettings,
        createTeacherAttendanceQR, getTeacherProfile,
        getAttendanceOverview,
        rooms, getRooms, createRoom, updateRoom, deleteRoom,
        getGroupDetails, updateGroupDiscount, getGroupAttendanceGrid,
        getGroupMaterials, addGroupMaterial, deleteGroupMaterial,
        getGroupComments, addGroupComment, deleteGroupComment,
        getExtraLessons, createExtraLesson, deleteExtraLesson,
        getMyNotes, createMyNote, deleteMyNote,
        getGroupExamsTab, getTimetable,
        getLeadsBoard, createLeadColumn, updateLeadColumn, deleteLeadColumn,
        createLeadSubgroup, updateLeadSubgroup, deleteLeadSubgroup,
        createLead, updateLead, deleteLead,
        getTeacherAttendanceGrid, getStudentAttendanceGrid, getLessonDetail, setLessonTeacherStatus,
        expenseCategories, getExpenseCategories, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
        getExpensesOverview, createExpense, updateExpense, deleteExpense, getExpenseDetail,
        leadSources, getLeadSources, createLeadSource, updateLeadSource, deleteLeadSource,
        getLeadForms, getLeadForm, createLeadForm, updateLeadForm, deleteLeadForm,
    }

    useEffect(() => {
        if (token) {
            getStudents(); getGroups(); getPayments(); getTeachers(); getLanguages(); getMe(); getSettings(); getRooms(); getExpenseCategories(); getLeadSources()
        }
    }, [token])

    return (
        <AdminContext.Provider value={value}>
            {props.children}
        </AdminContext.Provider>
    )
}

export default AdminContextProvider
