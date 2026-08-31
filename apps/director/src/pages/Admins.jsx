import React, { useContext, useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Modal from '../components/Modal.jsx'
import AdminProfileModal from '../components/AdminProfileModal.jsx'
import PasswordInput from '../components/PasswordInput.jsx'

const AVATAR_GRADIENTS = [
  'from-[#FF6B6B] to-[#FF3B30]', 'from-[#FF9F43] to-[#FF9500]', 'from-[#34C759] to-[#30B94D]',
  'from-[#5AC8FA] to-[#007AFF]', 'from-[#5E5CE6] to-[#4B4FE0]', 'from-[#BF5AF2] to-[#AF52DE]',
  'from-[#FF7EB9] to-[#FF2D55]', 'from-[#64D2FF] to-[#32ADE6]',
]
const avatarGradient = (name) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
}
const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')

const Admins = () => {
  const { admins, createAdmin, updateAdmin, deleteAdminAccount, branches, getAdminProfile } = useContext(DirectorContext)
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewingId, setViewingId] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', password: '', branchId: '', role: 'admin' })
  const [editForm, setEditForm] = useState({ name: '', phone: '', branchId: '', password: '' })

  const submit = async (e) => {
    e.preventDefault()
    const ok = await createAdmin(form)
    if (ok) { setShowCreate(false); setForm({ name: '', phone: '', password: '', branchId: '', role: 'admin' }) }
  }

  const openEdit = (admin) => {
    setEditing(admin)
    setEditForm({ name: admin.name, phone: admin.phone, branchId: admin.branchId?._id, password: '' })
  }

  const submitEdit = async (e) => {
    e.preventDefault()
    const ok = await updateAdmin(editing._id, editForm)
    if (ok) setEditing(null)
  }

  const filtered = admins.filter(a => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return a.name.toLowerCase().includes(q) || a.phone.toLowerCase().includes(q)
  })

  return (
    <div>
      <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4'>
        <div className='flex items-baseline gap-3'>
          <p className='font-display text-2xl text-ink'>{t('adminsTitle')}</p>
          <span className='text-sm font-medium text-muted'>{filtered.length}</span>
        </div>
        <button onClick={() => setShowCreate(true)} className='px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium flex items-center gap-1.5 shadow-sm transition-transform active:scale-95'>
          <Plus size={14} /> {t('addAdmin')}
        </button>
      </div>

      <div className='relative w-full max-w-sm mb-4'>
        <Search size={16} strokeWidth={2} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none' />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchStudents')}
          className='w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-elevated border border-hairline text-sm focus:outline-none focus:ring-2 focus:ring-accent/30' />
      </div>

      <div className='hidden md:block bg-bg-elevated border border-hairline rounded-2xl overflow-hidden overflow-x-auto shadow-sm'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-5 py-3 font-medium'>{t('nameCol')}</th>
              <th className='px-5 py-3 font-medium'>{t('phoneCol')}</th>
              <th className='px-5 py-3 font-medium'>{t('branch')}</th>
              <th className='px-5 py-3 font-medium'>{t('roleCol')}</th>
              <th className='px-5 py-3'></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a._id} className='border-b border-hairline last:border-0 transition-colors hover:bg-bg'>
                <td className='px-5 py-4 text-ink'>
                  <button onClick={() => setViewingId(a._id)} className='plain flex items-center gap-2.5 text-left'>
                    <span className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradient(a.name)} flex items-center justify-center flex-shrink-0 text-white font-semibold text-[11px]`}>
                      {initials(a.name)}
                    </span>
                    <span className='font-medium hover:underline'>{a.name}</span>
                  </button>
                </td>
                <td className='px-5 py-4 text-muted font-mono'>{a.phone}</td>
                <td className='px-5 py-4 text-muted'>{a.branchId?.name}</td>
                <td className='px-5 py-4'>
                  {a.role === 'sub_director' ? (
                    <span className='px-2.5 py-1 rounded-full text-xs font-medium bg-accent-soft text-accent'>{t('roleSubDirector')}</span>
                  ) : (
                    <span className='px-2.5 py-1 rounded-full text-xs font-medium bg-bg border border-hairline text-muted'>{t('roleAdmin')}</span>
                  )}
                </td>
                <td className='px-5 py-4 text-right whitespace-nowrap'>
                  <button onClick={() => openEdit(a)} className='text-accent text-xs font-medium mr-3 hover:opacity-70 transition-opacity'>{t('edit')}</button>
                  <button onClick={() => deleteAdminAccount(a._id)} className='text-muted text-xs font-medium hover:text-rose-500 transition-colors'>{t('remove')}</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className='px-5 py-8 text-center text-muted'>{admins.length === 0 ? t('noAdminsYet') : t('noAdminsMatchSearch')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className='block md:hidden flex flex-col gap-2.5'>
        {filtered.length === 0 && (
          <p className='text-muted text-sm text-center py-8'>{admins.length === 0 ? t('noAdminsYet') : t('noAdminsMatchSearch')}</p>
        )}
        {filtered.map(a => (
          <div key={a._id} className='bg-bg-elevated border border-hairline rounded-xl p-3.5 shadow-sm flex items-center gap-3'>
            <button onClick={() => setViewingId(a._id)} className={`plain w-11 h-11 rounded-full bg-gradient-to-br ${avatarGradient(a.name)} flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm shadow-sm`}>
              {initials(a.name)}
            </button>
            <div className='min-w-0 flex-1'>
              <div className='flex justify-between items-start gap-2'>
                <button onClick={() => setViewingId(a._id)} className='plain text-ink font-semibold text-sm text-left truncate block'>{a.name}</button>
                {a.role === 'sub_director' ? (
                  <span className='px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent-soft text-accent flex-shrink-0'>{t('roleSubDirector')}</span>
                ) : (
                  <span className='px-2 py-0.5 rounded-full text-[11px] font-medium bg-bg border border-hairline text-muted flex-shrink-0'>{t('roleAdmin')}</span>
                )}
              </div>
              <p className='text-muted text-xs mt-0.5 font-mono'>{a.phone}</p>
              <div className='flex justify-between items-center mt-1.5'>
                <p className='text-muted text-xs'>{a.branchId?.name}</p>
                <div className='flex gap-3'>
                  <button onClick={() => openEdit(a)} className='text-accent text-xs font-medium'>{t('edit')}</button>
                  <button onClick={() => deleteAdminAccount(a._id)} className='text-muted text-xs font-medium'>{t('remove')}</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <Modal title={t('addAdminTitle')} onClose={() => setShowCreate(false)}>
          <form onSubmit={submit} className='flex flex-col gap-3'>
            <div className='flex gap-2'>
              {[['admin', t('roleAdmin')], ['sub_director', t('roleSubDirector')]].map(([value, label]) => (
                <button key={value} type='button' onClick={() => setForm({ ...form, role: value })}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border ${form.role === value ? 'bg-accent text-white border-accent' : 'bg-bg border-hairline text-muted'}`}>
                  {label}
                </button>
              ))}
            </div>
            {form.role === 'sub_director' && <p className='text-xs text-muted -mt-1'>{t('subDirectorHint')}</p>}
            <input placeholder={t('adminName')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input placeholder={t('adminPhone')} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <PasswordInput placeholder={t('adminPassword')} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <select value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              <option value=''>{t('branch')}</option>
              {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>{form.role === 'sub_director' ? t('createSubDirectorBtn') : t('createAdminBtn')}</button>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title={t('editX', { name: editing.name })} onClose={() => setEditing(null)}>
          <form onSubmit={submitEdit} className='flex flex-col gap-3'>
            <input placeholder={t('adminName')} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input placeholder={t('adminPhone')} value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <select value={editForm.branchId} onChange={e => setEditForm({ ...editForm, branchId: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
            <PasswordInput placeholder={t('newPasswordLeaveBlank')} value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' />
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>{t('saveChanges')}</button>
          </form>
        </Modal>
      )}

      {viewingId && (
        <AdminProfileModal adminId={viewingId} getAdminProfile={getAdminProfile} onClose={() => setViewingId(null)} />
      )}
    </div>
  )
}

export default Admins
