// PART 7.2 — Solar phase conditions
// Cazimi (≤0°17′), combust (≤8°), under rays (8°–15°),
// morning star (oriental), evening star (occidental).
// PART 7.1 — House position multipliers fold into accidental dignity.

import { wholeSignHouseOf } from './houses.js';

const CAZIMI_DEG     = 17 / 60;   // 0°17′
const COMBUST_DEG    = 8;
const UNDER_RAYS_DEG = 15;

/**
 * Classify a planet's condition relative to the Sun.
 * @param {number} planetLon - ecliptic longitude in degrees
 * @param {number} sunLon    - ecliptic longitude in degrees
 * @returns {{
 *   elongation: number,       // signed degrees; positive = planet ahead of Sun
 *   cazimi: boolean,
 *   combust: boolean,
 *   underRays: boolean,
 *   oriental: boolean,        // morning star (planet rises before Sun)
 *   occidental: boolean,      // evening star (planet sets after Sun)
 * }}
 */
export function solarPhase(planetLon, sunLon) {
  let elong = ((planetLon - sunLon + 540) % 360) - 180;
  const absE = Math.abs(elong);

  const cazimi    = absE <= CAZIMI_DEG;
  const combust   = !cazimi && absE <= COMBUST_DEG;
  const underRays = !combust && !cazimi && absE <= UNDER_RAYS_DEG;

  // Oriental = planet west of Sun in longitude → rises before Sun (Hellenistic
  // convention). Occidental = east of Sun → sets after Sun.
  const oriental   = elong < 0 && !combust && !cazimi;
  const occidental = elong > 0 && !combust && !cazimi;

  return { elongation: elong, cazimi, combust, underRays, oriental, occidental };
}

const ANGULAR   = new Set([1, 4, 7, 10]);
const SUCCEDENT = new Set([2, 5, 8, 11]);
// cadent: 3, 6, 9, 12

const DIURNAL_PLANETS   = new Set(['sun', 'jupiter', 'saturn']);
const NOCTURNAL_PLANETS = new Set(['moon', 'venus', 'mars']);

/**
 * Accidental dignity score for a planet in a chart.
 * Score is purely indicative; not added to the essential-dignity score.
 *
 * @param {string} planetName
 * @param {object} chart - from computeFullChart()
 * @returns {{ score: number, breakdown: string[] }}
 */
export function accidentalDignity(planetName, chart) {
  if (!chart || !Array.isArray(chart.planets)) return { score: 0, breakdown: ['no chart'] };
  const p = chart.planets.find(pl => pl.name === planetName);
  if (!p) return { score: 0, breakdown: ['no planet'] };

  const breakdown = [];
  let score = 0;

  const house = wholeSignHouseOf(p.lon, chart.ascLon);
  if (ANGULAR.has(house))   { score += 4; breakdown.push(`Angular H${house} +4`); }
  else if (SUCCEDENT.has(house)) { score += 2; breakdown.push(`Succedent H${house} +2`); }
  else                      { score -= 2; breakdown.push(`Cadent H${house} −2`); }

  if (planetName !== 'sun') {
    const sun = chart.planets.find(pl => pl.name === 'sun');
    if (sun) {
      const phase = solarPhase(p.lon, sun.lon);
      if (phase.cazimi)        { score += 5; breakdown.push('Cazimi +5'); }
      else if (phase.combust)  { score -= 5; breakdown.push('Combust −5'); }
      else if (phase.underRays){ score -= 2; breakdown.push('Under rays −2'); }
      else if (phase.oriental) { score += 1; breakdown.push('Oriental (morning star) +1'); }
      // occidental is neutral
    }
  }

  if (p.retrograde) {
    score -= 1; breakdown.push('Retrograde −1 (intensified but inward)');
  }

  const isDay = chart.isDiurnal;
  if (isDay && DIURNAL_PLANETS.has(planetName))    { score += 1; breakdown.push('In sect +1'); }
  if (!isDay && NOCTURNAL_PLANETS.has(planetName)) { score += 1; breakdown.push('In sect +1'); }

  return { score, breakdown };
}
