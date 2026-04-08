"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapPolygon,
  MapRoute,
} from "@/components/ui/map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  Navigation2,
  Loader2,
  MapPin,
  Footprints,
  X,
  LocateFixed,
  Crosshair,
} from "lucide-react";
import { MapMonumentIcon } from "@/components/ui/map-icons";
import { MapClickHandler } from "@/components/map-click-handler";
import { getWalkingRoute, type RouteData } from "@/lib/osrm";
import {
  ROME_CENTER,
  SIGHTS,
  ALYA_SHOPPING,
  DAY1_ZONE,
  DAY2_ZONE,
  DAY3_ZONE,
} from "@/lib/data";

// Average human walking speed: ~4.5–5.5 km/h
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

/** Cross-check: straight-line estimate using haversine + avg walking speed */
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

export default function Home() {
  // ── state ──────────────────────────────────────────────────────────
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [destination, setDestination] = useState<{ name: string; coords: [number, number] } | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [locatingError, setLocatingError] = useState("");
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [dropPinMode, setDropPinMode] = useState(false);
  const [selectedSight, setSelectedSight] = useState<any>(null);
  const [selectedShop, setSelectedShop] = useState<any>(null);

  // keep a ref so the callback we pass to MapClickHandler is stable
  const dropPinModeRef = useRef(dropPinMode);
  dropPinModeRef.current = dropPinMode;

  // ── handlers ───────────────────────────────────────────────────────
  const handleResetRoute = useCallback(() => {
    setRouteData(null);
    setDestination(null);
    setIsRouting(false);
    setLocatingError("");
  }, []);

  /** Set a location as the starting point */
  const handleSetStart = useCallback((coords: [number, number]) => {
    setUserLocation(coords);
    setLocatingError("");
    setDropPinMode(false);
  }, []);

  /** Set a destination and try GPS if no start is set */
  const handleWalkTo = useCallback(
    (name: string, coords: [number, number]) => {
      setDestination({ name, coords });
      setLocatingError("");

      if (!userLocation) {
        if ("geolocation" in navigator) {
          setIsRouting(true);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setUserLocation([pos.coords.longitude, pos.coords.latitude]);
            },
            () => {
              setLocatingError(
                "GPS unavailable — tap the pin button to drop a starting pin on the map, or use 'Start Here' on any landmark."
              );
              setIsRouting(false);
            }
          );
        } else {
          setLocatingError("Geolocation not supported. Use the pin button to set start manually.");
        }
      }
    },
    [userLocation]
  );

  /** Map click → drop pin (only when in drop-pin mode) */
  const handleMapClick = useCallback(
    (lngLat: { lng: number; lat: number }) => {
      setSelectedSight(null);
      setSelectedShop(null);
      if (!dropPinModeRef.current) return;
      handleSetStart([lngLat.lng, lngLat.lat]);
    },
    [handleSetStart]
  );

  /** User dragged the blue pin to a new position */
  const handlePinDragEnd = useCallback(
    (lngLat: { lng: number; lat: number }) => {
      setUserLocation([lngLat.lng, lngLat.lat]);
    },
    []
  );



  // ── fetch route on location/destination change ─────────────────────
  useEffect(() => {
    if (!userLocation || !destination) return;
    let cancelled = false;

    const run = async () => {
      setIsRouting(true);
      const data = await getWalkingRoute(userLocation, destination.coords);
      if (!cancelled) {
        setRouteData(data);
        setIsRouting(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [userLocation, destination]);

  // ── derived values ─────────────────────────────────────────────────
  const straightLine =
    userLocation && destination
      ? haversineDistance(userLocation, destination.coords)
      : 0;
  const straightLineMinutes = straightLine / ((AVG_WALK_SPEED_KMH * 1000) / 60);

  // ── render ─────────────────────────────────────────────────────────
  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-white text-zinc-900">
      {/* ── MAP CONTAINER (Z-0) ── */}
      <Map center={ROME_CENTER} zoom={13.5} theme="light" className="absolute inset-0 w-full h-full z-0">
        <MapControls 
          showZoom 
          showLocate 
          show3D 
          showFullscreen 
          position="bottom-right"
          showDropPin
          dropPinActive={dropPinMode}
          onDropPinClick={() => setDropPinMode(!dropPinMode)}
        />
        <MapClickHandler enabled={dropPinMode} onMapClick={handleMapClick} />

        {/* OSRM Route Line */}
        {routeData && (
          <MapRoute
            coordinates={routeData.geometry}
            id="walking-route"
            color="#3b82f6"
            width={5}
          />
        )}

        {/* User Location Pin (draggable) */}
        {userLocation && (
          <MapMarker
            longitude={userLocation[0]}
            latitude={userLocation[1]}
            draggable
            onDragEnd={handlePinDragEnd}
          >
            <MarkerContent>
              <div className="relative cursor-grab active:cursor-grabbing">
                {/* outer ring */}
                <div className="size-7 rounded-full bg-blue-500/20 absolute -inset-1 animate-ping" />
                {/* pin body */}
                <div className="size-5 rounded-full bg-blue-500 border-[3px] border-white shadow-xl flex items-center justify-center relative z-10">
                  <div className="size-1.5 bg-white rounded-full" />
                </div>
              </div>
            </MarkerContent>
            <MarkerPopup className="bg-white p-2 text-center min-w-[100px]">
              <div className="text-xs font-bold">📍 Start</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Drag to reposition</div>
            </MarkerPopup>
          </MapMarker>
        )}

        {/* Day Zones */}
        {(activeDay === 1 || activeDay === null) && (
          <MapPolygon
            coordinates={DAY1_ZONE}
            fillColor="#ea580c"
            fillOpacity={0}
            strokeColor="#ea580c"
            strokeWidth={2}
            strokeDashArray={[4, 2]}
            id="day1"
          />
        )}
        {(activeDay === 2 || activeDay === null) && (
          <MapPolygon
            coordinates={DAY2_ZONE}
            fillColor="#e11d48"
            fillOpacity={0}
            strokeColor="#e11d48"
            strokeWidth={2}
            strokeDashArray={[4, 2]}
            id="day2"
          />
        )}
        {(activeDay === 3 || activeDay === null) && (
          <MapPolygon
            coordinates={DAY3_ZONE}
            fillColor="#9333ea"
            fillOpacity={0}
            strokeColor="#9333ea"
            strokeWidth={2}
            strokeDashArray={[4, 2]}
            id="day3"
          />
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
              setDropPinMode(false);
            }}
          >
            <MarkerContent>
              <MapMonumentIcon
                type={
                  sight.iconType as
                    | "ruin"
                    | "temple"
                    | "fountain"
                    | "museum"
                    | "basilica"
                    | "square"
                    | "castle"
                }
              />
            </MarkerContent>
          </MapMarker>
        ))}

        {/* ZAля Shopping Locations */}
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
              setDropPinMode(false);
            }}
          >
            <MarkerContent>
              <div className="bg-black text-white p-2 rounded-full shadow-xl border-2 border-white animate-pulse hover:scale-110 transition-transform">
                <ShoppingBag className="size-3.5" />
              </div>
            </MarkerContent>
          </MapMarker>
        ))}
      </Map>

      {/* ── OVERLAY UI (Z-10) ── */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between overflow-hidden">
        
        {/* Top Region: Header and Routing */}
        <div className="flex flex-col items-center pt-4 px-4 sm:px-8 gap-4">
          {/* Header */}
          <header className="pointer-events-auto w-full max-w-6xl flex items-center justify-between px-4 sm:px-6 py-4 rounded-[2rem] bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.04)] ring-1 ring-black/2 isolate">
            <div className="flex items-center gap-3">
              <div className="bg-linear-to-br from-orange-600 to-rose-600 p-2.5 rounded-2xl shadow-lg shadow-orange-500/20">
                <Map className="size-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-800 leading-none">
                  Rome Explorer
                </h1>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Concierge Alpha</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end mr-2">
                <p className="text-[10px] font-black text-rose-600 uppercase tracking-tighter">Personalized For</p>
                <p className="text-sm font-bold text-slate-700 leading-none">Donna Alevtisia</p>
              </div>
              <Badge variant="outline" className="border-zinc-200 text-zinc-500 bg-white/50 px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full">
                APR 2026
              </Badge>
            </div>
          </header>

          {/* Routing Panel */}
          {(destination || locatingError) && (
            <div className="pointer-events-auto w-full sm:w-80 self-start sm:self-center transition-all duration-300 animate-in slide-in-from-top-4">
              <Card className="border-none shadow-2xl bg-white/90 backdrop-blur-md overflow-hidden ring-1 ring-black/5">
                <CardContent className="p-0">
                  <div className="bg-slate-900/5 px-4 py-3 border-b border-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="bg-blue-600 p-1.5 rounded-md shadow-sm shrink-0">
                        <Navigation2 className="size-3.5 text-white" />
                      </div>
                      <span className="font-bold text-[13px] text-slate-800 truncate">
                        {destination?.name || "Locating..."}
                      </span>
                    </div>
                    <button 
                      onClick={handleResetRoute}
                      className="p-1.5 hover:bg-black/5 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                      title="Dismiss"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="p-4">
                    {locatingError ? (
                      <div className="flex gap-3 text-rose-600">
                        <div className="bg-rose-50 p-2 rounded-lg h-fit">
                          <LocateFixed className="size-4" />
                        </div>
                        <p className="text-xs font-medium leading-relaxed">
                          {locatingError}
                        </p>
                      </div>
                    ) : isRouting ? (
                      <div className="flex items-center justify-center py-6 gap-3 text-slate-400">
                        <Loader2 className="size-5 animate-spin" />
                        <span className="text-sm font-medium animate-pulse">Mapping out your walk...</span>
                      </div>
                    ) : routeData ? (
                      <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
                        <div className="flex items-end justify-between">
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Est. Travel Time</p>
                            <p className="text-3xl font-black text-slate-900 tracking-tighter">
                              {formatTime(routeData.durationSeconds)}
                            </p>
                          </div>
                          <div className="text-right space-y-0.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Distance</p>
                            <p className="text-lg font-bold text-blue-600 tabular-nums">
                              {formatDistance(routeData.distanceMeters)}
                            </p>
                          </div>
                        </div>

                        <div className="relative h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="absolute inset-0 bg-blue-500/10" />
                          <div className="relative h-full bg-linear-to-r from-blue-600 to-blue-400 w-1/4 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium italic">
                            <div className="flex items-center gap-1.5">
                              <Footprints className="size-3 text-blue-400" />
                              <span>Street network route</span>
                            </div>
                            <span>{AVG_WALK_SPEED_KMH} km/h pace</span>
                          </div>
                          <div className="text-[9px] text-slate-300 flex items-center justify-between border-t border-slate-50 pt-1 mt-1">
                             <span>{formatDistance(straightLine)} straight-line</span>
                             <span className="opacity-0">.</span>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Bottom Region: Selection Details OR Day Nav */}
        <div className="pointer-events-auto w-full pb-6 px-4 sm:px-8 mt-auto flex flex-col items-center relative z-20">
          
          {userLocation && !dropPinMode && (
            <Badge className="bg-blue-500/90 text-white text-[10px] px-3 py-1 shadow-md rounded-full pointer-events-none mb-3">
              �� Drag blue pin to move
            </Badge>
          )}

          {selectedSight ? (
            <Card className="w-full max-w-[24rem] rounded-[2rem] overflow-hidden shadow-2xl bg-white border-none ring-1 ring-black/5 animate-in slide-in-from-bottom-8 duration-300">
               <div className="relative h-40 sm:h-48 w-full group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedSight.image} alt={selectedSight.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                  <Badge variant={selectedSight.isFree ? "secondary" : "destructive"} className="absolute top-3 right-3 text-[9px] font-black px-2 py-0.5 h-5 bg-white/20 backdrop-blur-md border-white/30 text-white leading-none">
                    {selectedSight.isFree ? "FREE ENTRY" : "PREMIUM"}
                  </Badge>
                  <button onClick={() => setSelectedSight(null)} className="absolute top-3 left-3 bg-white/20 backdrop-blur-md rounded-full p-2 text-white/90 shadow-sm ring-1 ring-white/30 hover:bg-white/40 hover:text-white transition-all scale-100 hover:scale-105 active:scale-95 leading-none flex items-center justify-center">
                     <X className="size-4" />
                  </button>
                  <div className="absolute bottom-4 left-4 right-4">
                     <h3 className="font-black text-xl text-white tracking-tight leading-tight">{selectedSight.name}</h3>
                  </div>
               </div>
               <div className="p-4 sm:p-5 bg-white">
                  <p className="text-slate-500 text-[12px] leading-relaxed mb-5 line-clamp-3 italic">"{selectedSight.description}"</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-9 sm:h-10 text-[11px] font-bold rounded-xl border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm" onClick={() => handleSetStart(selectedSight.coords)}>
                      <MapPin className="size-3.5 mr-1.5 text-slate-400" /> Start
                    </Button>
                    <Button size="sm" className="flex-1 h-9 sm:h-10 text-[11px] font-bold rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25" onClick={() => handleWalkTo(selectedSight.name, selectedSight.coords)}>
                      <Footprints className="size-3.5 mr-1.5" /> Walk To
                    </Button>
                  </div>
               </div>
            </Card>
          ) : selectedShop ? (
            <Card className="w-full max-w-[24rem] rounded-[2rem] overflow-hidden shadow-2xl bg-white border-none ring-1 ring-black/5 animate-in slide-in-from-bottom-8 duration-300">
               <div className="bg-black p-4 sm:p-5 flex items-center justify-between relative text-white group">
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  <div className="flex items-center gap-3">
                     <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md shadow-inner">
                        <ShoppingBag className="size-4.5 text-white" />
                     </div>
                     <div className="flex flex-col">
                       <h3 className="font-black text-sm sm:text-base uppercase italic tracking-[0.2em] text-white pr-4">
                          {selectedShop.name}
                       </h3>
                       <Badge className="bg-white/90 text-black text-[8px] sm:text-[9px] font-black tracking-widest px-1.5 py-0 mt-1 w-fit shadow-sm">LIMITED ED</Badge>
                     </div>
                  </div>
                  <button onClick={() => setSelectedShop(null)} className="absolute top-2 right-2 rounded-full p-1.5 text-white/50 hover:text-white bg-white/0 hover:bg-white/10 transition-all scale-100 hover:scale-105 active:scale-95 flex items-center justify-center">
                     <X className="size-4" />
                  </button>
               </div>
               <div className="p-4 sm:p-5 bg-white">
                  <p className="text-zinc-500 text-[12px] italic mb-5 leading-relaxed">"{selectedShop.description}"</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-9 sm:h-10 text-[10px] font-black uppercase tracking-widest rounded-xl border-zinc-200 shadow-sm" onClick={() => handleSetStart(selectedShop.coords)}>
                      <MapPin className="size-3.5 mr-1.5" /> Start
                    </Button>
                    <Button size="sm" className="flex-1 h-9 sm:h-10 text-[10px] font-black uppercase tracking-widest rounded-xl bg-black text-white hover:bg-zinc-800 shadow-lg shadow-black/20" onClick={() => handleWalkTo(selectedShop.name, selectedShop.coords)}>
                      <Footprints className="size-3.5 mr-1.5" /> To ZAля
                    </Button>
                  </div>
               </div>
            </Card>
          ) : (
            <div className="w-full max-w-6xl animate-in fade-in duration-500">
               <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none sm:grid sm:grid-cols-3 sm:overflow-visible">
                 {/* DAY 1 */}
                 <div
                   onClick={() => setActiveDay(activeDay === 1 ? null : 1)}
                   className={`shrink-0 w-[85vw] sm:w-auto snap-center group relative h-40 sm:h-48 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-lg border-2 ${
                     activeDay === 1 ? "border-orange-500 shadow-orange-500/20 ring-4 ring-orange-100 z-10" : "border-white/50 grayscale-[0.3] opacity-80 hover:grayscale-0 hover:opacity-100"
                   }`}
                 >
                   <img 
                     src="https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=600&auto=format&fit=crop" 
                     alt="Pantheon"
                     className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                   />
                   <div className={`absolute inset-0 bg-linear-to-t from-orange-950/90 via-orange-900/40 to-transparent transition-opacity duration-500 ${activeDay === 1 ? 'opacity-100' : 'opacity-60'}`} />
                   <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-end text-white">
                     <h3 className="text-xl sm:text-2xl font-bold tracking-tighter">Historic Heart</h3>
                     <p className="text-[11px] sm:text-xs text-orange-100/70 font-medium">Pantheon & Piazza Navona</p>
                   </div>
                 </div>

                 {/* DAY 2 */}
                 <div
                   onClick={() => setActiveDay(activeDay === 2 ? null : 2)}
                   className={`shrink-0 w-[85vw] sm:w-auto snap-center group relative h-40 sm:h-48 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-lg border-2 ${
                     activeDay === 2 ? "border-rose-500 shadow-rose-500/20 ring-4 ring-rose-100 z-10" : "border-white/50 grayscale-[0.3] opacity-80 hover:grayscale-0 hover:opacity-100"
                   }`}
                 >
                   <img 
                     src="https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?q=80&w=600&auto=format&fit=crop" 
                     alt="Colosseum"
                     className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                   />
                   <div className={`absolute inset-0 bg-linear-to-t from-rose-950/90 via-rose-900/40 to-transparent transition-opacity duration-500 ${activeDay === 2 ? 'opacity-100' : 'opacity-60'}`} />
                   <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-end text-white">
                     <h3 className="text-xl sm:text-2xl font-bold tracking-tighter">Ancient Empire</h3>
                     <p className="text-[11px] sm:text-xs text-rose-100/70 font-medium">Colosseo & Roman Forum</p>
                   </div>
                 </div>

                 {/* DAY 3 */}
                 <div
                   onClick={() => setActiveDay(activeDay === 3 ? null : 3)}
                   className={`shrink-0 w-[85vw] sm:w-auto snap-center group relative h-40 sm:h-48 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-lg border-2 ${
                     activeDay === 3 ? "border-purple-600 shadow-purple-600/20 ring-4 ring-purple-100 z-10" : "border-white/50 grayscale-[0.3] opacity-80 hover:grayscale-0 hover:opacity-100"
                   }`}
                 >
                   <img 
                     src="https://images.unsplash.com/photo-1542382257-80dedb725088?q=80&w=600&auto=format&fit=crop" 
                     alt="Vatican"
                     className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                   />
                   <div className={`absolute inset-0 bg-linear-to-t from-purple-950/90 via-purple-900/40 to-transparent transition-opacity duration-500 ${activeDay === 3 ? 'opacity-100' : 'opacity-60'}`} />
                   <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-end text-white">
                     <h3 className="text-xl sm:text-2xl font-bold tracking-tighter">Vatican Glory</h3>
                     <p className="text-[11px] sm:text-xs text-purple-100/70 font-medium">Museums & St.Peter's</p>
                   </div>
                 </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
