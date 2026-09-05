import React, { useContext, useEffect, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { formatMoney, groupLabel } from '../lib/format.js'
import Spinner from '../components/Spinner.jsx'
import { currentMonthISO, lastDayOfMonthISO, formatUTCDate } from '../lib/date.js'

// kept for every rate TYPE the backend still supports (so an existing rate set before this change
// still renders a real label instead of "undefined"), but the dropdown below only ever OFFERS the
// two confirmed-common ones - per_student_month/per_lesson/per_hour stay valid, just not selectable
// from here going forward
const RATE_UNIT_KEYS = {
  per_student_month: 'rateUnitPerStudentMonth', per_lesson: 'rateUnitPerLesson', per_hour: 'rateUnitPerHour',
  fixed_monthly: 'rateUnitFixedMonthly', percent_of_revenue: 'rateUnitPercentRevenue',
}
const SELECTABLE_RATE_TYPES = ['fixed_monthly', 'percent_of_revenue']
const PAYOUT_METHODS = ['cash', 'card', 'click', 'bank_transfer', 'payme', 'apelsin']

// same calculator as admin's own Salary page, just driven by whichever branchId the Finance page's
// switcher has selected instead of the caller's own home branch
const Salary = ({ branchId }) => {
  const { payRates, getPayRates, setPayRate, deletePayRate, calculateSalary, paySalary, prepaySalary, getSalaryDetail, teachers, allGroups, languages } = useContext(DirectorContext)
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(false)
  const [month, setMonth] = useState(currentMonthISO())
  const dateFrom = month + '-01'
  const dateTo = lastDayOfMonthISO(month)
  const [defaultForm, setDefaultForm] = useState({ rateValue: '', rateType: 'fixed_monthly' })
  // confirmed spec: an individual rate can be scoped three independent ways - to one TEACHER
  // (every group/course they run), to one COURSE (every teacher who runs it), or to one exact
  // GROUP (the most specific, always wins - see salaryCalculation.service.js's resolveRateForGroup
  // for the full precedence order). Only one scope is ever active at a time, never combined.
  const [customForm, setCustomForm] = useState({ scope: 'teacher', teacherId: '', groupId: '', languageId: '', rateValue: '', rateType: 'fixed_monthly' })
  const [results, setResults] = useState(null)
  const [payingRow, setPayingRow] = useState(null)
  const [payMode, setPayMode] = useState('pay')
  const [payMethod, setPayMethod] = useState('cash')
  const [paying, setPaying] = useState(false)
  const [amountMode, setAmountMode] = useState('amount') // 'amount' | 'percent'
  const [payAmount, setPayAmount] = useState('')
  const [payPercent, setPayPercent] = useState('')
  const [detailRow, setDetailRow] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // branchId/additionalBranchIds come back POPULATED (directorController.listTeachers populates
  // both to their branch names) - comparing the populated OBJECT directly against a plain id string
  // via String() was always producing "[object Object]" on one side, so this filter matched nobody,
  // ever. Read the real id off either shape (populated object or a bare string/ObjectId) instead.
  const branchTeachers = teachers.filter(tc => String(tc.branchId?._id || tc.branchId) === String(branchId)
    || (tc.additionalBranchIds || []).some(b => String(b?._id || b) === String(branchId)))
  // "by group" picks the group directly (not teacher-first) - the teacherId a group-scoped rate
  // needs is derived from whichever group gets picked, not chosen separately
  const branchGroupOptions = allGroups.filter(g => String(g.branchId?._id || g.branchId) === String(branchId))

  useEffect(() => { getPayRates(branchId); setResults(null) }, [branchId])

  const defaultRate = payRates.find(r => !r.teacherId && !r.groupId && !r.languageId)
  const overrides = payRates.filter(r => r.teacherId || r.languageId)

  useEffect(() => {
    if (defaultRate) setDefaultForm({ rateValue: defaultRate.rateValue, rateType: defaultRate.rateType })
    else setDefaultForm({ rateValue: '', rateType: 'fixed_monthly' })
  }, [defaultRate?._id])

  const submitDefault = async (e) => {
    e.preventDefault()
    await setPayRate(branchId, { rateType: defaultForm.rateType, rateValue: Number(defaultForm.rateValue) })
  }

  const submitCustom = async (e) => {
    e.preventDefault()
    const payload = { rateType: customForm.rateType, rateValue: Number(customForm.rateValue) }
    if (customForm.scope === 'course') payload.languageId = customForm.languageId
    else {
      payload.teacherId = customForm.teacherId
      if (customForm.scope === 'group') payload.groupId = customForm.groupId
    }
    const ok = await setPayRate(branchId, payload)
    if (ok) setCustomForm({ scope: customForm.scope, teacherId: '', groupId: '', languageId: '', rateValue: '', rateType: 'fixed_monthly' })
  }

  const runCalculate = async () => {
    const data = await calculateSalary(branchId, dateFrom, dateTo)
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
    const ok = await action(branchId, payingRow.teacherId, amount, dateFrom, dateTo, payMethod)
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

  const totalToPay = (results || []).reduce((sum, r) => sum + r.remaining, 0)

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
                    {SELECTABLE_RATE_TYPES.map(val => <option key={val} value={val}>{t(RATE_UNIT_KEYS[val])}</option>)}
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
              <div className='mb-3'>
                <p className='text-xs text-muted mb-1'>{t('calcScopeLabel')}</p>
                <div className='flex gap-1 bg-bg-elevated rounded-lg p-1 w-fit'>
                  {['teacher', 'group', 'course'].map(scope => (
                    <button key={scope} type='button'
                      onClick={() => setCustomForm({ scope, teacherId: '', groupId: '', languageId: '', rateValue: '', rateType: 'fixed_monthly' })}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium ${customForm.scope === scope ? 'bg-accent text-white' : 'text-muted'}`}>
                      {t('calcScope_' + scope)}
                    </button>
                  ))}
                </div>
              </div>
              <form onSubmit={submitCustom} className='flex gap-2 items-end flex-wrap mb-4'>
                {customForm.scope === 'course' ? (
                  <div>
                    <p className='text-xs text-muted mb-1'>{t('selectCourseLabel')}</p>
                    <select value={customForm.languageId} onChange={e => setCustomForm({ ...customForm, languageId: e.target.value })} className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm' required>
                      <option value=''>{t('selectCourseLabel')}</option>
                      {languages.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                    </select>
                  </div>
                ) : customForm.scope === 'group' ? (
                  <div>
                    <p className='text-xs text-muted mb-1'>{t('selectGroupForRateLabel')}</p>
                    <select value={customForm.groupId}
                      onChange={e => {
                        const group = branchGroupOptions.find(g => g._id === e.target.value)
                        setCustomForm({ ...customForm, groupId: e.target.value, teacherId: group?.teacherId?._id || group?.teacherId || '' })
                      }}
                      className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm' required>
                      <option value=''>{t('selectGroupForRateLabel')}</option>
                      {branchGroupOptions.map(g => <option key={g._id} value={g._id}>{groupLabel(g)} · {g.teacherId?.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <p className='text-xs text-muted mb-1'>{t('selectTeacherLabel')}</p>
                    <select value={customForm.teacherId} onChange={e => setCustomForm({ ...customForm, teacherId: e.target.value })} className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm' required>
                      <option value=''>{t('selectTeacherLabel')}</option>
                      {branchTeachers.map(tc => <option key={tc._id} value={tc._id}>{tc.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <p className='text-xs text-muted mb-1'>{t('rateValueLabel')}</p>
                  <input type='number' value={customForm.rateValue} onChange={e => setCustomForm({ ...customForm, rateValue: e.target.value })}
                    className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm w-36' required />
                </div>
                <div>
                  <p className='text-xs text-muted mb-1'>{t('rateUnitLabel')}</p>
                  <select value={customForm.rateType} onChange={e => setCustomForm({ ...customForm, rateType: e.target.value })} className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm'>
                    {SELECTABLE_RATE_TYPES.map(val => <option key={val} value={val}>{t(RATE_UNIT_KEYS[val])}</option>)}
                  </select>
                </div>
                <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('save')}</button>
              </form>

              <div className='hidden md:block overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='text-left text-muted border-b border-hairline'>
                      <th className='py-2 font-medium'>{t('calcScopeLabel')}</th>
                      <th className='py-2 font-medium'>{t('groupCol')}</th>
                      <th className='py-2 font-medium'>{t('teacherCalcMethodCol')}</th>
                      <th className='py-2'></th>
                    </tr>
                  </thead>
                  <tbody>
                    {overrides.map(r => (
                      <tr key={r._id} className='border-b border-hairline last:border-0'>
                        <td className='py-3 text-ink'>{r.languageId ? `${t('calcScope_course')}: ${r.languageId.name}` : r.teacherId?.name}</td>
                        <td className='py-3 text-muted'>{r.languageId ? '—' : (r.groupId ? groupLabel(r.groupId) : t('allGroupsLabel'))}</td>
                        <td className='py-3 text-muted'>{formatMoney(r.rateValue)} {t(RATE_UNIT_KEYS[r.rateType])}</td>
                        <td className='py-3 text-right'><button onClick={() => deletePayRate(branchId, r._id)} className='text-muted text-xs font-medium'>{t('removeBtn')}</button></td>
                      </tr>
                    ))}
                    {overrides.length === 0 && <tr><td colSpan={4} className='py-4 text-center text-muted'>—</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className='flex md:hidden flex-col gap-2'>
                {overrides.length === 0 && <p className='text-muted text-sm text-center py-3'>—</p>}
                {overrides.map(r => (
                  <div key={r._id} className='bg-bg rounded-xl p-3 flex justify-between items-center gap-2'>
                    <div className='min-w-0'>
                      <p className='text-ink text-sm font-medium truncate'>{r.languageId ? `${t('calcScope_course')}: ${r.languageId.name}` : r.teacherId?.name}</p>
                      <p className='text-muted text-xs mt-0.5'>{r.languageId ? '' : (r.groupId ? groupLabel(r.groupId) : t('allGroupsLabel')) + ' · '}{formatMoney(r.rateValue)} {t(RATE_UNIT_KEYS[r.rateType])}</p>
                    </div>
                    <button onClick={() => deletePayRate(branchId, r._id)} className='text-muted text-xs font-medium flex-shrink-0'>{t('removeBtn')}</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className='hidden md:block bg-bg-elevated border border-hairline rounded-2xl overflow-hidden overflow-x-auto'>
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
                <td className='px-4 py-4 text-muted'>{r.rateType === 'mixed' ? <span className='italic'>{t('mixedRatesLabel')}</span> : `${formatMoney(r.rateValue)} ${t(RATE_UNIT_KEYS[r.rateType])}`}</td>
                <td className='px-4 py-4'>
                  <p className='font-mono text-ink'>{formatMoney(r.total)}</p>
                  {r.paidAmount > 0 && (
                    <p className='text-[11px] text-muted mt-1'>{t('alreadyPaidLabel')}: {formatMoney(r.paidAmount)}</p>
                  )}
                </td>
                <td className='px-4 py-4'>
                  {r.remaining <= 0 ? (
                    <span className='text-xs font-medium px-2 py-1 rounded-full bg-accent-soft text-accent'>{t('paidBadge')}</span>
                  ) : (
                    <div className='flex flex-col gap-1.5 items-start'>
                      {r.paidAmount > 0 && (
                        <span className='text-xs text-amber-600'>{t('remainingToPayLabel')}: {formatMoney(r.remaining)}</span>
                      )}
                      <div className='flex gap-2'>
                        <button onClick={() => openPay(r, 'pay')} className='px-3 py-1.5 rounded-lg bg-[#F2542D] text-white text-xs font-medium'>{t('payBtn')}</button>
                        <button onClick={() => openPay(r, 'prepay')} className='px-3 py-1.5 rounded-lg bg-bg border border-hairline text-ink text-xs font-medium'>{t('prepayBtn')}</button>
                      </div>
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

      <div className='block md:hidden flex flex-col gap-2.5'>
        {!results && <p className='text-muted text-sm text-center py-8'>{t('noSalaryResultsYet')}</p>}
        {results && results.length === 0 && <p className='text-muted text-sm text-center py-8'>{t('noSalaryResultsYet')}</p>}
        {(results || []).map(r => (
          <div key={r.teacherId} className='bg-bg-elevated border border-hairline rounded-2xl p-4'>
            <div className='flex justify-between items-start gap-2'>
              <div className='min-w-0'>
                <p className='text-ink font-medium text-sm truncate'>{r.name}</p>
                <p className='text-muted text-xs mt-0.5'>{r.groupCount} {t('groupsCountCol')} · {r.studentCount} {t('studentsCountCol')}</p>
              </div>
              <button onClick={() => openDetails(r)} className='text-accent text-xs font-medium flex-shrink-0'>{t('detailsBtn')}</button>
            </div>
            <p className='text-xs text-muted mt-2'>{r.rateType === 'mixed' ? <span className='italic'>{t('mixedRatesLabel')}</span> : `${formatMoney(r.rateValue)} ${t(RATE_UNIT_KEYS[r.rateType])}`}</p>
            <div className='flex justify-between items-end mt-2.5 pt-2.5 border-t border-hairline'>
              <div>
                <p className='font-mono text-ink text-base'>{formatMoney(r.total)}</p>
                {r.paidAmount > 0 && <p className='text-[11px] text-muted mt-0.5'>{t('alreadyPaidLabel')}: {formatMoney(r.paidAmount)}</p>}
              </div>
              {r.remaining <= 0 ? (
                <span className='text-xs font-medium px-2 py-1 rounded-full bg-accent-soft text-accent'>{t('paidBadge')}</span>
              ) : (
                <div className='flex flex-col gap-1.5 items-end'>
                  {r.paidAmount > 0 && <span className='text-xs text-amber-600'>{t('remainingToPayLabel')}: {formatMoney(r.remaining)}</span>}
                  <div className='flex gap-2'>
                    <button onClick={() => openPay(r, 'pay')} className='px-3 py-1.5 rounded-lg bg-[#F2542D] text-white text-xs font-medium'>{t('payBtn')}</button>
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
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6' onClick={() => setPayingRow(null)}>
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
                  <div className='flex gap-1 bg-bg rounded-lg p-1 mb-2'>
                    <button type='button' onClick={() => setAmountMode('amount')} className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium ${amountMode === 'amount' ? 'bg-bg-elevated text-ink shadow-sm' : 'text-muted'}`}>{t('prepayModeAmount')}</button>
                    <button type='button' onClick={() => setAmountMode('percent')} className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium ${amountMode === 'percent' ? 'bg-bg-elevated text-ink shadow-sm' : 'text-muted'}`}>{t('prepayModePercent')}</button>
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
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required>
                  {PAYOUT_METHODS.map(m => <option key={m} value={m}>{t('expenseMethod_' + m)}</option>)}
                </select>
              </div>
              <button type='submit' disabled={paying} className='py-2 rounded-lg bg-[#F2542D] text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2'>
                {paying && <Spinner size={14} />} {paying ? t('payingBtn') : t(payMode === 'prepay' ? 'prepayBtn' : 'payBtn')}
              </button>
            </form>
          </div>
        </div>
      )}

      {detailRow && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6' onClick={() => { setDetailRow(null); setDetail(null) }}>
          <div className='bg-bg-elevated border border-hairline rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto' onClick={e => e.stopPropagation()}>
            <p className='font-display text-lg text-ink mb-1'>{t('salaryDetailTitle')} — {detailRow.name}</p>
            {loadingDetail && <p className='text-muted text-sm flex items-center gap-2'><Spinner size={14} />{t('loading')}</p>}
            {detail && (
              <>
                <div className='flex items-center gap-4 mb-4'>
                  <p className='font-mono text-2xl text-ink'>{formatMoney(detail.total)}</p>
                  {detail.rateType !== 'mixed' && <span className='text-muted text-sm'>{formatMoney(detail.rateValue)} {t(RATE_UNIT_KEYS[detail.rateType])}</span>}
                </div>

                <p className='text-ink text-sm font-medium mb-2'>{t('groupsCountCol')} ({detail.groups.length})</p>
                <div className='flex flex-col gap-2 mb-4'>
                  {detail.groups.map(g => (
                    <div key={g.groupId} className='bg-bg rounded-xl px-3 py-2 text-sm'>
                      <div className='flex justify-between flex-wrap gap-1'>
                        <span className='text-ink'>{g.language} · {g.level}</span>
                        <span className='text-muted text-xs'>{g.schedulePattern?.replaceAll('_', '/')} {g.time}{g.room ? ` · ${g.room}` : ''} · {g.studentCount} {t('studentsCountCol')}</span>
                      </div>
                      <div className='flex justify-between mt-1'>
                        <span className='text-muted text-xs'>{g.rateType ? `${formatMoney(g.rateValue)} ${t(RATE_UNIT_KEYS[g.rateType])}` : '—'}</span>
                        <span className='font-mono text-accent text-xs'>{formatMoney(g.total)}</span>
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
                        <span key={i} className='text-xs font-mono bg-bg px-2 py-1 rounded-lg text-muted'>{new Date(e.date).toLocaleDateString('en-GB')} · {e.language}</span>
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
