import React, { useContext, useEffect, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { formatMoney } from '../lib/format.js'
import { currentMonthISO, lastDayOfMonthISO } from '../lib/date.js'

const RATE_UNIT_KEYS = {
  per_student_month: 'rateUnitPerStudentMonth', per_lesson: 'rateUnitPerLesson', per_hour: 'rateUnitPerHour',
  fixed_monthly: 'rateUnitFixedMonthly', percent_of_revenue: 'rateUnitPercentRevenue',
}
const PAYOUT_METHODS = ['cash', 'card', 'click', 'bank_transfer', 'payme', 'apelsin']

// same calculator as admin's own Salary page, just driven by whichever branchId the Finance page's
// switcher has selected instead of the caller's own home branch
const Salary = ({ branchId }) => {
  const { payRates, getPayRates, setPayRate, deletePayRate, calculateSalary, paySalary, prepaySalary, getSalaryDetail, teachers } = useContext(DirectorContext)
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(false)
  const [month, setMonth] = useState(currentMonthISO())
  const dateFrom = month + '-01'
  const dateTo = lastDayOfMonthISO(month)
  const [defaultForm, setDefaultForm] = useState({ rateValue: '', rateType: 'per_student_month' })
  const [customForm, setCustomForm] = useState({ teacherId: '', rateValue: '', rateType: 'per_student_month' })
  const [results, setResults] = useState(null)
  const [payingRow, setPayingRow] = useState(null)
  const [payMode, setPayMode] = useState('pay')
  const [payMethod, setPayMethod] = useState('cash')
  const [paying, setPaying] = useState(false)
  const [detailRow, setDetailRow] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const branchTeachers = teachers.filter(tc => String(tc.branchId) === String(branchId) || (tc.additionalBranchIds || []).some(id => String(id) === String(branchId)))

  useEffect(() => { getPayRates(branchId); setResults(null) }, [branchId])

  const defaultRate = payRates.find(r => !r.teacherId)
  const overrides = payRates.filter(r => r.teacherId)

  useEffect(() => {
    if (defaultRate) setDefaultForm({ rateValue: defaultRate.rateValue, rateType: defaultRate.rateType })
    else setDefaultForm({ rateValue: '', rateType: 'per_student_month' })
  }, [defaultRate?._id])

  const submitDefault = async (e) => {
    e.preventDefault()
    await setPayRate(branchId, { rateType: defaultForm.rateType, rateValue: Number(defaultForm.rateValue) })
  }

  const submitCustom = async (e) => {
    e.preventDefault()
    const ok = await setPayRate(branchId, { teacherId: customForm.teacherId, rateType: customForm.rateType, rateValue: Number(customForm.rateValue) })
    if (ok) setCustomForm({ teacherId: '', rateValue: '', rateType: 'per_student_month' })
  }

  const runCalculate = async () => {
    const data = await calculateSalary(branchId, dateFrom, dateTo)
    if (data) setResults(data)
  }

  const submitPay = async (e) => {
    e.preventDefault()
    setPaying(true)
    const action = payMode === 'prepay' ? prepaySalary : paySalary
    const ok = await action(branchId, payingRow.teacherId, payingRow.total, dateFrom, dateTo, payMethod)
    setPaying(false)
    if (ok) { setPayingRow(null); runCalculate() }
  }

  const openDetails = async (row) => {
    setDetailRow(row)
    setDetail(null)
    setLoadingDetail(true)
    const data = await getSalaryDetail(branchId, row.teacherId, dateFrom, dateTo)
    setDetail(data)
    setLoadingDetail(false)
  }

  const totalToPay = (results || []).filter(r => !r.paid).reduce((sum, r) => sum + r.total, 0)

  return (
    <div>
      <div className='bg-bg-elevated border border-hairline rounded-2xl mb-6 overflow-hidden'>
        <button onClick={() => setExpanded(v => !v)} className='w-full flex items-center justify-between px-5 py-4'>
          <span className='flex items-center gap-2 text-ink font-medium'>⚙️ {t('configureSalaryCalculatorLabel')}</span>
          <span className='text-muted'>{expanded ? '^' : 'v'}</span>
        </button>

        <div className='px-5 pb-4 flex flex-wrap gap-3 items-end'>
          <div>
            <p className='text-xs text-muted mb-1'>{t('monthLabel')}</p>
            <input type='month' value={month} onChange={e => setMonth(e.target.value)} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
          </div>
          <button onClick={runCalculate} className='px-5 py-2 rounded-lg bg-[#F2542D] text-white text-sm font-medium'>{t('hisoblangBtn')}</button>
        </div>

        {expanded && (
          <div className='border-t border-hairline p-5 flex flex-col gap-5'>
            <div className='border-l-4 border-accent bg-bg rounded-xl p-4'>
              <div className='flex items-center gap-2 mb-3'>
                <span className='w-6 h-6 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center'>1</span>
                <p className='text-ink text-sm font-medium'>{t('setDefaultRatesStep')}</p>
              </div>
              <form onSubmit={submitDefault} className='flex gap-2 items-end flex-wrap'>
                <div>
                  <p className='text-xs text-muted mb-1'>{t('rateValueLabel')}</p>
                  <input type='number' value={defaultForm.rateValue} onChange={e => setDefaultForm({ ...defaultForm, rateValue: e.target.value })}
                    className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm w-36' required />
                </div>
                <div>
                  <p className='text-xs text-muted mb-1'>{t('rateUnitLabel')}</p>
                  <select value={defaultForm.rateType} onChange={e => setDefaultForm({ ...defaultForm, rateType: e.target.value })} className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm'>
                    {Object.entries(RATE_UNIT_KEYS).map(([val, key]) => <option key={val} value={val}>{t(key)}</option>)}
                  </select>
                </div>
                <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('save')}</button>
              </form>
            </div>

            <div className='border-l-4 border-accent bg-bg rounded-xl p-4'>
              <div className='flex items-center gap-2 mb-3'>
                <span className='w-6 h-6 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center'>2</span>
                <p className='text-ink text-sm font-medium'>{t('setCustomRateStep')}</p>
              </div>
              <form onSubmit={submitCustom} className='flex gap-2 items-end flex-wrap mb-4'>
                <div>
                  <p className='text-xs text-muted mb-1'>{t('selectTeacherLabel')}</p>
                  <select value={customForm.teacherId} onChange={e => setCustomForm({ ...customForm, teacherId: e.target.value })} className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm' required>
                    <option value=''>{t('selectTeacherLabel')}</option>
                    {branchTeachers.map(tc => <option key={tc._id} value={tc._id}>{tc.name}</option>)}
                  </select>
                </div>
                <div>
                  <p className='text-xs text-muted mb-1'>{t('rateValueLabel')}</p>
                  <input type='number' value={customForm.rateValue} onChange={e => setCustomForm({ ...customForm, rateValue: e.target.value })}
                    className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm w-36' required />
                </div>
                <div>
                  <p className='text-xs text-muted mb-1'>{t('rateUnitLabel')}</p>
                  <select value={customForm.rateType} onChange={e => setCustomForm({ ...customForm, rateType: e.target.value })} className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm'>
                    {Object.entries(RATE_UNIT_KEYS).map(([val, key]) => <option key={val} value={val}>{t(key)}</option>)}
                  </select>
                </div>
                <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('save')}</button>
              </form>

              <table className='w-full text-sm'>
                <thead>
                  <tr className='text-left text-muted border-b border-hairline'>
                    <th className='py-2 font-medium'>{t('teacherFilterLabel')}</th>
                    <th className='py-2 font-medium'>{t('teacherCalcMethodCol')}</th>
                    <th className='py-2'></th>
                  </tr>
                </thead>
                <tbody>
                  {overrides.map(r => (
                    <tr key={r._id} className='border-b border-hairline last:border-0'>
                      <td className='py-3 text-ink'>{r.teacherId?.name}</td>
                      <td className='py-3 text-muted'>{formatMoney(r.rateValue)} {t(RATE_UNIT_KEYS[r.rateType])}</td>
                      <td className='py-3 text-right'><button onClick={() => deletePayRate(branchId, r._id)} className='text-muted text-xs font-medium'>{t('removeBtn')}</button></td>
                    </tr>
                  ))}
                  {overrides.length === 0 && <tr><td colSpan={3} className='py-4 text-center text-muted'>—</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className='bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-4 py-3 font-medium'>{t('teacherFilterLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('groupsCountCol')}</th>
              <th className='px-4 py-3 font-medium'>{t('studentsCountCol')}</th>
              <th className='px-4 py-3 font-medium'>{t('calcMethodUsedCol')}</th>
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
                <td className='px-4 py-4 text-muted'>{formatMoney(r.rateValue)} {t(RATE_UNIT_KEYS[r.rateType])}</td>
                <td className='px-4 py-4 font-mono text-ink'>{formatMoney(r.total)}</td>
                <td className='px-4 py-4'>
                  {r.paid ? (
                    <span className='text-xs font-medium px-2 py-1 rounded-full bg-accent-soft text-accent'>{t('paidBadge')}</span>
                  ) : (
                    <div className='flex flex-col gap-1.5 items-start'>
                      <div className='flex gap-2'>
                        <button onClick={() => { setPayingRow(r); setPayMode('pay'); setPayMethod('cash') }} className='px-3 py-1.5 rounded-lg bg-[#F2542D] text-white text-xs font-medium'>{t('payBtn')}</button>
                        <button onClick={() => { setPayingRow(r); setPayMode('prepay'); setPayMethod('cash') }} className='px-3 py-1.5 rounded-lg bg-bg border border-hairline text-ink text-xs font-medium'>{t('prepayBtn')}</button>
                      </div>
                      {r.prepayments?.length > 0 && (
                        <span className='text-xs text-amber-600'>{t('prepaidHint', { amount: formatMoney(r.prepayments.reduce((s, p) => s + p.amount, 0)) })}</span>
                      )}
                    </div>
                  )}
                </td>
                <td className='px-4 py-4 text-right'>
                  <button onClick={() => openDetails(r)} className='text-accent text-xs font-medium'>{t('detailsBtn')}</button>
                </td>
              </tr>
            ))}
            {!results && (
              <tr><td colSpan={7} className='px-4 py-8 text-center text-muted'>{t('noSalaryResultsYet')}</td></tr>
            )}
            {results && results.length === 0 && (
              <tr><td colSpan={7} className='px-4 py-8 text-center text-muted'>{t('noSalaryResultsYet')}</td></tr>
            )}
          </tbody>
          {results && results.length > 0 && (
            <tfoot>
              <tr className='border-t border-hairline'>
                <td colSpan={4} className='px-4 py-4 text-ink font-medium text-right'>{t('totalToPayLabel')}</td>
                <td colSpan={3} className='px-4 py-4 font-mono text-ink font-medium'>{formatMoney(totalToPay)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {payingRow && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6' onClick={() => setPayingRow(null)}>
          <div className='bg-bg-elevated border border-hairline rounded-2xl p-6 max-w-sm w-full' onClick={e => e.stopPropagation()}>
            <p className='font-display text-lg text-ink mb-1'>{t(payMode === 'prepay' ? 'prepayBtn' : 'payBtn')} — {payingRow.name}</p>
            <p className='font-mono text-2xl text-ink mb-4'>{formatMoney(payingRow.total)}</p>

            {payMode === 'pay' && payingRow.prepayments?.length > 0 && (
              <div className='bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4'>
                <p className='text-amber-700 text-xs font-medium mb-2'>{t('prepaymentWarningTitle')}</p>
                {payingRow.prepayments.map((p, i) => (
                  <p key={i} className='text-amber-700 text-xs'>
                    {formatMoney(p.amount)} · {new Date(p.date).toLocaleDateString()} · {t('expenseMethod_' + p.method)}
                  </p>
                ))}
              </div>
            )}

            <form onSubmit={submitPay} className='flex flex-col gap-3'>
              <div>
                <p className='text-xs text-muted mb-1'>{t('expenseMethodLabel')}</p>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required>
                  {PAYOUT_METHODS.map(m => <option key={m} value={m}>{t('expenseMethod_' + m)}</option>)}
                </select>
              </div>
              <button type='submit' disabled={paying} className='py-2 rounded-lg bg-[#F2542D] text-white text-sm font-medium disabled:opacity-50'>
                {paying ? t('payingBtn') : t(payMode === 'prepay' ? 'prepayBtn' : 'payBtn')}
              </button>
            </form>
          </div>
        </div>
      )}

      {detailRow && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6' onClick={() => { setDetailRow(null); setDetail(null) }}>
          <div className='bg-bg-elevated border border-hairline rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto' onClick={e => e.stopPropagation()}>
            <p className='font-display text-lg text-ink mb-1'>{t('salaryDetailTitle')} — {detailRow.name}</p>
            {loadingDetail && <p className='text-muted text-sm'>{t('loading')}</p>}
            {detail && (
              <>
                <div className='flex items-center gap-4 mb-4'>
                  <p className='font-mono text-2xl text-ink'>{formatMoney(detail.total)}</p>
                  <span className='text-muted text-sm'>{formatMoney(detail.rateValue)} {t(RATE_UNIT_KEYS[detail.rateType])}</span>
                </div>

                <p className='text-ink text-sm font-medium mb-2'>{t('groupsCountCol')} ({detail.groups.length})</p>
                <div className='flex flex-col gap-2 mb-4'>
                  {detail.groups.map(g => (
                    <div key={g.groupId} className='bg-bg rounded-xl px-3 py-2 text-sm flex justify-between flex-wrap gap-1'>
                      <span className='text-ink'>{g.language} · {g.level}</span>
                      <span className='text-muted text-xs'>{g.schedulePattern?.replaceAll('_', '/')} {g.time}{g.room ? ` · ${g.room}` : ''} · {g.studentCount} {t('studentsCountCol')}</span>
                    </div>
                  ))}
                  {detail.groups.length === 0 && <p className='text-muted text-sm'>—</p>}
                </div>

                {detail.revenueEntries.length > 0 && (
                  <>
                    <p className='text-ink text-sm font-medium mb-2'>{t('revenueBreakdownLabel')}</p>
                    <table className='w-full text-xs mb-4'>
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
                            <td className='py-2 text-muted'>{new Date(e.periodStart).toLocaleDateString()} – {new Date(e.periodEnd).toLocaleDateString()}{e.pending ? ` (${t('pendingBadge')})` : ''}</td>
                            <td className='py-2 font-mono text-ink'>{formatMoney(e.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

                {detail.revenueEntries.length === 0 && detail.lessonEntries.length === 0 && !['per_student_month', 'fixed_monthly'].includes(detail.rateType) && (
                  <p className='text-muted text-sm mb-2'>{t('noBreakdownYet')}</p>
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
