import { useManager } from '../../context/ManagerContext'
import { useLanguage } from '../../context/LanguageContext'
import { Package, TrendingDown, TrendingUp, AlertTriangle, Lock } from 'lucide-react'

const ManagerStock = () => {
  const { clients, totalStock, bottlesOut } = useManager()
  const { t } = useLanguage()

  // totalStock is warehouse-only (recordOrder debits/credits it directly);
  // the business-wide total also includes whatever's currently out with clients.
  const available = totalStock
  const grandTotal = totalStock + bottlesOut
  const pct = grandTotal > 0 ? Math.round((bottlesOut / grandTotal) * 100) : 0

  const highHolders = [...clients].filter(c => c.bottlesHeld >= 4).sort((a, b) => b.bottlesHeld - a.bottlesHeld)

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display text-gray-900">{t('stock.title')}</h1>
        <p className="text-gray-400 text-sm mt-0.5">{t('stock.subtitle')}</p>
      </div>

      {/* Main gauge */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">{t('stock.totalInventory')}</div>
            <div className="font-mono-data text-4xl font-medium text-gray-900">{grandTotal}</div>
            <div className="text-sm text-gray-400 mt-0.5">{t('stock.bottles')}</div>
          </div>
          <div className="w-20 h-20 relative flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f4f4f5" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#0066CC" strokeWidth="3"
                strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
            </svg>
            <div className="absolute text-center">
              <div className="font-mono-data text-sm font-semibold text-gray-900">{pct}%</div>
              <div className="text-[9px] text-gray-400 leading-tight">{t('stock.out')}</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-[#0066CC] mb-2">
              <TrendingDown size={15} />
              <span className="text-xs font-medium uppercase tracking-wider">{t('stock.atClients')}</span>
            </div>
            <div className="font-mono-data text-2xl font-medium text-[#0066CC]">{bottlesOut}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <TrendingUp size={15} />
              <span className="text-xs font-medium uppercase tracking-wider">{t('stock.inStock')}</span>
            </div>
            <div className="font-mono-data text-2xl font-medium text-gray-900">{available}</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>{t('stock.available')}</span>
          <span>{t('stock.outLabel')}</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#0066CC] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs font-mono-data font-medium mt-2">
          <span className="text-gray-600">{available}</span>
          <span className="text-[#0066CC]">{bottlesOut}</span>
        </div>
      </div>

      {/* Stock is admin-controlled */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0 border border-gray-100">
          <Lock size={15} className="text-gray-400" />
        </div>
        <div className="text-sm text-gray-500">{t('stock.adminOnlyNote')}</div>
      </div>

      {highHolders.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-amber-700 font-medium text-sm mb-3">
            <AlertTriangle size={15} />
            {t('stock.collectionWarning')}
          </div>
          <div className="space-y-2">
            {highHolders.map(c => (
              <div key={c._id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-gray-900">{c.name}</div>
                  <div className="text-xs text-gray-400">{c.address}</div>
                </div>
                <div className="font-mono-data text-sm font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg">
                  {c.bottlesHeld} {t('stock.bottles')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ManagerStock
