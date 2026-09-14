import { useManager } from '../../context/ManagerContext'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { useNavigate } from 'react-router-dom'
import { Package, Users, Truck, RotateCcw, Plus, ArrowRight } from 'lucide-react'
import QuoteOfTheDay from '../../components/QuoteOfTheDay'

const StatCard = ({ label, value, sub, icon: Icon, accent = false }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; accent?: boolean
}) => (
  <div className={`rounded-2xl p-5 ${accent ? 'bg-[#0066CC] text-white' : 'bg-white'} border ${accent ? 'border-transparent' : 'border-gray-100'}`}>
    <div className="flex items-start justify-between mb-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent ? 'bg-white/15' : 'bg-gray-50'}`}>
        <Icon size={18} strokeWidth={1.75} className={accent ? 'text-white' : 'text-[#0066CC]'} />
      </div>
    </div>
    <div className={`font-mono-data text-3xl font-medium mb-0.5 ${accent ? 'text-white' : 'text-gray-900'}`}>{value}</div>
    <div className={`text-xs font-medium ${accent ? 'text-blue-100' : 'text-gray-500'}`}>{label}</div>
    {sub && <div className={`text-[11px] mt-0.5 ${accent ? 'text-blue-200' : 'text-gray-400'}`}>{sub}</div>}
  </div>
)

const ManagerDashboard = () => {
  const { user } = useAuth()
  const { t, fmtDate } = useLanguage()
  const { clients, orders, bottlesOut, todayOrders } = useManager()
  const navigate = useNavigate()

  const todayGiven = todayOrders.reduce((s, o) => s + o.bottlesGiven, 0)
  const todayReturned = todayOrders.reduce((s, o) => s + o.bottlesReturned, 0)

  const recent = orders.slice(0, 5)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return t('managerDashboard.goodMorning')
    if (h < 17) return t('managerDashboard.goodAfternoon')
    return t('managerDashboard.goodEvening')
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-7">
        <h1 className="text-2xl font-display text-gray-900">
          {greeting()}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {fmtDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <QuoteOfTheDay />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label={t('managerDashboard.statMyClients')} value={clients.length} icon={Users} />
        <StatCard label={t('managerDashboard.statBottlesOut')} value={bottlesOut} sub={t('managerDashboard.atClients')} icon={Package} accent />
        <StatCard label={t('managerDashboard.statDeliveredToday')} value={todayGiven} sub={t('orders.bottles')} icon={Truck} />
        <StatCard label={t('managerDashboard.statReturnedToday')} value={todayReturned} sub={t('orders.bottles')} icon={RotateCcw} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">{t('managerDashboard.recentDeliveries')}</h2>
            <button onClick={() => navigate('/dashboard/orders')} className="text-xs text-[#0066CC] hover:underline flex items-center gap-1">
              {t('managerDashboard.allOrders')} <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {recent.length === 0 && (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">{t('managerDashboard.noDeliveriesYet')}</div>
            )}
            {recent.map(order => (
              <div key={order._id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <div className="text-sm font-medium text-gray-900">{order.clientName}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {fmtDate(order.createdAt, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-xs text-gray-400">{t('managerDashboard.given')}</div>
                    <div className="font-mono-data text-sm font-medium text-gray-900">+{order.bottlesGiven}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">{t('managerDashboard.returned')}</div>
                    <div className="font-mono-data text-sm font-medium text-green-600">-{order.bottlesReturned}</div>
                  </div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono-data font-medium
                    ${order.netBottles > 0 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                    {order.netBottles > 0 ? `+${order.netBottles}` : order.netBottles}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">{t('managerDashboard.quickActions')}</h2>
            <div className="space-y-2">
              <button onClick={() => navigate('/dashboard/clients/add')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-[#0066CC] text-white rounded-xl text-sm font-medium hover:bg-[#0052A3] transition-colors">
                <Plus size={16} />
                {t('managerDashboard.addNewClient')}
              </button>
              <button onClick={() => navigate('/dashboard/orders/new')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">
                <Truck size={16} />
                {t('managerDashboard.recordDelivery')}
              </button>
              <button onClick={() => navigate('/dashboard/map')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">
                <Package size={16} />
                {t('managerDashboard.viewMap')}
              </button>
            </div>
          </div>

          {/* Top clients by bottles */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">{t('managerDashboard.bottlesAtClients')}</h2>
            <div className="space-y-2">
              {[...clients].sort((a, b) => b.bottlesHeld - a.bottlesHeld).slice(0, 4).map(c => (
                <div key={c._id} className="flex items-center justify-between">
                  <div className="text-sm text-gray-700 truncate max-w-[140px]">{c.name}</div>
                  <div className={`font-mono-data text-sm font-medium px-2 py-0.5 rounded-md
                    ${c.bottlesHeld >= 4 ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600'}`}>
                    {c.bottlesHeld}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ManagerDashboard
