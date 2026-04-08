'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapPolygon,
  MapRoute,
} from '@/components/ui/map';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Navigation2,
  Loader2,
  MapPin,
  Footprints,
  X,
  LocateFixed,
  Search,
  ShoppingBag,
  ChevronDown,
  Radio,
} from 'lucide-react';
import { MapMonumentIcon } from '@/components/ui/map-icons';
import { MapClickHandler } from '@/components/map-click-handler';
import { getWalkingRoute, type RouteData } from '@/lib/osrm';
import {
  ROME_CENTER,
  SIGHTS,
  ALYA_SHOPPING,
  DAY1_ZONE,
  DAY2_ZONE,
  DAY3_ZONE,
} from '@/lib/data';

const AVG_WALK_SPEED_KMH = 5;

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

type PinMode = 'idle' | 'settingA' | 'settingB';

export default function Home() {
  // ── core state ─────────────────────────────────────────────────────
  const [pinA, setPinA] = useState<[number, number] | null>(null);
  const [pinB, setPinB] = useState<{
    name: string;
    coords: [number, number];
  } | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [pinMode, setPinMode] = useState<PinMode>('idle');
  const pinModeRef = useRef<PinMode>('idle');
  pinModeRef.current = pinMode;

  // ── GPS state ──────────────────────────────────────────────────────
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null,
  );
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  // ── search state ───────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // ── day filter ─────────────────────────────────────────────────────
  const [activeDay, setActiveDay] = useState<number | null>(null);

  // ── derived: filtered sights for search ───────────────────────────
  const searchResults =
    searchQuery.trim().length > 0
      ? SIGHTS.filter(
          (s) =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.description.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : [];

  // ── handlers ───────────────────────────────────────────────────────
  const handleResetRoute = useCallback(() => {
    setRouteData(null);
    setPinB(null);
    setIsRouting(false);
    setPinMode('idle');
  }, []);

  const handleFullReset = useCallback(() => {
    setPinA(null);
    setPinB(null);
    setRouteData(null);
    setIsRouting(false);
    setPinMode('idle');
  }, []);

  /** Locate user via GPS */
  const handleLocate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.longitude, pos.coords.latitude]);
        setIsLocating(false);
      },
      () => {
        setLocationError(
          'Could not get your location. Please allow location access.',
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  /** Use GPS location as Point A */
  const handleUseGpsAsA = useCallback(() => {
    if (userLocation) {
      setPinA(userLocation);
      setPinMode('idle');
    }
  }, [userLocation]);

  /** Map tap: drop pin A or B depending on mode */
  const handleMapClick = useCallback((lngLat: { lng: number; lat: number }) => {
    const mode = pinModeRef.current;
    if (mode === 'settingA') {
      setPinA([lngLat.lng, lngLat.lat]);
      setPinMode('idle');
    } else if (mode === 'settingB') {
      setPinB({ name: 'Custom pin', coords: [lngLat.lng, lngLat.lat] });
      setPinMode('idle');
    }
  }, []);

  /** Walk to a named sight */
  const handleWalkTo = useCallback((name: string, coords: [number, number]) => {
    setPinB({ name, coords });
    setSearchQuery('');
    setSearchFocused(false);
  }, []);

  /** Set a location as Point A */
  const handleSetAsA = useCallback((coords: [number, number]) => {
    setPinA(coords);
  }, []);

  /** Pin A drag */
  const handlePinADragEnd = useCallback(
    (lngLat: { lng: number; lat: number }) => {
      setPinA([lngLat.lng, lngLat.lat]);
    },
    [],
  );

  /** Pin B drag */
  const handlePinBDragEnd = useCallback(
    (lngLat: { lng: number; lat: number }) => {
      setPinB((prev) =>
        prev ? { ...prev, coords: [lngLat.lng, lngLat.lat] } : null,
      );
    },
    [],
  );

  // ── fetch route when both pins are set ────────────────────────────
  useEffect(() => {
    if (!pinA || !pinB) return;
    let cancelled = false;
    const run = async () => {
      setIsRouting(true);
      const data = await getWalkingRoute(pinA, pinB.coords);
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

  const straightLine = pinA && pinB ? haversineDistance(pinA, pinB.coords) : 0;

  const routeActive = !!(pinA && pinB);
  const showRoutePanel = routeActive || isRouting;

  return (
    <main className='flex min-h-screen flex-col items-center p-3 md:p-8 bg-[radial-gradient(circle_at_top_right,rgba(255,237,213,0.3),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(255,228,230,0.3),transparent_50%),white] text-zinc-900'>
      {/* ── Header ───────────────────────────────────────────────── */}
      <header className='z-30 sticky top-0 w-full max-w-6xl mb-4 md:mb-8 flex items-center justify-between px-4 py-3 rounded-[2rem] bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.04)] ring-1 ring-black/2'>
        <div className='flex items-center gap-3'>
          <div className='bg-linear-to-br from-orange-600 to-rose-600 p-2.5 rounded-2xl shadow-lg shadow-orange-500/20'>
            <MapPin className='size-5 text-white' />
          </div>
          <div className='flex flex-col'>
            <h1 className='text-lg md:text-xl font-black tracking-tight text-slate-800 leading-none'>
              Rome Explorer
            </h1>
            <span className='text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5'>
              Concierge Alpha
            </span>
          </div>
        </div>
        <div className='flex items-center gap-2 md:gap-4'>
          <div className='hidden md:flex flex-col items-end mr-1'>
            <p className='text-[10px] font-black text-rose-600 uppercase tracking-tighter'>
              Personalized For
            </p>
            <p className='text-sm font-bold text-slate-700 leading-none'>
              Donna Alevtisia
            </p>
          </div>
          <Badge
            variant='outline'
            className='border-zinc-200 text-zinc-500 bg-white/50 px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full'
          >
            APR 2026
          </Badge>
        </div>
      </header>

      {/* ── Map card ─────────────────────────────────────────────── */}
      <div className='w-full max-w-6xl relative'>
        <div className='w-full h-[65vh] md:h-[70vh] rounded-[2rem] md:rounded-[3rem] overflow-hidden border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.12)] bg-white ring-1 ring-black/5 relative'>
          {/* ── Search bar overlay (top-left) ─────────────────────── */}
          <div className='absolute top-4 left-4 z-20 w-[calc(100%-5rem)] md:w-80'>
            <div className='relative'>
              <div className='flex items-center gap-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl ring-1 ring-black/5 px-3 py-2.5'>
                <Search className='size-4 text-slate-400 shrink-0' />
                <input
                  type='text'
                  placeholder='Search sights...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  className='flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none font-medium'
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className='text-slate-300 hover:text-slate-500 transition-colors'
                  >
                    <X className='size-3.5' />
                  </button>
                )}
              </div>

              {/* Search dropdown */}
              {(searchFocused || searchQuery) && searchResults.length > 0 && (
                <div className='absolute top-full mt-2 w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden'>
                  {searchResults.map((sight) => {
                    const dist = userLocation
                      ? haversineDistance(userLocation, sight.coords)
                      : null;
                    return (
                      <button
                        key={sight.id}
                        onMouseDown={() => {
                          handleWalkTo(sight.name, sight.coords);
                          setSearchQuery('');
                        }}
                        className='w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0'
                      >
                        <MapMonumentIcon
                          type={
                            sight.iconType as
                              | 'ruin'
                              | 'temple'
                              | 'fountain'
                              | 'museum'
                              | 'basilica'
                              | 'square'
                              | 'castle'
                          }
                        />
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm font-bold text-slate-800 truncate'>
                            {sight.name}
                          </p>
                          <p className='text-[10px] text-slate-400 truncate'>
                            {sight.description}
                          </p>
                        </div>
                        {dist !== null && (
                          <span className='text-[10px] font-bold text-blue-500 shrink-0'>
                            {formatDistance(dist)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {(searchFocused || searchQuery) &&
                searchQuery.trim().length > 0 &&
                searchResults.length === 0 && (
                  <div className='absolute top-full mt-2 w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-xl ring-1 ring-black/5 px-4 py-3 text-center'>
                    <p className='text-sm text-slate-400 font-medium'>
                      No sights found for "{searchQuery}"
                    </p>
                  </div>
                )}
            </div>
          </div>

          {/* ── Right side controls overlay ────────────────────────── */}
          <div className='absolute top-4 right-4 z-20 flex flex-col gap-2 items-end'>
            {/* GPS locate button */}
            <button
              onClick={handleLocate}
              disabled={isLocating}
              title='Find my location'
              className={`flex items-center gap-1.5 h-9 px-3 rounded-full shadow-lg text-sm font-bold transition-all ${
                isLocating
                  ? 'bg-white/80 text-slate-400 cursor-wait'
                  : userLocation
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-white/95 backdrop-blur-sm text-zinc-700 hover:bg-white'
              }`}
            >
              {isLocating ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <Radio
                  className={`size-4 ${userLocation ? 'animate-pulse' : ''}`}
                />
              )}
              <span className='hidden md:inline'>
                {userLocation ? 'Live' : 'Locate'}
              </span>
            </button>

            {/* Drop Pin A button */}
            <button
              onClick={() =>
                setPinMode(pinMode === 'settingA' ? 'idle' : 'settingA')
              }
              className={`flex items-center gap-1.5 h-9 px-3 rounded-full shadow-lg text-sm font-bold transition-all ${
                pinMode === 'settingA'
                  ? 'bg-orange-500 text-white animate-pulse'
                  : 'bg-white/95 backdrop-blur-sm text-zinc-700 hover:bg-white'
              }`}
            >
              <span className='size-4 rounded-full bg-orange-500 text-white text-[9px] flex items-center justify-center font-black shrink-0'>
                A
              </span>
              <span className='hidden md:inline'>
                {pinMode === 'settingA' ? 'Tap map...' : 'Set Start'}
              </span>
            </button>

            {/* Drop Pin B button */}
            <button
              onClick={() =>
                setPinMode(pinMode === 'settingB' ? 'idle' : 'settingB')
              }
              className={`flex items-center gap-1.5 h-9 px-3 rounded-full shadow-lg text-sm font-bold transition-all ${
                pinMode === 'settingB'
                  ? 'bg-blue-600 text-white animate-pulse'
                  : 'bg-white/95 backdrop-blur-sm text-zinc-700 hover:bg-white'
              }`}
            >
              <span className='size-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-black shrink-0'>
                B
              </span>
              <span className='hidden md:inline'>
                {pinMode === 'settingB' ? 'Tap map...' : 'Set End'}
              </span>
            </button>

            {/* Use GPS as A shortcut */}
            {userLocation && !pinA && (
              <button
                onClick={handleUseGpsAsA}
                className='flex items-center gap-1.5 h-9 px-3 rounded-full shadow-lg text-sm font-bold bg-green-500 text-white hover:bg-green-600 transition-all animate-in fade-in slide-in-from-right-2'
              >
                <LocateFixed className='size-4' />
                <span className='hidden md:inline'>Use My Location</span>
              </button>
            )}

            {/* Clear all */}
            {(pinA || pinB) && (
              <button
                onClick={handleFullReset}
                className='flex items-center gap-1.5 h-8 px-3 rounded-full shadow-lg text-xs font-bold bg-white/90 text-red-500 hover:bg-red-50 border border-red-100 transition-all'
              >
                <X className='size-3' />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* ── The Map ──────────────────────────────────────────── */}
          <Map
            center={ROME_CENTER}
            zoom={13.5}
            theme='light'
            className='w-full h-full'
          >
            <MapControls
              showZoom
              show3D
              showFullscreen
              position='bottom-right'
            />
            <MapClickHandler
              enabled={pinMode === 'settingA' || pinMode === 'settingB'}
              onMapClick={handleMapClick}
            />

            {/* Route Line */}
            {routeData && (
              <MapRoute
                coordinates={routeData.geometry}
                id='walking-route'
                color='#3b82f6'
                width={5}
              />
            )}

            {/* ── GPS / User location marker (pulsating) ─────────── */}
            {userLocation && (
              <MapMarker longitude={userLocation[0]} latitude={userLocation[1]}>
                <MarkerContent>
                  <div className='relative flex items-center justify-center'>
                    {/* outer pulse rings */}
                    <div className='absolute size-12 rounded-full bg-blue-400/20 animate-ping' />
                    <div className='absolute size-8 rounded-full bg-blue-400/30 animate-pulse' />
                    {/* accuracy circle */}
                    <div className='absolute size-14 rounded-full border-2 border-blue-300/40' />
                    {/* core dot */}
                    <div className='relative size-5 rounded-full bg-blue-500 border-[3px] border-white shadow-xl shadow-blue-500/40 z-10' />
                  </div>
                </MarkerContent>
                <MarkerPopup className='bg-white/90 backdrop-blur-md border-none shadow-2xl p-0 overflow-hidden rounded-2xl ring-1 ring-black/5 min-w-[160px]'>
                  <div className='p-3 text-center'>
                    <div className='text-xs font-black text-blue-600 mb-0.5'>
                      📍 You are here
                    </div>
                    <div className='text-[10px] text-slate-400'>
                      Real-time GPS location
                    </div>
                    <button
                      onClick={handleUseGpsAsA}
                      className='mt-2 w-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider py-1.5 rounded-xl hover:bg-blue-700 transition-colors'
                    >
                      Use as Start (A)
                    </button>
                  </div>
                </MarkerPopup>
              </MapMarker>
            )}

            {/* ── Pin A marker ──────────────────────────────────── */}
            {pinA && (
              <MapMarker
                longitude={pinA[0]}
                latitude={pinA[1]}
                draggable
                onDragEnd={handlePinADragEnd}
              >
                <MarkerContent>
                  <div className='relative cursor-grab active:cursor-grabbing flex flex-col items-center'>
                    <div className='size-7 rounded-full bg-orange-500 border-[3px] border-white shadow-xl flex items-center justify-center font-black text-white text-[10px] shadow-orange-500/40'>
                      A
                    </div>
                    <div className='w-0.5 h-2 bg-orange-500/60' />
                  </div>
                </MarkerContent>
                <MarkerPopup className='bg-white/90 backdrop-blur-md border-none shadow-xl p-0 overflow-hidden rounded-2xl ring-1 ring-black/5 min-w-[140px]'>
                  <div className='p-3 text-center'>
                    <div className='text-xs font-black text-orange-500'>
                      🟠 Start Point
                    </div>
                    <div className='text-[10px] text-slate-400 mt-0.5'>
                      Drag to reposition
                    </div>
                  </div>
                </MarkerPopup>
              </MapMarker>
            )}

            {/* ── Pin B marker ──────────────────────────────────── */}
            {pinB && (
              <MapMarker
                longitude={pinB.coords[0]}
                latitude={pinB.coords[1]}
                draggable
                onDragEnd={handlePinBDragEnd}
              >
                <MarkerContent>
                  <div className='relative cursor-grab active:cursor-grabbing flex flex-col items-center'>
                    <div className='size-7 rounded-full bg-blue-600 border-[3px] border-white shadow-xl flex items-center justify-center font-black text-white text-[10px] shadow-blue-600/40'>
                      B
                    </div>
                    <div className='w-0.5 h-2 bg-blue-600/60' />
                  </div>
                </MarkerContent>
                <MarkerPopup className='bg-white/90 backdrop-blur-md border-none shadow-xl p-0 overflow-hidden rounded-2xl ring-1 ring-black/5 min-w-[160px]'>
                  <div className='p-3 text-center'>
                    <div className='text-xs font-black text-blue-600 truncate max-w-[140px]'>
                      🔵 {pinB.name}
                    </div>
                    <div className='text-[10px] text-slate-400 mt-0.5'>
                      Drag to reposition
                    </div>
                  </div>
                </MarkerPopup>
              </MapMarker>
            )}

            {/* Day Zones */}
            {(activeDay === 1 || activeDay === null) && (
              <MapPolygon
                coordinates={DAY1_ZONE}
                fillColor='#ea580c'
                fillOpacity={0}
                strokeColor='#ea580c'
                strokeWidth={2}
                strokeDashArray={[4, 2]}
                id='day1'
              />
            )}
            {(activeDay === 2 || activeDay === null) && (
              <MapPolygon
                coordinates={DAY2_ZONE}
                fillColor='#e11d48'
                fillOpacity={0}
                strokeColor='#e11d48'
                strokeWidth={2}
                strokeDashArray={[4, 2]}
                id='day2'
              />
            )}
            {(activeDay === 3 || activeDay === null) && (
              <MapPolygon
                coordinates={DAY3_ZONE}
                fillColor='#9333ea'
                fillOpacity={0}
                strokeColor='#9333ea'
                strokeWidth={2}
                strokeDashArray={[4, 2]}
                id='day3'
              />
            )}

            {/* Sight markers */}
            {SIGHTS.map((sight) => (
              <MapMarker
                key={sight.id}
                longitude={sight.coords[0]}
                latitude={sight.coords[1]}
              >
                <MarkerContent>
                  <MapMonumentIcon
                    type={
                      sight.iconType as
                        | 'ruin'
                        | 'temple'
                        | 'fountain'
                        | 'museum'
                        | 'basilica'
                        | 'square'
                        | 'castle'
                    }
                  />
                </MarkerContent>
                <MarkerPopup className='bg-white border-none shadow-[0_20px_50px_rgba(0,0,0,0.2)] text-zinc-900 p-0 overflow-hidden w-[260px] rounded-[2rem] ring-1 ring-black/5'>
                  <div className='relative h-28 w-full group'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sight.image}
                      alt={sight.name}
                      className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-110'
                    />
                    <div className='absolute inset-0 bg-linear-to-t from-black/60 to-transparent' />
                    <div className='absolute bottom-2 left-3 right-3 flex items-end justify-between'>
                      <h3 className='font-black text-sm text-white leading-tight'>
                        {sight.name}
                      </h3>
                      <Badge
                        variant={sight.isFree ? 'secondary' : 'destructive'}
                        className='text-[8px] font-black px-1.5 h-4 bg-white/20 backdrop-blur-md border-white/30 text-white shrink-0'
                      >
                        {sight.isFree ? 'FREE' : 'PAID'}
                      </Badge>
                    </div>
                  </div>
                  <div className='p-3'>
                    {userLocation && (
                      <div className='flex items-center gap-1.5 mb-2 text-[10px] text-blue-500 font-bold'>
                        <Radio className='size-3' />
                        {formatDistance(
                          haversineDistance(userLocation, sight.coords),
                        )}{' '}
                        from you
                      </div>
                    )}
                    <p className='text-slate-500 text-[10px] leading-relaxed mb-3 italic line-clamp-2'>
                      "{sight.description}"
                    </p>
                    <div className='flex gap-2'>
                      <Button
                        size='sm'
                        variant='outline'
                        className='flex-1 h-8 text-[10px] font-bold rounded-xl border-slate-200'
                        onClick={() => handleSetAsA(sight.coords)}
                      >
                        <span className='size-3.5 rounded-full bg-orange-500 text-white text-[7px] flex items-center justify-center font-black mr-1'>
                          A
                        </span>
                        Set Start
                      </Button>
                      <Button
                        size='sm'
                        className='flex-1 h-8 text-[10px] font-bold rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25'
                        onClick={() => handleWalkTo(sight.name, sight.coords)}
                      >
                        <Footprints className='size-3 mr-1' /> Walk To
                      </Button>
                    </div>
                  </div>
                </MarkerPopup>
              </MapMarker>
            ))}

            {/* Shopping markers */}
            {ALYA_SHOPPING.map((shop) => (
              <MapMarker
                key={shop.id}
                longitude={shop.coords[0]}
                latitude={shop.coords[1]}
              >
                <MarkerContent>
                  <div className='bg-black text-white p-2 rounded-full shadow-xl border-2 border-white'>
                    <ShoppingBag className='size-3.5' />
                  </div>
                </MarkerContent>
                <MarkerPopup className='bg-white border-none shadow-2xl text-zinc-900 p-0 overflow-hidden w-[240px] rounded-[2rem] ring-1 ring-black/5'>
                  <div className='bg-black p-3 flex items-center gap-3'>
                    <div className='bg-white/20 p-1.5 rounded-xl'>
                      <ShoppingBag className='size-4 text-white' />
                    </div>
                    <h3 className='font-black text-xs uppercase italic tracking-widest text-white'>
                      {shop.name}
                    </h3>
                  </div>
                  <div className='p-3'>
                    <p className='text-zinc-500 text-[10px] italic mb-3 leading-relaxed line-clamp-2'>
                      "{shop.description}"
                    </p>
                    <div className='flex gap-2'>
                      <Button
                        size='sm'
                        variant='outline'
                        className='flex-1 h-8 text-[10px] font-bold rounded-xl'
                        onClick={() => handleSetAsA(shop.coords)}
                      >
                        <span className='size-3.5 rounded-full bg-orange-500 text-white text-[7px] flex items-center justify-center font-black mr-1'>
                          A
                        </span>
                        Start
                      </Button>
                      <Button
                        size='sm'
                        className='flex-1 h-8 text-[10px] font-bold rounded-xl bg-black text-white hover:bg-zinc-800'
                        onClick={() => handleWalkTo(shop.name, shop.coords)}
                      >
                        <Footprints className='size-3 mr-1' /> Walk To
                      </Button>
                    </div>
                  </div>
                </MarkerPopup>
              </MapMarker>
            ))}
          </Map>

          {/* ── Instruction hint when a pin mode is active ─────── */}
          {pinMode !== 'idle' && (
            <div className='absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none'>
              <div
                className={`px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-md text-sm font-bold text-white animate-bounce ${pinMode === 'settingA' ? 'bg-orange-500/90' : 'bg-blue-600/90'}`}
              >
                {pinMode === 'settingA'
                  ? '🟠 Tap anywhere to set Start (A)'
                  : '🔵 Tap anywhere to set End (B)'}
              </div>
            </div>
          )}
        </div>

        {/* ── Route info panel – Desktop: floating top-left of map; Mobile: bottom sheet ── */}
        {showRoutePanel && (
          <>
            {/* Desktop panel */}
            <div className='hidden md:block absolute top-[calc(4rem+1rem)] left-4 z-30 w-72 animate-in fade-in slide-in-from-top-4 duration-300'>
              <RoutePanel
                pinBName={pinB?.name || null}
                isRouting={isRouting}
                routeData={routeData}
                straightLine={straightLine}
                onClose={handleResetRoute}
              />
            </div>

            {/* Mobile bottom sheet */}
            <div className='md:hidden absolute bottom-0 left-0 right-0 z-30 animate-in slide-in-from-bottom-4 duration-300'>
              <MobileRouteSheet
                pinBName={pinB?.name || null}
                isRouting={isRouting}
                routeData={routeData}
                straightLine={straightLine}
                onClose={handleResetRoute}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Location error toast ──────────────────────────────────── */}
      {locationError && (
        <div className='w-full max-w-6xl mt-3 animate-in fade-in slide-in-from-top-2'>
          <div className='flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3'>
            <LocateFixed className='size-4 text-rose-500 shrink-0' />
            <p className='text-xs text-rose-600 font-medium flex-1'>
              {locationError}
            </p>
            <button
              onClick={() => setLocationError('')}
              className='text-rose-300 hover:text-rose-500'
            >
              <X className='size-4' />
            </button>
          </div>
        </div>
      )}

      {/* ── Quick guide pills ─────────────────────────────────────── */}
      {!pinA && !pinB && !showRoutePanel && (
        <div className='w-full max-w-6xl mt-4 flex flex-wrap gap-2 justify-center animate-in fade-in duration-500'>
          {[
            {
              icon: '🟠',
              text: 'Tap "Set Start" or a sight\'s "Set Start" to mark A',
            },
            { icon: '🔵', text: 'Tap "Set End" or "Walk To" to mark B' },
            { icon: '📍', text: 'Tap "Locate" to find your real position' },
            { icon: '🔍', text: 'Search sights by name' },
          ].map((tip, i) => (
            <div
              key={i}
              className='flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-white/50 rounded-full px-3 py-1.5 shadow-sm'
            >
              <span className='text-sm'>{tip.icon}</span>
              <span className='text-[11px] text-slate-500 font-medium'>
                {tip.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Day cards ─────────────────────────────────────────────── */}
      <div className='w-full max-w-6xl mt-10 pb-12'>
        <div className='flex items-center justify-between mb-5 px-1'>
          <div className='space-y-1'>
            <h2 className='text-xl md:text-2xl font-black text-slate-800 tracking-tight'>
              Your 3-Day Pilgrimage
            </h2>
            <p className='text-sm text-slate-500 font-medium italic'>
              Curated for Donna Alevtisia
            </p>
          </div>
          <span className='text-[10px] uppercase font-bold text-slate-400 tracking-widest'>
            Select a day
          </span>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6'>
          {[
            {
              day: 1,
              label: 'Historic Heart',
              sub: 'Pantheon & Piazza Navona',
              img: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=600&auto=format&fit=crop',
              color: 'orange',
            },
            {
              day: 2,
              label: 'Ancient Empire',
              sub: 'Colosseo & Roman Forum',
              img: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?q=80&w=600&auto=format&fit=crop',
              color: 'rose',
            },
            {
              day: 3,
              label: 'Vatican Glory',
              sub: "Museums & St. Peter's",
              img: 'https://images.unsplash.com/photo-1542382257-80dedb725088?q=80&w=600&auto=format&fit=crop',
              color: 'purple',
            },
          ].map(({ day, label, sub, img, color }) => {
            const isActive = activeDay === day;
            const borderCls = isActive
              ? color === 'orange'
                ? 'border-orange-500 ring-4 ring-orange-100 shadow-orange-500/20'
                : color === 'rose'
                  ? 'border-rose-500 ring-4 ring-rose-100 shadow-rose-500/20'
                  : 'border-purple-600 ring-4 ring-purple-100 shadow-purple-600/20'
              : 'border-white/50 grayscale-[0.3] opacity-80 hover:grayscale-0 hover:opacity-100';
            const gradCls = isActive
              ? color === 'orange'
                ? 'from-orange-950/90 via-orange-900/40 to-transparent'
                : color === 'rose'
                  ? 'from-rose-950/90 via-rose-900/40 to-transparent'
                  : 'from-purple-950/90 via-purple-900/40 to-transparent'
              : 'from-black/70 via-black/30 to-transparent';
            const badgeCls =
              color === 'orange'
                ? 'text-orange-200'
                : color === 'rose'
                  ? 'text-rose-200'
                  : 'text-purple-200';
            const iconBg =
              color === 'orange'
                ? 'bg-orange-500'
                : color === 'rose'
                  ? 'bg-rose-500'
                  : 'bg-purple-600';
            return (
              <div
                key={day}
                onClick={() => setActiveDay(activeDay === day ? null : day)}
                className={`group relative h-44 md:h-48 rounded-[2rem] overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-lg border-2 ${borderCls}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt={label}
                  className='absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110'
                />
                <div
                  className={`absolute inset-0 bg-linear-to-t ${gradCls} transition-opacity duration-500`}
                />
                <div className='absolute inset-0 p-5 flex flex-col justify-end text-white'>
                  <span
                    className={`text-[10px] font-black uppercase tracking-[0.2em] ${badgeCls} mb-0.5`}
                  >
                    Day {String(day).padStart(2, '0')}
                  </span>
                  <h3 className='text-lg font-bold tracking-tighter'>
                    {label}
                  </h3>
                  <p className={`text-xs ${badgeCls} font-medium opacity-80`}>
                    {sub}
                  </p>
                  {isActive && (
                    <div
                      className={`absolute top-4 right-4 ${iconBg} p-2 rounded-full shadow-lg animate-in zoom-in`}
                    >
                      <Navigation2 className='size-4 text-white' />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

// ── Route panel (shared content) ──────────────────────────────────────
function RouteContent({
  pinBName,
  isRouting,
  routeData,
  straightLine,
}: {
  pinBName: string | null;
  isRouting: boolean;
  routeData: RouteData | null;
  straightLine: number;
}) {
  if (isRouting) {
    return (
      <div className='flex items-center justify-center py-5 gap-3 text-slate-400'>
        <Loader2 className='size-5 animate-spin' />
        <span className='text-sm font-medium animate-pulse'>
          Plotting your walk...
        </span>
      </div>
    );
  }
  if (!routeData) {
    return (
      <div className='py-4 text-center'>
        <p className='text-xs text-slate-400'>
          Set both pins to see the route.
        </p>
      </div>
    );
  }
  return (
    <div className='space-y-3 animate-in fade-in zoom-in-95 duration-300'>
      <div className='flex items-end justify-between'>
        <div>
          <p className='text-[9px] font-black text-slate-400 uppercase tracking-widest'>
            Walk Time
          </p>
          <p className='text-3xl font-black text-slate-900 tracking-tighter leading-none'>
            {formatTime(routeData.durationSeconds)}
          </p>
        </div>
        <div className='text-right'>
          <p className='text-[9px] font-black text-slate-400 uppercase tracking-widest'>
            Distance
          </p>
          <p className='text-lg font-bold text-blue-600 tabular-nums'>
            {formatDistance(routeData.distanceMeters)}
          </p>
        </div>
      </div>
      <div className='h-1.5 w-full bg-slate-100 rounded-full overflow-hidden'>
        <div className='h-full bg-linear-to-r from-blue-600 to-blue-400 w-1/4 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]' />
      </div>
      <div className='flex items-center justify-between text-[10px] text-slate-400'>
        <div className='flex items-center gap-1'>
          <Footprints className='size-3 text-blue-400' />
          <span>Street route · {AVG_WALK_SPEED_KMH} km/h</span>
        </div>
        <span>{formatDistance(straightLine)} straight-line</span>
      </div>
    </div>
  );
}

// ── Desktop floating panel ────────────────────────────────────────────
function RoutePanel({
  pinBName,
  isRouting,
  routeData,
  straightLine,
  onClose,
}: {
  pinBName: string | null;
  isRouting: boolean;
  routeData: RouteData | null;
  straightLine: number;
  onClose: () => void;
}) {
  return (
    <div className='bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl ring-1 ring-black/5 overflow-hidden'>
      <div className='flex items-center justify-between px-4 py-3 border-b border-black/5 bg-slate-900/3'>
        <div className='flex items-center gap-2'>
          <div className='bg-blue-600 p-1.5 rounded-lg shadow-sm'>
            <Navigation2 className='size-3.5 text-white' />
          </div>
          <span className='font-bold text-[13px] text-slate-800 truncate max-w-[160px]'>
            {pinBName || 'Routing...'}
          </span>
        </div>
        <button
          onClick={onClose}
          className='p-1.5 hover:bg-black/5 rounded-full text-slate-400 hover:text-slate-600 transition-colors'
        >
          <X className='size-4' />
        </button>
      </div>
      <div className='p-4'>
        <RouteContent
          pinBName={pinBName}
          isRouting={isRouting}
          routeData={routeData}
          straightLine={straightLine}
        />
      </div>
    </div>
  );
}

// ── Mobile bottom sheet ───────────────────────────────────────────────
function MobileRouteSheet({
  pinBName,
  isRouting,
  routeData,
  straightLine,
  onClose,
}: {
  pinBName: string | null;
  isRouting: boolean;
  routeData: RouteData | null;
  straightLine: number;
  onClose: () => void;
}) {
  return (
    <div className='bg-white/90 backdrop-blur-xl rounded-t-3xl shadow-[0_-16px_48px_rgba(0,0,0,0.12)] ring-1 ring-black/5'>
      {/* drag handle */}
      <div className='flex justify-center pt-2 pb-1'>
        <div className='w-10 h-1 rounded-full bg-slate-200' />
      </div>
      <div className='flex items-center justify-between px-5 py-2 border-b border-black/5'>
        <div className='flex items-center gap-2'>
          <div className='bg-blue-600 p-1.5 rounded-lg'>
            <Navigation2 className='size-3.5 text-white' />
          </div>
          <span className='font-bold text-sm text-slate-800 truncate max-w-[200px]'>
            {pinBName || 'Routing...'}
          </span>
        </div>
        <button
          onClick={onClose}
          className='p-1.5 hover:bg-black/5 rounded-full text-slate-400'
        >
          <ChevronDown className='size-5' />
        </button>
      </div>
      <div className='px-5 py-4'>
        <RouteContent
          pinBName={pinBName}
          isRouting={isRouting}
          routeData={routeData}
          straightLine={straightLine}
        />
      </div>
    </div>
  );
}
