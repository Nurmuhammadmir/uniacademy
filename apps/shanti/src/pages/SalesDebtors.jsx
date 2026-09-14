import React, { useContext, useEffect, useState } from 'react'
import { ShantiContext } from '../context/ShantiContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { formatMoney } from '../lib/format.js'

const SalesDebtors = () => {
  const { getSalesDebtors } = useContext(ShantiContext)
  const { t } = useLanguage()
  const [data, setData] = useState(null)

  useEffect(() => { getSalesDebtors().then(d => { if (d) setData(d) }) }, [])

  const totalDebt = (data?.debtors || []).reduce((sum, d) => sum + d.totalDebt, 0)

  return (
    <div>
      <div className='bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 mb-4 inline-block'>
        <p className='text-amber-700 text-[11px]'>{t('totalClientDebtLabel')}</p>
        <p className='font-bold tracking-tight text-lg text-amber-700'>{data ? formatMoney(totalDebt) : '—'}</p>
      </div>

      <div className='hidden md:block bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-4 py-3 font-medium'>{t('clientLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('phoneLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('categoryLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('salesWithDebtLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('debtLabel')}</th>
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
              <tr><td colSpan={5} className='px-4 py-8 text-center text-muted'>{t('noDebtorsYet')}</td></tr>
            )}
            {!data && (
              <tr><td colSpan={5} className='px-4 py-8 text-center text-muted'>{t('loading')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className='block md:hidden flex flex-col gap-2.5'>
        {!data && <p className='text-muted text-sm text-center py-8'>{t('loading')}</p>}
        {data && data.debtors.length === 0 && <p className='text-muted text-sm text-center py-8'>{t('noDebtorsYet')}</p>}
        {(data?.debtors || []).map(d => (
          <div key={d.clientId} className='bg-amber-50/60 rounded-xl border border-amber-200 p-4'>
            <div className='flex justify-between items-start'>
              <div className='min-w-0'>
                <p className='font-semibold text-[#1D1D1F] text-sm truncate'>{d.name}</p>
                <p className='text-xs text-slate-400 mt-1'>{d.category}{d.phone ? ` · ${d.phone}` : ''}</p>
              </div>
              <p className='text-base font-bold text-amber-700 flex-shrink-0 ml-3'>{formatMoney(d.totalDebt)}</p>
            </div>
            <p className='text-xs text-muted mt-2'>{t('salesWithDebtLabel')}: {d.saleCount}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SalesDebtors
