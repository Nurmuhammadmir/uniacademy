import { useState } from 'react'
import { useAdmin, type AdminClient } from '../../context/AdminContext'
import { useLanguage } from '../../context/LanguageContext'
import { useConfirm } from '../../context/ConfirmContext'
import { Phone, MapPin, Package, Search, Users, MoreVertical, Pencil, Trash2, X, Check } from 'lucide-react'
import ClientHistoryModal from '../../components/ClientHistoryModal'
import Select from '../../components/Select'

const EditClientModal = ({ client, onClose }: { client: AdminClient; onClose: () => void }) => {
  const { editClient } = useAdmin()
  const { t } = useLanguage()
  const [form, setForm] = useState({ name: client.name, phone: client.phone, address: client.address, notes: client.notes })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const ok = await editClient(client._id, form)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 modal-backdrop" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl modal-card w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-900">{t('adminClients.editTitle')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          {[
            { key: 'name', label: t('common.fullName') },
            { key: 'phone', label: t('common.phone') },
            { key: 'address', label: t('common.address') },
            { key: 'notes', label: t('common.notes') },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{f.label}</label>
              <input
                type="text"
                value={form[f.key as keyof typeof form]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900
                  focus:outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/10 transition-all"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">{t('common.cancel')}</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-[#0066CC] text-white rounded-xl text-sm font-medium hover:bg-[#0052A3] transition-colors flex items-center justify-center gap-2 disabled:opacity-40">
            <Check size={15} /> {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

const AdminClients = () => {
  const { clients, managers, operations, transactions, financeSettings, removeClient } = useAdmin()
  const { t } = useLanguage()
  const confirm = useConfirm()
  const [search, setSearch] = useState('')
  const [filterManager, setFilterManager] = useState('all')
  const [historyClient, setHistoryClient] = useState<{ _id: string; name: string; bottlesHeld: number; balance: number } | null>(null)
  const [editingClient, setEditingClient] = useState<AdminClient | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search) || c.address.toLowerCase().includes(search.toLowerCase())
    const matchManager = filterManager === 'all' || c.managerId === filterManager
    return matchSearch && matchManager
  })

  const totalBottles = clients.reduce((s, c) => s + c.bottlesHeld, 0)

  const formatBalance = (balance: number) => {
    if (balance > 0) return t('balance.owes', { amount: balance.toLocaleString() })
    if (balance < 0) return t('balance.credit', { amount: Math.abs(balance).toLocaleString() })
    return t('balance.settled')
  }

  const historyOrders = historyClient
    ? operations.filter(o => o.clientId === historyClient._id).map(o => ({
        _id: o._id,
        bottlesGiven: o.bottlesGiven,
        bottlesReturned: o.bottlesReturned,
        saleAmount: o.saleAmount,
        paymentAmount: o.paymentAmount,
        createdAt: o.createdAt,
      }))
    : null

  const historyTransactions = historyClient
    ? transactions.filter(t => t.clientId === historyClient._id && t.type !== 'payment')
    : []

  const handleRemove = async (c: AdminClient) => {
    setMenuOpenId(null)
    const ok = await confirm({
      title: t('confirm.removeClientTitle'),
      message: t('adminClients.removeConfirm', { name: c.name }),
      confirmLabel: t('adminClients.remove'),
      danger: true,
    })
    if (!ok) return
    await removeClient(c._id)
  }

  const RowMenu = ({ client }: { client: AdminClient }) => (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setMenuOpenId(menuOpenId === client._id ? null : client._id)}
        className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <MoreVertical size={16} />
      </button>
      {menuOpenId === client._id && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10">
          <button
            onClick={() => { setEditingClient(client); setMenuOpenId(null) }}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Pencil size={13} /> {t('adminClients.edit')}
          </button>
          <button
            onClick={() => handleRemove(client)}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 size={13} /> {t('adminClients.remove')}
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="p-6 max-w-5xl">
      {historyClient && (
        <ClientHistoryModal
          clientName={historyClient.name}
          bottlesHeld={historyClient.bottlesHeld}
          balance={historyClient.balance}
          currency={financeSettings.currency}
          orders={historyOrders}
          extraTransactions={historyTransactions}
          onClose={() => setHistoryClient(null)}
        />
      )}
      {editingClient && <EditClientModal client={editingClient} onClose={() => setEditingClient(null)} />}

      <div className="mb-6">
        <h1 className="text-2xl font-display text-gray-900">{t('adminClients.title')}</h1>
        <p className="text-gray-400 text-sm mt-0.5">{t('adminClients.subtitle', { count: clients.length, bottles: totalBottles })}</p>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('adminClients.search')}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder:text-gray-400
              focus:outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/10 transition-all"
          />
        </div>
        <Select
          value={filterManager}
          onChange={setFilterManager}
          className="min-w-[160px]"
          options={[{ value: 'all', label: t('adminClients.allManagers') }, ...managers.map(m => ({ value: m._id, label: m.name }))]}
        />
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center text-sm text-gray-400">
          {t('adminClients.noneFound')}
        </div>
      )}

      {/* Desktop: table */}
      {filtered.length > 0 && (
        <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50 grid grid-cols-[1fr_140px_110px_90px_140px_40px] text-xs font-medium text-gray-400 uppercase tracking-wider">
            <span>{t('adminClients.colClient')}</span>
            <span>{t('adminClients.colManager')}</span>
            <span>{t('adminClients.colAddress')}</span>
            <span className="text-right">{t('adminClients.colBottles')}</span>
            <span className="text-right">{t('adminClients.colBalance')}</span>
            <span />
          </div>
          <div className="divide-y divide-gray-50">
            {filtered.map(c => (
              <div
                key={c._id}
                onClick={() => setHistoryClient({ _id: c._id, name: c.name, bottlesHeld: c.bottlesHeld, balance: c.balance })}
                className="px-5 py-3.5 grid grid-cols-[1fr_140px_110px_90px_140px_40px] items-center hover:bg-gray-50/50 transition-colors cursor-pointer"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">{c.name}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <Phone size={10} /> {c.phone}
                  </div>
                </div>
                <div className="text-sm text-gray-600">{c.managerName}</div>
                <div className="text-xs text-gray-400 truncate">{c.address.split(',')[0]}</div>
                <div className="text-right">
                  <span className={`font-mono-data text-sm font-medium px-2.5 py-1 rounded-lg
                    ${c.bottlesHeld >= 4 ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600'}`}>
                    {c.bottlesHeld}
                  </span>
                </div>
                <div className={`text-right text-xs font-mono-data font-medium
                  ${c.balance > 0 ? 'text-amber-600' : c.balance < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  {formatBalance(c.balance)}
                </div>
                <RowMenu client={c} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile: stacked cards */}
      {filtered.length > 0 && (
        <div className="md:hidden grid gap-3">
          {filtered.map(c => (
            <div
              key={c._id}
              onClick={() => setHistoryClient({ _id: c._id, name: c.name, bottlesHeld: c.bottlesHeld, balance: c.balance })}
              className="bg-white rounded-2xl border border-gray-100 p-4 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{c.name}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                    <Phone size={10} /> {c.phone}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <MapPin size={10} /> {c.address}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{c.managerName}</div>
                </div>
                <div className="flex items-start gap-1 flex-shrink-0">
                  <div className="flex flex-col items-end gap-1">
                    <span className={`font-mono-data text-sm font-medium px-2.5 py-1 rounded-lg
                      ${c.bottlesHeld >= 4 ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600'}`}>
                      {c.bottlesHeld}
                    </span>
                    <span className={`text-[11px] font-mono-data font-medium
                      ${c.balance > 0 ? 'text-amber-600' : c.balance < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {formatBalance(c.balance)}
                    </span>
                  </div>
                  <RowMenu client={c} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminClients
