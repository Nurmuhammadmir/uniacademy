import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { formatMoney, paymentMethodLabelKey, groupLabel } from '../lib/format.js'
import { todayISO, firstOfMonthISO } from '../lib/date.js'

const DEFAULT_FILTERS = { dateFrom: firstOfMonthISO(), dateTo: todayISO(), search: '', groupId: '', teacherId: '', method: '', amount: '' }

// read-only view of All Payments for whichever branch the Finance page's switcher has selected -
// director oversees, doesn't edit day-to-day payment records (refund/delete stay admin-only actions)
const FinancePayments = ({ branchId }) => {
  const { getFinanceOverview, allGroups, teachers } = useContext(DirectorContext)
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [chartPeriod, setChartPeriod] = useState('month')
  const [data, setData] = useState(false)

  const branchGroups = allGroups.filter(g => String(g.branchId?._id || g.branchId) === String(branchId))
  const branchTeachers = teachers.filter(tc => String(tc.branchId) === String(branchId) || (tc.additionalBranchIds || []).some(id => String(id) === String(branchId)))

  const load = () => {
    getFinanceOverview(branchId, { ...appliedFilters, page, limit: 25, sortBy, sortOrder, groupBy: chartPeriod }).then(d => { if (d) setData(d) })
  }

  useEffect(() => { setData(false); load() }, [branchId, appliedFilters, page, sortBy, sortOrder, chartPeriod])
  useEffect(() => { setFilters(DEFAULT_FILTERS); setAppliedFilters(DEFAULT_FILTERS); setPage(1) }, [branchId])

  const applyFilters = (e) => {
    e.preventDefault()
    setPage(1)
    setAppliedFilters(filters)
  }

  const toggleSort = (field) => {
    if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortOrder('desc') }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1

  return (
    <div>
      <div className='grid grid-cols-3 gap-6 mb-6'>
        <div className='col-span-1 flex flex-col gap-4'>
          <div className='bg-bg-elevated border-l-4 border-accent rounded-2xl p-5 flex items-center justify-between'>
            <div>
              <p className='text-muted text-xs mb-1'>{t('totalPaymentsAmount')}</p>
              <p className='font-mono text-xl text-accent'>{data ? '+' + formatMoney(data.totalAmount) : '—'}</p>
              <p className='text-muted text-xs mt-1'>({appliedFilters.dateFrom} — {appliedFilters.dateTo})</p>
            </div>
            <span className='text-3xl'>💰</span>
          </div>
          <div className='bg-bg-elevated border-l-4 border-[#F2542D] rounded-2xl p-5 flex items-center justify-between'>
            <div>
              <p className='text-muted text-xs mb-1'>{t('netProfitAmount')}</p>
              <p className='font-mono text-xl text-ink'>{data ? formatMoney(data.netProfit) : '—'}</p>
              <p className='text-muted text-xs mt-1'>({appliedFilters.dateFrom} — {appliedFilters.dateTo})</p>
            </div>
            <span className='text-3xl'>🪙</span>
          </div>
        </div>

        <div className='col-span-2 bg-bg-elevated border border-hairline rounded-2xl p-5'>
          <div className='flex justify-end gap-2 mb-2'>
            <button onClick={() => setChartPeriod('week')} className={`px-3 py-1 rounded-lg text-xs font-medium ${chartPeriod === 'week' ? 'bg-accent text-white' : 'bg-bg border border-hairline text-muted'}`}>{t('weeklyToggle')}</button>
            <button onClick={() => setChartPeriod('month')} className={`px-3 py-1 rounded-lg text-xs font-medium ${chartPeriod === 'month' ? 'bg-accent text-white' : 'bg-bg border border-hairline text-muted'}`}>{t('monthlyToggle')}</button>
          </div>
          <div style={{ height: 185 }}>
            <ResponsiveContainer width='100%' height='100%'>
              <LineChart data={data?.monthlySeries || []}>
                <CartesianGrid strokeDasharray='3 3' stroke='#E9E1D4' />
                <XAxis dataKey='month' stroke='#7A7266' fontSize={11} />
                <YAxis stroke='#7A7266' fontSize={11} tickFormatter={v => formatMoney(v)} width={70} />
                <Tooltip formatter={v => formatMoney(v)} />
                <Line type='monotone' dataKey='total' stroke='#F2542D' strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <form onSubmit={applyFilters} className='sticky top-0 z-20 bg-bg-elevated border border-hairline rounded-2xl p-4 mb-6 flex flex-wrap gap-3 items-end'>
        <div>
          <p className='text-xs text-muted mb-1'>{t('dateFromLabel')}</p>
          <input type='date' value={filters.dateFrom} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
        </div>
        <div>
          <p className='text-xs text-muted mb-1'>{t('dateToLabel')}</p>
          <input type='date' value={filters.dateTo} onChange={e => setFilters({ ...filters, dateTo: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
        </div>
        <div>
          <p className='text-xs text-muted mb-1'>{t('nameOrPhoneLabel')}</p>
          <input value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
        </div>
        <div>
          <p className='text-xs text-muted mb-1'>{t('selectGroupLabel')}</p>
          <select value={filters.groupId} onChange={e => setFilters({ ...filters, groupId: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm'>
            <option value=''>{t('anyGroup')}</option>
            {branchGroups.map(g => <option key={g._id} value={g._id}>{groupLabel(g)}</option>)}
          </select>
        </div>
        <div>
          <p className='text-xs text-muted mb-1'>{t('teacherFilterLabel')}</p>
          <select value={filters.teacherId} onChange={e => setFilters({ ...filters, teacherId: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm'>
            <option value=''>{t('anyTeacher')}</option>
            {branchTeachers.map(tc => <option key={tc._id} value={tc._id}>{tc.name}</option>)}
          </select>
        </div>
        <div>
          <p className='text-xs text-muted mb-1'>{t('paymentTypeLabel')}</p>
          <select value={filters.method} onChange={e => setFilters({ ...filters, method: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm'>
            <option value=''>{t('anyMethod')}</option>
            <option value='cash'>{t('paymentMethodCash')}</option>
            <option value='bank_transfer'>{t('paymentMethodBankTransfer')}</option>
            <option value='card'>{t('paymentMethodCard')}</option>
            <option value='click'>{t('paymentMethodClick')}</option>
          </select>
        </div>
        <div>
          <p className='text-xs text-muted mb-1'>{t('amountFilterLabel')}</p>
          <input type='number' value={filters.amount} onChange={e => setFilters({ ...filters, amount: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm w-28' />
        </div>
        <button type='submit' className='px-5 py-2 rounded-lg bg-[#F2542D] text-white text-sm font-medium'>{t('filterBtn')}</button>
      </form>

      <div className='bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-4 py-3 font-medium'>#</th>
              <th className='px-4 py-3 font-medium cursor-pointer' onClick={() => toggleSort('date')}>{t('dateCol')} {sortBy === 'date' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
              <th className='px-4 py-3 font-medium'>{t('studentNameCol')}</th>
              <th className='px-4 py-3 font-medium cursor-pointer' onClick={() => toggleSort('amount')}>{t('amountCol')} {sortBy === 'amount' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
              <th className='px-4 py-3 font-medium'>{t('methodCol')}</th>
              <th className='px-4 py-3 font-medium'>{t('teacherCol')}</th>
              <th className='px-4 py-3 font-medium'>{t('commentCol')}</th>
              <th className='px-4 py-3 font-medium'>{t('staffCol')}</th>
            </tr>
          </thead>
          <tbody>
            {(data?.payments || []).map((p, i) => (
              <tr key={p._id} onClick={() => navigate('/finance/payments/' + p._id)} className='border-b border-hairline last:border-0 cursor-pointer hover:bg-bg'>
                <td className='px-4 py-4 text-muted'>{(data.page - 1) * data.pageSize + i + 1}</td>
                <td className='px-4 py-4 text-muted'>{new Date(p.date).toLocaleDateString()}</td>
                <td className='px-4 py-4 text-ink'>{p.studentId?.name || '—'}</td>
                <td className='px-4 py-4 font-mono text-accent'>
                  +{formatMoney(p.amount)}
                  {p.refundedAmount > 0 && <span className='block text-xs text-muted font-normal'>{t('refundedAmountHint', { amount: formatMoney(p.refundedAmount) })}</span>}
                </td>
                <td className='px-4 py-4'>
                  <span className='text-xs font-medium px-2 py-1 rounded-full bg-hairline text-muted'>{t(paymentMethodLabelKey(p.method))}</span>
                </td>
                <td className='px-4 py-4 text-muted'>{p.currentTeacherId?.name || p.teacherId?.name || '—'}</td>
                <td className='px-4 py-4'>
                  {p.groupId && <span className='text-xs font-medium px-2 py-1 rounded-full bg-accent-soft text-accent'>{p.languageId?.name}{p.levelId?.name ? ` · ${p.levelId.name}` : ''}</span>}
                </td>
                <td className='px-4 py-4 text-muted text-xs'>{p.adminId?.name} · {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
              </tr>
            ))}
            {data && data.payments.length === 0 && (
              <tr><td colSpan={8} className='px-4 py-8 text-center text-muted'>{t('noPaymentsRecorded')}</td></tr>
            )}
            {!data && (
              <tr><td colSpan={8} className='px-4 py-8 text-center text-muted'>{t('loading')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalCount > data.pageSize && (
        <div className='flex justify-center items-center gap-4 mt-4'>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className='px-3 py-1.5 rounded-lg border border-hairline text-sm text-muted disabled:opacity-40'>‹</button>
          <span className='text-sm text-muted'>{t('pageOf', { page, total: totalPages })}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className='px-3 py-1.5 rounded-lg border border-hairline text-sm text-muted disabled:opacity-40'>›</button>
        </div>
      )}
    </div>
  )
}

export default FinancePayments
