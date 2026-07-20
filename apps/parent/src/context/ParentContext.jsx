import { createContext, useEffect, useState } from "react"
import axios from 'axios'
import { toast } from 'react-toastify'
import { confirm } from '../lib/confirm.js'
import { pushSupported, subscribeToPush, getExistingPushSubscription } from '../lib/push.js'

export const ParentContext = createContext()

const ParentContextProvider = (props) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    const [token, setToken] = useState(localStorage.getItem('token') ? localStorage.getItem('token') : false)
    const [me, setMe] = useState(false)
    const [children, setChildren] = useState([])
    // one parent login can have more than one linked child (siblings) - persisted so switching
    // apps/reloading doesn't silently bounce back to a different child
    const [selectedChildId, setSelectedChildIdState] = useState(localStorage.getItem('selectedChildId') || '')

    const setSelectedChildId = (id) => {
        localStorage.setItem('selectedChildId', id)
        setSelectedChildIdState(id)
    }

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
                    setMe(false); setChildren([])
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
            if (data.user.role !== 'parent') {
                toast.error('this account is not a parent account')
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
        setMe(false); setChildren([])
    }

    const getMe = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/parent/me', authHeader)
            setMe(data.parent)
            setChildren(data.children)
            const stillValid = data.children.some(c => c._id === selectedChildId)
            if (!stillValid && data.children.length > 0) setSelectedChildId(data.children[0]._id)
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load profile')
        }
    }

    const getChildAttendance = async (childId) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/parent/children/${childId}/attendance`, authHeader)
            return data.groups
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load attendance')
            return null
        }
    }

    const getChildProgress = async (childId) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/parent/children/${childId}/progress`, authHeader)
            return data.groups
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load progress')
            return null
        }
    }

    const getChildPayments = async (childId) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/parent/children/${childId}/payments`, authHeader)
            return data
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load payments')
            return null
        }
    }

    const getChildExtraLessons = async (childId) => {
        try {
            const { data } = await axios.get(backendUrl + `/api/parent/children/${childId}/extra-lessons`, authHeader)
            return data.extraLessons
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not load extra lessons')
            return null
        }
    }

    // registers this device's Web Push subscription against the parent's own account - the
    // browser-side subscribe/unsubscribe mechanics live in lib/push.js, this just tells the backend
    // about whatever subscription (or removal) already happened locally
    const registerPushSubscription = async (subscription) => {
        try {
            await axios.post(backendUrl + '/api/parent/push/subscribe', subscription, authHeader)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || 'could not enable notifications')
            return false
        }
    }

    const unregisterPushSubscription = async (endpoint) => {
        try {
            await axios.post(backendUrl + '/api/parent/push/unsubscribe', { endpoint }, authHeader)
            return true
        } catch (error) {
            return false
        }
    }

    // notifications default to ON - the moment a parent logs in, silently try to subscribe this
    // device to push (no button to find/tap first). Still just a browser permission prompt under
    // the hood - if they dismiss/deny it, nothing breaks, they just don't get pushes on this
    // device (Profile still has the manual toggle for exactly that case, or a different browser).
    const autoEnablePush = async () => {
        if (!pushSupported()) return
        const already = await getExistingPushSubscription()
        if (already) { registerPushSubscription(already); return }
        const subscription = await subscribeToPush()
        if (subscription) registerPushSubscription(subscription)
    }

    const value = {
        token, login, logout,
        me, children, getMe, selectedChildId, setSelectedChildId,
        getChildAttendance, getChildProgress, getChildPayments, getChildExtraLessons,
        registerPushSubscription, unregisterPushSubscription,
    }

    useEffect(() => {
        if (token) { getMe(); autoEnablePush() }
    }, [token])

    return (
        <ParentContext.Provider value={value}>
            {props.children}
        </ParentContext.Provider>
    )
}

export default ParentContextProvider
