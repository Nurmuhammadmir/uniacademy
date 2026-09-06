import React, { useContext, useEffect, useState } from 'react'
import { ShantiContext } from '../context/ShantiContext.jsx'
import { formatMoney } from '../lib/format.js'
import { formatDateTime } from '../lib/date.js'

const PurchaseDebts = () => {
  const { getPurchaseDebts } = useContext(ShantiContext)
  const [data, setData] = useState(null)

  useEffect(() => { getPurchaseDebts({}).then(d => { if (d) setData(d) }) }, [])

  return (
    <div>
      <div className='bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 mb-4 inline-block'>
        <p className='text-amber-700 text-[11px]'>Общий долг перед поставщиками</p>
        <p className='font-bold tracking-tight text-lg text-amber-700'>{data ? formatMoney(data.totalDebt) : '—'}</p>
      </div>

      <div className='bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-4 py-3 font-medium'>Дата</th>
              <th className='px-4 py-3 font-medium'>Материал</th>
              <th className='px-4 py-3 font-medium'>Сумма</th>
              <th className='px-4 py-3 font-medium'>Оплачено</th>
              <th className='px-4 py-3 font-medium'>Долг</th>
              <th className='px-4 py-3 font-medium'>Комментарий</th>
            </tr>
          </thead>
          <tbody>
            {(data?.purchases || []).map(p => (
              <tr key={p._id} className='border-b border-hairline last:border-0 bg-amber-50/40'>
                <td className='px-4 py-3 text-muted whitespace-nowrap'>{formatDateTime(p.date)}</td>
                <td className='px-4 py-3 text-ink'>{p.materialId?.name || '—'}</td>
                <td className='px-4 py-3 font-mono text-ink'>{formatMoney(p.amount)}</td>
                <td className='px-4 py-3 font-mono text-emerald-600'>{formatMoney(p.paidAmount)}</td>
                <td className='px-4 py-3 font-mono text-amber-700 font-semibold'>{formatMoney(p.amount - p.paidAmount)}</td>
                <td className='px-4 py-3 text-muted'>{p.comment || '—'}</td>
              </tr>
            ))}
            {data && data.purchases.length === 0 && (
              <tr><td colSpan={6} className='px-4 py-8 text-center text-muted'>Долгов нет</td></tr>
            )}
            {!data && (
              <tr><td colSpan={6} className='px-4 py-8 text-center text-muted'>Загрузка...</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default PurchaseDebts
