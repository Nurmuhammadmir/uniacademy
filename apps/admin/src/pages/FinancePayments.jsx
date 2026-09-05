import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { CreditCard, TrendingUp, SlidersHorizontal, Printer, Lock } from 'lucide-react'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import Select from '../components/Select.jsx'
import DatePicker from '../components/DatePicker.jsx'
import Modal from '../components/Modal.jsx'
import ReceiptModal from '../components/ReceiptModal.jsx'
import { formatMoney, paymentMethodLabelKey, remainingAmount, groupLabel } from '../lib/format.js'
import { todayISO, firstOfMonthISO, formatDateTime } from '../lib/date.js'

const DEFAULT_FILTERS = { dateFrom: firstOfMonthISO(), dateTo: todayISO(), search: '', groupId: '', teacherId: '', method: '', amount: '' }

// shared field list for both the desktop always-visible filter bar and the mobile "Filtrlar" modal -
// same fields, same handlers, just a different wrapping layout at each call site
const FilterFields = ({ filters, setFilters, groups, teachers, t }) => (
  <>
    <div>
      <p className='text-xs text-muted mb-1'>{t('dateFromLabel')}</p>
      <DatePicker className='w-36' value={filters.dateFrom} onChange={(v) => setFilters({ ...filters, dateFrom: v })} />
    </div>
    <div>
      <p className='text-xs text-muted mb-1'>{t('dateToLabel')}</p>
      <DatePicker className='w-36' value={filters.dateTo} onChange={(v) => setFilters({ ...filters, dateTo: v })} />
    </div>
    <div>
      <p className='text-xs text-muted mb-1'>{t('nameOrPhoneLabel')}</p>
      <input value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
    </div>
    <div>
      <p className='text-xs text-muted mb-1'>{t('selectGroupLabel')}</p>
      <Select className='w-full' value={filters.groupId} onChange={(v) => setFilters({ ...filters, groupId: v })} placeholder={t('anyGroup')}
        options={[{ value: '', label: t('anyGroup') }, ...groups.map(g => ({ value: g._id, label: groupLabel(g) }))]} />
    </div>
    <div>
      <p className='text-xs text-muted mb-1'>{t('teacherFilterLabel')}</p>
      <Select className='w-full' value={filters.teacherId} onChange={(v) => setFilters({ ...filters, teacherId: v })} placeholder={t('anyTeacher')}
        options={[{ value: '', label: t('anyTeacher') }, ...teachers.map(tc => ({ value: tc._id, label: tc.name }))]} />
    </div>
    <div>
      <p className='text-xs text-muted mb-1'>{t('paymentTypeLabel')}</p>
      <Select className='w-full' value={filters.method} onChange={(v) => setFilters({ ...filters, method: v })} placeholder={t('anyMethod')}
        options={[
          { value: '', label: t('anyMethod') },
          { value: 'cash', label: t('paymentMethodCash') },
          { value: 'bank_transfer', label: t('paymentMethodBankTransfer') },
          { value: 'card', label: t('paymentMethodCard') },
          { value: 'click', label: t('paymentMethodClick') },
          { value: 'payme', label: t('paymentMethodPayme') },
        ]} />
    </div>
    <div>
      <p className='text-xs text-muted mb-1'>{t('amountFilterLabel')}</p>
      <input type='number' value={filters.amount} onChange={e => setFilters({ ...filters, amount: e.target.value })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
    </div>
  </>
)

const FinancePayments = () => {
  const { getFinanceOverview, refundPayment, deletePayment, groups, teachers, students, getBusinessLedger } = useContext(AdminContext)
  const { t } = useLanguage()
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [chartPeriod, setChartPeriod] = useState('month')
  const [data, setData] = useState(false)
  const [refunding, setRefunding] = useState(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [showNetProfitBreakdown, setShowNetProfitBreakdown] = useState(false)
  const [netProfitByMethod, setNetProfitByMethod] = useState(null)
  const [printingPaymentId, setPrintingPaymentId] = useState(null)

  const debtors = students.filter(s => (s.owed || 0) > 0)
  const debtorsTotal = debtors.reduce((sum, s) => sum + s.owed, 0)
  // net profit = total payments - total expenses, but expenses are only ever tracked branch-wide -
  // they're never attributed to a specific student/group/teacher. Filtering the PAYMENTS side down
  // to one student/group/teacher while the EXPENSES side stays whole-branch produces a number that
  // doesn't mean anything (e.g. filtering to one student still subtracts the entire branch's
  // expenses), so the headline figure is replaced with an explanation instead of a wrong number.
  const hasNonNeutralFilter = !!(appliedFilters.search || appliedFilters.groupId || appliedFilters.teacherId)
  // matches the backend's own same-day lock (adminController.js's isEditableToday) - a payment can
  // only be refunded/deleted while it's still dated today; once the day rolls over it's locked in,
  // so a branch's daily cash position can't quietly change after the fact
  const isEditableToday = (payment) => payment.date.slice(0, 10) === todayISO()

  const toggleNetProfitBreakdown = async () => {
    if (showNetProfitBreakdown) { setShowNetProfitBreakdown(false); return }
    setShowNetProfitBreakdown(true)
    if (!netProfitByMethod) {
      const ledger = await getBusinessLedger({ dateFrom: appliedFilters.dateFrom, dateTo: appliedFilters.dateTo })
      if (ledger) setNetProfitByMethod(ledger.byMethod)
    }
  }

  const load = () => {
    getFinanceOverview({ ...appliedFilters, page, limit: 25, sortBy, sortOrder, groupBy: chartPeriod }).then(d => { if (d) setData(d) })
  }

  useEffect(() => { load() }, [appliedFilters, page, sortBy, sortOrder, chartPeriod])
  useEffect(() => { setNetProfitByMethod(null); setShowNetProfitBreakdown(false) }, [appliedFilters])

  const applyFilters = (e) => {
    e.preventDefault()
    setPage(1)
    setAppliedFilters(filters)
  }

  const toggleSort = (field) => {
    if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortOrder('desc') }
  }

  const openRefund = (payment) => {
    setRefunding(payment)
    setRefundAmount(String(remainingAmount(payment)))
  }

  const submitRefund = async (e) => {
    e.preventDefault()
    const ok = await refundPayment(refunding._id, Number(refundAmount))
    if (ok) { setRefunding(null); load() }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1

  return (
    <div>
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6'>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-col gap-4 lg:col-span-1'>
          <div className='bg-white dark:bg-[#161F30] border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between'>
            <div className='flex justify-end'><CreditCard size={20} strokeWidth={1.5} className='text-slate-400 dark:text-slate-600' /></div>
            <div>
              <p className='text-muted text-xs mb-1'>{t('totalPaymentsAmount')}</p>
              <p className='font-semibold tracking-tight text-2xl text-[#1D1D1F] dark:text-[#F8FAFC]'>{data ? '+' + formatMoney(data.totalAmount) : '—'}</p>
              <p className='text-[11px] text-slate-400 dark:text-slate-600 mt-1'>{appliedFilters.dateFrom} — {appliedFilters.dateTo}</p>
            </div>
          </div>
          <button onClick={hasNonNeutralFilter ? undefined : toggleNetProfitBreakdown}
            className={`plain text-left bg-white dark:bg-[#161F30] border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between transition-colors ${hasNonNeutralFilter ? '' : 'hover:border-slate-300 dark:hover:border-slate-700'}`}>
            <div className='flex justify-end'><TrendingUp size={20} strokeWidth={1.5} className='text-slate-400 dark:text-slate-600' /></div>
            {hasNonNeutralFilter ? (
              <p className='text-amber-600 dark:text-amber-400 text-xs leading-snug'>{t('netProfitFilteredWarning')}</p>
            ) : (
              <div>
                <p className='text-muted text-xs mb-1'>{t('netProfitAmount')}</p>
                <p className='font-semibold tracking-tight text-2xl text-[#1D1D1F] dark:text-[#F8FAFC]'>{data ? formatMoney(data.netProfit) : '—'}</p>
                <p className='text-[11px] text-slate-400 dark:text-slate-600 mt-1'>{appliedFilters.dateFrom} — {appliedFilters.dateTo}</p>
              </div>
            )}
            {showNetProfitBreakdown && !hasNonNeutralFilter && (
              <div className='mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5' onClick={e => e.stopPropagation()}>
                <p className='text-[11px] font-medium text-slate-400 dark:text-slate-600 uppercase tracking-wide mb-0.5'>{t('netProfitBreakdownTitle')}</p>
                {!netProfitByMethod ? (
                  <p className='text-xs text-muted'>{t('loading')}</p>
                ) : netProfitByMethod.map(m => (
                  <div key={m.method} className='flex justify-between text-xs'>
                    <span className='text-muted'>{t('expenseMethod_' + m.method)}</span>
                    <span className={`font-mono ${m.balance >= 0 ? 'text-[#1D1D1F] dark:text-[#F8FAFC]' : 'text-rose-600 dark:text-rose-400'}`}>{formatMoney(m.balance)}</span>
                  </div>
                ))}
              </div>
            )}
          </button>
          <button onClick={() => navigate('/?debtors=1')} className='plain text-left bg-white dark:bg-[#161F30] border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors'>
            <div className='flex justify-end'><CreditCard size={20} strokeWidth={1.5} className='text-rose-400 dark:text-rose-500' /></div>
            <div>
              <p className='text-muted text-xs mb-1'>{t('debtorsFilterBtn')}</p>
              <p className='font-semibold tracking-tight text-2xl text-rose-600 dark:text-rose-400'>{debtors.length}</p>
              <p className='text-[11px] text-slate-400 dark:text-slate-600 mt-1'>-{formatMoney(debtorsTotal)}</p>
            </div>
          </button>
        </div>

        <div className='lg:col-span-2 bg-bg-elevated border border-hairline rounded-2xl p-5'>
          <div className='flex justify-end gap-2 mb-2'>
            <button onClick={() => setChartPeriod('week')} className={`px-3 py-1 rounded-lg text-xs font-medium ${chartPeriod === 'week' ? 'bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10' : 'bg-bg border border-hairline text-muted'}`}>{t('weeklyToggle')}</button>
            <button onClick={() => setChartPeriod('month')} className={`px-3 py-1 rounded-lg text-xs font-medium ${chartPeriod === 'month' ? 'bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10' : 'bg-bg border border-hairline text-muted'}`}>{t('monthlyToggle')}</button>
          </div>
          <div style={{ height: 185 }}>
            <ResponsiveContainer width='100%' height='100%'>
              <LineChart data={data?.monthlySeries || []}>
                <CartesianGrid strokeDasharray='3 3' stroke={isDark ? '#1E293B' : '#E9E1D4'} />
                <XAxis dataKey='month' stroke={isDark ? '#64748B' : '#7A7266'} fontSize={11} />
                <YAxis stroke={isDark ? '#64748B' : '#7A7266'} fontSize={11} tickFormatter={v => formatMoney(v)} width={70} />
                <Tooltip formatter={v => formatMoney(v)} contentStyle={isDark ? { backgroundColor: '#161F30', border: '1px solid #1E293B', color: '#F8FAFC' } : undefined} labelStyle={isDark ? { color: '#F8FAFC' } : undefined} itemStyle={isDark ? { color: '#F8FAFC' } : undefined} />
                <Line type='monotone' dataKey='total' stroke='#F2542D' strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <button onClick={() => setShowMobileFilters(true)}
        className='md:hidden w-full py-2.5 mb-4 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] dark:bg-[#1E293B] dark:hover:bg-[#334155] dark:text-slate-200 dark:border-none rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors'>
        <SlidersHorizontal size={15} strokeWidth={1.5} /> {t('filterBtn')}
      </button>

      <form onSubmit={applyFilters} className='hidden md:flex sticky top-0 z-20 bg-bg-elevated border border-hairline rounded-2xl p-4 mb-6 flex-wrap gap-3 items-end'>
        <FilterFields filters={filters} setFilters={setFilters} groups={groups} teachers={teachers} t={t} />
        <button type='submit' className='px-5 py-2 rounded-lg bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10 text-sm font-medium shadow-sm transition-colors'>{t('filterBtn')}</button>
      </form>

      {showMobileFilters && (
        <Modal title={t('filterBtn')} onClose={() => setShowMobileFilters(false)}>
          <form onSubmit={(e) => { applyFilters(e); setShowMobileFilters(false) }} className='flex flex-col gap-3'>
            <FilterFields filters={filters} setFilters={setFilters} groups={groups} teachers={teachers} t={t} />
            <button type='submit' className='py-2.5 rounded-xl bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10 text-sm font-medium transition-colors'>{t('filterBtn')}</button>
          </form>
        </Modal>
      )}

      <div className='hidden md:block bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
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
              <th className='px-4 py-3 font-medium'></th>
            </tr>
          </thead>
          <tbody>
            {(data?.payments || []).map((p, i) => (
              <tr key={p._id} onClick={() => navigate('/finance/payments/' + p._id)} className='border-b border-hairline last:border-0 cursor-pointer hover:bg-bg'>
                <td className='px-4 py-4 text-muted'>{(data.page - 1) * data.pageSize + i + 1}</td>
                <td className='px-4 py-4 text-muted whitespace-nowrap'>{formatDateTime(p.date)}</td>
                <td className='px-4 py-4 text-ink'>{p.studentId?.name || '—'}</td>
                <td className='px-4 py-4 font-mono text-accent dark:text-[#818CF8]'>
                  +{formatMoney(p.amount)}
                  {p.refundedAmount > 0 && <span className='block text-xs text-muted font-normal'>{t('refundedAmountHint', { amount: formatMoney(p.refundedAmount) })}</span>}
                </td>
                <td className='px-4 py-4'>
                  <span className='text-xs font-medium px-2 py-1 rounded-full bg-hairline text-muted'>{t(paymentMethodLabelKey(p.method))}</span>
                </td>
                <td className='px-4 py-4 text-muted'>{p.currentTeacherId?.name || p.teacherId?.name || '—'}</td>
                <td className='px-4 py-4 text-muted max-w-[200px]'>
                  {p.comment ? <span className='block truncate' title={p.comment}>{p.comment}</span> : '—'}
                </td>
                <td className='px-4 py-4 text-muted text-xs'>{p.adminId?.name} · {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td className='px-4 py-4 text-right whitespace-nowrap'>
                  <button onClick={(e) => { e.stopPropagation(); setPrintingPaymentId(p._id) }} title={t('printReceiptRowBtn')}
                    className='inline-flex p-1.5 rounded-lg text-muted hover:bg-bg mr-2 align-middle'>
                    <Printer size={14} strokeWidth={1.75} />
                  </button>
                  {p.refunded ? (
                    <span className='text-xs font-medium px-2 py-1 rounded-full bg-hairline text-muted mr-2'>{t('refundedBadge')}</span>
                  ) : !isEditableToday(p) ? (
                    <span title={t('paymentLockedHint')} className='inline-flex items-center gap-1 text-slate-300 dark:text-slate-600 text-xs mr-2'><Lock size={13} strokeWidth={1.75} /></span>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); openRefund(p) }} className='text-muted text-xs font-medium mr-3'>{t('refundBtn')}</button>
                  )}
                  {isEditableToday(p) && (
                    <button onClick={async (e) => { e.stopPropagation(); if (await deletePayment(p._id)) load() }} className='px-2.5 py-1 rounded-lg bg-bg border border-hairline text-muted text-xs font-medium'>
                      {t('deleteBtn')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {data && data.payments.length === 0 && (
              <tr><td colSpan={9} className='px-4 py-8 text-center text-muted'>{t('noPaymentsRecorded')}</td></tr>
            )}
            {!data && (
              <tr><td colSpan={9} className='px-4 py-8 text-center text-muted'>{t('loading')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className='block md:hidden flex flex-col gap-2.5'>
        {!data && <p className='text-muted text-sm text-center py-8'>{t('loading')}</p>}
        {data && data.payments.length === 0 && <p className='text-muted text-sm text-center py-8'>{t('noPaymentsRecorded')}</p>}
        {(data?.payments || []).map(p => (
          <button key={p._id} onClick={() => navigate('/finance/payments/' + p._id)}
            className='plain bg-white dark:bg-[#161F30] rounded-xl border border-slate-100 dark:border-slate-800/80 p-4 flex justify-between items-center shadow-sm dark:shadow-black/40 text-left w-full'>
            <div className='min-w-0'>
              <p className='font-medium text-[#1D1D1F] dark:text-[#F8FAFC] text-sm truncate'>{p.studentId?.name || '—'}</p>
              <p className='text-xs text-slate-400 dark:text-slate-600 mt-1 truncate'>{formatDateTime(p.date)} • {t(paymentMethodLabelKey(p.method))}</p>
            </div>
            <div className='flex items-center gap-2 flex-shrink-0 ml-3'>
              <span onClick={(e) => { e.stopPropagation(); setPrintingPaymentId(p._id) }} title={t('printReceiptRowBtn')} className='p-1.5 rounded-lg text-slate-400 dark:text-slate-600'>
                <Printer size={15} strokeWidth={1.75} />
              </span>
              <p className='text-base font-semibold text-emerald-600 dark:text-emerald-400'>+{formatMoney(p.amount)}</p>
            </div>
          </button>
        ))}
      </div>

      {data && data.totalCount > data.pageSize && (
        <div className='flex justify-center items-center gap-4 mt-4'>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className='px-3 py-1.5 rounded-lg border border-hairline text-sm text-muted disabled:opacity-40'>‹</button>
          <span className='text-sm text-muted'>{t('pageOf', { page, total: totalPages })}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className='px-3 py-1.5 rounded-lg border border-hairline text-sm text-muted disabled:opacity-40'>›</button>
        </div>
      )}

      {refunding && (
        <div className='fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-md dark:bg-[#0B0F19]/60 dark:backdrop-blur-lg transition-all duration-300 flex items-center justify-center p-4' onClick={() => setRefunding(null)}>
          <div className='bg-bg-elevated border border-hairline rounded-2xl p-6 max-w-sm w-full' onClick={e => e.stopPropagation()}>
            <p className='font-display text-lg text-ink mb-3'>{t('refundBtn')}</p>
            <form onSubmit={submitRefund} className='flex flex-col gap-3'>
              <div>
                <p className='text-xs text-muted mb-1'>{t('refundAmountLabel', { max: formatMoney(remainingAmount(refunding)) })}</p>
                <input type='number' min='1' max={remainingAmount(refunding)} value={refundAmount}
                  onChange={e => setRefundAmount(e.target.value)} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
              </div>
              <button type='submit' className='py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium transition-colors'>{t('refundBtn')}</button>
            </form>
          </div>
        </div>
      )}

      {printingPaymentId && <ReceiptModal paymentId={printingPaymentId} onClose={() => setPrintingPaymentId(null)} />}
    </div>
  )
}

export default FinancePayments
