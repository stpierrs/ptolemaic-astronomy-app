// Astrological aspect definitions and computation utilities.
// Aspects conform to Ptolemy's five configurations (Tetrabiblos Book I, Ch. XVI):
//   "The distance by diameter … at the triangular distance … at the quadrate
//    distance … at the hexagonal distance … and the conjunction."
//
// NOTE: The Quincunx (150°) is NOT a Ptolemaic aspect. Ptolemy calls 150°-distant
// signs "inconjunct" or "averted" (Ch. XIX) — they share no familiarity.
// Orb checking uses planet-specific moieties when planet names are supplied;
// otherwise falls back to the fixed orb in ASPECT_DEFS.

import { moietyOrb, PLANET_ORBS } from './dignities.js';

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

/**
 * Find the aspect between two ecliptic longitudes, using optional per-planet moiety orbs.
 *
 * @param {number}  lon1
 * @param {number}  lon2
 * @param {string}  [planet1] — if supplied, moiety-based orb is used
 * @param {string}  [planet2] — if supplied, moiety-based orb is used
 * @returns {{ name, angle, orb, symbol, color, harmony, description, ptolemyName } | null}
 */
export function findAspect(lon1, lon2, planet1, planet2) {
  const diff = Math.abs(((lon2 - lon1 + 540) % 360) - 180); // 0–180
  for (const asp of ASPECT_DEFS) {
    // Use moiety orb if both planet names are known, otherwise fixed orb
    const allowedOrb = (planet1 && planet2)
      ? moietyOrb(planet1, planet2)
      : asp.orb;
    const actualOrb = Math.abs(diff - asp.angle);
    if (actualOrb <= allowedOrb) return { ...asp, orb: actualOrb };
  }
  return null;
}

/**
 * Compute all aspects within a list of { name, lon } planets.
 * Uses Ptolemaic moiety-based orbs when planet names are available.
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
