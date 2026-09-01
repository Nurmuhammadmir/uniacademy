import React, { useContext, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Phone, Wallet, Pencil, Archive, Trash2, Receipt, UsersRound, Plus, Printer, Snowflake } from 'lucide-react'
import { formatMoney, paymentMethodLabelKey, remainingAmount, groupLabel } from '../lib/format.js'
import { todayISO, formatUTCDate, formatDateTime } from '../lib/date.js'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import Select from '../components/Select.jsx'
import DatePicker from '../components/DatePicker.jsx'
import Modal from '../components/Modal.jsx'
import Spinner from '../components/Spinner.jsx'
import ReceiptModal from '../components/ReceiptModal.jsx'

const PAY_METHODS = ['cash', 'bank_transfer', 'card', 'click', 'payme']

const CARD = 'bg-white rounded-2xl border border-slate-100 p-5 shadow-sm dark:bg-[#161F30] dark:border-slate-800/80 dark:shadow-black/40'
const EMPTY = 'flex flex-col items-center text-center py-6 text-slate-400 text-xs gap-2 dark:text-slate-600'

// full profile page - registration date, every course with price/balance, full payment history
// (with inline refund), exam attempt history, every group ever been in (with add/remove tools),
// and a free-text notes section. Deliberately does NOT show address/geo - only the director is
// allowed to see a student's home location.
const StudentProfile = () => {
  const { id: studentId } = useParams()
  const navigate = useNavigate()
  const {
    getStudentProfile,
    refundPayment, updatePayment, updateStudent, deleteStudent, permanentlyDeleteStudent,
    groups, addStudentToGroup, removeStudentFromGroup, linkParent, getStudentStatement, createPayment,
    setStudentFreeze, deleteDiscount,
  } = useContext(AdminContext)
  const { t } = useLanguage()
  const [data, setData] = useState(false)
  const [statement, setStatement] = useState(null)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [addGroupId, setAddGroupId] = useState('')
  const [enrolledAt, setEnrolledAt] = useState(todayISO())
  const [showAddGroupModal, setShowAddGroupModal] = useState(false)
  const [editingPayment, setEditingPayment] = useState(null)
  const [editPaymentForm, setEditPaymentForm] = useState({ amount: '', method: '' })
  const [refundingPayment, setRefundingPayment] = useState(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [parentForm, setParentForm] = useState({ parentPhone: '', parentPassword: '' })
  const [savingParent, setSavingParent] = useState(false)
  const [showEditStudent, setShowEditStudent] = useState(false)
  const [editStudentForm, setEditStudentForm] = useState({ name: '', phone: '', passportInfo: '' })
  const [showPayModal, setShowPayModal] = useState(false)
  const [payForm, setPayForm] = useState({ amount: '', method: '', date: todayISO() })
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [printingPaymentId, setPrintingPaymentId] = useState(null)

  const reload = () => getStudentProfile(studentId).then(d => { if (d) { setData(d); setNotes(d.student.notes || '') } })
  useEffect(() => { reload() }, [studentId])
  // "owes X" is computed live from real payment history (same math the accounting Ledger uses),
  // not stored anywhere - so it's always accurate the moment a payment/refund/enrollment happens
  useEffect(() => { getStudentStatement(studentId).then(s => { if (s) setStatement(s) }) }, [studentId])

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

  const onDeleteDiscount = async (entryId) => {
    const ok = await deleteDiscount(entryId)
    if (ok) { reload(); getStudentStatement(studentId).then(s => { if (s) setStatement(s) }) }
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
    if (!addGroupId) return
    const ok = await addStudentToGroup(addGroupId, studentId, enrolledAt)
    if (ok) { setAddGroupId(''); setEnrolledAt(todayISO()); setShowAddGroupModal(false); reload() }
  }

  const handleRemoveFromGroup = async (groupId) => {
    await removeStudentFromGroup(groupId, studentId)
    reload()
  }

  const openEditStudent = () => {
    setEditStudentForm({ name: data.student.name, phone: data.student.phone, passportInfo: data.student.passportInfo || '' })
    setShowEditStudent(true)
  }

  const submitEditStudent = async (e) => {
    e.preventDefault()
    const ok = await updateStudent(studentId, editStudentForm)
    if (ok) { setShowEditStudent(false); reload() }
  }

  const handleArchive = async () => {
    const ok = await deleteStudent(studentId)
    if (ok) navigate('/')
  }

  const handleDeletePermanently = async () => {
    const ok = await permanentlyDeleteStudent(studentId)
    if (ok) navigate('/')
  }

  if (!data) return <p className='text-muted'>{t('loading')}</p>

  // data.accountBalance: positive = student owes that much, negative = credit (overpaid) - the
  // single stored balance for this student across every course (see server/models/Account.js)
  const owedTotal = Math.max(0, data.accountBalance || 0)
  const creditTotal = Math.max(0, -(data.accountBalance || 0))
  const currentGroupIds = new Set(data.groups.filter(g => g.status === 'active').map(g => String(g._id)))
  const availableGroups = groups.filter(g => g.status === 'active' && !currentGroupIds.has(String(g._id)))

  // every debt CHARGE ever posted (kind:'debt' ledger entries) across every course - the "when did
  // this student become a debtor, and for what period" half of the story, reusing the same statement
  // fetch (no extra request) since computeCourseStatement already returns both debit (debt) and
  // credit (payment) entries in one list, just filtered here to debt only, not refund reversals
  // which are also type 'debit' but aren't a NEW charge
  const debtHistory = (statement?.courses || [])
    .flatMap(cs => {
      const course = data.courses.find(c => String(c.languageId?._id) === String(cs.languageId))
      return cs.entries.filter(e => e.kind === 'debt').map(e => ({
        ...e, languageName: course?.languageId?.name, levelName: course?.levelId?.name,
      }))
    })

  // a discount is deliberately invisible everywhere except right here (confirmed spec) - no Payment
  // or Expense record backs it, it's a single quiet ledger entry on the student's own account, so
  // this is the only place pulling it out of the statement's raw entries makes sense at all
  const discountHistory = (statement?.courses || [])
    .flatMap(cs => {
      const course = data.courses.find(c => String(c.languageId?._id) === String(cs.languageId))
      return cs.entries.filter(e => e.kind === 'discount').map(e => ({
        ...e, languageName: course?.languageId?.name, levelName: course?.levelId?.name,
      }))
    })

  // confirmed spec: removing a student from a group mid-period returns the unused days' worth of
  // that period's charge to their balance (see billingCycle.service.js's reverseUnusedPeriod) - shown
  // here as its own line so it's never a silent adjustment buried inside the original debt's amount
  const debtReversalHistory = (statement?.courses || [])
    .flatMap(cs => {
      const course = data.courses.find(c => String(c.languageId?._id) === String(cs.languageId))
      return cs.entries.filter(e => e.kind === 'debt_reversal').map(e => ({
        ...e, languageName: course?.languageId?.name, levelName: course?.levelId?.name,
      }))
    })

  // debt charges, payments, discounts, and unused-day returns merged into ONE chronological timeline
  // (newest first) - so "became a debtor for 200,000 on the 12th, paid 200,000 on the 13th" reads as
  // one story instead of disconnected lists the admin has to cross-reference by eye
  const financialHistory = [
    ...data.payments.map(p => ({ type: 'payment', date: p.date, key: p._id, payment: p })),
    ...debtHistory.map(e => ({ type: 'debt', date: e.date, key: e._id, entry: e })),
    ...discountHistory.map(e => ({ type: 'discount', date: e.date, key: e._id, entry: e })),
    ...debtReversalHistory.map(e => ({ type: 'debt_reversal', date: e.date, key: e._id, entry: e })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  // a Payment document has no balanceAfter of its own (that lives on the ledger entry it posted) -
  // cross-referencing by the ledger's paymentId (see studentLedger.service.js) lets every line in
  // "Balans tarixi" show the account's overall balance right after that exact transaction, so a
  // credit being drawn down to cover a newly-added course reads as a visible before/after movement
  // instead of a bare charge with no connection to the pooled balance it came out of
  const paymentBalanceAfterById = new Map(
    (statement?.courses || []).flatMap(cs => cs.entries.filter(e => e.kind === 'payment' && e.paymentId).map(e => [String(e.paymentId), e.balanceAfter]))
  )

  // same sign convention as owedTotal/creditTotal above: positive stored balance = still owes
  // (shown red, minus sign), negative = sitting in credit (shown green, plus sign)
  const formatSignedBalance = (balance) => balance > 0 ? `-${formatMoney(balance)}` : balance < 0 ? `+${formatMoney(-balance)}` : formatMoney(0)
  const balanceColorClass = (balance) => balance > 0 ? 'text-rose-500 dark:text-rose-400' : balance < 0 ? 'text-green-600 dark:text-emerald-400' : 'text-muted'

  // confirmed spec: a payment is never for one particular course - it's a deposit into the
  // student's one shared wallet. Defaults the amount to whatever the account currently owes overall
  // (nothing to suggest if they're already in credit), but the admin can freely type any amount.
  const openPayModal = () => {
    setPayForm({ amount: owedTotal > 0 ? String(owedTotal) : '', method: '', date: todayISO() })
    setShowPayModal(true)
  }

  const submitQuickPay = async (e) => {
    e.preventDefault()
    if (submittingPayment) return
    if (!payForm.method) { toast.error(t('selectPaymentMethodWarning')); return }
    if (!payForm.amount) return
    setSubmittingPayment(true)
    const paymentId = await createPayment(studentId, Number(payForm.amount), payForm.method, payForm.date)
    setSubmittingPayment(false)
    if (paymentId) { setShowPayModal(false); reload(); setPrintingPaymentId(paymentId) }
  }

  // whole-account freeze (not per-course, not per-group, confirmed) - pauses billing on every one
  // of the student's courses at once
  const toggleFreeze = async () => {
    const reason = data.student.frozen ? undefined : (window.prompt(t('freezeReasonPlaceholder')) || '')
    const ok = await setStudentFreeze(studentId, !data.student.frozen, reason)
    if (ok) reload()
  }

  return (
    <div>
      <button onClick={() => navigate('/')} className='plain flex items-center gap-1 text-muted text-sm mb-4 hover:text-slate-700 dark:hover:text-slate-300 transition-colors'>
        <ArrowLeft size={15} strokeWidth={1.5} /> {t('back')}
      </button>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* left column - personal info card */}
        <div className='lg:col-span-1'>
          <div className={`${CARD} flex flex-col gap-4`}>
            <div>
              <div className='flex items-center gap-2 flex-wrap'>
                <p className='text-xl font-bold text-[#1D1D1F] dark:text-[#F8FAFC]'>{data.student.name}</p>
                {data.student.frozen && (
                  <span className='text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 flex items-center gap-1'>
                    <Snowflake size={11} strokeWidth={2} /> {t('frozenBadge')}
                  </span>
                )}
              </div>
              <p className='text-slate-600 font-medium text-sm flex items-center gap-1.5 mt-1.5 dark:text-slate-300'><Phone size={14} strokeWidth={1.5} /> {data.student.phone}</p>
              <p className='text-slate-400 text-xs mt-1 dark:text-slate-600'>{t('registeredOn', { date: new Date(data.student.createdAt).toLocaleDateString() })}</p>
              {data.student.frozen && data.student.frozenReason && (
                <p className='text-blue-600 dark:text-blue-400 text-xs mt-1'>{data.student.frozenReason}</p>
              )}
            </div>

            {data.student.passportInfo && (
              <div className='bg-[#f5f5f7] rounded-xl p-3 dark:bg-slate-800/40'>
                <p className='text-slate-400 text-xs mb-1 dark:text-slate-600'>{t('passportIdInfo')}</p>
                <p className='text-slate-700 text-sm dark:text-slate-300'>{data.student.passportInfo}</p>
              </div>
            )}

            <div className='flex gap-2 pt-1'>
              <button onClick={toggleFreeze} className='flex-1 py-2 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors dark:bg-[#1E293B] dark:hover:bg-[#334155] dark:text-slate-200 dark:border-none'>
                <Snowflake size={13} strokeWidth={1.5} /> {data.student.frozen ? t('unfreezeBtn') : t('freezeBtn')}
              </button>
              <button onClick={openEditStudent} className='flex-1 py-2 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors dark:bg-[#1E293B] dark:hover:bg-[#334155] dark:text-slate-200 dark:border-none'>
                <Pencil size={13} strokeWidth={1.5} /> {t('edit')}
              </button>
              <button onClick={handleArchive} className='flex-1 py-2 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors dark:bg-[#1E293B] dark:hover:bg-[#334155] dark:text-slate-200 dark:border-none'>
                <Archive size={13} strokeWidth={1.5} /> {t('archiveBtn')}
              </button>
              <button onClick={handleDeletePermanently} className='py-2 px-2.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors dark:text-slate-600 dark:hover:text-rose-400 dark:hover:bg-rose-500/10'>
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
            </div>

            <div className='border-t border-slate-100 pt-4 dark:border-slate-800/80'>
              <p className='text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-[#94A3B8]'>{t('notesLabel')}</p>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                className='w-full px-3 py-2.5 rounded-lg bg-[#f5f5f7] border-none text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-accent/30 dark:bg-[#1E293B] dark:text-slate-200' placeholder={t('notesPlaceholder')} />
              <button onClick={saveNotes} disabled={savingNotes} className='mt-2 px-4 py-2 rounded-lg bg-accent text-white text-xs font-medium disabled:opacity-50 dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10'>
                {savingNotes ? t('saving') : t('save')}
              </button>
            </div>

            <div className='border-t border-slate-100 pt-4 dark:border-slate-800/80'>
              <p className='text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-[#94A3B8]'>{t('parentPhoneLabel')}</p>
              <form onSubmit={submitParent} className='flex flex-col gap-2'>
                <input placeholder={t('parentPhoneLabel')} value={parentForm.parentPhone} onChange={e => setParentForm({ ...parentForm, parentPhone: e.target.value })}
                  className='px-3 py-2 rounded-lg bg-[#f5f5f7] border-none text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 dark:bg-[#1E293B] dark:text-slate-200' required />
                <PasswordInput placeholder={t('parentPasswordLabel')} value={parentForm.parentPassword} onChange={e => setParentForm({ ...parentForm, parentPassword: e.target.value })}
                  className='px-3 py-2 rounded-lg bg-[#f5f5f7] border-none text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 dark:bg-[#1E293B] dark:text-slate-200' />
                <button type='submit' disabled={savingParent} className='px-4 py-2 rounded-lg bg-accent text-white text-xs font-medium disabled:opacity-50 dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10'>{t('linkParentBtn')}</button>
              </form>
              <p className='text-[11px] text-slate-400 mt-1.5 dark:text-slate-600'>{t('parentInfoOptionalHint')}</p>
            </div>
          </div>
        </div>

        {/* right column - balance, courses, payments, exams, groups */}
        <div className='lg:col-span-2 flex flex-col gap-5'>
          <div className={`${CARD} flex items-center justify-between`}>
            <div>
              <p className='text-muted text-xs mb-1'>{t('totalBalance')}</p>
              <p className={`text-2xl font-bold tracking-tight ${owedTotal > 0 ? 'text-rose-600 dark:text-rose-400' : creditTotal > 0 ? 'text-green-600 dark:text-emerald-400' : 'text-[#1D1D1F] dark:text-[#F8FAFC]'}`}>
                {owedTotal > 0 ? `-${formatMoney(owedTotal)}` : creditTotal > 0 ? `+${formatMoney(creditTotal)}` : formatMoney(0)}
              </p>
            </div>
            <div className='flex items-center gap-3'>
              <button onClick={openPayModal}
                className='flex items-center gap-1.5 bg-accent dark:bg-[#4F46E5] dark:shadow-lg dark:shadow-indigo-500/10 text-white text-xs font-semibold rounded-xl px-4 py-2 shadow-sm transition-colors'>
                <Plus size={13} strokeWidth={1.75} /> {t('recordPaymentBtn')}
              </button>
              <Wallet size={22} strokeWidth={1.5} className='text-slate-400 dark:text-slate-600' />
            </div>
          </div>

          <div className={CARD}>
            {/* no standalone "add language"/"correct level" tools anymore - a course only ever
                exists because the student was added to a GROUP (which fixes its language, level,
                and price all at once - see the Groups card's "add to group" flow below). Courses
                shown here are a pure read-out of that group membership. */}
            <p className='text-ink font-medium mb-3'>{t('coursesLabel')}</p>

            <div className='flex flex-col'>
              {/* only courses the student is CURRENTLY placed in a group for - one they left keeps
                  its groupId cleared (see removeStudentFromGroup) so it drops out of this "what are
                  they enrolled in right now" list, while its full charge/payment history stays
                  intact and visible forever in the Balans tarixi card below, keyed by language not
                  by group placement */}
              {data.courses.filter(c => c.groupId).map(c => {
                const courseStatement = statement?.courses.find(cs => String(cs.languageId) === String(c.languageId?._id))
                return (
                  <div key={c._id} className='border-b border-slate-50 last:border-0 py-3 first:pt-0 last:pb-0 dark:border-slate-800/80'>
                    <div className='flex justify-between items-start gap-2'>
                      <p className='text-[#1D1D1F] text-sm font-semibold dark:text-[#F8FAFC]'>{c.languageId?.name}{c.levelId?.name ? ` · ${c.levelId.name}` : ''}</p>
                      <span className='flex items-center gap-1.5 flex-shrink-0'>
                        <span className={`text-xs px-2.5 py-1 rounded-full ${c.enrollmentStatus === 'active' ? 'bg-accent-soft text-accent dark:bg-[#1E1B4B] dark:text-[#818CF8]' : 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'}`}>{c.enrollmentStatus === 'active' ? t('active') : t('unpaid')}</span>
                      </span>
                    </div>
                    <div className='grid grid-cols-2 gap-4 border-t border-slate-50 pt-3 mt-3 text-xs dark:border-slate-800/80'>
                      <div><p className='text-slate-400 mb-0.5 dark:text-slate-600'>{t('priceLabelShort')}</p><p className='text-[#1D1D1F] font-medium dark:text-[#F8FAFC]'>{c.price !== null ? formatMoney(c.price) : '—'}</p></div>
                      <div><p className='text-slate-400 mb-0.5 dark:text-slate-600'>{t('balanceLabelShort')}</p><p className={`font-medium ${c.owed > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[#1D1D1F] dark:text-[#F8FAFC]'}`}>{c.owed > 0 ? `-${formatMoney(c.owed)}` : formatMoney(0)}</p></div>
                    </div>
                    {courseStatement?.owed > 0 && (
                      <p className='text-red-600 text-xs font-medium mt-2 dark:text-red-400'>{t('statusOwes', { amount: formatMoney(courseStatement.owed) })}</p>
                    )}
                  </div>
                )
              })}
              {data.courses.filter(c => c.groupId).length === 0 && <p className='text-muted text-sm'>{t('noCoursesYetPlain')}</p>}
            </div>
          </div>

          <div className={CARD}>
            <p className='text-ink font-medium mb-2'>{t('balanceHistoryTitle')}</p>
            {financialHistory.length === 0 ? (
              <div className={EMPTY}><Receipt size={28} strokeWidth={1.5} className='text-slate-300 dark:text-slate-600' /> {t('noPaymentsYetPlain')}</div>
            ) : (
              <div className='flex flex-col gap-3'>
                {financialHistory.map(item => item.type === 'debt' ? (
                  <div key={item.key} className='flex flex-col gap-1 text-sm bg-[#f5f5f7] rounded-lg px-3 py-2 dark:bg-slate-800/40'>
                    <div className='flex justify-between items-center'>
                      <span className='text-muted'>{t('debtLine', { period: `${formatUTCDate(item.entry.periodStart)} – ${formatUTCDate(item.entry.periodEnd)}`, language: item.entry.languageName })}</span>
                      <span className='font-mono text-rose-600 dark:text-rose-400'>+{formatMoney(item.entry.amount)}</span>
                    </div>
                    <span className={`text-xs font-mono ${balanceColorClass(item.entry.balanceAfter)}`}>{t('balanceAfterLine', { amount: formatSignedBalance(item.entry.balanceAfter) })}</span>
                  </div>
                ) : item.type === 'discount' ? (
                  <div key={item.key} className='flex flex-col gap-1 text-sm bg-[#f5f5f7] rounded-lg px-3 py-2 dark:bg-slate-800/40'>
                    <div className='flex justify-between items-center'>
                      <span className='text-muted'>{t('discountLine', { date: formatDateTime(item.entry.date), language: item.entry.languageName })}</span>
                      <span className='flex items-center gap-2'>
                        <span className='font-mono text-accent dark:text-[#818CF8]'>-{formatMoney(item.entry.amount)}</span>
                        <button onClick={() => onDeleteDiscount(item.entry._id)} className='text-muted text-xs font-medium'>{t('deleteBtn')}</button>
                      </span>
                    </div>
                    <span className={`text-xs font-mono ${balanceColorClass(item.entry.balanceAfter)}`}>{t('balanceAfterLine', { amount: formatSignedBalance(item.entry.balanceAfter) })}</span>
                  </div>
                ) : item.type === 'debt_reversal' ? (
                  <div key={item.key} className='flex flex-col gap-1 text-sm bg-[#f5f5f7] rounded-lg px-3 py-2 dark:bg-slate-800/40'>
                    <div className='flex justify-between items-center'>
                      <span className='text-muted'>{t('debtReversalLine', { period: `${formatUTCDate(item.entry.periodStart)} – ${formatUTCDate(item.entry.periodEnd)}`, language: item.entry.languageName })}</span>
                      <span className='font-mono text-accent dark:text-[#818CF8]'>-{formatMoney(item.entry.amount)}</span>
                    </div>
                    <span className={`text-xs font-mono ${balanceColorClass(item.entry.balanceAfter)}`}>{t('balanceAfterLine', { amount: formatSignedBalance(item.entry.balanceAfter) })}</span>
                  </div>
                ) : (
                  <div key={item.key} className={`flex flex-col gap-1 text-sm bg-[#f5f5f7] rounded-lg px-3 py-2 dark:bg-slate-800/40 ${item.payment.refunded ? 'opacity-50' : ''}`}>
                    <div className='flex justify-between items-center'>
                    <span className='text-muted'>{t('paymentLine', { date: formatDateTime(item.payment.date), admin: item.payment.adminId?.name })}</span>
                    <span className='flex items-center gap-2'>
                      <span className='text-xs font-medium px-2 py-1 rounded-full bg-white text-muted dark:bg-[#1E293B]'>{t(paymentMethodLabelKey(item.payment.method))}</span>
                      <span className='font-mono text-accent dark:text-[#818CF8]'>-{formatMoney(item.payment.amount)}</span>
                      {item.payment.refundedAmount > 0 && (
                        <span className='text-xs text-muted'>({t('refundedAmountHint', { amount: formatMoney(item.payment.refundedAmount) })})</span>
                      )}
                      <button onClick={() => setPrintingPaymentId(item.payment._id)} title={t('printReceiptRowBtn')} className='p-1 rounded-lg text-muted hover:text-accent dark:hover:text-[#818CF8]'>
                        <Printer size={14} strokeWidth={1.75} />
                      </button>
                      {item.payment.refunded ? (
                        <span className='text-xs font-medium px-2 py-1 rounded-full bg-white text-muted dark:bg-[#1E293B]'>{t('refundedBadge')}</span>
                      ) : (
                        <>
                          {!item.payment.refundedAmount && <button onClick={() => openEditPayment(item.payment)} className='text-accent text-xs font-medium dark:text-[#818CF8]'>{t('editPaymentBtn')}</button>}
                          <button onClick={() => openRefund(item.payment)} className='text-muted text-xs font-medium'>{t('refundBtn')}</button>
                        </>
                      )}
                    </span>
                    </div>
                    {paymentBalanceAfterById.has(String(item.payment._id)) && (
                      <span className={`text-xs font-mono ${balanceColorClass(paymentBalanceAfterById.get(String(item.payment._id)))}`}>
                        {t('balanceAfterLine', { amount: formatSignedBalance(paymentBalanceAfterById.get(String(item.payment._id))) })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {editingPayment && (
              <form onSubmit={submitEditPayment} className='flex gap-2 items-end bg-[#f5f5f7] rounded-xl p-3 mt-3 dark:bg-slate-800/40'>
                <input placeholder={t('amountLabel')} type='number' value={editPaymentForm.amount} onChange={e => setEditPaymentForm({ ...editPaymentForm, amount: e.target.value })}
                  className='flex-1 px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm dark:bg-[#1E293B] dark:border-none dark:text-slate-200' required />
                <Select className='flex-1' value={editPaymentForm.method} onChange={(v) => setEditPaymentForm({ ...editPaymentForm, method: v })}
                  options={[
                    { value: 'cash', label: t('paymentMethodCash') },
                    { value: 'bank_transfer', label: t('paymentMethodBankTransfer') },
                    { value: 'card', label: t('paymentMethodCard') },
                    { value: 'click', label: t('paymentMethodClick') },
                    { value: 'payme', label: t('paymentMethodPayme') },
                  ]} />
                <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10'>{t('save')}</button>
                <button type='button' onClick={() => setEditingPayment(null)} className='px-3 py-2 text-muted text-sm'>{t('cancel')}</button>
              </form>
            )}
            {refundingPayment && (
              <form onSubmit={submitRefund} className='flex gap-2 items-end bg-[#f5f5f7] rounded-xl p-3 mt-3 dark:bg-slate-800/40'>
                <div className='flex-1'>
                  <p className='text-xs text-muted mb-1'>{t('refundAmountLabel', { max: formatMoney(remainingAmount(refundingPayment)) })}</p>
                  <input type='number' min='1' max={remainingAmount(refundingPayment)} value={refundAmount}
                    onChange={e => setRefundAmount(e.target.value)} className='w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm dark:bg-[#1E293B] dark:border-none dark:text-slate-200' required />
                </div>
                <button type='submit' className='px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium transition-colors'>{t('refundBtn')}</button>
                <button type='button' onClick={() => setRefundingPayment(null)} className='px-3 py-2 text-muted text-sm'>{t('cancel')}</button>
              </form>
            )}
          </div>

          <div className={CARD}>
            <div className='flex items-center justify-between mb-3'>
              <p className='text-ink font-medium'>{t('groupHistory')}</p>
              <button onClick={() => setShowAddGroupModal(true)}
                className='flex items-center gap-1.5 bg-accent dark:bg-[#4F46E5] dark:shadow-lg dark:shadow-indigo-500/10 text-white text-xs font-semibold rounded-xl px-3.5 py-1.5 shadow-sm transition-colors'>
                <Plus size={13} strokeWidth={1.75} /> {t('addToGroupBtn')}
              </button>
            </div>
            {data.groups.length === 0 ? (
              <div className={EMPTY}><UsersRound size={28} strokeWidth={1.5} className='text-slate-300 dark:text-slate-600' /> {t('notPlacedYet')}</div>
            ) : (
              <div className='flex flex-col gap-2'>
                {data.groups.map(g => (
                  <div key={g._id} className='flex justify-between items-center text-sm bg-[#f5f5f7] rounded-xl px-3.5 py-2.5 dark:bg-slate-800/40'>
                    <div className='min-w-0'>
                      <p className='text-[#1D1D1F] font-medium truncate dark:text-[#F8FAFC]'>{g.name ? `${g.name} · ` : ''}{g.languageId?.name}{g.levelId?.name ? ` · ${g.levelId.name}` : ''}</p>
                      <p className='text-slate-400 text-xs mt-0.5 dark:text-slate-600'>{g.teacherId?.name}</p>
                    </div>
                    <span className='flex items-center gap-2.5 flex-shrink-0'>
                      <span className='flex items-center gap-1.5 text-muted text-xs capitalize'>
                        <span className={`w-1.5 h-1.5 rounded-full ${g.status === 'active' ? 'bg-emerald-500' : 'bg-rose-400'}`} /> {g.status}
                      </span>
                      {g.status === 'active' && (
                        <button onClick={() => handleRemoveFromGroup(g._id)} className='text-muted text-xs font-medium hover:text-rose-500 transition-colors'>{t('removeFromGroupBtn')}</button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddGroupModal && (
        <Modal title={t('addToGroupBtn')} onClose={() => setShowAddGroupModal(false)}>
          <form onSubmit={submitAddToGroup} className='flex flex-col gap-3'>
            <div>
              <p className='text-xs text-muted mb-1'>{t('selectGroupToAdd')}</p>
              <Select forceSearch value={addGroupId} onChange={setAddGroupId} placeholder={t('selectGroupToAdd')}
                options={availableGroups.map(g => ({
                  value: g._id, label: `${g.name ? g.name + ' · ' : ''}${g.languageId?.name}${g.levelId?.name ? ' · ' + g.levelId.name : ''} · ${g.teacherId?.name} · ${formatMoney(g.price)} · ${g.studentIds.length}/${g.capacity}`,
                }))} />
            </div>
            <div>
              {/* confirmed spec: billing starts from whichever date is actually chosen here, not
                  always today - the admin can backdate when the student really joined this group */}
              <p className='text-xs text-muted mb-1'>{t('enrolledAtLabel')}</p>
              <DatePicker value={enrolledAt} onChange={setEnrolledAt} />
            </div>
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium mt-1 dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10'>{t('addToGroupBtn')}</button>
          </form>
        </Modal>
      )}

      {showEditStudent && (
        <Modal title={t('edit')} onClose={() => setShowEditStudent(false)}>
          <form onSubmit={submitEditStudent} className='flex flex-col gap-3'>
            <input value={editStudentForm.name} onChange={e => setEditStudentForm({ ...editStudentForm, name: e.target.value })} placeholder={t('fullName')}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input value={editStudentForm.phone} onChange={e => setEditStudentForm({ ...editStudentForm, phone: e.target.value })} placeholder={t('phoneNumber')}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input value={editStudentForm.passportInfo} onChange={e => setEditStudentForm({ ...editStudentForm, passportInfo: e.target.value })} placeholder={t('passportIdInfo')}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' />
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10'>{t('saveChanges')}</button>
          </form>
        </Modal>
      )}

      {showPayModal && (
        <div className='fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-md dark:bg-[#0B0F19]/60 dark:backdrop-blur-lg transition-all duration-300 flex items-center justify-center p-4' onClick={() => setShowPayModal(false)}>
          <div className='max-w-sm w-full bg-white dark:bg-[#161F30] rounded-2xl shadow-2xl p-6 border border-slate-100 dark:border-slate-800' onClick={e => e.stopPropagation()}>
            <p className='font-display text-lg text-[#1D1D1F] dark:text-[#F8FAFC] mb-1'>{t('recordPaymentModalTitle')}</p>
            <p className='text-muted text-sm mb-4'>{data.student.name}</p>
            <form onSubmit={submitQuickPay} className='flex flex-col gap-3'>
              <div>
                <p className='text-xs text-muted mb-1'>{t('amountLabel')}</p>
                <input type='number' min='1' value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                  className='w-full px-3 py-2.5 rounded-lg bg-bg border border-hairline text-sm' required autoFocus />
              </div>
              <div>
                <p className='text-xs text-muted mb-1'>{t('selectPaymentMethod')}</p>
                <Select value={payForm.method} onChange={(v) => setPayForm({ ...payForm, method: v })} placeholder={t('selectPaymentMethod')}
                  options={PAY_METHODS.map(m => ({ value: m, label: t(paymentMethodLabelKey(m)) }))} />
              </div>
              <div>
                <p className='text-xs text-muted mb-1'>{t('paymentDateLabel')}</p>
                <DatePicker value={payForm.date} onChange={(v) => setPayForm({ ...payForm, date: v })} />
              </div>
              <button type='submit' disabled={submittingPayment}
                className='w-full bg-[#4F46E5] hover:bg-[#5D55FA] text-white font-semibold py-2.5 rounded-xl text-sm transition-all mt-4 text-center block disabled:opacity-50 flex items-center justify-center gap-2'>
                {submittingPayment && <Spinner size={14} />} {t('save')}
              </button>
            </form>
          </div>
        </div>
      )}

      {printingPaymentId && <ReceiptModal paymentId={printingPaymentId} onClose={() => setPrintingPaymentId(null)} />}
    </div>
  )
}

export default StudentProfile
