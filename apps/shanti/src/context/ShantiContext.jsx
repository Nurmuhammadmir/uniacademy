import { createContext, useEffect, useState } from "react"
import axios from 'axios'
import { toast } from 'sonner'
import { confirm } from '../lib/confirm.js'

export const ShantiContext = createContext()

const ShantiContextProvider = (props) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    const [token, setToken] = useState(localStorage.getItem('shanti_token') ? localStorage.getItem('shanti_token') : false)
    const [initialLoading, setInitialLoading] = useState(true)
    const [units, setUnits] = useState([])
    const [materialCategories, setMaterialCategories] = useState([])
    const [materials, setMaterials] = useState([])
    const [clientCategories, setClientCategories] = useState([])
    const [clients, setClients] = useState([])
    const [products, setProducts] = useState([])
    const [sellers, setSellers] = useState([])

    const authHeader = { headers: { Authorization: `Bearer ${token}` } }

    useEffect(() => {
        const interceptorId = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                const isLoginRequest = error.config?.url?.includes('/api/shanti-auth/login')
                if (error.response?.status === 401 && !isLoginRequest && localStorage.getItem('shanti_token')) {
                    localStorage.removeItem('shanti_token')
                    setToken(false)
                    toast.error('Сессия истекла, войдите снова')
                }
                return Promise.reject(error)
            }
        )
        return () => axios.interceptors.response.eject(interceptorId)
    }, [])

    const login = async (phone, password) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/shanti-auth/login', { phone, password })
            localStorage.setItem('shanti_token', data.token)
            setToken(data.token)
            return true
        } catch (error) {
            toast.error(error.response?.data?.error || 'Не удалось войти')
            return false
        }
    }

    const logout = async () => {
        if (!(await confirm('Выйти из аккаунта?'))) return
        localStorage.removeItem('shanti_token')
        setToken(false)
        setUnits([]); setMaterialCategories([]); setMaterials([]); setClientCategories([]); setClients([]); setProducts([])
    }

    // ==== Units ====
    const getUnits = async () => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/units', authHeader); setUnits(data.units) }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось загрузить единицы измерения') }
    }
    const createUnit = async (payload) => {
        try { await axios.post(backendUrl + '/api/shanti/units', payload, authHeader); toast.success('Единица измерения добавлена'); getUnits(); return true }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось добавить'); return false }
    }
    const updateUnit = async (id, payload) => {
        try { await axios.put(backendUrl + '/api/shanti/units/' + id, payload, authHeader); getUnits(); return true }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось изменить'); return false }
    }
    const deleteUnit = async (id) => {
        try { await axios.delete(backendUrl + '/api/shanti/units/' + id, authHeader); getUnits(); return true }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось удалить'); return false }
    }

    // ==== Material categories ====
    const getMaterialCategories = async () => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/material-categories', authHeader); setMaterialCategories(data.categories) }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось загрузить категории') }
    }
    const createMaterialCategory = async (payload) => {
        try { await axios.post(backendUrl + '/api/shanti/material-categories', payload, authHeader); toast.success('Категория добавлена'); getMaterialCategories(); return true }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось добавить'); return false }
    }
    const updateMaterialCategory = async (id, payload) => {
        try { await axios.put(backendUrl + '/api/shanti/material-categories/' + id, payload, authHeader); getMaterialCategories(); getMaterials(); return true }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось изменить'); return false }
    }
    const deleteMaterialCategory = async (id) => {
        try { await axios.delete(backendUrl + '/api/shanti/material-categories/' + id, authHeader); getMaterialCategories(); getMaterials(); return true }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось удалить'); return false }
    }

    // ==== Materials ====
    const getMaterials = async () => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/materials', authHeader); setMaterials(data.materials) }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось загрузить материалы') }
    }
    const createMaterial = async (payload) => {
        try { await axios.post(backendUrl + '/api/shanti/materials', payload, authHeader); toast.success('Материал добавлен'); getMaterials(); return true }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось добавить'); return false }
    }
    const updateMaterial = async (id, payload) => {
        try { await axios.put(backendUrl + '/api/shanti/materials/' + id, payload, authHeader); getMaterials(); return true }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось изменить'); return false }
    }
    const deleteMaterial = async (id) => {
        try { await axios.delete(backendUrl + '/api/shanti/materials/' + id, authHeader); getMaterials(); return true }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось удалить'); return false }
    }

    // ==== Purchases ====
    const getPurchasesOverview = async (filters) => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/purchases', { ...authHeader, params: filters }); return data }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось загрузить покупки'); return false }
    }
    const getPurchaseDebts = async (filters) => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/purchases/debts', { ...authHeader, params: filters }); return data }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось загрузить долги'); return false }
    }
    const getSellers = async () => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/purchases/sellers', authHeader); setSellers(data.sellers) }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось загрузить продавцов') }
    }
    const createPurchase = async (payload) => {
        try { await axios.post(backendUrl + '/api/shanti/purchases', payload, authHeader); toast.success('Покупка добавлена'); getMaterials(); getSellers(); return true }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось добавить покупку'); return false }
    }
    const updatePurchase = async (id, payload) => {
        try { await axios.put(backendUrl + '/api/shanti/purchases/' + id, payload, authHeader); getMaterials(); getSellers(); return true }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось изменить'); return false }
    }
    const deletePurchase = async (id) => {
        try { await axios.delete(backendUrl + '/api/shanti/purchases/' + id, authHeader); getMaterials(); return true }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось удалить'); return false }
    }

    // ==== Client categories ====
    const getClientCategories = async () => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/client-categories', authHeader); setClientCategories(data.categories) }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось загрузить категории') }
    }
    const createClientCategory = async (payload) => {
        try { await axios.post(backendUrl + '/api/shanti/client-categories', payload, authHeader); toast.success('Категория добавлена'); getClientCategories(); return true }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось добавить'); return false }
    }
    const updateClientCategory = async (id, payload) => {
        try { await axios.put(backendUrl + '/api/shanti/client-categories/' + id, payload, authHeader); getClientCategories(); getClients(); return true }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось изменить'); return false }
    }
    const deleteClientCategory = async (id) => {
        try { await axios.delete(backendUrl + '/api/shanti/client-categories/' + id, authHeader); getClientCategories(); getClients(); return true }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось удалить'); return false }
    }

    // ==== Clients ====
    const getClients = async () => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/clients', authHeader); setClients(data.clients) }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось загрузить клиентов') }
    }
    const createClient = async (payload) => {
        try { await axios.post(backendUrl + '/api/shanti/clients', payload, authHeader); toast.success('Клиент добавлен'); getClients(); return true }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось добавить'); return false }
    }
    const updateClient = async (id, payload) => {
        try { await axios.put(backendUrl + '/api/shanti/clients/' + id, payload, authHeader); getClients(); return true }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось изменить'); return false }
    }
    const deleteClient = async (id) => {
        try { await axios.delete(backendUrl + '/api/shanti/clients/' + id, authHeader); getClients(); return true }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось удалить'); return false }
    }

    // ==== Products ====
    const getProducts = async () => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/products', authHeader); setProducts(data.products) }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось загрузить товары') }
    }
    const createProduct = async (payload) => {
        try { await axios.post(backendUrl + '/api/shanti/products', payload, authHeader); toast.success('Товар добавлен'); getProducts(); return true }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось добавить'); return false }
    }
    const updateProduct = async (id, payload) => {
        try { await axios.put(backendUrl + '/api/shanti/products/' + id, payload, authHeader); getProducts(); return true }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось изменить'); return false }
    }
    const deleteProduct = async (id) => {
        try { await axios.delete(backendUrl + '/api/shanti/products/' + id, authHeader); getProducts(); return true }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось удалить'); return false }
    }

    // ==== Sales ====
    const getSalesOverview = async (filters) => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/sales', { ...authHeader, params: filters }); return data }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось загрузить продажи'); return false }
    }
    const getSalesDebtors = async () => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/sales/debtors', authHeader); return data }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось загрузить должников'); return false }
    }
    const createSale = async (payload) => {
        try { await axios.post(backendUrl + '/api/shanti/sales', payload, authHeader); toast.success('Продажа добавлена'); getProducts(); return true }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось добавить продажу'); return false }
    }
    const updateSale = async (id, payload) => {
        try { await axios.put(backendUrl + '/api/shanti/sales/' + id, payload, authHeader); getProducts(); return true }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось изменить'); return false }
    }
    const deleteSale = async (id) => {
        try { await axios.delete(backendUrl + '/api/shanti/sales/' + id, authHeader); getProducts(); return true }
        catch (error) { toast.error(error.response?.data?.error || 'Не удалось удалить'); return false }
    }

    useEffect(() => {
        if (token) {
            Promise.all([getUnits(), getMaterialCategories(), getMaterials(), getSellers(), getClientCategories(), getClients(), getProducts()])
                .finally(() => setInitialLoading(false))
        } else {
            setInitialLoading(false)
        }
    }, [token])

    const value = {
        token, login, logout, initialLoading,
        units, getUnits, createUnit, updateUnit, deleteUnit,
        materialCategories, getMaterialCategories, createMaterialCategory, updateMaterialCategory, deleteMaterialCategory,
        materials, getMaterials, createMaterial, updateMaterial, deleteMaterial,
        sellers, getSellers,
        getPurchasesOverview, getPurchaseDebts, createPurchase, updatePurchase, deletePurchase,
        clientCategories, getClientCategories, createClientCategory, updateClientCategory, deleteClientCategory,
        clients, getClients, createClient, updateClient, deleteClient,
        products, getProducts, createProduct, updateProduct, deleteProduct,
        getSalesOverview, getSalesDebtors, createSale, updateSale, deleteSale,
    }

    return <ShantiContext.Provider value={value}>{props.children}</ShantiContext.Provider>
}

export default ShantiContextProvider
