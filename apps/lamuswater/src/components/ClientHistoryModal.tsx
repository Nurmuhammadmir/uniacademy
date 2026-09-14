import { X, Truck, Package, TrendingUp, Wallet, Receipt } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

interface HistoryEntry {
  _id: string
  bottlesGiven: number
  bottlesReturned: number
  notes?: string
  createdAt: string
  saleAmount?: number
  paymentAmount?: number
}

interface ExtraTransaction {
  _id: string
  type: 'income' | 'expense' | 'payment' | 'adjustment'
  amount: number
  notes: string
  createdAt: string
}

interface Props {
  clientName: string
  bottlesHeld?: number
  balance?: number
  currency?: string
  orders: HistoryEntry[] | null // null = still loading
  extraTransactions?: ExtraTransaction[]
  onClose: () => void
}

const ClientHistoryModal = ({ clientName, bottlesHeld, balance, currency = 'UZS', orders, extraTransactions, onClose }: Props) => {
  const { t, fmtDate } = useLanguage()

  const totalReturned = orders?.reduce((s, o) => s + o.bottlesReturned, 0) ?? 0

  const formatDate = (s: string) =>
    fmtDate(s, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const formatBalance = (b: number) => {
    if (b > 0) return t('balance.owes', { amount: `${b.toLocaleString()} ${currency}` })
    if (b < 0) return t('balance.credit', { amount: `${Math.abs(b).toLocaleString()} ${currency}` })
    return t('balance.settled')
  }

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 modal-backdrop" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl modal-card w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">{t('history.title')}</h3>
            <p className="text-sm text-gray-400 mt-0.5">{clientName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        {/* Aggregate stats */}
        <div className="grid grid-cols-3 gap-3 px-6 py-4 border-b border-gray-50">
          {bottlesHeld !== undefined && (
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                <Package size={12} />
                <span className="text-[10px] font-medium uppercase tracking-wider">{t('stock.atClients')}</span>
              </div>
              <div className="font-mono-data text-lg font-semibold text-gray-900">{bottlesHeld}</div>
            </div>
          )}
          <div className="bg-green-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-green-700 mb-1">
              <TrendingUp size={12} />
              <span className="text-[10px] font-medium uppercase tracking-wider">{t('managerDashboard.returned')}</span>
            </div>
            <div className="font-mono-data text-lg font-semibold text-green-700">{totalReturned}</div>
          </div>
          {balance !== undefined && (
            <div className={`rounded-xl p-3 ${balance > 0 ? 'bg-amber-50' : balance < 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
              <div className={`flex items-center gap-1.5 mb-1 ${balance > 0 ? 'text-amber-700' : balance < 0 ? 'text-green-700' : 'text-gray-500'}`}>
                <Wallet size={12} />
                <span className="text-[10px] font-medium uppercase tracking-wider">{t('orders.currentBalance')}</span>
              </div>
              <div className={`font-mono-data text-sm font-semibold ${balance > 0 ? 'text-amber-700' : balance < 0 ? 'text-green-700' : 'text-gray-700'}`}>
                {formatBalance(balance)}
              </div>
            </div>
          )}
        </div>

        <div className="overflow-y-auto flex-1">
          {orders === null && (
            <div className="py-12 text-center text-sm text-gray-400">{t('history.loading')}</div>
          )}
          {orders !== null && orders.length === 0 && (!extraTransactions || extraTransactions.length === 0) && (
            <div className="py-12 text-center text-sm text-gray-400 px-6">{t('history.noneYet')}</div>
          )}
          {orders !== null && orders.length > 0 && (
            <div className="divide-y divide-gray-50">
              {orders.map(order => (
                <div key={order._id} className="px-6 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                      <Truck size={14} className="text-gray-400" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">{formatDate(order.createdAt)}</div>
                      {order.notes && <div className="text-xs text-gray-400 italic mt-0.5">{order.notes}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider">{t('managerDashboard.given')}</div>
                      <div className="font-mono-data text-sm font-medium text-[#0066CC]">+{order.bottlesGiven}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider">{t('managerDashboard.returned')}</div>
                      <div className="font-mono-data text-sm font-medium text-green-600">-{order.bottlesReturned}</div>
                    </div>
                    {order.saleAmount !== undefined && order.saleAmount > 0 && (
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">{t('orders.orderTotal')}</div>
                        <div className="font-mono-data text-sm font-medium text-gray-700">{order.saleAmount.toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {extraTransactions && extraTransactions.length > 0 && (
            <div className="divide-y divide-gray-50 border-t border-gray-100">
              {extraTransactions.map(tx => (
                <div key={tx._id} className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                      <Receipt size={13} className="text-gray-400" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">{formatDate(tx.createdAt)}</div>
                      {tx.notes && <div className="text-xs text-gray-400 italic mt-0.5">{tx.notes}</div>}
                    </div>
                  </div>
                  <div className={`font-mono-data text-sm font-medium ${tx.type === 'expense' ? 'text-amber-600' : 'text-green-600'}`}>
                    {tx.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {orders !== null && orders.length > 0 && (
          <div className="px-6 py-3.5 border-t border-gray-100 text-xs text-gray-400">
            {t('history.totalDeliveries', { count: orders.length })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ClientHistoryModal
