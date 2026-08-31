import React, { useContext, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Edit2, Printer } from 'lucide-react'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { formatMoney, paymentMethodLabelKey } from '../lib/format.js'
import { formatDateTime as fullDate } from '../lib/date.js'
import Select from '../components/Select.jsx'
import ReceiptModal from '../components/ReceiptModal.jsx'

const PAY_METHODS = ['cash', 'bank_transfer', 'card', 'click', 'payme']

const Row = ({ label, value }) => (
  <div className='flex justify-between items-center py-2.5 border-b border-hairline last:border-0'>
    <span className='text-muted text-sm'>{label}</span>
    <span className='text-ink text-sm font-medium text-right'>{value ?? '—'}</span>
  </div>
)

// a single detail page for BOTH kinds of Finance transaction (payment or expense) - the `type` prop
// picks which endpoint/fields to use, everything else about the page shell is shared
const TransactionDetail = ({ type }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getPaymentDetail, getExpenseDetail, updatePayment } = useContext(AdminContext)
  const { t } = useLanguage()
  const [record, setRecord] = useState(false)
  const [showEditPayment, setShowEditPayment] = useState(false)
  const [editForm, setEditForm] = useState({ amount: '', method: '' })
  const [saving, setSaving] = useState(false)
  const [printing, setPrinting] = useState(false)

  const reload = () => {
    const load = type === 'payment' ? getPaymentDetail(id) : getExpenseDetail(id)
    load.then(setRecord)
  }
  useEffect(() => { setRecord(false); reload() }, [type, id])

  if (record === false) return <p className='text-muted'>{t('loading')}</p>
  if (!record) return <p className='text-muted'>{t('transactionNotFound')}</p>

  const isPayment = type === 'payment'

  const openEditPayment = () => {
    setEditForm({ amount: record.amount, method: record.method })
    setShowEditPayment(true)
  }

  const submitEditPayment = async (e) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    const ok = await updatePayment(record._id, { amount: Number(editForm.amount), method: editForm.method })
    setSaving(false)
    if (ok) { setShowEditPayment(false); reload() }
  }

  return (
    <div>
      <button onClick={() => navigate(`/finance/${isPayment ? 'payments' : 'expenses'}`)} className='text-muted text-sm mb-4'>‹ {t('backToFinance')}</button>

      <div className='flex items-center justify-between mb-6'>
        <div>
          <p className='font-display text-2xl text-ink'>{isPayment ? t('paymentTransactionTitle') : t('expenseTransactionTitle')}</p>
          <p className='text-muted text-xs font-mono mt-1'>#{record._id}</p>
        </div>
        <div className='flex items-center gap-3'>
          <p className={`font-mono text-3xl ${isPayment ? 'text-accent dark:text-[#818CF8]' : 'text-red-500 dark:text-rose-400'}`}>
            {isPayment ? '+' : '-'}{formatMoney(record.amount)}
          </p>
          {isPayment && (
            <button onClick={() => setPrinting(true)} title={t('printReceiptRowBtn')}
              className='bg-slate-100 hover:bg-slate-200 dark:bg-[#1E293B] dark:hover:bg-[#334155] text-slate-700 dark:text-slate-200 rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 transition-colors'>
              <Printer size={14} strokeWidth={1.5} className='w-4 h-4' /> {t('printBtn')}
            </button>
          )}
          {isPayment && !record.refunded && (
            <button onClick={openEditPayment}
              className='bg-slate-100 hover:bg-slate-200 dark:bg-[#1E293B] dark:hover:bg-[#334155] text-slate-700 dark:text-slate-200 rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 transition-colors'>
              <Edit2 size={14} strokeWidth={1.5} className='w-4 h-4' /> {t('edit')}
            </button>
          )}
        </div>
      </div>

      {isPayment ? (
        <div className='flex flex-col gap-6'>
          <div className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
            <p className='text-ink font-medium mb-1'>{t('studentCol')}</p>
            <button onClick={() => navigate('/students/' + record.studentId?._id)} className='text-accent dark:text-[#818CF8] text-sm hover:underline text-left'>
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
            <Row label={t('coveredThroughLabel')} value={record.subscriptionEnd ? new Date(record.subscriptionEnd).toLocaleDateString() : '—'} />
          </div>

          <div className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
            <p className='text-ink font-medium mb-2'>{t('staffCol')}</p>
            <Row label={t('recordedByLabel')} value={record.adminId?.name || '—'} />
            <Row label={t('recordedAtLabel')} value={fullDate(record.createdAt)} />
          </div>

          {record.refunded && (
            <div className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
              <p className='text-ink font-medium mb-2'>{t('refundBtn')}</p>
              <Row label={t('amountLabel')} value={formatMoney(record.refundedAmount)} />
              <Row label={t('dateCol')} value={fullDate(record.refundedAt)} />
              <Row label={t('recordedByLabel')} value={record.refundedBy?.name || '—'} />
            </div>
          )}
        </div>
      ) : (
        <div className='flex flex-col gap-6'>
          <div className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
            <p className='text-ink font-medium mb-2'>{t('transactionDetailsTitle')}</p>
            <Row label={t('expenseNameLabel')} value={record.name || '—'} />
            <Row label={t('categoryLabel')} value={record.category} />
            <Row label={t('dateCol')} value={fullDate(record.date)} />
            <Row label={t('recipientLabel')} value={record.recipient || '—'} />
            <Row label={t('expenseMethodLabel')} value={t('expenseMethod_' + record.method)} />
            {record.teacherId && <Row label={t('teacherCol')} value={record.teacherId.name} />}
          </div>

          {record.note && (
            <div className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
              <p className='text-ink font-medium mb-1'>{t('noteLabel')}</p>
              <p className='text-ink text-sm whitespace-pre-wrap'>{record.note}</p>
            </div>
          )}

          <div className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
            <p className='text-ink font-medium mb-2'>{t('staffCol')}</p>
            <Row label={t('recordedByLabel')} value={record.createdBy?.name || '—'} />
            <Row label={t('recordedAtLabel')} value={fullDate(record.createdAt)} />
          </div>
        </div>
      )}

      {showEditPayment && (
        <div className='fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-md dark:bg-[#0B0F19]/60 dark:backdrop-blur-lg transition-all duration-300 flex items-center justify-center p-4' onClick={() => setShowEditPayment(false)}>
          <div className='max-w-sm w-full bg-white dark:bg-[#161F30] rounded-2xl shadow-2xl p-6 border border-slate-100 dark:border-slate-800' onClick={e => e.stopPropagation()}>
            <p className='font-display text-lg text-[#1D1D1F] dark:text-[#F8FAFC] mb-4'>{t('editPaymentBtn')}</p>
            <form onSubmit={submitEditPayment} className='flex flex-col gap-3'>
              <div>
                <p className='text-xs text-muted mb-1'>{t('amountLabel')}</p>
                <input type='number' min='1' value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
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
              <button type='submit' disabled={saving}
                className='w-full bg-[#4F46E5] hover:bg-[#5D55FA] text-white font-semibold py-2.5 rounded-xl text-sm transition-all mt-2 disabled:opacity-50'>
                {saving ? t('saving') : t('save')}
              </button>
            </form>
          </div>
        </div>
      )}

      {printing && <ReceiptModal paymentId={record._id} onClose={() => setPrinting(false)} />}
    </div>
  )
}

export default TransactionDetail
