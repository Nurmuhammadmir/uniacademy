import React, { useContext, useEffect, useState } from 'react'
import { Plus, Settings, Pencil, X, SlidersHorizontal } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { ShantiContext } from '../context/ShantiContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Modal from '../components/Modal.jsx'
import Select from '../components/Select.jsx'
import DatePicker from '../components/DatePicker.jsx'
import NumberInput from '../components/NumberInput.jsx'
import { methodDisplay } from '../components/MethodPicker.jsx'
import { confirm } from '../lib/confirm.js'
import { formatMoney } from '../lib/format.js'
import Money from '../components/Money.jsx'
import { formatDateTime } from '../lib/date.js'
import NewExpenseModal from './NewExpenseModal.jsx'
import NewPurchaseModal from './NewPurchaseModal.jsx'

const DEFAULT_FILTERS = { dateFrom: '', dateTo: '', category: '', amountMin: '', amountMax: '' }

// a 'bonus' row is the expense auto-booked for a sale's free goods (expense.saleId is set) - it
// belongs to that sale, so it's listed here but edited/deleted only by changing the sale itself
const TYPE_BADGE = { purchase: 'bg-accent-soft text-accent', bonus: 'bg-amber-50 text-amber-700', expense: 'bg-rose-50 text-rose-700' }
const TYPE_LABEL_KEY = { purchase: 'typePurchase', bonus: 'typeBonus', expense: 'typeExpense' }

// a purchase's own paidAmount (money WE actually paid a supplier AT the point of purchase) belongs
// here just as much as a general company Expense does - both are real cash going out. The two
// collections are merged for DISPLAY only; each row is still edited/deleted through its own real
// resource (a purchase row opens NewPurchaseModal and PUTs /purchases/:id, same modal and endpoint
// the Purchases page itself uses - editing here IS editing the purchase, so Purchases/Xaridlar
// shows the change too, not a separate copy of it). Purchases don't belong to any expense category,
// so they only show up in the unfiltered "all categories" view.
const ExpensesList = () => {
  const {
    expenseCategories, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
    getExpensesOverview, getExpensesChart, deleteExpense, getPurchasesOverview,
  } = useContext(ShantiContext)
  const { t } = useLanguage()
  const METHOD_LABEL = { cash: t('methodCash'), card: t('methodCard'), click: t('methodClick'), bank_transfer: t('methodBankTransfer'), payme: t('methodPayme'), apelsin: t('methodApelsin') }

  const [categoryFilter, setCategoryFilter] = useState('')
  const [showManageCategories, setShowManageCategories] = useState(false)
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', color: '#0D9488' })
  const [editingCategory, setEditingCategory] = useState(null)

  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [entries, setEntries] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [editingPurchase, setEditingPurchase] = useState(null)
  const [period, setPeriod] = useState('month')
  const [chart, setChart] = useState(null)

  const effectiveCategory = categoryFilter || filters.category

  const load = async () => {
    const { dateFrom, dateTo, amountMin, amountMax } = filters
    const [expensesRes, purchasesRes] = await Promise.all([
      getExpensesOverview({ dateFrom, dateTo, category: effectiveCategory }),
      effectiveCategory ? Promise.resolve({ purchases: [] }) : getPurchasesOverview({ dateFrom, dateTo }),
    ])
    if (!expensesRes || !purchasesRes) return
    let merged = [
      ...expensesRes.expenses.map(e => ({ type: e.saleId ? 'bonus' : 'expense', _id: e._id, date: e.date, amount: e.amount, category: e.category, sellerName: e.sellerId?.name, method: e.method, methodBreakdown: e.methodBreakdown, comment: e.comment, raw: e })),
      ...purchasesRes.purchases.filter(p => p.paidAmount > 0).map(p => ({ type: 'purchase', _id: p._id, date: p.date, amount: p.paidAmount, category: p.materialId?.category, sellerName: p.sellerId?.name, method: p.method, methodBreakdown: p.methodBreakdown, comment: p.comment, raw: p })),
    ]
    if (amountMin) merged = merged.filter(x => x.amount >= Number(amountMin))
    if (amountMax) merged = merged.filter(x => x.amount <= Number(amountMax))
    merged.sort((a, b) => new Date(b.date) - new Date(a.date))
    setEntries(merged)
  }
  useEffect(() => { load() }, [filters, categoryFilter])
  useEffect(() => { getExpensesChart(period).then(d => { if (d) setChart(d) }) }, [period])

  const totalAmount = entries ? entries.reduce((sum, e) => sum + e.amount, 0) : 0

  const submitNewCategory = async (e) => {
    e.preventDefault()
    if (!newCategory.name.trim()) return
    if (await createExpenseCategory(newCategory)) { setNewCategory({ name: '', color: '#0D9488' }); setAddingCategory(false) }
  }
  const submitEditCategory = async (e) => {
    e.preventDefault()
    if (await updateExpenseCategory(editingCategory._id, { name: editingCategory.name, color: editingCategory.color })) setEditingCategory(null)
  }

  const handleDelete = async (id) => {
    if (!(await confirm(t('confirmDeleteExpense')))) return
    if (await deleteExpense(id)) { load(); getExpensesChart(period).then(d => { if (d) setChart(d) }) }
  }
  const handlePurchaseSaved = () => { load(); getExpensesChart(period).then(d => { if (d) setChart(d) }) }

  return (
    <div>
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5'>
        <div className='bg-white border border-slate-100 rounded-2xl px-5 py-4 shadow-sm'>
          <p className='text-muted text-[11px] leading-tight'>{t('expensesTotalLabel')}</p>
          <p className='font-bold tracking-tight text-2xl text-rose-600 leading-tight mt-1'>{entries ? <Money value={totalAmount} /> : '—'}</p>
          <p className='text-[10px] text-slate-400 mt-1'>{filters.dateFrom || filters.dateTo ? `${filters.dateFrom} — ${filters.dateTo}` : t('allPeriodLabel')}</p>
        </div>

        <div className='lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm'>
          <div className='flex justify-between items-center mb-2'>
            <p className='text-ink font-medium text-sm'>{t('expensesTotalLabel')}</p>
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
                <Bar dataKey='value' fill='#EF4444' radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className='flex flex-wrap gap-1.5 items-center mb-4'>
        <button onClick={() => setCategoryFilter('')} className={`px-2.5 py-1 rounded-full text-xs font-medium border ${!categoryFilter ? 'bg-accent text-white border-transparent' : 'bg-slate-100 border-transparent text-slate-600'}`}>{t('allOption')}</button>
        {expenseCategories.map(c => (
          <button key={c._id} onClick={() => setCategoryFilter(c.name)}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${categoryFilter === c.name ? 'text-white border-transparent' : 'bg-slate-100 border-transparent text-slate-600'}`}
            style={categoryFilter === c.name ? { backgroundColor: c.color } : {}}>
            {c.name}
          </button>
        ))}
        <button onClick={() => setShowManageCategories(true)} title={t('manageCategoriesTitle')}
          className='plain w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100'>
          <Settings size={15} strokeWidth={1.5} />
        </button>
        <div className='ml-auto flex gap-2'>
          <button onClick={() => setShowFilters(v => !v)}
            className={`h-10 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${showFilters ? 'bg-accent-soft text-accent' : 'bg-slate-100 text-slate-700'}`}>
            <SlidersHorizontal size={15} strokeWidth={1.75} /> {t('filterBtn')}
          </button>
          <button onClick={() => setShowNew(true)}
            className='px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium transition-colors shadow-sm flex items-center gap-1.5'>
            <Plus size={15} strokeWidth={1.5} /> {t('newExpenseBtn')}
          </button>
        </div>
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
              <th className='px-4 py-3 font-medium'>{t('categoryLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('paySupplierLabel')}</th>
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
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[e.type]}`}>
                    {t(TYPE_LABEL_KEY[e.type])}
                  </span>
                </td>
                <td className='px-4 py-3 text-ink'>{e.category || '—'}</td>
                <td className='px-4 py-3 text-muted'>{e.sellerName || '—'}</td>
                <td className='px-4 py-3 font-mono text-rose-600 font-semibold'><Money value={e.amount} /></td>
                <td className='px-4 py-3 text-muted' title={methodDisplay(e, METHOD_LABEL).title}>{methodDisplay(e, METHOD_LABEL).label}</td>
                <td className='px-4 py-3 text-muted max-w-[200px] truncate' title={e.comment}>{e.comment || '—'}</td>
                <td className='px-4 py-3 text-right whitespace-nowrap'>
                  {e.type === 'bonus' ? (
                    <span className='text-xs text-muted'>{t('bonusManagedViaSale')}</span>
                  ) : (
                    <button onClick={() => e.type === 'purchase' ? setEditingPurchase(e.raw) : setEditingExpense(e.raw)}
                      className='px-3 py-1.5 rounded-lg bg-accent-soft text-accent text-xs font-medium mr-2'>{t('edit')}</button>
                  )}
                  {e.type === 'expense' && (
                    <button onClick={() => handleDelete(e._id)} className='px-2.5 py-1 rounded-lg bg-bg border border-hairline text-muted text-xs font-medium'>{t('delete')}</button>
                  )}
                </td>
              </tr>
            ))}
            {entries && entries.length === 0 && (
              <tr><td colSpan={8} className='px-4 py-8 text-center text-muted'>{t('noExpensesYet')}</td></tr>
            )}
            {!entries && (
              <tr><td colSpan={8} className='px-4 py-8 text-center text-muted'>{t('loading')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className='block md:hidden flex flex-col gap-2.5'>
        {!entries && <p className='text-muted text-sm text-center py-8'>{t('loading')}</p>}
        {entries && entries.length === 0 && <p className='text-muted text-sm text-center py-8'>{t('noExpensesYet')}</p>}
        {(entries || []).map(e => (
          <div key={e.type + e._id} className='bg-white rounded-xl border border-slate-100 p-4 shadow-sm'>
            <div className='flex justify-between items-start'>
              <div className='min-w-0'>
                <div className='flex items-center gap-1.5'>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${TYPE_BADGE[e.type]}`}>
                    {t(TYPE_LABEL_KEY[e.type])}
                  </span>
                  <p className='font-semibold text-[#1D1D1F] text-sm truncate'>{e.category}{e.sellerName ? ` · ${e.sellerName}` : ''}</p>
                </div>
                <p className='text-xs text-slate-400 mt-1'>{formatDateTime(e.date)}</p>
              </div>
              <p className='text-base font-bold text-rose-600 flex-shrink-0 ml-3'><Money value={e.amount} /></p>
            </div>
            <div className='flex gap-3 mt-2'>
              {e.type === 'bonus'
                ? <span className='text-xs text-muted'>{t('bonusManagedViaSale')}</span>
                : <button onClick={() => e.type === 'purchase' ? setEditingPurchase(e.raw) : setEditingExpense(e.raw)} className='text-xs text-accent font-medium'>{t('edit')}</button>}
              {e.type === 'expense' && <button onClick={() => handleDelete(e._id)} className='text-xs text-muted'>{t('delete')}</button>}
            </div>
          </div>
        ))}
      </div>

      {showManageCategories && (
        <Modal title={t('manageCategoriesTitle')} onClose={() => { setShowManageCategories(false); setEditingCategory(null) }}>
          <div className='flex flex-col gap-1.5'>
            {expenseCategories.map(c => (
              <div key={c._id} className='flex items-center justify-between text-sm'>
                {editingCategory?._id === c._id ? (
                  <form onSubmit={submitEditCategory} className='flex gap-1.5 items-center flex-1'>
                    <input type='color' value={editingCategory.color} onChange={e => setEditingCategory({ ...editingCategory, color: e.target.value })} className='w-7 h-7 rounded flex-shrink-0' />
                    <input autoFocus value={editingCategory.name} onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })} className='flex-1 px-2.5 py-1.5 rounded-lg bg-bg border border-hairline text-sm' />
                    <button type='submit' className='px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium'>{t('save')}</button>
                    <button type='button' onClick={() => setEditingCategory(null)} className='plain w-7 h-7 rounded-lg flex items-center justify-center text-muted flex-shrink-0'><X size={14} /></button>
                  </form>
                ) : (
                  <>
                    <span className='flex items-center gap-2 flex-1 min-w-0'>
                      <span className='w-2.5 h-2.5 rounded-full flex-shrink-0' style={{ backgroundColor: c.color }} />
                      <span className='text-ink truncate'>{c.name}</span>
                    </span>
                    <span className='flex gap-1 flex-shrink-0'>
                      <button onClick={() => setEditingCategory(c)} className='plain w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-accent hover:bg-accent-soft'>
                        <Pencil size={13} strokeWidth={1.5} />
                      </button>
                      {c.name !== t('otherCategory') && (
                        <button onClick={() => deleteExpenseCategory(c._id)} className='plain w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-rose-500 hover:bg-rose-50'>
                          <X size={14} strokeWidth={1.5} />
                        </button>
                      )}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
          {addingCategory ? (
            <form onSubmit={submitNewCategory} className='flex gap-1.5 items-center mt-3'>
              <input type='color' value={newCategory.color} onChange={e => setNewCategory({ ...newCategory, color: e.target.value })} className='w-7 h-7 rounded' />
              <input autoFocus placeholder={t('categoryNamePlaceholder')} value={newCategory.name} onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                className='flex-1 px-2 py-1.5 rounded-lg bg-bg border border-hairline text-xs' />
              <button type='submit' className='px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium'>{t('add')}</button>
            </form>
          ) : (
            <button onClick={() => setAddingCategory(true)} className='plain mt-3 text-accent text-sm font-medium flex items-center gap-1'>
              <Plus size={14} strokeWidth={2} /> {t('addCategoryBtn')}
            </button>
          )}
        </Modal>
      )}

      {showNew && <NewExpenseModal onClose={() => setShowNew(false)} onSaved={load} />}
      {editingExpense && <NewExpenseModal expense={editingExpense} onClose={() => setEditingExpense(null)} onSaved={load} />}
      {editingPurchase && <NewPurchaseModal purchase={editingPurchase} onClose={() => setEditingPurchase(null)} onCreated={handlePurchaseSaved} />}
    </div>
  )
}

export default ExpensesList
