// PART 12 — The Ptolemaic Lots (Arabic Parts). Three lots only:
// Fortune, Spirit, Eros.

import { DOMICILE } from './dignities.js';

const norm = d => ((d % 360) + 360) % 360;

/**
 * @param {{ ascLon: number, planets: Array, isDiurnal: boolean }} chart
 * @returns {{
 *   fortune: { lon, lord },
 *   spirit:  { lon, lord },
 *   eros:    { lon, lord },
 * }}
 */
export function computeLots(chart) {
  if (!chart) return null;
  const asc  = chart.ascLon ?? 0;
  const sun  = chart.planets?.find(p => p.name === 'sun')?.lon  ?? 0;
  const moon = chart.planets?.find(p => p.name === 'moon')?.lon ?? 0;
  const day  = chart.isDiurnal !== false;

  // PART 12.1 — Fortune
  const fortune = day
    ? norm(asc + moon - sun)
    : norm(asc + sun - moon);

  // PART 12.2 — Spirit (Fortune's day/night counterpart)
  const spirit = day
    ? norm(asc + sun - moon)
    : norm(asc + moon - sun);

  // PART 12.3 — Eros
  // Day:   ASC + lon(lord of Fortune) − lon(lord of Spirit)
  // Night: reversed
  const fLordLon = lordOfLon(fortune, chart.planets)?.lon ?? 0;
  const sLordLon = lordOfLon(spirit,  chart.planets)?.lon ?? 0;
  const eros = day
    ? norm(asc + fLordLon - sLordLon)
    : norm(asc + sLordLon - fLordLon);

  return {
    fortune: { lon: fortune, lord: lordNameOfLon(fortune) },
    spirit:  { lon: spirit,  lord: lordNameOfLon(spirit)  },
    eros:    { lon: eros,    lord: lordNameOfLon(eros)    },
  };
}

export function lordNameOfLon(lon) {
  const idx = Math.floor(norm(lon) / 30);
  const entry = Object.entries(DOMICILE).find(([, signs]) => signs.includes(idx));
  return entry ? entry[0] : null;
}

function lordOfLon(lon, planets) {
  const n = lordNameOfLon(lon);
  if (!n || !Array.isArray(planets)) return null;
  return planets.find(p => p.name === n) || null;
}
