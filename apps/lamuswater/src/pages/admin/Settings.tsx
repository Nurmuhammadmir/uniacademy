import { useState } from 'react'
import { useAdmin } from '../../context/AdminContext'
import { useLanguage } from '../../context/LanguageContext'
import { DollarSign, Package, Plus, Minus, Wallet, Banknote, CreditCard, Landmark } from 'lucide-react'

const AdminSettings = () => {
  const { financeSettings, stock, updateBottlePrice, adjustStock, updateOpeningBalance } = useAdmin()
  const { t } = useLanguage()

  const currency = financeSettings.currency

  const [priceInput, setPriceInput] = useState(financeSettings.bottlePrice)
  const [priceDirty, setPriceDirty] = useState(false)
  const [savingPrice, setSavingPrice] = useState(false)

  const [stockAmount, setStockAmount] = useState(10)
  const [savingStock, setSavingStock] = useState(false)

  const [openingBalance, setOpeningBalance] = useState(financeSettings.openingBalance)
  const [balanceDirty, setBalanceDirty] = useState(false)
  const [savingBalance, setSavingBalance] = useState(false)

  const handlePriceSave = async () => {
    setSavingPrice(true)
    const ok = await updateBottlePrice(priceInput)
    setSavingPrice(false)
    if (ok) setPriceDirty(false)
  }

  const handleStockAdjust = async (sign: 1 | -1) => {
    if (!stockAmount || stockAmount <= 0) return
    setSavingStock(true)
    await adjustStock(sign * stockAmount)
    setSavingStock(false)
  }

  const handleBalanceSave = async () => {
    setSavingBalance(true)
    const ok = await updateOpeningBalance(openingBalance)
    setSavingBalance(false)
    if (ok) setBalanceDirty(false)
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display text-gray-900">{t('nav.settings')}</h1>
        <p className="text-gray-400 text-sm mt-0.5">{t('settings.subtitle')}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Bottle price */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-3">
            <DollarSign size={15} />
            <span className="text-xs font-medium uppercase tracking-wider">{t('finance.pricingTitle')}</span>
          </div>
          <div className="text-sm text-gray-400 mb-1">{t('finance.currentPrice')}</div>
          <div className="font-mono-data text-2xl font-medium text-gray-900 mb-4">
            {financeSettings.bottlePrice.toLocaleString()} <span className="text-sm font-normal text-gray-400">{currency}</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              value={priceInput}
              onChange={e => { setPriceInput(Number(e.target.value)); setPriceDirty(true) }}
              placeholder={t('finance.newPrice')}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono-data text-gray-900
                focus:outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/10 transition-all"
            />
            <button onClick={handlePriceSave} disabled={!priceDirty || savingPrice}
              className="px-4 py-2.5 bg-[#0066CC] text-white rounded-xl text-sm font-medium hover:bg-[#0052A3] transition-colors disabled:opacity-40">
              {t('finance.updatePrice')}
            </button>
          </div>
        </div>

        {/* Warehouse stock */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-3">
            <Package size={15} />
            <span className="text-xs font-medium uppercase tracking-wider">{t('finance.stockTitle')}</span>
          </div>
          <div className="text-sm text-gray-400 mb-1">{t('finance.currentStock')}</div>
          <div className="font-mono-data text-2xl font-medium text-gray-900 mb-4">{stock.toLocaleString()}</div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              value={stockAmount}
              onChange={e => setStockAmount(Number(e.target.value))}
              className="w-28 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono-data text-gray-900
                focus:outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/10 transition-all"
            />
            <button onClick={() => handleStockAdjust(1)} disabled={savingStock}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0066CC] text-white rounded-xl text-sm font-medium hover:bg-[#0052A3] transition-colors disabled:opacity-60">
              <Plus size={14} /> {t('stock.add')}
            </button>
            <button onClick={() => handleStockAdjust(-1)} disabled={savingStock}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-50 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-60">
              <Minus size={14} /> {t('stock.removeAmount')}
            </button>
          </div>
        </div>
      </div>

      {/* Opening balance */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mt-4">
        <div className="flex items-center gap-2 text-gray-500 mb-1.5">
          <Wallet size={15} />
          <span className="text-xs font-medium uppercase tracking-wider">{t('settings.openingBalanceTitle')}</span>
        </div>
        <p className="text-xs text-gray-400 mb-4 max-w-xl">{t('settings.openingBalanceHint')}</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5"><Banknote size={12} /> {t('orders.cash')}</label>
            <input
              type="number"
              value={openingBalance.cash}
              onChange={e => { setOpeningBalance(v => ({ ...v, cash: Number(e.target.value) })); setBalanceDirty(true) }}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono-data text-gray-900 focus:outline-none focus:border-[#0066CC]"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5"><CreditCard size={12} /> {t('orders.card')}</label>
            <input
              type="number"
              value={openingBalance.card}
              onChange={e => { setOpeningBalance(v => ({ ...v, card: Number(e.target.value) })); setBalanceDirty(true) }}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono-data text-gray-900 focus:outline-none focus:border-[#0066CC]"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5"><Landmark size={12} /> {t('orders.transfer')}</label>
            <input
              type="number"
              value={openingBalance.transfer}
              onChange={e => { setOpeningBalance(v => ({ ...v, transfer: Number(e.target.value) })); setBalanceDirty(true) }}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono-data text-gray-900 focus:outline-none focus:border-[#0066CC]"
            />
          </div>
        </div>
        <button onClick={handleBalanceSave} disabled={!balanceDirty || savingBalance}
          className="px-4 py-2.5 bg-[#0066CC] text-white rounded-xl text-sm font-medium hover:bg-[#0052A3] transition-colors disabled:opacity-40">
          {t('settings.save')}
        </button>
      </div>
    </div>
  )
}

export default AdminSettings
