import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { formatMoney } from '../lib/format.js'
import { todayISO } from '../lib/date.js'

const FALLBACK_COLORS = ['#F2542D', '#3E7CB1', '#2E8B57', '#8E44AD', '#D6497A', '#B7950B', '#16A085', '#C0392B']
const colorForCategory = (name, categories) => {
  const match = categories.find(c => c.name === name)
  if (match) return match.color
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length]
}

const METHODS = ['cash', 'card', 'click', 'bank_transfer', 'payme', 'apelsin']
const DEFAULT_PENDING_FILTERS = { dateFrom: '', dateTo: '', method: '', search: '', amountMin: '', amountMax: '' }

const emptyExpenseForm = () => ({ name: '', date: todayISO(), category: '', recipient: '', amount: '', method: 'cash' })

const Expenses = () => {
  const {
    expenseCategories, getExpenseCategories, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
    getExpensesOverview, createExpense, updateExpense, deleteExpense,
  } = useContext(AdminContext)
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [overview, setOverview] = useState(null)
  const [groupBy, setGroupBy] = useState('month')
  // category is a LIVE filter (applies instantly, whether toggled in the panel or clicked on the
  // chart/legend) - everything else is a draft that only takes effect once "Filtr" is pressed,
  // matching the same pending-vs-applied pattern the Payments tab already uses
  const [categoryFilters, setCategoryFilters] = useState([])
  const [pendingFilters, setPendingFilters] = useState(DEFAULT_PENDING_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_PENDING_FILTERS)
  const [form, setForm] = useState(emptyExpenseForm())
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', color: '#7A7266' })
  const [editingCategory, setEditingCategory] = useState(null)
  const [editingExpense, setEditingExpense] = useState(null)
  const [editForm, setEditForm] = useState(emptyExpenseForm())

  const load = () => getExpensesOverview({ groupBy, categories: categoryFilters.join(','), ...appliedFilters }).then(d => { if (d) setOverview(d) })
  useEffect(() => { load() }, [groupBy, categoryFilters, appliedFilters])
  useEffect(() => { getExpenseCategories() }, [])

  const applyFilters = (e) => {
    e.preventDefault()
    setAppliedFilters(pendingFilters)
  }

  const toggleCategoryChip = (name) => setCategoryFilters(list => list.includes(name) ? list.filter(n => n !== name) : [...list, name])

  // the pie/legend "quick filter" - clicking a category not already active REPLACES the whole
  // selection with just that one (a fast "show me only this" shortcut); clicking the active one
  // clears it back to "all categories"
  const quickFilterCategory = (name) => setCategoryFilters(list => (list.length === 1 && list[0] === name) ? [] : [name])

  const submitExpense = async (e) => {
    e.preventDefault()
    const ok = await createExpense({ ...form, amount: Number(form.amount) })
    if (ok) { setForm(emptyExpenseForm()); load() }
  }

  const submitNewCategory = async (e) => {
    e.preventDefault()
    if (!newCategory.name.trim()) return
    const ok = await createExpenseCategory(newCategory)
    if (ok) { setNewCategory({ name: '', color: '#7A7266' }); setAddingCategory(false); getExpenseCategories() }
  }

  const submitEditCategory = async (e) => {
    e.preventDefault()
    const ok = await updateExpenseCategory(editingCategory._id, { name: editingCategory.name, color: editingCategory.color })
    if (ok) { setEditingCategory(null); load() }
  }

  const handleDeleteCategory = async (id, name) => {
    const ok = await deleteExpenseCategory(id)
    if (ok) { setCategoryFilters(list => list.filter(n => n !== name)); load() }
  }

  const openEditExpense = (expense) => {
    setEditingExpense(expense)
    setEditForm({ name: expense.name, date: expense.date.slice(0, 10), category: expense.category, recipient: expense.recipient, amount: expense.amount, method: expense.method })
  }

  const submitEditExpense = async (e) => {
    e.preventDefault()
    const ok = await updateExpense(editingExpense._id, { ...editForm, amount: Number(editForm.amount) })
    if (ok) { setEditingExpense(null); load() }
  }

  const handleDeleteExpense = async (id) => {
    const ok = await deleteExpense(id)
    if (ok) load()
  }

  const pieData = overview?.byCategory || []
  const totalAmount = overview?.totalAmount || 0

  return (
    <div>
      <div className='bg-bg-elevated border border-hairline rounded-2xl p-5 mb-6'>
        <p className='text-ink font-medium mb-3'>{t('newExpenseTitle')}</p>
        <form onSubmit={submitExpense} className='flex flex-wrap gap-3 items-end'>
          <div>
            <p className='text-xs text-muted mb-1'>{t('expenseNameLabel')}</p>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('dateCol')}</p>
            <input type='date' value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('categoryLabel')}</p>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required>
              <option value=''>{t('selectOption')}</option>
              {expenseCategories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('recipientLabel')}</p>
            <input value={form.recipient} onChange={e => setForm({ ...form, recipient: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('amountLabel')}</p>
            <input type='number' value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm w-32' required />
          </div>
          <div className='w-full'>
            <p className='text-xs text-muted mb-1'>{t('expenseMethodLabel')}</p>
            <div className='flex gap-3 flex-wrap'>
              {METHODS.map(m => (
                <label key={m} className='flex items-center gap-1.5 text-sm text-ink'>
                  <input type='radio' name='method' checked={form.method === m} onChange={() => setForm({ ...form, method: m })} />
                  {t('expenseMethod_' + m)}
                </label>
              ))}
            </div>
          </div>
          <button type='submit' className='px-5 py-2 rounded-lg bg-[#F2542D] text-white text-sm font-medium'>{t('sendBtn')}</button>
        </form>
      </div>

      <div className='flex gap-6 mb-6 items-stretch flex-wrap'>
        <div className='bg-bg-elevated border-l-4 border-[#F2542D] rounded-2xl p-5 flex items-center justify-between max-w-xs flex-1 min-w-[220px]'>
          <div>
            <p className='text-muted text-xs mb-1'>{t('totalExpensesAmount')}</p>
            <p className='font-mono text-xl text-red-500'>-{formatMoney(totalAmount)}</p>
          </div>
          <span className='text-3xl'>🪙</span>
        </div>

        <form onSubmit={applyFilters} className='bg-bg-elevated border border-hairline rounded-2xl p-4 flex flex-wrap gap-3 items-end flex-[2] min-w-[320px]'>
          <div>
            <p className='text-xs text-muted mb-1'>{t('dateFromLabel')}</p>
            <input type='date' value={pendingFilters.dateFrom} onChange={e => setPendingFilters({ ...pendingFilters, dateFrom: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('dateToLabel')}</p>
            <input type='date' value={pendingFilters.dateTo} onChange={e => setPendingFilters({ ...pendingFilters, dateTo: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('expenseMethodLabel')}</p>
            <select value={pendingFilters.method} onChange={e => setPendingFilters({ ...pendingFilters, method: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm'>
              <option value=''>{t('anyMethod')}</option>
              {METHODS.map(m => <option key={m} value={m}>{t('expenseMethod_' + m)}</option>)}
            </select>
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('nameOrRecipientLabel')}</p>
            <input value={pendingFilters.search} onChange={e => setPendingFilters({ ...pendingFilters, search: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
          </div>
          <div className='flex gap-1 items-end'>
            <div>
              <p className='text-xs text-muted mb-1'>{t('amountFromLabel')}</p>
              <input type='number' value={pendingFilters.amountMin} onChange={e => setPendingFilters({ ...pendingFilters, amountMin: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm w-24' />
            </div>
            <div>
              <p className='text-xs text-muted mb-1'>{t('amountToLabel')}</p>
              <input type='number' value={pendingFilters.amountMax} onChange={e => setPendingFilters({ ...pendingFilters, amountMax: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm w-24' />
            </div>
          </div>
          <div className='w-full'>
            <p className='text-xs text-muted mb-1'>{t('categoryLabel')}</p>
            <div className='flex flex-wrap gap-1.5'>
              {expenseCategories.map(c => (
                <button type='button' key={c._id} onClick={() => toggleCategoryChip(c.name)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border ${categoryFilters.includes(c.name) ? 'text-white border-transparent' : 'bg-bg border-hairline text-muted'}`}
                  style={categoryFilters.includes(c.name) ? { backgroundColor: c.color } : {}}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <button type='submit' className='px-5 py-2 rounded-lg bg-[#F2542D] text-white text-sm font-medium'>{t('filterBtn')}</button>
        </form>
      </div>

      <div className='grid grid-cols-3 gap-6 mb-6'>
        <div className='col-span-2 bg-bg-elevated border border-hairline rounded-2xl p-5'>
          <div className='flex justify-between items-center mb-2'>
            <p className='text-ink font-medium'>{t('expensesChartTitle')}</p>
            <div className='flex gap-2'>
              <button onClick={() => setGroupBy('month')} className={`px-3 py-1 rounded-lg text-xs font-medium ${groupBy === 'month' ? 'bg-accent text-white' : 'bg-bg border border-hairline text-muted'}`}>{t('monthlyToggle')}</button>
              <button onClick={() => setGroupBy('year')} className={`px-3 py-1 rounded-lg text-xs font-medium ${groupBy === 'year' ? 'bg-accent text-white' : 'bg-bg border border-hairline text-muted'}`}>{t('yearlyToggle')}</button>
            </div>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={overview?.series || []}>
                <CartesianGrid strokeDasharray='3 3' stroke='#E9E1D4' />
                <XAxis dataKey='period' stroke='#7A7266' fontSize={11} />
                <YAxis stroke='#7A7266' fontSize={11} tickFormatter={v => formatMoney(v)} width={70} />
                <Tooltip formatter={v => formatMoney(v)} />
                <Bar dataKey='total' fill='#F2542D' radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className='col-span-1 bg-bg-elevated border border-hairline rounded-2xl p-5'>
          <p className='text-ink font-medium mb-2'>{t('expensesByCategoryTitle')}</p>
          {pieData.length === 0 ? (
            <div style={{ height: 140 }} className='flex items-center justify-center'>
              <p className='text-muted text-xs'>{t('noExpensesYetPlain')}</p>
            </div>
          ) : (
            <div style={{ height: 140 }}>
              <ResponsiveContainer width='100%' height='100%'>
                <PieChart>
                  <Pie data={pieData} dataKey='total' nameKey='category' innerRadius={30} outerRadius={55} isAnimationActive={false}
                    onClick={(d) => quickFilterCategory(d.category)}>
                    {pieData.map(d => <Cell key={d.category} fill={colorForCategory(d.category, expenseCategories)} cursor='pointer' />)}
                  </Pie>
                  <Tooltip formatter={v => formatMoney(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className='flex flex-col gap-1.5 mt-2 max-h-32 overflow-y-auto'>
            {expenseCategories.map(c => (
              <div key={c._id} className='flex items-center justify-between text-xs'>
                {editingCategory?._id === c._id ? (
                  <form onSubmit={submitEditCategory} className='flex gap-1.5 items-center flex-1'>
                    <input type='color' value={editingCategory.color} onChange={e => setEditingCategory({ ...editingCategory, color: e.target.value })} className='w-7 h-7 rounded' />
                    <input value={editingCategory.name} onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })} className='flex-1 px-2 py-1.5 rounded-lg bg-bg border border-hairline text-xs' />
                    <button type='submit' className='px-2.5 py-1.5 rounded-lg bg-accent text-white font-medium'>{t('save')}</button>
                  </form>
                ) : (
                  <>
                    <button onClick={() => quickFilterCategory(c.name)} className='flex items-center gap-1.5 flex-1 text-left'>
                      <span className='w-2.5 h-2.5 rounded-full flex-shrink-0' style={{ backgroundColor: c.color }} />
                      <span className={categoryFilters.includes(c.name) ? 'text-ink font-medium' : 'text-muted'}>{c.name}</span>
                    </button>
                    <span className='flex gap-1.5'>
                      <button onClick={() => setEditingCategory(c)} className='px-2.5 py-1.5 rounded-lg bg-accent-soft text-accent font-medium'>{t('edit')}</button>
                      {c.name !== 'Other' && <button onClick={() => handleDeleteCategory(c._id, c.name)} className='w-7 h-7 rounded-lg bg-bg border border-hairline text-muted flex items-center justify-center text-base leading-none'>×</button>}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
          {addingCategory ? (
            <form onSubmit={submitNewCategory} className='flex gap-1.5 items-center mt-2'>
              <input type='color' value={newCategory.color} onChange={e => setNewCategory({ ...newCategory, color: e.target.value })} className='w-7 h-7 rounded' />
              <input autoFocus placeholder={t('categoryNameLabel')} value={newCategory.name} onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                className='flex-1 px-2 py-1.5 rounded-lg bg-bg border border-hairline text-xs' />
              <button type='submit' className='px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium'>{t('add')}</button>
            </form>
          ) : (
            <button onClick={() => setAddingCategory(true)} className='mt-2 text-accent text-sm font-medium'>+ {t('addCategoryBtn')}</button>
          )}
        </div>
      </div>

      <div className='bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
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
                      <input type='date' value={editForm.date} onChange={ev => setEditForm({ ...editForm, date: ev.target.value })} className='px-2 py-1.5 rounded-lg bg-bg border border-hairline text-sm' required />
                      <input value={editForm.name} onChange={ev => setEditForm({ ...editForm, name: ev.target.value })} className='px-2 py-1.5 rounded-lg bg-bg border border-hairline text-sm flex-1' required />
                      <select value={editForm.category} onChange={ev => setEditForm({ ...editForm, category: ev.target.value })} className='px-2 py-1.5 rounded-lg bg-bg border border-hairline text-sm'>
                        {expenseCategories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                      </select>
                      <input value={editForm.recipient} onChange={ev => setEditForm({ ...editForm, recipient: ev.target.value })} className='px-2 py-1.5 rounded-lg bg-bg border border-hairline text-sm' />
                      <input type='number' value={editForm.amount} onChange={ev => setEditForm({ ...editForm, amount: ev.target.value })} className='px-2 py-1.5 rounded-lg bg-bg border border-hairline text-sm w-28' required />
                      <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('save')}</button>
                      <button type='button' onClick={() => setEditingExpense(null)} className='px-4 py-2 rounded-lg bg-bg border border-hairline text-muted text-sm font-medium'>{t('cancel')}</button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={e._id} onClick={() => navigate('/finance/expenses/' + e._id)} className='border-b border-hairline last:border-0 cursor-pointer hover:bg-bg'>
                  <td className='px-4 py-3 text-muted'>{new Date(e.date).toLocaleDateString()}</td>
                  <td className='px-4 py-3 text-ink'>{e.name || '—'}</td>
                  <td className='px-4 py-3'>
                    <span className='text-xs font-medium px-2 py-1 rounded-full' style={{ backgroundColor: colorForCategory(e.category, expenseCategories) + '30', color: colorForCategory(e.category, expenseCategories) }}>{e.category}</span>
                  </td>
                  <td className='px-4 py-3 text-muted'>{e.recipient || '—'}</td>
                  <td className='px-4 py-3 font-mono text-red-500'>-{formatMoney(e.amount)}</td>
                  <td className='px-4 py-3 text-muted'>{t('expenseMethod_' + e.method)}</td>
                  <td className='px-4 py-3 text-right whitespace-nowrap'>
                    <button onClick={(ev) => { ev.stopPropagation(); openEditExpense(e) }} className='px-3 py-1.5 rounded-lg bg-accent-soft text-accent text-sm font-medium mr-2'>{t('edit')}</button>
                    <button onClick={(ev) => { ev.stopPropagation(); handleDeleteExpense(e._id) }} className='px-3 py-1.5 rounded-lg bg-bg border border-hairline text-muted text-sm font-medium'>{t('removeBtn')}</button>
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
    </div>
  )
}

export default Expenses
