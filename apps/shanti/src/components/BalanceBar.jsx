import React, { useContext } from 'react'
import { Wallet, CreditCard, Landmark } from 'lucide-react'
import { ShantiContext } from '../context/ShantiContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { formatMoney } from '../lib/format.js'

// always-visible real cash position by payment method - a sale's paidAmount plus any debt-collection
// payment is money in, a purchase's paidAmount is money out, regardless of the debt still outstanding
// on either side (see server/controllers/shantiBalanceController.js). Sits at the very top of the app
// on every screen, styled as a row of stat chips rather than a thin text strip.
const BalanceBar = () => {
  const { balance } = useContext(ShantiContext)
  const { t } = useLanguage()

  const items = [
    { key: 'cash', icon: Wallet, label: t('balanceCash'), tone: 'bg-emerald-50 text-emerald-600' },
    { key: 'card', icon: CreditCard, label: t('balanceCard'), tone: 'bg-sky-50 text-sky-600' },
    { key: 'bank_transfer', icon: Landmark, label: t('balanceBankTransfer'), tone: 'bg-violet-50 text-violet-600' },
  ]

  return (
    <div className='w-full bg-bg-elevated border-b border-hairline px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3 sm:gap-6'>
      {items.map(({ key, icon: Icon, label, tone }) => {
        const value = balance ? balance[key] : null
        return (
          <div key={key} className='flex items-center gap-2.5 min-w-0'>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tone}`}>
              <Icon size={19} strokeWidth={1.75} />
            </div>
            <div className='min-w-0'>
              <p className='text-[11px] text-muted leading-tight truncate'>{label}</p>
              <p className={`text-lg font-bold font-mono leading-tight ${balance ? (value < 0 ? 'text-rose-600' : 'text-[#1D1D1F]') : 'text-muted'}`}>
                {balance ? formatMoney(value) : '—'}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default BalanceBar
