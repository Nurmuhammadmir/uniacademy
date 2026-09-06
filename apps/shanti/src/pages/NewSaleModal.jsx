import React, { useContext, useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { ShantiContext } from '../context/ShantiContext.jsx'
import Modal from '../components/Modal.jsx'
import Select from '../components/Select.jsx'
import DatePicker from '../components/DatePicker.jsx'
import Spinner from '../components/Spinner.jsx'
import NumberInput from '../components/NumberInput.jsx'
import { formatMoney } from '../lib/format.js'
import { todayISO } from '../lib/date.js'

const METHODS = [['cash', 'Наличные'], ['card', 'Карта'], ['bank_transfer', 'Перечисление']]
const emptyLine = () => ({ productId: '', quantity: '', price: '' })

const NewSaleModal = ({ onClose, onCreated }) => {
  const { products, clients, createSale } = useContext(ShantiContext)
  const [clientId, setClientId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [items, setItems] = useState([emptyLine()])
  const [amount, setAmount] = useState('')
  const [amountTouched, setAmountTouched] = useState(false)
  const [paidAmount, setPaidAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [comment, setComment] = useState('')
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

  const submit = async (e) => {
    e.preventDefault()
    if (!clientId) return
    const validItems = items.filter(i => i.productId && Number(i.quantity) > 0)
    if (validItems.length === 0) return
    setSubmitting(true)
    const finalAmount = amount === '' ? computedTotal : Number(amount)
    const ok = await createSale({
      clientId, date, items: validItems.map(i => ({ productId: i.productId, quantity: Number(i.quantity), price: Number(i.price) || 0 })),
      amount: finalAmount, paidAmount: paidAmount === '' ? finalAmount : Number(paidAmount), method, comment,
    })
    setSubmitting(false)
    if (ok) { onCreated(); onClose() }
  }

  return (
    <Modal title='Новая продажа' wide onClose={onClose}>
      <form onSubmit={submit} className='flex flex-col gap-3'>
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <p className='text-xs text-muted mb-1'>Клиент</p>
            <Select forceSearch value={clientId} onChange={setClientId} placeholder='Выберите клиента'
              options={clients.map(c => ({ value: c._id, label: c.name }))} />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>Дата</p>
            <DatePicker value={date} onChange={setDate} />
          </div>
        </div>

        <p className='text-xs text-muted mt-1'>Товары</p>
        <div className='flex flex-col gap-2'>
          {items.map((line, idx) => (
            <div key={idx} className='flex gap-2 items-center'>
              <Select forceSearch className='flex-1' value={line.productId} onChange={(v) => setLine(idx, { productId: v })} placeholder='Товар'
                options={products.map(p => ({ value: p._id, label: `${p.name} · ${p.unit} · остаток ${p.stock}` }))} />
              <NumberInput placeholder='Кол-во' value={line.quantity} onChange={v => setLine(idx, { quantity: v })} className='w-24 px-2 py-2 rounded-lg bg-bg border border-hairline text-sm' />
              <NumberInput placeholder='Цена' value={line.price} onChange={v => setLine(idx, { price: v })} className='w-28 px-2 py-2 rounded-lg bg-bg border border-hairline text-sm' />
              {items.length > 1 && (
                <button type='button' onClick={() => removeLine(idx)} className='plain w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-rose-500 hover:bg-rose-50 flex-shrink-0'>
                  <X size={15} strokeWidth={1.5} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button type='button' onClick={addLine} className='plain text-accent text-sm font-medium flex items-center gap-1 self-start'>
          <Plus size={14} strokeWidth={2} /> Добавить товар
        </button>

        <div className='grid grid-cols-2 gap-3 mt-1'>
          <div>
            <p className='text-xs text-muted mb-1'>Итоговая сумма (по умолчанию — {formatMoney(computedTotal)}, можно изменить)</p>
            <NumberInput value={amount} onChange={v => { setAmount(v); setAmountTouched(true) }} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>Оплачено (по умолчанию — вся сумма)</p>
            <NumberInput placeholder={amount || '0'} value={paidAmount} onChange={v => setPaidAmount(v)} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
          </div>
        </div>

        <div>
          <p className='text-xs text-muted mb-2'>Способ оплаты</p>
          <div className='grid grid-cols-3 gap-2'>
            {METHODS.map(([value, label]) => (
              <button type='button' key={value} onClick={() => setMethod(value)}
                className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${method === value ? 'bg-accent-soft border-accent text-accent' : 'bg-[#f5f5f7] border-transparent text-slate-600 hover:bg-slate-200/70'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className='text-xs text-muted mb-1'>Комментарий</p>
          <textarea value={comment} onChange={e => setComment(e.target.value)} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' rows={2} />
        </div>

        <button type='submit' disabled={submitting} className='py-2.5 rounded-xl bg-accent text-white text-sm font-medium mt-2 transition-colors disabled:opacity-50 flex items-center justify-center gap-2'>
          {submitting && <Spinner size={14} />} Добавить продажу
        </button>
      </form>
    </Modal>
  )
}

export default NewSaleModal
