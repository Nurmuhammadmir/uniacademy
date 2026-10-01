import React, { useContext, useState } from 'react'
import { FileDown, FileText, ArrowLeft } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { toast } from 'sonner'
import { ShantiContext } from '../context/ShantiContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Modal from '../components/Modal.jsx'
import Select from '../components/Select.jsx'
import DatePicker from '../components/DatePicker.jsx'
import Spinner from '../components/Spinner.jsx'
import Money from '../components/Money.jsx'
import { formatDateShort } from '../lib/date.js'
import { closingBalanceLabelKey, isBalanceSettled } from '../lib/statement.js'
import StatementPdf from '../pdf/StatementPdf.jsx'

// Акт сверки (reconciliation statement) - one modal drives both sides via `kind`: 'sales' reconciles
// a client's charge/payment history (ShantiSale + ShantiPayment, see getClientStatement), 'purchases'
// mirrors it for a seller (ShantiPurchase + seller-linked ShantiExpense, see getSellerStatement).
// Two steps: pick the counterparty/period/item, generate; then preview on-screen with a PDF download
// that renders the exact same data through StatementPdf.jsx.
const StatementModal = ({ kind, onClose }) => {
  const isSales = kind === 'sales'
  const { clients, products, sellers, materials, getClientStatement, getSellerStatement } = useContext(ShantiContext)
  const { t } = useLanguage()

  const [entityId, setEntityId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [itemId, setItemId] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [downloading, setDownloading] = useState(false)

  const entities = isSales ? clients : sellers
  const items = isSales ? products : materials
  const counterparty = data ? (isSales ? data.client : data.seller) : null
  const itemName = itemId ? items.find(i => i._id === itemId)?.name : null
  const filterLabel = itemName ? t(isSales ? 'statementFilteredByProductNote' : 'statementFilteredByMaterialNote', { name: itemName }) : null
  const debitHeader = isSales ? t('typeSale') : t('typePurchase')
  const creditHeader = t('paidLabel')
  const verdictText = data ? t(closingBalanceLabelKey(isSales, data.closingBalance)) : ''
  const verdictTone = data && !isBalanceSettled(data.closingBalance) ? 'text-amber-600' : 'text-emerald-600'

  const generate = async () => {
    if (!entityId) return
    setLoading(true)
    const filters = { dateFrom, dateTo }
    if (isSales) { filters.clientId = entityId; if (itemId) filters.productId = itemId }
    else { filters.sellerId = entityId; if (itemId) filters.materialId = itemId }
    const result = isSales ? await getClientStatement(filters) : await getSellerStatement(filters)
    setLoading(false)
    if (result) setData(result)
  }

  const download = async () => {
    if (!data) return
    setDownloading(true)
    try {
      const doc = <StatementPdf kind={kind} counterparty={counterparty}
        dateFrom={data.dateFrom} dateTo={data.dateTo} rows={data.rows}
        openingBalance={data.openingBalance} closingBalance={data.closingBalance}
        totalDebit={data.totalDebit} totalCredit={data.totalCredit} filterLabel={filterLabel} />
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const safeName = counterparty.name.replace(/[^\p{L}\p{N}]+/gu, '_')
      const a = document.createElement('a')
      a.href = url
      a.download = `akt-sverki-${safeName}-${formatDateShort(new Date()).replaceAll('.', '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch (error) {
      console.log(error)
      toast.error(t('couldNotLoadStatement'))
    }
    setDownloading(false)
  }

  return (
    <Modal title={t('statementModalTitle')} wide onClose={onClose}>
      {!data ? (
        <div className='flex flex-col gap-3'>
          <div>
            <p className='text-xs text-muted mb-1'>{isSales ? t('clientLabel') : t('supplierLabel')}</p>
            <Select forceSearch value={entityId} onChange={setEntityId}
              placeholder={isSales ? t('chooseClientPlaceholder') : t('chooseSellerPlaceholder')}
              options={entities.map(e => ({ value: e._id, label: e.name }))} />
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <p className='text-xs text-muted mb-1'>{t('dateFromLabel')}</p>
              <DatePicker value={dateFrom} onChange={setDateFrom} />
            </div>
            <div>
              <p className='text-xs text-muted mb-1'>{t('dateToLabel')}</p>
              <DatePicker value={dateTo} onChange={setDateTo} />
            </div>
          </div>
          <p className='text-[11px] text-slate-400 -mt-1.5'>{t('datesOptionalHint')}</p>
          <div>
            <p className='text-xs text-muted mb-1'>{isSales ? t('productLabel') : t('materialLabel')}</p>
            <Select forceSearch value={itemId} onChange={setItemId} placeholder={t('anyOption')}
              options={[{ value: '', label: t('anyOption') }, ...items.map(i => ({ value: i._id, label: i.name }))]} />
          </div>
          <button type='button' disabled={!entityId || loading} onClick={generate}
            className='py-2.5 rounded-xl bg-accent text-white text-sm font-medium mt-2 transition-colors disabled:opacity-50 flex items-center justify-center gap-2'>
            {loading ? <Spinner size={14} /> : <FileText size={15} strokeWidth={1.75} />} {loading ? t('generatingBtn') : t('generateStatementBtn')}
          </button>
        </div>
      ) : (
        <div className='flex flex-col gap-4'>
          {filterLabel && <p className='text-xs text-muted italic -mt-1'>{filterLabel}</p>}

          <div className='grid grid-cols-2 gap-3'>
            <div className='bg-bg rounded-xl p-3.5 border border-hairline'>
              <p className='text-[10px] text-accent font-semibold uppercase tracking-wide mb-1'>{isSales ? t('clientLabel') : t('supplierLabel')}</p>
              <p className='font-bold text-ink text-sm truncate'>{counterparty.name}</p>
              {(counterparty.phone || counterparty.category) && (
                <p className='text-xs text-muted mt-0.5 truncate'>{[counterparty.category, counterparty.phone].filter(Boolean).join(' · ')}</p>
              )}
            </div>
            <div className='bg-bg rounded-xl p-3.5 border border-hairline'>
              <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${verdictTone}`}>{verdictText}</p>
              <p className={`font-bold text-lg ${verdictTone}`}>
                <Money value={data.closingBalance} />
              </p>
            </div>
          </div>

          <div className='grid grid-cols-4 gap-2.5'>
            <div className='bg-accent-soft rounded-xl p-3 text-center'>
              <p className='text-[10px] text-accent font-semibold uppercase mb-1'>{t('openingBalanceLabel')}</p>
              <p className='font-bold text-sm text-ink'><Money value={data.openingBalance} /></p>
            </div>
            <div className='bg-accent-soft rounded-xl p-3 text-center'>
              <p className='text-[10px] text-accent font-semibold uppercase mb-1'>{debitHeader}</p>
              <p className='font-bold text-sm text-ink'><Money value={data.totalDebit} /></p>
            </div>
            <div className='bg-accent-soft rounded-xl p-3 text-center'>
              <p className='text-[10px] text-accent font-semibold uppercase mb-1'>{creditHeader}</p>
              <p className='font-bold text-sm text-ink'><Money value={data.totalCredit} /></p>
            </div>
            <div className={`rounded-xl p-3 text-center ${isBalanceSettled(data.closingBalance) ? 'bg-accent-soft' : 'bg-amber-50'}`}>
              <p className={`text-[10px] font-semibold uppercase mb-1 ${verdictTone}`}>{verdictText}</p>
              <p className={`font-bold text-sm ${verdictTone}`}><Money value={data.closingBalance} /></p>
            </div>
          </div>

          <div className='max-h-80 overflow-y-auto bg-bg-elevated border border-hairline rounded-2xl'>
            <table className='w-full text-xs'>
              <thead className='sticky top-0 bg-accent text-white'>
                <tr>
                  <th className='px-3 py-2.5 text-left font-medium'>{t('dateCol')}</th>
                  <th className='px-3 py-2.5 text-left font-medium'>{t('operationCol')}</th>
                  <th className='px-3 py-2.5 text-right font-medium'>{debitHeader}</th>
                  <th className='px-3 py-2.5 text-right font-medium'>{creditHeader}</th>
                  <th className='px-3 py-2.5 text-right font-medium'>{t('balanceCol')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className='bg-accent-soft/60 font-semibold'>
                  <td className='px-3 py-2' colSpan={4}>{t('openingBalanceLabel')}</td>
                  <td className='px-3 py-2 text-right'><Money value={data.openingBalance} /></td>
                </tr>
                {data.rows.length === 0 && (
                  <tr><td colSpan={5} className='px-3 py-6 text-center text-muted'>{t('noStatementDataYet')}</td></tr>
                )}
                {data.rows.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-bg/60' : ''}>
                    <td className='px-3 py-2 whitespace-nowrap text-muted'>{formatDateShort(row.date)}</td>
                    <td className='px-3 py-2'>
                      {row.description || (row.type === 'payment' ? t('typePayment') : t('typeExpense'))}
                      {row.comment && <span className='block text-[10px] text-slate-400 italic'>{row.comment}</span>}
                    </td>
                    <td className='px-3 py-2 text-right font-mono'>{row.debit > 0 ? <Money value={row.debit} /> : '—'}</td>
                    <td className='px-3 py-2 text-right font-mono text-emerald-600'>{row.credit > 0 ? <Money value={row.credit} /> : '—'}</td>
                    <td className='px-3 py-2 text-right font-mono font-semibold'><Money value={row.balance} /></td>
                  </tr>
                ))}
                <tr className='bg-accent-soft/60 font-bold border-t-2 border-accent'>
                  <td className={`px-3 py-2 ${verdictTone}`} colSpan={2}>{verdictText}</td>
                  <td className='px-3 py-2 text-right'><Money value={data.totalDebit} /></td>
                  <td className='px-3 py-2 text-right'><Money value={data.totalCredit} /></td>
                  <td className={`px-3 py-2 text-right ${verdictTone}`}>
                    <Money value={data.closingBalance} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className='flex gap-2'>
            <button type='button' onClick={() => setData(null)}
              className='flex-1 py-2.5 rounded-xl border border-hairline text-muted font-medium text-sm flex items-center justify-center gap-1.5'>
              <ArrowLeft size={15} strokeWidth={1.75} /> {t('backToFiltersBtn')}
            </button>
            <button type='button' onClick={download} disabled={downloading}
              className='flex-[2] py-2.5 rounded-xl bg-accent text-white text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50'>
              {downloading ? <Spinner size={14} /> : <FileDown size={15} strokeWidth={1.75} />} {t('downloadPdfBtn')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default StatementModal
