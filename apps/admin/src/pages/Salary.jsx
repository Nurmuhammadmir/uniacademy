import React, { useContext, useState } from 'react'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { formatMoney, scheduleDaysLabel } from '../lib/format.js'
import Spinner from '../components/Spinner.jsx'
import Select from '../components/Select.jsx'
import { currentMonthISO, lastDayOfMonthISO, formatUTCDate } from '../lib/date.js'

const PAYOUT_METHODS = ['cash', 'card', 'click', 'bank_transfer', 'payme', 'apelsin']

// how much each teacher gets paid ("Hisoblash usuli" - the rate type/percent behind that number)
// is director-only, confirmed - this page only ever shows the resulting amount/students/groups and
// lets admin calculate + pay/prepay. The backend itself strips rateType/rateValue from every
// response here, so there's nothing to accidentally leak client-side either.
const Salary = () => {
  const { calculateSalary, paySalary, prepaySalary, getSalaryDetail } = useContext(AdminContext)
  const { t } = useLanguage()
  // the calculator's period is chosen by calendar month (not an arbitrary day range) - the
  // underlying calculation still prorates day-by-day internally (see prorateByDateOverlap), this
  // just controls which whole month gets queried
  const [month, setMonth] = useState(currentMonthISO())
  const dateFrom = month + '-01'
  const dateTo = lastDayOfMonthISO(month)
  const [results, setResults] = useState(null)
  const [payingRow, setPayingRow] = useState(null)
  const [payMode, setPayMode] = useState('pay') // 'pay' | 'prepay'
  const [payMethod, setPayMethod] = useState('cash')
  const [paying, setPaying] = useState(false)
  // prepayment can be an exact amount or a percent of the row's live-calculated total - see the
  // "give teacher an advance as a % of what they've earned so far" request
  const [amountMode, setAmountMode] = useState('amount') // 'amount' | 'percent'
  const [payAmount, setPayAmount] = useState('')
  const [payPercent, setPayPercent] = useState('')
  const [detailRow, setDetailRow] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const runCalculate = async () => {
    const data = await calculateSalary(dateFrom, dateTo)
    if (data) setResults(data)
  }

  const openPay = (row, mode) => {
    setPayingRow(row); setPayMode(mode); setPayMethod('cash'); setAmountMode('amount')
    setPayAmount(String(row.remaining)); setPayPercent('')
  }

  const submitPay = async (e) => {
    e.preventDefault()
    const baseAmount = payingRow.remaining
    const amount = payMode === 'prepay' && amountMode === 'percent'
      ? Math.round(baseAmount * (Number(payPercent) || 0) / 100)
      : Number(payAmount) || baseAmount
    if (!(amount > 0)) return
    setPaying(true)
    const action = payMode === 'prepay' ? prepaySalary : paySalary
    const ok = await action(payingRow.teacherId, amount, dateFrom, dateTo, payMethod)
    setPaying(false)
    if (ok) { setPayingRow(null); runCalculate() }
  }

  const openDetails = async (row) => {
    setDetailRow(row)
    setDetail(null)
    setLoadingDetail(true)
    const data = await getSalaryDetail(row.teacherId, dateFrom, dateTo)
    setDetail(data)
    setLoadingDetail(false)
  }

  const totalToPay = (results || []).reduce((sum, r) => sum + r.remaining, 0)

  return (
    <div>
      <div className='bg-bg-elevated border border-hairline rounded-2xl mb-6 p-5 flex flex-wrap gap-3 items-end'>
        <div>
          <p className='text-xs text-muted mb-1'>{t('monthLabel')}</p>
          <input type='month' value={month} onChange={e => setMonth(e.target.value)} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
        </div>
        <button onClick={runCalculate} className='px-5 py-2 rounded-lg bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10 text-sm font-medium transition-colors'>{t('hisoblangBtn')}</button>
      </div>

      <div className='hidden md:block bg-bg-elevated border border-hairline rounded-2xl overflow-hidden overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-4 py-3 font-medium'>{t('teacherFilterLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('groupsCountCol')}</th>
              <th className='px-4 py-3 font-medium'>{t('studentsCountCol')}</th>
              <th className='px-4 py-3 font-medium'>{t('totalSalaryCol')}</th>
              <th className='px-4 py-3 font-medium'>{t('paidStatusCol')}</th>
              <th className='px-4 py-3'></th>
            </tr>
          </thead>
          <tbody>
            {(results || []).map(r => (
              <tr key={r.teacherId} className='border-b border-hairline last:border-0'>
                <td className='px-4 py-4 text-ink'>{r.name}</td>
                <td className='px-4 py-4 font-mono text-muted'>{r.groupCount}</td>
                <td className='px-4 py-4 font-mono text-muted'>{r.studentCount}</td>
                <td className='px-4 py-4'>
                  <p className='font-mono text-ink'>{formatMoney(r.total)}</p>
                  {r.paidAmount > 0 && (
                    <p className='text-[11px] text-muted mt-1'>{t('alreadyPaidLabel')}: {formatMoney(r.paidAmount)}</p>
                  )}
                </td>
                <td className='px-4 py-4'>
                  {r.remaining <= 0 ? (
                    <span className='text-xs font-medium px-2 py-1 rounded-full bg-accent-soft text-accent dark:bg-[#1E1B4B] dark:text-[#818CF8]'>{t('paidBadge')}</span>
                  ) : (
                    <div className='flex flex-col gap-1.5 items-start'>
                      {r.paidAmount > 0 && (
                        <span className='text-xs text-amber-600 dark:text-amber-400'>{t('remainingToPayLabel')}: {formatMoney(r.remaining)}</span>
                      )}
                      <div className='flex gap-2'>
                        <button onClick={() => openPay(r, 'pay')} className='px-3 py-1.5 rounded-lg bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10 text-xs font-medium transition-colors'>{t('payBtn')}</button>
                        <button onClick={() => openPay(r, 'prepay')} className='px-3 py-1.5 rounded-lg bg-bg border border-hairline text-ink text-xs font-medium'>{t('prepayBtn')}</button>
                      </div>
                    </div>
                  )}
                </td>
                <td className='px-4 py-4 text-right'>
                  <button onClick={() => openDetails(r)} className='text-accent dark:text-[#818CF8] text-xs font-medium'>{t('detailsBtn')}</button>
                </td>
              </tr>
            ))}
            {!results && (
              <tr><td colSpan={6} className='px-4 py-8 text-center text-muted'>{t('noSalaryResultsYet')}</td></tr>
            )}
            {results && results.length === 0 && (
              <tr><td colSpan={6} className='px-4 py-8 text-center text-muted'>{t('noSalaryResultsYet')}</td></tr>
            )}
          </tbody>
          {results && results.length > 0 && (
            <tfoot>
              <tr className='border-t border-hairline'>
                <td colSpan={3} className='px-4 py-4 text-ink font-medium text-right'>{t('totalToPayLabel')}</td>
                <td colSpan={3} className='px-4 py-4 font-mono text-ink font-medium'>{formatMoney(totalToPay)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className='block md:hidden flex flex-col gap-2.5'>
        {!results && <p className='text-muted text-sm text-center py-8'>{t('noSalaryResultsYet')}</p>}
        {results && results.length === 0 && <p className='text-muted text-sm text-center py-8'>{t('noSalaryResultsYet')}</p>}
        {(results || []).map(r => (
          <div key={r.teacherId} className='bg-white dark:bg-[#161F30] rounded-2xl border border-slate-100 dark:border-slate-800/80 p-4 shadow-sm dark:shadow-black/40'>
            <div className='flex justify-between items-start gap-2'>
              <div className='min-w-0'>
                <p className='font-semibold text-[#1D1D1F] dark:text-[#F8FAFC] text-sm truncate'>{r.name}</p>
                <p className='text-xs text-slate-400 dark:text-slate-600 mt-0.5'>
                  {r.groupCount} {t('groupsCountCol')} · {r.studentCount} {t('studentsCountCol')}
                </p>
              </div>
              <button onClick={() => openDetails(r)} className='text-accent dark:text-[#818CF8] text-xs font-medium flex-shrink-0'>{t('detailsBtn')}</button>
            </div>
            <div className='flex justify-between items-end mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80'>
              <div>
                <p className='font-mono text-ink text-base'>{formatMoney(r.total)}</p>
                {r.paidAmount > 0 && <p className='text-[11px] text-muted mt-0.5'>{t('alreadyPaidLabel')}: {formatMoney(r.paidAmount)}</p>}
              </div>
              {r.remaining <= 0 ? (
                <span className='text-xs font-medium px-2 py-1 rounded-full bg-accent-soft text-accent dark:bg-[#1E1B4B] dark:text-[#818CF8]'>{t('paidBadge')}</span>
              ) : (
                <div className='flex flex-col gap-1.5 items-end'>
                  {r.paidAmount > 0 && <span className='text-xs text-amber-600 dark:text-amber-400'>{t('remainingToPayLabel')}: {formatMoney(r.remaining)}</span>}
                  <div className='flex gap-2'>
                    <button onClick={() => openPay(r, 'pay')} className='px-3 py-1.5 rounded-lg bg-accent text-white dark:bg-[#4F46E5] text-xs font-medium'>{t('payBtn')}</button>
                    <button onClick={() => openPay(r, 'prepay')} className='px-3 py-1.5 rounded-lg bg-bg border border-hairline text-ink text-xs font-medium'>{t('prepayBtn')}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {results && results.length > 0 && (
          <div className='flex justify-between items-center px-1 pt-1'>
            <p className='text-ink font-medium text-sm'>{t('totalToPayLabel')}</p>
            <p className='font-mono text-ink font-medium'>{formatMoney(totalToPay)}</p>
          </div>
        )}
      </div>

      {payingRow && (
        <div className='fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-md dark:bg-[#0B0F19]/60 dark:backdrop-blur-lg transition-all duration-300 flex items-center justify-center p-4' onClick={() => setPayingRow(null)}>
          <div className='bg-bg-elevated border border-hairline rounded-2xl p-6 max-w-sm w-full' onClick={e => e.stopPropagation()}>
            <p className='font-display text-lg text-ink mb-1'>{t(payMode === 'prepay' ? 'prepayBtn' : 'payBtn')} — {payingRow.name}</p>
            <p className='font-mono text-2xl text-ink mb-1'>{formatMoney(payingRow.remaining)}</p>
            <p className='text-xs text-muted mb-4'>
              {t('totalSalaryCol')}: {formatMoney(payingRow.total)}
              {payingRow.paidAmount > 0 && ` · ${t('alreadyPaidLabel')}: ${formatMoney(payingRow.paidAmount)}`}
            </p>

            <form onSubmit={submitPay} className='flex flex-col gap-3'>
              {payMode === 'prepay' && (
                <div>
                  <p className='text-xs text-muted mb-1'>{t('prepayModeLabel')}</p>
                  <div className='flex gap-1 bg-slate-100 dark:bg-slate-800/40 rounded-lg p-1 mb-2'>
                    <button type='button' onClick={() => setAmountMode('amount')} className={`plain flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${amountMode === 'amount' ? 'bg-white dark:bg-[#1E293B] text-[#1D1D1F] dark:text-[#F8FAFC] shadow-sm' : 'text-slate-500 dark:text-[#94A3B8]'}`}>{t('prepayModeAmount')}</button>
                    <button type='button' onClick={() => setAmountMode('percent')} className={`plain flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${amountMode === 'percent' ? 'bg-white dark:bg-[#1E293B] text-[#1D1D1F] dark:text-[#F8FAFC] shadow-sm' : 'text-slate-500 dark:text-[#94A3B8]'}`}>{t('prepayModePercent')}</button>
                  </div>
                  {amountMode === 'percent' ? (
                    <>
                      <input type='number' value={payPercent} onChange={e => setPayPercent(e.target.value)} placeholder='50'
                        className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
                      <p className='text-xs text-muted mt-1'>
                        {t('prepayPercentOfLabel', { amount: formatMoney(payingRow.remaining) })}
                        {' = '}{formatMoney(Math.round(payingRow.remaining * (Number(payPercent) || 0) / 100))}
                      </p>
                    </>
                  ) : (
                    <input type='number' value={payAmount} onChange={e => setPayAmount(e.target.value)}
                      className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
                  )}
                </div>
              )}
              {payMode === 'pay' && (
                <div>
                  <p className='text-xs text-muted mb-1'>{t('amountLabel')}</p>
                  <input type='number' value={payAmount} onChange={e => setPayAmount(e.target.value)}
                    className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
                </div>
              )}
              <div>
                <p className='text-xs text-muted mb-1'>{t('expenseMethodLabel')}</p>
                <Select value={payMethod} onChange={setPayMethod}
                  options={PAYOUT_METHODS.map(m => ({ value: m, label: t('expenseMethod_' + m) }))} />
              </div>
              <button type='submit' disabled={paying} className='py-2 rounded-lg bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10 text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2'>
                {paying && <Spinner size={14} />} {paying ? t('payingBtn') : t(payMode === 'prepay' ? 'prepayBtn' : 'payBtn')}
              </button>
            </form>
          </div>
        </div>
      )}

      {detailRow && (
        <div className='fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-md dark:bg-[#0B0F19]/60 dark:backdrop-blur-lg transition-all duration-300 flex items-center justify-center p-4' onClick={() => { setDetailRow(null); setDetail(null) }}>
          <div className='bg-bg-elevated border border-hairline rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto' onClick={e => e.stopPropagation()}>
            <p className='font-display text-lg text-ink mb-1'>{t('salaryDetailTitle')} — {detailRow.name}</p>
            {loadingDetail && <p className='text-muted text-sm flex items-center gap-2'><Spinner size={14} />{t('loading')}</p>}
            {detail && (
              <>
                <p className='font-mono text-2xl text-ink mb-4'>{formatMoney(detail.total)}</p>

                <p className='text-ink text-sm font-medium mb-2'>{t('groupsCountCol')} ({detail.groups.length})</p>
                <div className='flex flex-col gap-2 mb-4'>
                  {detail.groups.map(g => (
                    <div key={g.groupId} className='bg-bg rounded-xl px-3 py-2 text-sm'>
                      <div className='flex justify-between flex-wrap gap-1'>
                        <span className='text-ink'>{g.language} · {g.level}</span>
                        <span className='text-muted text-xs'>{scheduleDaysLabel(g, t)} {g.time}{g.room ? ` · ${g.room}` : ''} · {g.studentCount} {t('studentsCountCol')}</span>
                      </div>
                      <div className='flex justify-end mt-1'>
                        <span className='font-mono text-accent dark:text-[#818CF8] text-xs'>{formatMoney(g.total)}</span>
                      </div>
                    </div>
                  ))}
                  {detail.groups.length === 0 && <p className='text-muted text-sm'>—</p>}
                </div>

                {detail.revenueEntries.length > 0 && (
                  <>
                    <p className='text-ink text-sm font-medium mb-2'>{t('revenueBreakdownLabel')}</p>
                    <div className='overflow-x-auto mb-4'>
                    <table className='w-full text-xs'>
                      <thead>
                        <tr className='text-left text-muted border-b border-hairline'>
                          <th className='py-2 font-medium'>{t('studentCol')}</th>
                          <th className='py-2 font-medium'>{t('groupCol')}</th>
                          <th className='py-2 font-medium'>{t('periodCol')}</th>
                          <th className='py-2 font-medium'>{t('amountCol')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.revenueEntries.map((e, i) => (
                          <tr key={i} className='border-b border-hairline last:border-0'>
                            <td className='py-2 text-ink'>{e.studentName}</td>
                            <td className='py-2 text-muted'>{detail.groups.find(g => String(g.groupId) === String(e.groupId))?.language || '—'}</td>
                            <td className='py-2 text-muted'>{formatUTCDate(e.periodStart)} – {formatUTCDate(e.periodEnd)}{e.pending ? ` (${t('pendingBadge')})` : ''}</td>
                            <td className='py-2 font-mono text-ink'>{formatMoney(e.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </>
                )}

                {detail.lessonEntries.length > 0 && (
                  <>
                    <p className='text-ink text-sm font-medium mb-2'>{t('lessonsCountedLabel')} ({detail.lessonEntries.length})</p>
                    <div className='flex flex-wrap gap-1.5 mb-2'>
                      {detail.lessonEntries.map((e, i) => (
                        <span key={i} className='text-xs font-mono bg-bg px-2 py-1 rounded-lg text-muted'>{new Date(e.date).toLocaleDateString()} · {e.language}</span>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
            <button onClick={() => { setDetailRow(null); setDetail(null) }} className='w-full py-2 rounded-lg border border-hairline text-muted text-sm font-medium mt-2'>✕</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Salary
