import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAuth } from './AuthContext'
import { useLanguage } from './LanguageContext'

export interface Client {
  _id: string
  name: string
  phone: string
  address: string
  lat: number
  lng: number
  notes: string
  managerId: string
  bottlesHeld: number
  balance: number
  createdAt: string
}

export interface Order {
  _id: string
  clientId: string
  clientName: string
  managerId: string
  managerName: string
  bottlesGiven: number
  bottlesReturned: number
  netBottles: number
  unitPrice: number
  saleAmount: number
  paymentAmount: number
  paymentMethod: 'cash' | 'card' | 'transfer' | 'later'
  notes: string
  createdAt: string
}

// a manager's own scoped slice of finance - see server/controllers/lamusFinanceController.js's
// reportMine for exactly what's included (their own clients' receivable + orders' payments +
// finance entries they personally logged). Deliberately narrower than admin's FinanceSummary: no
// openingBalance/other-managers'-cash, since that's a company-wide concept a manager never sees.
export interface ManagerTransaction {
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
  createdBy: string
  createdAt: string
}

export interface ManagerTransactionInput {
  type: 'income' | 'expense' | 'adjustment'
  amount: number
  category: string
  notes: string
  paymentMethod: 'cash' | 'card' | 'transfer'
  clientId?: string
  date?: string
}

export interface ManagerFinanceSummary {
  collected: number
  expenses: number
  netProfit: number
  receivable: number
  byMethod: { cash: number; card: number; transfer: number }
}

interface ManagerContextType {
  clients: Client[]
  orders: Order[]
  totalStock: number
  bottlesOut: number
  bottlePrice: number
  currency: string
  expenseCategories: string[]
  transactions: ManagerTransaction[]
  financeSummary: ManagerFinanceSummary
  addClient: (data: Omit<Client, '_id' | 'managerId' | 'bottlesHeld' | 'balance' | 'createdAt'>) => Promise<boolean>
  updateClient: (id: string, data: Partial<Client>) => Promise<boolean>
  deleteClient: (id: string) => Promise<boolean>
  recordOrder: (data: { clientId: string; bottlesGiven: number; bottlesReturned: number; notes: string; paymentAmount: number; paymentMethod: 'cash' | 'card' | 'transfer' | 'later' }) => Promise<boolean>
  getClientHistory: (clientId: string) => Promise<Order[]>
  addTransaction: (data: ManagerTransactionInput) => Promise<boolean>
  updateTransaction: (id: string, data: ManagerTransactionInput) => Promise<boolean>
  todayOrders: Order[]
}

const ManagerContext = createContext<ManagerContextType | null>(null)

export const ManagerProvider = ({ children }: { children: ReactNode }) => {
  const { user, backendUrl, token } = useAuth()
  const { t, tServer, tError } = useLanguage()
  const [clients, setClients] = useState<Client[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [totalStock, setTotalStock] = useState(0)
  const [bottlePrice, setBottlePrice] = useState(0)
  const [currency, setCurrency] = useState('UZS')
  const [expenseCategories, setExpenseCategories] = useState<string[]>([])
  const [transactions, setTransactions] = useState<ManagerTransaction[]>([])
  const [financeSummary, setFinanceSummary] = useState<ManagerFinanceSummary>({ collected: 0, expenses: 0, netProfit: 0, receivable: 0, byMethod: { cash: 0, card: 0, transfer: 0 } })
  const bottlesOut = clients.reduce((sum, c) => sum + c.bottlesHeld, 0)

  const today = new Date().toISOString().split('T')[0]
  const todayOrders = orders.filter(o => o.createdAt.startsWith(today))

  const loadClients = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/lamus/client/my`)
      if (data.success) setClients(data.clients)
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
    }
  }

  const loadOrders = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/lamus/order/my`)
      if (data.success) {
        setOrders(data.orders.map((o: any) => ({
          _id: o._id,
          clientId: o.clientId?._id || o.clientId,
          clientName: o.clientId?.name || '',
          managerId: o.managerId,
          managerName: user?.name || '',
          bottlesGiven: o.bottlesGiven,
          bottlesReturned: o.bottlesReturned,
          netBottles: o.netBottles,
          unitPrice: o.unitPrice || 0,
          saleAmount: o.saleAmount || 0,
          paymentAmount: o.paymentAmount || 0,
          paymentMethod: o.paymentMethod || 'later',
          notes: o.notes || '',
          createdAt: o.createdAt,
        })))
      }
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
    }
  }

  const loadStock = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/lamus/stock`)
      if (data.success) setTotalStock(data.stock.totalBottles)
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
    }
  }

  const loadFinanceSettings = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/lamus/finance/settings`)
      if (data.success) {
        setBottlePrice(data.settings.bottlePrice || 0)
        setCurrency(data.settings.currency || 'UZS')
        setExpenseCategories(data.settings.expenseCategories || [])
      }
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
    }
  }

  const loadFinanceReport = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/lamus/finance/report/mine`)
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

  const addTransaction = async (data: ManagerTransactionInput) => {
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

  const updateTransaction = async (id: string, data: ManagerTransactionInput) => {
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

  useEffect(() => {
    if (!token) return
    loadClients()
    loadOrders()
    loadStock()
    loadFinanceSettings()
    loadFinanceReport()
  }, [token])

  // Shares this manager's location with admins while the app is open in the
  // foreground — browser geolocation requires an explicit permission prompt
  // and shows a persistent OS indicator, and cannot run once the app/tab is
  // closed (there's no covert background variant of this).
  // Uses watchPosition (not repeated one-shot getCurrentPosition calls) so the
  // device's GPS stays "warm" and keeps refining, the same way a native map
  // app does — a fresh getCurrentPosition call every couple minutes tends to
  // return a stale/low-accuracy network-based fix instead of a real GPS lock.
  // Sends to the backend are still throttled so a fast stream of watch
  // callbacks doesn't turn into a request per second.
  useEffect(() => {
    if (!token) return
    if (!window.isSecureContext || !navigator.geolocation) return

    let lastSentAt = 0
    const MIN_INTERVAL_MS = 60000

    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        const now = Date.now()
        if (now - lastSentAt < MIN_INTERVAL_MS) return
        lastSentAt = now
        axios.post(`${backendUrl}/api/lamus/manager/location`, {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
        }).catch(() => {})
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [token])

  const addClient = async (data: Omit<Client, '_id' | 'managerId' | 'bottlesHeld' | 'balance' | 'createdAt'>) => {
    if (!user) return false
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

  const updateClient = async (id: string, data: Partial<Client>) => {
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

  const deleteClient = async (id: string) => {
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

  const recordOrder = async (data: { clientId: string; bottlesGiven: number; bottlesReturned: number; notes: string; paymentAmount: number; paymentMethod: 'cash' | 'card' | 'transfer' | 'later' }) => {
    if (!user) return false
    try {
      const { data: res } = await axios.post(`${backendUrl}/api/lamus/order`, data)
      if (!res.success) {
        toast.error(tServer(res.message))
        return false
      }
      await Promise.all([loadOrders(), loadClients(), loadStock(), loadFinanceReport()])
      toast.success(t('toast.deliveryRecorded'))
      if (res.stockWarning) toast.error(t('server.stockWentToZero'))
      return true
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
      return false
    }
  }

  const getClientHistory = async (clientId: string): Promise<Order[]> => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/lamus/order/client/${clientId}`)
      if (!data.success) {
        toast.error(tServer(data.message))
        return []
      }
      const client = clients.find(c => c._id === clientId)
      return data.orders.map((o: any) => ({
        _id: o._id,
        clientId: o.clientId,
        clientName: client?.name || '',
        managerId: o.managerId,
        managerName: user?.name || '',
        bottlesGiven: o.bottlesGiven,
        bottlesReturned: o.bottlesReturned,
        netBottles: o.netBottles,
        unitPrice: o.unitPrice || 0,
        saleAmount: o.saleAmount || 0,
        paymentAmount: o.paymentAmount || 0,
        paymentMethod: o.paymentMethod || 'later',
        notes: o.notes || '',
        createdAt: o.createdAt,
      }))
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
      return []
    }
  }

  return (
    <ManagerContext.Provider value={{ clients, orders, totalStock, bottlesOut, bottlePrice, currency, expenseCategories, transactions, financeSummary, addClient, updateClient, deleteClient, recordOrder, getClientHistory, addTransaction, updateTransaction, todayOrders }}>
      {children}
    </ManagerContext.Provider>
  )
}

export const useManager = () => {
  const ctx = useContext(ManagerContext)
  if (!ctx) throw new Error('useManager must be used inside ManagerProvider')
  return ctx
}
