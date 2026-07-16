import React, { useContext, useEffect, useMemo, useState } from 'react'
import { AdminContext } from '../context/AdminContext.jsx'
import Modal from '../components/Modal.jsx'
import GroupProfileModal from '../components/GroupProfileModal.jsx'
import StudentProfileModal from '../components/StudentProfileModal.jsx'
import TeacherProfileModal from '../components/TeacherProfileModal.jsx'

const SCHEDULES = ['MON_WED_FRI', 'TUE_THU_SAT']

const Groups = () => {
  const {
    groups, getGroups, createGroup, updateGroup, deleteGroup, unarchiveGroup, getGroupProfile,
    teachers, languages, levels, getLevels,
    students, addStudentToGroup, removeStudentFromGroup, suggestGroup,
    getStudentProfile, getTeacherProfile,
  } = useContext(AdminContext)

  const [statusTab, setStatusTab] = useState('active')
  const [languageTab, setLanguageTab] = useState('all')
  const [teacherFilter, setTeacherFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [timeFilter, setTimeFilter] = useState('')

  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [addingTo, setAddingTo] = useState(null)
  const [viewingGroupId, setViewingGroupId] = useState(null)
  const [viewingStudentId, setViewingStudentId] = useState(null)
  const [viewingTeacherId, setViewingTeacherId] = useState(null)
  const [form, setForm] = useState({ languageId: '', levelId: '', teacherId: '', schedulePattern: SCHEDULES[0], time: '18:00', startDate: '' })
  const [editForm, setEditForm] = useState({ teacherId: '', schedulePattern: '', time: '', capacity: 20 })
  const [studentId, setStudentId] = useState('')
  const [suggestion, setSuggestion] = useState(null)

  useEffect(() => { if (form.languageId) getLevels(form.languageId) }, [form.languageId])

  // language folders - "all" plus one tab per language actually in use
  const languageFolders = useMemo(() => {
    const seen = new Map()
    groups.forEach(g => { if (g.languageId) seen.set(g.languageId._id, g.languageId.name) })
    return Array.from(seen.entries())
  }, [groups])

  const visibleGroups = groups.filter(g => {
    if (g.status !== statusTab) return false
    if (languageTab !== 'all' && g.languageId?._id !== languageTab) return false
    if (teacherFilter && g.teacherId?._id !== teacherFilter) return false
    if (levelFilter && g.levelId?._id !== levelFilter) return false
    if (timeFilter && g.time !== timeFilter) return false
    return true
  })

  const submitCreate = async (e) => {
    e.preventDefault()
    const ok = await createGroup(form)
    if (ok) setShowCreate(false)
  }

  const openEdit = (group) => {
    setEditing(group)
    setEditForm({ teacherId: group.teacherId?._id, schedulePattern: group.schedulePattern, time: group.time, capacity: group.capacity })
  }

  const submitEdit = async (e) => {
    e.preventDefault()
    const ok = await updateGroup(editing._id, editForm)
    if (ok) setEditing(null)
  }

  const openAdd = async (group) => {
    setAddingTo(group)
    const s = await suggestGroup(group.languageId._id || group.languageId, group.levelId._id || group.levelId)
    setSuggestion(s)
  }

  const submitAdd = async (e) => {
    e.preventDefault()
    const ok = await addStudentToGroup(addingTo._id, studentId)
    if (ok) { setAddingTo(null); setStudentId('') }
  }

  const studentName = (id) => students.find(s => s._id === id)?.name || id

  return (
    <div>
      <div className='flex justify-between items-center mb-4'>
        <p className='font-display text-2xl text-ink'>Groups</p>
        <button onClick={() => setShowCreate(true)} className='px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium'>+ New group</button>
      </div>

      {/* status tabs */}
      <div className='flex gap-2 mb-4'>
        {['active', 'archived'].map(s => (
          <button key={s} onClick={() => setStatusTab(s)} className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${statusTab === s ? 'bg-accent text-white' : 'bg-bg-elevated border border-hairline text-muted'}`}>{s}</button>
        ))}
      </div>

      {/* language folder tabs */}
      <div className='flex gap-2 mb-4 flex-wrap'>
        <button onClick={() => setLanguageTab('all')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${languageTab === 'all' ? 'bg-accent-soft text-accent' : 'bg-bg-elevated border border-hairline text-muted'}`}>All languages</button>
        {languageFolders.map(([id, name]) => (
          <button key={id} onClick={() => setLanguageTab(id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${languageTab === id ? 'bg-accent-soft text-accent' : 'bg-bg-elevated border border-hairline text-muted'}`}>{name}</button>
        ))}
      </div>

      {/* filters */}
      <div className='flex gap-3 mb-6'>
        <select value={teacherFilter} onChange={e => setTeacherFilter(e.target.value)} className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm'>
          <option value=''>Any teacher</option>
          {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm'>
          <option value=''>Any level</option>
          {[...new Map(groups.map(g => [g.levelId?._id, g.levelId?.name])).entries()].map(([id, name]) => id && <option key={id} value={id}>{name}</option>)}
        </select>
        <input type='time' value={timeFilter} onChange={e => setTimeFilter(e.target.value)} className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm' placeholder='Any time' />
        {(teacherFilter || levelFilter || timeFilter) && (
          <button onClick={() => { setTeacherFilter(''); setLevelFilter(''); setTimeFilter('') }} className='text-muted text-sm'>Clear filters</button>
        )}
      </div>

      <div className='grid grid-cols-2 gap-4'>
        {visibleGroups.map(g => (
          <div key={g._id} className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
            <div className='flex justify-between items-start mb-2'>
              <button onClick={() => setViewingGroupId(g._id)} className='text-left hover:underline'>
                <p className='text-ink font-medium'>{g.languageId?.name} · {g.levelId?.name}</p>
                <p className='text-muted text-sm'>{g.teacherId?.name} · {g.schedulePattern.replaceAll('_', '/')} {g.time}</p>
              </button>
              <span className='font-mono text-xs text-accent bg-accent-soft px-2 py-1 rounded-full'>day {g.dayCounter}/{g.levelId?.durationDays || 30}</span>
            </div>

            <p className='text-muted text-xs mb-3'>{g.studentIds.length}/{g.capacity} students</p>

            <div className='flex flex-wrap gap-1 mb-3'>
              {g.studentIds.map(sid => (
                <span key={sid} className='inline-flex items-center gap-1 bg-bg border border-hairline rounded-full px-2 py-1 text-xs text-ink'>
                  {studentName(sid)}
                  {statusTab === 'active' && <button onClick={() => removeStudentFromGroup(g._id, sid)} className='text-muted'>×</button>}
                </span>
              ))}
            </div>

            <div className='flex gap-4'>
              {statusTab === 'active' ? (
                <>
                  <button onClick={() => openAdd(g)} className='text-accent text-sm font-medium'>+ Add student</button>
                  <button onClick={() => openEdit(g)} className='text-accent text-sm font-medium'>Edit</button>
                  <button onClick={() => deleteGroup(g._id)} className='text-muted text-sm font-medium'>Archive</button>
                </>
              ) : (
                <button onClick={() => unarchiveGroup(g._id)} className='text-accent text-sm font-medium'>Reactivate</button>
              )}
            </div>
          </div>
        ))}
        {visibleGroups.length === 0 && <p className='text-muted col-span-2'>No groups match these filters.</p>}
      </div>

      {showCreate && (
        <Modal title='New group' onClose={() => setShowCreate(false)}>
          <form onSubmit={submitCreate} className='flex flex-col gap-3'>
            <select value={form.languageId} onChange={e => setForm({ ...form, languageId: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              <option value=''>Language</option>
              {languages.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
            <select value={form.levelId} onChange={e => setForm({ ...form, levelId: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              <option value=''>Level</option>
              {levels.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
            <select value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              <option value=''>Teacher</option>
              {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
            <select value={form.schedulePattern} onChange={e => setForm({ ...form, schedulePattern: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline'>
              {SCHEDULES.map(s => <option key={s} value={s}>{s.replaceAll('_', '/')}</option>)}
            </select>
            <input type='time' value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input type='date' value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>Create group</button>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title={`Edit ${editing.languageId?.name} · ${editing.levelId?.name}`} onClose={() => setEditing(null)}>
          <form onSubmit={submitEdit} className='flex flex-col gap-3'>
            <select value={editForm.teacherId} onChange={e => setEditForm({ ...editForm, teacherId: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
            <select value={editForm.schedulePattern} onChange={e => setEditForm({ ...editForm, schedulePattern: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline'>
              {SCHEDULES.map(s => <option key={s} value={s}>{s.replaceAll('_', '/')}</option>)}
            </select>
            <input type='time' value={editForm.time} onChange={e => setEditForm({ ...editForm, time: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input type='number' placeholder='Capacity' value={editForm.capacity} onChange={e => setEditForm({ ...editForm, capacity: Number(e.target.value) })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>Save changes</button>
          </form>
        </Modal>
      )}

      {addingTo && (
        <Modal title={`Add student to ${addingTo.languageId?.name} · ${addingTo.levelId?.name}`} onClose={() => setAddingTo(null)}>
          {suggestion && suggestion._id !== addingTo._id && (
            <p className='text-xs text-muted mb-3'>Tip: a less-loaded group in this language/level is available - you can still add here if that's a better fit for the student's schedule.</p>
          )}
          <form onSubmit={submitAdd} className='flex flex-col gap-3'>
            <select value={studentId} onChange={e => setStudentId(e.target.value)} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              <option value=''>Select student</option>
              {students
                .filter(s => s.courses.some(c => c.isActive))
                .filter(s => !groups.some(g => g.status === 'active' && g.languageId?._id === addingTo.languageId?._id && g.studentIds.includes(s._id)))
                .map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <p className='text-xs text-muted'>Only active students not already in another group for this same language appear here.</p>
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>Add to group</button>
          </form>
        </Modal>
      )}

      {viewingGroupId && (
        <GroupProfileModal
          groupId={viewingGroupId}
          getGroupProfile={getGroupProfile}
          onViewStudent={(id) => { setViewingGroupId(null); setViewingStudentId(id) }}
          onViewTeacher={(id) => { setViewingGroupId(null); setViewingTeacherId(id) }}
          onClose={() => setViewingGroupId(null)}
        />
      )}

      {viewingStudentId && (
        <StudentProfileModal studentId={viewingStudentId} getStudentProfile={getStudentProfile} onClose={() => setViewingStudentId(null)} />
      )}

      {viewingTeacherId && (
        <TeacherProfileModal teacherId={viewingTeacherId} getTeacherProfile={getTeacherProfile} onClose={() => setViewingTeacherId(null)} />
      )}
    </div>
  )
}

export default Groups
