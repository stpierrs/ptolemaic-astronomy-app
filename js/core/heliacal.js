// js/core/heliacal.js
// PART 12.6 — Heliacal phenomena: first heliacal rising → morning star
// → acronychal rising → evening star → last heliacal setting → combust
// → next first heliacal rising. Detection uses elongation crossings
// against the per-planet arcus visionis thresholds.

import { ARCUS_VISIONIS } from './solarPhase.js';
import { getPlanet } from './astrologyAdapter.js';

const MS_DAY = 86400 * 1000;

export const HELIACAL_PHASES = [
  'cazimi',
  'combust',
  'first-heliacal-rising',
  'morning-star',
  'acronychal-rising',
  'evening-star',
  'last-heliacal-setting',
];

export const HELIACAL_LABEL = {
  'cazimi':                'Cazimi',
  'combust':               'Combust',
  'first-heliacal-rising': 'First heliacal rising',
  'morning-star':          'Morning star',
  'acronychal-rising':     'Acronychal rising (opposition)',
  'evening-star':          'Evening star',
  'last-heliacal-setting': 'Last heliacal setting',
};

export const HELIACAL_GLYPH = {
  'cazimi':                '★',
  'combust':               '⊙',
  'first-heliacal-rising': '↑',
  'morning-star':          '←',
  'acronychal-rising':     '↔',
  'evening-star':          '→',
  'last-heliacal-setting': '↓',
};

// Legacy aliases — Guide 05 spec uses HELIACAL_*, prior pass used PHASE_*.
export const PHASE_LABEL = HELIACAL_LABEL;
export const PHASE_GLYPH = HELIACAL_GLYPH;

/**
 * Heliacal phase from a planet snapshot (PART 1.7 shape — fields used:
 * .planet, .elongation, .is_cazimi, .is_combust, .is_retrograde).
 *
 * @param {object} planet
 * @returns {string|null} one of HELIACAL_PHASES, or null for sun/moon
 */
export function classifyHeliacal(planet) {
  if (!planet) return null;
  if (planet.planet === 'sun' || planet.planet === 'moon') return null;
  if (planet.is_cazimi)  return 'cazimi';
  if (planet.is_combust) return 'combust';
  const arc = ARCUS_VISIONIS[planet.planet];
  if (!arc) return null;
  const e = planet.elongation;
  const absE = Math.abs(e);

  // First heliacal rising: just emerged from combust on morning side
  if (e < 0 && absE < arc.morning + 1.5 && !planet.is_retrograde)
    return 'first-heliacal-rising';
  // Last heliacal setting: about to enter combust on evening side
  if (e > 0 && absE < arc.evening + 1.5 && planet.is_retrograde)
    return 'last-heliacal-setting';
  if (absE > 170)         return 'acronychal-rising';
  if (e < 0)              return 'morning-star';
  return 'evening-star';
}

/**
 * Legacy signature — call sites that already compute elongation themselves
 * (e.g. buildPlanetRows in astrologyApp.js) can keep working. Synthesises
 * the PART 1.7 fields classifyHeliacal needs from primitives.
 */
export function heliacalPhase(planetName, elongation, retrograde) {
  const phase = classifyHeliacal({
    planet:         planetName,
    elongation,
    is_retrograde:  !!retrograde,
    is_cazimi:      Math.abs(elongation) <= 17 / 60,
    is_combust:     Math.abs(elongation) > 17 / 60 && Math.abs(elongation) <= 8,
  });
  return { phase, oriental: elongation < 0 };
}

/**
 * Scan forward `maxDays` looking for heliacal-phase transitions in each of
 * the given planets. Returns events sorted by date.
 *
 * @param {string[]} planetNames
 * @param {Date} fromDate
 * @param {number} [maxDays=90]
 * @param {string} [source='ibnshatir']
 * @returns {Array<{ date: Date, planet: string, fromPhase: string|null, toPhase: string }>}
 */
export function findUpcomingHeliacalEvents(planetNames, fromDate, maxDays = 90, source = 'ibnshatir') {
  const events = [];
  for (const name of planetNames) {
    if (name === 'sun' || name === 'moon') continue;
    let prevPhase = classifyHeliacal(getPlanet(name, fromDate, { source }));
    for (let d = 1; d <= maxDays; d++) {
      const date = new Date(fromDate.getTime() + d * MS_DAY);
      const cur = classifyHeliacal(getPlanet(name, date, { source }));
      if (cur && cur !== prevPhase) {
        events.push({ date, planet: name, fromPhase: prevPhase, toPhase: cur });
        prevPhase = cur;
      }
    }
  }
  events.sort((a, b) => a.date - b.date);
  return events;
}
