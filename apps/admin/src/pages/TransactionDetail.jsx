import React, { useContext, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { formatMoney, paymentMethodLabelKey } from '../lib/format.js'

const Row = ({ label, value }) => (
  <div className='flex justify-between items-center py-2.5 border-b border-hairline last:border-0'>
    <span className='text-muted text-sm'>{label}</span>
    <span className='text-ink text-sm font-medium text-right'>{value ?? '—'}</span>
  </div>
)

const fullDate = (d) => d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'

// a single detail page for BOTH kinds of Finance transaction (payment or expense) - the `type` prop
// picks which endpoint/fields to use, everything else about the page shell is shared
const TransactionDetail = ({ type }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getPaymentDetail, getExpenseDetail } = useContext(AdminContext)
  const { t } = useLanguage()
  const [record, setRecord] = useState(false)

  useEffect(() => {
    setRecord(false)
    const load = type === 'payment' ? getPaymentDetail(id) : getExpenseDetail(id)
    load.then(setRecord)
  }, [type, id])

  if (record === false) return <p className='text-muted'>{t('loading')}</p>
  if (!record) return <p className='text-muted'>{t('transactionNotFound')}</p>

  const isPayment = type === 'payment'

  return (
    <div>
      <button onClick={() => navigate('/finance')} className='text-muted text-sm mb-4'>‹ {t('backToFinance')}</button>

      <div className='flex items-center justify-between mb-6'>
        <div>
          <p className='font-display text-2xl text-ink'>{isPayment ? t('paymentTransactionTitle') : t('expenseTransactionTitle')}</p>
          <p className='text-muted text-xs font-mono mt-1'>#{record._id}</p>
        </div>
        <p className={`font-mono text-3xl ${isPayment ? 'text-accent' : 'text-red-500'}`}>
          {isPayment ? '+' : '-'}{formatMoney(record.amount)}
        </p>
      </div>

      {isPayment ? (
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
    </div>
  )
}

export default TransactionDetail
