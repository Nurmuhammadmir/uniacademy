import React, { useContext, useState } from 'react'
import { ShantiContext } from '../context/ShantiContext.jsx'
import Modal from '../components/Modal.jsx'
import Select from '../components/Select.jsx'
import DatePicker from '../components/DatePicker.jsx'
import Spinner from '../components/Spinner.jsx'
import NumberInput from '../components/NumberInput.jsx'
import { todayISO } from '../lib/date.js'

const METHODS = [['cash', 'Наличные'], ['card', 'Карта'], ['bank_transfer', 'Перечисление']]

const emptyForm = () => ({ materialId: '', quantity: '', date: todayISO(), amount: '', paidAmount: '', method: 'cash', comment: '' })

const NewPurchaseModal = ({ onClose, onCreated }) => {
  const { materials, createPurchase } = useContext(ShantiContext)
  const [form, setForm] = useState(emptyForm())
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!form.materialId || !(Number(form.quantity) > 0) || !(Number(form.amount) > 0)) return
    setSubmitting(true)
    const ok = await createPurchase({
      materialId: form.materialId, quantity: Number(form.quantity), date: form.date, amount: Number(form.amount),
      paidAmount: form.paidAmount === '' ? Number(form.amount) : Number(form.paidAmount),
      method: form.method, comment: form.comment,
    })
    setSubmitting(false)
    if (ok) { onCreated(); onClose() }
  }

  const material = materials.find(m => m._id === form.materialId)

  return (
    <Modal title='Новая покупка' onClose={onClose}>
      <form onSubmit={submit} className='flex flex-col gap-3'>
        <div>
          <p className='text-xs text-muted mb-1'>Материал</p>
          <Select forceSearch value={form.materialId} onChange={(v) => setForm({ ...form, materialId: v })} placeholder='Выберите материал'
            options={materials.map(m => ({ value: m._id, label: `${m.name} · ${m.category} · ${m.unit}` }))} />
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <p className='text-xs text-muted mb-1'>Количество {material ? `(${material.unit})` : ''}</p>
            <NumberInput value={form.quantity} onChange={v => setForm({ ...form, quantity: v })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>Дата</p>
            <DatePicker value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
          </div>
        </div>
        <div>
          <p className='text-xs text-muted mb-1'>Цена (сколько заплатили за покупку)</p>
          <NumberInput value={form.amount} onChange={v => setForm({ ...form, amount: v })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
        </div>
        <div>
          <p className='text-xs text-muted mb-1'>Оплачено (по умолчанию — вся сумма)</p>
          <NumberInput placeholder={form.amount || '0'} value={form.paidAmount} onChange={v => setForm({ ...form, paidAmount: v })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
        </div>
        <div>
          <p className='text-xs text-muted mb-2'>Способ оплаты</p>
          <div className='grid grid-cols-3 gap-2'>
            {METHODS.map(([value, label]) => (
              <button type='button' key={value} onClick={() => setForm({ ...form, method: value })}
                className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${form.method === value ? 'bg-accent-soft border-accent text-accent' : 'bg-[#f5f5f7] border-transparent text-slate-600 hover:bg-slate-200/70'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className='text-xs text-muted mb-1'>Комментарий</p>
          <textarea value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' rows={2} />
        </div>
        <button type='submit' disabled={submitting} className='py-2.5 rounded-xl bg-accent text-white text-sm font-medium mt-2 transition-colors disabled:opacity-50 flex items-center justify-center gap-2'>
          {submitting && <Spinner size={14} />} Добавить
        </button>
      </form>
    </Modal>
  )
}

export default NewPurchaseModal
