import React, { useContext, useEffect, useState } from 'react'
import { ShantiContext } from '../context/ShantiContext.jsx'
import { formatMoney } from '../lib/format.js'

const SalesDebtors = () => {
  const { getSalesDebtors } = useContext(ShantiContext)
  const [data, setData] = useState(null)

  useEffect(() => { getSalesDebtors().then(d => { if (d) setData(d) }) }, [])

  const totalDebt = (data?.debtors || []).reduce((sum, d) => sum + d.totalDebt, 0)

  return (
    <div>
      <div className='bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 mb-4 inline-block'>
        <p className='text-amber-700 text-[11px]'>Общий долг клиентов</p>
        <p className='font-bold tracking-tight text-lg text-amber-700'>{data ? formatMoney(totalDebt) : '—'}</p>
      </div>

      <div className='bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-4 py-3 font-medium'>Клиент</th>
              <th className='px-4 py-3 font-medium'>Телефон</th>
              <th className='px-4 py-3 font-medium'>Категория</th>
              <th className='px-4 py-3 font-medium'>Продаж с долгом</th>
              <th className='px-4 py-3 font-medium'>Долг</th>
            </tr>
          </thead>
          <tbody>
            {(data?.debtors || []).map(d => (
              <tr key={d.clientId} className='border-b border-hairline last:border-0 bg-amber-50/40'>
                <td className='px-4 py-3 text-ink font-medium'>{d.name}</td>
                <td className='px-4 py-3 text-muted'>{d.phone || '—'}</td>
                <td className='px-4 py-3 text-muted'>{d.category}</td>
                <td className='px-4 py-3 text-muted'>{d.saleCount}</td>
                <td className='px-4 py-3 font-mono text-amber-700 font-semibold'>{formatMoney(d.totalDebt)}</td>
              </tr>
            ))}
            {data && data.debtors.length === 0 && (
              <tr><td colSpan={5} className='px-4 py-8 text-center text-muted'>Должников нет</td></tr>
            )}
            {!data && (
              <tr><td colSpan={5} className='px-4 py-8 text-center text-muted'>Загрузка...</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default SalesDebtors
