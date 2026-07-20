import React, { useContext, useMemo, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Modal from '../components/Modal.jsx'
import TeacherProfileModal from '../components/TeacherProfileModal.jsx'
import PasswordInput from '../components/PasswordInput.jsx'

const Teachers = () => {
  const { teachers, createTeacher, updateTeacher, deleteTeacherAccount, branches, getTeacherProfile } = useContext(DirectorContext)
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [sortBy, setSortBy] = useState('students') // students | recent | name
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewingId, setViewingId] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', password: '', branchId: '', additionalBranchIds: [] })
  const [editForm, setEditForm] = useState({ name: '', phone: '', branchId: '', password: '', additionalBranchIds: [] })

  const toggleAdditionalBranch = (setter, current, branchId) => {
    const set = new Set(current)
    if (set.has(branchId)) set.delete(branchId); else set.add(branchId)
    setter([...set])
  }

  const submit = async (e) => {
    e.preventDefault()
    const ok = await createTeacher(form)
    if (ok) { setShowCreate(false); setForm({ name: '', phone: '', password: '', branchId: '', additionalBranchIds: [] }) }
  }

  const openEdit = (teacher) => {
    setEditing(teacher)
    setEditForm({ name: teacher.name, phone: teacher.phone, branchId: teacher.branchId?._id, password: '', additionalBranchIds: (teacher.additionalBranchIds || []).map(b => b._id) })
  }

  const submitEdit = async (e) => {
    e.preventDefault()
    const ok = await updateTeacher(editing._id, editForm)
    if (ok) setEditing(null)
  }

  const visibleTeachers = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = teachers.filter(tc => {
      if (branchFilter && tc.branchId?._id !== branchFilter) return false
      if (q && !tc.name.toLowerCase().includes(q) && !tc.phone.toLowerCase().includes(q)) return false
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
        <p className='font-display text-2xl text-ink'>{t('teachersTitle')}</p>
        <button onClick={() => setShowCreate(true)} className='px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium'>{t('addTeacher')}</button>
      </div>

      <div className='flex gap-3 mb-4'>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchStudents')}
          className='flex-1 max-w-sm px-4 py-2.5 rounded-xl bg-bg-elevated border border-hairline text-sm' />
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className='px-3 py-2.5 rounded-xl bg-bg-elevated border border-hairline text-sm'>
          <option value=''>{t('anyBranch')}</option>
          {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className='px-3 py-2.5 rounded-xl bg-bg-elevated border border-hairline text-sm'>
          <option value='students'>{t('mostStudentsFirst')}</option>
          <option value='recent'>{t('recentlyAddedFirst')}</option>
          <option value='name'>{t('nameAZ')}</option>
        </select>
      </div>

      <div className='bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-5 py-3 font-medium'>{t('nameCol')}</th>
              <th className='px-5 py-3 font-medium'>{t('phoneCol')}</th>
              <th className='px-5 py-3 font-medium'>{t('branch')}</th>
              <th className='px-5 py-3 font-medium'>{t('activeStudentsCol')}</th>
              <th className='px-5 py-3 font-medium'>{t('addedCol')}</th>
              <th className='px-5 py-3'></th>
            </tr>
          </thead>
          <tbody>
            {visibleTeachers.map(tc => (
              <tr key={tc._id} className='border-b border-hairline last:border-0'>
                <td className='px-5 py-4 text-ink'>
                  <button onClick={() => setViewingId(tc._id)} className='hover:underline text-left'>{tc.name}</button>
                </td>
                <td className='px-5 py-4 text-muted font-mono'>{tc.phone}</td>
                <td className='px-5 py-4 text-muted'>{tc.branchId?.name}</td>
                <td className='px-5 py-4 font-mono text-accent'>{tc.activeStudentCount ?? 0}</td>
                <td className='px-5 py-4 text-muted text-xs'>{new Date(tc.createdAt).toLocaleDateString()}</td>
                <td className='px-5 py-4 text-right whitespace-nowrap'>
                  <button onClick={() => openEdit(tc)} className='text-accent text-xs font-medium mr-3'>{t('edit')}</button>
                  <button onClick={() => deleteTeacherAccount(tc._id)} className='text-muted text-xs font-medium'>{t('remove')}</button>
                </td>
              </tr>
            ))}
            {visibleTeachers.length === 0 && (
              <tr><td colSpan={6} className='px-5 py-8 text-center text-muted'>{teachers.length === 0 ? t('noTeachersYet') : t('noTeachersMatchFilters')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <Modal title={t('addTeacherTitle')} onClose={() => setShowCreate(false)}>
          <form onSubmit={submit} className='flex flex-col gap-3'>
            <input placeholder={t('teacherName')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input placeholder={t('teacherPhone')} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <PasswordInput placeholder={t('teacherPassword')} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <select value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              <option value=''>{t('branch')}</option>
              {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
            {form.branchId && branches.length > 1 && (
              <div>
                <p className='text-xs text-muted mb-1'>{t('additionalBranchesLabel')}</p>
                <div className='flex flex-wrap gap-2'>
                  {branches.filter(b => b._id !== form.branchId).map(b => (
                    <button type='button' key={b._id}
                      onClick={() => toggleAdditionalBranch(v => setForm({ ...form, additionalBranchIds: v }), form.additionalBranchIds, b._id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${form.additionalBranchIds.includes(b._id) ? 'bg-accent text-white' : 'bg-bg border border-hairline text-muted'}`}>
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>{t('createTeacherBtn')}</button>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title={t('editX', { name: editing.name })} onClose={() => setEditing(null)}>
          <form onSubmit={submitEdit} className='flex flex-col gap-3'>
            <input placeholder={t('teacherName')} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input placeholder={t('teacherPhone')} value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <select value={editForm.branchId} onChange={e => setEditForm({ ...editForm, branchId: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
            {editForm.branchId && branches.length > 1 && (
              <div>
                <p className='text-xs text-muted mb-1'>{t('additionalBranchesLabel')}</p>
                <div className='flex flex-wrap gap-2'>
                  {branches.filter(b => b._id !== editForm.branchId).map(b => (
                    <button type='button' key={b._id}
                      onClick={() => toggleAdditionalBranch(v => setEditForm({ ...editForm, additionalBranchIds: v }), editForm.additionalBranchIds, b._id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${editForm.additionalBranchIds.includes(b._id) ? 'bg-accent text-white' : 'bg-bg border border-hairline text-muted'}`}>
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <PasswordInput placeholder={t('newPasswordLeaveBlank')} value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' />
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>{t('saveChanges')}</button>
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
