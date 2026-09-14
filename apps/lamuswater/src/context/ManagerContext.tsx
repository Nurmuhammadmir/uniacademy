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

interface ManagerContextType {
  clients: Client[]
  orders: Order[]
  totalStock: number
  bottlesOut: number
  bottlePrice: number
  currency: string
  addClient: (data: Omit<Client, '_id' | 'managerId' | 'bottlesHeld' | 'balance' | 'createdAt'>) => Promise<boolean>
  updateClient: (id: string, data: Partial<Client>) => Promise<boolean>
  deleteClient: (id: string) => Promise<boolean>
  recordOrder: (data: { clientId: string; bottlesGiven: number; bottlesReturned: number; notes: string; paymentAmount: number; paymentMethod: 'cash' | 'card' | 'transfer' | 'later' }) => Promise<boolean>
  getClientHistory: (clientId: string) => Promise<Order[]>
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
      }
    } catch (error: any) {
      toast.error(tError(error, backendUrl))
    }
  }

  useEffect(() => {
    if (!token) return
    loadClients()
    loadOrders()
    loadStock()
    loadFinanceSettings()
  }, [token])

  // Shares this manager's location with admins while the app is open in the
  // foreground — browser geolocation requires an explicit permission prompt
  // and shows a persistent OS indicator, and cannot run once the app/tab is
  // closed (there's no covert background variant of this).
  useEffect(() => {
    if (!token) return
    if (!window.isSecureContext || !navigator.geolocation) return

    const pingLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          axios.post(`${backendUrl}/api/lamus/manager/location`, { lat: p.coords.latitude, lng: p.coords.longitude }).catch(() => {})
        },
        () => {},
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      )
    }

    pingLocation()
    const interval = setInterval(pingLocation, 120000)
    return () => clearInterval(interval)
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
      await Promise.all([loadOrders(), loadClients(), loadStock()])
      toast.success(t('toast.deliveryRecorded'))
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
    <ManagerContext.Provider value={{ clients, orders, totalStock, bottlesOut, bottlePrice, currency, addClient, updateClient, deleteClient, recordOrder, getClientHistory, todayOrders }}>
      {children}
    </ManagerContext.Provider>
  )
}

export const useManager = () => {
  const ctx = useContext(ManagerContext)
  if (!ctx) throw new Error('useManager must be used inside ManagerProvider')
  return ctx
}
