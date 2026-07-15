import React, { useContext, useMemo, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import Modal from '../components/Modal.jsx'
import TeacherProfileModal from '../components/TeacherProfileModal.jsx'

const Teachers = () => {
  const { teachers, createTeacher, updateTeacher, deleteTeacherAccount, branches, getTeacherProfile } = useContext(DirectorContext)
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [sortBy, setSortBy] = useState('students') // students | recent | name
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewingId, setViewingId] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', password: '', branchId: '' })
  const [editForm, setEditForm] = useState({ name: '', phone: '', branchId: '', password: '' })

  const submit = async (e) => {
    e.preventDefault()
    const ok = await createTeacher(form)
    if (ok) { setShowCreate(false); setForm({ name: '', phone: '', password: '', branchId: '' }) }
  }

  const openEdit = (teacher) => {
    setEditing(teacher)
    setEditForm({ name: teacher.name, phone: teacher.phone, branchId: teacher.branchId?._id, password: '' })
  }

  const submitEdit = async (e) => {
    e.preventDefault()
    const ok = await updateTeacher(editing._id, editForm)
    if (ok) setEditing(null)
  }

  const visibleTeachers = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = teachers.filter(t => {
      if (branchFilter && t.branchId?._id !== branchFilter) return false
      if (q && !t.name.toLowerCase().includes(q) && !t.phone.toLowerCase().includes(q)) return false
      return true
    })
    if (sortBy === 'students') list = [...list].sort((a, b) => (b.activeStudentCount || 0) - (a.activeStudentCount || 0))
    if (sortBy === 'recent') list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    if (sortBy === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [teachers, search, branchFilter, sortBy])

  return (
    <div>
      <div className='flex justify-between items-center mb-4'>
        <p className='font-display text-2xl text-ink'>Teachers</p>
        <button onClick={() => setShowCreate(true)} className='px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium'>+ Add teacher</button>
      </div>

      <div className='flex gap-3 mb-4'>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Search by name or phone…'
          className='flex-1 max-w-sm px-4 py-2.5 rounded-xl bg-bg-elevated border border-hairline text-sm' />
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className='px-3 py-2.5 rounded-xl bg-bg-elevated border border-hairline text-sm'>
          <option value=''>Any branch</option>
          {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className='px-3 py-2.5 rounded-xl bg-bg-elevated border border-hairline text-sm'>
          <option value='students'>Most students first</option>
          <option value='recent'>Recently added first</option>
          <option value='name'>Name (A-Z)</option>
        </select>
      </div>

      <div className='bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-5 py-3 font-medium'>Name</th>
              <th className='px-5 py-3 font-medium'>Phone</th>
              <th className='px-5 py-3 font-medium'>Branch</th>
              <th className='px-5 py-3 font-medium'>Active students</th>
              <th className='px-5 py-3 font-medium'>Added</th>
              <th className='px-5 py-3'></th>
            </tr>
          </thead>
          <tbody>
            {visibleTeachers.map(t => (
              <tr key={t._id} className='border-b border-hairline last:border-0'>
                <td className='px-5 py-3 text-ink'>
                  <button onClick={() => setViewingId(t._id)} className='hover:underline text-left'>{t.name}</button>
                </td>
                <td className='px-5 py-3 text-muted font-mono'>{t.phone}</td>
                <td className='px-5 py-3 text-muted'>{t.branchId?.name}</td>
                <td className='px-5 py-3 font-mono text-accent'>{t.activeStudentCount ?? 0}</td>
                <td className='px-5 py-3 text-muted text-xs'>{new Date(t.createdAt).toLocaleDateString()}</td>
                <td className='px-5 py-3 text-right whitespace-nowrap'>
                  <button onClick={() => openEdit(t)} className='text-accent text-xs font-medium mr-3'>Edit</button>
                  <button onClick={() => deleteTeacherAccount(t._id)} className='text-muted text-xs font-medium'>Remove</button>
                </td>
              </tr>
            ))}
            {visibleTeachers.length === 0 && (
              <tr><td colSpan={6} className='px-5 py-8 text-center text-muted'>{teachers.length === 0 ? 'No teachers yet.' : 'No teachers match these filters.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <Modal title='Add teacher' onClose={() => setShowCreate(false)}>
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
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>Create teacher</button>
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
        <TeacherProfileModal teacherId={viewingId} getTeacherProfile={getTeacherProfile} onClose={() => setViewingId(null)} />
      )}
    </div>
  )
}

export default Teachers
