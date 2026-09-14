import { useState } from 'react'
import { useAdmin } from '../../context/AdminContext'
import { useLanguage } from '../../context/LanguageContext'
import DatePicker from '../../components/DatePicker'
import Select from '../../components/Select'
import { Filter, Truck, Receipt } from 'lucide-react'

type Tab = 'deliveries' | 'finance'

const AdminOperations = () => {
  const { operations, managers, transactions, financeSettings } = useAdmin()
  const { t, fmtDate } = useLanguage()
  const [tab, setTab] = useState<Tab>('deliveries')
  const [filterManager, setFilterManager] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const inRange = (iso: string) => {
    const d = iso.slice(0, 10)
    if (dateFrom && d < dateFrom) return false
    if (dateTo && d > dateTo) return false
    return true
  }

  const filteredOps = operations
    .filter(o => filterManager === 'all' || o.managerId === filterManager)
    .filter(o => inRange(o.createdAt))

  const filteredTx = transactions.filter(tx => inRange(tx.createdAt))

  const formatDate = (s: string) =>
    fmtDate(s, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const formatDateShort = (s: string) =>
    fmtDate(s, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const typeLabel = (type: string) => {
    if (type === 'income') return t('finance.typeIncome')
    if (type === 'expense') return t('finance.typeExpense')
    if (type === 'payment') return t('finance.typePayment')
    return t('finance.typeAdjustment')
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-display text-gray-900">{t('operations.title')}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{t('operations.subtitle')}</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setTab('deliveries')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === 'deliveries' ? 'bg-white text-[#0066CC] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Truck size={13} /> {t('operations.tabDeliveries')}
          </button>
          <button
            onClick={() => setTab('finance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === 'finance' ? 'bg-white text-[#0066CC] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Receipt size={13} /> {t('operations.tabFinance')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {tab === 'deliveries' && (
          <Select
            value={filterManager}
            onChange={setFilterManager}
            leadingIcon={<Filter size={13} />}
            className="w-48"
            options={[{ value: 'all', label: t('operations.allManagers') }, ...managers.map(m => ({ value: m._id, label: m.name }))]}
          />
        )}
        <div className="flex items-center gap-2">
          <DatePicker value={dateFrom} onChange={setDateFrom} max={dateTo || undefined} placeholder={t('finance.from')} allowClear className="w-36" />
          <span className="text-gray-400 text-sm">–</span>
          <DatePicker value={dateTo} onChange={setDateTo} min={dateFrom || undefined} placeholder={t('finance.to')} allowClear className="w-36" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-xs text-gray-400 hover:text-gray-600">
              {t('operations.clearDates')}
            </button>
          )}
        </div>
      </div>

      {tab === 'deliveries' && (
        <>
          {filteredOps.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center text-sm text-gray-400">
              {t('operations.noneFound')}
            </div>
          )}

          {/* Desktop: table */}
          {filteredOps.length > 0 && (
            <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-50 grid grid-cols-[1fr_140px_100px_100px_180px] text-xs font-medium text-gray-400 uppercase tracking-wider">
                <span>{t('operations.colClient')}</span>
                <span>{t('operations.colManager')}</span>
                <span className="text-center">{t('operations.colGiven')}</span>
                <span className="text-center">{t('operations.colReturned')}</span>
                <span className="text-right">{t('operations.colDate')}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {filteredOps.map(op => (
                  <div key={op._id} className="px-5 py-3.5 grid grid-cols-[1fr_140px_100px_100px_180px] items-center hover:bg-gray-50/50 transition-colors">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{op.clientName}</div>
                      <div className="inline-flex items-center mt-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-[#0066CC]">
                        {t('operations.delivery')}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 font-medium">{op.managerName}</div>
                    <div className="text-center">
                      {op.bottlesGiven > 0
                        ? <span className="font-mono-data text-sm text-[#0066CC] font-medium">+{op.bottlesGiven}</span>
                        : <span className="text-gray-300 text-sm">—</span>}
                    </div>
                    <div className="text-center">
                      {op.bottlesReturned > 0
                        ? <span className="font-mono-data text-sm text-green-600 font-medium">-{op.bottlesReturned}</span>
                        : <span className="text-gray-300 text-sm">—</span>}
                    </div>
                    <div className="text-right font-mono-data text-xs text-gray-400">{formatDate(op.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mobile: stacked cards */}
          {filteredOps.length > 0 && (
            <div className="md:hidden grid gap-3">
              {filteredOps.map(op => (
                <div key={op._id} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                        <Truck size={15} className="text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{op.clientName}</div>
                        <div className="text-xs text-gray-400 truncate">{t('adminDashboard.byManager', { name: op.managerName })}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 font-mono-data flex-shrink-0 text-right">{formatDateShort(op.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-4 pl-12">
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider">{t('operations.colGiven')}</div>
                      <div className="font-mono-data text-sm font-medium text-[#0066CC]">
                        {op.bottlesGiven > 0 ? `+${op.bottlesGiven}` : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider">{t('operations.colReturned')}</div>
                      <div className="font-mono-data text-sm font-medium text-green-600">
                        {op.bottlesReturned > 0 ? `-${op.bottlesReturned}` : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'finance' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {filteredTx.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">{t('finance.noneYet')}</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredTx.map(tx => (
                <div key={tx._id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full
                        ${tx.type === 'income' || tx.type === 'payment' ? 'bg-green-50 text-green-700' : tx.type === 'expense' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                        {typeLabel(tx.type)}
                      </span>
                      {tx.clientName && <span className="text-xs text-gray-500 truncate">{tx.clientName}</span>}
                      {tx.category && <span className="text-xs text-gray-400 truncate">· {tx.category}</span>}
                    </div>
                    {tx.notes && <div className="text-xs text-gray-400 mt-0.5 truncate">{tx.notes}</div>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`font-mono-data text-sm font-medium
                      ${tx.type === 'income' || tx.type === 'payment' ? 'text-green-600' : tx.type === 'expense' ? 'text-amber-600' : 'text-gray-700'}`}>
                      {tx.amount.toLocaleString()} {financeSettings.currency}
                    </div>
                    <div className="text-[11px] text-gray-400">{formatDate(tx.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminOperations
