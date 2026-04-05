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
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-[radial-gradient(circle_at_top_right,rgba(255,237,213,0.3),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(255,228,230,0.3),transparent_50%),white] text-zinc-900">
      {/* ── Sophisticated Header ───────────────────────────────────── */}
      <header className="z-30 sticky top-0 w-full max-w-6xl mb-12 flex items-center justify-between px-6 py-4 rounded-[2rem] bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.04)] ring-1 ring-black/2">
        <div className="flex items-center gap-3">
          <div className="bg-linear-to-br from-orange-600 to-rose-600 p-2.5 rounded-2xl shadow-lg shadow-orange-500/20">
            <Map className="size-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight text-slate-800 leading-none">
              Rome Explorer
            </h1>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Concierge Alpha</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end mr-2">
            <p className="text-[10px] font-black text-rose-600 uppercase tracking-tighter">Personalized For</p>
            <p className="text-sm font-bold text-slate-700 leading-none">Donna Alevtisia</p>
          </div>
          <Badge variant="outline" className="border-zinc-200 text-zinc-500 bg-white/50 px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full">
            APR 2026
          </Badge>
        </div>
      </header>

      {/* ── Map card ───────────────────────────────────────────────── */}
      <Card className="w-full max-w-6xl h-[70vh] rounded-[3rem] overflow-hidden border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.12)] bg-white relative ring-1 ring-black/5">
        {/* ── Routing info panel (top-left overlay) ──────────────── */}
        {(destination || locatingError) && (
          <div className="absolute top-4 left-4 z-10 w-[calc(100%-2rem)] md:w-80 transition-all duration-300 animate-in fade-in slide-in-from-top-4">
            <Card className="border-none shadow-2xl bg-white/90 backdrop-blur-md overflow-hidden ring-1 ring-black/5">
              <CardContent className="p-0">
                {/* Header with Destination */}
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

                      {/* Visual progress/divider */}
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

        {/* ── Drop-pin toggle (top-right overlay) ────────────────── */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
          <Button
            size="sm"
            variant={dropPinMode ? "default" : "outline"}
            className={`h-9 px-3 gap-1.5 shadow-lg rounded-full transition-all ${
              dropPinMode
                ? "bg-blue-600 text-white hover:bg-blue-700 animate-pulse"
                : "bg-white/95 backdrop-blur-sm hover:bg-white text-zinc-700"
            }`}
            onClick={() => setDropPinMode(!dropPinMode)}
          >
            {dropPinMode ? (
              <>
                <Crosshair className="size-4" /> Tap map to set start
              </>
            ) : (
              <>
                <MapPin className="size-4" /> Drop Pin
              </>
            )}
          </Button>

          {userLocation && !dropPinMode && (
            <Badge className="bg-blue-500/90 text-white text-[10px] px-2 py-0.5 shadow">
              📍 Drag blue pin to move
            </Badge>
          )}
        </div>

        {/* ── The Map ─────────────────────────────────────────────── */}
        <Map center={ROME_CENTER} zoom={13.5} theme="light" className="w-full h-full">
          <MapControls showZoom showLocate show3D showFullscreen position="bottom-right" />
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
            <MapMarker key={sight.id} longitude={sight.coords[0]} latitude={sight.coords[1]}>
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
              <MarkerPopup className="bg-white border-none shadow-[0_20px_50px_rgba(0,0,0,0.2)] text-zinc-900 p-0 overflow-hidden w-[280px] rounded-[2rem] ring-1 ring-black/5">
                <div className="relative h-32 w-full group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sight.image}
                    alt={sight.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                  <Badge
                    variant={sight.isFree ? "secondary" : "destructive"}
                    className="absolute top-3 right-3 text-[9px] font-black px-2 py-0.5 h-5 bg-white/20 backdrop-blur-md border-white/30 text-white"
                  >
                    {sight.isFree ? "FREE ENTRY" : "PREMIUM"}
                  </Badge>
                </div>
                <div className="p-4 bg-white">
                  <div className="mb-2">
                    <h3 className="font-black text-base leading-tight tracking-tight text-slate-800">{sight.name}</h3>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed mb-4 line-clamp-2 italic">
                    "{sight.description}"
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-9 text-[11px] font-bold rounded-xl border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all"
                      onClick={() => handleSetStart(sight.coords)}
                    >
                      <MapPin className="size-3.5 mr-1.5 text-slate-400" /> Start
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-9 text-[11px] font-bold rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 animate-in fade-in"
                      onClick={() => handleWalkTo(sight.name, sight.coords)}
                    >
                      <Footprints className="size-3.5 mr-1.5" /> Walk To
                    </Button>
                  </div>
                </div>
              </MarkerPopup>
            </MapMarker>
          ))}

          {/* ZAля Shopping Locations */}
          {ALYA_SHOPPING.map((shop) => (
            <MapMarker key={shop.id} longitude={shop.coords[0]} latitude={shop.coords[1]}>
              <MarkerContent>
                <div className="bg-black text-white p-2 rounded-full shadow-xl border-2 border-white animate-pulse">
                  <ShoppingBag className="size-3.5" />
                </div>
              </MarkerContent>
              <MarkerPopup className="bg-white border-none shadow-[0_20px_50px_rgba(0,0,0,0.25)] text-zinc-900 p-0 overflow-hidden w-[260px] rounded-[2rem] ring-1 ring-black/5">
                <div className="bg-black p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                      <ShoppingBag className="size-4 text-white" />
                    </div>
                    <h3 className="font-black text-sm uppercase italic tracking-[0.2em] text-white">
                      {shop.name}
                    </h3>
                  </div>
                  <Badge className="bg-white text-black text-[8px] font-black tracking-widest px-1.5 py-0">LTD</Badge>
                </div>
                <div className="p-4">
                  <p className="text-zinc-500 text-[11px] italic mb-4 leading-relaxed line-clamp-2">"{shop.description}"</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-[10px] font-black uppercase tracking-widest rounded-xl border-zinc-200"
                      onClick={() => handleSetStart(shop.coords)}
                    >
                      <MapPin className="size-3 mr-1" /> Start
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-[10px] font-black uppercase tracking-widest rounded-xl bg-black text-white hover:bg-zinc-800 transition-colors shadow-lg shadow-black/20"
                      onClick={() => handleWalkTo(shop.name, shop.coords)}
                    >
                      <Footprints className="size-3 mr-1" /> To ZAля
                    </Button>
                  </div>
                </div>
              </MarkerPopup>
            </MapMarker>
          ))}
        </Map>
      </Card>

      {/* ── Day cards ──────────────────────────────────────────────── */}
      {/* ── Day Exploration Cards (Bottom-bound Navigation) ────── */}
      <div className="w-full max-w-6xl mt-12 pb-20">
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Your 3-Day Pilgrimage</h2>
            <p className="text-sm text-slate-500 font-medium italic">Curated adventures for Donna Alevtisia</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-12 bg-slate-200" />
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Select a day focus</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* DAY 1: HISTORIC HEART */}
          <div
            onClick={() => setActiveDay(activeDay === 1 ? null : 1)}
            className={`group relative h-48 rounded-[2.5rem] overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-lg border-2 ${
              activeDay === 1 ? "border-orange-500 shadow-orange-500/20 ring-4 ring-orange-100" : "border-white/50 grayscale-[0.3] opacity-80 hover:grayscale-0 hover:opacity-100"
            }`}
          >
            <img 
              src="https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=600&auto=format&fit=crop" 
              alt="Pantheon"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className={`absolute inset-0 bg-linear-to-t from-orange-950/90 via-orange-900/40 to-transparent transition-opacity duration-500 ${activeDay === 1 ? 'opacity-100' : 'opacity-60'}`} />
            
            <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-200 mb-1">Pass Day 01</span>
              <h3 className="text-xl font-bold tracking-tighter">Historic Heart</h3>
              <p className="text-xs text-orange-100/70 font-medium">Pantheon & Piazza Navona</p>
              
              {activeDay === 1 && (
                <div className="absolute top-4 right-4 bg-orange-500 p-2 rounded-full shadow-lg animate-in zoom-in">
                  <Navigation2 className="size-4 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* DAY 2: ANCIENT EMPIRE */}
          <div
            onClick={() => setActiveDay(activeDay === 2 ? null : 2)}
            className={`group relative h-48 rounded-[2.5rem] overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-lg border-2 ${
              activeDay === 2 ? "border-rose-500 shadow-rose-500/20 ring-4 ring-rose-100" : "border-white/50 grayscale-[0.3] opacity-80 hover:grayscale-0 hover:opacity-100"
            }`}
          >
            <img 
              src="https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?q=80&w=600&auto=format&fit=crop" 
              alt="Colosseum"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className={`absolute inset-0 bg-linear-to-t from-rose-950/90 via-rose-900/40 to-transparent transition-opacity duration-500 ${activeDay === 2 ? 'opacity-100' : 'opacity-60'}`} />
            
            <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-200 mb-1">Pass Day 02</span>
              <h3 className="text-xl font-bold tracking-tighter">Ancient Empire</h3>
              <p className="text-xs text-rose-100/70 font-medium">Colosseo & Roman Forum</p>

              {activeDay === 2 && (
                <div className="absolute top-4 right-4 bg-rose-500 p-2 rounded-full shadow-lg animate-in zoom-in">
                  <Navigation2 className="size-4 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* DAY 3: VATICAN GLORY */}
          <div
            onClick={() => setActiveDay(activeDay === 3 ? null : 3)}
            className={`group relative h-48 rounded-[2.5rem] overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-lg border-2 ${
              activeDay === 3 ? "border-purple-600 shadow-purple-600/20 ring-4 ring-purple-100" : "border-white/50 grayscale-[0.3] opacity-80 hover:grayscale-0 hover:opacity-100"
            }`}
          >
            <img 
              src="https://images.unsplash.com/photo-1542382257-80dedb725088?q=80&w=600&auto=format&fit=crop" 
              alt="Vatican"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className={`absolute inset-0 bg-linear-to-t from-purple-950/90 via-purple-900/40 to-transparent transition-opacity duration-500 ${activeDay === 3 ? 'opacity-100' : 'opacity-60'}`} />
            
            <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-purple-200 mb-1">Pass Day 03</span>
              <h3 className="text-xl font-bold tracking-tighter">Vatican Glory</h3>
              <p className="text-xs text-purple-100/70 font-medium">Museums & St.Peter's</p>

              {activeDay === 3 && (
                <div className="absolute top-4 right-4 bg-purple-600 p-2 rounded-full shadow-lg animate-in zoom-in">
                  <Navigation2 className="size-4 text-white" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
