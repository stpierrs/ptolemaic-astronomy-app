// js/core/geocoding.js
// OpenStreetMap Nominatim wrapper. Free, no API key. Rate-limit ourselves
// to ≤1 req/sec per Nominatim's TOS. When the browser is offline (or the
// request errors), the onboarding flow falls back to manual lat/lon input.

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
let _lastRequestAt = 0;

/**
 * @param {string} query - free-text place name
 * @returns {Promise<Array<{ label, latitude, longitude, country, city }>>}
 */
export async function geocode(query) {
  if (!query || query.length < 2) return [];
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return [];

  // Rate-limit: 1.1s gap between requests.
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - _lastRequestAt));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  _lastRequestAt = Date.now();

  const url = `${NOMINATIM}?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
  let data;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'ptolemaic-astronomy-app (local)' },
    });
    if (!r.ok) return [];
    data = await r.json();
  } catch (_) {
    return [];
  }
  return (Array.isArray(data) ? data : []).map(item => ({
    label:     item.display_name,
    latitude:  parseFloat(item.lat),
    longitude: parseFloat(item.lon),
    country:   item.address?.country || '',
    city:      item.address?.city || item.address?.town || item.address?.village || '',
  })).filter(o => Number.isFinite(o.latitude) && Number.isFinite(o.longitude));
}

/**
 * Whether geocoding is even attemptable in the current environment.
 * @returns {boolean}
 */
export function isGeocodingAvailable() {
  if (typeof fetch === 'undefined') return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  return true;
}
