'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapPolygon,
  MapRoute,
  type MapRef,
} from '@/components/ui/map';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShoppingBag,
  Navigation2,
  Loader2,
  MapPin,
  Footprints,
  X,
  LocateFixed,
  Search,
  ChevronDown,
  Locate,
  Route as RouteIcon,
  Trash2,
  ExternalLink,
  Star,
  Home as HomeIcon,
} from 'lucide-react';
import { MapMonumentIcon } from '@/components/ui/map-icons';
import { MapClickHandler } from '@/components/map-click-handler';
import { getWalkingRoute, type RouteData } from '@/lib/osrm';
import { ROME_CENTER, SIGHTS, ALYA_SHOPPING, HOME_LOCATION } from '@/lib/data';

// ── Constants ────────────────────────────────────────────────────────────
const AVG_WALK_SPEED_KMH = 4.5;

// ── Utility Functions ────────────────────────────────────────────────────
function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function formatTime(seconds: number): string {
  const min = Math.round(seconds / 60);
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  return `${min} min`;
}

/** Haversine distance between two [lng, lat] points */
function haversineDistance(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Calculate walk time from distance at 4.5 km/h */
function walkTimeFromDistance(meters: number): number {
  return meters / ((AVG_WALK_SPEED_KMH * 1000) / 3600); // seconds
}

// ── Types ────────────────────────────────────────────────────────────────
type PinMode = 'idle' | 'setA' | 'setB';

// ══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════
export default function Home() {
  const mapRef = useRef<MapRef>(null);
  // ── A/B Routing State ──────────────────────────────────────────────────
  const [pinA, setPinA] = useState<[number, number] | null>(null);
  const [pinB, setPinB] = useState<[number, number] | null>(null);
  const [pinBName, setPinBName] = useState<string | null>(null);
  const [pinMode, setPinMode] = useState<PinMode>('idle');
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  // ── GPS State ──────────────────────────────────────────────────────────
  const [gpsLocation, setGpsLocation] = useState<[number, number] | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // ── UI State ───────────────────────────────────────────────────────────
  const [selectedSight, setSelectedSight] = useState<any>(null);
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [selectedHome, setSelectedHome] = useState<typeof HOME_LOCATION | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [routePanelDismissed, setRoutePanelDismissed] = useState(false);

  const pinModeRef = useRef(pinMode);
  pinModeRef.current = pinMode;
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Derived ────────────────────────────────────────────────────────────
  const hasAnyPin = pinA !== null || pinB !== null;

  const straightLine = pinA && pinB ? haversineDistance(pinA, pinB) : 0;

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const allLocations = [...SIGHTS, ...ALYA_SHOPPING, HOME_LOCATION];
    return allLocations.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s as any).description?.toLowerCase().includes(q) ||
        (s as any).address?.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  // ── Handlers ───────────────────────────────────────────────────────────

  /** Clear entire route */
  const handleClearRoute = useCallback(() => {
    setPinA(null);
    setPinB(null);
    setPinBName(null);
    setRouteData(null);
    setIsRouting(false);
    setPinMode('idle');
    setRoutePanelDismissed(false);
  }, []);

  /** GPS locate */
  const handleLocate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [
          pos.coords.longitude,
          pos.coords.latitude,
        ];
        setGpsLocation(coords);
        setIsLocating(false);
        mapRef.current?.flyTo({
          center: coords,
          zoom: 15,
          duration: 1500,
          essential: true,
        });
      },
      (err) => {
        const messages: Record<number, string> = {
          1: 'Location access denied. Please enable GPS in your browser settings.',
          2: 'Position unavailable. Try again in a moment.',
          3: 'Location request timed out. Please try again.',
        };
        setGpsError(messages[err.code] || 'Could not get your location.');
        setIsLocating(false);
        // Auto-dismiss error after 5s
        setTimeout(() => setGpsError(null), 5000);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  /** Set a location as pin A (start) */
  const handleSetA = useCallback((coords: [number, number]) => {
    setPinA(coords);
    setPinMode('idle');
    setRoutePanelDismissed(false);
  }, []);

  /** Set a location as pin B (end) */
  const handleSetB = useCallback((coords: [number, number], name?: string) => {
    setPinB(coords);
    setPinBName(name || null);
    setPinMode('idle');
    setRoutePanelDismissed(false);
  }, []);

  /** "Walk To" from sight/shop — sets B and also auto-sets A from GPS if available */
  const handleWalkTo = useCallback(
    (name: string, coords: [number, number]) => {
      handleSetB(coords, name);
      if (!pinA && gpsLocation) {
        handleSetA(gpsLocation);
      }
    },
    [pinA, gpsLocation, handleSetA, handleSetB],
  );

  /** "Start Here" from sight/shop */
  const handleStartHere = useCallback(
    (coords: [number, number]) => {
      handleSetA(coords);
    },
    [handleSetA],
  );

  /** "Use GPS as Start" */
  const handleUseGpsAsStart = useCallback(() => {
    if (gpsLocation) {
      handleSetA(gpsLocation);
    }
  }, [gpsLocation, handleSetA]);

  /** Map click handler for pin placement */
  const handleMapClick = useCallback(
    (lngLat: { lng: number; lat: number }) => {
      setSelectedSight(null);
      setSelectedShop(null);

      const mode = pinModeRef.current;
      if (mode === 'idle') return;

      const coords: [number, number] = [lngLat.lng, lngLat.lat];
      if (mode === 'setA') {
        handleSetA(coords);
      } else if (mode === 'setB') {
        handleSetB(coords);
      }
    },
    [handleSetA, handleSetB],
  );

  /** Pin A drag end */
  const handlePinADragEnd = useCallback(
    (lngLat: { lng: number; lat: number }) => {
      setPinA([lngLat.lng, lngLat.lat]);
    },
    [],
  );

  /** Pin B drag end */
  const handlePinBDragEnd = useCallback(
    (lngLat: { lng: number; lat: number }) => {
      setPinB([lngLat.lng, lngLat.lat]);
    },
    [],
  );

  /** Search result click */
  const handleSearchResultClick = useCallback((item: any) => {
    // Fly to + select the sight or shop
    mapRef.current?.flyTo({
      center: item.coords,
      zoom: 16,
      duration: 1500,
      essential: true,
    });

    const isShop = typeof item.id === 'string' && item.id.startsWith('z');
    const isHome = item.id === 'home';

    if (isShop) {
      setSelectedShop(item);
      setSelectedSight(null);
      setSelectedHome(null);
    } else if (isHome) {
      setSelectedShop(null);
      setSelectedSight(null);
      setSelectedHome(HOME_LOCATION);
    } else {
      setSelectedSight(item);
      setSelectedShop(null);
      setSelectedHome(null);
    }

    setPinMode('idle');
    setSearchQuery('');
    setSearchOpen(false);
  }, []);

  // ── Auto-fetch route when both pins set ────────────────────────────────
  useEffect(() => {
    if (!pinA || !pinB) {
      setRouteData(null);
      return;
    }
    let cancelled = false;

    const run = async () => {
      setIsRouting(true);
      const data = await getWalkingRoute(pinA, pinB);
      if (!cancelled) {
        setRouteData(data);
        setIsRouting(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [pinA, pinB]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <main className='relative h-[100dvh] w-full overflow-hidden bg-white text-zinc-900'>
      {/* ═══════════ MAP ═══════════ */}
      <Map
        ref={mapRef}
        center={ROME_CENTER}
        zoom={13.5}
        theme='light'
        className='absolute inset-0 w-full h-full z-0'
      >
        <MapControls
          showZoom
          showLocate
          show3D
          showFullscreen
          position='bottom-right'
        />
        <MapClickHandler
          enabled={pinMode !== 'idle'}
          onMapClick={handleMapClick}
        />

        {/* Route Polyline */}
        {routeData && (
          <MapRoute
            coordinates={routeData.geometry}
            id='walking-route'
            color='#3b82f6'
            width={5}
          />
        )}

        {/* Pin A — orange draggable start */}
        {pinA && (
          <MapMarker
            longitude={pinA[0]}
            latitude={pinA[1]}
            draggable
            onDragEnd={handlePinADragEnd}
          >
            <MarkerContent>
              <div className='relative cursor-grab active:cursor-grabbing'>
                <div className='size-8 rounded-full bg-orange-400/25 absolute -inset-1.5 animate-ping' />
                <div className='size-6 rounded-full bg-orange-500 border-[3px] border-white shadow-xl flex items-center justify-center relative z-10'>
                  <span className='text-[10px] font-black text-white leading-none'>
                    A
                  </span>
                </div>
              </div>
            </MarkerContent>
            <MarkerPopup className='bg-white p-2 text-center min-w-[100px]'>
              <div className='text-xs font-bold text-orange-600'>
                📍 Start (A)
              </div>
              <div className='text-[10px] text-zinc-400 mt-0.5'>
                Drag to reposition
              </div>
            </MarkerPopup>
          </MapMarker>
        )}

        {/* Pin B — blue draggable end */}
        {pinB && (
          <MapMarker
            longitude={pinB[0]}
            latitude={pinB[1]}
            draggable
            onDragEnd={handlePinBDragEnd}
          >
            <MarkerContent>
              <div className='relative cursor-grab active:cursor-grabbing'>
                <div className='size-8 rounded-full bg-blue-400/25 absolute -inset-1.5 animate-ping' />
                <div className='size-6 rounded-full bg-blue-600 border-[3px] border-white shadow-xl flex items-center justify-center relative z-10'>
                  <span className='text-[10px] font-black text-white leading-none'>
                    B
                  </span>
                </div>
              </div>
            </MarkerContent>
            <MarkerPopup className='bg-white p-2 text-center min-w-[100px]'>
              <div className='text-xs font-bold text-blue-600'>
                🏁 End (B){pinBName ? `: ${pinBName}` : ''}
              </div>
              <div className='text-[10px] text-zinc-400 mt-0.5'>
                Drag to reposition
              </div>
            </MarkerPopup>
          </MapMarker>
        )}

        {/* GPS Location — pulsating radar marker */}
        {gpsLocation && (
          <MapMarker longitude={gpsLocation[0]} latitude={gpsLocation[1]}>
            <MarkerContent>
              <div className='relative flex items-center justify-center'>
                {/* Outer ping ring */}
                <div className='absolute size-10 rounded-full bg-blue-500/15 animate-ping' />
                {/* Middle pulse ring */}
                <div className='absolute size-7 rounded-full bg-blue-500/25 animate-pulse' />
                {/* Solid core dot */}
                <div className='relative size-3.5 rounded-full bg-blue-600 border-2 border-white shadow-lg z-10' />
              </div>
            </MarkerContent>
            <MarkerPopup className='bg-white p-2.5 text-center min-w-[120px] rounded-xl shadow-lg'>
              <div className='text-xs font-bold text-blue-600 mb-1.5'>
                📡 Your Location
              </div>
              <button
                onClick={handleUseGpsAsStart}
                className='w-full text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg transition-colors'
              >
                Use as Start (A)
              </button>
            </MarkerPopup>
          </MapMarker>
        )}

        {/* Sights */}
        {SIGHTS.map((sight) => (
          <MapMarker
            key={sight.id}
            longitude={sight.coords[0]}
            latitude={sight.coords[1]}
            onClick={(e) => {
              // @ts-ignore
              e.originalEvent?.stopPropagation();
              setSelectedSight(sight);
              setSelectedShop(null);
              setSelectedHome(null);
              setPinMode('idle');
              mapRef.current?.flyTo({
                center: sight.coords,
                zoom: 16,
                essential: true,
              });
            }}
          >
            <MarkerContent>
              <MapMonumentIcon
                type={sight.iconType}
                name={sight.name}
                isActive={selectedSight?.id === sight.id}
              />
            </MarkerContent>
          </MapMarker>
        ))}

        {/* Shopping Locations */}
        {ALYA_SHOPPING.map((shop) => (
          <MapMarker
            key={shop.id}
            longitude={shop.coords[0]}
            latitude={shop.coords[1]}
            onClick={(e) => {
              // @ts-ignore
              e.originalEvent?.stopPropagation();
              setSelectedShop(shop);
              setSelectedSight(null);
              setSelectedHome(null);
              setPinMode('idle');
              mapRef.current?.flyTo({
                center: shop.coords,
                zoom: 16,
                essential: true,
              });
            }}
          >
            <MarkerContent>
              <div
                className={`relative flex flex-col items-center group transition-all duration-300 ${selectedShop?.id === shop.id ? 'scale-110 z-50' : 'z-10'}`}
              >
                {/* Shop Icon (Circular Blue for Shopping) */}
                <div
                  className={`
                    flex items-center justify-center 
                    w-7 h-7 rounded-full 
                    shadow-[0_2px_4px_rgba(0,0,0,0.3)] 
                    border-[1.5px] border-white
                    transition-all duration-300
                    ${selectedShop?.id === shop.id ? 'bg-blue-600 scale-110 shadow-blue-500/20' : 'bg-blue-500 group-hover:bg-blue-600'}
                  `}
                >
                  <ShoppingBag className='size-3.5 text-white' />
                </div>

                {/* Label */}
                <div className='mt-1 flex flex-col items-center pointer-events-none'>
                  <span
                    className='text-[10px] font-black text-blue-900 leading-tight text-center'
                    style={{
                      textShadow:
                        '-1.5px -1.5px 0 #fff, 1.5px -1.5px 0 #fff, -1.5px 1.5px 0 #fff, 1.5px 1.5px 0 #fff',
                    }}
                  >
                    {shop.name.split(' ')[0]} {/* Shorter label for shops */}
                  </span>
                </div>

                {selectedShop?.id === shop.id && (
                  <div className='absolute -bottom-1 left-1/2 -translate-x-1/2 w-0.5 h-1 bg-blue-600 rounded-full' />
                )}
              </div>
            </MarkerContent>
          </MapMarker>
        ))}

        {/* Home Location */}
        <MapMarker
          longitude={HOME_LOCATION.coords[0]}
          latitude={HOME_LOCATION.coords[1]}
          onClick={(e) => {
            // @ts-ignore
            e.originalEvent?.stopPropagation();
            mapRef.current?.flyTo({
              center: HOME_LOCATION.coords,
              zoom: 16,
              duration: 1500,
              essential: true,
            });
            setSelectedSight(null);
            setSelectedShop(null);
            setSelectedHome(HOME_LOCATION);
            setPinMode('idle');
          }}
        >
          <MarkerContent>
            <div className='relative flex flex-col items-center group cursor-pointer transition-all duration-300'>
              <div className='bg-rose-600 p-2 rounded-full shadow-lg border-2 border-white group-hover:bg-rose-700 transition-colors'>
                <HomeIcon className='size-3.5 text-white' />
              </div>
              <div className='mt-1 flex flex-col items-center pointer-events-none'>
                <span
                  className='text-[10px] font-black text-rose-900 leading-tight text-center'
                  style={{
                    textShadow:
                      '-1.5px -1.5px 0 #fff, 1.5px -1.5px 0 #fff, -1.5px 1.5px 0 #fff, 1.5px 1.5px 0 #fff',
                  }}
                >
                  LA NOSTRA CASA
                </span>
              </div>
            </div>
          </MarkerContent>
        </MapMarker>
      </Map>

      {/* ═══════════ OVERLAY UI ═══════════ */}
      <div className='pointer-events-none absolute inset-0 z-10 flex flex-col justify-between overflow-hidden'>
        {/* ── TOP REGION ── */}
        <div className='flex flex-col items-center pt-4 px-4 sm:px-8 gap-3'>
          {/* Header */}
          <header className='pointer-events-auto w-full max-w-6xl flex items-center justify-between px-4 sm:px-6 py-1 rounded-[2rem] bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.04)] ring-1 ring-black/2 isolate'>
            <div className='flex items-center gap-3'>
              <div className='bg-linear-to-br from-orange-600 to-rose-600 p-2.5 rounded-2xl shadow-lg shadow-orange-500/20'>
                <MapPin className='size-3 text-white' />
              </div>
              <div className='flex flex-col'>
                <h1 className='text-lg sm:text-xl uppercase font-black tracking-tight text-slate-800 leading-none'>
                  Rome Explorer
                </h1>
                <span className='text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5'>
                  Personalised for Donna Alevtisia
                </span>
              </div>
            </div>

            <div className='flex items-center gap-4'>
              <Badge
                variant='outline'
                className='border-zinc-200 text-zinc-500 bg-white/50 px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full'
              >
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Badge>
            </div>
          </header>

          {/* ── Search Bar ── */}
          <div
            className={`pointer-events-auto self-start relative z-30 transition-all duration-300 ease-in-out ${
              isSearchFocused || searchQuery
                ? 'w-full max-w-md'
                : 'w-11 sm:w-full sm:max-w-md'
            }`}
          >
            <div className='relative'>
              <div
                className={`flex items-center bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-white/60 ring-1 ring-black/5 h-11 transition-all duration-300 ${
                  isSearchFocused || searchQuery ? 'px-4 gap-2.5' : 'px-3 gap-0'
                }`}
              >
                <Search
                  className='size-4 text-slate-400 shrink-0 cursor-pointer'
                  onClick={() => searchInputRef.current?.focus()}
                />
                <input
                  ref={searchInputRef}
                  type='text'
                  placeholder='Search sights...'
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => {
                    setSearchOpen(true);
                    setIsSearchFocused(true);
                  }}
                  onBlur={() => setIsSearchFocused(false)}
                  className={`flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-opacity duration-200 ${
                    isSearchFocused || searchQuery
                      ? 'opacity-100 w-full'
                      : 'opacity-0 w-0 pointer-events-none sm:opacity-100 sm:w-full sm:pointer-events-auto'
                  }`}
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchOpen(false);
                    }}
                    className='p-0.5 hover:bg-slate-100 rounded-full transition-colors'
                  >
                    <X className='size-3.5 text-slate-400' />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {searchOpen && searchResults.length > 0 && (
                <div className='absolute top-full left-0 right-0 mt-1.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/60 ring-1 ring-black/5 overflow-hidden max-h-64 overflow-y-auto'>
                  {searchResults.map((item) => {
                    const dist = gpsLocation
                      ? haversineDistance(gpsLocation, item.coords)
                      : null;
                    const isShop =
                      typeof item.id === 'string' && item.id.startsWith('z');

                    return (
                      <button
                        key={item.id}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          handleSearchResultClick(item);
                        }}
                        className='w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-b-0'
                      >
                        <div className='shrink-0'>
                          {isShop ? (
                            <div className='bg-blue-500 p-2 rounded-xl shadow-sm'>
                              <ShoppingBag className='size-3.5 text-white' />
                            </div>
                          ) : (item as any).id === 'home' ? (
                            <div className='bg-rose-600 p-2 rounded-full shadow-sm'>
                              <HomeIcon className='size-3.5 text-white' />
                            </div>
                          ) : (
                            <MapMonumentIcon
                              type={(item as any).iconType}
                              name={item.name}
                              isActive={false}
                            />
                          )}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm font-bold text-slate-800 truncate'>
                            {item.name}
                          </p>
                          <p className='text-[11px] text-slate-400 truncate'>
                            {(item as any).description || (item as any).address}
                          </p>
                        </div>
                        {dist !== null && (
                          <span className='shrink-0 text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full'>
                            {formatDistance(dist)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── A/B Pin Buttons + Locate + Clear ── */}
          <div className='pointer-events-auto flex items-center gap-2 self-start'>
            {/* Set A Button */}
            <button
              onClick={() => setPinMode(pinMode === 'setA' ? 'idle' : 'setA')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold shadow-lg transition-all duration-200 border ${
                pinMode === 'setA'
                  ? 'bg-orange-500 text-white border-orange-400 shadow-orange-500/30 scale-105'
                  : 'bg-white/90 backdrop-blur-md text-orange-600 border-white/60 hover:bg-orange-50'
              }`}
            >
              <div
                className={`size-4 rounded-full flex items-center justify-center text-[9px] font-black border-2 ${
                  pinMode === 'setA'
                    ? 'bg-white text-orange-500 border-white'
                    : 'bg-orange-500 text-white border-orange-400'
                }`}
              >
                A
              </div>
              Set Start
            </button>

            {/* Set B Button */}
            <button
              onClick={() => setPinMode(pinMode === 'setB' ? 'idle' : 'setB')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold shadow-lg transition-all duration-200 border ${
                pinMode === 'setB'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-blue-600/30 scale-105'
                  : 'bg-white/90 backdrop-blur-md text-blue-600 border-white/60 hover:bg-blue-50'
              }`}
            >
              <div
                className={`size-4 rounded-full flex items-center justify-center text-[9px] font-black border-2 ${
                  pinMode === 'setB'
                    ? 'bg-white text-blue-600 border-white'
                    : 'bg-blue-600 text-white border-blue-500'
                }`}
              >
                B
              </div>
              Set End
            </button>

            {/* Locate Button */}
            <button
              onClick={handleLocate}
              disabled={isLocating}
              className='flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-md text-slate-600 border border-white/60 shadow-lg hover:bg-slate-50 transition-all disabled:opacity-50'
            >
              {isLocating ? (
                <Loader2 className='size-3.5 animate-spin' />
              ) : (
                <Locate className='size-3.5' />
              )}
              <span className='hidden sm:inline'>Locate</span>
            </button>

            {/* Clear Button */}
            {hasAnyPin && (
              <button
                onClick={handleClearRoute}
                className='flex items-center gap-1 px-3 py-2 rounded-full text-[11px] font-bold bg-white border border-red-200 text-red-500 shadow-lg hover:bg-red-50 transition-all animate-in fade-in zoom-in-95 duration-200'
              >
                <Trash2 className='size-3' />
                Clear
              </button>
            )}
          </div>

          {/* ── Desktop Route Info Panel (md+) ── */}
          {(routeData || isRouting) && !routePanelDismissed && (
            <div className='pointer-events-auto hidden md:block self-start w-80 animate-in slide-in-from-top-4 duration-300'>
              <div className='bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden'>
                <div className='px-4 py-3 border-b border-black/5 flex items-center justify-between'>
                  <div className='flex items-center gap-2 overflow-hidden'>
                    <div className='bg-blue-600 p-1.5 rounded-md shadow-sm shrink-0'>
                      <Navigation2 className='size-3.5 text-white' />
                    </div>
                    <span className='font-bold text-[13px] text-slate-800 truncate'>
                      {pinBName || 'Walking Route'}
                    </span>
                  </div>
                  <button
                    onClick={() => setRoutePanelDismissed(true)}
                    className='p-1.5 hover:bg-black/5 rounded-full text-slate-400 hover:text-slate-600 transition-colors'
                  >
                    <X className='size-4' />
                  </button>
                </div>

                <div className='p-4'>
                  {isRouting ? (
                    <div className='flex items-center justify-center py-6 gap-3 text-slate-400'>
                      <Loader2 className='size-5 animate-spin' />
                      <span className='text-sm font-medium animate-pulse'>
                        Plotting your walk…
                      </span>
                    </div>
                  ) : routeData ? (
                    <RouteInfoContent
                      routeData={routeData}
                      straightLine={straightLine}
                      pinBName={pinBName}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── BOTTOM REGION ── */}
        <div className='pointer-events-auto w-full pb-6 px-4 sm:px-8 mt-auto flex flex-col items-center relative z-20'>
          {/* GPS Error Toast */}
          {gpsError && (
            <div className='w-full max-w-sm mb-3 animate-in slide-in-from-bottom-4 duration-300'>
              <div className='flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl shadow-lg'>
                <LocateFixed className='size-4 shrink-0 mt-0.5' />
                <p className='text-xs font-medium flex-1'>{gpsError}</p>
                <button
                  onClick={() => setGpsError(null)}
                  className='p-0.5 hover:bg-red-100 rounded transition-colors'
                >
                  <X className='size-3.5' />
                </button>
              </div>
            </div>
          )}

          {/* Mobile Bottom Sheet (route info, below md) */}
          {(routeData || isRouting) && !routePanelDismissed && (
            <div className='w-full max-w-[24rem] md:hidden mb-3 animate-in slide-in-from-bottom-4 duration-300'>
              <div className='bg-white/95 backdrop-blur-xl rounded-t-3xl rounded-b-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden'>
                {/* Drag handle */}
                <div className='flex justify-center pt-2 pb-1'>
                  <div className='w-10 h-1 bg-slate-300 rounded-full' />
                </div>

                <div className='px-4 py-2 border-b border-black/5 flex items-center justify-between'>
                  <div className='flex items-center gap-2 overflow-hidden'>
                    <div className='bg-blue-600 p-1.5 rounded-md shadow-sm shrink-0'>
                      <Navigation2 className='size-3.5 text-white' />
                    </div>
                    <span className='font-bold text-[13px] text-slate-800 truncate'>
                      {pinBName || 'Walking Route'}
                    </span>
                  </div>
                  <button
                    onClick={() => setRoutePanelDismissed(true)}
                    className='p-1.5 hover:bg-black/5 rounded-full text-slate-400 hover:text-slate-600 transition-colors'
                  >
                    <ChevronDown className='size-4' />
                  </button>
                </div>

                <div className='p-4'>
                  {isRouting ? (
                    <div className='flex items-center justify-center py-4 gap-3 text-slate-400'>
                      <Loader2 className='size-5 animate-spin' />
                      <span className='text-sm font-medium animate-pulse'>
                        Plotting your walk…
                      </span>
                    </div>
                  ) : routeData ? (
                    <RouteInfoContent
                      routeData={routeData}
                      straightLine={straightLine}
                      pinBName={pinBName}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* Selected Sight Card */}
          {selectedSight ? (
            <Card className='w-full max-w-[24rem] rounded-[2rem] overflow-hidden shadow-2xl bg-white border-none ring-1 ring-black/5 animate-in slide-in-from-bottom-8 duration-300'>
              <div className='relative h-40 sm:h-48 w-full group'>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedSight.image}
                  alt={selectedSight.name}
                  className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-105'
                />
                <div className='absolute inset-0 bg-linear-to-t from-black/60 to-transparent' />
                <Badge
                  variant={selectedSight.isFree ? 'secondary' : 'destructive'}
                  className='absolute top-3 right-3 text-[9px] font-black px-2 py-0.5 h-5 bg-white/20 backdrop-blur-md border-white/30 text-white leading-none'
                >
                  {selectedSight.isFree ? 'FREE ENTRY' : 'PREMIUM'}
                </Badge>
                <button
                  onClick={() => setSelectedSight(null)}
                  className='absolute top-3 left-3 bg-white/20 backdrop-blur-md rounded-full p-2 text-white/90 shadow-sm ring-1 ring-white/30 hover:bg-white/40 hover:text-white transition-all scale-100 hover:scale-105 active:scale-95 leading-none flex items-center justify-center'
                >
                  <X className='size-4' />
                </button>
                <div className='absolute bottom-4 left-4 right-4'>
                  <div className='flex items-center gap-2 mb-1.5'>
                    <h3 className='font-black text-xl text-white tracking-tight leading-tight'>
                      {selectedSight.name}
                    </h3>
                    {(selectedSight as any).tripadvisorRating && (
                      <Badge className='bg-emerald-500/90 text-white border-none text-[8px] font-black px-1.5 py-0.5 h-auto leading-none'>
                        {(selectedSight as any).tripadvisorRating >= 4.5
                          ? 'EXCEPTIONAL'
                          : 'TOP RATED'}
                      </Badge>
                    )}
                  </div>
                  {/* Rating info */}
                  {(selectedSight as any).tripadvisorRating && (
                    <div className='flex items-center gap-2 mb-2'>
                      <div className='flex items-center gap-0.5'>
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`size-2.5 ${
                              i <
                              Math.floor(
                                (selectedSight as any).tripadvisorRating,
                              )
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-white/20'
                            }`}
                          />
                        ))}
                      </div>
                      <span className='text-[10px] font-black text-white/90 tabular-nums'>
                        {(selectedSight as any).tripadvisorRating}
                      </span>
                    </div>
                  )}
                  {/* Near Me distance */}
                  {gpsLocation && (
                    <span className='inline-flex items-center gap-1 text-[10px] font-bold text-white/80 bg-white/15 backdrop-blur-md px-2 py-0.5 rounded-full'>
                      <Locate className='size-2.5' />
                      {formatDistance(
                        haversineDistance(gpsLocation, selectedSight.coords),
                      )}{' '}
                      from you
                    </span>
                  )}
                </div>
              </div>
              <div className='p-5 sm:p-6 bg-white'>
                <p className='text-slate-600 text-[13px] leading-relaxed mb-4 italic font-medium'>
                  &quot;{selectedSight.description}&quot;
                </p>

                {/* TripAdvisor Link */}
                {(selectedSight as any).tripadvisorUrl && (
                  <a
                    href={(selectedSight as any).tripadvisorUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-6 border-b border-emerald-100 hover:border-emerald-600 transition-all pb-0.5'
                  >
                    <ExternalLink className='size-3' />
                    Visit on TripAdvisor
                  </a>
                )}
                <div className='flex gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    className='flex-1 h-9 sm:h-10 text-[11px] font-bold rounded-xl border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm'
                    onClick={() => handleStartHere(selectedSight.coords)}
                  >
                    <MapPin className='size-3.5 mr-1.5 text-orange-500' /> Start
                    Here
                  </Button>
                  <Button
                    size='sm'
                    className='flex-1 h-9 sm:h-10 text-[11px] font-bold rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25'
                    onClick={() => {
                      handleWalkTo(selectedSight.name, selectedSight.coords);
                      setSelectedSight(null);
                    }}
                  >
                    <Footprints className='size-3.5 mr-1.5' /> Walk To
                  </Button>
                </div>
              </div>
            </Card>
          ) : selectedShop ? (
            <Card className='w-full max-w-[24rem] rounded-[2rem] overflow-hidden shadow-2xl bg-white border-none ring-1 ring-black/5 animate-in slide-in-from-bottom-8 duration-300'>
              {(selectedShop as any).image ? (
                <div className='relative h-40 sm:h-48 w-full group'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={(selectedShop as any).image}
                    alt={selectedShop.name}
                    className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-105'
                  />
                  <div className='absolute inset-0 bg-linear-to-t from-black/60 to-transparent' />
                  <Badge className='absolute top-3 right-3 bg-white/90 text-black text-[9px] font-black tracking-widest px-1.5 py-0.5 h-auto leading-none border-none shadow-md'>
                    LIMITED ED
                  </Badge>
                  <button
                    onClick={() => setSelectedShop(null)}
                    className='absolute top-3 left-3 bg-white/20 backdrop-blur-md rounded-full p-2 text-white/90 shadow-sm ring-1 ring-white/30 hover:bg-white/40 hover:text-white transition-all scale-100 hover:scale-105 active:scale-95 leading-none flex items-center justify-center'
                  >
                    <X className='size-4' />
                  </button>
                  <div className='absolute bottom-4 left-4 right-4'>
                    <div className='flex items-center gap-3'>
                      <div className='bg-white/20 p-2 rounded-xl backdrop-blur-md shadow-inner border border-white/20'>
                        <ShoppingBag className='size-4 text-white' />
                      </div>
                      <div className='flex flex-col'>
                        <h3 className='font-black text-lg text-white tracking-tight leading-tight italic'>
                          {selectedShop.name}
                        </h3>
                        {gpsLocation && (
                          <span className='text-[10px] font-bold text-white/70'>
                            {formatDistance(
                              haversineDistance(
                                gpsLocation,
                                selectedShop.coords,
                              ),
                            )}{' '}
                            away
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='bg-black p-4 sm:p-5 flex items-center justify-between relative text-white group'>
                  <div className='absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none' />
                  <div className='flex items-center gap-3'>
                    <div className='bg-white/20 p-2.5 rounded-xl backdrop-blur-md shadow-inner'>
                      <ShoppingBag className='size-4.5 text-white' />
                    </div>
                    <div className='flex flex-col'>
                      <h3 className='font-black text-sm sm:text-base uppercase italic tracking-[0.2em] text-white pr-4'>
                        {selectedShop.name}
                      </h3>
                      <div className='flex items-center gap-2 mt-1'>
                        <Badge className='bg-white/90 text-black text-[8px] sm:text-[9px] font-black tracking-widest px-1.5 py-0 w-fit shadow-sm'>
                          LIMITED ED
                        </Badge>
                        {gpsLocation && (
                          <span className='text-[9px] font-bold text-white/60'>
                            {formatDistance(
                              haversineDistance(
                                gpsLocation,
                                selectedShop.coords,
                              ),
                            )}{' '}
                            away
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedShop(null)}
                    className='absolute top-2 right-2 rounded-full p-1.5 text-white/50 hover:text-white bg-white/0 hover:bg-white/10 transition-all scale-100 hover:scale-105 active:scale-95 flex items-center justify-center'
                  >
                    <X className='size-4' />
                  </button>
                </div>
              )}
              <div className='p-5 sm:p-6 bg-white'>
                <p className='text-zinc-600 text-[13px] italic mb-6 leading-relaxed font-medium'>
                  &quot;{selectedShop.description}&quot;
                </p>
                <div className='flex gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    className='flex-1 h-9 sm:h-10 text-[10px] font-black uppercase tracking-widest rounded-xl border-zinc-200 shadow-sm'
                    onClick={() => handleStartHere(selectedShop.coords)}
                  >
                    <MapPin className='size-3.5 mr-1.5 text-orange-500' /> Start
                  </Button>
                  <Button
                    size='sm'
                    className='flex-1 h-9 sm:h-10 text-[10px] font-black uppercase tracking-widest rounded-xl bg-black text-white hover:bg-zinc-800 shadow-lg shadow-black/20'
                    onClick={() => {
                      handleWalkTo(selectedShop.name, selectedShop.coords);
                      setSelectedShop(null);
                    }}
                  >
                    <Footprints className='size-3.5 mr-1.5' /> Walk To
                  </Button>
                </div>
              </div>
            </Card>
          ) : selectedHome ? (
            <Card className='pointer-events-auto w-full max-w-[24rem] rounded-[2rem] overflow-hidden shadow-2xl bg-white border-none ring-1 ring-black/5 animate-in slide-in-from-bottom-8 duration-300'>
              <div className='p-6 flex flex-col'>
                <div className='flex items-start justify-between mb-1'>
                  <div className='flex items-center gap-3'>
                    <div className='bg-rose-50 p-2.5 rounded-2xl border border-rose-100 shadow-sm'>
                      <HomeIcon className='size-5 text-rose-600' />
                    </div>
                    <div className='flex flex-col'>
                      <h3 className='font-black text-xl text-slate-800 tracking-tight leading-none italic'>
                        {selectedHome.name === 'Home' ? 'La Nostra Casa' : selectedHome.name}
                      </h3>
                      <span className='text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5'>
                        Home sweet home
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedHome(null)}
                    className='bg-slate-50 text-slate-400 hover:text-slate-600 p-2 rounded-full transition-colors'
                  >
                    <X className='size-4' />
                  </button>
                </div>

                <p className='text-xs text-slate-500 font-medium my-5 leading-relaxed italic'>
                  {selectedHome.address}
                </p>

                <div className='flex gap-2.5'>
                  <Button
                    size='sm'
                    variant='outline'
                    className='flex-1 h-11 text-[11px] font-bold rounded-2xl border-slate-200 hover:bg-slate-50 shadow-sm'
                    onClick={() => {
                      handleStartHere(selectedHome.coords);
                      setSelectedHome(null);
                    }}
                  >
                    <MapPin className='size-3.5 mr-1.5 text-rose-500' /> Start Here
                  </Button>
                  <Button
                    size='sm'
                    className='flex-1 h-11 text-[11px] font-bold rounded-2xl bg-slate-900 hover:bg-black text-white shadow-lg shadow-black/10'
                    onClick={() => {
                      handleWalkTo('Home', selectedHome.coords);
                      setSelectedHome(null);
                    }}
                  >
                    <Footprints className='size-3.5 mr-1.5 text-rose-400' /> Walk To Home
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      {/* Click-away layer for search dropdown — z-[5] so it sits BELOW the overlay UI (z-10) */}
      {searchOpen && (
        <div
          className='fixed inset-0 z-5'
          onClick={() => setSearchOpen(false)}
        />
      )}
    </main>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ROUTE INFO CONTENT (shared between desktop card & mobile bottom sheet)
// ══════════════════════════════════════════════════════════════════════════
function RouteInfoContent({
  routeData,
  straightLine,
  pinBName,
}: {
  routeData: RouteData;
  straightLine: number;
  pinBName: string | null;
}) {
  return (
    <div className='space-y-4 animate-in fade-in zoom-in-95 duration-500'>
      <div className='flex items-end justify-between'>
        <div className='space-y-0.5'>
          <p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>
            Walk Time
          </p>
          <p className='text-3xl font-black text-slate-900 tracking-tighter'>
            {formatTime(routeData.durationSeconds)}
          </p>
        </div>
        <div className='text-right space-y-0.5'>
          <p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>
            Distance
          </p>
          <p className='text-lg font-bold text-blue-600 tabular-nums'>
            {formatDistance(routeData.distanceMeters)}
          </p>
        </div>
      </div>

      <div className='relative h-1.5 w-full bg-slate-100 rounded-full overflow-hidden'>
        <div className='absolute inset-0 bg-blue-500/10' />
        <div className='relative h-full bg-linear-to-r from-blue-600 to-blue-400 w-1/4 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]' />
      </div>

      <div className='flex flex-col gap-1'>
        <div className='flex items-center justify-between text-[10px] text-slate-500 font-medium italic'>
          <div className='flex items-center gap-1.5'>
            <Footprints className='size-3 text-blue-400' />
            <span>Street network route</span>
          </div>
          <span>{AVG_WALK_SPEED_KMH} km/h pace</span>
        </div>
        <div className='text-[9px] text-slate-300 flex items-center justify-between border-t border-slate-50 pt-1 mt-1'>
          <span>{formatDistance(straightLine)} straight-line</span>
          <span className='opacity-0'>.</span>
        </div>
      </div>
    </div>
  );
}
