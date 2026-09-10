import React from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import PurchasesList from './PurchasesList.jsx'
import PurchaseMaterials from './PurchaseMaterials.jsx'
import PurchaseSellers from './PurchaseSellers.jsx'
import PurchaseDebts from './PurchaseDebts.jsx'

const TAB_VALUES = ['list', 'materials', 'sellers', 'debts']

const Purchases = () => {
  const { t } = useLanguage()
  const { tab } = useParams()
  const navigate = useNavigate()

  const TABS = [
    ['list', t('purchasesTab')],
    ['materials', t('materialsTab')],
    ['sellers', t('sellersTab')],
    ['debts', t('debtsTab')],
  ]

  if (!TAB_VALUES.includes(tab)) return <Navigate to='/purchases/list' replace />

  return (
    <div>
      <div className='flex items-center justify-between mb-6 gap-4'>
        <p className='font-display text-2xl text-ink flex-shrink-0'>{t('navPurchases')}</p>
        <div className='flex overflow-x-auto whitespace-nowrap gap-2 pb-1 -mb-1'>
          {TABS.map(([value, label]) => (
            <button key={value} onClick={() => navigate('/purchases/' + value)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium ${tab === value ? 'bg-accent text-white' : 'bg-bg-elevated border border-hairline text-muted'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'list' && <PurchasesList />}
      {tab === 'materials' && <PurchaseMaterials />}
      {tab === 'sellers' && <PurchaseSellers />}
      {tab === 'debts' && <PurchaseDebts />}
    </div>
  )
}

export default Purchases
