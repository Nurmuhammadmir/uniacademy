import React, { useContext, useEffect, useState } from 'react'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Modal from '../components/Modal.jsx'
import MapPicker from '../components/MapPicker.jsx'
import StudentProfileModal from '../components/StudentProfileModal.jsx'

const Students = () => {
  const { students, createStudent, updateStudent, deleteStudent, createPayment, getStudentProfile, languages, levels, getLevels, settings } = useContext(AdminContext)
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [payingStudent, setPayingStudent] = useState(null)
  const [viewingId, setViewingId] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', password: '', address: '', geo: { lat: null, lng: null }, languageId: '', levelId: '', passportInfo: '' })
  const [editForm, setEditForm] = useState({ name: '', phone: '', password: '', address: '', geo: { lat: null, lng: null }, passportInfo: '' })
  const [paymentForm, setPaymentForm] = useState({ languageId: '', amount: '' })
  const [submittingPayment, setSubmittingPayment] = useState(false)

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
    // guards against a double payment being recorded from a double-click/double-tap on "Confirm
    // payment" - without this, each extra click created a second real Payment document, silently
    // inflating that student's balance and the branch's revenue totals by the duplicated amount
    if (submittingPayment) return
    setSubmittingPayment(true)
    const ok = await createPayment(payingStudent._id, paymentForm.languageId, Number(paymentForm.amount))
    setSubmittingPayment(false)
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
        <p className='font-display text-2xl text-ink'>{t('studentsTitle')}</p>
        <button onClick={() => setShowCreate(true)} className='px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium'>{t('addStudent')}</button>
      </div>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={t('searchByNameOrPhone')}
        className='w-full max-w-sm px-4 py-2.5 rounded-xl bg-bg-elevated border border-hairline text-sm mb-4'
      />

      <div className='bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-5 py-3 font-medium'>{t('nameCol')}</th>
              <th className='px-5 py-3 font-medium'>{t('phoneCol')}</th>
              <th className='px-5 py-3 font-medium'>{t('coursesCol')}</th>
              <th className='px-5 py-3 font-medium'>{t('statusCol')}</th>
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
                    {anyActive(s) ? t('active') : t('unpaid')}
                  </span>
                </td>
                <td className='px-5 py-3 text-right whitespace-nowrap'>
                  <button onClick={() => openEdit(s)} className='text-accent text-xs font-medium mr-3'>{t('edit')}</button>
                  <button onClick={() => openPay(s)} className='text-accent text-xs font-medium mr-3'>{t('recordPayment')}</button>
                  <button onClick={() => deleteStudent(s._id)} className='text-muted text-xs font-medium'>{t('remove')}</button>
                </td>
              </tr>
            ))}
            {filteredStudents.length === 0 && (
              <tr><td colSpan={5} className='px-5 py-8 text-center text-muted'>{students.length === 0 ? t('noStudentsYet') : t('noStudentsMatchSearch')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <Modal title={t('addStudentModalTitle')} onClose={() => setShowCreate(false)}>
          <form onSubmit={submitCreate} className='flex flex-col gap-3'>
            <input placeholder={t('fullName')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input placeholder={t('phoneNumber')} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input placeholder={t('password')} type='password' value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input
              placeholder={settings?.passportRequired === false ? t('passportIdInfoOptional') : t('passportIdInfo')}
              value={form.passportInfo}
              onChange={e => setForm({ ...form, passportInfo: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline'
              required={settings?.passportRequired !== false}
            />
            <p className='text-xs text-muted -mb-1'>{t('firstCourseHint')}</p>
            <select value={form.languageId} onChange={e => setForm({ ...form, languageId: e.target.value, levelId: '' })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              <option value=''>{t('courseLanguage')}</option>
              {languages.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
            <select value={form.levelId} onChange={e => setForm({ ...form, levelId: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              <option value=''>{t('courseLevel')}</option>
              {levels.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
            <MapPicker address={form.address} lat={form.geo.lat} lng={form.geo.lng}
              onChange={({ lat, lng, address }) => setForm({ ...form, address, geo: { lat, lng } })} />
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>{t('createStudentBtn')}</button>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title={t('editStudentModalTitle', { name: editing.name })} onClose={() => setEditing(null)}>
          <form onSubmit={submitEdit} className='flex flex-col gap-3'>
            <input placeholder={t('fullName')} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input placeholder={t('phoneNumber')} value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input placeholder={t('newPasswordOptional')} type='password' value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' />
            <input
              placeholder={settings?.passportRequired === false ? t('passportIdInfoOptional') : t('passportIdInfo')}
              value={editForm.passportInfo}
              onChange={e => setEditForm({ ...editForm, passportInfo: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline'
              required={settings?.passportRequired !== false}
            />
            <MapPicker address={editForm.address} lat={editForm.geo?.lat} lng={editForm.geo?.lng}
              onChange={({ lat, lng, address }) => setEditForm({ ...editForm, address, geo: { lat, lng } })} />
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>{t('saveChanges')}</button>
          </form>
        </Modal>
      )}

      {payingStudent && (
        <Modal title={t('recordPaymentModalTitle', { name: payingStudent.name })} onClose={() => setPayingStudent(null)}>
          <form onSubmit={submitPayment} className='flex flex-col gap-3'>
            <select value={paymentForm.languageId} onChange={e => setPaymentForm({ ...paymentForm, languageId: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              <option value=''>{t('whichCourseIsThisFor')}</option>
              {payingStudent.courses.map(c => <option key={c._id} value={c.languageId._id}>{c.languageId.name} · {c.levelId.name}</option>)}
            </select>
            <input placeholder={t('amountLabel')} type='number' value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <p className='text-xs text-muted'>{t('paymentCreditNote')}</p>
            <button type='submit' disabled={submittingPayment} className='py-3 rounded-xl bg-accent text-white font-medium disabled:opacity-50'>
              {submittingPayment ? t('recordingPayment') : t('confirmPaymentBtn')}
            </button>
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
