// Rise / Set time computation.
//
// Scans a 24-hour window in 5-minute steps looking for horizon crossings.
// Uses the same ephemeris + coordinate transforms as the rest of the app.

import { bodyRADec, greenwichSiderealDeg } from './ephemeris.js';
import { raDecToAzEl } from './transforms.js';

const EPOCH_MS = Date.UTC(2017, 0, 1); // 2017-01-01 00:00 UTC

/**
 * Compute rise and set UTC times for a body on the same calendar day as dateTime.
 * Scans 24 hours in 5-minute steps.
 *
 * @param {string}  bodyName  'sun'|'moon'|'mercury'|'venus'|'mars'|'jupiter'|'saturn'|'neptune'
 * @param {number}  obsLat    Observer latitude in degrees
 * @param {number}  obsLon    Observer longitude in degrees
 * @param {number}  dateTime  Days since 2017-01-01 UTC (model state.DateTime)
 * @param {string}  source    Ephemeris source string (default 'epicycle2')
 * @returns {{ rise: Date|null, set: Date|null }}
 */
export function computeRiseSet(bodyName, obsLat, obsLon, dateTime, source = 'epicycle2') {
  const N = 288; // 5-minute steps over 24 hours
  const dayStart = Math.floor(dateTime);

  let prevEl = null;
  let riseDate = null;
  let setDate = null;

  for (let i = 0; i <= N; i++) {
    const dt = dayStart + i / N;
    const d = new Date(EPOCH_MS + dt * 86400000);
    try {
      const eq   = bodyRADec(bodyName, d, source);
      const gmst = greenwichSiderealDeg(d);
      const { el } = raDecToAzEl(eq.ra, eq.dec, obsLat, obsLon, gmst);

      if (prevEl !== null) {
        if (prevEl < 0 && el >= 0 && !riseDate) riseDate = d;
        if (prevEl >= 0 && el < 0 && !setDate)  setDate  = d;
      }
      prevEl = el;
    } catch (_) {
      // Skip steps where ephemeris throws (e.g., unsupported body at extreme dates)
    }
  }

  return { rise: riseDate, set: setDate };
}

/**
 * Format rise/set result as human-readable strings.
 * @param {{ rise: Date|null, set: Date|null }} rs
 * @returns {{ rise: string, set: string }}
 */
export function formatRiseSet(rs) {
  const fmt = (d) => {
    if (!d) return 'Circumpolar / no crossing';
    // toUTCString returns e.g. "Sun, 18 May 2026 14:35:00 GMT"
    // Slice chars 17-21 to get "14:35"
    return d.toUTCString().slice(17, 22) + ' UTC';
  };
  return { rise: fmt(rs.rise), set: fmt(rs.set) };
}
