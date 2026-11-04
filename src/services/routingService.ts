/**
 * Routing Service using Open Source Routing Machine (OSRM)
 * Free, open-source driving route calculations with road geometry and duration estimation.
 */

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: [number, number][]; // [latitude, longitude] array for Leaflet
  summary?: string;
}

export function formatRouteDuration(seconds: number): string {
  if (seconds < 60) return '1 mnt';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} mnt`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours} jam`;
  return `${hours} jam ${remainingMinutes} mnt`;
}

export function formatRouteDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function getGoogleMapsNavigationUrl(
  destLat: number | string,
  destLng: number | string,
  originLat?: number | string,
  originLng?: number | string
): string {
  if (originLat != null && originLng != null) {
    return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
}

export const routingService = {
  /**
   * Mengambil rute mengemudi tercepat antar dua koordinat via OSRM public API.
   * Mengembalikan rute jalan raya asli (bukan garis lurus), jarak tempuh, dan estimasi waktu.
   */
  async getDrivingRoute(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
  ): Promise<RouteResult | null> {
    try {
      // OSRM format expects {lng},{lat};{lng},{lat}
      const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) return null;

      const data = await res.json();
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        return null;
      }

      const route = data.routes[0];
      const leg = route.legs?.[0];

      // OSRM coordinates are [lng, lat], convert to [lat, lng] for Leaflet
      const coordinates: [number, number][] = route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng]
      );

      return {
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        coordinates,
        summary: leg?.summary || '',
      };
    } catch {
      return null;
    }
  },
};
