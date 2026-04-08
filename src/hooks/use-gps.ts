import { useState, useCallback } from 'react';
import type { MapRef } from '@/components/ui/map';

export function useGps(mapRef: React.RefObject<MapRef | null>) {
  const [gpsLocation, setGpsLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

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
  }, [mapRef]);

  return {
    gpsLocation,
    setGpsLocation,
    isLocating,
    gpsError,
    handleLocate,
  };
}
