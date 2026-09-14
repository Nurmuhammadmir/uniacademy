import { useState } from 'react'
import { useManager, type Order } from '../../context/ManagerContext'
import { useLanguage } from '../../context/LanguageContext'
import { useConfirm } from '../../context/ConfirmContext'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Phone, MapPin, Package, Edit2, Trash2, MoreVertical, History } from 'lucide-react'
import ClientHistoryModal from '../../components/ClientHistoryModal'

const ManagerClients = () => {
  const { clients, deleteClient, getClientHistory, currency } = useManager()
  const { t } = useLanguage()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [historyClient, setHistoryClient] = useState<{ _id: string; name: string; bottlesHeld: number; balance: number } | null>(null)
  const [historyOrders, setHistoryOrders] = useState<Order[] | null>(null)

  const openHistory = (id: string, name: string, bottlesHeld: number, balance: number) => {
    setHistoryClient({ _id: id, name, bottlesHeld, balance })
    setHistoryOrders(null)
    getClientHistory(id).then(setHistoryOrders)
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.address.toLowerCase().includes(search.toLowerCase())
  )

  const formatBalance = (balance: number) => {
    if (balance > 0) return t('balance.owes', { amount: balance.toLocaleString() })
    if (balance < 0) return t('balance.credit', { amount: Math.abs(balance).toLocaleString() })
    return t('balance.settled')
  }

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: t('confirm.removeClientTitle'),
      message: t('managerClients.removeConfirm', { name }),
      confirmLabel: t('managerClients.remove'),
      danger: true,
    })
    if (!ok) return
    await deleteClient(id)
    setMenuOpen(null)
  }

  return (
    <div className="p-6 max-w-5xl">
      {historyClient && (
        <ClientHistoryModal
          clientName={historyClient.name}
          bottlesHeld={historyClient.bottlesHeld}
          balance={historyClient.balance}
          currency={currency}
          orders={historyOrders}
          onClose={() => setHistoryClient(null)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display text-gray-900">{t('managerClients.title')}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{t('managerClients.subtitle', { count: clients.length })}</p>
        </div>
        <button
          onClick={() => navigate('/dashboard/clients/add')}
          className="flex items-center gap-2 bg-[#0066CC] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#0052A3] transition-colors"
        >
          <Plus size={16} />
          {t('managerClients.addClient')}
        </button>
      </div>

      <div className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('managerClients.search')}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/10 transition-all"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users2 />
          <p className="mt-2 text-sm">{t('managerClients.noneFound')}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(client => (
            <div
              key={client._id}
              onClick={() => openHistory(client._id, client.name, client.bottlesHeld, client.balance)}
              className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4 hover:border-gray-200 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[#0066CC]/8 flex items-center justify-center text-[#0066CC] font-semibold text-sm flex-shrink-0">
                {client.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm">{client.name}</div>
                <div className="flex items-center gap-4 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Phone size={11} /> {client.phone}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <MapPin size={11} /> {client.address}
                  </span>
                </div>
                {client.notes && (
                  <div className="text-xs text-gray-400 mt-1 italic">{client.notes}</div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end gap-1">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono-data font-medium
                    ${client.bottlesHeld >= 4 ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600'}`}>
                    <Package size={12} />
                    {client.bottlesHeld} {t('managerClients.bottles')}
                  </div>
                  <div className={`text-[11px] font-mono-data font-medium
                    ${client.balance > 0 ? 'text-amber-600' : client.balance < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {formatBalance(client.balance)}
                  </div>
                </div>
                <div className="relative" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setMenuOpen(menuOpen === client._id ? null : client._id)}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {menuOpen === client._id && (
                    <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10">
                      <button
                        onClick={() => { openHistory(client._id, client.name, client.bottlesHeld, client.balance); setMenuOpen(null) }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <History size={13} /> {t('history.title')}
                      </button>
                      <button
                        onClick={() => { navigate(`/dashboard/clients/edit/${client._id}`); setMenuOpen(null) }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Edit2 size={13} /> {t('managerClients.edit')}
                      </button>
                      <button
                        onClick={() => handleDelete(client._id, client.name)}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={13} /> {t('managerClients.remove')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const Users2 = () => (
  <svg className="mx-auto mb-2 text-gray-300" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

export default ManagerClients
