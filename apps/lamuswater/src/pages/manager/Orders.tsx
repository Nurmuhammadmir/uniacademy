import { useState } from 'react'
import { useManager } from '../../context/ManagerContext'
import { useLanguage } from '../../context/LanguageContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Package, ArrowLeft } from 'lucide-react'
import Select from '../../components/Select'

const formatBalance = (t: (key: string, vars?: Record<string, string | number>) => string, balance: number, currency: string) => {
  if (balance > 0) return t('balance.owes', { amount: `${balance.toLocaleString()} ${currency}` })
  if (balance < 0) return t('balance.credit', { amount: `${Math.abs(balance).toLocaleString()} ${currency}` })
  return t('balance.settled')
}

const NewOrderForm = ({ onDone }: { onDone: () => void }) => {
  const { clients, recordOrder, bottlePrice, currency } = useManager()
  const { t } = useLanguage()
  const [clientId, setClientId] = useState('')
  const [given, setGiven] = useState(1)
  const [returned, setReturned] = useState(0)
  const [notes, setNotes] = useState('')
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'later'>('later')
  const [saving, setSaving] = useState(false)

  const selectedClient = clients.find(c => c._id === clientId)
  const orderTotal = Math.max(0, given) * bottlePrice
  const newBalance = selectedClient ? selectedClient.balance + orderTotal - paymentAmount : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId) return
    setSaving(true)
    await recordOrder({ clientId, bottlesGiven: given, bottlesReturned: returned, notes, paymentAmount, paymentMethod })
    setSaving(false)
    onDone()
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-md">
      <h2 className="text-base font-semibold text-gray-900 mb-5">{t('orders.recordDelivery')}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{t('orders.client')}</label>
          <Select
            value={clientId}
            onChange={setClientId}
            placeholder={t('orders.selectClient')}
            options={clients.map(c => ({ value: c._id, label: `${c.name} (${c.bottlesHeld} ${t('orders.held')}) · ${formatBalance(t, c.balance, currency)}` }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{t('orders.bottlesGiven')}</label>
            <input
              type="number"
              min={0}
              max={50}
              value={given}
              onChange={e => setGiven(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono-data text-gray-900
                focus:outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/10 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{t('orders.returned')}</label>
            <input
              type="number"
              min={0}
              max={50}
              value={returned}
              onChange={e => setReturned(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono-data text-gray-900
                focus:outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/10 transition-all"
            />
          </div>
        </div>
        {given > 0 || returned > 0 ? (
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 text-sm">
            <span className="text-gray-500">{t('orders.netChange')}</span>
            <span className={`font-mono-data font-medium ${given - returned > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {given - returned > 0 ? '+' : ''}{given - returned} {t('orders.bottles')}
            </span>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{t('orders.paymentAmount')} ({currency})</label>
            <input type="number" min={0} value={paymentAmount} onChange={e => setPaymentAmount(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono-data text-gray-900 focus:outline-none focus:border-[#0066CC]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{t('orders.paymentMethod')}</label>
            <Select
              value={paymentMethod}
              onChange={v => setPaymentMethod(v as typeof paymentMethod)}
              options={[
                { value: 'later', label: t('orders.payLater') },
                { value: 'cash', label: t('orders.cash') },
                { value: 'card', label: t('orders.card') },
                { value: 'transfer', label: t('orders.transfer') },
              ]}
            />
          </div>
        </div>
        {selectedClient && (given > 0 || paymentAmount > 0) ? (
          <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">{t('orders.currentBalance')}</span>
              <span className="font-mono-data text-gray-700">{formatBalance(t, selectedClient.balance, currency)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">{t('orders.orderTotal')}</span>
              <span className="font-mono-data text-gray-700">{orderTotal.toLocaleString()} {currency}</span>
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-gray-200">
              <span className="text-gray-600 font-medium">{t('orders.newBalance')}</span>
              <span className={`font-mono-data font-semibold ${newBalance > 0 ? 'text-amber-600' : newBalance < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                {formatBalance(t, newBalance, currency)}
              </span>
            </div>
          </div>
        ) : null}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{t('common.notes')}</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={t('orders.notesPlaceholder')}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-300
              focus:outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/10 transition-all"
          />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onDone}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-[#0066CC] text-white text-sm font-medium hover:bg-[#0052A3] transition-colors disabled:opacity-60">
            {saving ? t('common.saving') : t('orders.record')}
          </button>
        </div>
      </form>
    </div>
  )
}

const ManagerOrders = () => {
  const { orders } = useManager()
  const { t, fmtDate } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(location.pathname.endsWith('/new'))

  const myOrders = orders.slice(0, 30)

  const formatDate = (s: string) =>
    fmtDate(s, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display text-gray-900">{t('orders.title')}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{t('orders.subtitle', { count: myOrders.length })}</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[#0066CC] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#0052A3] transition-colors">
            <Plus size={16} /> {t('orders.recordDelivery')}
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6">
          <NewOrderForm onDone={() => { setShowForm(false); navigate('/dashboard/orders') }} />
        </div>
      )}

      {myOrders.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center text-sm text-gray-400">
          {t('orders.noneYet')}
        </div>
      )}

      {/* Desktop: table */}
      {myOrders.length > 0 && (
        <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 grid grid-cols-[1fr_80px_80px_80px_120px] text-xs font-medium text-gray-400 uppercase tracking-wider">
            <span>{t('orders.colClient')}</span>
            <span className="text-center">{t('orders.colGiven')}</span>
            <span className="text-center">{t('orders.colReturned')}</span>
            <span className="text-center">{t('orders.colNet')}</span>
            <span className="text-right">{t('orders.colDate')}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {myOrders.map(order => (
              <div key={order._id} className="px-5 py-3.5 grid grid-cols-[1fr_80px_80px_80px_120px] items-center hover:bg-gray-50/50 transition-colors">
                <div>
                  <div className="text-sm font-medium text-gray-900">{order.clientName}</div>
                  {order.notes && <div className="text-xs text-gray-400 mt-0.5">{order.notes}</div>}
                </div>
                <div className="text-center">
                  <span className="font-mono-data text-sm text-[#0066CC] font-medium">+{order.bottlesGiven}</span>
                </div>
                <div className="text-center">
                  <span className="font-mono-data text-sm text-green-600 font-medium">-{order.bottlesReturned}</span>
                </div>
                <div className="text-center">
                  <span className={`font-mono-data text-sm font-medium px-2 py-0.5 rounded-md
                    ${order.netBottles > 0 ? 'bg-amber-50 text-amber-700' : order.netBottles < 0 ? 'bg-green-50 text-green-700' : 'text-gray-400'}`}>
                    {order.netBottles > 0 ? `+${order.netBottles}` : order.netBottles}
                  </span>
                </div>
                <div className="text-right text-xs text-gray-400 font-mono-data">{formatDate(order.createdAt)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile: stacked cards */}
      {myOrders.length > 0 && (
        <div className="md:hidden grid gap-3">
          {myOrders.map(order => (
            <div key={order._id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{order.clientName}</div>
                  {order.notes && <div className="text-xs text-gray-400 mt-0.5 truncate">{order.notes}</div>}
                </div>
                <div className="text-xs text-gray-400 font-mono-data flex-shrink-0">{formatDate(order.createdAt)}</div>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider">{t('orders.colGiven')}</div>
                  <div className="font-mono-data text-sm font-medium text-[#0066CC]">+{order.bottlesGiven}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider">{t('orders.colReturned')}</div>
                  <div className="font-mono-data text-sm font-medium text-green-600">-{order.bottlesReturned}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider">{t('orders.colNet')}</div>
                  <span className={`font-mono-data text-sm font-medium px-2 py-0.5 rounded-md
                    ${order.netBottles > 0 ? 'bg-amber-50 text-amber-700' : order.netBottles < 0 ? 'bg-green-50 text-green-700' : 'text-gray-400'}`}>
                    {order.netBottles > 0 ? `+${order.netBottles}` : order.netBottles}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ManagerOrders
