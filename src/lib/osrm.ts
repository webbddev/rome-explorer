// lib/osrm.ts

export interface RouteData {
  /** GeoJSON coordinates [lng, lat][] for the route line */
  geometry: [number, number][];
  /** Walking distance in meters (from OSRM street network) */
  distanceMeters: number;
  /** Estimated walking time in seconds (calculated at realistic human pace) */
  durationSeconds: number;
}

/**
 * Average human walking speed factors:
 * - Flat terrain, relaxed pace: ~4.5 km/h
 * - Brisk walk: ~5.5 km/h
 * - Rome (cobblestones, crowds, crosswalks, slight hills): ~4.2 km/h
 *
 * We use 4.5 km/h as a balanced average for Rome tourism walking.
 */
const WALKING_SPEED_MS = 4.5 / 3.6; // ≈ 1.25 m/s  (4.5 km/h)

/**
 * Fetches a walking route from the public OSRM API.
 * Uses the route geometry and distance from OSRM, but calculates
 * walking duration ourselves since the public OSRM server sometimes
 * returns driving-speed durations even on the /foot/ profile.
 *
 * @param start [longitude, latitude]
 * @param end   [longitude, latitude]
 */
export async function getWalkingRoute(
  start: [number, number],
  end: [number, number]
): Promise<RouteData | null> {
  const coordinates = `${start[0]},${start[1]};${end[0]},${end[1]}`;
  // Using OpenStreetMap Germany instance which is often more up-to-date and reliable for foot traffic
  // We add alternatives=3, continue_straight=false, and a 200m snap radius to avoid loops
  const url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${coordinates}?overview=full&geometries=geojson&alternatives=3&continue_straight=false&radiuses=200;200`;

  try {
    const response = await fetch(url);
    let data;
    if (!response.ok) {
      // Fallback to demo server if OSM DE is down
      const fallbackUrl = `https://router.project-osrm.org/route/v1/foot/${coordinates}?overview=full&geometries=geojson&alternatives=3&continue_straight=false`;
      const fallbackResponse = await fetch(fallbackUrl);
      if (!fallbackResponse.ok) return null;
      data = await fallbackResponse.json();
    } else {
      data = await response.json();
    }

    if (data.code !== "Ok" || !data.routes?.length) {
      return null;
    }

    // Iterate through all routes (primary + alternatives) to find the one with the MINIMUM physical distance
    // This fixes cases where OSRM might favor a slightly "faster" road that is much longer
    let bestRoute = data.routes[0];
    for (const route of data.routes) {
      if (route.distance < bestRoute.distance) {
        bestRoute = route;
      }
    }

    const geometry = bestRoute.geometry.coordinates as [number, number][];
    const distanceMeters: number = bestRoute.distance;

    // Calculate realistic walking duration (4.5 km/h)
    const durationSeconds = distanceMeters / WALKING_SPEED_MS;

    return { geometry, distanceMeters, durationSeconds };
  } catch (error) {
    console.error("Error fetching walking route:", error);
    return null;
  }
}
