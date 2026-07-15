import React, { useContext, useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { formatMoney } from '../lib/format.js'
import { AdminContext } from '../context/AdminContext.jsx'

// full read-only profile: registration date, every course with price/balance, full payment history,
// exam attempt history, and every group they've ever been in - deliberately does NOT show
// address/geo, only the director is allowed to see where a student lives
const StudentProfileModal = ({ studentId, getStudentProfile, onClose }) => {
  const { addStudentCourse, updateStudentCourse, languages, levels, getLevels } = useContext(AdminContext)
  const [data, setData] = useState(false)
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [courseForm, setCourseForm] = useState({ languageId: '', levelId: '' })
  const [editingCourse, setEditingCourse] = useState(null)
  const [editLevelId, setEditLevelId] = useState('')

  const reload = () => getStudentProfile(studentId).then(setData)
  useEffect(() => { reload() }, [studentId])
  useEffect(() => { if (courseForm.languageId) getLevels(courseForm.languageId) }, [courseForm.languageId])
  useEffect(() => { if (editingCourse) getLevels(editingCourse.languageId._id) }, [editingCourse])

  const submitCourse = async (e) => {
    e.preventDefault()
    const ok = await addStudentCourse(studentId, courseForm.languageId, courseForm.levelId)
    if (ok) { setShowAddCourse(false); setCourseForm({ languageId: '', levelId: '' }); reload() }
  }

  const openEditLevel = (course) => {
    setEditingCourse(course)
    setEditLevelId(course.levelId._id)
  }

  const submitEditLevel = async (e) => {
    e.preventDefault()
    const ok = await updateStudentCourse(studentId, editingCourse._id, editLevelId)
    if (ok) { setEditingCourse(null); reload() }
  }

  return (
    <Modal title='Student profile' onClose={onClose} wide>
      {!data ? (
        <p className='text-muted'>Loading…</p>
      ) : (
        <div className='flex flex-col gap-5'>
          <div>
            <p className='font-display text-xl text-ink'>{data.student.name}</p>
            <p className='text-muted text-sm font-mono'>{data.student.phone}</p>
            <p className='text-muted text-xs mt-1'>Registered {new Date(data.student.createdAt).toLocaleDateString()}</p>
          </div>

          {data.student.passportInfo && (
            <div className='bg-bg border border-hairline rounded-xl p-4'>
              <p className='text-muted text-xs mb-1'>Passport / ID info</p>
              <p className='text-ink text-sm'>{data.student.passportInfo}</p>
            </div>
          )}

          <div>
            <div className='flex justify-between items-center mb-2'>
              <p className='text-ink font-medium'>Courses</p>
              <button onClick={() => setShowAddCourse(true)} className='text-accent text-xs font-medium'>+ Add language</button>
            </div>
            <div className='grid grid-cols-2 gap-3'>
              {data.courses.map(c => (
                <div key={c._id} className='bg-bg border border-hairline rounded-xl p-4'>
                  <div className='flex justify-between items-start mb-1'>
                    <p className='text-ink text-sm font-medium'>{c.languageId?.name} · {c.levelId?.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.isActive ? 'bg-accent-soft text-accent' : 'bg-hairline text-muted'}`}>{c.isActive ? 'active' : 'unpaid'}</span>
                  </div>
                  <p className='text-muted text-xs'>price {c.price !== null ? formatMoney(c.price) : '—'} · balance {formatMoney(c.balance)}</p>
                  <p className='text-muted text-xs mb-2'>next due {c.subscriptionExpiresAt ? new Date(c.subscriptionExpiresAt).toLocaleDateString() : '—'}</p>
                  <button onClick={() => openEditLevel(c)} className='text-accent text-xs font-medium'>Correct level</button>
                </div>
              ))}
              {data.courses.length === 0 && <p className='text-muted text-sm col-span-2'>No courses yet.</p>}
            </div>
          </div>

          {editingCourse && (
            <form onSubmit={submitEditLevel} className='flex gap-2 items-end bg-bg border border-hairline rounded-xl p-3'>
              <div className='flex-1'>
                <p className='text-xs text-muted mb-1'>Correct {editingCourse.languageId?.name} level for {data.student.name}</p>
                <select value={editLevelId} onChange={e => setEditLevelId(e.target.value)} className='w-full px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm' required>
                  {levels.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                </select>
              </div>
              <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>Save</button>
              <button type='button' onClick={() => setEditingCourse(null)} className='px-3 py-2 text-muted text-sm'>Cancel</button>
            </form>
          )}

          {showAddCourse && (
            <form onSubmit={submitCourse} className='flex gap-2 items-end bg-bg border border-hairline rounded-xl p-3'>
              <select value={courseForm.languageId} onChange={e => setCourseForm({ ...courseForm, languageId: e.target.value })} className='flex-1 px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm' required>
                <option value=''>Language</option>
                {languages.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
              </select>
              <select value={courseForm.levelId} onChange={e => setCourseForm({ ...courseForm, levelId: e.target.value })} className='flex-1 px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm' required>
                <option value=''>Level</option>
                {levels.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
              </select>
              <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>Add</button>
            </form>
          )}

          <div>
            <p className='text-ink font-medium mb-2'>Payment history</p>
            <div className='flex flex-col gap-1'>
              {data.payments.map(p => (
                <div key={p._id} className='flex justify-between text-sm bg-bg border border-hairline rounded-lg px-3 py-2'>
                  <span className='text-muted'>{new Date(p.date).toLocaleDateString()} · {p.languageId?.name} · by {p.adminId?.name}</span>
                  <span className='font-mono text-ink'>{formatMoney(p.amount)}</span>
                </div>
              ))}
              {data.payments.length === 0 && <p className='text-muted text-sm'>No payments yet.</p>}
            </div>
          </div>

          <div>
            <p className='text-ink font-medium mb-2'>Exam results</p>
            <div className='flex flex-col gap-1'>
              {data.examAttempts?.map(a => (
                <div key={a._id} className='flex justify-between text-sm bg-bg border border-hairline rounded-lg px-3 py-2'>
                  <span className='text-muted'>{a.examId?.languageId?.name} · {a.examId?.levelId?.name} · attempt #{a.attemptNumber}</span>
                  <span className={a.passed ? 'text-accent font-mono' : 'text-red-500 font-mono'}>{a.score}%</span>
                </div>
              ))}
              {(!data.examAttempts || data.examAttempts.length === 0) && <p className='text-muted text-sm'>No exams taken yet.</p>}
            </div>
          </div>

          <div>
            <p className='text-ink font-medium mb-2'>Group history</p>
            <div className='flex flex-col gap-1'>
              {data.groups.map(g => (
                <div key={g._id} className='flex justify-between text-sm bg-bg border border-hairline rounded-lg px-3 py-2'>
                  <span className='text-ink'>{g.languageId?.name} · {g.levelId?.name} · teacher {g.teacherId?.name}</span>
                  <span className='text-muted'>{g.status}</span>
                </div>
              ))}
              {data.groups.length === 0 && <p className='text-muted text-sm'>Not placed in any group yet.</p>}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default StudentProfileModal
