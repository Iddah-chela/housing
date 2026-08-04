import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useLocation, useNavigate } from 'react-router-dom';
import { Lock, MapPin, Unlock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import PaymentModal from '../components/PaymentModal';
import { DEFAULT_MAP_CENTER } from '../components/LocationPinPicker';
import { useClerk } from '@clerk/clerk-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const agentIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:28px;height:28px;border-radius:9999px;background:#7c3aed;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const propertyIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:28px;height:28px;border-radius:9999px;background:#4f46e5;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function FitPins({ pins }) {
  const map = useMap();
  useEffect(() => {
    if (!pins?.length) {
      map.setView(DEFAULT_MAP_CENTER, 13);
      return;
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds.pad(0.2));
  }, [pins, map]);
  return null;
}

const formatRent = (min, max) => {
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) {
    return `Ksh ${Number(min).toLocaleString()} – ${Number(max).toLocaleString()}`;
  }
  const v = min ?? max;
  return `Ksh ${Number(v).toLocaleString()}`;
};

export default function VacancyMap() {
  const { axios, getToken, user, isAdmin } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { openSignIn } = useClerk();
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [pinCount, setPinCount] = useState(0);
  const [pins, setPins] = useState([]);
  const [showPay, setShowPay] = useState(false);
  const [error, setError] = useState('');

  const loadPins = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const headers = {};
      if (user) {
        const token = await getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const { data } = await axios.get('/api/map/pins', { headers });
      if (!data.success) {
        setError(data.message || 'Could not load map');
        return;
      }
      setUnlocked(!!data.unlocked || !!isAdmin);
      setPinCount(data.pinCount || 0);
      setPins(Array.isArray(data.pins) ? data.pins : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load map');
    } finally {
      setLoading(false);
    }
  }, [axios, getToken, user, isAdmin]);

  useEffect(() => {
    loadPins();
  }, [loadPins]);

  const mapProperty = useMemo(
    () => ({
      name: 'Vacancy Map',
      estate: 'All areas',
      place: 'Approximate pins',
    }),
    []
  );

  return (
    <div className='pt-24 md:pt-28 px-4 md:px-16 lg:px-24 xl:px-32 pb-10'>
      <div className='flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4'>
        <div>
          <h1 className='text-2xl md:text-3xl font-playfair text-gray-900 dark:text-white'>Map</h1>
          <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
            Approximate vacant areas nearby. Exact doors stay private.
          </p>
        </div>
        <div className='flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400'>
          <span className='inline-flex items-center gap-1.5'>
            <span className='w-3 h-3 rounded-full bg-indigo-600' /> Landlord
          </span>
          <span className='inline-flex items-center gap-1.5'>
            <span className='w-3 h-3 rounded-full bg-violet-600' /> Agent
          </span>
        </div>
      </div>

      <div className='relative z-0 isolate rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm vacancy-map-shell'>
        <div className='h-[62vh] min-h-[420px] w-full relative z-0'>
          <MapContainer
            center={DEFAULT_MAP_CENTER}
            zoom={13}
            scrollWheelZoom
            style={{ height: '100%', width: '100%', zIndex: 0 }}
            className='z-0'
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            />
            <FitPins pins={pins} />
            {unlocked &&
              pins.map((pin) => (
                <Marker
                  key={`${pin.sourceType}-${pin.id}`}
                  position={[pin.lat, pin.lng]}
                  icon={pin.sourceType === 'agent' ? agentIcon : propertyIcon}
                >
                  <Circle
                    center={[pin.lat, pin.lng]}
                    radius={320}
                    pathOptions={{
                      color: pin.sourceType === 'agent' ? '#7c3aed' : '#4f46e5',
                      fillColor: pin.sourceType === 'agent' ? '#8b5cf6' : '#6366f1',
                      fillOpacity: 0.12,
                      weight: 1,
                    }}
                  />
                  <Popup>
                    <div className='min-w-[180px]'>
                      <p className='font-semibold text-sm text-gray-900'>{pin.title}</p>
                      <p className='text-xs text-gray-500 mt-0.5'>
                        {[pin.area, pin.place].filter(Boolean).join(', ')}
                      </p>
                      {formatRent(pin.rentMin, pin.rentMax) && (
                        <p className='text-xs text-indigo-700 mt-1'>{formatRent(pin.rentMin, pin.rentMax)}</p>
                      )}
                      {pin.vacantRooms > 0 && (
                        <p className='text-xs text-gray-600 mt-0.5'>{pin.vacantRooms} vacant</p>
                      )}
                      <button
                        type='button'
                        onClick={() => navigate(pin.href)}
                        className='mt-2 text-xs font-medium text-indigo-600 hover:underline'
                      >
                        View listing →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        </div>

        {!loading && !unlocked && (
          <div className='absolute inset-0 z-[1] flex items-center justify-center bg-black/35 backdrop-blur-[1px] p-4'>
            <div className='max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 text-center'>
              <div className='mx-auto w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center mb-3'>
                <Lock className='w-6 h-6 text-indigo-600 dark:text-indigo-300' />
              </div>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>Pins are locked</h2>
              <p className='text-sm text-gray-600 dark:text-gray-400 mt-2'>
                {pinCount > 0
                  ? `${pinCount} vacant area${pinCount === 1 ? '' : 's'} on the map. Unlock a browsing pass to see approximate pins.`
                  : 'No pinned vacancies yet. Landlords and agents can add an approximate map pin when listing.'}
              </p>
              <div className='mt-5 flex flex-col sm:flex-row gap-2 justify-center'>
                {user ? (
                  <button
                    type='button'
                    onClick={() => setShowPay(true)}
                    className='inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium'
                  >
                    <Unlock className='w-4 h-4' /> Unlock map pins
                  </button>
                ) : (
                  <button
                    type='button'
                    onClick={() => openSignIn({ redirectUrl: `${location.pathname}${location.search}${location.hash}` })}
                    className='inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium'
                  >
                    Sign in to unlock
                  </button>
                )}
                <button
                  type='button'
                  onClick={() => navigate('/rooms')}
                  className='inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200'
                >
                  <MapPin className='w-4 h-4' /> Browse houses
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className='absolute inset-0 z-[1] flex items-center justify-center bg-white/50 dark:bg-gray-900/50'>
            <div className='w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin' />
          </div>
        )}
      </div>

      {error && (
        <p className='mt-3 text-sm text-red-600 dark:text-red-400'>{error}</p>
      )}

      {unlocked && !loading && pins.length === 0 && (
        <p className='mt-3 text-sm text-gray-500 dark:text-gray-400'>
          No approximate pins yet. Listings need a map pin when posting.
        </p>
      )}

      {showPay && (
        <PaymentModal
          property={mapProperty}
          onClose={() => setShowPay(false)}
          onSuccess={() => {
            setShowPay(false);
            loadPins();
          }}
          isFreeUnlockProp={false}
        />
      )}
    </div>
  );
}
