import React, { useContext, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import Modal from '../components/Modal.jsx'
import AdminProfileModal from '../components/AdminProfileModal.jsx'

const Admins = () => {
  const { admins, createAdmin, updateAdmin, deleteAdminAccount, branches, getAdminProfile } = useContext(DirectorContext)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewingId, setViewingId] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', password: '', branchId: '' })
  const [editForm, setEditForm] = useState({ name: '', phone: '', branchId: '', password: '' })

  const submit = async (e) => {
    e.preventDefault()
    const ok = await createAdmin(form)
    if (ok) { setShowCreate(false); setForm({ name: '', phone: '', password: '', branchId: '' }) }
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
      <div className='flex justify-between items-center mb-4'>
        <p className='font-display text-2xl text-ink'>Admins</p>
        <button onClick={() => setShowCreate(true)} className='px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium'>+ Add admin</button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Search by name or phone…'
        className='w-full max-w-sm px-4 py-2.5 rounded-xl bg-bg-elevated border border-hairline text-sm mb-4' />

      <div className='bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-5 py-3 font-medium'>Name</th>
              <th className='px-5 py-3 font-medium'>Phone</th>
              <th className='px-5 py-3 font-medium'>Branch</th>
              <th className='px-5 py-3'></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a._id} className='border-b border-hairline last:border-0'>
                <td className='px-5 py-3 text-ink'>
                  <button onClick={() => setViewingId(a._id)} className='hover:underline text-left'>{a.name}</button>
                </td>
                <td className='px-5 py-3 text-muted font-mono'>{a.phone}</td>
                <td className='px-5 py-3 text-muted'>{a.branchId?.name}</td>
                <td className='px-5 py-3 text-right whitespace-nowrap'>
                  <button onClick={() => openEdit(a)} className='text-accent text-xs font-medium mr-3'>Edit</button>
                  <button onClick={() => deleteAdminAccount(a._id)} className='text-muted text-xs font-medium'>Remove</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className='px-5 py-8 text-center text-muted'>{admins.length === 0 ? 'No admins yet.' : 'No admins match that search.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <Modal title='Add admin' onClose={() => setShowCreate(false)}>
          <form onSubmit={submit} className='flex flex-col gap-3'>
            <input placeholder='Full name' value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input placeholder='Phone number' value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input placeholder='Password' type='password' value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <select value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              <option value=''>Branch</option>
              {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>Create admin</button>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title={`Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <form onSubmit={submitEdit} className='flex flex-col gap-3'>
            <input placeholder='Full name' value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input placeholder='Phone number' value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <select value={editForm.branchId} onChange={e => setEditForm({ ...editForm, branchId: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
            <input placeholder='New password (leave blank to keep current)' type='password' value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' />
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>Save changes</button>
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
