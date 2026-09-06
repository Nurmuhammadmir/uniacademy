import React from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import SalesList from './SalesList.jsx'
import SalesClients from './SalesClients.jsx'
import SalesProducts from './SalesProducts.jsx'
import SalesDebtors from './SalesDebtors.jsx'

const TABS = [
  ['list', 'Продажи'],
  ['clients', 'Клиенты'],
  ['products', 'Товары'],
  ['debtors', 'Должники'],
]
const TAB_VALUES = TABS.map(([value]) => value)

const Sales = () => {
  const { tab } = useParams()
  const navigate = useNavigate()

  if (!TAB_VALUES.includes(tab)) return <Navigate to='/sales/list' replace />

  return (
    <div>
      <div className='flex items-center justify-between mb-6 gap-4'>
        <p className='font-display text-2xl text-ink flex-shrink-0'>Продажи</p>
        <div className='flex overflow-x-auto whitespace-nowrap gap-2 pb-1 -mb-1'>
          {TABS.map(([value, label]) => (
            <button key={value} onClick={() => navigate('/sales/' + value)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium ${tab === value ? 'bg-accent text-white' : 'bg-bg-elevated border border-hairline text-muted'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'list' && <SalesList />}
      {tab === 'clients' && <SalesClients />}
      {tab === 'products' && <SalesProducts />}
      {tab === 'debtors' && <SalesDebtors />}
    </div>
  )
}

export default Sales
