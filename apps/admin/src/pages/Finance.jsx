import React, { useContext, useEffect, useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { AdminContext } from '../context/AdminContext.jsx'
import { currentMonthISO, lastDayOfMonthISO } from '../lib/date.js'
import FinancePayments from './FinancePayments.jsx'
import Expenses from './Expenses.jsx'
import Salary from './Salary.jsx'
import Ledger from './Ledger.jsx'

const TABS = [
  ['payments', 'financeTabPayments'],
  ['expenses', 'financeTabExpenses'],
  ['salary', 'financeTabSalary'],
  ['ledger', 'financeTabLedger'],
]
const TAB_VALUES = TABS.map(([value]) => value)

// the active sub-tab lives in the URL (/finance/:tab) instead of local state, so refreshing the
// page (or sharing/bookmarking a link) lands back on whichever tab was open, not always "payments"
const Finance = () => {
  const { t } = useLanguage()
  const { tab } = useParams()
  const navigate = useNavigate()
  const { calculateSalary } = useContext(AdminContext)
  // a silent, always-on check for THIS calendar month - independent of whatever month is picked on
  // the Salary tab itself - so an admin sees at a glance, from any finance tab, that someone still
  // hasn't been paid, instead of only finding out by opening Salary and running the calculator
  const [unpaidCount, setUnpaidCount] = useState(0)

  useEffect(() => {
    const month = currentMonthISO()
    calculateSalary(month + '-01', lastDayOfMonthISO(month)).then(results => {
      if (results) setUnpaidCount(results.filter(r => r.remaining > 0).length)
    })
  }, [])

  if (!TAB_VALUES.includes(tab)) return <Navigate to='/finance/payments' replace />

  const monthLabel = new Date(currentMonthISO() + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div>
      <div className='flex items-center justify-between mb-6 gap-4'>
        <p className='font-display text-2xl text-ink flex-shrink-0'>{t('navFinance')}</p>
        <div className='flex overflow-x-auto whitespace-nowrap gap-2 pb-1 -mb-1'>
          {TABS.map(([value, key]) => (
            <button key={value} onClick={() => navigate('/finance/' + value)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium ${tab === value ? 'bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10' : 'bg-bg-elevated border border-hairline text-muted'}`}>
              {t(key)}
            </button>
          ))}
        </div>
      </div>

      {unpaidCount > 0 && (
        <button onClick={() => navigate('/finance/salary')}
          className='w-full text-left mb-6 flex items-center gap-3 bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 rounded-xl px-4 py-3 transition-colors'>
          <span className='text-amber-600 dark:text-amber-400 text-base flex-shrink-0'>⚠️</span>
          <span className='text-amber-700 dark:text-amber-400 text-sm font-medium'>{t('salaryNotPaidWarning', { count: unpaidCount, month: monthLabel })}</span>
        </button>
      )}

      {tab === 'payments' && <FinancePayments />}
      {tab === 'expenses' && <Expenses />}
      {tab === 'salary' && <Salary />}
      {tab === 'ledger' && <Ledger />}
    </div>
  )
}

export default Finance
