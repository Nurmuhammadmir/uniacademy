import React, { useContext, useEffect, useState } from 'react'
import { Plus, SlidersHorizontal } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { ShantiContext } from '../context/ShantiContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Select from '../components/Select.jsx'
import DatePicker from '../components/DatePicker.jsx'
import NumberInput from '../components/NumberInput.jsx'
import { methodDisplay } from '../components/MethodPicker.jsx'
import { confirm } from '../lib/confirm.js'
import { formatMoney } from '../lib/format.js'
import Money from '../components/Money.jsx'
import { formatDateTime } from '../lib/date.js'
import NewPaymentModal from './NewPaymentModal.jsx'
import NewSaleModal from './NewSaleModal.jsx'

const DEFAULT_FILTERS = { dateFrom: '', dateTo: '', clientId: '', method: '', amountMin: '', amountMax: '' }

// a sale's own paidAmount (money the client actually paid AT the point of sale) belongs here just
// as much as a later debt-collection Payment does - both are real cash received from a client. The
// two collections are merged for DISPLAY only; each row is still edited/deleted through its own
// real resource (a sale row opens NewSaleModal and PUTs /sales/:id, same modal and endpoint the
// Sales page itself uses - editing here IS editing the sale, so Sales/Sotuvlar shows the change
// too, not a separate copy of it).
const FinanceReceipts = () => {
  const { clients, getPaymentsOverview, getPaymentsChart, deletePayment, getSalesOverview } = useContext(ShantiContext)
  const { t } = useLanguage()
  const METHOD_LABEL = { cash: t('methodCash'), card: t('methodCard'), click: t('methodClick'), bank_transfer: t('methodBankTransfer'), payme: t('methodPayme'), apelsin: t('methodApelsin') }
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [entries, setEntries] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [editingPayment, setEditingPayment] = useState(null)
  const [editingSale, setEditingSale] = useState(null)
  const [period, setPeriod] = useState('month')
  const [chart, setChart] = useState(null)

  const load = async () => {
    const { dateFrom, dateTo, clientId, method, amountMin, amountMax } = filters
    const [paymentsRes, salesRes] = await Promise.all([
      getPaymentsOverview({ dateFrom, dateTo, clientId }),
      getSalesOverview({ dateFrom, dateTo, clientId }),
    ])
    if (!paymentsRes || !salesRes) return
    let merged = [
      ...paymentsRes.payments.map(p => ({ type: 'payment', _id: p._id, date: p.date, amount: p.amount, clientName: p.clientId?.name, method: p.method, methodBreakdown: p.methodBreakdown, comment: p.comment, raw: p })),
      ...salesRes.sales.filter(s => s.paidAmount > 0).map(s => ({ type: 'sale', _id: s._id, date: s.date, amount: s.paidAmount, clientName: s.clientId?.name, method: s.method, methodBreakdown: s.methodBreakdown, comment: s.comment, raw: s })),
    ]
    if (method) merged = merged.filter(e => e.method === method || (e.methodBreakdown || []).some(b => b.method === method))
    if (amountMin) merged = merged.filter(e => e.amount >= Number(amountMin))
    if (amountMax) merged = merged.filter(e => e.amount <= Number(amountMax))
    merged.sort((a, b) => new Date(b.date) - new Date(a.date))
    setEntries(merged)
  }
  useEffect(() => { load() }, [filters])
  useEffect(() => { getPaymentsChart(period).then(d => { if (d) setChart(d) }) }, [period])

  const totalAmount = entries ? entries.reduce((sum, e) => sum + e.amount, 0) : 0

  const handleDelete = async (id) => {
    if (!(await confirm(t('confirmDeletePayment')))) return
    if (await deletePayment(id)) { load(); getPaymentsChart(period).then(d => { if (d) setChart(d) }) }
  }
  const handleSaleSaved = () => { load(); getPaymentsChart(period).then(d => { if (d) setChart(d) }) }

  return (
    <div>
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5'>
        <div className='bg-white border border-slate-100 rounded-2xl px-5 py-4 shadow-sm'>
          <p className='text-muted text-[11px] leading-tight'>{t('receiptsTotalLabel')}</p>
          <p className='font-bold tracking-tight text-2xl text-emerald-600 leading-tight mt-1'>{entries ? <Money value={totalAmount} /> : '—'}</p>
          <p className='text-[10px] text-slate-400 mt-1'>{filters.dateFrom || filters.dateTo ? `${filters.dateFrom} — ${filters.dateTo}` : t('allPeriodLabel')}</p>
        </div>

        <div className='lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm'>
          <div className='flex justify-between items-center mb-2'>
            <p className='text-ink font-medium text-sm'>{t('receiptsTotalLabel')}</p>
            <div className='flex gap-1 bg-slate-100 rounded-lg p-1'>
              {[['week', t('periodWeek')], ['month', t('periodMonth')], ['year', t('periodYear')]].map(([value, label]) => (
                <button key={value} onClick={() => setPeriod(value)}
                  className={`plain px-3 py-1 rounded-md text-xs font-medium transition-colors ${period === value ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-slate-500'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={chart?.series || []}>
                <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#E2E8F0' strokeOpacity={0.7} />
                <XAxis dataKey='label' stroke='#94a3b8' fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke='#94a3b8' fontSize={11} tickFormatter={v => formatMoney(v)} width={60} tickLine={false} axisLine={false} />
                <Tooltip formatter={v => formatMoney(v)} />
                <Bar dataKey='value' fill='#10B981' radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className='flex justify-end gap-2 mb-4'>
        <button onClick={() => setShowFilters(v => !v)}
          className={`h-10 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${showFilters ? 'bg-accent-soft text-accent' : 'bg-slate-100 text-slate-700'}`}>
          <SlidersHorizontal size={15} strokeWidth={1.75} /> {t('filterBtn')}
        </button>
        <button onClick={() => setShowNew(true)}
          className='px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium transition-colors shadow-sm flex items-center gap-1.5'>
          <Plus size={15} strokeWidth={1.5} /> {t('newPaymentBtn')}
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
            <p className='text-xs text-muted mb-1'>{t('clientLabel')}</p>
            <Select forceSearch className='w-48' value={filters.clientId} onChange={(v) => setFilters({ ...filters, clientId: v })} placeholder={t('anyOption')}
              options={[{ value: '', label: t('anyOption') }, ...clients.map(c => ({ value: c._id, label: c.name }))]} />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('methodLabel')}</p>
            <Select className='w-40' value={filters.method} onChange={(v) => setFilters({ ...filters, method: v })} placeholder={t('anyOption')}
              options={[{ value: '', label: t('anyOption') }, ...['cash', 'card', 'bank_transfer'].map(value => ({ value, label: METHOD_LABEL[value] }))]} />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('amountLabel')}</p>
            <div className='flex items-center gap-1.5'>
              <NumberInput value={filters.amountMin} onChange={v => setFilters({ ...filters, amountMin: v })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm w-24' />
              <span className='text-muted text-xs'>—</span>
              <NumberInput value={filters.amountMax} onChange={v => setFilters({ ...filters, amountMax: v })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm w-24' />
            </div>
          </div>
        </div>
      )}

      <div className='hidden md:block bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-4 py-3 font-medium'>{t('dateCol')}</th>
              <th className='px-4 py-3 font-medium'>{t('typeLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('clientLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('amountLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('methodLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('commentLabel')}</th>
              <th className='px-4 py-3 font-medium'></th>
            </tr>
          </thead>
          <tbody>
            {(entries || []).map(e => (
              <tr key={e.type + e._id} className='border-b border-hairline last:border-0'>
                <td className='px-4 py-3 text-muted whitespace-nowrap'>{formatDateTime(e.date)}</td>
                <td className='px-4 py-3'>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.type === 'sale' ? 'bg-accent-soft text-accent' : 'bg-emerald-50 text-emerald-700'}`}>
                    {e.type === 'sale' ? t('typeSale') : t('typePayment')}
                  </span>
                </td>
                <td className='px-4 py-3 text-ink'>{e.clientName || '—'}</td>
                <td className='px-4 py-3 font-mono text-emerald-600 font-semibold'><Money value={e.amount} /></td>
                <td className='px-4 py-3 text-muted' title={methodDisplay(e, METHOD_LABEL).title}>{methodDisplay(e, METHOD_LABEL).label}</td>
                <td className='px-4 py-3 text-muted max-w-[220px] truncate' title={e.comment}>{e.comment || '—'}</td>
                <td className='px-4 py-3 text-right whitespace-nowrap'>
                  <button onClick={() => e.type === 'sale' ? setEditingSale(e.raw) : setEditingPayment(e.raw)}
                    className='px-3 py-1.5 rounded-lg bg-accent-soft text-accent text-xs font-medium mr-2'>{t('edit')}</button>
                  {e.type === 'payment' && (
                    <button onClick={() => handleDelete(e._id)} className='px-2.5 py-1 rounded-lg bg-bg border border-hairline text-muted text-xs font-medium'>{t('delete')}</button>
                  )}
                </td>
              </tr>
            ))}
            {entries && entries.length === 0 && (
              <tr><td colSpan={7} className='px-4 py-8 text-center text-muted'>{t('noPaymentsYet')}</td></tr>
            )}
            {!entries && (
              <tr><td colSpan={7} className='px-4 py-8 text-center text-muted'>{t('loading')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className='block md:hidden flex flex-col gap-2.5'>
        {!entries && <p className='text-muted text-sm text-center py-8'>{t('loading')}</p>}
        {entries && entries.length === 0 && <p className='text-muted text-sm text-center py-8'>{t('noPaymentsYet')}</p>}
        {(entries || []).map(e => (
          <div key={e.type + e._id} className='bg-white rounded-xl border border-slate-100 p-4 shadow-sm'>
            <div className='flex justify-between items-start'>
              <div className='min-w-0'>
                <div className='flex items-center gap-1.5'>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${e.type === 'sale' ? 'bg-accent-soft text-accent' : 'bg-emerald-50 text-emerald-700'}`}>
                    {e.type === 'sale' ? t('typeSale') : t('typePayment')}
                  </span>
                  <p className='font-semibold text-[#1D1D1F] text-sm truncate'>{e.clientName || '—'}</p>
                </div>
                <p className='text-xs text-slate-400 mt-1'>{formatDateTime(e.date)}</p>
              </div>
              <p className='text-base font-bold text-emerald-600 flex-shrink-0 ml-3'><Money value={e.amount} /></p>
            </div>
            <div className='flex gap-3 mt-2'>
              <button onClick={() => e.type === 'sale' ? setEditingSale(e.raw) : setEditingPayment(e.raw)} className='text-xs text-accent font-medium'>{t('edit')}</button>
              {e.type === 'payment' && <button onClick={() => handleDelete(e._id)} className='text-xs text-muted'>{t('delete')}</button>}
            </div>
          </div>
        ))}
      </div>

      {showNew && <NewPaymentModal onClose={() => setShowNew(false)} onSaved={load} />}
      {editingPayment && <NewPaymentModal payment={editingPayment} onClose={() => setEditingPayment(null)} onSaved={load} />}
      {editingSale && <NewSaleModal sale={editingSale} onClose={() => setEditingSale(null)} onCreated={handleSaleSaved} />}
    </div>
  )
}

export default FinanceReceipts
