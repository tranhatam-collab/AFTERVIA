import type { Alert } from './model.ts';

// Places and radii (GS-051, GT17). A reader can keep two places, for example the city they live in now and a land they
// plan to move to. An alert is matched to a place only by distance; an alert without a position is never matched.

export type Place = { id: string; name: string; lat: number; lon: number; radiusKm: number };

export const RADIUS_RANGE_KM = { min: 5, max: 100 } as const;

const EARTH_RADIUS_KM = 6371;

// Great-circle distance in kilometres (haversine).
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// A radius inside the product's range, or null. An out-of-range radius is refused, not quietly clamped.
export function validRadius(km: number): number | null {
  return Number.isFinite(km) && km >= RADIUS_RANGE_KM.min && km <= RADIUS_RANGE_KM.max ? km : null;
}

// The alerts within a place's radius.
export function alertsNear(alerts: Alert[], place: Place): Alert[] {
  const radius = validRadius(place.radiusKm);
  if (radius === null) return [];
  return alerts.filter((alert) => alert.where !== undefined && distanceKm(alert.where, place) <= radius);
}

// A place is kept only when the reader has turned alerts on (GT17). Otherwise nothing about the location is stored.
export function placeToStore(place: Place | null, alertsOn: boolean): Place | null {
  return alertsOn ? place : null;
}
