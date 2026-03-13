import { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons (broken by bundlers)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ── Types ──
interface ReverseGeoResult {
  address: string;
  pincode: string;
  landmark: string;
}

export interface LocationData {
  lat: number;
  lng: number;
  address: string;
  pincode: string;
  landmark: string;
}

interface DeliveryMapProps {
  onLocationSelect: (data: LocationData) => void;
  initialLat?: number;
  initialLng?: number;
  deliveryAreaPincodes?: string[];
}

// ── Reverse Geocode (Nominatim — free) ──
async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeoResult> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en`,
      { headers: { 'User-Agent': 'AttaShop/1.0' } }
    );
    const data = await res.json();
    const addr = data.address || {};
    const parts = [
      addr.house_number,
      addr.road,
      addr.neighbourhood || addr.suburb,
      addr.city || addr.town || addr.village,
      addr.state,
    ].filter(Boolean);

    return {
      address: parts.join(', '),
      pincode: addr.postcode || '',
      landmark: addr.neighbourhood || addr.suburb || '',
    };
  } catch {
    return { address: '', pincode: '', landmark: '' };
  }
}

// ── Sub-component: click handler ──
function ClickHandler({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ── Sub-component: fly to point ──
function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), { duration: 0.8 });
  }, [lat, lng, map]);
  return null;
}

// ── Main Component ──
export default function DeliveryMap({
  onLocationSelect,
  initialLat = 28.6139,
  initialLng = 77.209,
  deliveryAreaPincodes = [],
}: DeliveryMapProps) {
  const [position, setPosition] = useState({ lat: initialLat, lng: initialLng });
  const [geo, setGeo] = useState<ReverseGeoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [initialLocDone, setInitialLocDone] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markerRef = useRef<L.Marker>(null);

  // Delivery check
  const isDeliverable = useMemo(() => {
    if (!geo?.pincode || deliveryAreaPincodes.length === 0) return null; // unknown
    return deliveryAreaPincodes.includes(geo.pincode);
  }, [geo?.pincode, deliveryAreaPincodes]);

  // Auto-detect location on mount (once)
  useEffect(() => {
    if (initialLocDone) return;
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        setInitialLocDone(true);
      },
      () => {
        setLocating(false);
        setInitialLocDone(true);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [initialLocDone]);

  // Reverse geocode on position change (debounced 600ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      const result = await reverseGeocode(position.lat, position.lng);
      setGeo(result);
      setLoading(false);
      onLocationSelect({
        lat: position.lat,
        lng: position.lng,
        address: result.address,
        pincode: result.pincode,
        landmark: result.landmark,
      });
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.lat, position.lng]);

  const handleMove = (lat: number, lng: number) => setPosition({ lat, lng });

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        alert('Unable to get location. Please allow location access.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Draggable marker handlers
  const markerEvents = useMemo(
    () => ({
      dragend() {
        const m = markerRef.current;
        if (m) {
          const ll = m.getLatLng();
          handleMove(ll.lat, ll.lng);
        }
      },
    }),
    []
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-bold text-stone-700 text-sm">📍 Select Delivery Location</h3>
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={locating}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold border border-blue-200 hover:bg-blue-100 transition-all disabled:opacity-50"
        >
          {locating ? (
            <><span className="animate-spin inline-block">⏳</span> Locating...</>
          ) : (
            <>📌 Use My Location</>
          )}
        </button>
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border-2 border-stone-200 shadow-sm" style={{ height: 280 }}>
        <MapContainer
          center={[position.lat, position.lng]}
          zoom={15}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
          attributionControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onMove={handleMove} />
          <FlyTo lat={position.lat} lng={position.lng} />
          <Marker
            position={[position.lat, position.lng]}
            draggable
            ref={markerRef}
            eventHandlers={markerEvents}
          />
        </MapContainer>
      </div>

      <p className="text-[11px] text-stone-400 text-center">
        Tap on map or drag the pin to set your exact delivery location
      </p>

      {/* Resolved address */}
      {loading ? (
        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 animate-pulse">
          <span className="text-stone-400 text-sm">🔍 Resolving address...</span>
        </div>
      ) : geo ? (
        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5">
          <p className="text-sm text-stone-700 font-medium leading-snug">
            📍 {geo.address || 'Unknown location'}
          </p>
          {geo.pincode && (
            <p className="text-xs text-stone-500">
              Pincode: <span className="font-bold text-stone-700">{geo.pincode}</span>
            </p>
          )}

          {/* Delivery status badge */}
          {isDeliverable === true && (
            <div className="flex items-center gap-1.5 mt-1 p-2 bg-green-50 rounded-lg border border-green-200">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0" />
              <span className="text-xs font-bold text-green-700">✅ Delivery available in this area!</span>
            </div>
          )}
          {isDeliverable === false && (
            <div className="flex items-center gap-1.5 mt-1 p-2 bg-red-50 rounded-lg border border-red-200">
              <span className="w-2 h-2 bg-red-500 rounded-full shrink-0" />
              <span className="text-xs font-bold text-red-600">
                ❌ Sorry, we don't deliver here yet. Try a different location.
              </span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}