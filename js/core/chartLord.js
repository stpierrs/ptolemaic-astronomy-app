// js/core/chartLord.js
// PART 11.1 — Oikodespotes (chart lord) selection.
//
// Priority chain:
//   1. Highest essential dignity at an angular house (I/IV/VII/X)
//   2. Ruler of the Ascendant sign
//   3. Planet most closely aspecting the Ascendant degree (whole-sign,
//      tiebroken by absolute degree-distance)
//   4. Ruler of the sect light's sign (Sun by day, Moon by night)

import { DOMICILE, getPlanetDignity } from './dignities.js';
import { wholeSignHouseOf } from './houses.js';

const ANGULAR = new Set([1, 4, 7, 10]);

/**
 * @param {object} chart - { ascLon, isDiurnal, planets:[{name,lon,...}] }
 * @returns {{ name: string, score: number, source: string }|null}
 */
export function selectChartLord(chart) {
  if (!chart || !Array.isArray(chart.planets) || typeof chart.ascLon !== 'number') return null;

  const ascSign  = Math.floor((((chart.ascLon % 360) + 360) % 360) / 30);
  const ascRuler = rulerOfSign(ascSign);

  // 1. Highest essential dignity at angular house
  let best = null;
  for (const p of chart.planets) {
    const h = wholeSignHouseOf(p.lon, chart.ascLon);
    if (!ANGULAR.has(h)) continue;
    const d = getPlanetDignity(p.name, p.lon, chart.isDiurnal);
    if (!best || d.score > best.score) {
      best = { name: p.name, score: d.score, source: `angular H${h} dignity ${d.score >= 0 ? '+' : ''}${d.score}` };
    }
  }
  if (best && best.score > 0) return best;

  // 2. Ascendant ruler
  if (ascRuler) {
    const ascRulerP = chart.planets.find(p => p.name === ascRuler);
    if (ascRulerP) {
      return {
        name:   ascRuler,
        score:  getPlanetDignity(ascRuler, ascRulerP.lon, chart.isDiurnal).score,
        source: 'Ascendant ruler',
      };
    }
    return { name: ascRuler, score: 0, source: 'Ascendant ruler (not in chart)' };
  }

  // 3. Closest aspecting planet to ASC degree
  let closest = null;
  for (const p of chart.planets) {
    const pSign = Math.floor((((p.lon % 360) + 360) % 360) / 30);
    const raw = Math.abs(pSign - ascSign);
    const diff = Math.min(raw, 12 - raw);
    if (![0, 2, 3, 4, 6].includes(diff)) continue;
    const sepRaw = Math.abs(p.lon - chart.ascLon);
    const sep = Math.min(sepRaw, 360 - sepRaw);
    if (!closest || sep < closest.sep) closest = { name: p.name, sep };
  }
  if (closest) return { name: closest.name, score: 0, source: `closest aspect to ASC (${closest.sep.toFixed(1)}°)` };

  // 4. Ruler of sect light's sign
  const sectLight = chart.isDiurnal ? 'sun' : 'moon';
  const slP = chart.planets.find(p => p.name === sectLight);
  if (slP) {
    const slSign = Math.floor((((slP.lon % 360) + 360) % 360) / 30);
    const lord = rulerOfSign(slSign);
    if (lord) return { name: lord, score: 0, source: `ruler of ${sectLight}'s sign` };
  }
  return null;
}

function rulerOfSign(signIdx) {
  for (const [planet, signs] of Object.entries(DOMICILE)) {
    if (signs.includes(signIdx)) return planet;
  }
  return null;
}
