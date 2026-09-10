import React, { useContext, useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
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

const emptyLine = () => ({ productId: '', quantity: '', price: '' })
const lineFromItem = (item) => ({ productId: item.productId?._id || item.productId, quantity: String(item.quantity), price: String(item.price) })
const breakdownFromSale = (sale) => (sale?.methodBreakdown || []).map(r => ({ method: r.method, amount: String(r.amount) }))

// `sale` present means edit mode (pre-filled, PUT + confirmation) instead of create
const NewSaleModal = ({ sale, onClose, onCreated }) => {
  const { products, clients, createSale, updateSale } = useContext(ShantiContext)
  const { t } = useLanguage()
  const isEditing = !!sale
  const [clientId, setClientId] = useState(sale?.clientId?._id || sale?.clientId || '')
  const [date, setDate] = useState(sale ? sale.date.slice(0, 10) : todayISO())
  const [items, setItems] = useState(sale ? sale.items.map(lineFromItem) : [emptyLine()])
  const [amount, setAmount] = useState(sale ? String(sale.amount) : '')
  // editing starts "touched" - the loaded amount is the sale's own recorded total, which may
  // already differ from a fresh sum of its items (it was overridable at creation too), so it must
  // not get silently recomputed out from under an admin who hasn't changed anything yet
  const [amountTouched, setAmountTouched] = useState(isEditing)
  const [paidAmount, setPaidAmount] = useState(sale ? String(sale.paidAmount) : '')
  const [method, setMethod] = useState(sale?.method || 'cash')
  const [split, setSplit] = useState(() => (sale?.methodBreakdown || []).length > 0)
  const [breakdown, setBreakdown] = useState(() => breakdownFromSale(sale))
  const [comment, setComment] = useState(sale?.comment || '')
  const [submitting, setSubmitting] = useState(false)

  const computedTotal = items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0)
  useEffect(() => { if (!amountTouched) setAmount(computedTotal ? String(computedTotal) : '') }, [computedTotal, amountTouched])

  const setLine = (idx, patch) => {
    setItems(list => list.map((line, i) => {
      if (i !== idx) return line
      const next = { ...line, ...patch }
      if (patch.productId) {
        const product = products.find(p => p._id === patch.productId)
        if (product && !line.price) next.price = String(product.price)
      }
      return next
    }))
  }
  const addLine = () => setItems(list => [...list, emptyLine()])
  const removeLine = (idx) => setItems(list => list.filter((_, i) => i !== idx))

  const finalAmount = amount === '' ? computedTotal : Number(amount)
  const resolvedPaid = paidAmount === '' ? finalAmount : Number(paidAmount)

  const submit = async (e) => {
    e.preventDefault()
    if (!clientId) return
    const validItems = items.filter(i => i.productId && Number(i.quantity) > 0)
    if (validItems.length === 0) return
    if (!isMethodSplitValid(split, breakdown, resolvedPaid)) return
    if (isEditing && !(await confirm(t('confirmEditSale')))) return
    setSubmitting(true)
    const payload = {
      clientId, date, items: validItems.map(i => ({ productId: i.productId, quantity: Number(i.quantity), price: Number(i.price) || 0 })),
      amount: finalAmount, paidAmount: resolvedPaid, comment,
      method: split ? undefined : method,
      methodBreakdown: split ? breakdown.map(r => ({ method: r.method, amount: Number(r.amount) || 0 })) : [],
    }
    const ok = isEditing ? await updateSale(sale._id, payload) : await createSale(payload)
    setSubmitting(false)
    if (ok) { onCreated(); onClose() }
  }

  return (
    <Modal title={isEditing ? t('editSaleTitle') : t('newSaleTitle')} wide onClose={onClose}>
      <form onSubmit={submit} className='flex flex-col gap-3'>
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <p className='text-xs text-muted mb-1'>{t('clientLabel')}</p>
            <Select forceSearch value={clientId} onChange={setClientId} placeholder={t('chooseClientPlaceholder')}
              options={clients.map(c => ({ value: c._id, label: c.name }))} />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('dateCol')}</p>
            <DatePicker value={date} onChange={setDate} />
          </div>
        </div>

        <p className='text-xs text-muted mt-1'>{t('itemsLabel')}</p>
        <div className='flex flex-col gap-2'>
          {items.map((line, idx) => (
            <div key={idx} className='flex gap-2 items-center'>
              <Select forceSearch className='flex-1' value={line.productId} onChange={(v) => setLine(idx, { productId: v })} placeholder={t('productLabel')}
                options={products.map(p => ({ value: p._id, label: `${p.name} · ${p.unit} · ${t('stockLabel')} ${p.stock}` }))} />
              <NumberInput placeholder={t('quantityShort')} value={line.quantity} onChange={v => setLine(idx, { quantity: v })} className='w-24 px-2 py-2 rounded-lg bg-bg border border-hairline text-sm' />
              <NumberInput placeholder={t('priceLabel')} value={line.price} onChange={v => setLine(idx, { price: v })} className='w-28 px-2 py-2 rounded-lg bg-bg border border-hairline text-sm' />
              {items.length > 1 && (
                <button type='button' onClick={() => removeLine(idx)} className='plain w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-rose-500 hover:bg-rose-50 flex-shrink-0'>
                  <X size={15} strokeWidth={1.5} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button type='button' onClick={addLine} className='plain text-accent text-sm font-medium flex items-center gap-1 self-start'>
          <Plus size={14} strokeWidth={2} /> {t('addItemBtn')}
        </button>

        <div className='grid grid-cols-2 gap-3 mt-1'>
          <div>
            <p className='text-xs text-muted mb-1'>{t('saleTotalDefaultLabel', { total: formatMoney(computedTotal) })}</p>
            <NumberInput value={amount} onChange={v => { setAmount(v); setAmountTouched(true) }} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('paidDefaultFullLabel')}</p>
            <NumberInput placeholder={amount || '0'} value={paidAmount} onChange={v => setPaidAmount(v)} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
          </div>
        </div>

        <MethodPicker amount={resolvedPaid} method={method} setMethod={setMethod}
          split={split} setSplit={setSplit} breakdown={breakdown} setBreakdown={setBreakdown} />

        <div>
          <p className='text-xs text-muted mb-1'>{t('commentLabel')}</p>
          <textarea value={comment} onChange={e => setComment(e.target.value)} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' rows={2} />
        </div>

        <button type='submit' disabled={submitting || !isMethodSplitValid(split, breakdown, resolvedPaid)} className='py-2.5 rounded-xl bg-accent text-white text-sm font-medium mt-2 transition-colors disabled:opacity-50 flex items-center justify-center gap-2'>
          {submitting && <Spinner size={14} />} {isEditing ? t('save') : t('newSaleBtn')}
        </button>
      </form>
    </Modal>
  )
}

export default NewSaleModal
