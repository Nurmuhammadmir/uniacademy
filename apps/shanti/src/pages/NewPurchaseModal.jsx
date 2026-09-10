import React, { useContext, useState } from 'react'
import { ShantiContext } from '../context/ShantiContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Modal from '../components/Modal.jsx'
import Select from '../components/Select.jsx'
import DatePicker from '../components/DatePicker.jsx'
import Spinner from '../components/Spinner.jsx'
import NumberInput from '../components/NumberInput.jsx'
import MethodPicker, { isMethodSplitValid } from '../components/MethodPicker.jsx'
import { confirm } from '../lib/confirm.js'
import { todayISO } from '../lib/date.js'

const emptyForm = () => ({ materialId: '', quantity: '', date: todayISO(), amount: '', paidAmount: '', method: 'cash', sellerId: '', comment: '' })

// purchase from a table row, formatted back into the same shape the form fields expect
const formFromPurchase = (purchase) => ({
  materialId: purchase.materialId?._id || purchase.materialId || '',
  quantity: String(purchase.quantity), date: purchase.date.slice(0, 10), amount: String(purchase.amount),
  paidAmount: String(purchase.paidAmount), method: purchase.method,
  sellerId: purchase.sellerId?._id || purchase.sellerId || '', comment: purchase.comment || '',
})

const breakdownFromPurchase = (purchase) => (purchase?.methodBreakdown || []).map(r => ({ method: r.method, amount: String(r.amount) }))

// `purchase` present means edit mode (pre-filled, PUT + confirmation) instead of create
const NewPurchaseModal = ({ purchase, onClose, onCreated }) => {
  const { materials, sellers, createPurchase, updatePurchase } = useContext(ShantiContext)
  const { t } = useLanguage()
  const [form, setForm] = useState(() => purchase ? formFromPurchase(purchase) : emptyForm())
  const [split, setSplit] = useState(() => (purchase?.methodBreakdown || []).length > 0)
  const [breakdown, setBreakdown] = useState(() => breakdownFromPurchase(purchase))
  const [submitting, setSubmitting] = useState(false)
  const isEditing = !!purchase

  const resolvedPaid = form.paidAmount === '' ? Number(form.amount) || 0 : Number(form.paidAmount)

  const submit = async (e) => {
    e.preventDefault()
    if (!form.materialId || !(Number(form.quantity) > 0) || !(Number(form.amount) > 0)) return
    if (!isMethodSplitValid(split, breakdown, resolvedPaid)) return
    if (isEditing && !(await confirm(t('confirmEditPurchase')))) return
    setSubmitting(true)
    const payload = {
      materialId: form.materialId, quantity: Number(form.quantity), date: form.date, amount: Number(form.amount),
      paidAmount: resolvedPaid, sellerId: form.sellerId || undefined, comment: form.comment,
      method: split ? undefined : form.method,
      methodBreakdown: split ? breakdown.map(r => ({ method: r.method, amount: Number(r.amount) || 0 })) : [],
    }
    const ok = isEditing ? await updatePurchase(purchase._id, payload) : await createPurchase(payload)
    setSubmitting(false)
    if (ok) { onCreated(); onClose() }
  }

  const material = materials.find(m => m._id === form.materialId)

  return (
    <Modal title={isEditing ? t('editPurchaseTitle') : t('newPurchaseTitle')} onClose={onClose}>
      <form onSubmit={submit} className='flex flex-col gap-3'>
        <div>
          <p className='text-xs text-muted mb-1'>{t('materialLabel')}</p>
          <Select forceSearch value={form.materialId} onChange={(v) => setForm({ ...form, materialId: v })} placeholder={t('chooseMaterialPlaceholder')}
            options={materials.map(m => ({ value: m._id, label: `${m.name} · ${m.category} · ${m.unit}` }))} />
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <p className='text-xs text-muted mb-1'>{t('quantityLabel')} {material ? `(${material.unit})` : ''}</p>
            <NumberInput value={form.quantity} onChange={v => setForm({ ...form, quantity: v })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('dateCol')}</p>
            <DatePicker value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
          </div>
        </div>
        <div>
          <p className='text-xs text-muted mb-1'>{t('purchasePriceLabel')}</p>
          <NumberInput value={form.amount} onChange={v => setForm({ ...form, amount: v })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
        </div>
        <div>
          <p className='text-xs text-muted mb-1'>{t('paidDefaultFullLabel')}</p>
          <NumberInput placeholder={form.amount || '0'} value={form.paidAmount} onChange={v => setForm({ ...form, paidAmount: v })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
        </div>
        <div>
          <p className='text-xs text-muted mb-1'>{t('sellerLabel')}</p>
          <Select forceSearch value={form.sellerId} onChange={(v) => setForm({ ...form, sellerId: v })} placeholder={t('notSpecified')}
            options={[{ value: '', label: t('notSpecified') }, ...sellers.map(s => ({ value: s._id, label: s.phone ? `${s.name} · ${s.phone}` : s.name }))]} />
        </div>
        <MethodPicker amount={resolvedPaid} method={form.method} setMethod={(v) => setForm({ ...form, method: v })}
          split={split} setSplit={setSplit} breakdown={breakdown} setBreakdown={setBreakdown} />
        <div>
          <p className='text-xs text-muted mb-1'>{t('commentLabel')}</p>
          <textarea value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' rows={2} />
        </div>
        <button type='submit' disabled={submitting || !isMethodSplitValid(split, breakdown, resolvedPaid)}
          className='py-2.5 rounded-xl bg-accent text-white text-sm font-medium mt-2 transition-colors disabled:opacity-50 flex items-center justify-center gap-2'>
          {submitting && <Spinner size={14} />} {isEditing ? t('save') : t('add')}
        </button>
      </form>
    </Modal>
  )
}

export default NewPurchaseModal
