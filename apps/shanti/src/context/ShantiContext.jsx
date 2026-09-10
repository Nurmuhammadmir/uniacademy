import { createContext, useEffect, useState } from "react"
import axios from 'axios'
import { toast } from 'sonner'
import { confirm } from '../lib/confirm.js'
import { t } from '../i18n/LanguageContext.jsx'

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
    const [expenseCategories, setExpenseCategories] = useState([])
    const [balance, setBalance] = useState(null)

    const authHeader = { headers: { Authorization: `Bearer ${token}` } }

    useEffect(() => {
        const interceptorId = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                const isLoginRequest = error.config?.url?.includes('/api/shanti-auth/login')
                if (error.response?.status === 401 && !isLoginRequest && localStorage.getItem('shanti_token')) {
                    localStorage.removeItem('shanti_token')
                    setToken(false)
                    toast.error(t('sessionExpired'))
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
            toast.error(error.response?.data?.error || t('loginFailed'))
            return false
        }
    }

    const logout = async () => {
        if (!(await confirm(t('confirmLogout')))) return
        localStorage.removeItem('shanti_token')
        setToken(false)
        setUnits([]); setMaterialCategories([]); setMaterials([]); setClientCategories([]); setClients([]); setProducts([]); setBalance(null)
    }

    // ==== Balance ====
    const getBalance = async () => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/balance', authHeader); setBalance(data.balance) }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotLoadBalance')) }
    }

    // ==== Units ====
    const getUnits = async () => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/units', authHeader); setUnits(data.units) }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotLoadUnits')) }
    }
    const createUnit = async (payload) => {
        try { await axios.post(backendUrl + '/api/shanti/units', payload, authHeader); toast.success(t('unitAdded')); getUnits(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotAdd')); return false }
    }
    const updateUnit = async (id, payload) => {
        try { await axios.put(backendUrl + '/api/shanti/units/' + id, payload, authHeader); getUnits(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotEdit')); return false }
    }
    const deleteUnit = async (id) => {
        try { await axios.delete(backendUrl + '/api/shanti/units/' + id, authHeader); getUnits(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotDelete')); return false }
    }

    // ==== Material categories ====
    const getMaterialCategories = async () => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/material-categories', authHeader); setMaterialCategories(data.categories) }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotLoadCategories')) }
    }
    const createMaterialCategory = async (payload) => {
        try { await axios.post(backendUrl + '/api/shanti/material-categories', payload, authHeader); toast.success(t('categoryAdded')); getMaterialCategories(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotAdd')); return false }
    }
    const updateMaterialCategory = async (id, payload) => {
        try { await axios.put(backendUrl + '/api/shanti/material-categories/' + id, payload, authHeader); getMaterialCategories(); getMaterials(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotEdit')); return false }
    }
    const deleteMaterialCategory = async (id) => {
        try { await axios.delete(backendUrl + '/api/shanti/material-categories/' + id, authHeader); getMaterialCategories(); getMaterials(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotDelete')); return false }
    }

    // ==== Materials ====
    const getMaterials = async () => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/materials', authHeader); setMaterials(data.materials) }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotLoadMaterials')) }
    }
    const createMaterial = async (payload) => {
        try { await axios.post(backendUrl + '/api/shanti/materials', payload, authHeader); toast.success(t('materialAdded')); getMaterials(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotAdd')); return false }
    }
    const updateMaterial = async (id, payload) => {
        try { await axios.put(backendUrl + '/api/shanti/materials/' + id, payload, authHeader); getMaterials(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotEdit')); return false }
    }
    const deleteMaterial = async (id) => {
        try { await axios.delete(backendUrl + '/api/shanti/materials/' + id, authHeader); getMaterials(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotDelete')); return false }
    }
    const restockMaterial = async (id, payload) => {
        try { await axios.post(backendUrl + '/api/shanti/materials/' + id + '/restock', payload, authHeader); toast.success(t('materialRestocked')); getMaterials(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotRestockMaterial')); return false }
    }

    // ==== Sellers ====
    const getSellers = async () => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/sellers', authHeader); setSellers(data.sellers) }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotLoadSellers')) }
    }
    const createSeller = async (payload) => {
        try { await axios.post(backendUrl + '/api/shanti/sellers', payload, authHeader); toast.success(t('sellerAdded')); getSellers(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotAdd')); return false }
    }
    const updateSeller = async (id, payload) => {
        try { await axios.put(backendUrl + '/api/shanti/sellers/' + id, payload, authHeader); getSellers(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotEdit')); return false }
    }
    const deleteSeller = async (id) => {
        try { await axios.delete(backendUrl + '/api/shanti/sellers/' + id, authHeader); getSellers(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotDelete')); return false }
    }

    // ==== Expense categories ====
    const getExpenseCategories = async () => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/expense-categories', authHeader); setExpenseCategories(data.categories) }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotLoadCategories')) }
    }
    const createExpenseCategory = async (payload) => {
        try { await axios.post(backendUrl + '/api/shanti/expense-categories', payload, authHeader); toast.success(t('categoryAdded')); getExpenseCategories(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotAdd')); return false }
    }
    const updateExpenseCategory = async (id, payload) => {
        try { await axios.put(backendUrl + '/api/shanti/expense-categories/' + id, payload, authHeader); getExpenseCategories(); getExpensesOverview(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotEdit')); return false }
    }
    const deleteExpenseCategory = async (id) => {
        try { await axios.delete(backendUrl + '/api/shanti/expense-categories/' + id, authHeader); getExpenseCategories(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotDelete')); return false }
    }

    // ==== Expenses (general costs; a supplier-debt payment is just an expense with sellerId set) ====
    const getExpensesOverview = async (filters) => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/expenses', { ...authHeader, params: filters }); return data }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotLoadExpenses')); return false }
    }
    const getExpensesChart = async (period) => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/expenses/chart', { ...authHeader, params: { period } }); return data }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotLoadExpenses')); return false }
    }
    const createExpense = async (payload) => {
        try {
            await axios.post(backendUrl + '/api/shanti/expenses', payload, authHeader)
            toast.success(t('expenseAdded')); getBalance(); return true
        } catch (error) {
            const code = error.response?.data?.error
            toast.error(code === 'amount_exceeds_debt' ? t('amountExceedsDebtError') : (code || t('couldNotAddExpense')))
            return false
        }
    }
    const updateExpense = async (id, payload) => {
        try { await axios.put(backendUrl + '/api/shanti/expenses/' + id, payload, authHeader); getBalance(); return true }
        catch (error) {
            const code = error.response?.data?.error
            toast.error(code === 'amount_exceeds_debt' ? t('amountExceedsDebtError') : (code || t('couldNotEdit')))
            return false
        }
    }
    const deleteExpense = async (id) => {
        try { await axios.delete(backendUrl + '/api/shanti/expenses/' + id, authHeader); getBalance(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotDelete')); return false }
    }

    // ==== Purchases ====
    const getPurchasesOverview = async (filters) => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/purchases', { ...authHeader, params: filters }); return data }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotLoadPurchases')); return false }
    }
    const getPurchaseDebts = async (filters) => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/purchases/debts', { ...authHeader, params: filters }); return data }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotLoadDebts')); return false }
    }
    const createPurchase = async (payload) => {
        try { await axios.post(backendUrl + '/api/shanti/purchases', payload, authHeader); toast.success(t('purchaseAdded')); getMaterials(); getBalance(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotAddPurchase')); return false }
    }
    const updatePurchase = async (id, payload) => {
        try { await axios.put(backendUrl + '/api/shanti/purchases/' + id, payload, authHeader); getMaterials(); getBalance(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotEdit')); return false }
    }
    const deletePurchase = async (id) => {
        try { await axios.delete(backendUrl + '/api/shanti/purchases/' + id, authHeader); getMaterials(); getBalance(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotDelete')); return false }
    }

    // ==== Client categories ====
    const getClientCategories = async () => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/client-categories', authHeader); setClientCategories(data.categories) }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotLoadCategories')) }
    }
    const createClientCategory = async (payload) => {
        try { await axios.post(backendUrl + '/api/shanti/client-categories', payload, authHeader); toast.success(t('categoryAdded')); getClientCategories(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotAdd')); return false }
    }
    const updateClientCategory = async (id, payload) => {
        try { await axios.put(backendUrl + '/api/shanti/client-categories/' + id, payload, authHeader); getClientCategories(); getClients(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotEdit')); return false }
    }
    const deleteClientCategory = async (id) => {
        try { await axios.delete(backendUrl + '/api/shanti/client-categories/' + id, authHeader); getClientCategories(); getClients(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotDelete')); return false }
    }

    // ==== Clients ====
    const getClients = async () => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/clients', authHeader); setClients(data.clients) }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotLoadClients')) }
    }
    const createClient = async (payload) => {
        try { await axios.post(backendUrl + '/api/shanti/clients', payload, authHeader); toast.success(t('clientAdded')); getClients(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotAdd')); return false }
    }
    const updateClient = async (id, payload) => {
        try { await axios.put(backendUrl + '/api/shanti/clients/' + id, payload, authHeader); getClients(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotEdit')); return false }
    }
    const deleteClient = async (id) => {
        try { await axios.delete(backendUrl + '/api/shanti/clients/' + id, authHeader); getClients(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotDelete')); return false }
    }

    // ==== Products ====
    const getProducts = async () => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/products', authHeader); setProducts(data.products) }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotLoadProducts')) }
    }
    const createProduct = async (payload) => {
        try { await axios.post(backendUrl + '/api/shanti/products', payload, authHeader); toast.success(t('productAdded')); getProducts(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotAdd')); return false }
    }
    const updateProduct = async (id, payload) => {
        try { await axios.put(backendUrl + '/api/shanti/products/' + id, payload, authHeader); getProducts(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotEdit')); return false }
    }
    const deleteProduct = async (id) => {
        try { await axios.delete(backendUrl + '/api/shanti/products/' + id, authHeader); getProducts(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotDelete')); return false }
    }
    const restockProduct = async (id, payload) => {
        try { await axios.post(backendUrl + '/api/shanti/products/' + id + '/restock', payload, authHeader); toast.success(t('productRestocked')); getProducts(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotRestockProduct')); return false }
    }

    // ==== Sales ====
    const getSalesOverview = async (filters) => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/sales', { ...authHeader, params: filters }); return data }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotLoadSales')); return false }
    }
    const getSalesDebtors = async () => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/sales/debtors', authHeader); return data }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotLoadDebtors')); return false }
    }
    const createSale = async (payload) => {
        try { await axios.post(backendUrl + '/api/shanti/sales', payload, authHeader); toast.success(t('saleAdded')); getProducts(); getBalance(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotAddSale')); return false }
    }
    const updateSale = async (id, payload) => {
        try { await axios.put(backendUrl + '/api/shanti/sales/' + id, payload, authHeader); getProducts(); getBalance(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotEdit')); return false }
    }
    const deleteSale = async (id) => {
        try { await axios.delete(backendUrl + '/api/shanti/sales/' + id, authHeader); getProducts(); getBalance(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotDelete')); return false }
    }

    // ==== Dashboard ====
    const getDashboardSummary = async () => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/dashboard/summary', authHeader); return data }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotLoadDashboard')); return false }
    }
    const getDashboardSeries = async (period) => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/dashboard/series', { ...authHeader, params: { period } }); return data }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotLoadDashboard')); return false }
    }

    // ==== Finance (debt-collection payments) ====
    const getPaymentsOverview = async (filters) => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/finance/payments', { ...authHeader, params: filters }); return data }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotLoadPayments')); return false }
    }
    const getPaymentsChart = async (period) => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/finance/chart', { ...authHeader, params: { period } }); return data }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotLoadPayments')); return false }
    }
    const createPayment = async (payload) => {
        try {
            await axios.post(backendUrl + '/api/shanti/finance/payments', payload, authHeader)
            toast.success(t('paymentAdded')); getBalance(); return true
        } catch (error) {
            const code = error.response?.data?.error
            toast.error(code === 'amount_exceeds_debt' ? t('amountExceedsDebtError') : (code || t('couldNotAddPayment')))
            return false
        }
    }
    const updatePayment = async (id, payload) => {
        try { await axios.put(backendUrl + '/api/shanti/finance/payments/' + id, payload, authHeader); getBalance(); return true }
        catch (error) {
            const code = error.response?.data?.error
            toast.error(code === 'amount_exceeds_debt' ? t('amountExceedsDebtError') : (code || t('couldNotEdit')))
            return false
        }
    }
    const deletePayment = async (id) => {
        try { await axios.delete(backendUrl + '/api/shanti/finance/payments/' + id, authHeader); getBalance(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotDelete')); return false }
    }

    // ==== Settings: manual balance top-ups + material restock ====
    const getBalanceAdjustments = async (filters) => {
        try { const { data } = await axios.get(backendUrl + '/api/shanti/settings/balance-adjustments', { ...authHeader, params: filters }); return data }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotLoadPayments')); return false }
    }
    const createBalanceAdjustment = async (payload) => {
        try { await axios.post(backendUrl + '/api/shanti/settings/balance-adjustments', payload, authHeader); toast.success(t('balanceAdjustmentAdded')); getBalance(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotAddBalanceAdjustment')); return false }
    }
    const updateBalanceAdjustment = async (id, payload) => {
        try { await axios.put(backendUrl + '/api/shanti/settings/balance-adjustments/' + id, payload, authHeader); getBalance(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotEdit')); return false }
    }
    const deleteBalanceAdjustment = async (id) => {
        try { await axios.delete(backendUrl + '/api/shanti/settings/balance-adjustments/' + id, authHeader); getBalance(); return true }
        catch (error) { toast.error(error.response?.data?.error || t('couldNotDelete')); return false }
    }

    useEffect(() => {
        if (token) {
            Promise.all([getUnits(), getMaterialCategories(), getMaterials(), getSellers(), getClientCategories(), getClients(), getProducts(), getExpenseCategories(), getBalance()])
                .finally(() => setInitialLoading(false))
        } else {
            setInitialLoading(false)
        }
    }, [token])

    const value = {
        token, login, logout, initialLoading,
        balance, getBalance,
        units, getUnits, createUnit, updateUnit, deleteUnit,
        materialCategories, getMaterialCategories, createMaterialCategory, updateMaterialCategory, deleteMaterialCategory,
        materials, getMaterials, createMaterial, updateMaterial, deleteMaterial, restockMaterial,
        sellers, getSellers, createSeller, updateSeller, deleteSeller,
        expenseCategories, getExpenseCategories, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
        getExpensesOverview, getExpensesChart, createExpense, updateExpense, deleteExpense,
        getPurchasesOverview, getPurchaseDebts, createPurchase, updatePurchase, deletePurchase,
        clientCategories, getClientCategories, createClientCategory, updateClientCategory, deleteClientCategory,
        clients, getClients, createClient, updateClient, deleteClient,
        products, getProducts, createProduct, updateProduct, deleteProduct, restockProduct,
        getSalesOverview, getSalesDebtors, createSale, updateSale, deleteSale,
        getDashboardSummary, getDashboardSeries,
        getPaymentsOverview, getPaymentsChart, createPayment, updatePayment, deletePayment,
        getBalanceAdjustments, createBalanceAdjustment, updateBalanceAdjustment, deleteBalanceAdjustment,
    }

    return <ShantiContext.Provider value={value}>{props.children}</ShantiContext.Provider>
}

export default ShantiContextProvider
