import React, { useContext, useEffect, useState } from 'react'
import { Plus, SlidersHorizontal } from 'lucide-react'
import { ShantiContext } from '../context/ShantiContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Select from '../components/Select.jsx'
import DatePicker from '../components/DatePicker.jsx'
import NumberInput from '../components/NumberInput.jsx'
import { methodDisplay } from '../components/MethodPicker.jsx'
import { confirm } from '../lib/confirm.js'
import { formatMoney } from '../lib/format.js'
import { firstOfMonthISO, todayISO, formatDateTime } from '../lib/date.js'
import NewSaleModal from './NewSaleModal.jsx'

const DEFAULT_FILTERS = { dateFrom: firstOfMonthISO(), dateTo: todayISO(), category: '', clientId: '', productId: '', amountMin: '', amountMax: '' }

const SalesList = () => {
  const { clientCategories, clients, products, getSalesOverview, updateSale, deleteSale } = useContext(ShantiContext)
  const { t } = useLanguage()
  const METHOD_LABEL = { cash: t('methodCash'), card: t('methodCard'), click: t('methodClick'), bank_transfer: t('methodBankTransfer'), payme: t('methodPayme'), apelsin: t('methodApelsin') }
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS)
  const [data, setData] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [editingSale, setEditingSale] = useState(null)
  const [editingComment, setEditingComment] = useState(null)
  const [commentDraft, setCommentDraft] = useState('')

  const load = () => getSalesOverview(appliedFilters).then(d => { if (d) setData(d) })
  useEffect(() => { load() }, [appliedFilters])

  const applyFilters = (e) => { e.preventDefault(); setAppliedFilters(filters) }

  const saveComment = async (sale) => {
    const ok = await updateSale(sale._id, { comment: commentDraft })
    if (ok) { setEditingComment(null); load() }
  }

  const handleDelete = async (id) => {
    if (!(await confirm(t('confirmDeleteSale')))) return
    if (await deleteSale(id)) load()
  }

  return (
    <div>
      <div className='flex justify-between items-center mb-4 gap-3 flex-wrap'>
        <div className='bg-white border border-slate-100 rounded-2xl px-5 py-3 shadow-sm'>
          <p className='text-muted text-[11px] leading-tight'>{t('salesTotalLabel')}</p>
          <p className='font-bold tracking-tight text-lg text-[#1D1D1F] leading-tight'>{data ? formatMoney(data.totalAmount) : '—'}</p>
          <p className='text-[10px] text-slate-400 mt-0.5'>{appliedFilters.dateFrom} — {appliedFilters.dateTo}</p>
        </div>
        <div className='flex gap-2'>
          <button onClick={() => setShowFilters(v => !v)}
            className={`h-10 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${showFilters ? 'bg-accent-soft text-accent' : 'bg-slate-100 text-slate-700'}`}>
            <SlidersHorizontal size={15} strokeWidth={1.75} /> {t('filterBtn')}
          </button>
          <button onClick={() => setShowNew(true)}
            className='px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium transition-colors shadow-sm flex items-center gap-1.5'>
            <Plus size={15} strokeWidth={1.5} /> {t('newSaleBtn')}
          </button>
        </div>
      </div>

      {showFilters && (
        <form onSubmit={applyFilters} className='flex flex-wrap gap-3 items-end mb-4 bg-white border border-slate-200/60 rounded-2xl p-4'>
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
          <div>
            <p className='text-xs text-muted mb-1'>{t('amountLabel')}</p>
            <div className='flex items-center gap-1.5'>
              <NumberInput value={filters.amountMin} onChange={v => setFilters({ ...filters, amountMin: v })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm w-24' />
              <span className='text-muted text-xs'>—</span>
              <NumberInput value={filters.amountMax} onChange={v => setFilters({ ...filters, amountMax: v })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm w-24' />
            </div>
          </div>
          <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium transition-colors'>{t('apply')}</button>
        </form>
      )}

      <div className='hidden md:block bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-4 py-3 font-medium'>{t('dateCol')}</th>
              <th className='px-4 py-3 font-medium'>{t('clientLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('itemsLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('amountLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('paidLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('debtLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('methodLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('commentLabel')}</th>
              <th className='px-4 py-3 font-medium'></th>
            </tr>
          </thead>
          <tbody>
            {(data?.sales || []).map(s => {
              const debt = s.amount - s.paidAmount
              return (
                <tr key={s._id} className='border-b border-hairline last:border-0'>
                  <td className='px-4 py-3 text-muted whitespace-nowrap'>{formatDateTime(s.date)}</td>
                  <td className='px-4 py-3 text-ink'>{s.clientId?.name || '—'}</td>
                  <td className='px-4 py-3 text-muted max-w-[180px] truncate' title={s.items.map(i => `${i.productId?.name} ×${i.quantity}`).join(', ')}>
                    {s.items.map(i => `${i.productId?.name} ×${i.quantity}`).join(', ')}
                  </td>
                  <td className='px-4 py-3 font-mono text-ink'>{formatMoney(s.amount)}</td>
                  <td className='px-4 py-3 font-mono text-emerald-600'>{formatMoney(s.paidAmount)}</td>
                  <td className={`px-4 py-3 font-mono ${debt > 0 ? 'text-amber-600 font-semibold' : 'text-muted'}`}>{debt > 0 ? formatMoney(debt) : '—'}</td>
                  <td className='px-4 py-3 text-muted' title={methodDisplay(s, METHOD_LABEL).title}>{methodDisplay(s, METHOD_LABEL).label}</td>
                  <td className='px-4 py-3 text-muted max-w-[180px]'>
                    {editingComment === s._id ? (
                      <div className='flex gap-1.5'>
                        <input autoFocus value={commentDraft} onChange={e => setCommentDraft(e.target.value)} className='flex-1 px-2 py-1 rounded-lg bg-bg border border-hairline text-xs' />
                        <button onClick={() => saveComment(s)} className='px-2 py-1 rounded-lg bg-accent text-white text-xs'>OK</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingComment(s._id); setCommentDraft(s.comment || '') }} className='plain text-left truncate block w-full' title={s.comment}>
                        {s.comment || <span className='text-slate-300'>{t('addCommentPlaceholder')}</span>}
                      </button>
                    )}
                  </td>
                  <td className='px-4 py-3 text-right whitespace-nowrap'>
                    <button onClick={() => setEditingSale(s)} className='px-3 py-1.5 rounded-lg bg-accent-soft text-accent text-xs font-medium mr-2'>{t('edit')}</button>
                    <button onClick={() => handleDelete(s._id)} className='px-2.5 py-1 rounded-lg bg-bg border border-hairline text-muted text-xs font-medium'>{t('delete')}</button>
                  </td>
                </tr>
              )
            })}
            {data && data.sales.length === 0 && (
              <tr><td colSpan={9} className='px-4 py-8 text-center text-muted'>{t('noSalesYet')}</td></tr>
            )}
            {!data && (
              <tr><td colSpan={9} className='px-4 py-8 text-center text-muted'>{t('loading')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className='block md:hidden flex flex-col gap-2.5'>
        {!data && <p className='text-muted text-sm text-center py-8'>{t('loading')}</p>}
        {data && data.sales.length === 0 && <p className='text-muted text-sm text-center py-8'>{t('noSalesYet')}</p>}
        {(data?.sales || []).map(s => {
          const debt = s.amount - s.paidAmount
          return (
            <div key={s._id} className='bg-white rounded-xl border border-slate-100 p-4 shadow-sm'>
              <div className='flex justify-between items-start'>
                <div className='min-w-0'>
                  <p className='font-semibold text-[#1D1D1F] text-sm truncate'>{s.clientId?.name || '—'}</p>
                  <p className='text-xs text-slate-400 mt-1'>{formatDateTime(s.date)}</p>
                </div>
                <p className='text-base font-bold text-slate-900 flex-shrink-0 ml-3'>{formatMoney(s.amount)}</p>
              </div>
              {debt > 0 && <p className='text-xs text-amber-600 font-semibold mt-2'>{t('debtLabel')}: {formatMoney(debt)}</p>}
              <div className='flex gap-3 mt-2'>
                <button onClick={() => setEditingSale(s)} className='text-xs text-accent font-medium'>{t('edit')}</button>
                <button onClick={() => handleDelete(s._id)} className='text-xs text-muted'>{t('delete')}</button>
              </div>
            </div>
          )
        })}
      </div>

      {showNew && <NewSaleModal onClose={() => setShowNew(false)} onCreated={load} />}
      {editingSale && <NewSaleModal sale={editingSale} onClose={() => setEditingSale(null)} onCreated={load} />}
    </div>
  )
}

export default SalesList
