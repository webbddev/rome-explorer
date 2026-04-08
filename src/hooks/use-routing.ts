import { useState, useCallback, useEffect, useRef } from 'react';
import { getWalkingRoute, type RouteData } from '@/lib/osrm';

export type PinMode = 'idle' | 'setA' | 'setB';

export function useRouting(gpsLocation: [number, number] | null) {
  const [pinMode, setPinMode] = useState<PinMode>('idle');
  const [pinA, setPinA] = useState<[number, number] | null>(null);
  const [pinB, setPinB] = useState<[number, number] | null>(null);
  const [pinBName, setPinBName] = useState<string | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [routePanelDismissed, setRoutePanelDismissed] = useState(false);

  // We keep a ref to pinMode for the map click handler to use without stale closures
  const pinModeRef = useRef(pinMode);
  useEffect(() => {
    pinModeRef.current = pinMode;
  }, [pinMode]);

  const handleClearRoute = useCallback(() => {
    setPinA(null);
    setPinB(null);
    setPinBName(null);
    setRouteData(null);
    setIsRouting(false);
    setPinMode('idle');
    setRoutePanelDismissed(false);
  }, []);

  const handleSetA = useCallback(
    (coords: [number, number]) => {
      setPinA(coords);
      setPinMode('idle');
      setRoutePanelDismissed(false);
    },
    [],
  );

  const handleSetB = useCallback(
    (coords: [number, number], name?: string) => {
      setPinB(coords);
      if (name) setPinBName(name);
      setPinMode('idle');
      setRoutePanelDismissed(false);

      if (!pinA && gpsLocation) {
        handleSetA(gpsLocation);
      }
    },
    [pinA, gpsLocation, handleSetA],
  );

  useEffect(() => {
    if (!pinA || !pinB) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  return {
    pinMode,
    setPinMode,
    pinModeRef,
    pinA,
    setPinA,
    pinB,
    setPinB,
    pinBName,
    setPinBName,
    routeData,
    setRouteData,
    isRouting,
    setIsRouting,
    routePanelDismissed,
    setRoutePanelDismissed,
    handleSetA,
    handleSetB,
    handleClearRoute,
  };
}
