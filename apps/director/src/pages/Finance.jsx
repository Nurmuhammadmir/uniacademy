import React, { useContext, useEffect, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import FinancePayments from './FinancePayments.jsx'
import Salary from './Salary.jsx'
import Ledger from './Ledger.jsx'

const TABS = [
  ['payments', 'financeTabPayments'],
  ['salary', 'financeTabSalary'],
  ['ledger', 'financeTabLedger'],
]

// director oversees every branch, unlike admin (who is scoped to their own) - a branch must be
// explicitly picked here before any Finance data can load, same pattern already used by the
// director Timetable page for the same reason
const Finance = () => {
  const { branches, getBranches } = useContext(DirectorContext)
  const { t } = useLanguage()
  const [tab, setTab] = useState('payments')
  const [branchId, setBranchId] = useState('')

  useEffect(() => { getBranches() }, [])
  useEffect(() => {
    if (!branchId && branches.length > 0) setBranchId(branches[0]._id)
  }, [branches])

  return (
    <div>
      <div className='flex items-center justify-between mb-6 flex-wrap gap-3'>
        <p className='font-display text-2xl text-ink'>{t('navFinance')}</p>
        <div className='flex items-center gap-3 flex-wrap'>
          <select value={branchId} onChange={e => setBranchId(e.target.value)} className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm font-medium'>
            {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
          <div className='flex gap-2'>
            {TABS.map(([value, key]) => (
              <button key={value} onClick={() => setTab(value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === value ? 'bg-accent text-white' : 'bg-bg-elevated border border-hairline text-muted'}`}>
                {t(key)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!branchId ? (
        <p className='text-muted text-sm'>{t('noBranchesYet')}</p>
      ) : (
        <>
          {tab === 'payments' && <FinancePayments branchId={branchId} />}
          {tab === 'salary' && <Salary branchId={branchId} />}
          {tab === 'ledger' && <Ledger branchId={branchId} />}
        </>
      )}
    </div>
  )
}

export default Finance
