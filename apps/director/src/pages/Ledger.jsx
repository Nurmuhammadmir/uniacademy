import React, { useContext, useEffect, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { formatMoney, paymentMethodLabelKey } from '../lib/format.js'
import { firstOfMonthISO, todayISO } from '../lib/date.js'

const EXPENSE_METHOD_LABEL = { cash: 'expenseMethod_cash', card: 'expenseMethod_card', click: 'expenseMethod_click', bank_transfer: 'expenseMethod_bank_transfer', payme: 'expenseMethod_payme', apelsin: 'expenseMethod_apelsin' }

// the whole-branch "every financial operation" view (payments received AND expenses/salary paid
// out) for whichever branch the Finance page's switcher has selected - director's read-only
// counterpart of admin's own BusinessLedger section (student-statement/reconciliation drill-down
// stays admin-only, this is the branch-wide cash position only)
const Ledger = ({ branchId }) => {
  const { getBusinessLedger } = useContext(DirectorContext)
  const { t } = useLanguage()
  const [dateFrom, setDateFrom] = useState(firstOfMonthISO())
  const [dateTo, setDateTo] = useState(todayISO())
  const [data, setData] = useState(null)
  const [methodFilter, setMethodFilter] = useState(null)

  useEffect(() => { setData(null); getBusinessLedger(branchId, { dateFrom, dateTo }).then(d => { if (d) setData(d) }) }, [branchId, dateFrom, dateTo])

  const methodLabel = (m) => t(EXPENSE_METHOD_LABEL[m] || m)
  const toggleMethodFilter = (m) => setMethodFilter(cur => cur === m ? null : m)
  const visibleEntries = data ? (methodFilter ? data.entries.filter(e => e.method === methodFilter) : data.entries) : []

  return (
    <div className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
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

export default Ledger
