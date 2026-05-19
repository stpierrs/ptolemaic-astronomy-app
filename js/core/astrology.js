// Astrology core — ecliptic positions, zodiac signs, retrograde detection,
// ascendant computation, and full natal chart builder.

import { bodyRADec, greenwichSiderealDeg } from './ephemeris.js';

const OBLIQUITY = 23.4367 * Math.PI / 180; // radians, J2000

export const ZODIAC_NAMES   = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
export const ZODIAC_SYMBOLS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
export const PLANET_SYMBOLS = { sun:'☉', moon:'☽', mercury:'☿', venus:'♀', mars:'♂', jupiter:'♃', saturn:'♄' };
export const PLANET_NAMES_ORDERED = ['sun','moon','mercury','venus','mars','jupiter','saturn'];

// Element groupings for zodiac wheel colours
export const ZODIAC_ELEMENT = {
  Aries:'fire', Leo:'fire', Sagittarius:'fire',
  Taurus:'earth', Virgo:'earth', Capricorn:'earth',
  Gemini:'air', Libra:'air', Aquarius:'air',
  Cancer:'water', Scorpio:'water', Pisces:'water',
};
export const ELEMENT_COLORS = {
  fire:  '#8b2b2b',
  earth: '#8b5a2b',
  water: '#2b5a8b',
  air:   '#2b8b5a',
};

/** RA/Dec (radians) → ecliptic longitude (degrees 0–360) */
export function raDecToEclipticLon(ra, dec) {
  const lambda = Math.atan2(
    Math.sin(ra) * Math.cos(OBLIQUITY) + Math.tan(dec) * Math.sin(OBLIQUITY),
    Math.cos(ra)
  );
  return ((lambda * 180 / Math.PI) % 360 + 360) % 360;
}

/** Ecliptic longitude (degrees) → { sign, symbol, deg, min, idx } */
export function lonToZodiac(lon) {
  const idx = Math.floor(((lon % 360) + 360) % 360 / 30) % 12;
  const rem = ((lon % 30) + 30) % 30;
  return {
    sign:   ZODIAC_NAMES[idx],
    symbol: ZODIAC_SYMBOLS[idx],
    deg:    Math.floor(rem),
    min:    Math.floor((rem % 1) * 60),
    idx,
  };
}

/**
 * Is a planet retrograde on `date`?
 * Compare ecliptic longitude change over +1 day. Negative = retrograde.
 * Sun and Moon are never retrograde.
 */
export function isRetrograde(bodyName, date, source = 'epicycle2') {
  if (bodyName === 'sun' || bodyName === 'moon') return false;
  try {
    const d2 = new Date(date.getTime() + 86400000);
    const eq1 = bodyRADec(bodyName, date, source);
    const eq2 = bodyRADec(bodyName, d2, source);
    if (!Number.isFinite(eq1.ra) || !Number.isFinite(eq2.ra)) return false;
    const lon1 = raDecToEclipticLon(eq1.ra, eq1.dec);
    const lon2 = raDecToEclipticLon(eq2.ra, eq2.dec);
    let diff = lon2 - lon1;
    if (diff >  180) diff -= 360;
    if (diff < -180) diff += 360;
    return diff < 0;
  } catch (_) { return false; }
}

/**
 * Find next retrograde start/end for a planet after `fromDate`.
 * Scans up to `maxDays` (default 400) in 1-day steps.
 * Returns { start: Date|null, end: Date|null }
 */
export function nextRetrograde(bodyName, fromDate, source = 'epicycle2', maxDays = 400) {
  if (bodyName === 'sun' || bodyName === 'moon') return { start: null, end: null };
  let wasRetro = isRetrograde(bodyName, fromDate, source);
  let start = wasRetro ? fromDate : null;
  let end = null;
  for (let i = 1; i <= maxDays; i++) {
    const d = new Date(fromDate.getTime() + i * 86400000);
    const retro = isRetrograde(bodyName, d, source);
    if (!wasRetro && retro) { start = d; }
    if (wasRetro && !retro && start) { end = d; break; }
    wasRetro = retro;
  }
  return { start, end };
}

/**
 * Compute Ascendant ecliptic longitude for a given date and observer lat/lon.
 * Uses RAMC = Local Sidereal Time in degrees.
 */
export function computeAscendant(date, latDeg, lonDeg) {
  const gmst = greenwichSiderealDeg(date);
  const lst  = ((gmst + lonDeg) % 360 + 360) % 360;
  const ramc = lst * Math.PI / 180;
  const lat  = latDeg * Math.PI / 180;
  const eps  = OBLIQUITY;
  const asc = Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat) * Math.sin(eps)));
  let ascDeg = ((asc * 180 / Math.PI) % 360 + 360) % 360;
  if (Math.cos(ramc) < 0) ascDeg = (ascDeg + 180) % 360;
  return ascDeg;
}

/**
 * Build a full natal chart for a given JS Date and observer lat/lon.
 * Returns { planets, ascendant, mc, ascLon, mcLon }
 */
export function buildNatalChart(date, latDeg, lonDeg, source = 'epicycle2') {
  const planets = [];
  for (const name of PLANET_NAMES_ORDERED) {
    try {
      const eq  = bodyRADec(name, date, source);
      if (!Number.isFinite(eq.ra)) continue;
      const lon = raDecToEclipticLon(eq.ra, eq.dec);
      planets.push({
        name,
        symbol: PLANET_SYMBOLS[name],
        lon,
        zodiac: lonToZodiac(lon),
        retrograde: isRetrograde(name, date, source),
      });
    } catch (_) {}
  }
  const ascLon = computeAscendant(date, latDeg, lonDeg);
  const gmst   = greenwichSiderealDeg(date);
  const lstDeg = ((gmst + lonDeg) % 360 + 360) % 360;
  const mcRa   = lstDeg * Math.PI / 180;
  const mcLon  = ((Math.atan2(Math.tan(mcRa) * Math.cos(OBLIQUITY), 1) * 180 / Math.PI) % 360 + 360) % 360;
  return {
    planets,
    ascendant: lonToZodiac(ascLon),
    mc:        lonToZodiac(mcLon),
    ascLon,
    mcLon,
  };
}
