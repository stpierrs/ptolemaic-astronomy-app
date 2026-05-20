// PART 14.3 — Solar Returns
//
// The annual chart cast for the moment the Sun re-attains its natal ecliptic
// longitude. Governs the year between birthdays.

import { bodyRADec } from './ephemeris.js';
import { raDecToEclipticLon } from './astrology.js';

const MS_DAY = 86400 * 1000;

/**
 * Find the moment the Sun reaches `targetLon` ecliptic longitude during the
 * year that contains `aroundDate`. Bisection-based root find — robust near
 * retrograde stations (Sun never goes retrograde, but the same shape works).
 *
 * @param {number} targetLon - 0..360
 * @param {Date} aroundDate
 * @param {string} source - 'ibnshatir' or 'ptolemy'
 * @returns {Date}
 */
export function solarReturnMoment(targetLon, aroundDate, source = 'ibnshatir') {
  let lo = new Date(aroundDate.getTime() - 30 * MS_DAY);
  let hi = new Date(aroundDate.getTime() + 30 * MS_DAY);
  // Ensure diff sign change across [lo, hi]
  for (let i = 0; i < 50; i++) {
    const mid = new Date((lo.getTime() + hi.getTime()) / 2);
    let lon;
    try {
      const eq = bodyRADec('sun', mid, source);
      lon = raDecToEclipticLon(eq.ra, eq.dec);
    } catch (_) { return mid; }
    let diff = ((lon - targetLon + 540) % 360) - 180;
    if (diff > 0) hi = mid; else lo = mid;
    if (Math.abs(hi.getTime() - lo.getTime()) < 30 * 1000) break;
  }
  return new Date((lo.getTime() + hi.getTime()) / 2);
}

/**
 * The solar return for `targetYear` of a nativity whose natal Sun is at
 * `natalSunLon`.
 *
 * @param {number} natalSunLon
 * @param {Date}   birthDate
 * @param {number} targetYear
 * @param {string} source
 */
export function solarReturnDate(natalSunLon, birthDate, targetYear, source = 'ibnshatir') {
  const guess = new Date(Date.UTC(
    targetYear,
    birthDate.getUTCMonth(),
    birthDate.getUTCDate(),
    birthDate.getUTCHours(),
    birthDate.getUTCMinutes(),
  ));
  return solarReturnMoment(natalSunLon, guess, source);
}
