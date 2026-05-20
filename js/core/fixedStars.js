// js/core/fixedStars.js
// PART 5 / 16 — Astrologically active fixed stars: precession, ±8°
// latitude filtering, planetary nature, conjunction detection.
//
// Catalogue data lives in js/data/astrology/star_natures.js. This module
// is the engine — precession at 1.396°/century, conjunction + whole-sign
// aspect detection.

import starCatalog from '../data/astrology/star_natures.js';

const PRECESSION_DEG_PER_CENT = 1.396;
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

export const FIXED_STARS = starCatalog;

/**
 * Apply precession to bring a J2000 longitude to `date`.
 * Rate: 1.396°/century (PART 16.1 / 5.1).
 */
export function precessedLon(lon2000, date) {
  const centuries = (date.getTime() - J2000_MS) / (100 * 365.25 * 86400000);
  return ((lon2000 + PRECESSION_DEG_PER_CENT * centuries) % 360 + 360) % 360;
}

/**
 * Catalogue as of `date`. Each entry's `lon` is precessed; `inZodiacalBelt`
 * flags |ecliptic latitude| ≤ 8° (PART 5.2 / 16.1 — only belt stars can
 * physically conjoin a planet).
 */
export function fixedStarsAt(date) {
  return FIXED_STARS.map(s => {
    const lon = precessedLon(s.lon2000, date);
    return {
      ...s,
      lon,
      signIdx:        Math.floor((((lon % 360) + 360) % 360) / 30),
      inZodiacalBelt: Math.abs(s.lat) <= 8,
    };
  });
}

/**
 * Star–planet conjunctions within `orbDeg`. Only stars in the ±8° belt
 * qualify for direct contact (PART 5.2). Sorted closest first.
 */
export function starPlanetConjunctions(chartPlanets, date, orbDeg = 1) {
  if (!Array.isArray(chartPlanets)) return [];
  const stars = fixedStarsAt(date);
  const out = [];
  for (const star of stars) {
    if (!star.inZodiacalBelt) continue;
    for (const p of chartPlanets) {
      const raw = Math.abs(p.lon - star.lon);
      const sep = Math.min(raw, 360 - raw);
      if (sep <= orbDeg) out.push({ star, planet: p.name, sepDeg: sep });
    }
  }
  out.sort((a, b) => a.sepDeg - b.sepDeg);
  return out;
}

/**
 * Whole-sign aspects between named stars and natal planets (PART 16.3 / 5.3).
 * Aspectual influence is allowed at any ecliptic latitude — stars outside
 * the ±8° belt are eligible here.
 *
 * NOTE on signDiff=0: counted as 'conjunction-by-sign', a distinct relation
 * from the ≤1° direct conjunction in starPlanetConjunctions.
 */
export function starPlanetWholeSignAspects(chartPlanets, date) {
  if (!Array.isArray(chartPlanets)) return [];
  const stars = fixedStarsAt(date);
  const out = [];
  for (const star of stars) {
    for (const p of chartPlanets) {
      const pSign = Math.floor((((p.lon % 360) + 360) % 360) / 30);
      const raw = Math.abs(pSign - star.signIdx);
      const signDiff = Math.min(raw, 12 - raw);
      if ([0, 2, 3, 4, 6].includes(signDiff)) {
        out.push({ star: star.name, planet: p.name, signDiff });
      }
    }
  }
  return out;
}
