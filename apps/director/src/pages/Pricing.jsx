import React, { useContext, useEffect, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import Modal from '../components/Modal.jsx'
import { formatMoney } from '../lib/format.js'

const Pricing = () => {
  const { pricing, upsertPricing, deletePricing, languages, levels, getLevels } = useContext(DirectorContext)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ languageId: '', levelId: '', monthlyPrice: '' })

  useEffect(() => { if (form.languageId) getLevels(form.languageId) }, [form.languageId])

  const submit = async (e) => {
    e.preventDefault()
    const ok = await upsertPricing({ ...form, monthlyPrice: Number(form.monthlyPrice) })
    if (ok) { setShowCreate(false); setForm({ languageId: '', levelId: '', monthlyPrice: '' }) }
  }

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <p className='font-display text-2xl text-ink'>Pricing</p>
        <button onClick={() => setShowCreate(true)} className='px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium'>+ Set price</button>
      </div>

      <div className='bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-5 py-3 font-medium'>Language</th>
              <th className='px-5 py-3 font-medium'>Level</th>
              <th className='px-5 py-3 font-medium'>Monthly price</th>
              <th className='px-5 py-3'></th>
            </tr>
          </thead>
          <tbody>
            {pricing.map(p => (
              <tr key={p._id} className='border-b border-hairline last:border-0'>
                <td className='px-5 py-3 text-ink'>{p.languageId?.name}</td>
                <td className='px-5 py-3 text-muted'>{p.levelId?.name}</td>
                <td className='px-5 py-3 font-mono text-ink'>{formatMoney(p.monthlyPrice)}</td>
                <td className='px-5 py-3 text-right'>
                  <button onClick={() => deletePricing(p._id)} className='text-muted text-xs font-medium'>Remove</button>
                </td>
              </tr>
            ))}
            {pricing.length === 0 && (
              <tr><td colSpan={4} className='px-5 py-8 text-center text-muted'>No pricing configured yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <Modal title='Set price' onClose={() => setShowCreate(false)}>
          <form onSubmit={submit} className='flex flex-col gap-3'>
            <select value={form.languageId} onChange={e => setForm({ ...form, languageId: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              <option value=''>Language</option>
              {languages.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
            <select value={form.levelId} onChange={e => setForm({ ...form, levelId: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              <option value=''>Level</option>
              {levels.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
            <input placeholder='Monthly price' type='number' value={form.monthlyPrice} onChange={e => setForm({ ...form, monthlyPrice: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>Save price</button>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default Pricing
