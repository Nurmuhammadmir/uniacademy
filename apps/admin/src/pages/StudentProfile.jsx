import React, { useContext, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { formatMoney, paymentMethodLabelKey, remainingAmount } from '../lib/format.js'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import { confirm } from '../lib/confirm.js'

// full profile page - registration date, every course with price/balance, full payment history
// (with inline refund), exam attempt history, every group ever been in (with add/remove tools),
// and a free-text notes section. Deliberately does NOT show address/geo - only the director is
// allowed to see a student's home location.
const StudentProfile = () => {
  const { id: studentId } = useParams()
  const navigate = useNavigate()
  const {
    getStudentProfile, addStudentCourse, updateStudentCourse, languages, levels, getLevels,
    refundPayment, updatePayment, updateStudent, groups, addStudentToGroup, removeStudentFromGroup, linkParent,
    getStudentStatement,
  } = useContext(AdminContext)
  const { t } = useLanguage()
  const [data, setData] = useState(false)
  const [statement, setStatement] = useState(null)
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [courseForm, setCourseForm] = useState({ languageId: '' })
  const [editingCourse, setEditingCourse] = useState(null)
  const [editLevelId, setEditLevelId] = useState('')
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [addGroupId, setAddGroupId] = useState('')
  const [editingPayment, setEditingPayment] = useState(null)
  const [editPaymentForm, setEditPaymentForm] = useState({ amount: '', method: '' })
  const [refundingPayment, setRefundingPayment] = useState(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [parentForm, setParentForm] = useState({ parentPhone: '', parentPassword: '' })
  const [savingParent, setSavingParent] = useState(false)

  const reload = () => getStudentProfile(studentId).then(d => { if (d) { setData(d); setNotes(d.student.notes || '') } })
  useEffect(() => { reload() }, [studentId])
  // "owes X" is computed live from real payment history (same math the accounting Ledger uses),
  // not stored anywhere - so it's always accurate the moment a payment/refund/enrollment happens
  useEffect(() => { getStudentStatement(studentId).then(s => { if (s) setStatement(s) }) }, [studentId])
  useEffect(() => { if (editingCourse) getLevels(editingCourse.languageId._id) }, [editingCourse])
  // keeps the "correct level" <select> pointed at a real option at all times - without this, a
  // course with no level yet (editLevelId defaults to '') would submit that empty string straight
  // through as the levelId the instant the admin hits Save without first touching the dropdown,
  // since a controlled <select> with a value that matches no <option> doesn't self-correct its state
  useEffect(() => {
    if (!editingCourse || levels.length === 0) return
    if (!levels.some(l => l._id === editLevelId)) setEditLevelId(levels[0]._id)
  }, [editingCourse, levels])

  const submitCourse = async (e) => {
    e.preventDefault()
    const alreadyEnrolled = data.courses.some(c => String(c.languageId?._id) === String(courseForm.languageId))
    if (alreadyEnrolled && !(await confirm(t('alreadyEnrolledConfirm')))) return
    const ok = await addStudentCourse(studentId, courseForm.languageId)
    if (ok) { setShowAddCourse(false); setCourseForm({ languageId: '' }); reload() }
  }

  const openEditLevel = (course) => {
    setEditingCourse(course)
    setEditLevelId(course.levelId?._id || '')
  }

  const submitEditLevel = async (e) => {
    e.preventDefault()
    const ok = await updateStudentCourse(studentId, editingCourse._id, editLevelId)
    if (ok) { setEditingCourse(null); reload() }
  }

  const saveNotes = async () => {
    setSavingNotes(true)
    await updateStudent(studentId, { notes })
    setSavingNotes(false)
  }

  const submitParent = async (e) => {
    e.preventDefault()
    setSavingParent(true)
    const ok = await linkParent(studentId, parentForm.parentPhone, parentForm.parentPassword)
    setSavingParent(false)
    if (ok) setParentForm({ parentPhone: '', parentPassword: '' })
  }

  const openRefund = (payment) => {
    setRefundingPayment(payment)
    setRefundAmount(String(remainingAmount(payment)))
  }

  const submitRefund = async (e) => {
    e.preventDefault()
    const ok = await refundPayment(refundingPayment._id, Number(refundAmount))
    if (ok) { setRefundingPayment(null); reload() }
  }

  const openEditPayment = (payment) => {
    setEditingPayment(payment)
    setEditPaymentForm({ amount: payment.amount, method: payment.method || '' })
  }

  const submitEditPayment = async (e) => {
    e.preventDefault()
    const ok = await updatePayment(editingPayment._id, { amount: Number(editPaymentForm.amount), method: editPaymentForm.method })
    if (ok) { setEditingPayment(null); reload() }
  }

  const submitAddToGroup = async (e) => {
    e.preventDefault()
    const ok = await addStudentToGroup(addGroupId, studentId)
    if (ok) { setAddGroupId(''); reload() }
  }

  const handleRemoveFromGroup = async (groupId) => {
    await removeStudentFromGroup(groupId, studentId)
    reload()
  }

  if (!data) return <p className='text-muted'>{t('loading')}</p>

  const totalBalance = data.courses.reduce((sum, c) => sum + (c.balance || 0), 0)
  const currentGroupIds = new Set(data.groups.filter(g => g.status === 'active').map(g => String(g._id)))
  const availableGroups = groups.filter(g => g.status === 'active' && !currentGroupIds.has(String(g._id)))

  return (
    <div>
      <button onClick={() => navigate('/')} className='text-muted text-sm mb-4'>‹ {t('back')}</button>

      <div className='flex flex-col gap-5'>
        <div className='flex justify-between items-start'>
          <div>
            <p className='font-display text-2xl text-ink'>{data.student.name}</p>
            <p className='text-muted text-sm font-mono'>{data.student.phone}</p>
            <p className='text-muted text-xs mt-1'>{t('registeredOn', { date: new Date(data.student.createdAt).toLocaleDateString() })}</p>
          </div>
          <div className='bg-bg-elevated border border-hairline rounded-xl px-4 py-3 text-right'>
            <p className='text-muted text-xs'>{t('totalBalance')}</p>
            <p className='font-mono text-xl text-ink'>{formatMoney(totalBalance)}</p>
          </div>
        </div>

        {data.student.passportInfo && (
          <div className='bg-bg-elevated border border-hairline rounded-xl p-4'>
            <p className='text-muted text-xs mb-1'>{t('passportIdInfo')}</p>
            <p className='text-ink text-sm'>{data.student.passportInfo}</p>
          </div>
        )}

        <div>
          <div className='flex justify-between items-center mb-2'>
            <p className='text-ink font-medium'>{t('coursesLabel')}</p>
            <button onClick={() => setShowAddCourse(true)} className='text-accent text-xs font-medium'>{t('addLanguage')}</button>
          </div>
          <div className='grid grid-cols-2 gap-3'>
            {data.courses.map(c => {
              const courseStatement = statement?.courses.find(cs => String(cs.languageId) === String(c.languageId?._id))
              return (
                <div key={c._id} className='bg-bg-elevated border border-hairline rounded-xl p-4'>
                  <div className='flex justify-between items-start mb-1'>
                    <p className='text-ink text-sm font-medium'>{c.languageId?.name} · {c.levelId?.name}</p>
                    <span className={`text-xs px-2.5 py-1 rounded-full ${c.isActive ? 'bg-accent-soft text-accent' : 'bg-hairline text-muted'}`}>{c.isActive ? t('active') : t('unpaid')}</span>
                  </div>
                  <p className='text-muted text-xs'>{t('priceBalanceLine', { price: c.price !== null ? formatMoney(c.price) : '—', balance: formatMoney(c.balance) })}</p>
                  <p className='text-muted text-xs mb-2'>{t('nextDue', { date: c.subscriptionExpiresAt ? new Date(c.subscriptionExpiresAt).toLocaleDateString() : '—' })}</p>
                  {courseStatement?.owed > 0 && (
                    <p className='text-red-600 text-xs font-medium mb-2'>{t('statusOwes', { amount: formatMoney(courseStatement.owed) })}</p>
                  )}
                  <button onClick={() => openEditLevel(c)} className='text-accent text-xs font-medium'>{t('correctLevel')}</button>
                </div>
              )
            })}
            {data.courses.length === 0 && <p className='text-muted text-sm col-span-2'>{t('noCoursesYetPlain')}</p>}
          </div>
        </div>

        {editingCourse && (
          <form onSubmit={submitEditLevel} className='flex gap-2 items-end bg-bg-elevated border border-hairline rounded-xl p-3'>
            <div className='flex-1'>
              <p className='text-xs text-muted mb-1'>{t('correctLevelFor', { language: editingCourse.languageId?.name, name: data.student.name })}</p>
              <select value={editLevelId} onChange={e => setEditLevelId(e.target.value)} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required>
                {levels.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
              </select>
            </div>
            <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('save')}</button>
            <button type='button' onClick={() => setEditingCourse(null)} className='px-3 py-2 text-muted text-sm'>{t('cancel')}</button>
          </form>
        )}

        {showAddCourse && (
          <form onSubmit={submitCourse} className='flex gap-2 items-end bg-bg-elevated border border-hairline rounded-xl p-3'>
            <select value={courseForm.languageId} onChange={e => setCourseForm({ ...courseForm, languageId: e.target.value })} className='flex-1 px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required>
              <option value=''>{t('languageLabel')}</option>
              {languages.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
            <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('add')}</button>
          </form>
        )}

        <div>
          <p className='text-ink font-medium mb-2'>{t('paymentHistory')}</p>
          <div className='flex flex-col gap-3'>
            {data.payments.map(p => (
              <div key={p._id} className={`flex justify-between items-center text-sm bg-bg-elevated border border-hairline rounded-lg px-3 py-2 ${p.refunded ? 'opacity-50' : ''}`}>
                <span className='text-muted'>{t('paymentLine', { date: new Date(p.date).toLocaleDateString(), language: p.languageId?.name, admin: p.adminId?.name })}</span>
                <span className='flex items-center gap-2'>
                  <span className='text-xs font-medium px-2 py-1 rounded-full bg-hairline text-muted'>{t(paymentMethodLabelKey(p.method))}</span>
                  <span className='font-mono text-accent'>+{formatMoney(p.amount)}</span>
                  {p.refundedAmount > 0 && (
                    <span className='text-xs text-muted'>({t('refundedAmountHint', { amount: formatMoney(p.refundedAmount) })})</span>
                  )}
                  {p.refunded ? (
                    <span className='text-xs font-medium px-2 py-1 rounded-full bg-hairline text-muted'>{t('refundedBadge')}</span>
                  ) : (
                    <>
                      {!p.refundedAmount && <button onClick={() => openEditPayment(p)} className='text-accent text-xs font-medium'>{t('editPaymentBtn')}</button>}
                      <button onClick={() => openRefund(p)} className='text-muted text-xs font-medium'>{t('refundBtn')}</button>
                    </>
                  )}
                </span>
              </div>
            ))}
            {data.payments.length === 0 && <p className='text-muted text-sm'>{t('noPaymentsYetPlain')}</p>}
          </div>
          {editingPayment && (
            <form onSubmit={submitEditPayment} className='flex gap-2 items-end bg-bg-elevated border border-hairline rounded-xl p-3 mt-2'>
              <input placeholder={t('amountLabel')} type='number' value={editPaymentForm.amount} onChange={e => setEditPaymentForm({ ...editPaymentForm, amount: e.target.value })}
                className='flex-1 px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
              <select value={editPaymentForm.method} onChange={e => setEditPaymentForm({ ...editPaymentForm, method: e.target.value })} className='flex-1 px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required>
                <option value='cash'>{t('paymentMethodCash')}</option>
                <option value='bank_transfer'>{t('paymentMethodBankTransfer')}</option>
                <option value='card'>{t('paymentMethodCard')}</option>
                <option value='click'>{t('paymentMethodClick')}</option>
              </select>
              <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('save')}</button>
              <button type='button' onClick={() => setEditingPayment(null)} className='px-3 py-2 text-muted text-sm'>{t('cancel')}</button>
            </form>
          )}
          {refundingPayment && (
            <form onSubmit={submitRefund} className='flex gap-2 items-end bg-bg-elevated border border-hairline rounded-xl p-3 mt-2'>
              <div className='flex-1'>
                <p className='text-xs text-muted mb-1'>{t('refundAmountLabel', { max: formatMoney(remainingAmount(refundingPayment)) })}</p>
                <input type='number' min='1' max={remainingAmount(refundingPayment)} value={refundAmount}
                  onChange={e => setRefundAmount(e.target.value)} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
              </div>
              <button type='submit' className='px-4 py-2 rounded-lg bg-[#F2542D] text-white text-sm font-medium'>{t('refundBtn')}</button>
              <button type='button' onClick={() => setRefundingPayment(null)} className='px-3 py-2 text-muted text-sm'>{t('cancel')}</button>
            </form>
          )}
        </div>

        <div>
          <p className='text-ink font-medium mb-2'>{t('examResults')}</p>
          <div className='flex flex-col gap-3'>
            {data.examAttempts?.map(a => (
              <div key={a._id} className='flex justify-between text-sm bg-bg-elevated border border-hairline rounded-lg px-3 py-2'>
                <span className='text-muted'>{a.examId?.languageId?.name} · {a.examId?.levelId?.name} · {t('attemptHash', { n: a.attemptNumber })}</span>
                <span className={a.passed ? 'text-accent font-mono' : 'text-red-500 font-mono'}>{a.score}%</span>
              </div>
            ))}
            {(!data.examAttempts || data.examAttempts.length === 0) && <p className='text-muted text-sm'>{t('noExamsYetPlain')}</p>}
          </div>
        </div>

        <div>
          <div className='flex justify-between items-center mb-2'>
            <p className='text-ink font-medium'>{t('groupHistory')}</p>
          </div>
          <div className='flex flex-col gap-3 mb-3'>
            {data.groups.map(g => (
              <div key={g._id} className='flex justify-between items-center text-sm bg-bg-elevated border border-hairline rounded-lg px-3 py-2'>
                <span className='text-ink'>{g.languageId?.name} · {g.levelId?.name} · {g.teacherId?.name}</span>
                <span className='flex items-center gap-2'>
                  <span className='text-muted'>{g.status}</span>
                  {g.status === 'active' && (
                    <button onClick={() => handleRemoveFromGroup(g._id)} className='text-muted text-xs font-medium'>{t('removeFromGroupBtn')}</button>
                  )}
                </span>
              </div>
            ))}
            {data.groups.length === 0 && <p className='text-muted text-sm'>{t('notPlacedYet')}</p>}
          </div>
          <form onSubmit={submitAddToGroup} className='flex gap-2 items-center'>
            <select value={addGroupId} onChange={e => setAddGroupId(e.target.value)} className='flex-1 px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm' required>
              <option value=''>{t('selectGroupToAdd')}</option>
              {availableGroups.map(g => <option key={g._id} value={g._id}>{g.languageId?.name} · {g.levelId?.name} · {g.teacherId?.name}</option>)}
            </select>
            <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('addToGroupBtn')}</button>
          </form>
        </div>

        <div>
          <p className='text-ink font-medium mb-2'>{t('notesLabel')}</p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
            className='w-full px-4 py-3 rounded-xl bg-bg-elevated border border-hairline text-sm text-ink' placeholder={t('notesPlaceholder')} />
          <button onClick={saveNotes} disabled={savingNotes} className='mt-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50'>
            {savingNotes ? t('saving') : t('save')}
          </button>
        </div>

        <div>
          <p className='text-ink font-medium mb-2'>{t('parentPhoneLabel')}</p>
          <form onSubmit={submitParent} className='flex gap-2 items-end flex-wrap'>
            <input placeholder={t('parentPhoneLabel')} value={parentForm.parentPhone} onChange={e => setParentForm({ ...parentForm, parentPhone: e.target.value })}
              className='flex-1 px-4 py-3 rounded-xl bg-bg-elevated border border-hairline text-sm' required />
            <PasswordInput placeholder={t('parentPasswordLabel')} value={parentForm.parentPassword} onChange={e => setParentForm({ ...parentForm, parentPassword: e.target.value })}
              className='flex-1 px-4 py-3 rounded-xl bg-bg-elevated border border-hairline text-sm' />
            <button type='submit' disabled={savingParent} className='px-4 py-3 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50'>{t('linkParentBtn')}</button>
          </form>
          <p className='text-xs text-muted mt-1'>{t('parentInfoOptionalHint')}</p>
        </div>
      </div>
    </div>
  )
}

export default StudentProfile
