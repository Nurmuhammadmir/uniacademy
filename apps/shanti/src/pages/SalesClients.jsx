import React, { useContext, useState } from 'react'
import { Plus, Settings, Pencil, X, User } from 'lucide-react'
import { ShantiContext } from '../context/ShantiContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Modal from '../components/Modal.jsx'
import Select from '../components/Select.jsx'

// a click anywhere on the card opens its editor in a popup - same small-catalog reasoning as the
// Sales/Materials cards (SalesProducts.jsx, PurchaseMaterials.jsx).
const ClientCard = ({ client, categoryColor, onOpen }) => (
  <button type='button' onClick={onOpen}
    className='plain bg-bg-elevated border border-hairline rounded-2xl shadow-sm hover:shadow-md transition-shadow w-full flex items-center gap-3 p-3 text-left'>
    <span className='w-10 h-10 rounded-xl bg-bg flex items-center justify-center flex-shrink-0 border border-hairline text-muted relative'>
      <User size={18} strokeWidth={1.5} />
      <span className='absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-bg-elevated' style={{ backgroundColor: categoryColor }} />
    </span>
    <span className='flex-1 min-w-0'>
      <p className='text-ink font-medium text-sm truncate'>{client.name}</p>
      <p className='text-muted text-xs mt-0.5 truncate'>{client.category}{client.phone ? ` · ${client.phone}` : ''}</p>
    </span>
  </button>
)

// mounted only while its popup is open, so its form state always starts fresh from the current
// `client` prop - same reasoning as ProductEditPanel/MaterialEditPanel.
const ClientEditPanel = ({ client, clientCategories, updateClient, deleteClient, onClose }) => {
  const { t } = useLanguage()
  const [form, setForm] = useState({ name: client.name, phone: client.phone || '', category: client.category, comment: client.comment || '' })
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const ok = await updateClient(client._id, form)
    setSaving(false)
    if (ok) onClose()
  }
  const handleDelete = async () => {
    if (await deleteClient(client._id)) onClose()
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
        <p className='text-xs text-muted mb-1'>{t('categoryLabel')}</p>
        <Select value={form.category} onChange={(v) => setForm({ ...form, category: v })}
          options={clientCategories.map(c => ({ value: c.name, label: c.name }))} />
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

const SalesClients = () => {
  const {
    clientCategories, createClientCategory, updateClientCategory, deleteClientCategory,
    clients, createClient, updateClient, deleteClient,
  } = useContext(ShantiContext)
  const { t } = useLanguage()

  const [categoryFilter, setCategoryFilter] = useState('')
  const [showManageCategories, setShowManageCategories] = useState(false)
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', color: '#0D9488' })
  const [editingCategory, setEditingCategory] = useState(null)
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', phone: '', category: '', comment: '' })
  const [openId, setOpenId] = useState(null)

  const filteredClients = categoryFilter ? clients.filter(c => c.category === categoryFilter) : clients
  const openClient = clients.find(c => c._id === openId)
  const colorForCategory = (name) => clientCategories.find(c => c.name === name)?.color || '#7A7266'

  const submitNewCategory = async (e) => {
    e.preventDefault()
    if (!newCategory.name.trim()) return
    if (await createClientCategory(newCategory)) { setNewCategory({ name: '', color: '#0D9488' }); setAddingCategory(false) }
  }
  const submitEditCategory = async (e) => {
    e.preventDefault()
    if (await updateClientCategory(editingCategory._id, { name: editingCategory.name, color: editingCategory.color })) setEditingCategory(null)
  }
  const submitNewClient = async (e) => {
    e.preventDefault()
    if (!newClient.name.trim()) return
    if (await createClient(newClient)) { setNewClient({ name: '', phone: '', category: '', comment: '' }); setShowNewClient(false) }
  }

  return (
    <div>
      <div className='flex flex-wrap gap-1.5 items-center mb-4'>
        <button onClick={() => setCategoryFilter('')} className={`px-2.5 py-1 rounded-full text-xs font-medium border ${!categoryFilter ? 'bg-accent text-white border-transparent' : 'bg-slate-100 border-transparent text-slate-600'}`}>{t('allOption')}</button>
        {clientCategories.map(c => (
          <button key={c._id} onClick={() => setCategoryFilter(c.name)}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${categoryFilter === c.name ? 'text-white border-transparent' : 'bg-slate-100 border-transparent text-slate-600'}`}
            style={categoryFilter === c.name ? { backgroundColor: c.color } : {}}>
            {c.name}
          </button>
        ))}
        <button onClick={() => setShowManageCategories(true)} title={t('manageCategoriesTitle')}
          className='plain w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100'>
          <Settings size={15} strokeWidth={1.5} />
        </button>
        <button onClick={() => setShowNewClient(true)} className='ml-auto px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium flex items-center gap-1.5'>
          <Plus size={15} strokeWidth={1.5} /> {t('clientLabel')}
        </button>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
        {filteredClients.map(c => (
          <ClientCard key={c._id} client={c} categoryColor={colorForCategory(c.category)} onOpen={() => setOpenId(c._id)} />
        ))}
        {filteredClients.length === 0 && <p className='text-muted text-sm col-span-full text-center py-8'>{t('noClientsYet')}</p>}
      </div>

      {openClient && (
        <Modal title={openClient.name} onClose={() => setOpenId(null)}>
          <ClientEditPanel client={openClient} clientCategories={clientCategories}
            updateClient={updateClient} deleteClient={deleteClient} onClose={() => setOpenId(null)} />
        </Modal>
      )}

      {showManageCategories && (
        <Modal title={t('manageCategoriesTitle')} onClose={() => { setShowManageCategories(false); setEditingCategory(null) }}>
          <div className='flex flex-col gap-1.5'>
            {clientCategories.map(c => (
              <div key={c._id} className='flex items-center justify-between text-sm'>
                {editingCategory?._id === c._id ? (
                  <form onSubmit={submitEditCategory} className='flex gap-1.5 items-center flex-1'>
                    <input type='color' value={editingCategory.color} onChange={e => setEditingCategory({ ...editingCategory, color: e.target.value })} className='w-7 h-7 rounded flex-shrink-0' />
                    <input autoFocus value={editingCategory.name} onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })} className='flex-1 px-2.5 py-1.5 rounded-lg bg-bg border border-hairline text-sm' />
                    <button type='submit' className='px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium'>{t('save')}</button>
                    <button type='button' onClick={() => setEditingCategory(null)} className='plain w-7 h-7 rounded-lg flex items-center justify-center text-muted flex-shrink-0'><X size={14} /></button>
                  </form>
                ) : (
                  <>
                    <span className='flex items-center gap-2 flex-1 min-w-0'>
                      <span className='w-2.5 h-2.5 rounded-full flex-shrink-0' style={{ backgroundColor: c.color }} />
                      <span className='text-ink truncate'>{c.name}</span>
                    </span>
                    <span className='flex gap-1 flex-shrink-0'>
                      <button onClick={() => setEditingCategory(c)} className='plain w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-accent hover:bg-accent-soft'>
                        <Pencil size={13} strokeWidth={1.5} />
                      </button>
                      {c.name !== t('otherCategory') && (
                        <button onClick={() => deleteClientCategory(c._id)} className='plain w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-rose-500 hover:bg-rose-50'>
                          <X size={14} strokeWidth={1.5} />
                        </button>
                      )}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
          {addingCategory ? (
            <form onSubmit={submitNewCategory} className='flex gap-1.5 items-center mt-3'>
              <input type='color' value={newCategory.color} onChange={e => setNewCategory({ ...newCategory, color: e.target.value })} className='w-7 h-7 rounded' />
              <input autoFocus placeholder={t('categoryNamePlaceholder')} value={newCategory.name} onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                className='flex-1 px-2 py-1.5 rounded-lg bg-bg border border-hairline text-xs' />
              <button type='submit' className='px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium'>{t('add')}</button>
            </form>
          ) : (
            <button onClick={() => setAddingCategory(true)} className='plain mt-3 text-accent text-sm font-medium flex items-center gap-1'>
              <Plus size={14} strokeWidth={2} /> {t('addCategoryBtn')}
            </button>
          )}
        </Modal>
      )}

      {showNewClient && (
        <Modal title={t('newClientTitle')} onClose={() => setShowNewClient(false)}>
          <form onSubmit={submitNewClient} className='flex flex-col gap-3'>
            <div>
              <p className='text-xs text-muted mb-1'>{t('personNameLabel')}</p>
              <input value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
            </div>
            <div>
              <p className='text-xs text-muted mb-1'>{t('phoneLabel')}</p>
              <input value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
            </div>
            <div>
              <p className='text-xs text-muted mb-1'>{t('categoryLabel')}</p>
              <Select value={newClient.category} onChange={(v) => setNewClient({ ...newClient, category: v })} placeholder={t('otherCategory')}
                options={clientCategories.map(c => ({ value: c.name, label: c.name }))} />
            </div>
            <div>
              <p className='text-xs text-muted mb-1'>{t('commentLabel')}</p>
              <textarea value={newClient.comment} onChange={e => setNewClient({ ...newClient, comment: e.target.value })} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' rows={2} />
            </div>
            <button type='submit' className='py-2.5 rounded-xl bg-accent text-white text-sm font-medium mt-2'>{t('add')}</button>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default SalesClients
