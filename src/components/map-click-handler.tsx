"use client";

import { useEffect } from "react";
import MapLibreGL from "maplibre-gl";
import { useMap } from "@/components/ui/map";

interface MapClickHandlerProps {
  enabled: boolean;
  onMapClick: (lngLat: { lng: number; lat: number }) => void;
  cursor?: string;
}

/**
 * Invisible component that listens for clicks on the map surface.
 * Must be rendered as a child of <Map>.
 * When `enabled` is true, the clicks fire `onMapClick` 
 * with the geographic coordinates.
 */
export function MapClickHandler({ enabled, onMapClick, cursor = "crosshair" }: MapClickHandlerProps) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || !enabled) return;

    const canvas = map.getCanvas();
    const prevCursor = canvas.style.cursor;
    canvas.style.cursor = cursor;

    const handler = (e: MapLibreGL.MapMouseEvent) => {
      onMapClick({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    };

    map.on("click", handler);

    return () => {
      map.off("click", handler);
      canvas.style.cursor = prevCursor;
    };
  }, [map, isLoaded, enabled, onMapClick, cursor]);

  return null;
}
