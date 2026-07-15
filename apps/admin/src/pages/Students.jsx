import React, { useContext, useEffect, useState } from 'react'
import { AdminContext } from '../context/AdminContext.jsx'
import Modal from '../components/Modal.jsx'
import MapPicker from '../components/MapPicker.jsx'
import StudentProfileModal from '../components/StudentProfileModal.jsx'

const Students = () => {
  const { students, createStudent, updateStudent, deleteStudent, createPayment, getStudentProfile, languages, levels, getLevels, settings } = useContext(AdminContext)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [payingStudent, setPayingStudent] = useState(null)
  const [viewingId, setViewingId] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', password: '', address: '', geo: { lat: null, lng: null }, languageId: '', levelId: '', passportInfo: '' })
  const [editForm, setEditForm] = useState({ name: '', phone: '', password: '', address: '', geo: { lat: null, lng: null }, passportInfo: '' })
  const [paymentForm, setPaymentForm] = useState({ languageId: '', amount: '' })

  useEffect(() => { if (form.languageId) getLevels(form.languageId) }, [form.languageId])

  const submitCreate = async (e) => {
    e.preventDefault()
    const ok = await createStudent(form)
    if (ok) { setShowCreate(false); setForm({ name: '', phone: '', password: '', address: '', geo: { lat: null, lng: null }, languageId: '', levelId: '', passportInfo: '' }) }
  }

  const openEdit = (student) => {
    setEditing(student)
    setEditForm({ name: student.name, phone: student.phone, password: '', address: student.address || '', geo: student.geo || { lat: null, lng: null }, passportInfo: student.passportInfo || '' })
  }

  const submitEdit = async (e) => {
    e.preventDefault()
    const ok = await updateStudent(editing._id, editForm)
    if (ok) setEditing(null)
  }

  const openPay = (student) => {
    setPayingStudent(student)
    setPaymentForm({ languageId: student.courses[0]?.languageId?._id || '', amount: '' })
  }

  const submitPayment = async (e) => {
    e.preventDefault()
    const ok = await createPayment(payingStudent._id, paymentForm.languageId, Number(paymentForm.amount))
    if (ok) { setPayingStudent(null); setPaymentForm({ languageId: '', amount: '' }) }
  }

  const courseSummary = (student) => student.courses.length === 0 ? '—' : student.courses.map(c => `${c.languageId?.name} · ${c.levelId?.name}`).join(', ')
  const anyActive = (student) => student.courses.some(c => c.isActive)

  const filteredStudents = students.filter(s => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return s.name.toLowerCase().includes(q) || s.phone.toLowerCase().includes(q)
  })

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <p className='font-display text-2xl text-ink'>Students</p>
        <button onClick={() => setShowCreate(true)} className='px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium'>+ Add student</button>
      </div>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder='Search by name or phone…'
        className='w-full max-w-sm px-4 py-2.5 rounded-xl bg-bg-elevated border border-hairline text-sm mb-4'
      />

      <div className='bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-5 py-3 font-medium'>Name</th>
              <th className='px-5 py-3 font-medium'>Phone</th>
              <th className='px-5 py-3 font-medium'>Courses</th>
              <th className='px-5 py-3 font-medium'>Status</th>
              <th className='px-5 py-3'></th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(s => (
              <tr key={s._id} className='border-b border-hairline last:border-0'>
                <td className='px-5 py-3 text-ink'>
                  <button onClick={() => setViewingId(s._id)} className='hover:underline text-left'>{s.name}</button>
                </td>
                <td className='px-5 py-3 text-muted font-mono'>{s.phone}</td>
                <td className='px-5 py-3 text-muted'>{courseSummary(s)}</td>
                <td className='px-5 py-3'>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${anyActive(s) ? 'bg-accent-soft text-accent' : 'bg-hairline text-muted'}`}>
                    {anyActive(s) ? 'active' : 'unpaid'}
                  </span>
                </td>
                <td className='px-5 py-3 text-right whitespace-nowrap'>
                  <button onClick={() => openEdit(s)} className='text-accent text-xs font-medium mr-3'>Edit</button>
                  <button onClick={() => openPay(s)} className='text-accent text-xs font-medium mr-3'>Record payment</button>
                  <button onClick={() => deleteStudent(s._id)} className='text-muted text-xs font-medium'>Remove</button>
                </td>
              </tr>
            ))}
            {filteredStudents.length === 0 && (
              <tr><td colSpan={5} className='px-5 py-8 text-center text-muted'>{students.length === 0 ? 'No students in this branch yet.' : 'No students match that search.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <Modal title='Add student' onClose={() => setShowCreate(false)}>
          <form onSubmit={submitCreate} className='flex flex-col gap-3'>
            <input placeholder='Full name' value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input placeholder='Phone number' value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input placeholder='Password' type='password' value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input
              placeholder={settings?.passportRequired === false ? 'Passport / ID info (optional)' : 'Passport / ID info'}
              value={form.passportInfo}
              onChange={e => setForm({ ...form, passportInfo: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline'
              required={settings?.passportRequired !== false}
            />
            <p className='text-xs text-muted -mb-1'>First course (more languages can be added later from their profile)</p>
            <select value={form.languageId} onChange={e => setForm({ ...form, languageId: e.target.value, levelId: '' })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              <option value=''>Course language</option>
              {languages.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
            <select value={form.levelId} onChange={e => setForm({ ...form, levelId: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              <option value=''>Course level</option>
              {levels.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
            <MapPicker address={form.address} lat={form.geo.lat} lng={form.geo.lng}
              onChange={({ lat, lng, address }) => setForm({ ...form, address, geo: { lat, lng } })} />
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>Create student</button>
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
            <input placeholder='New password (leave blank to keep current)' type='password' value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' />
            <input
              placeholder={settings?.passportRequired === false ? 'Passport / ID info (optional)' : 'Passport / ID info'}
              value={editForm.passportInfo}
              onChange={e => setEditForm({ ...editForm, passportInfo: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline'
              required={settings?.passportRequired !== false}
            />
            <MapPicker address={editForm.address} lat={editForm.geo?.lat} lng={editForm.geo?.lng}
              onChange={({ lat, lng, address }) => setEditForm({ ...editForm, address, geo: { lat, lng } })} />
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>Save changes</button>
          </form>
        </Modal>
      )}

      {payingStudent && (
        <Modal title={`Record payment · ${payingStudent.name}`} onClose={() => setPayingStudent(null)}>
          <form onSubmit={submitPayment} className='flex flex-col gap-3'>
            <select value={paymentForm.languageId} onChange={e => setPaymentForm({ ...paymentForm, languageId: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              <option value=''>Which course is this for?</option>
              {payingStudent.courses.map(c => <option key={c._id} value={c.languageId._id}>{c.languageId.name} · {c.levelId.name}</option>)}
            </select>
            <input placeholder='Amount' type='number' value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <p className='text-xs text-muted'>Credited to that course's balance. The course only becomes active once its balance covers a full month at its price - you'll be told exactly how much more is needed if it isn't enough yet.</p>
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>Confirm payment</button>
          </form>
        </Modal>
      )}

      {viewingId && (
        <StudentProfileModal studentId={viewingId} getStudentProfile={getStudentProfile} onClose={() => setViewingId(null)} />
      )}
    </div>
  )
}

export default Students
