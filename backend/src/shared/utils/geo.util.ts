export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Converts { lat, lng } to PostGIS WKT Point string.
 * CRITICAL: PostGIS ST_MakePoint / POINT() always expects (longitude, latitude).
 */
export function toWktPoint({ lat, lng }: Coordinates): string {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new Error(`Invalid latitude: ${lat}. Must be between -90 and 90.`);
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new Error(`Invalid longitude: ${lng}. Must be between -180 and 180.`);
  }
  return `POINT(${lng} ${lat})`;
}
