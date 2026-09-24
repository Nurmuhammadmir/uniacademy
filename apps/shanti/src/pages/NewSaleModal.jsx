import React, { useContext, useEffect, useState } from 'react'
import { Plus, X, Gift } from 'lucide-react'
import { toast } from 'sonner'
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
  // free goods given with this sale: the user only picks product + quantity. The per-unit cost
  // booked as an expense is never typed - it's worked out (see bonusUnitPrice) and just displayed
  const [bonusItems, setBonusItems] = useState((sale?.bonusItems || []).map(i => ({ productId: i.productId?._id || i.productId, quantity: String(i.quantity) })))
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

  const setBonusLine = (idx, patch) => setBonusItems(list => list.map((line, i) => (i === idx ? { ...line, ...patch } : line)))
  const addBonusLine = () => setBonusItems(list => [...list, { productId: '', quantity: '' }])
  const removeBonusLine = (idx) => setBonusItems(list => list.filter((_, i) => i !== idx))

  // mirrors the server's resolveBonusItems exactly (the server is what actually stores it): the
  // price already saved for that product on this sale, else the product's catalog price, else -
  // when that's 0 - the price this same product is being sold at in this sale
  const bonusUnitPrice = (productId) => {
    const saved = (sale?.bonusItems || []).find(i => (i.productId?._id || i.productId) === productId && i.price > 0)?.price
    if (saved) return saved
    const product = products.find(p => p._id === productId)
    if (product?.price > 0) return product.price
    return Number(items.find(i => i.productId === productId && Number(i.price) > 0)?.price) || 0
  }
  const validBonusItems = bonusItems.filter(i => i.productId && Number(i.quantity) > 0)
  const bonusCost = validBonusItems.reduce((sum, i) => sum + Number(i.quantity) * bonusUnitPrice(i.productId), 0)

  const finalAmount = amount === '' ? computedTotal : Number(amount)
  const resolvedPaid = paidAmount === '' ? finalAmount : Number(paidAmount)

  const submit = async (e) => {
    e.preventDefault()
    if (!clientId) return
    const validItems = items.filter(i => i.productId && Number(i.quantity) > 0)
    if (validItems.length === 0) return
    if (!isMethodSplitValid(split, breakdown, resolvedPaid)) return
    if (validBonusItems.some(i => !(bonusUnitPrice(i.productId) > 0))) { toast.error(t('bonusPriceRequiredError')); return }
    if (isEditing && !(await confirm(t('confirmEditSale')))) return
    setSubmitting(true)
    const payload = {
      clientId, date, items: validItems.map(i => ({ productId: i.productId, quantity: Number(i.quantity), price: Number(i.price) || 0 })),
      // always sent (even empty) so that on edit, clearing the bonus block actually removes it
      bonusItems: validBonusItems.map(i => ({ productId: i.productId, quantity: Number(i.quantity) })),
      amount: finalAmount, paidAmount: resolvedPaid, comment,
      method: split ? undefined : method,
      // zero/blank rows dropped rather than sent as amount:0 - the server rejects any breakdown row
      // that isn't strictly positive, which used to surface as a confusing error whenever paidAmount
      // was 0 (enableSplit's default row starts blank) or an added-but-unfilled row was left behind
      methodBreakdown: split ? breakdown.filter(r => Number(r.amount) > 0).map(r => ({ method: r.method, amount: Number(r.amount) })) : [],
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
            <div key={idx} className='flex flex-col sm:flex-row gap-2 sm:items-center bg-bg/60 sm:bg-transparent rounded-xl p-2 sm:p-0'>
              <Select forceSearch className='flex-1 min-w-0' value={line.productId} onChange={(v) => setLine(idx, { productId: v })} placeholder={t('productLabel')}
                options={products.map(p => ({ value: p._id, label: `${p.name} · ${p.unit} · ${t('stockLabel')} ${p.stock}` }))} />
              <div className='flex gap-2 items-center'>
                <NumberInput placeholder={t('quantityShort')} value={line.quantity} onChange={v => setLine(idx, { quantity: v })} className='flex-1 sm:flex-none sm:w-24 min-w-0 px-2 py-2 rounded-lg bg-bg border border-hairline text-sm' />
                <NumberInput placeholder={t('priceLabel')} value={line.price} onChange={v => setLine(idx, { price: v })} className='flex-1 sm:flex-none sm:w-28 min-w-0 px-2 py-2 rounded-lg bg-bg border border-hairline text-sm' />
                {items.length > 1 && (
                  <button type='button' onClick={() => removeLine(idx)} className='plain w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-rose-500 hover:bg-rose-50 flex-shrink-0'>
                    <X size={15} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button type='button' onClick={addLine} className='plain text-accent text-sm font-medium flex items-center gap-1 self-start'>
          <Plus size={14} strokeWidth={2} /> {t('addItemBtn')}
        </button>

        {bonusItems.length === 0 ? (
          <button type='button' onClick={addBonusLine} className='plain text-amber-600 text-sm font-medium flex items-center gap-1 self-start'>
            <Gift size={14} strokeWidth={2} /> {t('addBonusBtn')}
          </button>
        ) : (
          <div className='flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3'>
            <p className='text-xs font-semibold text-amber-700 flex items-center gap-1.5'><Gift size={14} strokeWidth={2} /> {t('bonusLabel')}</p>
            <p className='text-[11px] text-amber-700/80 -mt-1'>{t('bonusHint')}</p>
            {bonusItems.map((line, idx) => (
              <div key={idx} className='flex flex-col sm:flex-row gap-2 sm:items-center'>
                <Select forceSearch className='flex-1 min-w-0' value={line.productId} onChange={(v) => setBonusLine(idx, { productId: v })} placeholder={t('productLabel')}
                  options={products.map(p => ({ value: p._id, label: `${p.name} · ${p.unit} · ${t('stockLabel')} ${p.stock}` }))} />
                <div className='flex gap-2 items-center'>
                  <NumberInput placeholder={t('quantityShort')} value={line.quantity} onChange={v => setBonusLine(idx, { quantity: v })} className='flex-1 sm:flex-none sm:w-24 min-w-0 px-2 py-2 rounded-lg bg-bg border border-hairline text-sm' />
                  <div title={t('bonusPriceReadonlyHint')} className={`flex-1 sm:flex-none sm:w-28 min-w-0 px-2 py-2 rounded-lg bg-amber-100/60 border border-amber-200 text-sm font-mono text-center select-none truncate ${line.productId && !bonusUnitPrice(line.productId) ? 'text-rose-600' : 'text-amber-800'}`}>
                    {line.productId ? (bonusUnitPrice(line.productId) ? formatMoney(bonusUnitPrice(line.productId)) : '—') : t('priceLabel')}
                  </div>
                  <button type='button' onClick={() => removeBonusLine(idx)} className='plain w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-rose-500 hover:bg-rose-50 flex-shrink-0'>
                    <X size={15} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))}
            <div className='flex items-center justify-between gap-2'>
              <button type='button' onClick={addBonusLine} className='plain text-amber-600 text-sm font-medium flex items-center gap-1'>
                <Plus size={14} strokeWidth={2} /> {t('addItemBtn')}
              </button>
              {bonusCost > 0 && <p className='text-xs font-semibold text-amber-700'>{t('bonusCostTotal', { total: formatMoney(bonusCost) })}</p>}
            </div>
          </div>
        )}

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
