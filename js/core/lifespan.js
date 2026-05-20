// PART 17 — Length of Life via Apheta / Anareta / Primary Directions.
//
// The output is indicative, not deterministic. The chain of reasoning
// (chosen Apheta, anareta candidates, directed arcs) is surfaced so the
// user can see how the verdict is composed.

import { wholeSignHouseOf } from './houses.js';

const APHETIC_HOUSES   = new Set([1, 7, 9, 10, 11]); // PART 17.1
const ANARETIC_PLANETS = ['saturn', 'mars'];
const ANARETIC_ASPECTS = [0, 90, 180]; // conjunction, square, opposition

/**
 * Choose the Apheta in PART 17.1 priority order.
 * @returns {{ name: string, lon: number, house: number, source: string }}
 */
export function selectApheta(chart) {
  if (!chart || !Array.isArray(chart.planets) || typeof chart.ascLon !== 'number') {
    return { name: 'asc', lon: 0, house: 1, source: 'Ascendant (no chart)' };
  }
  const sun  = chart.planets.find(p => p.name === 'sun');
  const moon = chart.planets.find(p => p.name === 'moon');
  const isDay = chart.isDiurnal !== false;
  const houseOf = lon => wholeSignHouseOf(lon, chart.ascLon);

  if (isDay && sun) {
    const h = houseOf(sun.lon);
    if (APHETIC_HOUSES.has(h)) {
      return { name: 'sun', lon: sun.lon, house: h, source: 'Sun (diurnal, aphetic)' };
    }
  }
  if (!isDay && moon) {
    const h = houseOf(moon.lon);
    if (APHETIC_HOUSES.has(h)) {
      return { name: 'moon', lon: moon.lon, house: h, source: 'Moon (nocturnal, aphetic)' };
    }
  }
  // Practical fallback: Ascendant. Lot of Fortune and preceding syzygy are
  // documented in PART 17.1 as further fallbacks; left as future refinement.
  return { name: 'asc', lon: chart.ascLon, house: 1, source: 'Ascendant (luminaries not aphetic)' };
}

function aspectName(ang) {
  if (ang === 0)   return 'conjunction';
  if (ang === 90)  return 'square';
  if (ang === 180) return 'opposition';
  return `${ang}°`;
}

function signedArc(from, to) {
  return ((to - from + 540) % 360) - 180;
}

/**
 * Find every potential anareta point reachable from the Apheta and the
 * directed arc (degrees) the Apheta must traverse to reach it.
 *
 * Honest note: PART 14.2 specifies arcs in right ascension; we use the
 * ecliptic-difference approximation (agrees with RA to ~1–2° for points
 * near the ecliptic) which is sufficient for timeline display.
 */
export function findAnaretae(chart, apheta) {
  if (!chart || !Array.isArray(chart.planets) || !apheta) return [];
  const targets = [];
  for (const p of chart.planets) {
    if (!ANARETIC_PLANETS.includes(p.name)) continue;
    for (const ang of ANARETIC_ASPECTS) {
      const arc = Math.abs(signedArc(apheta.lon, p.lon - ang));
      targets.push({
        target:      `${p.name} ${aspectName(ang)}`,
        arcDeg:      arc,
        aspectAngle: ang,
        planet:      p.name,
      });
      if (ang !== 0 && ang !== 180) {
        const arc2 = Math.abs(signedArc(apheta.lon, p.lon + ang));
        targets.push({
          target:      `${p.name} ${aspectName(ang)} (other side)`,
          arcDeg:      arc2,
          aspectAngle: ang,
          planet:      p.name,
        });
      }
    }
  }
  targets.sort((a, b) => a.arcDeg - b.arcDeg);
  return targets;
}

/**
 * Primary directions timeline.
 * PART 14.2 — 1° of right ascension = 1 year of life.
 *
 * @param {object} chart
 * @param {number} currentAge   - integer years since birth
 * @param {number} maxYears     - look-ahead window
 * @returns {Array<{ atAge: number, planet: string, aspect: string }>}
 */
export function primaryDirections(chart, currentAge, maxYears = 30) {
  if (!chart || !Array.isArray(chart.planets)) return [];
  const apheta = selectApheta(chart);
  const events = [];
  for (const p of chart.planets) {
    for (const ang of [0, 60, 90, 120, 180]) {
      const targetLon = (p.lon - ang + 360) % 360;
      const arc = ((targetLon - apheta.lon) % 360 + 360) % 360;
      const atAge = Math.round(arc);
      if (atAge >= currentAge && atAge <= currentAge + maxYears) {
        events.push({ atAge, planet: p.name, aspect: aspectName(ang), arcDeg: arc });
      }
    }
  }
  events.sort((a, b) => a.atAge - b.atAge);
  return events;
}
