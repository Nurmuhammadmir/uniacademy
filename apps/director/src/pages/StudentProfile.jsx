import React, { useContext, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { formatMoney, paymentMethodLabelKey } from '../lib/format.js'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { confirm } from '../lib/confirm.js'
import Modal from '../components/Modal.jsx'
import MoneyInput from '../components/MoneyInput.jsx'

// director sees everything admin sees, PLUS address/geo - only the director is allowed to see
// where a student lives. Read-only except for one deliberate override: adjustStudentBalance below,
// a director-only manual reconciliation tool - everything else here stays the branch admin's job.
// deliberately NOT a bare signed number field - Account.balance's own sign convention (>0 = owes,
// <0 = credit, see server/models/Account.js) reads backwards to plain human intuition ("minus" reads
// as "owed" to most people, not "credit"), and a raw sign is exactly the kind of thing that's easy to
// mistype in a money tool with zero visible warning. An explicit debt/credit toggle plus a
// plain non-negative amount can't be typo'd into the wrong direction the way a missing "-" can -
// confirmed real confusion: typing "-250000" expecting "250,000 of debt" actually set a 250,000
// CREDIT (the literal, correct Account.balance result for that input), which is the opposite of what
// was intended. The resulting signed balance (owes = +amount, credit = -amount) is computed here and
// handed to adjustStudentBalance exactly as before - the backend/API contract is unchanged.
const AdjustBalanceModal = ({ studentId, currentBalance, onClose, onAdjusted }) => {
  const { adjustStudentBalance } = useContext(DirectorContext)
  const { t } = useLanguage()
  const [mode, setMode] = useState(currentBalance < 0 ? 'credit' : 'debt')
  const [amount, setAmount] = useState(currentBalance !== 0 ? String(Math.abs(currentBalance)) : '')
  const [submitting, setSubmitting] = useState(false)

  const amountNum = Number(amount)
  const isValid = amount !== '' && Number.isFinite(amountNum) && amountNum >= 0
  const resultingBalance = isValid ? (mode === 'debt' ? Math.round(amountNum) : -Math.round(amountNum)) : null
  const diff = isValid ? Math.round(currentBalance - resultingBalance) : 0

  const submit = async (e) => {
    e.preventDefault()
    if (!isValid) return
    if (diff === 0) { onClose(); return }
    const confirmMessage = diff > 0
      ? t('confirmReduceBalance', { amount: formatMoney(diff) })
      : t('confirmIncreaseBalance', { amount: formatMoney(-diff) })
    if (!(await confirm(confirmMessage))) return
    setSubmitting(true)
    const result = await adjustStudentBalance(studentId, resultingBalance)
    setSubmitting(false)
    if (result) onAdjusted()
  }

  return (
    <Modal title={t('adjustBalanceTitle')} onClose={onClose}>
      <form onSubmit={submit} className='flex flex-col gap-3'>
        <div className='bg-bg border border-hairline rounded-xl p-3'>
          <p className='text-muted text-xs mb-1'>{t('currentBalanceLabel')}</p>
          <p className={`font-mono text-lg ${currentBalance > 0 ? 'text-rose-600' : 'text-ink'}`}>{formatMoney(currentBalance)}</p>
        </div>
        <div className='grid grid-cols-2 gap-2'>
          <button type='button' onClick={() => setMode('debt')}
            className={`py-2 rounded-lg text-sm font-medium border transition-colors ${mode === 'debt' ? 'bg-rose-600 text-white border-rose-600' : 'bg-bg border-hairline text-muted'}`}>
            {t('balanceModeDebt')}
          </button>
          <button type='button' onClick={() => setMode('credit')}
            className={`py-2 rounded-lg text-sm font-medium border transition-colors ${mode === 'credit' ? 'bg-accent text-white border-accent' : 'bg-bg border-hairline text-muted'}`}>
            {t('balanceModeCredit')}
          </button>
        </div>
        <div>
          <p className='text-xs text-muted mb-1'>{mode === 'debt' ? t('debtAmountLabel') : t('creditAmountLabel')}</p>
          <MoneyInput value={amount} onChange={e => setAmount(e.target.value)}
            className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm font-mono' autoFocus />
        </div>
        {isValid && diff !== 0 && (
          <p className={`text-xs font-medium ${diff > 0 ? 'text-accent' : 'text-rose-600'}`}>
            {diff > 0 ? t('willReduceBy', { amount: formatMoney(diff) }) : t('willIncreaseBy', { amount: formatMoney(-diff) })}
          </p>
        )}
        <p className='text-muted text-xs bg-bg border border-hairline rounded-xl p-3'>{t('adjustBalanceHint')}</p>
        <button type='submit' disabled={submitting || !isValid} className='py-2.5 rounded-xl bg-accent text-white text-sm font-medium transition-colors disabled:opacity-50'>
          {t('saveChanges')}
        </button>
      </form>
    </Modal>
  )
}

const StudentProfile = () => {
  const { id: studentId } = useParams()
  const navigate = useNavigate()
  const { getStudentProfile, permanentlyDeleteStudent } = useContext(DirectorContext)
  const [data, setData] = useState(false)
  const [showAdjustBalance, setShowAdjustBalance] = useState(false)
  const { t } = useLanguage()

  const load = () => getStudentProfile(studentId).then(setData)
  useEffect(() => { load() }, [studentId])

  const handlePermanentDelete = async () => {
    if (await permanentlyDeleteStudent(studentId)) navigate('/students')
  }

  if (!data) return <p className='text-muted'>{t('loading')}</p>

  return (
    <div>
      <div className='flex justify-between items-center mb-4'>
        <button onClick={() => navigate('/students')} className='text-muted text-sm'>‹ {t('back')}</button>
        <button onClick={handlePermanentDelete} className='text-red-500 text-xs font-medium'>{t('deletePermanentlyBtn')}</button>
      </div>

      <div className='flex flex-col gap-5'>
        <div className='flex justify-between items-start gap-3 flex-wrap'>
          <div>
            <p className='font-display text-2xl text-ink'>{data.student.name}</p>
            <p className='text-muted text-sm font-mono'>{data.student.phone}</p>
            <p className='text-muted text-xs mt-1'>{t('registeredOn', { date: new Date(data.student.createdAt).toLocaleDateString('en-GB'), branch: data.student.branchId?.name })}</p>
          </div>
          <div className='bg-bg-elevated border border-hairline rounded-xl p-3.5 text-right'>
            <p className='text-muted text-xs mb-1'>{t('currentBalanceLabel')}</p>
            <p className={`font-mono text-lg ${data.accountBalance > 0 ? 'text-rose-600' : 'text-ink'}`}>{formatMoney(data.accountBalance)}</p>
            <button onClick={() => setShowAdjustBalance(true)} className='text-accent text-xs font-medium mt-1'>{t('adjustBalanceBtn')}</button>
          </div>
        </div>

        {data.student.passportInfo && (
          <div className='bg-bg-elevated border border-hairline rounded-xl p-4'>
            <p className='text-muted text-xs mb-1'>{t('passportIdInfo')}</p>
            <p className='text-ink text-sm'>{data.student.passportInfo}</p>
          </div>
        )}

        <div>
          <p className='text-ink font-medium mb-2'>{t('courses')}</p>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {data.courses.map(c => (
              <div key={c._id} className='bg-bg-elevated border border-hairline rounded-xl p-4'>
                <div className='flex justify-between items-start mb-1'>
                  <p className='text-ink text-sm font-medium'>{c.languageId?.name} · {c.levelId?.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.enrollmentStatus === 'active' ? 'bg-accent-soft text-accent' : 'bg-hairline text-muted'}`}>{c.enrollmentStatus === 'active' ? t('active') : t('unpaid')}</span>
                </div>
                <p className='text-muted text-xs'>
                  {t('priceBalanceLine', { price: c.price !== null ? formatMoney(c.price) : '—' })} ·{' '}
                  <span className={c.owed > 0 ? 'text-rose-600 font-medium' : ''}>{t('courseBalanceLine', { balance: c.owed > 0 ? `-${formatMoney(c.owed)}` : formatMoney(0) })}</span>
                </p>
              </div>
            ))}
            {data.courses.length === 0 && <p className='text-muted text-sm col-span-2'>{t('noCoursesYetPlain')}</p>}
          </div>
        </div>

        <div className='bg-bg-elevated border border-hairline rounded-xl p-4'>
          <p className='text-muted text-xs mb-1'>{t('address')}</p>
          <p className='text-ink'>{data.student.address || '—'}</p>
          {data.student.geo?.lat && (
            <p className='text-muted text-xs mt-1 font-mono'>{data.student.geo.lat.toFixed(5)}, {data.student.geo.lng.toFixed(5)}</p>
          )}
        </div>

        <div>
          <p className='text-ink font-medium mb-2'>{t('paymentHistory')}</p>
          <div className='flex flex-col gap-3'>
            {data.payments.map(p => (
              <div key={p._id} className={`flex flex-wrap justify-between items-center gap-2 text-sm bg-bg-elevated border border-hairline rounded-lg px-3 py-2 ${p.refunded ? 'opacity-50' : ''}`}>
                <span className='text-muted'>{t('paymentLine', { date: new Date(p.date).toLocaleDateString('en-GB'), admin: p.adminId?.name })}</span>
                <span className='flex flex-wrap items-center gap-2'>
                  <span className='text-xs font-medium px-2 py-1 rounded-full bg-hairline text-muted'>{t(paymentMethodLabelKey(p.method))}</span>
                  <span className='font-mono text-accent'>+{formatMoney(p.amount)}</span>
                  {p.refunded && <span className='text-xs font-medium px-2 py-1 rounded-full bg-hairline text-muted'>{t('refundedBadge')}</span>}
                </span>
              </div>
            ))}
            {data.payments.length === 0 && <p className='text-muted text-sm'>{t('noPaymentsYetPlain')}</p>}
          </div>
        </div>

        <div>
          <p className='text-ink font-medium mb-2'>{t('examResults')}</p>
          <div className='flex flex-col gap-3'>
            {data.examAttempts?.map(a => (
              <div key={a._id} className='flex flex-wrap justify-between gap-2 text-sm bg-bg-elevated border border-hairline rounded-lg px-3 py-2'>
                <span className='text-muted'>{a.examId?.languageId?.name} · {a.examId?.levelId?.name} · {t('attemptHash', { n: a.attemptNumber })}</span>
                <span className={a.passed ? 'text-accent font-mono' : 'text-red-500 font-mono'}>{a.score}%</span>
              </div>
            ))}
            {(!data.examAttempts || data.examAttempts.length === 0) && <p className='text-muted text-sm'>{t('noExamsYetPlain')}</p>}
          </div>
        </div>

        <div>
          <p className='text-ink font-medium mb-2'>{t('groupHistory')}</p>
          <div className='flex flex-col gap-3'>
            {data.groups.map(g => (
              <div key={g._id} className='flex flex-wrap justify-between gap-2 text-sm bg-bg-elevated border border-hairline rounded-lg px-3 py-2'>
                <span className='text-ink'>{g.name ? `${g.name} · ` : ''}{g.languageId?.name} · {g.levelId?.name} · {g.teacherId?.name}</span>
                <span className='text-muted'>{g.status}</span>
              </div>
            ))}
            {data.groups.length === 0 && <p className='text-muted text-sm'>{t('notPlacedYet')}</p>}
          </div>
        </div>

        {data.student.notes && (
          <div>
            <p className='text-ink font-medium mb-2'>{t('notesLabel')}</p>
            <div className='bg-bg-elevated border border-hairline rounded-xl p-4'>
              <p className='text-ink text-sm whitespace-pre-wrap'>{data.student.notes}</p>
            </div>
          </div>
        )}
      </div>

      {showAdjustBalance && (
        <AdjustBalanceModal
          studentId={studentId}
          currentBalance={data.accountBalance}
          onClose={() => setShowAdjustBalance(false)}
          onAdjusted={() => { setShowAdjustBalance(false); load() }}
        />
      )}
    </div>
  )
}

export default StudentProfile
