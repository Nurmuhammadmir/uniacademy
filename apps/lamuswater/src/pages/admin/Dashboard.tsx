import { useState } from 'react'
import { useAdmin } from '../../context/AdminContext'
import { useLanguage } from '../../context/LanguageContext'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { Users, Package, Activity, TrendingUp, Clock, ArrowRight, Trophy, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type Period = 'week' | 'month' | 'year'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <div className="font-medium text-gray-700 mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-mono-data font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

const AdminDashboard = () => {
  const { managers, operations, clients, financeSummary, financeSettings } = useAdmin()
  const { t, fmtDate } = useLanguage()
  const navigate = useNavigate()
  const [period, setPeriod] = useState<Period>('week')

  const totalClients = managers.reduce((s, m) => s + m.activeClients, 0)
  const totalBottlesOut = clients.reduce((s, c) => s + c.bottlesHeld, 0)
  const totalDeliveries = managers.reduce((s, m) => s + m.totalDeliveries, 0)

  const todayStr = new Date().toISOString().split('T')[0]
  const todayOps = operations.filter(o => o.createdAt.startsWith(todayStr))

  const stats = [
    { label: t('adminDashboard.statTotalClients'), value: totalClients, icon: Users, sub: t('adminDashboard.subAcrossManagers') },
    { label: t('adminDashboard.statBottlesOut'), value: totalBottlesOut, icon: Package, sub: t('adminDashboard.subAtClients'), accent: true },
    { label: t('adminDashboard.statManagers'), value: managers.length, icon: Activity, sub: t('adminDashboard.subActive') },
    { label: t('adminDashboard.statDeliveries'), value: totalDeliveries, icon: TrendingUp, sub: t('adminDashboard.subOrdersLogged') },
  ]

  // chart data at the selected granularity — real activity, not mock data
  const deliveryData = (() => {
    if (period === 'year') {
      const months = Array.from({ length: 12 }).map((_, i) => {
        const d = new Date()
        d.setDate(1)
        d.setMonth(d.getMonth() - (11 - i))
        return d
      })
      return months.map(d => {
        const y = d.getFullYear(), m = d.getMonth()
        const monthOps = operations.filter(o => {
          const od = new Date(o.createdAt)
          return od.getFullYear() === y && od.getMonth() === m
        })
        return {
          day: fmtDate(d, { month: 'short' }),
          deliveries: monthOps.reduce((s, o) => s + o.bottlesGiven, 0),
          returned: monthOps.reduce((s, o) => s + o.bottlesReturned, 0),
        }
      })
    }
    const days = period === 'week' ? 7 : 30
    const dateList = Array.from({ length: days }).map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (days - 1 - i))
      return d
    })
    return dateList.map(d => {
      const dayStr = d.toISOString().split('T')[0]
      const dayOps = operations.filter(o => o.createdAt.startsWith(dayStr))
      return {
        day: period === 'week' ? fmtDate(d, { weekday: 'short' }) : fmtDate(d, { day: 'numeric', month: 'short' }),
        deliveries: dayOps.reduce((s, o) => s + o.bottlesGiven, 0),
        returned: dayOps.reduce((s, o) => s + o.bottlesReturned, 0),
      }
    })
  })()

  const managerData = managers.map(m => ({ name: m.name, deliveries: m.totalDeliveries, clients: m.activeClients }))

  // top clients by bottles delivered this calendar month
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const thisMonthOps = operations.filter(o => new Date(o.createdAt) >= monthStart)
  const byClient = new Map<string, { name: string; total: number }>()
  thisMonthOps.forEach(o => {
    const entry = byClient.get(o.clientId) || { name: o.clientName, total: 0 }
    entry.total += o.bottlesGiven
    byClient.set(o.clientId, entry)
  })
  const topClients = [...byClient.values()].sort((a, b) => b.total - a.total).slice(0, 3)

  const periodTabs: { key: Period; label: string }[] = [
    { key: 'week', label: t('adminDashboard.periodWeek') },
    { key: 'month', label: t('adminDashboard.periodMonth') },
    { key: 'year', label: t('adminDashboard.periodYear') },
  ]

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-7">
        <h1 className="text-2xl font-display text-gray-900">{t('adminDashboard.title')}</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {fmtDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className={`rounded-2xl p-5 border ${s.accent ? 'bg-[#0066CC] border-transparent' : 'bg-white border-gray-100'}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${s.accent ? 'bg-white/15' : 'bg-gray-50'}`}>
              <s.icon size={18} strokeWidth={1.75} className={s.accent ? 'text-white' : 'text-[#0066CC]'} />
            </div>
            <div className={`font-mono-data text-3xl font-medium mb-0.5 ${s.accent ? 'text-white' : 'text-gray-900'}`}>{s.value}</div>
            <div className={`text-xs font-medium ${s.accent ? 'text-blue-100' : 'text-gray-500'}`}>{s.label}</div>
            <div className={`text-[11px] mt-0.5 ${s.accent ? 'text-blue-200' : 'text-gray-400'}`}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        {/* Delivery chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-sm font-semibold text-gray-900">{t('adminDashboard.weeklyChart')}</h2>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {periodTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setPeriod(tab.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all
                    ${period === tab.key ? 'bg-white text-[#0066CC] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={deliveryData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                interval={period === 'month' ? 3 : 0} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="deliveries" name={t('adminDashboard.delivered')} stroke="#0066CC" strokeWidth={2} dot={period !== 'month'} />
              <Line type="monotone" dataKey="returned" name={t('adminDashboard.returned')} stroke="#10b981" strokeWidth={2} dot={period !== 'month'} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Manager performance */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">{t('adminDashboard.managerPerformance')}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={managerData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="deliveries" name={t('adminDashboard.statDeliveries')} fill="#0066CC" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Today's ops */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Clock size={15} className="text-[#0066CC]" /> {t('adminDashboard.todaysActivity')}
            </div>
            <button onClick={() => navigate('/dashboard/operations')} className="text-xs text-[#0066CC] flex items-center gap-1 hover:underline">
              {t('adminDashboard.all')} <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
            {todayOps.length === 0 && <div className="py-8 text-center text-sm text-gray-400">{t('adminDashboard.noActivityToday')}</div>}
            {todayOps.map(op => (
              <div key={op._id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm text-gray-900">{op.clientName}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {t('adminDashboard.byManager', { name: op.managerName })} · {fmtDate(op.createdAt, { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="flex gap-2 text-xs font-mono-data">
                  <span className="text-[#0066CC] font-medium">+{op.bottlesGiven}</span>
                  <span className="text-gray-300">/</span>
                  <span className="text-green-600 font-medium">-{op.bottlesReturned}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial snapshot */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">{t('adminDashboard.financialSnapshot')}</h2>
            <button onClick={() => navigate('/dashboard/finance')} className="text-xs text-[#0066CC] flex items-center gap-1 hover:underline">
              {t('adminDashboard.all')} <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                <Wallet size={13} /> {t('finance.summaryNetProfit')}
              </div>
              <div className={`font-mono-data text-sm font-semibold ${financeSummary.netProfit >= 0 ? 'text-green-600' : 'text-amber-600'}`}>
                {financeSummary.netProfit.toLocaleString()} {financeSettings.currency}
              </div>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                <TrendingUp size={13} /> {t('finance.summaryExpenses')}
              </div>
              <div className="font-mono-data text-sm font-semibold text-amber-600">
                {financeSummary.expenses.toLocaleString()} {financeSettings.currency}
              </div>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                <Users size={13} /> {t('finance.summaryReceivable')}
              </div>
              <div className="font-mono-data text-sm font-semibold text-amber-600">
                {financeSummary.receivable.toLocaleString()} {financeSettings.currency}
              </div>
            </div>
          </div>
        </div>

        {/* Top clients this month */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy size={15} className="text-amber-500" /> {t('adminDashboard.topClients')}
          </h2>
          {topClients.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-400">{t('adminDashboard.noDataThisMonth')}</div>
          ) : (
            <div className="space-y-3">
              {topClients.map((c, i) => (
                <div key={c.name + i} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-orange-700'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{c.name}</div>
                    <div className="text-[11px] text-gray-400">{t('adminDashboard.bottlesThisMonth', { count: c.total })}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
