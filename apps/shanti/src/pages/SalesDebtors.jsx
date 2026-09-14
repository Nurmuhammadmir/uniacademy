import React, { useContext, useEffect, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { ShantiContext } from '../context/ShantiContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Select from '../components/Select.jsx'
import { formatMoney } from '../lib/format.js'

const DEFAULT_FILTERS = { clientId: '', category: '' }

const SalesDebtors = () => {
  const { clientCategories, clients, getSalesDebtors } = useContext(ShantiContext)
  const { t } = useLanguage()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [data, setData] = useState(null)

  useEffect(() => { getSalesDebtors(appliedFilters).then(d => { if (d) setData(d) }) }, [appliedFilters])

  const applyFilters = (e) => { e.preventDefault(); setAppliedFilters(filters) }
  const hasActiveFilters = appliedFilters.clientId || appliedFilters.category

  const totalDebt = (data?.debtors || []).reduce((sum, d) => sum + d.totalDebt, 0)

  return (
    <div>
      <div className='flex justify-between items-center mb-4 gap-3 flex-wrap'>
        <div className='bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 inline-block'>
          <p className='text-amber-700 text-[11px]'>{t('totalClientDebtLabel')}</p>
          <p className='font-bold tracking-tight text-lg text-amber-700'>{data ? formatMoney(totalDebt) : '—'}</p>
        </div>
        <button onClick={() => setShowFilters(v => !v)}
          className={`h-10 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${showFilters || hasActiveFilters ? 'bg-accent-soft text-accent' : 'bg-slate-100 text-slate-700'}`}>
          <SlidersHorizontal size={15} strokeWidth={1.75} /> {t('filterBtn')}
        </button>
      </div>

      {showFilters && (
        <form onSubmit={applyFilters} className='flex flex-wrap gap-3 items-end mb-4 bg-white border border-slate-200/60 rounded-2xl p-4'>
          <div>
            <p className='text-xs text-muted mb-1'>{t('clientLabel')}</p>
            <Select forceSearch className='w-52' value={filters.clientId} onChange={(v) => setFilters({ ...filters, clientId: v })} placeholder={t('anyOption')}
              options={[{ value: '', label: t('anyOption') }, ...clients.map(c => ({ value: c._id, label: c.name }))]} />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('categoryLabel')}</p>
            <Select className='w-44' value={filters.category} onChange={(v) => setFilters({ ...filters, category: v })} placeholder={t('anyCategoryOption')}
              options={[{ value: '', label: t('anyCategoryOption') }, ...clientCategories.map(c => ({ value: c.name, label: c.name }))]} />
          </div>
          <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium transition-colors'>{t('apply')}</button>
          {hasActiveFilters && (
            <button type='button' onClick={() => { setFilters(DEFAULT_FILTERS); setAppliedFilters(DEFAULT_FILTERS) }} className='text-xs text-muted underline'>
              {t('clearFiltersBtn')}
            </button>
          )}
        </form>
      )}

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
