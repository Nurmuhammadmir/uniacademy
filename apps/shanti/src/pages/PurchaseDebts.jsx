import React, { useContext, useEffect, useState } from 'react'
import { ShantiContext } from '../context/ShantiContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { formatMoney } from '../lib/format.js'
import { formatDateTime } from '../lib/date.js'

const PurchaseDebts = () => {
  const { getPurchaseDebts } = useContext(ShantiContext)
  const { t } = useLanguage()
  const [data, setData] = useState(null)

  useEffect(() => { getPurchaseDebts({}).then(d => { if (d) setData(d) }) }, [])

  return (
    <div>
      <div className='bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 mb-4 inline-block'>
        <p className='text-amber-700 text-[11px]'>{t('totalSupplierDebtLabel')}</p>
        <p className='font-bold tracking-tight text-lg text-amber-700'>{data ? formatMoney(data.totalDebt) : '—'}</p>
      </div>

      <div className='hidden md:block bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-4 py-3 font-medium'>{t('dateCol')}</th>
              <th className='px-4 py-3 font-medium'>{t('materialLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('amountLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('paidLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('debtLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('commentLabel')}</th>
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
              <tr><td colSpan={6} className='px-4 py-8 text-center text-muted'>{t('noDebtsYet')}</td></tr>
            )}
            {!data && (
              <tr><td colSpan={6} className='px-4 py-8 text-center text-muted'>{t('loading')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className='block md:hidden flex flex-col gap-2.5'>
        {!data && <p className='text-muted text-sm text-center py-8'>{t('loading')}</p>}
        {data && data.purchases.length === 0 && <p className='text-muted text-sm text-center py-8'>{t('noDebtsYet')}</p>}
        {(data?.purchases || []).map(p => (
          <div key={p._id} className='bg-amber-50/60 rounded-xl border border-amber-200 p-4'>
            <div className='flex justify-between items-start'>
              <div className='min-w-0'>
                <p className='font-semibold text-[#1D1D1F] text-sm truncate'>{p.materialId?.name || '—'}</p>
                <p className='text-xs text-slate-400 mt-1'>{formatDateTime(p.date)}</p>
              </div>
              <p className='text-base font-bold text-amber-700 flex-shrink-0 ml-3'>{formatMoney(p.amount - p.paidAmount)}</p>
            </div>
            <p className='text-xs text-muted mt-2'>{t('amountLabel')}: {formatMoney(p.amount)} · {t('paidLabel')}: {formatMoney(p.paidAmount)}</p>
            {p.comment && <p className='text-xs text-muted mt-1 truncate'>{p.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default PurchaseDebts
