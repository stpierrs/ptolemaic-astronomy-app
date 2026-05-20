// Astrological aspect definitions and computation utilities.
// Aspects conform to Ptolemy's five configurations (Tetrabiblos Book I, Ch. XVI):
//   "The distance by diameter … at the triangular distance … at the quadrate
//    distance … at the hexagonal distance … and the conjunction."
//
// PART 8.2 — Aspects are sign-based, not degree-based. A pair of bodies whose
// signs are 0/2/3/4/6 apart always reports an aspect, regardless of orb.
// Degree-orb is preserved as a secondary refinement (exact / tight / wide,
// applying / separating).
//
// NOTE: The Quincunx (150°) is NOT a Ptolemaic aspect. Ptolemy calls 150°-distant
// signs "inconjunct" or "averted" (Ch. XIX) — they share no familiarity.

import { moietyOrb } from './dignities.js';

export const ASPECT_DEFS = [
  {
    name: 'Conjunction', ptolemyName: 'Conjunction',
    angle: 0,   orb: 10, symbol: '☌', color: '#ffe066', harmony: 'neutral',
    description: 'Fusion of natures — planets blend their influence directly.',
  },
  {
    name: 'Sextile',     ptolemyName: 'Sextile (Hexagonal)',
    angle: 60,  orb: 9,  symbol: '⚹', color: '#66ccff', harmony: 'easy',
    description: 'Harmonious — signs of the same sex; mild, co-operative influence.',
  },
  {
    name: 'Square',      ptolemyName: 'Quartile',
    angle: 90,  orb: 10, symbol: '□', color: '#ff6644', harmony: 'hard',
    description: 'Discordant — signs of different natures; energetic, conflicting.',
  },
  {
    name: 'Trine',       ptolemyName: 'Trine (Triangular)',
    angle: 120, orb: 11, symbol: '△', color: '#66dd88', harmony: 'easy',
    description: 'Harmonious — signs of the same element; settled, beneficial.',
  },
  {
    name: 'Opposition',  ptolemyName: 'Diametrical Opposition',
    angle: 180, orb: 11, symbol: '☍', color: '#ff8844', harmony: 'hard',
    description: 'Discordant and polarising — the full diameter; maximum tension.',
  },
];

// PART 20.4 — Whole-sign aspect matrix: sign-difference 0/2/3/4/6 → aspect.
const SIGN_DIFF_TO_ASPECT = {
  0: 'Conjunction',
  2: 'Sextile',
  3: 'Square',
  4: 'Trine',
  6: 'Opposition',
};

/**
 * Find the whole-sign aspect between two ecliptic longitudes.
 * Returns null if the signs are not in classical aspect (1 or 5 signs apart =
 * "inconjunct/averted", PART 8.1).
 *
 * @param {number}  lon1
 * @param {number}  lon2
 * @param {string}  [planet1]
 * @param {string}  [planet2]
 * @returns {{
 *   name, angle, symbol, color, harmony, description, ptolemyName,
 *   wholeSign: true, signDiff, degreeOffExact, exact, tight, applying, orb
 * } | null}
 */
export function findAspect(lon1, lon2, planet1, planet2) {
  const sign1 = Math.floor((((lon1 % 360) + 360) % 360) / 30);
  const sign2 = Math.floor((((lon2 % 360) + 360) % 360) / 30);
  const rawDiff = Math.abs(sign1 - sign2);
  const signDiff = Math.min(rawDiff, 12 - rawDiff);

  const aspectName = SIGN_DIFF_TO_ASPECT[signDiff];
  if (!aspectName) return null;

  const def = ASPECT_DEFS.find(a => a.name === aspectName);
  if (!def) return null;

  // Degree refinement — applying vs separating, exactness
  const angDiff = Math.abs(((lon2 - lon1 + 540) % 360) - 180);
  const degreeOffExact = Math.abs(angDiff - def.angle);
  const moiety = (planet1 && planet2) ? moietyOrb(planet1, planet2) : def.orb;
  const exact = degreeOffExact <= 1;
  const tight = degreeOffExact <= moiety;

  // Applying ≈ faster planet closing in on slower. Without per-planet speeds
  // here, fall back to the lon1<lon2 closing test (PART 8.3 — secondary).
  const closing = ((lon2 - lon1 + 360) % 360) < 180;

  return {
    ...def,
    wholeSign:      true,
    signDiff,
    degreeOffExact,
    exact,
    tight,
    applying:       closing,
    // Legacy field preserved so existing callers reading aspect.orb keep working.
    orb:            degreeOffExact,
  };
}

/**
 * Compute all whole-sign aspects within a list of { name, lon } planets.
 *
 * @param {{ name: string, lon: number, symbol?: string }[]} planets
 * @returns {{ planetA, planetB, aspect }[]}
 */
export function computeAspects(planets) {
  const results = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const asp = findAspect(
        planets[i].lon, planets[j].lon,
        planets[i].name, planets[j].name,
      );
      if (asp) results.push({ planetA: planets[i], planetB: planets[j], aspect: asp });
    }
  }
  return results;
}

/**
 * Compute cross-aspects between two charts (for synastry / transits).
 *
 * @param {{ name: string, lon: number, symbol?: string }[]} natal
 * @param {{ name: string, lon: number, symbol?: string }[]} transiting
 * @returns {{ natal, transiting, aspect }[]}
 */
export function computeCrossAspects(natal, transiting) {
  const results = [];
  for (const n of natal) {
    for (const t of transiting) {
      const asp = findAspect(n.lon, t.lon, n.name, t.name);
      if (asp) results.push({ natal: n, transiting: t, aspect: asp });
    }
  }
  return results;
}
