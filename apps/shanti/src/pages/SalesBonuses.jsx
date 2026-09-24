import React, { useContext, useEffect, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { ShantiContext } from '../context/ShantiContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Select from '../components/Select.jsx'
import DatePicker from '../components/DatePicker.jsx'
import Money from '../components/Money.jsx'
import { formatQuantity } from '../lib/format.js'
import { formatDateTime } from '../lib/date.js'

const DEFAULT_FILTERS = { dateFrom: '', dateTo: '', category: '', clientId: '', productId: '' }

// quantity rollups arrive grouped by unit ([{ unit, quantity }]) - same shape as sales' totalQuantity
const quantityText = (list) => list.map(q => `${formatQuantity(q.quantity)} ${q.unit}`).join(' · ')

// one titled block rendered as a table on desktop and as cards on mobile, same split every other
// list page here uses. First column is the card's title, the last is its amount, the rest become
// "label: value" lines - so a block only has to declare its columns once.
const Block = ({ title, columns, rows, rowKey, emptyText, loading, t }) => {
  const last = columns[columns.length - 1]
  return (
    <div className='mb-6'>
      <p className='text-ink font-medium text-sm mb-2'>{title}</p>
      <div className='hidden md:block bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              {columns.map(c => <th key={c.label} className='px-4 py-3 font-medium'>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={rowKey(r, i)} className='border-b border-hairline last:border-0'>
                {columns.map(c => <td key={c.label} className={`px-4 py-3 ${c.className || 'text-muted'}`}>{c.render(r)}</td>)}
              </tr>
            ))}
            {(loading || rows.length === 0) && (
              <tr><td colSpan={columns.length} className='px-4 py-8 text-center text-muted'>{loading ? t('loading') : emptyText}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className='block md:hidden flex flex-col gap-2.5'>
        {(loading || rows.length === 0) && <p className='text-muted text-sm text-center py-8'>{loading ? t('loading') : emptyText}</p>}
        {rows.map((r, i) => (
          <div key={rowKey(r, i)} className='bg-white rounded-xl border border-slate-100 p-4 shadow-sm'>
            <div className='flex justify-between items-start'>
              <p className='font-semibold text-[#1D1D1F] text-sm truncate min-w-0'>{columns[0].render(r)}</p>
              <p className='text-base font-bold text-amber-700 flex-shrink-0 ml-3'>{last.render(r)}</p>
            </div>
            {columns.slice(1, -1).map(c => (
              <p key={c.label} className='text-xs text-slate-400 mt-1'>{c.label}: {c.render(r)}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

const SalesBonuses = () => {
  const { clientCategories, clients, products, getBonusesOverview } = useContext(ShantiContext)
  const { t } = useLanguage()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [data, setData] = useState(null)

  useEffect(() => { getBonusesOverview(filters).then(d => { if (d) setData(d) }) }, [filters])

  const hasActiveFilters = Object.values(filters).some(Boolean)
  const loading = !data
  const cost = (v) => <span className='font-mono text-amber-700 font-semibold'><Money value={v} /></span>

  return (
    <div>
      <div className='flex justify-between items-center mb-4 gap-3 flex-wrap'>
        <div className='flex gap-3 flex-wrap'>
          <div className='bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3'>
            <p className='text-amber-700 text-[11px] leading-tight'>{t('totalBonusCostLabel')}</p>
            <p className='font-bold tracking-tight text-lg text-amber-700 leading-tight'>{data ? <Money value={data.totalCost} /> : '—'}</p>
            <p className='text-[10px] text-amber-700/70 mt-0.5'>{filters.dateFrom || filters.dateTo ? `${filters.dateFrom} — ${filters.dateTo}` : t('allPeriodLabel')}</p>
          </div>
          {data && data.totalQuantity.length > 0 && (
            <div className='bg-white border border-slate-100 rounded-2xl px-5 py-3 shadow-sm'>
              <p className='text-muted text-[11px] leading-tight'>{t('totalQuantityLabel')}</p>
              <p className='font-bold tracking-tight text-lg text-[#1D1D1F] leading-tight font-mono'>{quantityText(data.totalQuantity)}</p>
            </div>
          )}
        </div>
        <button onClick={() => setShowFilters(v => !v)}
          className={`h-10 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${showFilters || hasActiveFilters ? 'bg-accent-soft text-accent' : 'bg-slate-100 text-slate-700'}`}>
          <SlidersHorizontal size={15} strokeWidth={1.75} /> {t('filterBtn')}
        </button>
      </div>

      {showFilters && (
        <div className='flex flex-wrap gap-3 items-end mb-4 bg-white border border-slate-200/60 rounded-2xl p-4'>
          <div>
            <p className='text-xs text-muted mb-1'>{t('dateFromLabel')}</p>
            <DatePicker className='w-36' value={filters.dateFrom} onChange={(v) => setFilters({ ...filters, dateFrom: v })} />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('dateToLabel')}</p>
            <DatePicker className='w-36' value={filters.dateTo} onChange={(v) => setFilters({ ...filters, dateTo: v })} />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('clientCategoryLabel')}</p>
            <Select className='w-44' value={filters.category} onChange={(v) => setFilters({ ...filters, category: v })} placeholder={t('anyCategoryOption')}
              options={[{ value: '', label: t('anyCategoryOption') }, ...clientCategories.map(c => ({ value: c.name, label: c.name }))]} />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('clientLabel')}</p>
            <Select forceSearch className='w-48' value={filters.clientId} onChange={(v) => setFilters({ ...filters, clientId: v })} placeholder={t('anyOption')}
              options={[{ value: '', label: t('anyOption') }, ...clients.map(c => ({ value: c._id, label: c.name }))]} />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('productLabel')}</p>
            <Select forceSearch className='w-48' value={filters.productId} onChange={(v) => setFilters({ ...filters, productId: v })} placeholder={t('anyOption')}
              options={[{ value: '', label: t('anyOption') }, ...products.map(p => ({ value: p._id, label: p.name }))]} />
          </div>
          {hasActiveFilters && (
            <button type='button' onClick={() => setFilters(DEFAULT_FILTERS)} className='text-xs text-muted underline'>
              {t('clearFiltersBtn')}
            </button>
          )}
        </div>
      )}

      <Block t={t} loading={loading} emptyText={t('noBonusesYet')} title={t('bonusesByClientTitle')} rows={data?.byClient || []} rowKey={r => r.clientId}
        columns={[
          { label: t('clientLabel'), className: 'text-ink font-medium', render: r => r.name },
          { label: t('categoryLabel'), render: r => r.category || '—' },
          { label: t('bonusSalesCountLabel'), render: r => r.saleCount },
          { label: t('quantityShort'), render: r => quantityText(r.quantity) },
          { label: t('bonusCostLabel'), render: r => cost(r.totalCost) },
        ]} />

      <Block t={t} loading={loading} emptyText={t('noBonusesYet')} title={t('bonusesByProductTitle')} rows={data?.byProduct || []} rowKey={r => r.productId}
        columns={[
          { label: t('productLabel'), className: 'text-ink font-medium', render: r => r.name },
          { label: t('bonusSalesCountLabel'), render: r => r.saleCount },
          { label: t('quantityShort'), render: r => quantityText(r.quantity) },
          { label: t('bonusCostLabel'), render: r => cost(r.totalCost) },
        ]} />

      <Block t={t} loading={loading} emptyText={t('noBonusesYet')} title={t('bonusesDetailsTitle')} rows={data?.rows || []} rowKey={(r, i) => `${r.saleId}-${r.productId}-${i}`}
        columns={[
          { label: t('clientLabel'), className: 'text-ink font-medium', render: r => r.clientName },
          { label: t('dateCol'), className: 'text-muted whitespace-nowrap', render: r => formatDateTime(r.date) },
          { label: t('productLabel'), render: r => r.productName },
          { label: t('quantityShort'), render: r => `${formatQuantity(r.quantity)} ${r.unit}` },
          { label: t('pricePerUnitLabel'), className: 'text-muted font-mono', render: r => <Money value={r.price} /> },
          { label: t('bonusCostLabel'), render: r => cost(r.cost) },
        ]} />
    </div>
  )
}

export default SalesBonuses
