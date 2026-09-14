import { useEffect, useRef, useState } from 'react'
import Map, { Marker, Popup, type MapRef } from 'react-map-gl/mapbox'
import { useAdmin, type AdminClient, type ManagerLocation } from '../../context/AdminContext'
import { useLanguage } from '../../context/LanguageContext'
import { useMyLocation } from '../../hooks/useMyLocation'
import { MapPin, Phone, Package, History, Navigation, Crosshair, UserRound } from 'lucide-react'
import ClientHistoryModal from '../../components/ClientHistoryModal'
import MyLocationMarker from '../../components/MyLocationMarker'
import Select from '../../components/Select'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string

const MANAGER_PALETTE = ['#0066CC', '#0891b2', '#0f766e', '#7c3aed', '#b45309', '#db2777']

const AdminMapPage = () => {
  const { clients, managers, operations, managerLocations, transactions, financeSettings } = useAdmin()
  const { t, fmtDate } = useLanguage()
  const [selected, setSelected] = useState<AdminClient | null>(null)
  const [selectedManager, setSelectedManager] = useState<ManagerLocation | null>(null)
  const [filterManager, setFilterManager] = useState('all')
  const [historyOpen, setHistoryOpen] = useState(false)
  const mapRef = useRef<MapRef>(null)
  const { position: myLocation, locate, loading: locating } = useMyLocation({ auto: true })

  useEffect(() => {
    if (myLocation) {
      mapRef.current?.flyTo({ center: [myLocation.lng, myLocation.lat], zoom: 15, essential: true })
    }
  }, [myLocation])

  const historyOrders = selected
    ? operations.filter(o => o.clientId === selected._id).map(o => ({
        _id: o._id,
        bottlesGiven: o.bottlesGiven,
        bottlesReturned: o.bottlesReturned,
        saleAmount: o.saleAmount,
        paymentAmount: o.paymentAmount,
        createdAt: o.createdAt,
      }))
    : null

  const historyTransactions = selected
    ? transactions.filter(t => t.clientId === selected._id && t.type !== 'payment')
    : []

  const managerColors: Record<string, string> = Object.fromEntries(
    managers.map((m, i) => [m._id, MANAGER_PALETTE[i % MANAGER_PALETTE.length]])
  )

  const filtered = filterManager === 'all' ? clients : clients.filter(c => c.managerId === filterManager)
  const filteredManagerLocations = filterManager === 'all' ? managerLocations : managerLocations.filter(l => l.managerId === filterManager)

  const noToken = !MAPBOX_TOKEN || MAPBOX_TOKEN === 'undefined'

  if (noToken) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6">
        <MapPin size={40} className="text-gray-300 mb-3" />
        <p className="text-base font-medium text-gray-500 mb-1">{t('map.unavailable')}</p>
        <p className="text-sm text-gray-400">
          {t('map.setTokenPrefix')} <code className="font-mono-data bg-gray-100 px-1.5 py-0.5 rounded text-xs">VITE_MAPBOX_TOKEN</code> {t('map.setTokenSuffix')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Sidebar */}
      <div className="w-full lg:w-64 flex-shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col overflow-hidden max-h-64 lg:max-h-none">
        <div className="px-4 py-4 border-b border-gray-100 space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">{t('map.allClients')}</h2>
          <Select
            value={filterManager}
            onChange={setFilterManager}
            options={[{ value: 'all', label: t('map.allManagers') }, ...managers.map(m => ({ value: m._id, label: m.name }))]}
          />
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filtered.map(c => (
            <button
              key={c._id}
              onClick={() => setSelected(c)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selected?._id === c._id ? 'bg-gray-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900 truncate">{c.name}</div>
                <div className="w-2 h-2 rounded-full ml-2 flex-shrink-0" style={{ background: managerColors[c.managerId] || '#666' }} />
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{c.managerName}</div>
            </button>
          ))}
        </div>
        {/* Legend */}
        <div className="hidden lg:block px-4 py-3 border-t border-gray-100 space-y-1.5">
          <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2">{t('map.managerColor')}</div>
          {managers.map(m => (
            <div key={m._id} className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-full" style={{ background: managerColors[m._id] }} />
              {m.name}
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 min-h-[320px] relative p-4 bg-[#F5F5F7]">
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{ longitude: 69.28, latitude: 41.31, zoom: 11.5 }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
        >
          {myLocation && <MyLocationMarker lat={myLocation.lat} lng={myLocation.lng} />}

          {filtered.map(client => (
            <Marker
              key={client._id}
              longitude={client.lng}
              latitude={client.lat}
              anchor="bottom"
              onClick={e => { e.originalEvent.stopPropagation(); setSelected(client) }}
            >
              <div
                className="w-9 h-9 rounded-full border-2 border-white shadow-md flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                style={{ background: managerColors[client.managerId] || '#666' }}
              >
                <span className="font-mono-data text-white text-[11px] font-medium">{client.bottlesHeld}</span>
              </div>
            </Marker>
          ))}

          {filteredManagerLocations.map(loc => (
            <Marker
              key={loc.managerId}
              longitude={loc.lng}
              latitude={loc.lat}
              anchor="bottom"
              onClick={e => { e.originalEvent.stopPropagation(); setSelectedManager(loc) }}
            >
              <div
                className="w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                style={{ background: managerColors[loc.managerId] || '#666', boxShadow: `0 0 0 2px ${managerColors[loc.managerId] || '#666'}44` }}
              >
                <UserRound size={14} className="text-white" />
              </div>
            </Marker>
          ))}

          {selected && (
            <Popup
              longitude={selected.lng}
              latitude={selected.lat}
              anchor="bottom"
              offset={40}
              closeOnClick={false}
              onClose={() => setSelected(null)}
            >
              <div className="min-w-[180px]">
                <div className="font-semibold text-gray-900 text-sm mb-2">{selected.name}</div>
                <div className="space-y-1.5">
                  <div className="text-xs text-gray-500">{selected.managerName}</div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500"><Phone size={11} /> {selected.phone}</div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500"><MapPin size={11} /> {selected.address}</div>
                  <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: managerColors[selected.managerId] }}>
                    <Package size={11} /> {selected.bottlesHeld} {t('stock.bottles')}
                  </div>
                  <div className={`text-xs font-medium ${selected.balance > 0 ? 'text-amber-600' : selected.balance < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {selected.balance > 0
                      ? t('balance.owes', { amount: `${selected.balance.toLocaleString()} ${financeSettings.currency}` })
                      : selected.balance < 0
                        ? t('balance.credit', { amount: `${Math.abs(selected.balance).toLocaleString()} ${financeSettings.currency}` })
                        : t('balance.settled')}
                  </div>
                  <div className="flex items-center gap-3 mt-1 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => setHistoryOpen(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-[#0066CC] hover:underline"
                    >
                      <History size={12} /> {t('history.viewButton')}
                    </button>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-[#0066CC] hover:underline"
                    >
                      <Navigation size={12} /> {t('map.getDirections')}
                    </a>
                  </div>
                </div>
              </div>
            </Popup>
          )}

          {selectedManager && (
            <Popup
              longitude={selectedManager.lng}
              latitude={selectedManager.lat}
              anchor="bottom"
              offset={36}
              closeOnClick={false}
              onClose={() => setSelectedManager(null)}
            >
              <div className="min-w-[160px]">
                <div className="font-semibold text-gray-900 text-sm mb-1">{selectedManager.managerName}</div>
                <div className="text-xs text-gray-400">
                  {t('map.lastSeen', { time: fmtDate(selectedManager.updatedAt, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) })}
                </div>
              </div>
            </Popup>
          )}
        </Map>

        <button
          type="button"
          onClick={() => locate((location) => mapRef.current?.flyTo({ center: [location.lng, location.lat], zoom: 15, essential: true }))}
          disabled={locating}
          className="absolute top-4 right-4 z-10 rounded-lg bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-md border border-gray-100 hover:bg-gray-50 disabled:opacity-60 flex items-center gap-1.5"
        >
          <Crosshair size={14} /> {locating ? t('map.locating') : t('map.useMyLocation')}
        </button>

        {historyOpen && selected && (
          <ClientHistoryModal
            clientName={selected.name}
            bottlesHeld={selected.bottlesHeld}
            balance={selected.balance}
            currency={financeSettings.currency}
            orders={historyOrders}
            extraTransactions={historyTransactions}
            onClose={() => setHistoryOpen(false)}
          />
        )}
      </div>
    </div>
  )
}

export default AdminMapPage
