import React, { useContext, useState } from 'react'
import { Plus } from 'lucide-react'
import { ShantiContext } from '../context/ShantiContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Modal from '../components/Modal.jsx'

const PurchaseSellers = () => {
  const { sellers, createSeller, updateSeller, deleteSeller } = useContext(ShantiContext)
  const { t } = useLanguage()
  const [showNew, setShowNew] = useState(false)
  const [newSeller, setNewSeller] = useState({ name: '', phone: '', comment: '' })
  const [editingSeller, setEditingSeller] = useState(null)

  const submitNewSeller = async (e) => {
    e.preventDefault()
    if (!newSeller.name.trim()) return
    const ok = await createSeller(newSeller)
    if (ok) { setNewSeller({ name: '', phone: '', comment: '' }); setShowNew(false) }
  }
  const submitEditSeller = async (e) => {
    e.preventDefault()
    const ok = await updateSeller(editingSeller._id, { name: editingSeller.name, phone: editingSeller.phone, comment: editingSeller.comment })
    if (ok) setEditingSeller(null)
  }

  return (
    <div>
      <div className='flex justify-end mb-4'>
        <button onClick={() => setShowNew(true)} className='px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium flex items-center gap-1.5'>
          <Plus size={15} strokeWidth={1.5} /> {t('sellerLabel')}
        </button>
      </div>

      <div className='bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-4 py-3 font-medium'>{t('personNameLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('phoneLabel')}</th>
              <th className='px-4 py-3 font-medium'>{t('commentLabel')}</th>
              <th className='px-4 py-3 font-medium'></th>
            </tr>
          </thead>
          <tbody>
            {sellers.map(s => (
              editingSeller?._id === s._id ? (
                <tr key={s._id} className='border-b border-hairline last:border-0'>
                  <td colSpan={4} className='px-4 py-3'>
                    <form onSubmit={submitEditSeller} className='flex flex-wrap gap-2 items-end'>
                      <input value={editingSeller.name} onChange={e => setEditingSeller({ ...editingSeller, name: e.target.value })} className='px-2 py-1.5 rounded-lg bg-bg border border-hairline text-sm flex-1' required />
                      <input value={editingSeller.phone} onChange={e => setEditingSeller({ ...editingSeller, phone: e.target.value })} className='px-2 py-1.5 rounded-lg bg-bg border border-hairline text-sm w-40' placeholder={t('phoneLabel')} />
                      <input value={editingSeller.comment} onChange={e => setEditingSeller({ ...editingSeller, comment: e.target.value })} className='px-2 py-1.5 rounded-lg bg-bg border border-hairline text-sm flex-1' placeholder={t('commentLabel')} />
                      <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('save')}</button>
                      <button type='button' onClick={() => setEditingSeller(null)} className='px-4 py-2 rounded-lg bg-bg border border-hairline text-muted text-sm font-medium'>{t('cancel')}</button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={s._id} className='border-b border-hairline last:border-0'>
                  <td className='px-4 py-3 text-ink'>{s.name}</td>
                  <td className='px-4 py-3 text-muted'>{s.phone || '—'}</td>
                  <td className='px-4 py-3 text-muted'>{s.comment || '—'}</td>
                  <td className='px-4 py-3 text-right whitespace-nowrap'>
                    <button onClick={() => setEditingSeller(s)} className='px-3 py-1.5 rounded-lg bg-accent-soft text-accent text-sm font-medium mr-2'>{t('edit')}</button>
                    <button onClick={() => deleteSeller(s._id)} className='px-3 py-1.5 rounded-lg bg-bg border border-hairline text-muted text-sm font-medium'>{t('delete')}</button>
                  </td>
                </tr>
              )
            ))}
            {sellers.length === 0 && (
              <tr><td colSpan={4} className='px-4 py-8 text-center text-muted'>{t('noSellersYet')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showNew && (
        <Modal title={t('newSellerTitle')} onClose={() => setShowNew(false)}>
          <form onSubmit={submitNewSeller} className='flex flex-col gap-3'>
            <div>
              <p className='text-xs text-muted mb-1'>{t('personNameLabel')}</p>
              <input value={newSeller.name} onChange={e => setNewSeller({ ...newSeller, name: e.target.value })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
            </div>
            <div>
              <p className='text-xs text-muted mb-1'>{t('phoneLabel')}</p>
              <input value={newSeller.phone} onChange={e => setNewSeller({ ...newSeller, phone: e.target.value })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
            </div>
            <div>
              <p className='text-xs text-muted mb-1'>{t('commentLabel')}</p>
              <textarea value={newSeller.comment} onChange={e => setNewSeller({ ...newSeller, comment: e.target.value })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' rows={2} />
            </div>
            <button type='submit' className='py-2.5 rounded-xl bg-accent text-white text-sm font-medium mt-2'>{t('add')}</button>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default PurchaseSellers
