import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAuth } from './AuthContext'
import { useLanguage } from './LanguageContext'

export interface Manager {
  _id: string
  name: string
  email: string
  role: 'manager'
  phone: string
  activeClients: number
  totalDeliveries: number
  joinedAt: string
}

export interface AdminClient {
  _id: string
  name: string
  phone: string
  address: string
  lat: number
  lng: number
  notes: string
  managerId: string
  managerName: string
  bottlesHeld: number
  balance: number
  createdAt: string
}

export interface Operation {
  _id: string
  managerId: string
  managerName: string
  action: string
  clientId: string
  clientName: string
  bottlesGiven: number
  bottlesReturned: number
  saleAmount: number
  paymentAmount: number
  paymentMethod: 'cash' | 'card' | 'transfer' | 'later'
  createdAt: string
}

export interface FinanceSettings {
  bottlePrice: number
  currency: string
  expenseCategories: string[]
  openingBalance: { cash: number; card: number; transfer: number }
}

export interface Transaction {
  _id: string
  type: 'income' | 'expense' | 'payment' | 'adjustment'
  amount: number
  paymentMethod: 'cash' | 'card' | 'transfer'
  category: string
  notes: string
  clientId: string | null
  clientName: string
  orderId: string | null
  date: string
  createdAt: string
}

export interface TransactionInput {
  type: 'income' | 'expense' | 'adjustment'
  amount: number
  category: string
  notes: string
  paymentMethod: 'cash' | 'card' | 'transfer'
  clientId?: string
  date?: string
}

export interface FinanceSummary {
  collected: number
  expenses: number
  netProfit: number
  receivable: number
  byMethod: { cash: number; card: number; transfer: number }
}

export interface ManagerLocation {
  managerId: string
  managerName: string
  lat: number
  lng: number
  updatedAt: string
}

interface AdminContextType {
  managers: Manager[]
  clients: AdminClient[]
  operations: Operation[]
  financeSettings: FinanceSettings
  transactions: Transaction[]
  financeSummary: FinanceSummary
  stock: number
  managerLocations: ManagerLocation[]
  addManager: (data: { name: string; email: string; password: string; phone: string }) => Promise<boolean>
  editManager: (id: string, data: Partial<Manager>) => Promise<boolean>
  removeManager: (id: string) => Promise<boolean>
  addClient: (data: { name: string; phone: string; address: string; notes: string; lat: number; lng: number; managerId: string }) => Promise<boolean>
  editClient: (id: string, data: { name: string; phone: string; address: string; notes: string }) => Promise<boolean>
  removeClient: (id: string) => Promise<boolean>
  recordOrder: (data: { clientId: string; bottlesGiven: number; bottlesReturned: number; notes: string; paymentAmount: number; paymentMethod: string }) => Promise<boolean>
  updateBottlePrice: (price: number) => Promise<boolean>
  updateExpenseCategories: (categories: string[]) => Promise<boolean>
  updateOpeningBalance: (balance: { cash: number; card: number; transfer: number }) => Promise<boolean>
  addTransaction: (data: TransactionInput) => Promise<boolean>
  updateTransaction: (id: string, data: TransactionInput) => Promise<boolean>
  deleteTransaction: (id: string) => Promise<boolean>
  adjustStock: (amount: number) => Promise<boolean>
}

const AdminContext = createContext<AdminContextType | null>(null)

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const { backendUrl, token } = useAuth()
  const { t, tServer, tError } = useLanguage()
  const [rawManagers, setRawManagers] = useState<any[]>([])
  const [clients, setClients] = useState<AdminClient[]>([])
  const [operations, setOperations] = useState<Operation[]>([])
  const [financeSettings, setFinanceSettings] = useState<FinanceSettings>({ bottlePrice: 0, currency: 'UZS', expenseCategories: [], openingBalance: { cash: 0, card: 0, transfer: 0 } })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary>({ collected: 0, expenses: 0, netProfit: 0, receivable: 0, byMethod: { cash: 0, card: 0, transfer: 0 } })
  const [stock, setStock] = useState(0)
  const [managerLocations, setManagerLocations] = useState<ManagerLocation[]>([])

  const loadManagers = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/lamus/admin/managers`)
      if (data.success) setRawManagers(data.managers)
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
    }
  }

  const loadClients = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/lamus/admin/clients`)
      if (data.success) {
        setClients(data.clients.map((c: any) => ({
          ...c,
          managerId: c.managerId?._id || c.managerId,
          managerName: c.managerId?.name || '',
          balance: c.balance || 0,
        })))
      }
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
    }
  }

  const loadOperations = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/lamus/admin/operations`)
      if (data.success) {
        setOperations(data.orders.map((o: any) => ({
          _id: o._id,
          managerId: o.managerId?._id || o.managerId,
          managerName: o.managerId?.name || '',
          action: 'Delivery',
          clientId: o.clientId?._id || o.clientId,
          clientName: o.clientId?.name || '',
          bottlesGiven: o.bottlesGiven,
          bottlesReturned: o.bottlesReturned,
          saleAmount: o.saleAmount || 0,
          paymentAmount: o.paymentAmount || 0,
          paymentMethod: o.paymentMethod || 'later',
          createdAt: o.createdAt,
        })))
      }
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
    }
  }

  const loadFinanceSettings = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/lamus/finance/settings`)
      if (data.success) setFinanceSettings({
        bottlePrice: data.settings.bottlePrice || 0,
        currency: data.settings.currency || 'UZS',
        expenseCategories: data.settings.expenseCategories || [],
        openingBalance: { cash: data.settings.openingBalance?.cash || 0, card: data.settings.openingBalance?.card || 0, transfer: data.settings.openingBalance?.transfer || 0 },
      })
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
    }
  }

  const loadFinanceReport = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/lamus/finance/report`)
      if (data.success) {
        setTransactions(data.transactions.map((t: any) => ({
          ...t,
          clientId: t.clientId?._id || t.clientId,
          clientName: t.clientId?.name || '',
          date: t.date || t.createdAt,
        })))
        setFinanceSummary(data.summary)
      }
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
    }
  }

  const loadStock = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/lamus/stock`)
      if (data.success) setStock(data.stock.totalBottles)
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
    }
  }

  const loadManagerLocations = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/lamus/admin/manager-locations`)
      if (data.success) {
        setManagerLocations(data.locations.map((l: any) => ({
          managerId: l.managerId?._id || l.managerId,
          managerName: l.managerId?.name || '',
          lat: l.lat,
          lng: l.lng,
          updatedAt: l.updatedAt,
        })))
      }
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
    }
  }

  useEffect(() => {
    if (!token) return
    loadManagers()
    loadClients()
    loadOperations()
    loadFinanceSettings()
    loadFinanceReport()
    loadStock()
    loadManagerLocations()
    const interval = setInterval(loadManagerLocations, 30000)
    return () => clearInterval(interval)
  }, [token])

  const managers: Manager[] = rawManagers.map(m => ({
    _id: m._id,
    name: m.name,
    email: m.email,
    role: 'manager',
    phone: m.phone || '',
    joinedAt: m.createdAt,
    activeClients: clients.filter(c => c.managerId === m._id).length,
    totalDeliveries: operations.filter(o => o.managerId === m._id).length,
  }))

  const addManager = async (data: { name: string; email: string; password: string; phone: string }) => {
    try {
      const { data: res } = await axios.post(`${backendUrl}/api/lamus/admin/manager`, data)
      if (!res.success) {
        toast.error(tServer(res.message))
        return false
      }
      await loadManagers()
      toast.success(t('toast.managerAdded'))
      return true
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
      return false
    }
  }

  const editManager = async (id: string, data: Partial<Manager>) => {
    try {
      const { data: res } = await axios.put(`${backendUrl}/api/lamus/admin/manager/${id}`, data)
      if (!res.success) {
        toast.error(tServer(res.message))
        return false
      }
      await loadManagers()
      toast.success(t('toast.managerUpdated'))
      return true
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
      return false
    }
  }

  const removeManager = async (id: string) => {
    try {
      const { data: res } = await axios.delete(`${backendUrl}/api/lamus/admin/manager/${id}`)
      if (!res.success) {
        toast.error(tServer(res.message))
        return false
      }
      setRawManagers(prev => prev.filter(m => m._id !== id))
      toast.success(t('toast.managerRemoved'))
      return true
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
      return false
    }
  }

  const applySettingsResponse = (settings: any) => ({
    bottlePrice: settings.bottlePrice,
    currency: settings.currency,
    expenseCategories: settings.expenseCategories || [],
    openingBalance: { cash: settings.openingBalance?.cash || 0, card: settings.openingBalance?.card || 0, transfer: settings.openingBalance?.transfer || 0 },
  })

  const addClient = async (data: { name: string; phone: string; address: string; notes: string; lat: number; lng: number; managerId: string }) => {
    try {
      const { data: res } = await axios.post(`${backendUrl}/api/lamus/client`, data)
      if (!res.success) {
        toast.error(tServer(res.message))
        return false
      }
      await loadClients()
      toast.success(t('toast.clientAdded'))
      return true
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
      return false
    }
  }

  const recordOrder = async (data: { clientId: string; bottlesGiven: number; bottlesReturned: number; notes: string; paymentAmount: number; paymentMethod: string }) => {
    try {
      const { data: res } = await axios.post(`${backendUrl}/api/lamus/order`, data)
      if (!res.success) {
        toast.error(tServer(res.message))
        return false
      }
      await Promise.all([loadClients(), loadOperations(), loadStock(), loadFinanceReport()])
      toast.success(t('toast.deliveryRecorded'))
      return true
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
      return false
    }
  }

  const editClient = async (id: string, data: { name: string; phone: string; address: string; notes: string }) => {
    try {
      const { data: res } = await axios.put(`${backendUrl}/api/lamus/client/${id}`, data)
      if (!res.success) {
        toast.error(tServer(res.message))
        return false
      }
      await loadClients()
      toast.success(t('toast.clientUpdated'))
      return true
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
      return false
    }
  }

  const removeClient = async (id: string) => {
    try {
      const { data: res } = await axios.delete(`${backendUrl}/api/lamus/client/${id}`)
      if (!res.success) {
        toast.error(tServer(res.message))
        return false
      }
      setClients(prev => prev.filter(c => c._id !== id))
      toast.success(t('toast.clientRemoved'))
      return true
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
      return false
    }
  }

  const updateBottlePrice = async (price: number) => {
    try {
      const { data: res } = await axios.put(`${backendUrl}/api/lamus/finance/settings`, { bottlePrice: price, currency: financeSettings.currency, expenseCategories: financeSettings.expenseCategories })
      if (!res.success) {
        toast.error(tServer(res.message))
        return false
      }
      setFinanceSettings(applySettingsResponse(res.settings))
      toast.success(t('toast.priceUpdated'))
      return true
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
      return false
    }
  }

  const updateExpenseCategories = async (categories: string[]) => {
    try {
      const { data: res } = await axios.put(`${backendUrl}/api/lamus/finance/settings`, { bottlePrice: financeSettings.bottlePrice, currency: financeSettings.currency, expenseCategories: categories })
      if (!res.success) {
        toast.error(tServer(res.message))
        return false
      }
      setFinanceSettings(applySettingsResponse(res.settings))
      return true
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
      return false
    }
  }

  const updateOpeningBalance = async (balance: { cash: number; card: number; transfer: number }) => {
    try {
      const { data: res } = await axios.put(`${backendUrl}/api/lamus/finance/settings`, {
        bottlePrice: financeSettings.bottlePrice, currency: financeSettings.currency, expenseCategories: financeSettings.expenseCategories,
        openingBalance: balance,
      })
      if (!res.success) {
        toast.error(tServer(res.message))
        return false
      }
      setFinanceSettings(applySettingsResponse(res.settings))
      toast.success(t('toast.openingBalanceUpdated'))
      return true
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
      return false
    }
  }

  const addTransaction = async (data: TransactionInput) => {
    try {
      const { data: res } = await axios.post(`${backendUrl}/api/lamus/finance/transactions`, data)
      if (!res.success) {
        toast.error(tServer(res.message))
        return false
      }
      await Promise.all([loadFinanceReport(), loadClients()])
      toast.success(t('toast.transactionAdded'))
      return true
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
      return false
    }
  }

  const updateTransaction = async (id: string, data: TransactionInput) => {
    try {
      const { data: res } = await axios.put(`${backendUrl}/api/lamus/finance/transactions/${id}`, data)
      if (!res.success) {
        toast.error(tServer(res.message))
        return false
      }
      await Promise.all([loadFinanceReport(), loadClients()])
      toast.success(t('toast.transactionUpdated'))
      return true
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
      return false
    }
  }

  const deleteTransaction = async (id: string) => {
    try {
      const { data: res } = await axios.delete(`${backendUrl}/api/lamus/finance/transactions/${id}`)
      if (!res.success) {
        toast.error(tServer(res.message))
        return false
      }
      await Promise.all([loadFinanceReport(), loadClients()])
      toast.success(t('toast.transactionDeleted'))
      return true
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
      return false
    }
  }

  const adjustStock = async (amount: number) => {
    try {
      const { data: res } = await axios.post(`${backendUrl}/api/lamus/stock/add`, { amount })
      if (!res.success) {
        toast.error(tServer(res.message))
        return false
      }
      setStock(res.stock.totalBottles)
      toast.success(t('toast.stockUpdated'))
      return true
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
      return false
    }
  }

  return (
    <AdminContext.Provider value={{
      managers, clients, operations, financeSettings, transactions, financeSummary, stock, managerLocations,
      addManager, editManager, removeManager, addClient, editClient, removeClient, recordOrder,
      updateBottlePrice, updateExpenseCategories, updateOpeningBalance, addTransaction, updateTransaction, deleteTransaction, adjustStock,
    }}>
      {children}
    </AdminContext.Provider>
  )
}

export const useAdmin = () => {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used inside AdminProvider')
  return ctx
}
