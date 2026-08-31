import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Plus, TrendingDown, SlidersHorizontal, Lock, Search, Settings, Pencil, X } from 'lucide-react'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import Modal from '../components/Modal.jsx'
import Select from '../components/Select.jsx'
import DatePicker from '../components/DatePicker.jsx'
import { formatMoney } from '../lib/format.js'
import { todayISO, formatDateTime } from '../lib/date.js'

const FALLBACK_COLORS = ['#6366F1', '#3E7CB1', '#2E8B57', '#8E44AD', '#D6497A', '#B7950B', '#16A085', '#C0392B']
const colorForCategory = (name, categories) => {
  const match = categories.find(c => c.name === name)
  if (match) return match.color
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length]
}

const METHODS = ['cash', 'card', 'click', 'bank_transfer', 'payme', 'apelsin']
// search lives outside this object now - it's a live top-level search bar, not part of the
// "advanced filters" panel that only applies once its own submit button is pressed
const DEFAULT_PENDING_FILTERS = { dateFrom: '', dateTo: '', method: '', amountMin: '', amountMax: '' }
const FIELD = 'w-full px-3 py-2 rounded-lg bg-[#f5f5f7] dark:bg-[#1E293B] dark:text-slate-200 border-none text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 dark:focus:ring-[#4F46E5]/30'

const emptyExpenseForm = () => ({ name: '', date: todayISO(), category: '', recipient: '', amount: '', method: 'cash' })

// 'period' is 'YYYY-MM' when grouped by month ('2026-08') and just a bare year when grouped by
// year ('2026') - only the month case needs translating, a bare year already reads fine as-is in
// every language
const formatPeriodLabel = (period, groupBy, t) => {
  if (groupBy !== 'month' || !period || !period.includes('-')) return period
  const mm = period.slice(5, 7)
  return t('monthShort_' + mm)
}

const Expenses = () => {
  const {
    expenseCategories, getExpenseCategories, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
    getExpensesOverview, createExpense, updateExpense, deleteExpense,
  } = useContext(AdminContext)
  const { t } = useLanguage()
  const { isDark } = useTheme()
  const navigate = useNavigate()

  const [overview, setOverview] = useState(null)
  const [groupBy, setGroupBy] = useState('month')
  // category is a LIVE filter (applies instantly, whether toggled in the panel or clicked on the
  // chart/legend) - everything else is a draft that only takes effect once "Filtr" is pressed,
  // matching the same pending-vs-applied pattern the Payments tab already uses
  const [categoryFilters, setCategoryFilters] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [pendingFilters, setPendingFilters] = useState(DEFAULT_PENDING_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_PENDING_FILTERS)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showManageCategories, setShowManageCategories] = useState(false)
  const [form, setForm] = useState(emptyExpenseForm())
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', color: '#7A7266' })
  const [editingCategory, setEditingCategory] = useState(null)
  const [editingExpense, setEditingExpense] = useState(null)
  const [editForm, setEditForm] = useState(emptyExpenseForm())
  const [showExpenseBreakdown, setShowExpenseBreakdown] = useState(false)

  const load = () => getExpensesOverview({ groupBy, categories: categoryFilters.join(','), search: searchTerm, ...appliedFilters }).then(d => { if (d) setOverview(d) })
  // a short debounce only while actively typing a search term - every other filter change (category
  // chip, date range, groupBy toggle) still reloads instantly, there's just nothing to type there
  useEffect(() => {
    const handle = setTimeout(load, searchTerm ? 300 : 0)
    return () => clearTimeout(handle)
  }, [groupBy, categoryFilters, appliedFilters, searchTerm])
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
    if (!form.name || !form.category || !form.amount) return
    const ok = await createExpense({ ...form, amount: Number(form.amount) })
    if (ok) { setForm(emptyExpenseForm()); setShowAddExpense(false); load() }
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
  // computed straight from the already-loaded (unpaginated) expense list - same numbers as
  // totalAmount/byCategory above, just grouped by method instead of category, so this costs nothing
  // extra over the network
  const expenseByMethod = METHODS.map(m => ({
    method: m, total: (overview?.expenses || []).filter(e => e.method === m).reduce((sum, e) => sum + e.amount, 0),
  }))
  // matches the backend's own same-day lock (expenseController.js's isEditableToday) - an expense
  // can only be edited/deleted while it's still dated today; once the day rolls over it's locked in,
  // so a branch's daily cash position can't quietly change after the fact
  const isEditableToday = (expense) => expense.date.slice(0, 10) === todayISO()

  return (
    <div>
      <div className='flex justify-end mb-4'>
        <button onClick={() => setShowAddExpense(true)}
          className='px-4 py-2 rounded-xl bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10 text-sm font-medium transition-colors shadow-sm flex items-center gap-1.5'>
          <Plus size={15} strokeWidth={1.5} /> {t('newExpenseTitle')}
        </button>
      </div>

      <div className='flex gap-3 mb-4 items-center flex-wrap'>
        <button onClick={() => setShowExpenseBreakdown(v => !v)}
          className='plain text-left bg-white dark:bg-[#161F30] border border-slate-100 dark:border-slate-800/80 rounded-2xl px-5 py-3 shadow-sm dark:shadow-black/40 hover:border-slate-300 dark:hover:border-slate-700 transition-colors'>
          <div className='flex items-center gap-3'>
            <TrendingDown size={20} strokeWidth={1.5} className='text-slate-400 dark:text-slate-600 flex-shrink-0' />
            <div>
              <p className='text-muted text-[11px] leading-tight'>{t('totalExpensesAmount')}</p>
              <p className='font-bold tracking-tight text-lg text-[#1D1D1F] dark:text-[#F8FAFC] leading-tight'>-{formatMoney(totalAmount)}</p>
            </div>
          </div>
          {showExpenseBreakdown && (
            <div className='mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5 min-w-[190px]' onClick={e => e.stopPropagation()}>
              <p className='text-[11px] font-medium text-slate-400 dark:text-slate-600 uppercase tracking-wide mb-0.5'>{t('expensesByMethodTitle')}</p>
              {expenseByMethod.map(m => (
                <div key={m.method} className='flex justify-between gap-6 text-xs'>
                  <span className='text-muted'>{t('expenseMethod_' + m.method)}</span>
                  <span className='font-mono text-[#1D1D1F] dark:text-[#F8FAFC]'>{formatMoney(m.total)}</span>
                </div>
              ))}
            </div>
          )}
        </button>

        <div className='relative flex-1 min-w-[220px]'>
          <Search size={15} strokeWidth={1.5} className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600' />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t('expenseSearchPlaceholder')}
            className='w-full h-10 pl-9 pr-3 rounded-xl bg-white dark:bg-[#161F30] border border-slate-200/60 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent dark:text-slate-200' />
        </div>

        <button onClick={() => setShowFilters(v => !v)}
          className={`h-10 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors flex-shrink-0 ${showFilters ? 'bg-blue-50 text-blue-700 dark:bg-[#1E1B4B] dark:text-[#818CF8]' : 'bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-slate-300'}`}>
          <SlidersHorizontal size={15} strokeWidth={1.75} /> {t('filterBtn')}
        </button>
      </div>

      {showFilters && (
        <form onSubmit={applyFilters} className='flex flex-wrap gap-3 items-end mb-4 bg-white dark:bg-[#161F30] border border-slate-200/60 dark:border-slate-800 rounded-2xl p-4'>
          <div>
            <p className='text-xs text-muted mb-1'>{t('dateFromLabel')}</p>
            <DatePicker className='w-36' value={pendingFilters.dateFrom} onChange={(v) => setPendingFilters({ ...pendingFilters, dateFrom: v })} />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('dateToLabel')}</p>
            <DatePicker className='w-36' value={pendingFilters.dateTo} onChange={(v) => setPendingFilters({ ...pendingFilters, dateTo: v })} />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('expenseMethodLabel')}</p>
            <Select className='w-40' value={pendingFilters.method} onChange={(v) => setPendingFilters({ ...pendingFilters, method: v })} placeholder={t('anyMethod')}
              options={[{ value: '', label: t('anyMethod') }, ...METHODS.map(m => ({ value: m, label: t('expenseMethod_' + m) }))]} />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('amountRangeLabel')}</p>
            <div className='flex items-center gap-1.5'>
              <input type='number' placeholder={t('amountFromLabel')} value={pendingFilters.amountMin} onChange={e => setPendingFilters({ ...pendingFilters, amountMin: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm w-24' />
              <span className='text-muted text-xs'>—</span>
              <input type='number' placeholder={t('amountToLabel')} value={pendingFilters.amountMax} onChange={e => setPendingFilters({ ...pendingFilters, amountMax: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm w-24' />
            </div>
          </div>
          <div className='w-full'>
            <p className='text-xs text-muted mb-1'>{t('categoryLabel')}</p>
            <div className='flex flex-wrap gap-1.5'>
              {expenseCategories.map(c => (
                <button type='button' key={c._id} onClick={() => toggleCategoryChip(c.name)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${categoryFilters.includes(c.name) ? 'text-white border-transparent' : 'bg-slate-100 dark:bg-slate-800/40 border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800/70'}`}
                  style={categoryFilters.includes(c.name) ? { backgroundColor: c.color } : {}}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] text-sm font-medium transition-colors'>
            {t('applyBtn')}
          </button>
        </form>
      )}

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6'>
        <div className='lg:col-span-2 bg-white dark:bg-[#161F30] border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm dark:shadow-black/40'>
          <div className='flex justify-between items-center mb-2'>
            <p className='text-ink font-medium'>{t('expensesChartTitle')}</p>
            <div className='flex gap-1 bg-slate-100 dark:bg-slate-800/40 rounded-lg p-1'>
              <button onClick={() => setGroupBy('month')} className={`plain px-3 py-1 rounded-md text-xs font-medium transition-colors ${groupBy === 'month' ? 'bg-white dark:bg-[#1E293B] text-[#1D1D1F] dark:text-[#F8FAFC] shadow-sm' : 'text-slate-500 dark:text-[#94A3B8]'}`}>{t('monthlyToggle')}</button>
              <button onClick={() => setGroupBy('year')} className={`plain px-3 py-1 rounded-md text-xs font-medium transition-colors ${groupBy === 'year' ? 'bg-white dark:bg-[#1E293B] text-[#1D1D1F] dark:text-[#F8FAFC] shadow-sm' : 'text-slate-500 dark:text-[#94A3B8]'}`}>{t('yearlyToggle')}</button>
            </div>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={overview?.series || []}>
                <CartesianGrid strokeDasharray='3 3' vertical={false} stroke={isDark ? '#1E293B' : '#E2E8F0'} strokeOpacity={isDark ? 1 : 0.7} />
                <XAxis dataKey='period' tickFormatter={(v) => formatPeriodLabel(v, groupBy, t)} stroke={isDark ? '#64748B' : '#94a3b8'} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={isDark ? '#64748B' : '#94a3b8'} fontSize={11} tickFormatter={v => formatMoney(v)} width={70} tickLine={false} axisLine={false} />
                <Tooltip formatter={v => formatMoney(v)} labelFormatter={(v) => formatPeriodLabel(v, groupBy, t)} contentStyle={isDark ? { backgroundColor: '#161F30', border: '1px solid #1E293B', color: '#F8FAFC' } : undefined} labelStyle={isDark ? { color: '#F8FAFC' } : undefined} itemStyle={isDark ? { color: '#F8FAFC' } : undefined} />
                <Bar dataKey='total' fill='#6366F1' radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className='bg-white dark:bg-[#161F30] border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm dark:shadow-black/40'>
          <div className='flex justify-between items-center mb-2'>
            <p className='text-ink font-medium'>{t('expensesByCategoryTitle')}</p>
            <button onClick={() => setShowManageCategories(true)} title={t('manageCategoriesTitle')}
              className='plain w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors'>
              <Settings size={15} strokeWidth={1.5} />
            </button>
          </div>
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
                  <Tooltip formatter={v => formatMoney(v)} contentStyle={isDark ? { backgroundColor: '#161F30', border: '1px solid #1E293B', color: '#F8FAFC' } : undefined} labelStyle={isDark ? { color: '#F8FAFC' } : undefined} itemStyle={isDark ? { color: '#F8FAFC' } : undefined} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {/* pure display list now - name, amount, share of total. Editing/deleting categories moved
              into the Settings-gear modal above so this stays a read-only analytics legend, not an
              editing form */}
          <div className='flex flex-col gap-1.5 mt-2 max-h-32 overflow-y-auto'>
            {pieData.map(d => (
              <button key={d.category} onClick={() => quickFilterCategory(d.category)} className='plain flex items-center justify-between text-xs w-full text-left'>
                <span className='flex items-center gap-1.5 min-w-0'>
                  <span className='w-2.5 h-2.5 rounded-full flex-shrink-0' style={{ backgroundColor: colorForCategory(d.category, expenseCategories) }} />
                  <span className={`truncate ${categoryFilters.includes(d.category) ? 'text-ink font-medium' : 'text-muted'}`}>{d.category}</span>
                </span>
                <span className='text-slate-400 dark:text-slate-500 flex-shrink-0 ml-2'>
                  {formatMoney(d.total)} · {totalAmount > 0 ? Math.round(d.total / totalAmount * 100) : 0}%
                </span>
              </button>
            ))}
          </div>
          {addingCategory ? (
            <form onSubmit={submitNewCategory} className='flex gap-1.5 items-center mt-3'>
              <input type='color' value={newCategory.color} onChange={e => setNewCategory({ ...newCategory, color: e.target.value })} className='w-7 h-7 rounded' />
              <input autoFocus placeholder={t('categoryNameLabel')} value={newCategory.name} onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                className='flex-1 px-2 py-1.5 rounded-lg bg-bg border border-hairline text-xs' />
              <button type='submit' className='px-3 py-1.5 rounded-lg bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10 text-xs font-medium'>{t('add')}</button>
            </form>
          ) : (
            <button onClick={() => setAddingCategory(true)} className='plain mt-3 text-accent dark:text-[#818CF8] text-sm font-medium flex items-center gap-1'>
              <Plus size={14} strokeWidth={2} /> {t('addCategoryBtn')}
            </button>
          )}
        </div>
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
                    <button type='submit' className='px-3 py-1.5 rounded-lg bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] text-xs font-medium'>{t('save')}</button>
                    <button type='button' onClick={() => setEditingCategory(null)} className='plain w-7 h-7 rounded-lg flex items-center justify-center text-muted flex-shrink-0'><X size={14} /></button>
                  </form>
                ) : (
                  <>
                    <span className='flex items-center gap-2 flex-1 min-w-0'>
                      <span className='w-2.5 h-2.5 rounded-full flex-shrink-0' style={{ backgroundColor: c.color }} />
                      <span className='text-ink truncate'>{c.name}</span>
                    </span>
                    <span className='flex gap-1 flex-shrink-0'>
                      <button onClick={() => setEditingCategory(c)} className='plain w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-accent dark:hover:text-[#818CF8] hover:bg-accent-soft dark:hover:bg-[#1E1B4B]'>
                        <Pencil size={13} strokeWidth={1.5} />
                      </button>
                      {c.name !== 'Other' && (
                        <button onClick={() => handleDeleteCategory(c._id, c.name)} className='plain w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10'>
                          <X size={14} strokeWidth={1.5} />
                        </button>
                      )}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}

      <div className='hidden md:block bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
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
                      <DatePicker className='w-36' value={editForm.date} onChange={(v) => setEditForm({ ...editForm, date: v })} />
                      <input value={editForm.name} onChange={ev => setEditForm({ ...editForm, name: ev.target.value })} className='px-2 py-1.5 rounded-lg bg-bg border border-hairline text-sm flex-1' required />
                      <Select className='w-40' value={editForm.category} onChange={(v) => setEditForm({ ...editForm, category: v })}
                        options={expenseCategories.map(c => ({ value: c.name, label: c.name }))} />
                      <input value={editForm.recipient} onChange={ev => setEditForm({ ...editForm, recipient: ev.target.value })} className='px-2 py-1.5 rounded-lg bg-bg border border-hairline text-sm' />
                      <input type='number' value={editForm.amount} onChange={ev => setEditForm({ ...editForm, amount: ev.target.value })} className='px-2 py-1.5 rounded-lg bg-bg border border-hairline text-sm w-28' required />
                      <Select className='w-36' value={editForm.method} onChange={(v) => setEditForm({ ...editForm, method: v })}
                        options={METHODS.map(m => ({ value: m, label: t('expenseMethod_' + m) }))} />
                      <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10 text-sm font-medium'>{t('save')}</button>
                      <button type='button' onClick={() => setEditingExpense(null)} className='px-4 py-2 rounded-lg bg-bg border border-hairline text-muted text-sm font-medium'>{t('cancel')}</button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={e._id} onClick={() => navigate('/finance/expenses/' + e._id)} className='border-b border-hairline last:border-0 cursor-pointer hover:bg-bg'>
                  <td className='px-4 py-3 text-muted whitespace-nowrap'>{formatDateTime(e.date)}</td>
                  <td className='px-4 py-3 text-ink'>{e.name || '—'}</td>
                  <td className='px-4 py-3'>
                    <span className='text-xs font-medium px-2 py-1 rounded-full' style={{ backgroundColor: colorForCategory(e.category, expenseCategories) + (isDark ? '3D' : '30'), color: colorForCategory(e.category, expenseCategories) }}>{e.category}</span>
                  </td>
                  <td className='px-4 py-3 text-muted'>{e.recipient || '—'}</td>
                  <td className='px-4 py-3 font-mono text-red-500 dark:text-rose-400'>-{formatMoney(e.amount)}</td>
                  <td className='px-4 py-3 text-muted'>{t('expenseMethod_' + e.method)}</td>
                  <td className='px-4 py-3 text-right whitespace-nowrap'>
                    {isEditableToday(e) ? (
                      <>
                        <button onClick={(ev) => { ev.stopPropagation(); openEditExpense(e) }} className='px-3 py-1.5 rounded-lg bg-accent-soft text-accent dark:bg-[#1E1B4B] dark:text-[#818CF8] text-sm font-medium mr-2'>{t('edit')}</button>
                        <button onClick={(ev) => { ev.stopPropagation(); handleDeleteExpense(e._id) }} className='px-3 py-1.5 rounded-lg bg-bg border border-hairline text-muted text-sm font-medium'>{t('removeBtn')}</button>
                      </>
                    ) : (
                      <span title={t('expenseLockedHint')} className='inline-flex items-center gap-1 text-slate-300 dark:text-slate-600 text-xs'><Lock size={13} strokeWidth={1.5} /></span>
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

      <div className='block md:hidden flex flex-col gap-3 mt-4'>
        {!overview && <p className='text-muted text-sm text-center py-8'>{t('loading')}</p>}
        {overview && overview.expenses.length === 0 && <p className='text-muted text-sm text-center py-8'>{t('noExpensesYetPlain')}</p>}
        {(overview?.expenses || []).map(e => (
          <button key={e._id} onClick={() => navigate('/finance/expenses/' + e._id)}
            className='plain bg-white dark:bg-[#161F30] rounded-2xl border border-slate-100 dark:border-slate-800/80 p-4 flex justify-between items-center shadow-sm dark:shadow-black/40 text-left w-full'>
            <div className='min-w-0'>
              <p className='font-semibold text-[#1D1D1F] dark:text-[#F8FAFC] text-sm truncate'>{e.name || '—'}</p>
              <p className='text-xs text-slate-400 dark:text-slate-600 mt-1 truncate'>{e.recipient || '—'} • {formatDateTime(e.date)}</p>
              <span className='inline-block text-[10px] font-medium px-2 py-0.5 mt-1.5 rounded-full'
                style={{ backgroundColor: colorForCategory(e.category, expenseCategories) + (isDark ? '3D' : '30'), color: colorForCategory(e.category, expenseCategories) }}>
                {e.category}
              </span>
            </div>
            <p className='text-base font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC] flex-shrink-0 ml-3'>-{formatMoney(e.amount)}</p>
          </button>
        ))}
      </div>

      {showAddExpense && (
        <Modal title={t('newExpenseTitle')} onClose={() => setShowAddExpense(false)}>
          <form onSubmit={submitExpense} className='flex flex-col gap-3'>
            <div>
              <p className='text-xs text-muted mb-1'>{t('expenseNameLabel')}</p>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={FIELD} required />
            </div>
            <div>
              <p className='text-xs text-muted mb-1'>{t('dateCol')}</p>
              <DatePicker value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
            </div>
            <div>
              <p className='text-xs text-muted mb-1'>{t('categoryLabel')}</p>
              <Select value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder={t('selectOption')}
                options={expenseCategories.map(c => ({ value: c.name, label: c.name }))} />
            </div>
            <div>
              <p className='text-xs text-muted mb-1'>{t('recipientLabel')}</p>
              <input value={form.recipient} onChange={e => setForm({ ...form, recipient: e.target.value })} className={FIELD} />
            </div>
            <div>
              <p className='text-xs text-muted mb-1'>{t('amountLabel')}</p>
              <input type='number' value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={FIELD} required />
            </div>
            <div>
              <p className='text-xs text-muted mb-2'>{t('expenseMethodLabel')}</p>
              <div className='grid grid-cols-3 gap-2'>
                {METHODS.map(m => (
                  <button type='button' key={m} onClick={() => setForm({ ...form, method: m })}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${form.method === m ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-[#1E1B4B] dark:text-[#818CF8] dark:border-[#312E81]' : 'bg-[#f5f5f7] border-transparent text-slate-600 hover:bg-slate-200/70 dark:bg-[#1E293B] dark:text-slate-300 dark:hover:bg-slate-800/70'}`}>
                    {t('expenseMethod_' + m)}
                  </button>
                ))}
              </div>
            </div>
            <button type='submit' className='py-2.5 rounded-xl bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10 text-sm font-medium mt-2 transition-colors'>{t('sendBtn')}</button>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default Expenses
