import { Marker } from 'react-map-gl/mapbox'

const MyLocationMarker = ({ lat, lng }: { lat: number; lng: number }) => (
  <Marker longitude={lng} latitude={lat} anchor="center">
    <div className="relative flex items-center justify-center w-4 h-4">
      <div className="absolute w-8 h-8 bg-blue-500/25 rounded-full animate-ping" />
      <div className="relative w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow-[0_0_0_2px_rgba(59,130,246,0.35)]" />
    </div>
  </Marker>
)

export default MyLocationMarker
