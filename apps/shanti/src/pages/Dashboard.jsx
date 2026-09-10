import React, { useContext, useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Users, Truck, PackageCheck, ShoppingBag, Receipt } from 'lucide-react'
import { ShantiContext } from '../context/ShantiContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { formatMoney } from '../lib/format.js'

const StatRow = ({ icon: Icon, label, value, sub, tone }) => (
  <div className='flex items-center gap-3 py-3 first:pt-0 last:pb-0 border-b border-slate-100 last:border-0'>
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tone}`}>
      <Icon size={18} strokeWidth={1.75} />
    </div>
    <div className='min-w-0 flex-1'>
      <p className='text-[11px] text-muted leading-tight'>{label}</p>
      <p className='font-bold text-[#1D1D1F] text-[15px] leading-tight mt-0.5 truncate'>{value}</p>
    </div>
    {sub !== undefined && <p className='text-xs text-muted flex-shrink-0'>{sub}</p>}
  </div>
)

const Dashboard = () => {
  const { getDashboardSummary, getDashboardSeries } = useContext(ShantiContext)
  const { t } = useLanguage()
  const [period, setPeriod] = useState('month')
  const [series, setSeries] = useState(null)
  const [summary, setSummary] = useState(null)

  useEffect(() => { getDashboardSummary().then(d => { if (d) setSummary(d) }) }, [])
  useEffect(() => { getDashboardSeries(period).then(d => { if (d) setSeries(d) }) }, [period])

  const chartData = (series?.income || []).map((row, i) => ({ label: row.label, income: row.value, expense: series.expense[i]?.value || 0 }))

  return (
    <div>
      <h1 className='text-2xl font-bold tracking-tight text-[#1D1D1F] mb-5'>{t('dashboardTitle')}</h1>

      <div className='grid grid-cols-1 xl:grid-cols-3 gap-5'>
        <div className='xl:col-span-2 flex flex-col gap-5'>
          <div className='bg-white border border-slate-100 rounded-2xl p-5 shadow-sm'>
            <div className='flex justify-between items-center mb-1'>
              <p className='text-ink font-medium text-sm'>{t('incomeLabel')} / {t('expenseLabel')}</p>
              <div className='flex gap-1 bg-slate-100 rounded-lg p-1'>
                {[['week', t('periodWeek')], ['month', t('periodMonth')], ['year', t('periodYear')]].map(([value, label]) => (
                  <button key={value} onClick={() => setPeriod(value)}
                    className={`plain px-3 py-1 rounded-md text-xs font-medium transition-colors ${period === value ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-slate-500'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#E2E8F0' strokeOpacity={0.7} />
                  <XAxis dataKey='label' stroke='#94a3b8' fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke='#94a3b8' fontSize={11} tickFormatter={v => formatMoney(v)} width={70} tickLine={false} axisLine={false} />
                  <Tooltip formatter={v => formatMoney(v)} />
                  <Legend formatter={(value) => value === 'income' ? t('incomeLabel') : t('expenseLabel')} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey='income' name='income' fill='#10B981' radius={[4, 4, 0, 0]} />
                  <Bar dataKey='expense' name='expense' fill='#EF4444' radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className='bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between'>
            <p className='text-ink font-medium text-sm'>{t('netProfitLabel')}</p>
            <p className={`font-bold text-2xl tracking-tight font-mono ${series && series.netProfit < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {series ? formatMoney(series.netProfit) : '—'}
            </p>
          </div>
        </div>

        <div className='bg-white border border-slate-100 rounded-2xl p-5 shadow-sm'>
          <p className='text-ink font-medium text-sm mb-1'>{t('statsTitle')}</p>
          <StatRow icon={Users} tone='bg-amber-50 text-amber-600'
            label={t('debtorsCountLabel')} value={summary ? formatMoney(summary.debtors.total) : '—'} sub={summary?.debtors.count} />
          <StatRow icon={Truck} tone='bg-rose-50 text-rose-600'
            label={t('sellerDebtsCountLabel')} value={summary ? formatMoney(summary.sellerDebts.total) : '—'} sub={summary?.sellerDebts.count} />
          <StatRow icon={PackageCheck} tone='bg-emerald-50 text-emerald-600'
            label={t('soldThisMonthLabel')} value={summary ? formatMoney(summary.thisMonth.salesSum) : '—'} sub={summary ? `${summary.thisMonth.soldQuantity} ${t('pcsShort')}` : undefined} />
          <StatRow icon={ShoppingBag} tone='bg-sky-50 text-sky-600'
            label={t('purchasesThisMonthLabel')} value={summary ? formatMoney(summary.thisMonth.purchasesSum) : '—'} sub={summary?.thisMonth.purchasesCount} />
          <StatRow icon={Receipt} tone='bg-slate-100 text-slate-600'
            label={t('expenseThisMonthLabel')} value={summary ? formatMoney(summary.thisMonth.expenseSum) : '—'} />
        </div>
      </div>
    </div>
  )
}

export default Dashboard
