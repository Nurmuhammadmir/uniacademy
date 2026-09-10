import React, { useContext, useEffect, useState } from 'react'
import { ShantiContext } from '../context/ShantiContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Select from '../components/Select.jsx'
import DatePicker from '../components/DatePicker.jsx'
import NumberInput from '../components/NumberInput.jsx'
import MethodPicker, { isMethodSplitValid, methodDisplay } from '../components/MethodPicker.jsx'
import Spinner from '../components/Spinner.jsx'
import { confirm } from '../lib/confirm.js'
import { formatMoney } from '../lib/format.js'
import { todayISO, formatDateTime } from '../lib/date.js'

const TopUpBalanceSection = () => {
  const { createBalanceAdjustment, getBalanceAdjustments, deleteBalanceAdjustment } = useContext(ShantiContext)
  const { t } = useLanguage()
  const METHOD_LABEL = { cash: t('methodCash'), card: t('methodCard'), bank_transfer: t('methodBankTransfer') }
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [split, setSplit] = useState(false)
  const [breakdown, setBreakdown] = useState([])
  const [date, setDate] = useState(todayISO())
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [adjustments, setAdjustments] = useState(null)

  const load = () => getBalanceAdjustments().then(d => { if (d) setAdjustments(d.adjustments) })
  useEffect(() => { load() }, [])

  const resolvedAmount = Number(amount) || 0

  const submit = async (e) => {
    e.preventDefault()
    if (!(resolvedAmount > 0)) return
    if (!isMethodSplitValid(split, breakdown, resolvedAmount)) return
    setSubmitting(true)
    const ok = await createBalanceAdjustment({
      amount: resolvedAmount, date, comment,
      method: split ? undefined : method,
      methodBreakdown: split ? breakdown.map(r => ({ method: r.method, amount: Number(r.amount) || 0 })) : [],
    })
    setSubmitting(false)
    if (ok) { setAmount(''); setComment(''); setSplit(false); setBreakdown([]); load() }
  }

  const handleDelete = async (id) => {
    if (!(await confirm(t('confirmDeleteBalanceAdjustment')))) return
    if (await deleteBalanceAdjustment(id)) load()
  }

  return (
    <div className='bg-white border border-slate-100 rounded-2xl p-5 shadow-sm'>
      <p className='text-ink font-semibold mb-4'>{t('topUpBalanceTitle')}</p>
      <form onSubmit={submit} className='flex flex-col gap-3'>
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
        <MethodPicker amount={resolvedAmount} method={method} setMethod={setMethod}
          split={split} setSplit={setSplit} breakdown={breakdown} setBreakdown={setBreakdown} />
        <div>
          <p className='text-xs text-muted mb-1'>{t('commentLabel')}</p>
          <input value={comment} onChange={e => setComment(e.target.value)} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
        </div>
        <button type='submit' disabled={submitting || !(resolvedAmount > 0) || !isMethodSplitValid(split, breakdown, resolvedAmount)}
          className='py-2.5 rounded-xl bg-accent text-white text-sm font-medium mt-1 transition-colors disabled:opacity-50 flex items-center justify-center gap-2'>
          {submitting && <Spinner size={14} />} {t('restockBtn')}
        </button>
      </form>

      <p className='text-xs text-muted font-medium mt-6 mb-2'>{t('balanceAdjustmentsListTitle')}</p>
      <div className='flex flex-col gap-1.5 max-h-64 overflow-y-auto'>
        {adjustments === null && <p className='text-muted text-xs py-3 text-center'>{t('loading')}</p>}
        {adjustments && adjustments.length === 0 && <p className='text-muted text-xs py-3 text-center'>{t('noBalanceAdjustmentsYet')}</p>}
        {(adjustments || []).map(a => {
          const methodInfo = methodDisplay(a, METHOD_LABEL)
          return (
            <div key={a._id} className='flex items-center justify-between gap-2 py-2 border-b border-hairline last:border-0 text-sm'>
              <div className='min-w-0'>
                <p className='text-ink font-mono font-semibold'>{formatMoney(a.amount)} <span className='text-muted font-sans font-normal' title={methodInfo.title}>· {methodInfo.label}</span></p>
                <p className='text-[11px] text-slate-400 truncate'>{formatDateTime(a.date)}{a.comment ? ` · ${a.comment}` : ''}</p>
              </div>
              <button onClick={() => handleDelete(a._id)} className='plain text-muted hover:text-rose-500 text-xs flex-shrink-0'>{t('delete')}</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const RestockMaterialSection = () => {
  const { materials, restockMaterial } = useContext(ShantiContext)
  const { t } = useLanguage()
  const [materialId, setMaterialId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedMaterial = materials.find(m => m._id === materialId)

  const submit = async (e) => {
    e.preventDefault()
    if (!materialId || !(Number(quantity) > 0)) return
    setSubmitting(true)
    const ok = await restockMaterial(materialId, { quantity: Number(quantity), comment })
    setSubmitting(false)
    if (ok) { setQuantity(''); setComment('') }
  }

  return (
    <div className='bg-white border border-slate-100 rounded-2xl p-5 shadow-sm'>
      <p className='text-ink font-semibold mb-4'>{t('restockMaterialTitle')}</p>
      <form onSubmit={submit} className='flex flex-col gap-3'>
        <div>
          <p className='text-xs text-muted mb-1'>{t('materialLabel')}</p>
          <Select forceSearch value={materialId} onChange={setMaterialId} placeholder={t('chooseMaterialToRestockPlaceholder')}
            options={materials.map(m => ({ value: m._id, label: `${m.name} · ${t('stockLabel')} ${m.stock} ${m.unit}` }))} />
        </div>
        {selectedMaterial && (
          <p className='text-xs text-muted'>{t('stockLabel')}: <span className='font-mono font-semibold text-ink'>{selectedMaterial.stock} {selectedMaterial.unit}</span></p>
        )}
        <div>
          <p className='text-xs text-muted mb-1'>{t('quantityToAddLabel')}</p>
          <NumberInput value={quantity} onChange={setQuantity} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
        </div>
        <div>
          <p className='text-xs text-muted mb-1'>{t('commentLabel')}</p>
          <input value={comment} onChange={e => setComment(e.target.value)} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
        </div>
        <button type='submit' disabled={submitting || !materialId || !(Number(quantity) > 0)}
          className='py-2.5 rounded-xl bg-accent text-white text-sm font-medium mt-1 transition-colors disabled:opacity-50 flex items-center justify-center gap-2'>
          {submitting && <Spinner size={14} />} {t('restockBtn')}
        </button>
      </form>
    </div>
  )
}

const Settings = () => {
  const { t } = useLanguage()
  return (
    <div>
      <h1 className='text-2xl font-bold tracking-tight text-[#1D1D1F] mb-1'>{t('settingsTitle')}</h1>
      <p className='text-sm text-muted mb-5'>{t('settingsHint')}</p>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-5 items-start'>
        <TopUpBalanceSection />
        <RestockMaterialSection />
      </div>
    </div>
  )
}

export default Settings
