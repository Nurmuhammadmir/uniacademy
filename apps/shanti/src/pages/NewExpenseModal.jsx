import React, { useContext, useState } from 'react'
import { ShantiContext } from '../context/ShantiContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Modal from '../components/Modal.jsx'
import Select from '../components/Select.jsx'
import DatePicker from '../components/DatePicker.jsx'
import NumberInput from '../components/NumberInput.jsx'
import Spinner from '../components/Spinner.jsx'
import MethodPicker, { isMethodSplitValid } from '../components/MethodPicker.jsx'
import { confirm } from '../lib/confirm.js'
import { formatMoney } from '../lib/format.js'
import { todayISO } from '../lib/date.js'

const breakdownFromExpense = (expense) => (expense?.methodBreakdown || []).map(r => ({ method: r.method, amount: String(r.amount) }))

// `expense` present means edit mode (pre-filled, PUT + confirmation) instead of create. Picking a
// seller turns this into "pay down what we owe them" - amount gets validated against their real
// outstanding purchase debt (see shantiSellerDebt.service.js) instead of just needing to be positive.
const NewExpenseModal = ({ expense, onClose, onSaved }) => {
  const { expenseCategories, sellers, createExpense, updateExpense } = useContext(ShantiContext)
  const { t } = useLanguage()
  const isEditing = !!expense
  const [category, setCategory] = useState(expense?.category || '')
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [date, setDate] = useState(expense ? expense.date.slice(0, 10) : todayISO())
  const [method, setMethod] = useState(expense?.method || 'cash')
  const [split, setSplit] = useState(() => (expense?.methodBreakdown || []).length > 0)
  const [breakdown, setBreakdown] = useState(() => breakdownFromExpense(expense))
  const [sellerId, setSellerId] = useState(expense?.sellerId?._id || expense?.sellerId || '')
  const [comment, setComment] = useState(expense?.comment || '')
  const [submitting, setSubmitting] = useState(false)

  const resolvedAmount = Number(amount) || 0

  const submit = async (e) => {
    e.preventDefault()
    if (!(resolvedAmount > 0)) return
    if (!isMethodSplitValid(split, breakdown, resolvedAmount)) return
    if (isEditing && !(await confirm(t('confirmEditExpense')))) return
    setSubmitting(true)
    const payload = {
      category: category || undefined, amount: resolvedAmount, date, sellerId: sellerId || null, comment,
      method: split ? undefined : method,
      methodBreakdown: split ? breakdown.map(r => ({ method: r.method, amount: Number(r.amount) || 0 })) : [],
    }
    const ok = isEditing ? await updateExpense(expense._id, payload) : await createExpense(payload)
    setSubmitting(false)
    if (ok) { onSaved(); onClose() }
  }

  return (
    <Modal title={isEditing ? t('editExpenseTitle') : t('newExpenseTitle')} onClose={onClose}>
      <form onSubmit={submit} className='flex flex-col gap-3'>
        <div>
          <p className='text-xs text-muted mb-1'>{t('categoryLabel')}</p>
          <Select value={category} onChange={setCategory} placeholder={t('otherCategory')}
            options={expenseCategories.map(c => ({ value: c.name, label: c.name }))} />
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <p className='text-xs text-muted mb-1'>{t('amountLabel')}</p>
            <NumberInput value={amount} onChange={setAmount} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('dateCol')}</p>
            <DatePicker value={date} onChange={setDate} />
          </div>
        </div>
        <div>
          <p className='text-xs text-muted mb-1'>{t('paySupplierLabel')}</p>
          <Select forceSearch value={sellerId} onChange={setSellerId} placeholder={t('notSpecified')}
            options={[{ value: '', label: t('notSpecified') }, ...sellers.map(s => ({ value: s._id, label: s.phone ? `${s.name} · ${s.phone}` : s.name }))]} />
        </div>
        <MethodPicker amount={resolvedAmount} method={method} setMethod={setMethod}
          split={split} setSplit={setSplit} breakdown={breakdown} setBreakdown={setBreakdown} />
        <div>
          <p className='text-xs text-muted mb-1'>{t('commentLabel')}</p>
          <textarea value={comment} onChange={e => setComment(e.target.value)} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' rows={2} />
        </div>
        <button type='submit' disabled={submitting || !(resolvedAmount > 0) || !isMethodSplitValid(split, breakdown, resolvedAmount)}
          className='py-2.5 rounded-xl bg-accent text-white text-sm font-medium mt-2 transition-colors disabled:opacity-50 flex items-center justify-center gap-2'>
          {submitting && <Spinner size={14} />} {isEditing ? t('save') : t('add')}
        </button>
      </form>
    </Modal>
  )
}

export default NewExpenseModal
