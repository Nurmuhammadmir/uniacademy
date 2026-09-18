import { useState } from 'react'
import { useManager } from '../../context/ManagerContext'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import DatePicker from '../../components/DatePicker'
import Select from '../../components/Select'
import {
  Wallet, TrendingDown, TrendingUp, ArrowUpCircle, Banknote, CreditCard, Landmark,
  X, Plus, MoreVertical, Pencil, Filter,
} from 'lucide-react'
import type { ManagerTransaction, ManagerTransactionInput } from '../../context/ManagerContext'

const todayStr = () => new Date().toISOString().slice(0, 10)

// manager's own counterpart of admin/Finance.tsx's TransactionFormModal - same 3 types (income/
// expense/adjustment), just against ManagerContext instead of AdminContext, and against this
// manager's own client list + expense categories (read-only here - only admin manages the category
// list itself, see Settings).
const TransactionFormModal = ({ initial, onClose }: { initial?: ManagerTransaction; onClose: () => void }) => {
  const { clients, expenseCategories, currency, addTransaction, updateTransaction } = useManager()
  const { t } = useLanguage()
  const isEdit = !!initial

  const [type, setType] = useState<'income' | 'expense' | 'adjustment'>(initial?.type === 'payment' ? 'income' : (initial?.type || 'expense'))
  const [clientId, setClientId] = useState(initial?.clientId || '')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>(initial?.paymentMethod || 'cash')
  const [amount, setAmount] = useState(initial?.amount || 0)
  const [category, setCategory] = useState(initial?.category || '')
  const [date, setDate] = useState(initial?.date ? initial.date.slice(0, 10) : todayStr())
  const [notes, setNotes] = useState(initial?.notes || '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || amount <= 0) return
    if (type === 'income' && !clientId) return
    setSaving(true)
    const payload: ManagerTransactionInput = {
      type, amount, category: type === 'expense' ? category : '', notes, paymentMethod,
      clientId: type === 'income' ? clientId : undefined, date,
    }
    const ok = isEdit && initial ? await updateTransaction(initial._id, payload) : await addTransaction(payload)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 modal-backdrop" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl modal-card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-900">{isEdit ? t('finance.editTransaction') : t('finance.addTransaction')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{t('finance.transactionType')}</label>
              <Select
                value={type}
                onChange={v => { setType(v as typeof type); setClientId(''); setCategory('') }}
                options={[
                  { value: 'income', label: t('finance.typeIncome') },
                  { value: 'expense', label: t('finance.typeExpense') },
                  { value: 'adjustment', label: t('finance.typeAdjustment') },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{t('finance.amount')} ({currency})</label>
              <input type="number" min={0} value={amount} onChange={e => setAmount(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono-data text-gray-900 focus:outline-none focus:border-[#0066CC]" />
            </div>
          </div>
          {type === 'income' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{t('finance.client')}</label>
              <Select
                value={clientId}
                onChange={setClientId}
                placeholder={t('finance.selectClient')}
                options={clients.map(c => ({ value: c._id, label: c.name }))}
              />
            </div>
          )}
          {type === 'expense' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{t('finance.category')}</label>
              <Select
                value={category}
                onChange={setCategory}
                placeholder={t('finance.selectCategory')}
                options={expenseCategories.map(cat => ({ value: cat, label: cat }))}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{t('orders.paymentMethod')}</label>
              <Select
                value={paymentMethod}
                onChange={v => setPaymentMethod(v as typeof paymentMethod)}
                options={[
                  { value: 'cash', label: t('orders.cash') },
                  { value: 'card', label: t('orders.card') },
                  { value: 'transfer', label: t('orders.transfer') },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{t('finance.date')}</label>
              <DatePicker value={date} max={todayStr()} onChange={setDate} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{t('finance.notesPlaceholder')}</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('finance.notesPlaceholder')}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-[#0066CC]" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving || !amount || (type === 'income' && !clientId)}
              className="flex-1 py-2.5 rounded-xl bg-[#0066CC] text-white text-sm font-medium hover:bg-[#0052A3] transition-colors disabled:opacity-40">
              {saving ? t('common.saving') : t('finance.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// manager's own scoped Finance page - same shape as admin's, but everything (income/expenses/net
// profit/byMethod) is derived only from THIS manager's own orders/clients/transactions (all already
// scoped that way by ManagerContext/reportMine - see lamusFinanceController.reportMine's own
// comment). No opening balance card (company-wide concept), no category management (admin-only),
// and - the one deliberate difference from admin's version - never a delete option, anywhere: a
// manager can log and correct their own entries, but never erase one. Editing is only offered for
// entries this manager themselves created (the server enforces the same rule independently).
const ManagerFinance = () => {
  const { orders, transactions, clients, currency } = useManager()
  const { user } = useAuth()
  const { t, fmtDate } = useLanguage()

  const [txModal, setTxModal] = useState<{ transaction?: ManagerTransaction } | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [listType, setListType] = useState<'all' | 'income' | 'expense' | 'adjustment' | 'payment'>('all')

  const inRange = (iso: string) => {
    const d = iso.slice(0, 10)
    if (dateFrom && d < dateFrom) return false
    if (dateTo && d > dateTo) return false
    return true
  }

  const rangedOrders = orders.filter(o => inRange(o.createdAt))
  const rangedTx = transactions.filter(tx => inRange(tx.date))
  const incomeTx = rangedTx.filter(tx => tx.type === 'income')
  const expenseTx = rangedTx.filter(tx => tx.type === 'expense')

  const income = rangedOrders.reduce((s, o) => s + o.paymentAmount, 0) + incomeTx.reduce((s, tx) => s + tx.amount, 0)
  const expenses = expenseTx.reduce((s, tx) => s + tx.amount, 0)
  const netProfit = income - expenses
  const receivable = clients.reduce((s, c) => s + Math.max(0, c.balance), 0)

  const balanceCutoff = dateTo || todayStr()
  const ordersToDate = orders.filter(o => o.createdAt.slice(0, 10) <= balanceCutoff)
  const txToDate = transactions.filter(tx => tx.date.slice(0, 10) <= balanceCutoff)
  const byMethod = { cash: 0, card: 0, transfer: 0 }
  ordersToDate.forEach(o => { if (o.paymentAmount > 0 && o.paymentMethod in byMethod) byMethod[o.paymentMethod as 'cash' | 'card' | 'transfer'] += o.paymentAmount })
  txToDate.filter(tx => tx.type === 'income').forEach(tx => { byMethod[tx.paymentMethod] += tx.amount })
  txToDate.filter(tx => tx.type === 'expense').forEach(tx => { byMethod[tx.paymentMethod] -= tx.amount })

  const summaryCards = [
    { label: t('finance.summaryIncome'), value: income, icon: TrendingUp, tone: 'text-green-600' },
    { label: t('finance.summaryExpenses'), value: expenses, icon: ArrowUpCircle, tone: 'text-amber-600' },
    { label: t('finance.summaryNetProfit'), value: netProfit, icon: Wallet, tone: netProfit >= 0 ? 'text-green-600' : 'text-amber-600' },
    { label: t('finance.summaryReceivable'), value: receivable, icon: TrendingDown, tone: 'text-amber-600' },
  ]
  const methodCards = [
    { label: t('orders.cash'), value: byMethod.cash, icon: Banknote },
    { label: t('orders.card'), value: byMethod.card, icon: CreditCard },
    { label: t('orders.transfer'), value: byMethod.transfer, icon: Landmark },
  ]

  const filteredList = rangedTx.filter(tx => listType === 'all' || tx.type === listType)
  const listTotal = filteredList.reduce((s, tx) => s + (tx.type === 'expense' ? -tx.amount : tx.amount), 0)

  const typeLabel = (type: string) => {
    if (type === 'income') return t('finance.typeIncome')
    if (type === 'expense') return t('finance.typeExpense')
    if (type === 'payment') return t('finance.typePayment')
    return t('finance.typeAdjustment')
  }
  const formatDate = (s: string) => fmtDate(s, { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="p-6 max-w-5xl">
      {txModal && <TransactionFormModal initial={txModal.transaction} onClose={() => setTxModal(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display text-gray-900">{t('finance.title')}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{t('finance.managerSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <DatePicker value={dateFrom} onChange={setDateFrom} max={dateTo || undefined} placeholder={t('finance.from')} allowClear className="w-36" />
          <span className="text-gray-400 text-sm">–</span>
          <DatePicker value={dateTo} onChange={setDateTo} min={dateFrom || undefined} placeholder={t('finance.to')} allowClear className="w-36" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-xs text-gray-400 hover:text-gray-600">
              {t('operations.clearDates')}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {summaryCards.map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 text-gray-400 mb-2">
              <card.icon size={13} />
              <span className="text-[10px] font-medium uppercase tracking-wider">{card.label}</span>
            </div>
            <div className={`font-mono-data text-lg font-semibold ${card.tone}`}>
              {card.value.toLocaleString()} <span className="text-xs font-normal text-gray-400">{currency}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('finance.byMethodTitle')}</div>
          <div className="text-[11px] text-gray-400">{t('finance.balanceAsOf', { date: formatDate(balanceCutoff) })}</div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {methodCards.map(card => (
            <div key={card.label} className="bg-gray-50 rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 text-gray-500 mb-1.5">
                <card.icon size={13} />
                <span className="text-[11px] font-medium">{card.label}</span>
              </div>
              <div className="font-mono-data text-base font-semibold text-gray-900">{card.value.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
            <Filter size={13} /> {t('finance.recentTransactions')}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={listType}
              onChange={v => setListType(v as typeof listType)}
              triggerClassName="flex items-center justify-between gap-1.5 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 bg-white hover:border-gray-300 focus:outline-none focus:border-[#0066CC] transition-all"
              options={[
                { value: 'all', label: t('finance.filterAllTypes') },
                { value: 'income', label: t('finance.typeIncome') },
                { value: 'expense', label: t('finance.typeExpense') },
                { value: 'adjustment', label: t('finance.typeAdjustment') },
                { value: 'payment', label: t('finance.typePayment') },
              ]}
            />
            <button onClick={() => setTxModal({})}
              className="w-8 h-8 rounded-full bg-[#0066CC] text-white flex items-center justify-center hover:bg-[#0052A3] transition-colors flex-shrink-0"
              title={t('finance.addTransaction')}>
              <Plus size={16} />
            </button>
          </div>
        </div>

        {filteredList.length > 0 && (
          <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-50 flex items-center justify-between text-xs">
            <span className="text-gray-500">{t('finance.filteredTotal', { count: filteredList.length })}</span>
            <span className={`font-mono-data font-semibold ${listTotal >= 0 ? 'text-green-600' : 'text-amber-600'}`}>
              {listTotal.toLocaleString()} {currency}
            </span>
          </div>
        )}

        {filteredList.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">{t('finance.noneYet')}</div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
            {filteredList.map(tx => {
              const canEdit = tx.type !== 'payment' && tx.createdBy === user?._id
              return (
                <div key={tx._id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full
                        ${tx.type === 'income' || tx.type === 'payment' ? 'bg-green-50 text-green-700' : tx.type === 'expense' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                        {typeLabel(tx.type)}
                      </span>
                      {tx.clientName && <span className="text-xs text-gray-500 truncate">{tx.clientName}</span>}
                      {tx.category && <span className="text-xs text-gray-400 truncate">· {tx.category}</span>}
                    </div>
                    {tx.notes && <div className="text-xs text-gray-400 mt-0.5 truncate">{tx.notes}</div>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div className="text-right">
                      <div className={`font-mono-data text-sm font-medium
                        ${tx.type === 'income' || tx.type === 'payment' ? 'text-green-600' : tx.type === 'expense' ? 'text-amber-600' : 'text-gray-700'}`}>
                        {tx.amount.toLocaleString()} {currency}
                      </div>
                      <div className="text-[11px] text-gray-400">{formatDate(tx.date)}</div>
                    </div>
                    {canEdit && (
                      <div className="relative">
                        <button onClick={() => setOpenMenuId(openMenuId === tx._id ? null : tx._id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors">
                          <MoreVertical size={15} />
                        </button>
                        {openMenuId === tx._id && (
                          <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10">
                            <button
                              onClick={() => { setTxModal({ transaction: tx }); setOpenMenuId(null) }}
                              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Pencil size={13} /> {t('managerClients.edit')}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ManagerFinance
