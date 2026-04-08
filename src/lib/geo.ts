// Math constants
export const AVG_WALK_SPEED_KMH = 4.5;
export const EARTH_RADIUS_M = 6371e3;

/** Distance between two [lng, lat] points in meters */
export function haversineDistance(a: [number, number], b: [number, number]): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Calculate walk time from distance at 4.5 km/h */
export function walkTimeFromDistance(meters: number): number {
  return meters / ((AVG_WALK_SPEED_KMH * 1000) / 3600); // seconds
}

/** Format distance nicely (m or km) */
export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

/** Format time nicely (min or h min) */
export function formatTime(seconds: number): string {
  const min = Math.round(seconds / 60);
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  return `${min} min`;
}
