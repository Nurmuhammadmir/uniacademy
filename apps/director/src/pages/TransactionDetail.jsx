import React, { useContext, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Edit2, Trash2 } from 'lucide-react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { formatMoney, paymentMethodLabelKey } from '../lib/format.js'
import { useSafeBack } from '../lib/useSafeBack.js'
import Select from '../components/Select.jsx'
import MoneyInput from '../components/MoneyInput.jsx'

const PAY_METHODS = ['cash', 'bank_transfer', 'card', 'click', 'payme']

const Row = ({ label, value }) => (
  <div className='flex justify-between items-center py-2.5 border-b border-hairline last:border-0'>
    <span className='text-muted text-sm'>{label}</span>
    <span className='text-ink text-sm font-medium text-right'>{value ?? '—'}</span>
  </div>
)

const fullDate = (d) => d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'

// director's counterpart of admin's TransactionDetail - payments only (director's Finance section
// has no Expenses tab yet, so there's nothing to drill into on that side). Unlike admin's version,
// edit/delete are NOT gated to today-only - see directorController.updatePaymentDirector's comment:
// confirmed with the user that a director/sub_director needs full authority over any payment
// regardless of age, matching the same-day-lock-free authority they already had over expenses.
const TransactionDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const goBack = useSafeBack('/finance')
  const { getPaymentDetail, updatePayment, deletePayment } = useContext(DirectorContext)
  const { t } = useLanguage()
  const [record, setRecord] = useState(false)
  const [showEditPayment, setShowEditPayment] = useState(false)
  const [editForm, setEditForm] = useState({ amount: '', method: '', comment: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const reload = () => { getPaymentDetail(id).then(setRecord) }
  useEffect(() => { setRecord(false); reload() }, [id])

  if (record === false) return <p className='text-muted'>{t('loading')}</p>
  if (!record) return <p className='text-muted'>{t('transactionNotFound')}</p>

  const openEditPayment = () => {
    setEditForm({ amount: record.amount, method: record.method, comment: record.comment || '' })
    setShowEditPayment(true)
  }

  const submitEditPayment = async (e) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    const ok = await updatePayment(record._id, { amount: Number(editForm.amount), method: editForm.method, comment: editForm.comment })
    setSaving(false)
    if (ok) { setShowEditPayment(false); reload() }
  }

  const handleDelete = async () => {
    if (deleting) return
    setDeleting(true)
    const ok = await deletePayment(record._id)
    setDeleting(false)
    if (ok) goBack()
  }

  return (
    <div>
      <button onClick={goBack} className='text-muted text-sm mb-4'>‹ {t('backToFinance')}</button>

      <div className='flex items-center justify-between mb-6 flex-wrap gap-3'>
        <div>
          <p className='font-display text-2xl text-ink'>{t('paymentTransactionTitle')}</p>
          <p className='text-muted text-xs font-mono mt-1'>#{record._id}</p>
        </div>
        <div className='flex items-center gap-3'>
          <p className='font-mono text-3xl text-accent'>+{formatMoney(record.amount)}</p>
          {!record.refunded && (
            <>
              <button onClick={openEditPayment}
                className='bg-bg-elevated hover:bg-bg border border-hairline text-ink rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 transition-colors'>
                <Edit2 size={14} strokeWidth={1.5} /> {t('edit')}
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className='bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50'>
                <Trash2 size={14} strokeWidth={1.5} /> {t('delete')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className='flex flex-col gap-6'>
        <div className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
          <p className='text-ink font-medium mb-1'>{t('studentCol')}</p>
          <button onClick={() => navigate('/students/' + record.studentId?._id)} className='text-accent text-sm hover:underline text-left'>
            {record.studentId?.name || '—'}
          </button>
          <p className='text-muted text-xs font-mono mt-1'>{record.studentId?.phone}</p>
        </div>

        <div className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
          <p className='text-ink font-medium mb-2'>{t('transactionDetailsTitle')}</p>
          <Row label={t('dateCol')} value={fullDate(record.date)} />
          <Row label={t('methodCol')} value={t(paymentMethodLabelKey(record.method))} />
          <Row label={t('courseCol')} value={record.languageId ? `${record.languageId.name}${record.levelId?.name ? ' · ' + record.levelId.name : ''}` : '—'} />
          <Row label={t('groupCol')} value={record.groupId ? `${record.groupId.schedulePattern} · ${record.groupId.time}` : '—'} />
          <Row label={t('teacherCol')} value={record.teacherId?.name || '—'} />
          <Row label={t('coveredThroughLabel')} value={record.subscriptionEnd ? new Date(record.subscriptionEnd).toLocaleDateString('en-GB') : '—'} />
        </div>

        <div className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
          <p className='text-ink font-medium mb-2'>{t('staffCol')}</p>
          <Row label={t('recordedByLabel')} value={record.adminId?.name || '—'} />
          <Row label={t('recordedAtLabel')} value={fullDate(record.createdAt)} />
        </div>

        {record.comment && (
          <div className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
            <p className='text-ink font-medium mb-1'>{t('paymentCommentLabel')}</p>
            <p className='text-ink text-sm whitespace-pre-wrap break-words'>{record.comment}</p>
          </div>
        )}

        {record.refunded && (
          <div className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
            <p className='text-ink font-medium mb-2'>{t('refundBtn')}</p>
            <Row label={t('amountLabel')} value={formatMoney(record.refundedAmount)} />
            <Row label={t('dateCol')} value={fullDate(record.refundedAt)} />
            <Row label={t('recordedByLabel')} value={record.refundedBy?.name || '—'} />
          </div>
        )}
      </div>

      {showEditPayment && (
        <div className='fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-md flex items-center justify-center p-4' onClick={() => setShowEditPayment(false)}>
          <div className='max-w-sm w-full bg-white dark:bg-[#161F30] rounded-2xl shadow-2xl p-6 border border-slate-100 dark:border-slate-800' onClick={e => e.stopPropagation()}>
            <p className='font-display text-lg text-ink mb-4'>{t('editPaymentBtn')}</p>
            <form onSubmit={submitEditPayment} className='flex flex-col gap-3'>
              <div>
                <p className='text-xs text-muted mb-1'>{t('amountLabel')}</p>
                <MoneyInput value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                  className='w-full px-3 py-2.5 rounded-lg bg-bg border border-hairline text-sm' required autoFocus />
              </div>
              <div>
                <p className='text-xs text-muted mb-1'>{t('selectPaymentMethod')}</p>
                <Select value={editForm.method} onChange={(v) => setEditForm({ ...editForm, method: v })} placeholder={t('selectPaymentMethod')}
                  options={PAY_METHODS.map(m => ({ value: m, label: t(paymentMethodLabelKey(m)) }))} />
              </div>
              <div>
                <p className='text-xs text-muted mb-1'>{t('dateCol')}</p>
                <p className='px-3 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/40 text-sm text-muted'>{fullDate(record.date)}</p>
                <p className='text-[11px] text-muted mt-1'>{t('paymentDateNotEditableHint')}</p>
              </div>
              <div>
                <p className='text-xs text-muted mb-1'>{t('paymentCommentLabel')}</p>
                <textarea value={editForm.comment} onChange={e => setEditForm({ ...editForm, comment: e.target.value })}
                  rows={3} className='w-full px-3 py-2.5 rounded-lg bg-bg border border-hairline text-sm' />
              </div>
              <button type='submit' disabled={saving}
                className='w-full bg-accent hover:opacity-90 text-white font-semibold py-2.5 rounded-xl text-sm transition-all mt-2 disabled:opacity-50'>
                {saving ? t('saving') : t('save')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default TransactionDetail
