'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapRoute,
  type MapRef,
} from '@/components/ui/map';
import {
  Navigation2,
  Loader2,
  X,
  ChevronDown,
  ShoppingBag,
  Home as HomeIcon,
} from 'lucide-react';
import { MapMonumentIcon } from '@/components/ui/map-icons';
import { RouteInfoContent } from '@/components/ui/route-info-content';
import { LocationCards } from '@/components/ui/location-cards';
import { SearchOverlay } from '@/components/ui/search-overlay';
import { MapClickHandler } from '@/components/map-click-handler';
import { ROME_CENTER, SIGHTS, ALYA_SHOPPING, HOME_LOCATION, type Sight, type Shop, type LocationItem } from '@/lib/data';
import { haversineDistance } from '@/lib/geo';
import { useGps } from '@/hooks/use-gps';
import { useRouting } from '@/hooks/use-routing';
// ══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════
export default function Home() {
  const mapRef = useRef<MapRef>(null);
  const { gpsLocation, isLocating, gpsError, handleLocate } = useGps(mapRef);
  const {
    pinMode,
    setPinMode,
    pinModeRef,
    pinA,
    setPinA,
    pinB,
    setPinB,
    pinBName,
    routeData,
    isRouting,
    routePanelDismissed,
    setRoutePanelDismissed,
    handleSetA,
    handleSetB,
    handleClearRoute,
  } = useRouting(gpsLocation);

  // ── UI State ───────────────────────────────────────────────────────────
  const [selectedSight, setSelectedSight] = useState<Sight | null>(null);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [selectedHome, setSelectedHome] = useState<typeof HOME_LOCATION | null>(null);
  const [highlightedLocationId, setHighlightedLocationId] = useState<string | number | null>(null);

  const hasAnyPin = pinA !== null || pinB !== null;
  const straightLine = pinA && pinB ? haversineDistance(pinA, pinB) : 0;

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleWalkTo = useCallback(
    (name: string, coords: [number, number]) => {
      handleSetB(coords, name);
    },
    [handleSetB],
  );

  const handleStartHere = useCallback(
    (coords: [number, number]) => {
      handleSetA(coords);
    },
    [handleSetA],
  );

  const handleUseGpsAsStart = useCallback(() => {
    if (gpsLocation) {
      handleSetA(gpsLocation);
    }
  }, [gpsLocation, handleSetA]);

  const handleMapClick = useCallback(
    (lngLat: { lng: number; lat: number }) => {
      setSelectedSight(null);
      setSelectedShop(null);
      setSelectedHome(null);
      setHighlightedLocationId(null);

      const mode = pinModeRef.current;
      if (mode === 'idle') return;

      const coords: [number, number] = [lngLat.lng, lngLat.lat];
      if (mode === 'setA') {
        handleSetA(coords);
      } else if (mode === 'setB') {
        handleSetB(coords);
      }
    },
    [handleSetA, handleSetB, pinModeRef],
  );

  const handleSearchResultClick = useCallback(
    (item: LocationItem) => {
      mapRef.current?.flyTo({
        center: item.coords,
        zoom: 16,
        duration: 1500,
        essential: true,
      });

      // We only fly to the location and close the search results.
      // We explicitly DO NOT set the selected state here because the user
      // only wants to see the description card when clicking the marker on the map.
      setPinMode('idle');
      
      // Temporary pulsating highlight
      setHighlightedLocationId(item.id);
      setTimeout(() => setHighlightedLocationId(null), 8000);
    },
    [setPinMode],
  );

  const handlePinADragEnd = useCallback(
    (lngLat: { lng: number; lat: number }) => {
      setPinA([lngLat.lng, lngLat.lat]);
    },
    [setPinA],
  );

  const handlePinBDragEnd = useCallback(
    (lngLat: { lng: number; lat: number }) => {
      setPinB([lngLat.lng, lngLat.lat]);
    },
    [setPinB],
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <main className='relative h-dvh w-full overflow-hidden bg-white text-zinc-900'>
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
          showLocate={false}
          show3D
          showFullscreen
          position='bottom-right'
        />
        <MapClickHandler
          enabled={true}
          onMapClick={handleMapClick}
          cursor={pinMode === 'idle' ? 'inherit' : 'crosshair'}
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

              e.stopPropagation();
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
              <div className='relative flex items-center justify-center'>
                {highlightedLocationId === sight.id && (
                  <div className='absolute size-12 rounded-full bg-blue-500/30 animate-ping pointer-events-none' />
                )}
                <MapMonumentIcon
                  type={sight.iconType}
                  name={sight.name}
                  isActive={selectedSight?.id === sight.id}
                />
              </div>
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

              e.stopPropagation();
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
                {highlightedLocationId === shop.id && (
                  <div className='absolute top-3.5 left-1/2 -translate-x-1/2 size-12 rounded-full bg-blue-500/30 animate-ping pointer-events-none' />
                )}
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
            e.stopPropagation();
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
              {highlightedLocationId === HOME_LOCATION.id && (
                <div className='absolute top-4 left-1/2 -translate-x-1/2 size-14 rounded-full bg-rose-500/30 animate-ping pointer-events-none' />
              )}
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
      <SearchOverlay
        gpsLocation={gpsLocation}
        onResultClick={handleSearchResultClick}
        gpsError={gpsError}
      />

      {/* ── Desktop Route Info Panel (md+) ── */}
      {(routeData || isRouting) && !routePanelDismissed && (
        <div className='absolute top-28 left-4 sm:left-8 z-20 pointer-events-auto hidden md:block w-80 animate-in slide-in-from-top-4 duration-300'>
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

      {/* ── Bottom-Right: Route Controls (above map buttons) ── */}
      <div className='absolute bottom-52 right-2 z-20 flex flex-col gap-1.5 pointer-events-auto items-end'>
        <button
          onClick={() => setPinMode(pinMode === 'setA' ? 'idle' : 'setA')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold transition-all shadow-lg ${
            pinMode === 'setA'
              ? 'bg-orange-500 text-white shadow-orange-500/30 scale-105'
              : 'bg-white/95 backdrop-blur-md text-orange-600 hover:bg-orange-50'
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

        <button
          onClick={() => setPinMode(pinMode === 'setB' ? 'idle' : 'setB')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold transition-all shadow-lg ${
            pinMode === 'setB'
              ? 'bg-blue-600 text-white shadow-blue-600/30 scale-105'
              : 'bg-white/95 backdrop-blur-md text-blue-600 hover:bg-blue-50'
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

        <button
          onClick={handleLocate}
          disabled={isLocating}
          className='flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold bg-white/95 backdrop-blur-md text-slate-600 shadow-lg hover:bg-slate-50 transition-all disabled:opacity-50'
        >
          {isLocating ? (
            <Loader2 className='size-3.5 animate-spin' />
          ) : (
            <Navigation2 className='size-3.5' />
          )}
          Locate
        </button>

        {hasAnyPin && (
          <button
            onClick={handleClearRoute}
            className='flex items-center gap-1 px-3 py-2 rounded-full text-[11px] font-bold bg-white/95 border border-red-200 text-red-500 shadow-lg hover:bg-red-50 transition-all animate-in fade-in zoom-in-95 duration-200'
          >
            <X className='size-3' />
            Clear
          </button>
        )}
      </div>

      {/* ── BOTTOM REGION ── */}
      <div className='pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center pb-6'>
        {/* Mobile Bottom Sheet (route info, below md) */}
        {(routeData || isRouting) && !routePanelDismissed && (
          <div className='pointer-events-auto w-full px-4 sm:px-8 max-w-[24rem] md:hidden mb-3 flex-none animate-in slide-in-from-bottom-4 duration-300'>
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

        <div className='pointer-events-auto w-full flex-none px-4 sm:px-8 flex justify-center'>
          <LocationCards
            selectedSight={selectedSight}
            setSelectedSight={setSelectedSight}
            selectedShop={selectedShop}
            setSelectedShop={setSelectedShop}
            selectedHome={selectedHome}
            setSelectedHome={setSelectedHome}
            gpsLocation={gpsLocation}
            handleStartHere={handleStartHere}
            handleWalkTo={handleWalkTo}
          />
        </div>
      </div>
    </main>
  );
}
