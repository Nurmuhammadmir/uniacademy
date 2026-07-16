import React, { useContext, useEffect, useMemo, useState } from 'react'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
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
  const { t } = useLanguage()

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
  const [editForm, setEditForm] = useState({ teacherId: '', schedulePattern: '', time: '', capacity: 20, day: 1 })
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
    setEditForm({ teacherId: group.teacherId?._id, schedulePattern: group.schedulePattern, time: group.time, capacity: group.capacity, day: group.dayCounter || 1 })
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
        <p className='font-display text-2xl text-ink'>{t('groupsTitle')}</p>
        <button onClick={() => setShowCreate(true)} className='px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium'>{t('newGroup')}</button>
      </div>

      {/* status tabs */}
      <div className='flex gap-2 mb-4'>
        {[{ key: 'active', label: t('activeTab') }, { key: 'archived', label: t('archivedTab') }].map(s => (
          <button key={s.key} onClick={() => setStatusTab(s.key)} className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${statusTab === s.key ? 'bg-accent text-white' : 'bg-bg-elevated border border-hairline text-muted'}`}>{s.label}</button>
        ))}
      </div>

      {/* language folder tabs */}
      <div className='flex gap-2 mb-4 flex-wrap'>
        <button onClick={() => setLanguageTab('all')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${languageTab === 'all' ? 'bg-accent-soft text-accent' : 'bg-bg-elevated border border-hairline text-muted'}`}>{t('allLanguages')}</button>
        {languageFolders.map(([id, name]) => (
          <button key={id} onClick={() => setLanguageTab(id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${languageTab === id ? 'bg-accent-soft text-accent' : 'bg-bg-elevated border border-hairline text-muted'}`}>{name}</button>
        ))}
      </div>

      {/* filters */}
      <div className='flex gap-3 mb-6'>
        <select value={teacherFilter} onChange={e => setTeacherFilter(e.target.value)} className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm'>
          <option value=''>{t('anyTeacher')}</option>
          {teachers.map(t2 => <option key={t2._id} value={t2._id}>{t2.name}</option>)}
        </select>
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm'>
          <option value=''>{t('anyLevel')}</option>
          {[...new Map(groups.map(g => [g.levelId?._id, g.levelId?.name])).entries()].map(([id, name]) => id && <option key={id} value={id}>{name}</option>)}
        </select>
        <input type='time' value={timeFilter} onChange={e => setTimeFilter(e.target.value)} className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm' placeholder={t('anyTimeHint')} />
        {(teacherFilter || levelFilter || timeFilter) && (
          <button onClick={() => { setTeacherFilter(''); setLevelFilter(''); setTimeFilter('') }} className='text-muted text-sm'>{t('clearFilters')}</button>
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
              <span className='font-mono text-xs text-accent bg-accent-soft px-2 py-1 rounded-full'>{t('dayOf', { day: g.dayCounter, total: g.levelId?.durationDays || 30 })}</span>
            </div>

            <p className='text-muted text-xs mb-3'>{t('studentsOfCapacity', { count: g.studentIds.length, capacity: g.capacity })}</p>

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
                  <button onClick={() => openAdd(g)} className='text-accent text-sm font-medium'>{t('addStudentBtn')}</button>
                  <button onClick={() => openEdit(g)} className='text-accent text-sm font-medium'>{t('edit')}</button>
                  <button onClick={() => deleteGroup(g._id)} className='text-muted text-sm font-medium'>{t('archiveBtn')}</button>
                </>
              ) : (
                <button onClick={() => unarchiveGroup(g._id)} className='text-accent text-sm font-medium'>{t('reactivateBtn')}</button>
              )}
            </div>
          </div>
        ))}
        {visibleGroups.length === 0 && <p className='text-muted col-span-2'>{t('noGroupsMatchFilters')}</p>}
      </div>

      {showCreate && (
        <Modal title={t('newGroupModalTitle')} onClose={() => setShowCreate(false)}>
          <form onSubmit={submitCreate} className='flex flex-col gap-3'>
            <select value={form.languageId} onChange={e => setForm({ ...form, languageId: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              <option value=''>{t('languageLabel')}</option>
              {languages.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
            <select value={form.levelId} onChange={e => setForm({ ...form, levelId: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              <option value=''>{t('levelLabel')}</option>
              {levels.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
            <select value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              <option value=''>{t('teacherLabel')}</option>
              {teachers.map(t2 => <option key={t2._id} value={t2._id}>{t2.name}</option>)}
            </select>
            <select value={form.schedulePattern} onChange={e => setForm({ ...form, schedulePattern: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline'>
              {SCHEDULES.map(s => <option key={s} value={s}>{s.replaceAll('_', '/')}</option>)}
            </select>
            <input type='time' value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input type='date' value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>{t('createGroupBtn')}</button>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title={t('editGroupModalTitle', { language: editing.languageId?.name, level: editing.levelId?.name })} onClose={() => setEditing(null)}>
          <form onSubmit={submitEdit} className='flex flex-col gap-3'>
            <select value={editForm.teacherId} onChange={e => setEditForm({ ...editForm, teacherId: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              {teachers.map(t2 => <option key={t2._id} value={t2._id}>{t2.name}</option>)}
            </select>
            <select value={editForm.schedulePattern} onChange={e => setEditForm({ ...editForm, schedulePattern: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline'>
              {SCHEDULES.map(s => <option key={s} value={s}>{s.replaceAll('_', '/')}</option>)}
            </select>
            <input type='time' value={editForm.time} onChange={e => setEditForm({ ...editForm, time: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input type='number' placeholder={t('capacityPlaceholder')} value={editForm.capacity} onChange={e => setEditForm({ ...editForm, capacity: Number(e.target.value) })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <div>
              <label className='block text-xs text-muted mb-1'>{t('currentDayLabel', { total: editing.levelId?.durationDays || 30 })}</label>
              <input type='number' min='1' max={editing.levelId?.durationDays || 30} value={editForm.day}
                onChange={e => setEditForm({ ...editForm, day: Number(e.target.value) })}
                className='w-full px-4 py-3 rounded-xl bg-bg border border-hairline' required />
              <p className='text-[11px] text-muted mt-1'>{t('editDayHint')}</p>
            </div>
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>{t('saveChanges')}</button>
          </form>
        </Modal>
      )}

      {addingTo && (
        <Modal title={t('addStudentToGroupModalTitle', { language: addingTo.languageId?.name, level: addingTo.levelId?.name })} onClose={() => setAddingTo(null)}>
          {suggestion && suggestion._id !== addingTo._id && (
            <p className='text-xs text-muted mb-3'>{t('lessLoadedGroupTip')}</p>
          )}
          <form onSubmit={submitAdd} className='flex flex-col gap-3'>
            <select value={studentId} onChange={e => setStudentId(e.target.value)} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              <option value=''>{t('selectStudent')}</option>
              {students
                .filter(s => s.courses.some(c => c.isActive))
                .filter(s => !groups.some(g => g.status === 'active' && g.languageId?._id === addingTo.languageId?._id && g.studentIds.includes(s._id)))
                .map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <p className='text-xs text-muted'>{t('onlyActiveStudentsNote')}</p>
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>{t('addToGroupBtn')}</button>
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
