import React, { useContext, useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { formatMoney, paymentMethodLabelKey, groupLabel } from '../lib/format.js'
import Spinner from './Spinner.jsx'

// a stable, human-friendly "check number" derived straight from the payment's own Mongo _id, so the
// same payment always reprints the same reference number - not a real incrementing sequence (nothing
// in the schema tracks one), just something to point at if a student asks "which payment is this"
const receiptNumber = (id) => parseInt(String(id).slice(-8), 16)

const Row = ({ label, value, bold }) => (
  <div className='flex justify-between gap-3'>
    <span className='text-slate-500 flex-shrink-0'>{label}:</span>
    <span className={`text-right text-[#1a1a1a] ${bold ? 'font-semibold' : ''}`}>{value}</span>
  </div>
)

// prints a physical-receipt-styled record of ONE payment - triggered from anywhere a payment is
// shown (Finance > Payments, a student's profile, the transaction detail page). Always fetches its
// own full detail by id rather than trusting whatever partial fields the calling list row happened
// to have, so the receipt is identical and complete no matter where it was opened from. The actual
// print goes through the sitewide .print-area/.no-print convention (see index.css) - deliberately
// NOT pinned to a fixed paper width, so it fills whatever page size the connected receipt printer's
// own driver reports (58mm, 80mm, or anything else) instead of assuming one specific model.
const ReceiptModal = ({ paymentId, onClose }) => {
  const { getPaymentDetail } = useContext(AdminContext)
  const { t } = useLanguage()
  const [payment, setPayment] = useState(null)

  useEffect(() => {
    setPayment(null)
    getPaymentDetail(paymentId).then(p => { if (p) setPayment(p) })
  }, [paymentId])

  return (
    <div className='fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-md dark:bg-[#0B0F19]/60 dark:backdrop-blur-lg transition-all duration-300 flex items-center justify-center p-4 overflow-y-auto' onClick={onClose}>
      <div className='flex flex-col items-center gap-5 py-6' onClick={e => e.stopPropagation()}>
        <div className='no-print flex items-center justify-between w-full max-w-[320px]'>
          <p className='font-display text-lg text-ink'>{t('receiptTitle')}</p>
          <button onClick={onClose} className='text-muted text-xl leading-none px-2'>✕</button>
        </div>

        {!payment ? (
          <div className='no-print bg-white rounded-2xl p-10 w-[320px] flex justify-center'><Spinner size={20} /></div>
        ) : (
          <div className='print-area flex flex-col w-full max-w-[320px] shadow-xl rounded-sm overflow-hidden'>
            <div className='receipt-scallop-edge' />
            <div className='bg-white px-6 pt-4 pb-6 flex flex-col items-center'>
              <img src='/icons/icon-512.png' alt='' className='w-16 h-16 object-contain mb-3' />
              <div className='w-full border-t border-dashed border-slate-300 mb-4' />
              <div className='w-full flex flex-col gap-1.5 text-[13px] leading-snug'>
                <Row label={t('receiptCheckNumber')} value={'№' + receiptNumber(payment._id)} />
                <Row label={t('receiptCompany')} value='UNI ACADEMY' />
                <Row label={t('receiptStudent')} value={payment.studentId?.name || '—'} />
                <Row label={t('receiptPhone')} value={payment.studentId?.phone || '—'} />
                {payment.groupId && (
                  // groupLabel() falls back to "language · level" when a group has no custom name -
                  // groupId here is only populated with a few of its own fields (name/price/schedule),
                  // not its languageId/levelId, so that fallback is built from the PAYMENT's own
                  // attribution-snapshot languageId/levelId instead (recorded once at payment time,
                  // exactly what this receipt should reflect regardless of what the group is called today)
                  <Row label={t('receiptGroup')} value={groupLabel({ name: payment.groupId.name, languageId: payment.languageId, levelId: payment.levelId })} />
                )}
                {payment.groupId?.price != null && <Row label={t('receiptCoursePrice')} value={formatMoney(payment.groupId.price) + ' UZS'} />}
                <Row label={t('receiptTeacher')} value={payment.teacherId?.name || '—'} />
                <Row label={t('receiptType')} value={t(paymentMethodLabelKey(payment.method))} />
                <Row label={t('receiptAmount')} value={formatMoney(payment.amount) + ' UZS'} bold />
                <Row label={t('receiptDate')} value={new Date(payment.date).toLocaleDateString('uz-UZ')} />
              </div>
              <div className='w-full border-t border-dashed border-slate-300 my-4' />
              <p className='w-full text-[11px] text-slate-400'>
                {t('receiptPrintedAt')}: {new Date().toLocaleDateString('uz-UZ')} {new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className='receipt-scallop-edge' />
          </div>
        )}

        {payment && (
          <button onClick={() => window.print()}
            className='no-print px-6 py-2.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium flex items-center gap-2 shadow-lg transition-colors'>
            <Printer size={16} strokeWidth={2} /> {t('printBtn')}
          </button>
        )}
      </div>
    </div>
  )
}

export default ReceiptModal
