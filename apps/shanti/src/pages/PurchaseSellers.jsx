import React, { useContext, useState } from 'react'
import { Plus, User } from 'lucide-react'
import { ShantiContext } from '../context/ShantiContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Modal from '../components/Modal.jsx'

// a click anywhere on the card opens its editor in a popup - same small-catalog reasoning as the
// Sales/Materials cards (SalesProducts.jsx, PurchaseMaterials.jsx): sellers are few, and edit/delete
// don't need to sit exposed on every row at all times.
const SellerCard = ({ seller, onOpen }) => (
  <button type='button' onClick={onOpen}
    className='plain bg-bg-elevated border border-hairline rounded-2xl shadow-sm hover:shadow-md transition-shadow w-full flex items-center gap-3 p-3 text-left'>
    <span className='w-10 h-10 rounded-xl bg-bg flex items-center justify-center flex-shrink-0 border border-hairline text-muted'>
      <User size={18} strokeWidth={1.5} />
    </span>
    <span className='flex-1 min-w-0'>
      <p className='text-ink font-medium text-sm truncate'>{seller.name}</p>
      <p className='text-muted text-xs mt-0.5 truncate'>{seller.phone || seller.comment || '—'}</p>
    </span>
  </button>
)

// mounted only while its popup is open, so its form state always starts fresh from the current
// `seller` prop - same reasoning as ProductEditPanel/MaterialEditPanel.
const SellerEditPanel = ({ seller, updateSeller, deleteSeller, onClose }) => {
  const { t } = useLanguage()
  const [form, setForm] = useState({ name: seller.name, phone: seller.phone || '', comment: seller.comment || '' })
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const ok = await updateSeller(seller._id, form)
    setSaving(false)
    if (ok) onClose()
  }
  const handleDelete = async () => {
    if (await deleteSeller(seller._id)) onClose()
  }

  return (
    <form onSubmit={handleSave} className='flex flex-col gap-3'>
      <div>
        <p className='text-xs text-muted mb-1'>{t('personNameLabel')}</p>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
      </div>
      <div>
        <p className='text-xs text-muted mb-1'>{t('phoneLabel')}</p>
        <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
      </div>
      <div>
        <p className='text-xs text-muted mb-1'>{t('commentLabel')}</p>
        <textarea value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' rows={2} />
      </div>
      <div className='flex gap-2 mt-1'>
        <button type='submit' disabled={saving} className='flex-1 py-2 rounded-xl bg-accent text-white text-sm font-medium disabled:opacity-50'>{t('save')}</button>
        <button type='button' onClick={onClose} className='px-4 py-2 rounded-xl bg-bg border border-hairline text-muted text-sm font-medium'>{t('cancel')}</button>
        <button type='button' onClick={handleDelete} className='px-4 py-2 rounded-xl bg-bg border border-hairline text-rose-600 text-sm font-medium'>{t('delete')}</button>
      </div>
    </form>
  )
}

const PurchaseSellers = () => {
  const { sellers, createSeller, updateSeller, deleteSeller } = useContext(ShantiContext)
  const { t } = useLanguage()
  const [showNew, setShowNew] = useState(false)
  const [newSeller, setNewSeller] = useState({ name: '', phone: '', comment: '' })
  const [openId, setOpenId] = useState(null)
  const openSeller = sellers.find(s => s._id === openId)

  const submitNewSeller = async (e) => {
    e.preventDefault()
    if (!newSeller.name.trim()) return
    const ok = await createSeller(newSeller)
    if (ok) { setNewSeller({ name: '', phone: '', comment: '' }); setShowNew(false) }
  }

  return (
    <div>
      <div className='flex justify-end mb-4'>
        <button onClick={() => setShowNew(true)} className='px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium flex items-center gap-1.5'>
          <Plus size={15} strokeWidth={1.5} /> {t('sellerLabel')}
        </button>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
        {sellers.map(s => (
          <SellerCard key={s._id} seller={s} onOpen={() => setOpenId(s._id)} />
        ))}
        {sellers.length === 0 && <p className='text-muted text-sm col-span-full text-center py-8'>{t('noSellersYet')}</p>}
      </div>

      {openSeller && (
        <Modal title={openSeller.name} onClose={() => setOpenId(null)}>
          <SellerEditPanel seller={openSeller} updateSeller={updateSeller} deleteSeller={deleteSeller} onClose={() => setOpenId(null)} />
        </Modal>
      )}

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
