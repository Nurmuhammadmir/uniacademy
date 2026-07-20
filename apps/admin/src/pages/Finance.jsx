import React, { useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext.jsx'
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

const Finance = () => {
  const { t } = useLanguage()
  const [tab, setTab] = useState('payments')

  return (
    <div>
      <div className='flex items-center justify-between mb-6'>
        <p className='font-display text-2xl text-ink'>{t('navFinance')}</p>
        <div className='flex gap-2'>
          {TABS.map(([value, key]) => (
            <button key={value} onClick={() => setTab(value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === value ? 'bg-accent text-white' : 'bg-bg-elevated border border-hairline text-muted'}`}>
              {t(key)}
            </button>
          ))}
        </div>
      </div>

      {tab === 'payments' && <FinancePayments />}
      {tab === 'expenses' && <Expenses />}
      {tab === 'salary' && <Salary />}
      {tab === 'ledger' && <Ledger />}
    </div>
  )
}

export default Finance
