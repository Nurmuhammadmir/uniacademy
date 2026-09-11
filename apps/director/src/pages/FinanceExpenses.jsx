import React, { useContext, useEffect, useState } from 'react'
import { Plus, Settings, Pencil, X, Lock } from 'lucide-react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { formatMoney } from '../lib/format.js'
import { todayISO, firstOfMonthISO } from '../lib/date.js'
import Modal from '../components/Modal.jsx'
import Select from '../components/Select.jsx'

const METHODS = ['cash', 'card', 'click', 'bank_transfer', 'payme', 'apelsin']
const DEFAULT_FILTERS = { dateFrom: firstOfMonthISO(), dateTo: todayISO(), search: '', method: '' }
const emptyExpenseForm = () => ({ name: '', date: todayISO(), category: '', recipient: '', amount: '', method: 'cash' })
const isEditableToday = (expense) => expense.date.slice(0, 10) === todayISO()

// director's counterpart of admin's Expenses tab - same categories/CRUD/same-day lock, just scoped
// to whichever branch the Finance switcher has selected. Confirmed gap: admin and Shanti both
// already had full expense management, director had none at all - only an indirect read via the
// Business Ledger/Net Profit figures, never the ability to actually log or correct one.
const FinanceExpenses = ({ branchId }) => {
  const {
    expenseCategories, getExpenseCategories, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
    getExpensesOverview, createExpense, updateExpense, deleteExpense,
  } = useContext(DirectorContext)
  const { t } = useLanguage()

  const [overview, setOverview] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showManageCategories, setShowManageCategories] = useState(false)
  const [form, setForm] = useState(emptyExpenseForm())
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', color: '#7A7266' })
  const [editingCategory, setEditingCategory] = useState(null)
  const [editingExpense, setEditingExpense] = useState(null)
  const [editForm, setEditForm] = useState(emptyExpenseForm())

  const load = () => getExpensesOverview(branchId, { category: categoryFilter, ...appliedFilters }).then(d => { if (d) setOverview(d) })
  useEffect(() => { if (branchId) { setOverview(null); load() } }, [branchId, categoryFilter, appliedFilters])
  useEffect(() => { if (branchId) getExpenseCategories(branchId) }, [branchId])
  useEffect(() => { setFilters(DEFAULT_FILTERS); setAppliedFilters(DEFAULT_FILTERS); setCategoryFilter('') }, [branchId])

  const applyFilters = (e) => { e.preventDefault(); setAppliedFilters(filters) }

  const submitExpense = async (e) => {
    e.preventDefault()
    if (!form.name || !form.category || !form.amount) return
    const ok = await createExpense(branchId, { ...form, amount: Number(form.amount) })
    if (ok) { setForm(emptyExpenseForm()); setShowAddExpense(false); load() }
  }

  const submitNewCategory = async (e) => {
    e.preventDefault()
    if (!newCategory.name.trim()) return
    const ok = await createExpenseCategory(branchId, newCategory)
    if (ok) setNewCategory({ name: '', color: '#7A7266' })
    setAddingCategory(false)
  }

  const submitEditCategory = async (e) => {
    e.preventDefault()
    const ok = await updateExpenseCategory(branchId, editingCategory._id, { name: editingCategory.name, color: editingCategory.color })
    if (ok) { setEditingCategory(null); load() }
  }

  const handleDeleteCategory = async (id, name) => {
    const ok = await deleteExpenseCategory(branchId, id)
    if (ok) { if (categoryFilter === name) setCategoryFilter(''); load() }
  }

  const openEditExpense = (expense) => {
    setEditingExpense(expense)
    setEditForm({ name: expense.name, date: expense.date.slice(0, 10), category: expense.category, recipient: expense.recipient, amount: expense.amount, method: expense.method })
  }

  const submitEditExpense = async (e) => {
    e.preventDefault()
    const ok = await updateExpense(branchId, editingExpense._id, { ...editForm, amount: Number(editForm.amount) })
    if (ok) { setEditingExpense(null); load() }
  }

  const handleDeleteExpense = async (id) => {
    const ok = await deleteExpense(branchId, id)
    if (ok) load()
  }

  const totalAmount = overview?.totalAmount || 0

  return (
    <div>
      <div className='flex justify-between items-center mb-4 flex-wrap gap-3'>
        <div className='bg-bg-elevated border-l-4 border-[#F2542D] rounded-2xl p-5 flex items-center justify-between min-w-[240px]'>
          <div>
            <p className='text-muted text-xs mb-1'>{t('totalExpensesAmount')}</p>
            <p className='font-mono text-xl text-ink'>-{formatMoney(totalAmount)}</p>
            <p className='text-muted text-xs mt-1'>({appliedFilters.dateFrom} — {appliedFilters.dateTo})</p>
          </div>
          <span className='text-3xl'>📉</span>
        </div>
        <button onClick={() => setShowAddExpense(true)} className='px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium flex items-center gap-1.5'>
          <Plus size={15} strokeWidth={1.5} /> {t('newExpenseTitle')}
        </button>
      </div>

      <div className='flex flex-wrap gap-1.5 mb-4 items-center'>
        <button onClick={() => setCategoryFilter('')} className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${categoryFilter === '' ? 'bg-accent text-white border-accent' : 'bg-bg border-hairline text-muted'}`}>
          {t('anyCategory')}
        </button>
        {expenseCategories.map(c => (
          <button key={c._id} onClick={() => setCategoryFilter(c.name)}
            className='px-2.5 py-1 rounded-full text-xs font-medium border transition-colors'
            style={categoryFilter === c.name ? { backgroundColor: c.color, borderColor: c.color, color: 'white' } : { backgroundColor: 'transparent', borderColor: 'var(--color-hairline)', color: 'var(--color-muted, inherit)' }}>
            {c.name}
          </button>
        ))}
        <button onClick={() => setShowManageCategories(true)} title={t('manageCategoriesTitle')}
          className='w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-bg transition-colors'>
          <Settings size={15} strokeWidth={1.5} />
        </button>
      </div>

      <form onSubmit={applyFilters} className='sticky top-0 z-20 bg-bg-elevated border border-hairline rounded-2xl p-4 mb-6 flex flex-wrap gap-3 items-end'>
        <div>
          <p className='text-xs text-muted mb-1'>{t('dateFromLabel')}</p>
          <input type='date' value={filters.dateFrom} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
        </div>
        <div>
          <p className='text-xs text-muted mb-1'>{t('dateToLabel')}</p>
          <input type='date' value={filters.dateTo} onChange={e => setFilters({ ...filters, dateTo: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
        </div>
        <div>
          <p className='text-xs text-muted mb-1'>{t('expenseSearchPlaceholder')}</p>
          <input value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
        </div>
        <div>
          <p className='text-xs text-muted mb-1'>{t('expenseMethodLabel')}</p>
          <select value={filters.method} onChange={e => setFilters({ ...filters, method: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm'>
            <option value=''>{t('anyMethod')}</option>
            {METHODS.map(m => <option key={m} value={m}>{t('expenseMethod_' + m)}</option>)}
          </select>
        </div>
        <button type='submit' className='px-5 py-2 rounded-lg bg-[#F2542D] text-white text-sm font-medium'>{t('filterBtn')}</button>
      </form>

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
                    <button type='button' onClick={() => setEditingCategory(null)} className='w-7 h-7 rounded-lg flex items-center justify-center text-muted flex-shrink-0'><X size={14} /></button>
                  </form>
                ) : (
                  <>
                    <span className='flex items-center gap-2 flex-1 min-w-0'>
                      <span className='w-2.5 h-2.5 rounded-full flex-shrink-0' style={{ backgroundColor: c.color }} />
                      <span className='text-ink truncate'>{c.name}</span>
                    </span>
                    <span className='flex gap-1 flex-shrink-0'>
                      <button onClick={() => setEditingCategory(c)} className='w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-accent hover:bg-accent-soft'>
                        <Pencil size={13} strokeWidth={1.5} />
                      </button>
                      {c.name !== 'Boshqa' && (
                        <button onClick={() => handleDeleteCategory(c._id, c.name)} className='w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-rose-500 hover:bg-rose-50'>
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
              <input autoFocus placeholder={t('categoryNameLabel')} value={newCategory.name} onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                className='flex-1 px-2 py-1.5 rounded-lg bg-bg border border-hairline text-xs' />
              <button type='submit' className='px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium'>{t('add')}</button>
            </form>
          ) : (
            <button onClick={() => setAddingCategory(true)} className='mt-3 text-accent text-sm font-medium flex items-center gap-1'>
              <Plus size={14} strokeWidth={2} /> {t('addCategoryBtn')}
            </button>
          )}
        </Modal>
      )}

      <div className='hidden md:block bg-bg-elevated border border-hairline rounded-2xl overflow-hidden overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-4 py-3 font-medium'>{t('dateCol')}</th>
              <th className='px-4 py-3 font-medium'>{t('expenseNameLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('categoryLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('recipientLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('amountLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('expenseMethodLabel')}</th>
              <th className='px-4 py-3 font-medium'></th>
            </tr>
          </thead>
          <tbody>
            {(overview?.expenses || []).map(e => (
              editingExpense?._id === e._id ? (
                <tr key={e._id} className='border-b border-hairline last:border-0'>
                  <td colSpan={7} className='px-4 py-3'>
                    <form onSubmit={submitEditExpense} className='flex flex-wrap gap-2 items-end'>
                      <input type='date' value={editForm.date} onChange={ev => setEditForm({ ...editForm, date: ev.target.value })} className='px-2 py-1.5 rounded-lg bg-bg border border-hairline text-sm' />
                      <input value={editForm.name} onChange={ev => setEditForm({ ...editForm, name: ev.target.value })} className='px-2 py-1.5 rounded-lg bg-bg border border-hairline text-sm flex-1' required />
                      <Select className='w-40' value={editForm.category} onChange={(v) => setEditForm({ ...editForm, category: v })}
                        options={expenseCategories.map(c => ({ value: c.name, label: c.name }))} />
                      <input value={editForm.recipient} onChange={ev => setEditForm({ ...editForm, recipient: ev.target.value })} className='px-2 py-1.5 rounded-lg bg-bg border border-hairline text-sm' />
                      <input type='number' value={editForm.amount} onChange={ev => setEditForm({ ...editForm, amount: ev.target.value })} className='px-2 py-1.5 rounded-lg bg-bg border border-hairline text-sm w-28' required />
                      <Select className='w-36' value={editForm.method} onChange={(v) => setEditForm({ ...editForm, method: v })}
                        options={METHODS.map(m => ({ value: m, label: t('expenseMethod_' + m) }))} />
                      <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('save')}</button>
                      <button type='button' onClick={() => setEditingExpense(null)} className='px-4 py-2 rounded-lg bg-bg border border-hairline text-muted text-sm font-medium'>{t('cancel')}</button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={e._id} className='border-b border-hairline last:border-0 hover:bg-bg'>
                  <td className='px-4 py-3 text-muted whitespace-nowrap'>{new Date(e.date).toLocaleDateString('en-GB')}</td>
                  <td className='px-4 py-3 text-ink'>{e.name || '—'}</td>
                  <td className='px-4 py-3'>
                    <span className='text-xs font-medium px-2 py-1 rounded-full bg-hairline text-muted'>{e.category}</span>
                  </td>
                  <td className='px-4 py-3 text-muted'>{e.recipient || '—'}</td>
                  <td className='px-4 py-3 font-mono text-rose-600'>-{formatMoney(e.amount)}</td>
                  <td className='px-4 py-3 text-muted'>{t('expenseMethod_' + e.method)}</td>
                  <td className='px-4 py-3 text-right whitespace-nowrap'>
                    {isEditableToday(e) ? (
                      <>
                        <button onClick={() => openEditExpense(e)} className='px-3 py-1.5 rounded-lg bg-accent-soft text-accent text-sm font-medium mr-2'>{t('edit')}</button>
                        <button onClick={() => handleDeleteExpense(e._id)} className='px-3 py-1.5 rounded-lg bg-bg border border-hairline text-muted text-sm font-medium'>{t('removeBtn')}</button>
                      </>
                    ) : (
                      <span title={t('expenseLockedHint')} className='inline-flex items-center gap-1 text-muted text-xs'><Lock size={13} strokeWidth={1.5} /></span>
                    )}
                  </td>
                </tr>
              )
            ))}
            {overview && overview.expenses.length === 0 && (
              <tr><td colSpan={7} className='px-4 py-8 text-center text-muted'>{t('noExpensesYetPlain')}</td></tr>
            )}
            {!overview && (
              <tr><td colSpan={7} className='px-4 py-8 text-center text-muted'>{t('loading')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className='block md:hidden flex flex-col gap-2.5'>
        {!overview && <p className='text-muted text-sm text-center py-8'>{t('loading')}</p>}
        {overview && overview.expenses.length === 0 && <p className='text-muted text-sm text-center py-8'>{t('noExpensesYetPlain')}</p>}
        {(overview?.expenses || []).map(e => (
          <div key={e._id} className='bg-bg-elevated border border-hairline rounded-2xl p-4'>
            <div className='flex justify-between items-start gap-2'>
              <div className='min-w-0'>
                <p className='text-ink font-medium text-sm truncate'>{e.name || '—'}</p>
                <p className='text-muted text-xs mt-0.5'>{e.recipient || '—'} · {new Date(e.date).toLocaleDateString('en-GB')}</p>
              </div>
              <p className='font-mono text-rose-600 text-sm flex-shrink-0'>-{formatMoney(e.amount)}</p>
            </div>
            <div className='flex flex-wrap items-center gap-1.5 mt-2'>
              <span className='text-xs font-medium px-2 py-1 rounded-full bg-hairline text-muted'>{e.category}</span>
              <span className='text-xs font-medium px-2 py-1 rounded-full bg-hairline text-muted'>{t('expenseMethod_' + e.method)}</span>
            </div>
            {isEditableToday(e) && (
              <div className='flex gap-2 mt-3'>
                <button onClick={() => openEditExpense(e)} className='flex-1 px-3 py-1.5 rounded-lg bg-accent-soft text-accent text-sm font-medium'>{t('edit')}</button>
                <button onClick={() => handleDeleteExpense(e._id)} className='flex-1 px-3 py-1.5 rounded-lg bg-bg border border-hairline text-muted text-sm font-medium'>{t('removeBtn')}</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showAddExpense && (
        <Modal title={t('newExpenseTitle')} onClose={() => setShowAddExpense(false)}>
          <form onSubmit={submitExpense} className='flex flex-col gap-3'>
            <div>
              <p className='text-xs text-muted mb-1'>{t('expenseNameLabel')}</p>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
            </div>
            <div>
              <p className='text-xs text-muted mb-1'>{t('dateCol')}</p>
              <input type='date' value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
            </div>
            <div>
              <p className='text-xs text-muted mb-1'>{t('categoryLabel')}</p>
              <Select value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder={t('selectOption')}
                options={expenseCategories.map(c => ({ value: c.name, label: c.name }))} />
            </div>
            <div>
              <p className='text-xs text-muted mb-1'>{t('recipientLabel')}</p>
              <input value={form.recipient} onChange={e => setForm({ ...form, recipient: e.target.value })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
            </div>
            <div>
              <p className='text-xs text-muted mb-1'>{t('amountLabel')}</p>
              <input type='number' value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
            </div>
            <div>
              <p className='text-xs text-muted mb-2'>{t('expenseMethodLabel')}</p>
              <div className='grid grid-cols-3 gap-2'>
                {METHODS.map(m => (
                  <button type='button' key={m} onClick={() => setForm({ ...form, method: m })}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${form.method === m ? 'bg-accent-soft border-accent text-accent' : 'bg-bg border-hairline text-muted'}`}>
                    {t('expenseMethod_' + m)}
                  </button>
                ))}
              </div>
            </div>
            <button type='submit' className='py-2.5 rounded-xl bg-accent text-white text-sm font-medium mt-2 transition-colors'>{t('sendBtn')}</button>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default FinanceExpenses
