// js/core/astrologyAdapter.js
//
// Astrology-layer adapter over the existing Ibn al-Shatir astronomy engine.
// Every astrology module imports from THIS file rather than reaching into
// the astronomy core directly. Keeps the wall described in PART 0.3 of the
// spec clean.
//
// Spec reference: PART 0.3 (API), PART 1.7 (per-planet output shape).
//
// ── Inventory drift (audited 2026-05-20) ─────────────────────────────────
// No drift. All exports listed in Guide 01 are present in their respective
// modules. meanObliquityDeg(T) takes Julian centuries from J2000 (not a JS
// Date) — the adapter computes T from the date before calling it.

import {
  bodyRADec,
  greenwichSiderealDeg,
  julianDay,
  meanObliquityDeg,
} from './ephemeris.js';
import {
  raDecToEclipticLon, lonToZodiac, isRetrograde,
  PLANET_NAMES_ORDERED, PLANET_SYMBOLS, ZODIAC_NAMES, ZODIAC_SYMBOLS,
  computeAscendant,
} from './astrology.js';

const MS_DAY = 86400 * 1000;

// PART 7.2 / 8.2 — phase classification thresholds (degrees)
const CAZIMI_DEG     = 17 / 60;   // 0°17′
const COMBUST_DEG    = 8;
const UNDER_RAYS_DEG = 15;

/**
 * Full per-planet object per PART 1.7.
 *
 * @param {string} planetName - 'sun'|'moon'|'mercury'|'venus'|'mars'|'jupiter'|'saturn'
 * @param {Date}   date
 * @param {object} [opts] - { source: 'ibnshatir'|'ptolemy' }
 * @returns {object} per-planet PART 1.7 shape
 */
export function getPlanet(planetName, date, opts = {}) {
  const source = opts.source || 'ibnshatir';
  const eq = bodyRADec(planetName, date, source);
  const lon = raDecToEclipticLon(eq.ra, eq.dec);
  const zod = lonToZodiac(lon);

  // PART 1.7 caveat: ecliptic latitude isn't directly exposed by the
  // astronomy engine. For zodiacal-belt math the planets stay within ±5°,
  // so we surface latitude=0 here and let the fixed-stars module use the
  // catalogue's stored β for stars.
  const latitude = 0;

  // Daily motion: λ(tomorrow) − λ(today), wrapped to (−180, 180]
  const tomorrow = new Date(date.getTime() + MS_DAY);
  const eqTom    = bodyRADec(planetName, tomorrow, source);
  const lonTom   = raDecToEclipticLon(eqTom.ra, eqTom.dec);
  let daily = lonTom - lon;
  if (daily >  180) daily -= 360;
  if (daily < -180) daily += 360;
  const retrograde = (planetName !== 'sun' && planetName !== 'moon')
    ? daily < 0 : false;

  // Elongation from Sun (signed). Positive = east of Sun in longitude.
  let elongation = 0;
  let phase = null;
  let cazimi = false, combust = false, under = false;
  let heliacalState = 'normal';
  if (planetName !== 'sun') {
    const sunEq  = bodyRADec('sun', date, source);
    const sunLon = raDecToEclipticLon(sunEq.ra, sunEq.dec);
    const e      = ((lon - sunLon + 540) % 360) - 180;
    elongation = e;
    const absE = Math.abs(e);
    cazimi  = absE <= CAZIMI_DEG;
    combust = !cazimi && absE <= COMBUST_DEG;
    under   = !combust && !cazimi && absE <= UNDER_RAYS_DEG;
    // Oriental = morning star (planet west of Sun in longitude → rises before Sun).
    phase = e < 0 ? 'oriental' : 'occidental';
    if (cazimi)        heliacalState = 'cazimi';
    else if (combust)  heliacalState = 'combust';
    else if (under)    heliacalState = 'under_rays';
    else if (e < 0)    heliacalState = 'morning_star';
    else               heliacalState = 'evening_star';
  }

  return {
    planet:         planetName,
    glyph:          PLANET_SYMBOLS[planetName] || '',
    longitude:      lon,
    sign:           zod.sign,
    sign_index:     zod.idx,
    sign_glyph:     zod.symbol,
    degree_in_sign: ((lon % 30) + 30) % 30,
    latitude,
    daily_motion:   daily,
    is_retrograde:  retrograde,
    elongation,
    phase,
    is_combust:     combust,
    is_cazimi:      cazimi,
    is_under_rays:  under,
    heliacal_state: heliacalState,
  };
}

/**
 * All seven classical planets at a given date.
 */
export function getAllPositions(date, opts = {}) {
  const out = {};
  for (const name of PLANET_NAMES_ORDERED) {
    out[name] = getPlanet(name, date, opts);
  }
  return out;
}

/**
 * Ascendant + Midheaven at (date, lat, lon). Calls the existing astronomy
 * module; does not reimplement.
 */
export function getAngles(date, latDeg, lonDeg) {
  const ascLon = computeAscendant(date, latDeg, lonDeg);
  const gmst   = greenwichSiderealDeg(date);
  const lstDeg = ((gmst + lonDeg) % 360 + 360) % 360;
  // meanObliquityDeg takes Julian centuries since J2000, not a Date.
  const jd  = julianDay(date);
  const T   = (jd - 2451545.0) / 36525;
  const eps = meanObliquityDeg(T) * Math.PI / 180;
  const mcRa  = lstDeg * Math.PI / 180;
  let   mcLon = Math.atan2(Math.sin(mcRa), Math.cos(mcRa) * Math.cos(eps)) * 180 / Math.PI;
  mcLon = ((mcLon % 360) + 360) % 360;
  // Quadrant correction: ensure MC matches the ASC's hemisphere convention.
  // (The original astrology.js builds MC the same way; this preserves shape.)
  return {
    LST:  lstDeg,
    RAMC: lstDeg,
    Asc:  zodiacOfLon(ascLon),
    MC:   zodiacOfLon(mcLon),
    Desc: zodiacOfLon((ascLon + 180) % 360),
    IC:   zodiacOfLon((mcLon  + 180) % 360),
  };
}

function zodiacOfLon(lon) {
  const z = lonToZodiac(lon);
  return {
    longitude:  lon,
    sign:       z.sign,
    sign_index: z.idx,
    sign_glyph: z.symbol,
    degree:     ((lon % 30) + 30) % 30,
  };
}

/**
 * Julian Date for a JS Date.
 */
export function toJulianDate(date) {
  return julianDay(date);
}

// Re-export read-only references for downstream consumers so they can
// import everything astrology-side from this one module.
export {
  PLANET_NAMES_ORDERED, PLANET_SYMBOLS,
  ZODIAC_NAMES, ZODIAC_SYMBOLS,
  isRetrograde,
};
