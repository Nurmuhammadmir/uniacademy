import React, { useContext, useEffect, useMemo, useState } from 'react'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { formatMoney, paymentMethodLabelKey, groupLabel } from '../lib/format.js'
import { firstOfMonthISO, todayISO } from '../lib/date.js'

const EXPENSE_METHOD_LABEL = { cash: 'expenseMethod_cash', card: 'expenseMethod_card', click: 'expenseMethod_click', bank_transfer: 'expenseMethod_bank_transfer', payme: 'expenseMethod_payme', apelsin: 'expenseMethod_apelsin' }

// the whole-business "every financial operation" view - every payment received AND every expense
// paid out (rent, marketing, salary, refunds, everything), one chronological timeline, running
// balance - not scoped to a single student, this is the branch's own cash position
const BusinessLedger = ({ t }) => {
  const { getBusinessLedger } = useContext(AdminContext)
  const [dateFrom, setDateFrom] = useState(firstOfMonthISO())
  const [dateTo, setDateTo] = useState(todayISO())
  const [data, setData] = useState(null)
  const [methodFilter, setMethodFilter] = useState(null)

  useEffect(() => { getBusinessLedger({ dateFrom, dateTo }).then(d => { if (d) setData(d) }) }, [dateFrom, dateTo])

  const methodLabel = (m) => t(EXPENSE_METHOD_LABEL[m] || m)
  const toggleMethodFilter = (m) => setMethodFilter(cur => cur === m ? null : m)
  const visibleEntries = data ? (methodFilter ? data.entries.filter(e => e.method === methodFilter) : data.entries) : []

  return (
    <div className='bg-bg-elevated border border-hairline rounded-2xl p-5 mb-8'>
      <p className='text-ink font-medium mb-3'>{t('businessLedgerSectionTitle')}</p>
      <div className='flex flex-wrap gap-3 items-end mb-4'>
        <div>
          <p className='text-xs text-muted mb-1'>{t('dateFromLabel')}</p>
          <input type='date' value={dateFrom} onChange={e => setDateFrom(e.target.value)} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
        </div>
        <div>
          <p className='text-xs text-muted mb-1'>{t('dateToLabel')}</p>
          <input type='date' value={dateTo} onChange={e => setDateTo(e.target.value)} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
        </div>
      </div>

      {!data ? <p className='text-muted text-sm'>{t('loading')}</p> : (
        <>
          <div className='grid grid-cols-4 gap-4 mb-4'>
            <div className='bg-bg rounded-xl p-3'>
              <p className='text-muted text-xs mb-1'>{t('openingBalanceLabel')}</p>
              <p className='font-mono text-ink'>{formatMoney(data.openingBalance)}</p>
            </div>
            <div className='bg-bg rounded-xl p-3'>
              <p className='text-muted text-xs mb-1'>{t('totalInLabel')}</p>
              <p className='font-mono text-accent'>+{formatMoney(data.totalIn)}</p>
            </div>
            <div className='bg-bg rounded-xl p-3'>
              <p className='text-muted text-xs mb-1'>{t('totalOutLabel')}</p>
              <p className='font-mono text-red-500'>-{formatMoney(data.totalOut)}</p>
            </div>
            <div className='bg-bg rounded-xl p-3'>
              <p className='text-muted text-xs mb-1'>{t('closingBalanceLabel')}</p>
              <p className='font-mono text-ink'>{formatMoney(data.closingBalance)}</p>
            </div>
          </div>

          <p className='text-ink font-medium mb-2'>{t('paymentMethodAccountsTitle')}</p>
          <div className='grid grid-cols-3 md:grid-cols-6 gap-3 mb-4'>
            {data.byMethod.map(m => (
              <button key={m.method} onClick={() => toggleMethodFilter(m.method)}
                className={`text-left rounded-xl p-3 ${methodFilter === m.method ? 'bg-accent text-white' : 'bg-bg text-ink'}`}>
                <p className={`text-xs mb-1 ${methodFilter === m.method ? 'text-white/80' : 'text-muted'}`}>{methodLabel(m.method)}</p>
                <p className='font-mono text-sm'>{formatMoney(m.balance)}</p>
              </button>
            ))}
          </div>

          {methodFilter && (
            <p className='text-muted text-xs mb-2'>{t('methodHistoryHint', { method: methodLabel(methodFilter) })} <button onClick={() => setMethodFilter(null)} className='text-accent'>{t('clearFilters')}</button></p>
          )}

          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='text-left text-muted border-b border-hairline'>
                  <th className='px-3 py-2 font-medium'>{t('dateCol')}</th>
                  <th className='px-3 py-2 font-medium'>{t('operationTypeCol')}</th>
                  <th className='px-3 py-2 font-medium'>{t('categoryLabel')}</th>
                  <th className='px-3 py-2 font-medium'>{t('basisCol')}</th>
                  <th className='px-3 py-2 font-medium text-right'>{t('amountCol')}</th>
                  <th className='px-3 py-2 font-medium text-right'>{t('balanceAfterCol')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleEntries.map((e, i) => (
                  <tr key={i} className='border-b border-hairline last:border-0'>
                    <td className='px-3 py-2.5 text-muted whitespace-nowrap'>{new Date(e.date).toLocaleDateString()}</td>
                    <td className='px-3 py-2.5'>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${e.type === 'credit' ? 'bg-accent-soft text-accent' : 'bg-hairline text-muted'}`}>
                        {e.type === 'credit' ? t('creditType') : t('debitType')}
                      </span>
                    </td>
                    <td className='px-3 py-2.5 text-ink text-xs'>{e.category}</td>
                    <td className='px-3 py-2.5 text-ink text-xs'>
                      {e.description}
                      {e.type === 'credit' && e.refunded && ` · ${t('refundedBadge')}`}
                      {e.type === 'debit' && e.teacherName && ` · ${e.teacherName}`}
                      {e.method && ` · ${t(e.type === 'credit' ? paymentMethodLabelKey(e.method) : (EXPENSE_METHOD_LABEL[e.method] || e.method))}`}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono ${e.type === 'credit' ? 'text-accent' : 'text-red-500'}`}>
                      {e.type === 'credit' ? '+' : '-'}{formatMoney(e.amount)}
                    </td>
                    <td className='px-3 py-2.5 text-right font-mono text-ink'>{formatMoney(e.balanceAfter)}</td>
                  </tr>
                ))}
                {visibleEntries.length === 0 && (
                  <tr><td colSpan={6} className='px-3 py-6 text-center text-muted'>{t('noLedgerEntriesYet')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

const STATUS_STYLE = {
  owes: 'bg-red-500/10 text-red-600',
  credit: 'bg-accent-soft text-accent',
  settled: 'bg-hairline text-muted',
}

const StatusBadge = ({ status, owed, balance, t }) => (
  <span className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_STYLE[status]}`}>
    {status === 'owes' ? t('statusOwes', { amount: formatMoney(owed) })
      : status === 'credit' ? t('statusCredit', { amount: formatMoney(balance) })
      : t('statusSettled')}
  </span>
)

// one course's chronological Debit/Credit ledger - date / type / amount / basis / running balance,
// same shape as a bank statement's было-приход-расход-стало columns. Only Credit (Payment) rows are
// deletable - Debit rows are computed proration chunks, not real documents, so there's nothing to
// delete there; deleting the payment that produced them removes them from the replay automatically.
const CourseStatement = ({ course, onDeletePayment, t }) => (
  <div className='bg-bg-elevated border border-hairline rounded-2xl p-5 mb-4'>
    <div className='flex justify-between items-center mb-3'>
      <p className='text-ink font-medium'>{course.languageName}{course.levelName ? ` · ${course.levelName}` : ''}</p>
      <StatusBadge status={course.status} owed={course.owed} balance={course.balance} t={t} />
    </div>
    {course.price == null && <p className='text-muted text-sm mb-2'>{t('noLevelPricedYet')}</p>}
    <div className='overflow-x-auto'>
      <table className='w-full text-sm'>
        <thead>
          <tr className='text-left text-muted border-b border-hairline'>
            <th className='px-3 py-2 font-medium'>{t('dateCol')}</th>
            <th className='px-3 py-2 font-medium'>{t('operationTypeCol')}</th>
            <th className='px-3 py-2 font-medium'>{t('basisCol')}</th>
            <th className='px-3 py-2 font-medium text-right'>{t('amountCol')}</th>
            <th className='px-3 py-2 font-medium text-right'>{t('balanceAfterCol')}</th>
            <th className='px-3 py-2 font-medium'></th>
          </tr>
        </thead>
        <tbody>
          {course.entries.map((e, i) => (
            <tr key={i} className='border-b border-hairline last:border-0'>
              <td className='px-3 py-2.5 text-muted'>{new Date(e.date).toLocaleDateString()}</td>
              <td className='px-3 py-2.5'>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${e.type === 'credit' ? 'bg-accent-soft text-accent' : 'bg-hairline text-muted'}`}>
                  {e.type === 'credit' ? t('creditType') : t('debitType')}
                </span>
              </td>
              <td className='px-3 py-2.5 text-ink text-xs'>
                {e.type === 'credit'
                  ? `${t(paymentMethodLabelKey(e.method))}${e.refunded ? ` · ${t('refundedBadge')}` : e.refundedAmount > 0 ? ` · ${t('refundedAmountHint', { amount: formatMoney(e.refundedAmount) })}` : ''}`
                  : `${new Date(e.periodStart).toLocaleDateString()}–${new Date(e.periodEnd).toLocaleDateString()}`}
              </td>
              <td className={`px-3 py-2.5 text-right font-mono ${e.type === 'credit' ? 'text-accent' : 'text-red-500'}`}>
                {e.type === 'credit' ? '+' : '-'}{formatMoney(e.amount)}
              </td>
              <td className='px-3 py-2.5 text-right font-mono text-ink'>{formatMoney(e.balanceAfter)}</td>
              <td className='px-3 py-2.5 text-right no-print'>
                {e.type === 'credit' && (
                  <button onClick={() => onDeletePayment(e.paymentId)} className='px-2.5 py-1 rounded-lg bg-bg border border-hairline text-muted text-xs font-medium'>
                    {t('deleteBtn')}
                  </button>
                )}
              </td>
            </tr>
          ))}
          {course.entries.length === 0 && (
            <tr><td colSpan={6} className='px-3 py-6 text-center text-muted'>{t('noLedgerEntriesYet')}</td></tr>
          )}
          {course.pendingCharge && (
            <tr className='bg-red-500/5'>
              <td className='px-3 py-2.5 text-muted'>{new Date(course.pendingCharge.periodStart).toLocaleDateString()}</td>
              <td className='px-3 py-2.5'><span className='text-xs font-medium px-2 py-1 rounded-full bg-red-500/10 text-red-600'>{t('pendingType')}</span></td>
              <td className='px-3 py-2.5 text-ink text-xs'>
                {new Date(course.pendingCharge.periodStart).toLocaleDateString()}–{new Date(course.pendingCharge.periodEnd).toLocaleDateString()}
                {' '}{t('daysOfLabel', { days: course.pendingCharge.daysRemaining, total: course.pendingCharge.daysInMonth })}
              </td>
              <td className='px-3 py-2.5 text-right font-mono text-red-500'>-{formatMoney(course.pendingCharge.amount)}</td>
              <td className='px-3 py-2.5 text-right font-mono text-red-500'>{course.pendingCharge.amountStillNeeded > 0 ? `-${formatMoney(course.pendingCharge.amountStillNeeded)}` : formatMoney(0)}</td>
              <td className='px-3 py-2.5'></td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
)

const Ledger = () => {
  const { students, groups, getStudentStatement, getReconciliation, deletePayment } = useContext(AdminContext)
  const { t } = useLanguage()

  const [studentSearch, setStudentSearch] = useState('')
  const [statementStudentId, setStatementStudentId] = useState('')
  const [statement, setStatement] = useState(null)
  const [loadingStatement, setLoadingStatement] = useState(false)

  const [scope, setScope] = useState('student')
  const [reconStudentId, setReconStudentId] = useState('')
  const [reconGroupId, setReconGroupId] = useState('')
  const [dateFrom, setDateFrom] = useState(firstOfMonthISO())
  const [dateTo, setDateTo] = useState(todayISO())
  const [reconciliation, setReconciliation] = useState(null)
  const [loadingRecon, setLoadingRecon] = useState(false)

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    if (!q) return students
    return students.filter(s => s.name?.toLowerCase().includes(q) || s.phone?.includes(q))
  }, [students, studentSearch])

  const openStatement = async (studentId) => {
    setStatementStudentId(studentId)
    setStatement(null)
    setLoadingStatement(true)
    const data = await getStudentStatement(studentId)
    setLoadingStatement(false)
    if (data) setStatement(data)
  }

  const onDeletePayment = async (paymentId) => {
    const ok = await deletePayment(paymentId)
    if (ok) openStatement(statementStudentId)
  }

  const runReconciliation = async () => {
    if (scope === 'student' && !reconStudentId) return
    if (scope === 'group' && !reconGroupId) return
    setLoadingRecon(true)
    setReconciliation(null)
    const data = await getReconciliation({ scope, studentId: reconStudentId, groupId: reconGroupId, dateFrom, dateTo })
    setLoadingRecon(false)
    if (data) setReconciliation(data)
  }

  return (
    <div>
      <p className='font-display text-2xl text-ink mb-6'>{t('ledgerTitle')}</p>

      {/* ==== Business Ledger (all financial operations - payments AND expenses/salary) ==== */}
      <BusinessLedger t={t} />

      {/* ==== Student Statement (лицевой счёт) ==== */}
      <div className='grid grid-cols-3 gap-6 mb-8'>
        <div className='col-span-1 bg-bg-elevated border border-hairline rounded-2xl p-4 max-h-[60vh] overflow-y-auto'>
          <p className='text-ink font-medium mb-2'>{t('statementSectionTitle')}</p>
          <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder={t('searchByNameOrPhone')}
            className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm mb-3' />
          <div className='flex flex-col gap-2'>
            {filteredStudents.map(s => (
              <button key={s._id} onClick={() => openStatement(s._id)}
                className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium ${statementStudentId === s._id ? 'bg-accent-soft text-accent' : 'bg-bg border border-hairline text-ink'}`}>
                {s.name}
              </button>
            ))}
            {filteredStudents.length === 0 && <p className='text-muted text-sm'>{t('noStudentsYet')}</p>}
          </div>
        </div>

        <div className='col-span-2'>
          {!statementStudentId ? (
            <p className='text-muted text-sm'>{t('selectPersonHint')}</p>
          ) : loadingStatement || !statement ? (
            <p className='text-muted text-sm'>{t('loading')}</p>
          ) : (
            <div>
              <p className='text-ink font-medium mb-3'>{statement.studentName} <span className='text-muted text-xs font-mono'>{statement.studentPhone}</span></p>
              {statement.courses.map(c => <CourseStatement key={String(c.languageId)} course={c} onDeletePayment={onDeletePayment} t={t} />)}
              {statement.courses.length === 0 && <p className='text-muted text-sm'>{t('noCoursesYetPlain')}</p>}
            </div>
          )}
        </div>
      </div>

      {/* ==== Reconciliation (Акт сверки) ==== */}
      <div className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
        <p className='text-ink font-medium mb-3'>{t('reconciliationSectionTitle')}</p>
        <div className='flex flex-wrap gap-3 items-end mb-4 no-print'>
          <div className='flex gap-2'>
            {[['student', 'scopeStudent'], ['group', 'scopeGroup'], ['branch', 'scopeBranch']].map(([key, labelKey]) => (
              <button key={key} onClick={() => setScope(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${scope === key ? 'bg-accent text-white' : 'bg-bg border border-hairline text-muted'}`}>
                {t(labelKey)}
              </button>
            ))}
          </div>
          {scope === 'student' && (
            <select value={reconStudentId} onChange={e => setReconStudentId(e.target.value)} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm'>
              <option value=''>{t('selectStudent')}</option>
              {students.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          )}
          {scope === 'group' && (
            <select value={reconGroupId} onChange={e => setReconGroupId(e.target.value)} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm'>
              <option value=''>{t('selectGroupLabel')}</option>
              {groups.map(g => <option key={g._id} value={g._id}>{groupLabel(g)}{g.name ? ` (${g.languageId?.name} · ${g.levelId?.name} · ${g.teacherId?.name})` : ` · ${g.teacherId?.name}`}</option>)}
            </select>
          )}
          <div>
            <p className='text-xs text-muted mb-1'>{t('dateFromLabel')}</p>
            <input type='date' value={dateFrom} onChange={e => setDateFrom(e.target.value)} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('dateToLabel')}</p>
            <input type='date' value={dateTo} onChange={e => setDateTo(e.target.value)} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
          </div>
          <button onClick={runReconciliation} className='px-5 py-2 rounded-lg bg-[#F2542D] text-white text-sm font-medium'>{t('runReconciliationBtn')}</button>
          {reconciliation && (
            <button onClick={() => window.print()} className='px-4 py-2 rounded-lg bg-bg border border-hairline text-muted text-sm font-medium'>{t('printBtn')}</button>
          )}
        </div>

        {loadingRecon && <p className='text-muted text-sm'>{t('loading')}</p>}

        {reconciliation && (
          <div className='print-area'>
            <p className='text-muted text-xs mb-3'>{t('reconciliationPeriodLabel', { from: dateFrom, to: dateTo })}</p>

            <div className='grid grid-cols-4 gap-4 mb-4'>
              <div className='bg-bg rounded-xl p-3'>
                <p className='text-muted text-xs mb-1'>{t('openingBalanceLabel')}</p>
                <p className='font-mono text-ink'>{formatMoney(reconciliation.totals.openingBalance)}</p>
              </div>
              <div className='bg-bg rounded-xl p-3'>
                <p className='text-muted text-xs mb-1'>{t('totalChargesLabel')}</p>
                <p className='font-mono text-red-500'>-{formatMoney(reconciliation.totals.charges)}</p>
              </div>
              <div className='bg-bg rounded-xl p-3'>
                <p className='text-muted text-xs mb-1'>{t('totalPaymentsAmount')}</p>
                <p className='font-mono text-accent'>+{formatMoney(reconciliation.totals.payments)}</p>
              </div>
              <div className='bg-bg rounded-xl p-3'>
                <p className='text-muted text-xs mb-1'>{t('closingBalanceLabel')}</p>
                <p className='font-mono text-ink'>{formatMoney(reconciliation.totals.closingBalance)}</p>
              </div>
            </div>

            {reconciliation.totals.owed > 0 && (
              <p className='text-red-600 text-sm font-medium mb-3'>{t('discrepancyWarning', { amount: formatMoney(reconciliation.totals.owed) })}</p>
            )}

            {reconciliation.groupRevenue && (
              <div className='bg-bg rounded-xl p-4 mb-4'>
                <p className='text-ink font-medium mb-2'>{t('groupRevenueTitle')}</p>
                <div className='flex justify-between text-sm mb-1'>
                  <span className='text-muted'>{t('collectedFromStudentsLabel')}</span>
                  <span className='font-mono text-accent'>+{formatMoney(reconciliation.groupRevenue.totalRevenue)}</span>
                </div>
                {reconciliation.groupRevenue.teacherSalary && (
                  <div className='flex justify-between text-sm'>
                    <span className='text-muted'>{t('teacherSalaryLabel', { name: reconciliation.groupRevenue.teacherName })}</span>
                    <span className='font-mono text-ink'>{formatMoney(reconciliation.groupRevenue.teacherSalary.total)}{reconciliation.groupRevenue.teacherSalary.paid ? ` · ${t('paidBadge')}` : ''}</span>
                  </div>
                )}
                <p className='text-muted text-[11px] mt-2'>{t('groupRevenueNote')}</p>
              </div>
            )}

            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='text-left text-muted border-b border-hairline'>
                    <th className='px-3 py-2 font-medium'>{t('studentCol')}</th>
                    <th className='px-3 py-2 font-medium'>{t('courseCol')}</th>
                    <th className='px-3 py-2 font-medium text-right'>{t('openingBalanceLabel')}</th>
                    <th className='px-3 py-2 font-medium text-right'>{t('totalChargesLabel')}</th>
                    <th className='px-3 py-2 font-medium text-right'>{t('totalPaymentsAmount')}</th>
                    <th className='px-3 py-2 font-medium text-right'>{t('closingBalanceLabel')}</th>
                    <th className='px-3 py-2 font-medium'>{t('statusCol')}</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliation.rows.map((r, i) => (
                    <tr key={i} className={`border-b border-hairline last:border-0 ${r.discrepancy ? 'bg-red-500/5' : ''}`}>
                      <td className='px-3 py-2.5 text-ink'>{r.studentName}</td>
                      <td className='px-3 py-2.5 text-muted text-xs'>{r.levelId ? t('courseWithLevel') : t('noLevelYet')}</td>
                      <td className='px-3 py-2.5 text-right font-mono'>{formatMoney(r.openingBalance)}</td>
                      <td className='px-3 py-2.5 text-right font-mono text-red-500'>-{formatMoney(r.charges)}</td>
                      <td className='px-3 py-2.5 text-right font-mono text-accent'>+{formatMoney(r.payments)}</td>
                      <td className='px-3 py-2.5 text-right font-mono'>{formatMoney(r.closingBalance)}</td>
                      <td className='px-3 py-2.5'>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${r.discrepancy ? 'bg-red-500/10 text-red-600' : 'bg-accent-soft text-accent'}`}>
                          {r.discrepancy ? t('discrepancyBadge', { amount: formatMoney(r.owed) }) : t('reconciledBadge')}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {reconciliation.rows.length === 0 && (
                    <tr><td colSpan={7} className='px-3 py-6 text-center text-muted'>{t('noLedgerEntriesYet')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Ledger
