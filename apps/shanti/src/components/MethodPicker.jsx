import React from 'react'
import { Plus, X } from 'lucide-react'
import Select from './Select.jsx'
import NumberInput from './NumberInput.jsx'
import { useLanguage, t } from '../i18n/LanguageContext.jsx'
import { formatMoney } from '../lib/format.js'

export const SPLIT_METHODS = ['cash', 'card', 'bank_transfer']

// The payment-method picker used by every payment form (sale/purchase/finance payment/expense/
// balance top-up): a flat 3-button choice, plus a 4th "xar xil to'lov" (mixed) option that reveals
// a breakdown editor whose rows must sum exactly to `amount` - because in real life a customer or
// supplier sometimes pays part by transfer and the rest cash/card, not always one single method.
const MethodPicker = ({ amount, method, setMethod, split, setSplit, breakdown, setBreakdown }) => {
  const { t } = useLanguage()
  const METHOD_LABEL = { cash: t('methodCash'), card: t('methodCard'), bank_transfer: t('methodBankTransfer') }

  const enableSplit = () => {
    setSplit(true)
    if (breakdown.length === 0) setBreakdown([{ method: 'cash', amount: amount ? String(amount) : '' }])
  }
  const chooseSingle = (value) => { setSplit(false); setMethod(value) }
  const updateRow = (i, patch) => setBreakdown(breakdown.map((row, idx) => idx === i ? { ...row, ...patch } : row))
  const addRow = () => setBreakdown([...breakdown, { method: 'cash', amount: '' }])
  const removeRow = (i) => setBreakdown(breakdown.filter((_, idx) => idx !== i))

  const splitTotal = breakdown.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  const targetAmount = Number(amount) || 0
  const splitMatches = Math.abs(splitTotal - targetAmount) < 0.01

  return (
    <div>
      <p className='text-xs text-muted mb-2'>{t('paymentMethodLabel')}</p>
      <div className='grid grid-cols-4 gap-2'>
        {SPLIT_METHODS.map(value => (
          <button type='button' key={value} onClick={() => chooseSingle(value)}
            className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${!split && method === value ? 'bg-accent-soft border-accent text-accent' : 'bg-[#f5f5f7] border-transparent text-slate-600 hover:bg-slate-200/70'}`}>
            {METHOD_LABEL[value]}
          </button>
        ))}
        <button type='button' onClick={enableSplit}
          className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${split ? 'bg-accent-soft border-accent text-accent' : 'bg-[#f5f5f7] border-transparent text-slate-600 hover:bg-slate-200/70'}`}>
          {t('mixedMethodBtn')}
        </button>
      </div>

      {split && (
        <div className='mt-3 flex flex-col gap-2'>
          {breakdown.map((row, i) => (
            <div key={i} className='flex gap-2 items-center'>
              <Select className='flex-1' value={row.method} onChange={v => updateRow(i, { method: v })}
                options={SPLIT_METHODS.map(v => ({ value: v, label: METHOD_LABEL[v] }))} />
              <NumberInput className='w-32 px-2 py-2 rounded-lg bg-bg border border-hairline text-sm' placeholder={t('amountLabel')}
                value={row.amount} onChange={v => updateRow(i, { amount: v })} />
              {breakdown.length > 1 && (
                <button type='button' onClick={() => removeRow(i)} className='plain w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-rose-500 hover:bg-rose-50 flex-shrink-0'>
                  <X size={15} strokeWidth={1.5} />
                </button>
              )}
            </div>
          ))}
          <button type='button' onClick={addRow} className='plain text-accent text-sm font-medium flex items-center gap-1 self-start'>
            <Plus size={14} strokeWidth={2} /> {t('addMethodRowBtn')}
          </button>
          <p className={`text-xs font-medium ${splitMatches ? 'text-emerald-600' : 'text-rose-600'}`}>
            {t('splitTotalLabel')}: {formatMoney(splitTotal)} / {formatMoney(targetAmount)}
          </p>
        </div>
      )}
    </div>
  )
}

// Shared validity check so a parent form can disable its submit button when split totals are off.
export const isMethodSplitValid = (split, breakdown, amount) => {
  if (!split) return true
  const total = breakdown.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  return Math.abs(total - (Number(amount) || 0)) < 0.01
}

// How a list row should display a document's method: a plain label normally, or the "mixed"
// badge (with a hover tooltip listing the actual breakdown) once it was split across methods.
export const methodDisplay = (doc, METHOD_LABEL) => {
  if (!doc.methodBreakdown?.length) return { label: METHOD_LABEL[doc.method] || doc.method, title: undefined }
  return {
    label: t('mixedMethodBtn'),
    title: doc.methodBreakdown.map(r => `${METHOD_LABEL[r.method] || r.method}: ${formatMoney(r.amount)}`).join(', '),
  }
}

export default MethodPicker
