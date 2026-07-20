import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Modal from '../components/Modal.jsx'
import MapPicker from '../components/MapPicker.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import { formatMoney } from '../lib/format.js'
import { currentMonthISO } from '../lib/date.js'

const Students = () => {
  const { students, createStudent, updateStudent, deleteStudent, unarchiveStudent, createPayment, getPaymentPreview, applyDiscountToStudents, languages, levels, getLevels, settings } = useContext(AdminContext)
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState('active')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [payingStudent, setPayingStudent] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', password: '', address: '', geo: { lat: null, lng: null }, languageId: '', passportInfo: '', parentPhone: '', parentPassword: '' })
  const [editForm, setEditForm] = useState({ name: '', phone: '', password: '', address: '', geo: { lat: null, lng: null }, passportInfo: '' })
  const [paymentForm, setPaymentForm] = useState({ languageId: '', levelId: '', amount: '', method: '' })
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [paymentPreview, setPaymentPreview] = useState(null)
  const [discountMode, setDiscountMode] = useState(false)
  const [selectedForDiscount, setSelectedForDiscount] = useState([])
  const [discountForm, setDiscountForm] = useState({ languageId: '', month: currentMonthISO(), type: 'percent', value: '' })
  const [applyingDiscount, setApplyingDiscount] = useState(false)

  const paymentCourse = payingStudent?.courses.find(c => c.languageId?._id === paymentForm.languageId)

  // levels are always fetched (and always pickable) here, not just when the course has no level
  // yet - an admin can pay for a different level than the course currently has, switching it
  useEffect(() => { if (paymentForm.languageId) getLevels(paymentForm.languageId) }, [paymentForm.languageId])

  // shows "paying now covers you through <date>, for <cost>" before the admin submits - re-fetched
  // any time the student/course/level selection changes, cleared while a lookup is in flight so a
  // stale number never lingers on screen after switching levels
  useEffect(() => {
    setPaymentPreview(null)
    if (!payingStudent || !paymentForm.languageId || !paymentForm.levelId) return
    let cancelled = false
    getPaymentPreview(payingStudent._id, paymentForm.languageId, paymentForm.levelId).then(data => {
      if (!cancelled && data) setPaymentPreview(data)
    })
    return () => { cancelled = true }
  }, [payingStudent, paymentForm.languageId, paymentForm.levelId])

  const submitCreate = async (e) => {
    e.preventDefault()
    const ok = await createStudent(form)
    if (ok) { setShowCreate(false); setForm({ name: '', phone: '', password: '', address: '', geo: { lat: null, lng: null }, languageId: '', passportInfo: '', parentPhone: '', parentPassword: '' }) }
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
    const firstCourse = student.courses[0]
    setPaymentForm({ languageId: firstCourse?.languageId?._id || '', levelId: firstCourse?.levelId?._id || '', amount: '', method: '' })
  }

  const onPaymentLanguageChange = (languageId) => {
    const course = payingStudent.courses.find(c => c.languageId?._id === languageId)
    setPaymentForm({ ...paymentForm, languageId, levelId: course?.levelId?._id || '' })
  }

  const submitPayment = async (e) => {
    e.preventDefault()
    // guards against a double payment being recorded from a double-click/double-tap on "Confirm
    // payment" - without this, each extra click created a second real Payment document, silently
    // inflating that student's balance and the branch's revenue totals by the duplicated amount
    if (submittingPayment) return
    setSubmittingPayment(true)
    const ok = await createPayment(payingStudent._id, paymentForm.languageId, paymentForm.levelId, Number(paymentForm.amount), paymentForm.method)
    setSubmittingPayment(false)
    if (ok) { setPayingStudent(null); setPaymentForm({ languageId: '', levelId: '', amount: '', method: '' }) }
  }

  const courseSummary = (student) => student.courses.length === 0 ? '—' : student.courses.map(c => `${c.languageId?.name} · ${c.levelId?.name}`).join(', ')
  const anyActive = (student) => student.courses.some(c => c.isActive)
  const totalBalance = (student) => student.courses.reduce((sum, c) => sum + (c.balance || 0), 0)

  // one row per student, every detail in its own column - reuses the same CSV-building pattern
  // already used for a group's roster export (GroupDetails.jsx), just with more columns. Exports
  // exactly whatever's currently visible (respects the active/archived tab + search filter).
  const exportStudentsCSV = () => {
    const header = ['#', 'Name', 'Phone', 'Status', 'Courses', 'Total balance', 'Passport info', 'Registered on']
    const rows = filteredStudents.map((s, i) => [
      i + 1, s.name, s.phone, anyActive(s) ? t('active') : t('unpaid'),
      courseSummary(s), totalBalance(s), s.passportInfo || '', new Date(s.createdAt).toLocaleDateString(),
    ])
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `students-${statusTab}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleDiscountMode = () => {
    setDiscountMode(m => !m)
    setSelectedForDiscount([])
  }

  const toggleStudentForDiscount = (studentId) => {
    setSelectedForDiscount(ids => ids.includes(studentId) ? ids.filter(id => id !== studentId) : [...ids, studentId])
  }

  const submitDiscount = async (e) => {
    e.preventDefault()
    if (selectedForDiscount.length === 0 || !discountForm.languageId || !discountForm.value) return
    setApplyingDiscount(true)
    await applyDiscountToStudents(selectedForDiscount, {
      languageId: discountForm.languageId, month: discountForm.month, type: discountForm.type, value: Number(discountForm.value),
    })
    setApplyingDiscount(false)
    setDiscountMode(false)
    setSelectedForDiscount([])
    setDiscountForm({ languageId: '', month: currentMonthISO(), type: 'percent', value: '' })
  }

  const filteredStudents = students.filter(s => {
    if ((s.status || 'active') !== statusTab) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return s.name.toLowerCase().includes(q) || s.phone.toLowerCase().includes(q)
  })

  return (
    <div>
      <div className='sticky top-0 z-20 bg-bg pb-4 mb-2 border-b border-hairline'>
        <div className='flex justify-between items-center mb-6'>
          <p className='font-display text-2xl text-ink'>{t('studentsTitle')}</p>
          <div className='flex gap-2'>
            <button onClick={toggleDiscountMode} className={`px-4 py-2 rounded-xl text-sm font-medium ${discountMode ? 'bg-accent text-white' : 'bg-bg-elevated border border-hairline text-muted'}`}>🏷️ {t('discountBtn')}</button>
            <button onClick={exportStudentsCSV} className='px-4 py-2 rounded-xl bg-bg-elevated border border-hairline text-muted text-sm font-medium'>⬇️ {t('exportBtn')}</button>
            <button onClick={() => setShowCreate(true)} className='px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium'>{t('addStudent')}</button>
          </div>
        </div>

        <div className='flex gap-2 mb-3'>
          <button onClick={() => setStatusTab('active')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${statusTab === 'active' ? 'bg-accent text-white' : 'bg-bg-elevated border border-hairline text-muted'}`}>{t('activeStatusTab')}</button>
          <button onClick={() => setStatusTab('archived')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${statusTab === 'archived' ? 'bg-accent text-white' : 'bg-bg-elevated border border-hairline text-muted'}`}>{t('archivedStatusTab')}</button>
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('searchByNameOrPhone')}
          className='w-full max-w-sm px-4 py-2.5 rounded-xl bg-bg-elevated border border-hairline text-sm'
        />

        {discountMode && (
          <form onSubmit={submitDiscount} className='flex flex-wrap gap-3 items-end mt-4 bg-bg-elevated border border-hairline rounded-xl p-4'>
            <p className='text-sm text-ink font-medium w-full'>{t('discountSelectedCount', { count: selectedForDiscount.length })}</p>
            <select value={discountForm.languageId} onChange={e => setDiscountForm({ ...discountForm, languageId: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required>
              <option value=''>{t('languageLabel')}</option>
              {languages.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
            <input type='month' value={discountForm.month} onChange={e => setDiscountForm({ ...discountForm, month: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
            <div className='flex gap-1'>
              <button type='button' onClick={() => setDiscountForm({ ...discountForm, type: 'percent' })} className={`px-3 py-2 rounded-lg text-sm font-medium ${discountForm.type === 'percent' ? 'bg-accent text-white' : 'bg-bg border border-hairline text-muted'}`}>%</button>
              <button type='button' onClick={() => setDiscountForm({ ...discountForm, type: 'amount' })} className={`px-3 py-2 rounded-lg text-sm font-medium ${discountForm.type === 'amount' ? 'bg-accent text-white' : 'bg-bg border border-hairline text-muted'}`}>{t('amountLabel')}</button>
            </div>
            <input type='number' value={discountForm.value} onChange={e => setDiscountForm({ ...discountForm, value: e.target.value })}
              placeholder={discountForm.type === 'percent' ? t('discountPercentPlaceholder') : t('discountAmountPlaceholder')}
              className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm w-32' required />
            <button type='submit' disabled={applyingDiscount || selectedForDiscount.length === 0} className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50'>
              {applyingDiscount ? t('applyingDiscountBtn') : t('applyDiscountBtn')}
            </button>
            <p className='text-muted text-xs w-full'>{t('discountForwardOnlyNote')}</p>
          </form>
        )}
      </div>

      <div className='bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              {discountMode && <th className='px-5 py-3'></th>}
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
                {discountMode && (
                  <td className='px-5 py-4'>
                    <input type='checkbox' checked={selectedForDiscount.includes(s._id)} onChange={() => toggleStudentForDiscount(s._id)} />
                  </td>
                )}
                <td className='px-5 py-4 text-ink'>
                  <button onClick={() => navigate('/students/' + s._id)} className='hover:underline text-left'>{s.name}</button>
                </td>
                <td className='px-5 py-4 text-muted font-mono'>{s.phone}</td>
                <td className='px-5 py-4 text-muted'>{courseSummary(s)}</td>
                <td className='px-5 py-4'>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${anyActive(s) ? 'bg-accent-soft text-accent' : 'bg-hairline text-muted'}`}>
                    {anyActive(s) ? t('active') : t('unpaid')}
                  </span>
                </td>
                <td className='px-5 py-4 text-right whitespace-nowrap'>
                  {statusTab === 'active' ? (
                    <>
                      <button onClick={() => openEdit(s)} className='text-accent text-xs font-medium mr-3'>{t('edit')}</button>
                      <button onClick={() => openPay(s)} className='text-accent text-xs font-medium mr-3'>{t('recordPayment')}</button>
                      <button onClick={() => deleteStudent(s._id)} className='text-muted text-xs font-medium'>{t('archiveBtn')}</button>
                    </>
                  ) : (
                    <button onClick={() => unarchiveStudent(s._id)} className='text-accent text-xs font-medium'>{t('reactivateBtn')}</button>
                  )}
                </td>
              </tr>
            ))}
            {filteredStudents.length === 0 && (
              <tr><td colSpan={discountMode ? 6 : 5} className='px-5 py-8 text-center text-muted'>{students.length === 0 ? t('noStudentsYet') : t('noStudentsMatchSearch')}</td></tr>
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
            <PasswordInput placeholder={t('password')} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input
              placeholder={settings?.passportRequired === false ? t('passportIdInfoOptional') : t('passportIdInfo')}
              value={form.passportInfo}
              onChange={e => setForm({ ...form, passportInfo: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline'
              required={settings?.passportRequired !== false}
            />
            <p className='text-xs text-muted -mb-1'>{t('firstCourseHint')}</p>
            <select value={form.languageId} onChange={e => setForm({ ...form, languageId: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              <option value=''>{t('courseLanguage')}</option>
              {languages.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
            <MapPicker address={form.address} lat={form.geo.lat} lng={form.geo.lng}
              onChange={({ lat, lng, address }) => setForm({ ...form, address, geo: { lat, lng } })} />
            <input placeholder={t('parentPhoneLabel')} value={form.parentPhone} onChange={e => setForm({ ...form, parentPhone: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' />
            {form.parentPhone && (
              <PasswordInput placeholder={t('parentPasswordLabel')} value={form.parentPassword} onChange={e => setForm({ ...form, parentPassword: e.target.value })}
                className='px-4 py-3 rounded-xl bg-bg border border-hairline' />
            )}
            {form.parentPhone && <p className='text-xs text-muted -mt-1'>{t('parentInfoOptionalHint')}</p>}
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
            <PasswordInput placeholder={t('newPasswordOptional')} value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })}
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
            <select value={paymentForm.languageId} onChange={e => onPaymentLanguageChange(e.target.value)} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              <option value=''>{t('whichCourseIsThisFor')}</option>
              {payingStudent.courses.map(c => <option key={c._id} value={c.languageId?._id}>{c.languageId?.name}{c.levelId?.name ? ` · ${c.levelId.name}` : ''}</option>)}
            </select>
            {paymentForm.languageId && (
              <select value={paymentForm.levelId} onChange={e => setPaymentForm({ ...paymentForm, levelId: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
                <option value=''>{t('whichLevelIsThisFor')}</option>
                {levels.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
              </select>
            )}
            {paymentCourse?.levelId && paymentForm.levelId && String(paymentCourse.levelId._id) !== String(paymentForm.levelId) && (
              <p className='text-xs text-muted -mt-1'>{t('levelSwitchHint', { from: paymentCourse.levelId.name })}</p>
            )}
            {paymentPreview?.price != null && (
              <div className='bg-accent-soft rounded-xl px-4 py-3 text-sm text-ink flex flex-col gap-1'>
                <div className='flex justify-between'>
                  <span className='text-muted'>{t('fullPriceLabel')}</span>
                  <span className='font-mono'>{formatMoney(paymentPreview.price)}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted'>{t('periodLabel')}</span>
                  <span className='font-mono'>
                    {new Date(paymentPreview.windowStart).toLocaleDateString()}–{new Date(paymentPreview.windowEnd).toLocaleDateString()}
                    {' '}{t('daysOfLabel', { days: paymentPreview.daysRemaining, total: paymentPreview.daysInMonth })}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted'>{t('proratedCostLabel')}</span>
                  <span className='font-mono'>{formatMoney(paymentPreview.cost)}</span>
                </div>
                {paymentPreview.balance > 0 && (
                  <div className='flex justify-between'>
                    <span className='text-muted'>{t('existingBalanceLabel')}</span>
                    <span className='font-mono'>{formatMoney(paymentPreview.balance)}</span>
                  </div>
                )}
                <div className='flex justify-between font-medium'>
                  <span>{paymentPreview.amountStillNeeded > 0 ? t('amountDueLabel') : t('fullyCoveredLabel')}</span>
                  <span className='font-mono'>{formatMoney(paymentPreview.amountStillNeeded)}</span>
                </div>
                <button type='button' onClick={() => setPaymentForm({ ...paymentForm, amount: String(paymentPreview.amountStillNeeded || paymentPreview.cost) })}
                  className='mt-1 self-start px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium'>
                  {t('useSuggestedAmountBtn')}
                </button>
              </div>
            )}
            <input placeholder={t('amountLabel')} type='number' value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <select value={paymentForm.method} onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              <option value=''>{t('selectPaymentMethod')}</option>
              <option value='cash'>{t('paymentMethodCash')}</option>
              <option value='bank_transfer'>{t('paymentMethodBankTransfer')}</option>
              <option value='card'>{t('paymentMethodCard')}</option>
              <option value='click'>{t('paymentMethodClick')}</option>
            </select>
            <p className='text-xs text-muted'>{t('paymentCreditNote')}</p>
            <button type='submit' disabled={submittingPayment} className='py-3 rounded-xl bg-accent text-white font-medium disabled:opacity-50'>
              {submittingPayment ? t('recordingPayment') : t('confirmPaymentBtn')}
            </button>
          </form>
        </Modal>
      )}

    </div>
  )
}

export default Students
