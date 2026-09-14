import React, { useContext, useEffect, useState } from 'react'
import { ShantiContext } from '../context/ShantiContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Modal from '../components/Modal.jsx'
import Select from '../components/Select.jsx'
import DatePicker from '../components/DatePicker.jsx'
import Spinner from '../components/Spinner.jsx'
import NumberInput from '../components/NumberInput.jsx'
import MethodPicker, { isMethodSplitValid } from '../components/MethodPicker.jsx'
import { confirm } from '../lib/confirm.js'
import { formatMoney } from '../lib/format.js'
import { todayISO } from '../lib/date.js'

const breakdownFromPayment = (payment) => (payment?.methodBreakdown || []).map(r => ({ method: r.method, amount: String(r.amount) }))

// `payment` present means edit mode (pre-filled, PUT + confirmation) instead of create. Any client
// can receive a payment, not just debtors - clients sometimes pay in advance, and the underlying
// debt math (see shantiDebt.service.js) already handles that correctly: a payment against a client
// with no outstanding debt just makes their computed debt negative, i.e. a credit that the next
// sale's unpaid balance will draw down against. Debtors are still listed first since that is the
// common case.
const NewPaymentModal = ({ payment, onClose, onSaved }) => {
  const { clients, createPayment, updatePayment, getSalesDebtors } = useContext(ShantiContext)
  const { t } = useLanguage()
  const isEditing = !!payment
  const [debtors, setDebtors] = useState([])
  const [clientId, setClientId] = useState(payment?.clientId?._id || payment?.clientId || '')
  const [date, setDate] = useState(payment ? payment.date.slice(0, 10) : todayISO())
  const [amount, setAmount] = useState(payment ? String(payment.amount) : '')
  const [method, setMethod] = useState(payment?.method || 'cash')
  const [split, setSplit] = useState(() => (payment?.methodBreakdown || []).length > 0)
  const [breakdown, setBreakdown] = useState(() => breakdownFromPayment(payment))
  const [comment, setComment] = useState(payment?.comment || '')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { getSalesDebtors().then(d => { if (d) setDebtors(d.debtors) }) }, [])

  const debtMap = Object.fromEntries(debtors.map(d => [d.clientId, d.totalDebt]))
  const editingPaymentClientId = payment?.clientId?._id || payment?.clientId || null
  // editing an existing payment: what it already reduced still counts as "available" debt for it
  const debtForSelected = clientId ? (debtMap[clientId] || 0) + (isEditing && editingPaymentClientId === clientId ? payment.amount : 0) : 0
  const clientOptions = [...clients].sort((a, b) => (debtMap[b._id] || 0) - (debtMap[a._id] || 0))
    .map(c => ({ value: c._id, label: debtMap[c._id] > 0 ? `${c.name} · ${formatMoney(debtMap[c._id])}` : c.name }))

  const resolvedAmount = Number(amount) || 0

  const submit = async (e) => {
    e.preventDefault()
    if (!clientId || !(resolvedAmount > 0)) return
    if (!isMethodSplitValid(split, breakdown, resolvedAmount)) return
    if (isEditing && !(await confirm(t('confirmEditPayment')))) return
    setSubmitting(true)
    const payload = {
      clientId, date, amount: resolvedAmount, comment,
      method: split ? undefined : method,
      methodBreakdown: split ? breakdown.map(r => ({ method: r.method, amount: Number(r.amount) || 0 })) : [],
    }
    const ok = isEditing ? await updatePayment(payment._id, payload) : await createPayment(payload)
    setSubmitting(false)
    if (ok) { onSaved(); onClose() }
  }

  return (
    <Modal title={isEditing ? t('confirmEditPayment') : t('newPaymentTitle')} onClose={onClose}>
      <form onSubmit={submit} className='flex flex-col gap-3'>
        <div>
          <p className='text-xs text-muted mb-1'>{t('chooseClientPlaceholder')}</p>
          <Select forceSearch value={clientId} onChange={setClientId} placeholder={t('chooseClientPlaceholder')}
            options={clientOptions} />
        </div>

        {clientId && (
          debtForSelected > 0 ? (
            <div className='bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center justify-between'>
              <span className='text-amber-700 text-xs font-medium'>{t('currentDebtLabel')}</span>
              <span className='text-amber-700 font-bold font-mono'>{formatMoney(debtForSelected)}</span>
            </div>
          ) : (
            <p className='text-xs text-muted px-1'>{t('advancePaymentHint')}</p>
          )
        )}

        <div className='grid grid-cols-2 gap-3'>
          <div>
            <p className='text-xs text-muted mb-1'>{t('paymentAmountLabel')}</p>
            <NumberInput value={amount} onChange={setAmount} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('dateCol')}</p>
            <DatePicker value={date} onChange={setDate} />
          </div>
        </div>

        <MethodPicker amount={resolvedAmount} method={method} setMethod={setMethod}
          split={split} setSplit={setSplit} breakdown={breakdown} setBreakdown={setBreakdown} />

        <div>
          <p className='text-xs text-muted mb-1'>{t('commentLabel')}</p>
          <textarea value={comment} onChange={e => setComment(e.target.value)} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' rows={2} />
        </div>

        <button type='submit' disabled={submitting || !clientId || !isMethodSplitValid(split, breakdown, resolvedAmount)} className='py-2.5 rounded-xl bg-accent text-white text-sm font-medium mt-2 transition-colors disabled:opacity-50 flex items-center justify-center gap-2'>
          {submitting && <Spinner size={14} />} {isEditing ? t('save') : t('newPaymentBtn')}
        </button>
      </form>
    </Modal>
  )
}

export default NewPaymentModal
