import { useEffect, useRef, useState } from 'react'
import Map, { Marker, Popup, type MapRef } from 'react-map-gl/mapbox'
import { useManager, type Client, type Order } from '../../context/ManagerContext'
import { useLanguage } from '../../context/LanguageContext'
import { useMyLocation } from '../../hooks/useMyLocation'
import { MapPin, Phone, Package, History, Navigation, Crosshair } from 'lucide-react'
import ClientHistoryModal from '../../components/ClientHistoryModal'
import MyLocationMarker from '../../components/MyLocationMarker'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string

const ManagerMapPage = () => {
  const { clients, getClientHistory, currency } = useManager()
  const { t } = useLanguage()
  const [selected, setSelected] = useState<Client | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyOrders, setHistoryOrders] = useState<Order[] | null>(null)
  const mapRef = useRef<MapRef>(null)
  const { position: myLocation, locate, loading: locating } = useMyLocation({ auto: true })

  useEffect(() => {
    if (myLocation) {
      mapRef.current?.flyTo({ center: [myLocation.lng, myLocation.lat], zoom: 15, essential: true })
    }
  }, [myLocation])

  const openHistory = () => {
    if (!selected) return
    setHistoryOpen(true)
    setHistoryOrders(null)
    getClientHistory(selected._id).then(setHistoryOrders)
  }

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
      {/* Client list sidebar */}
      <div className="w-full lg:w-64 flex-shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col overflow-hidden max-h-64 lg:max-h-none">
        <div className="px-4 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">{t('map.clientsOnMap')}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{t('map.locations', { count: clients.length })}</p>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {clients.map(c => (
            <button
              key={c._id}
              onClick={() => setSelected(c)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors
                ${selected?._id === c._id ? 'bg-blue-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900 truncate">{c.name}</div>
                <div className={`font-mono-data text-xs font-medium ml-2 px-1.5 py-0.5 rounded
                  ${c.bottlesHeld >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                  {c.bottlesHeld}
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-0.5 truncate">{c.address}</div>
            </button>
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

          {clients.map(client => (
            <Marker
              key={client._id}
              longitude={client.lng}
              latitude={client.lat}
              anchor="bottom"
              onClick={e => { e.originalEvent.stopPropagation(); setSelected(client) }}
            >
              <div className={`w-9 h-9 rounded-full border-2 border-white shadow-md flex items-center justify-center cursor-pointer transition-transform hover:scale-110
                ${client.bottlesHeld >= 4 ? 'bg-amber-500' : 'bg-[#0066CC]'}`}>
                <span className="font-mono-data text-white text-[11px] font-medium">{client.bottlesHeld}</span>
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
                <div className="flex items-start justify-between mb-2">
                  <div className="font-semibold text-gray-900 text-sm pr-4">{selected.name}</div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Phone size={11} /> {selected.phone}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <MapPin size={11} /> {selected.address}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Package size={11} className="text-[#0066CC]" />
                    <span className="font-mono-data font-medium text-[#0066CC]">{t('map.bottlesHeld', { count: selected.bottlesHeld })}</span>
                  </div>
                  <div className={`text-xs font-medium ${selected.balance > 0 ? 'text-amber-600' : selected.balance < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {selected.balance > 0
                      ? t('balance.owes', { amount: `${selected.balance.toLocaleString()} ${currency}` })
                      : selected.balance < 0
                        ? t('balance.credit', { amount: `${Math.abs(selected.balance).toLocaleString()} ${currency}` })
                        : t('balance.settled')}
                  </div>
                  {selected.notes && (
                    <div className="text-xs text-gray-400 italic pt-1 border-t border-gray-100">{selected.notes}</div>
                  )}
                  <div className="flex items-center gap-3 mt-1 pt-2 border-t border-gray-100">
                    <button
                      onClick={openHistory}
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
            currency={currency}
            orders={historyOrders}
            onClose={() => setHistoryOpen(false)}
          />
        )}

        {/* Legend */}
        <div className="hidden sm:block absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 px-4 py-3 text-xs space-y-1.5">
          <div className="text-gray-500 font-medium mb-1">{t('map.bottleBalance')}</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-amber-500" /> {t('map.fourPlus')}</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-[#0066CC]" /> {t('map.underFour')}</div>
        </div>
      </div>
    </div>
  )
}

export default ManagerMapPage
