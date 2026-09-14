import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Map, { Marker, type MapRef } from 'react-map-gl/mapbox'
import { useAdmin } from '../../context/AdminContext'
import { useLanguage } from '../../context/LanguageContext'
import { useMyLocation } from '../../hooks/useMyLocation'
import { toast } from 'react-toastify'
import { MapPin, Save, ArrowLeft, AlertCircle, Crosshair } from 'lucide-react'
import MyLocationMarker from '../../components/MyLocationMarker'
import Select from '../../components/Select'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string

// Admin's own "add client" - the manager app has the same flow (pages/manager/AddClient.tsx) for a
// manager adding their OWN client, which is why that one has no manager picker. A client created
// here has no manager yet (unlike an order, which can inherit one from an existing client), so the
// admin must pick one explicitly - there's no sensible default owner otherwise.
const AdminAddClient = () => {
  const { addClient, managers } = useAdmin()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const mapRef = useRef<MapRef>(null)
  const { position: myLocation, locate, loading: locating } = useMyLocation({ auto: true })

  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' })
  const [managerId, setManagerId] = useState('')
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (myLocation) {
      mapRef.current?.flyTo({ center: [myLocation.lng, myLocation.lat], zoom: 16, essential: true })
    }
  }, [myLocation])

  const useMyLocationForPin = () => {
    locate((location) => {
      setPin(location)
      mapRef.current?.flyTo({ center: [location.lng, location.lat], zoom: 16, essential: true })
    })
  }

  const handleMapClick = useCallback((e: { lngLat: { lat: number; lng: number } }) => {
    setPin({ lat: e.lngLat.lat, lng: e.lngLat.lng })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin) {
      toast.error(t('addClient.pinPrompt'))
      return
    }
    if (!managerId) {
      toast.error(t('adminClients.selectManagerPlaceholder'))
      return
    }
    setSaving(true)
    const ok = await addClient({ ...form, lat: pin.lat, lng: pin.lng, managerId })
    setSaving(false)
    if (ok) navigate('/dashboard/clients')
  }

  const noToken = !MAPBOX_TOKEN || MAPBOX_TOKEN === 'undefined'

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-display text-gray-900">{t('adminClients.newClient')}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{t('addClient.subtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-6">
        {/* Form fields */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">{t('addClient.clientDetails')}</h2>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{t('adminClients.assignManager')}</label>
              <Select
                value={managerId}
                onChange={setManagerId}
                placeholder={t('adminClients.selectManagerPlaceholder')}
                options={managers.map(m => ({ value: m._id, label: m.name }))}
              />
            </div>
            {[
              { key: 'name', label: t('common.fullName'), placeholder: 'Sarvar Umarov', type: 'text', required: true },
              { key: 'phone', label: t('common.phone'), placeholder: '+998 90 123 45 67', type: 'tel', required: true },
              { key: 'address', label: t('common.address'), placeholder: 'Mirzo-Ulugbek, Toshkent', type: 'text', required: true },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{field.label}</label>
                <input
                  type={field.type}
                  value={form[field.key as keyof typeof form]}
                  onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  required={field.required}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-300
                    focus:outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/10 transition-all"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{t('addClient.notesOptional')}</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder={t('addClient.notesPlaceholder')}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-300
                  focus:outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/10 transition-all resize-none"
              />
            </div>
          </div>

          {pin && (
            <div className="bg-[#0066CC]/5 border border-[#0066CC]/15 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-[#0066CC] text-sm font-medium mb-1">
                <MapPin size={14} /> {t('addClient.locationPinned')}
              </div>
              <div className="font-mono-data text-xs text-gray-600">
                {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}
              </div>
            </div>
          )}

          {!pin && (
            <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 rounded-xl px-4 py-3">
              <AlertCircle size={15} />
              {t('addClient.clickToPinPrompt')}
            </div>
          )}

          <button
            type="button"
            onClick={useMyLocationForPin}
            disabled={locating}
            className="w-full border border-[#0066CC]/25 text-[#0066CC] py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#0066CC]/5 transition-colors disabled:opacity-60"
          >
            <Crosshair size={16} />
            {locating ? t('map.locating') : t('map.useMyLocation')}
          </button>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#0066CC] text-white py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2
              hover:bg-[#0052A3] transition-colors disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? t('common.saving') : t('addClient.save')}
          </button>
        </div>

        {/* Map */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden h-[500px] lg:h-auto relative">
          {noToken ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 text-gray-400">
              <MapPin size={32} className="mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500 mb-1">{t('addClient.tokenNotConfigured')}</p>
              <p className="text-xs">{t('addClient.setTokenPrefix')} <code className="font-mono-data bg-gray-100 px-1.5 py-0.5 rounded">VITE_MAPBOX_TOKEN</code> {t('addClient.setTokenSuffix')}</p>
            </div>
          ) : (
            <>
              <Map
                ref={mapRef}
                mapboxAccessToken={MAPBOX_TOKEN}
                initialViewState={{ longitude: 69.28, latitude: 41.30, zoom: 11 }}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                onClick={handleMapClick}
                cursor="crosshair"
              >
                {myLocation && <MyLocationMarker lat={myLocation.lat} lng={myLocation.lng} />}
                {pin && (
                  <Marker longitude={pin.lng} latitude={pin.lat} anchor="bottom">
                    <div className="w-8 h-8 bg-[#0066CC] rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                      <MapPin size={14} className="text-white" />
                    </div>
                  </Marker>
                )}
              </Map>
              <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-xs text-gray-500 px-3 py-1.5 rounded-lg shadow-sm">
                {t('addClient.clickAnywhere')}
              </div>
            </>
          )}
        </div>
      </form>
    </div>
  )
}

export default AdminAddClient
