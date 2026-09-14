import React, { useContext, useEffect, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { ShantiContext } from '../context/ShantiContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Select from '../components/Select.jsx'
import { formatMoney } from '../lib/format.js'
import { formatDateTime } from '../lib/date.js'

const DEFAULT_FILTERS = { sellerId: '', materialId: '', category: '' }

const PurchaseDebts = () => {
  const { materialCategories, materials, sellers, getPurchaseDebts } = useContext(ShantiContext)
  const { t } = useLanguage()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [data, setData] = useState(null)

  useEffect(() => { getPurchaseDebts(appliedFilters).then(d => { if (d) setData(d) }) }, [appliedFilters])

  const applyFilters = (e) => { e.preventDefault(); setAppliedFilters(filters) }
  const hasActiveFilters = appliedFilters.sellerId || appliedFilters.materialId || appliedFilters.category

  return (
    <div>
      <div className='flex justify-between items-center mb-4 gap-3 flex-wrap'>
        <div className='bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 inline-block'>
          <p className='text-amber-700 text-[11px]'>{t('totalSupplierDebtLabel')}</p>
          <p className='font-bold tracking-tight text-lg text-amber-700'>{data ? formatMoney(data.totalDebt) : '—'}</p>
        </div>
        <button onClick={() => setShowFilters(v => !v)}
          className={`h-10 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${showFilters || hasActiveFilters ? 'bg-accent-soft text-accent' : 'bg-slate-100 text-slate-700'}`}>
          <SlidersHorizontal size={15} strokeWidth={1.75} /> {t('filterBtn')}
        </button>
      </div>

      {showFilters && (
        <form onSubmit={applyFilters} className='flex flex-wrap gap-3 items-end mb-4 bg-white border border-slate-200/60 rounded-2xl p-4'>
          <div>
            <p className='text-xs text-muted mb-1'>{t('sellerLabel')}</p>
            <Select forceSearch className='w-48' value={filters.sellerId} onChange={(v) => setFilters({ ...filters, sellerId: v })} placeholder={t('anyOption')}
              options={[{ value: '', label: t('anyOption') }, ...sellers.map(s => ({ value: s._id, label: s.name }))]} />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('materialLabel')}</p>
            <Select forceSearch className='w-52' value={filters.materialId} onChange={(v) => setFilters({ ...filters, materialId: v })} placeholder={t('anyOption')}
              options={[{ value: '', label: t('anyOption') }, ...materials.map(m => ({ value: m._id, label: m.name }))]} />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('categoryLabel')}</p>
            <Select className='w-44' value={filters.category} onChange={(v) => setFilters({ ...filters, category: v })} placeholder={t('anyCategoryOption')}
              options={[{ value: '', label: t('anyCategoryOption') }, ...materialCategories.map(c => ({ value: c.name, label: c.name }))]} />
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
              <th className='px-4 py-3 font-medium'>{t('dateCol')}</th>
              <th className='px-4 py-3 font-medium'>{t('materialLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('sellerLabel')}</th>
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
                <td className='px-4 py-3 text-muted'>{p.sellerId?.name || '—'}</td>
                <td className='px-4 py-3 font-mono text-ink'>{formatMoney(p.amount)}</td>
                <td className='px-4 py-3 font-mono text-emerald-600'>{formatMoney(p.paidAmount)}</td>
                <td className='px-4 py-3 font-mono text-amber-700 font-semibold'>{formatMoney(p.amount - p.paidAmount)}</td>
                <td className='px-4 py-3 text-muted'>{p.comment || '—'}</td>
              </tr>
            ))}
            {data && data.purchases.length === 0 && (
              <tr><td colSpan={7} className='px-4 py-8 text-center text-muted'>{t('noDebtsYet')}</td></tr>
            )}
            {!data && (
              <tr><td colSpan={7} className='px-4 py-8 text-center text-muted'>{t('loading')}</td></tr>
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
                <p className='text-xs text-slate-400 mt-1'>{formatDateTime(p.date)}{p.sellerId?.name ? ` · ${p.sellerId.name}` : ''}</p>
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
