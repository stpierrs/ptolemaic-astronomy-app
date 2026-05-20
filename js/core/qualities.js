// js/core/qualities.js
// Hot / Cold / Moist / Dry primitives, Mercury dynamic resolver,
// temperament computation, quality-interaction matrix.
//
// Spec references: PART 3 (qualities), PART 4.2 / 15.2 (sign table),
// PART 5.2 / 15.3 (planet table), PART 8.3 (Mercury dynamic),
// PART 10.5 / 11.4 (temperament), PART 13.4 / 15.4 (interactions).

import { SIGN_QUALITY, PLANET_QUALITY } from '../data/astrology/quality_table.js';
import { DOMICILE } from './dignities.js';

const PRIMARY_OPPOSITES   = { hot: 'cold',  cold: 'hot'   };
const SECONDARY_OPPOSITES = { moist: 'dry', dry: 'moist'  };

// The spec table mixes shorthand: "warm" (≡ moderate hot), "hot-moderate",
// "dry-moderate" etc. Collapse to the four canonical labels so combine /
// vote logic doesn't need to handle every spelling.
const QUALITY_LABEL_BASES = {
  'hot-moderate':   'hot',
  'cold-moderate':  'cold',
  'moist-moderate': 'moist',
  'dry-moderate':   'dry',
  'warm':           'hot',
};

function normaliseQualityLabel(q) {
  if (q == null) return null;
  if (PRIMARY_OPPOSITES[q] !== undefined)   return q;
  if (SECONDARY_OPPOSITES[q] !== undefined) return q;
  return QUALITY_LABEL_BASES[q] || q;
}

export function signQuality(signIdx) {
  const i = (((signIdx | 0) % 12) + 12) % 12;
  const e = SIGN_QUALITY[i];
  return {
    element:   e.element,
    primary:   normaliseQualityLabel(e.primary),
    secondary: normaliseQualityLabel(e.secondary),
    name:      e.name,
  };
}

/**
 * Planet quality. Mercury is dynamic (PART 8.3) and needs a chart.
 *
 * @param {string} name
 * @param {{ planets, isDiurnal }} [chart] - only required for Mercury
 */
export function planetQuality(name, chart = null) {
  if (name !== 'mercury') {
    const q = PLANET_QUALITY[name];
    if (!q) return null;
    return {
      primary:   normaliseQualityLabel(q.primary),
      secondary: normaliseQualityLabel(q.secondary),
      nature:    q.nature,
      sect:      q.sect,
    };
  }
  return mercuryQuality(chart);
}

function mercuryQuality(chart) {
  const fallback = { primary: 'cold', secondary: 'dry', nature: 'mixed', sect: 'mixed' };
  if (!chart || !Array.isArray(chart.planets)) return fallback;
  const merc = chart.planets.find(p => p.name === 'mercury');
  if (!merc) return fallback;

  // PART 8.3 — cazimi / combust special cases
  const sun = chart.planets.find(p => p.name === 'sun');
  if (sun) {
    const raw = Math.abs(merc.lon - sun.lon);
    const sep = Math.min(raw, 360 - raw);
    if (sep <= 17 / 60) return { primary: 'hot',  secondary: 'dry', nature: 'cazimi-solar',    sect: 'day'   };
    if (sep <= 8)       return { primary: 'cold', secondary: 'dry', nature: 'combust-reduced', sect: 'mixed' };
  }

  // Whole-sign aspects from other planets
  const mercSign = Math.floor((((merc.lon % 360) + 360) % 360) / 30);
  const tally = { hot: 0, cold: 0, moist: 0, dry: 0 };
  let aspectCount = 0;
  for (const p of chart.planets) {
    if (p.name === 'mercury') continue;
    const pSign = Math.floor((((p.lon % 360) + 360) % 360) / 30);
    const raw = Math.abs(pSign - mercSign);
    const diff = Math.min(raw, 12 - raw);
    if (![0, 2, 3, 4, 6].includes(diff)) continue;
    const q = PLANET_QUALITY[p.name];
    if (!q || !q.primary) continue;
    const pri = normaliseQualityLabel(q.primary);
    const sec = normaliseQualityLabel(q.secondary);
    if (pri in tally) tally[pri]++;
    if (sec in tally) tally[sec]++;
    aspectCount++;
  }
  if (!aspectCount) return fallback;
  const primary   = tally.hot   >= tally.cold ? 'hot'   : 'cold';
  const secondary = tally.moist >= tally.dry  ? 'moist' : 'dry';
  return { primary, secondary, nature: 'dynamic-from-aspects', sect: 'mixed' };
}

const TEMPERAMENT_BY_PAIR = {
  'hot+moist':  'sanguine',
  'hot+dry':    'choleric',
  'cold+dry':   'melancholic',
  'cold+moist': 'phlegmatic',
};

export function temperament(votes) {
  const p = votes.hot   >= votes.cold ? 'hot'   : 'cold';
  const s = votes.moist >= votes.dry  ? 'moist' : 'dry';
  return TEMPERAMENT_BY_PAIR[`${p}+${s}`];
}

// PART 11.4 — significators: Asc sign · Asc lord · Moon · planets ≤5° of Asc.
export function computeTemperament(chart) {
  const tally = { hot: 0, cold: 0, moist: 0, dry: 0 };
  if (!chart || typeof chart.ascLon !== 'number') {
    return { temperament: null, votes: tally };
  }

  const ascSign = Math.floor((((chart.ascLon % 360) + 360) % 360) / 30);
  vote(signQuality(ascSign), tally);

  const ascRulerEntry = Object.entries(DOMICILE).find(([, signs]) => signs.includes(ascSign));
  if (ascRulerEntry && Array.isArray(chart.planets)) {
    const [ascRuler] = ascRulerEntry;
    const ascRulerP = chart.planets.find(p => p.name === ascRuler);
    if (ascRulerP) vote(signQuality(Math.floor(((ascRulerP.lon % 360) + 360) % 360 / 30)), tally);
  }

  if (Array.isArray(chart.planets)) {
    const moon = chart.planets.find(p => p.name === 'moon');
    if (moon) vote(signQuality(Math.floor(((moon.lon % 360) + 360) % 360 / 30)), tally);
    for (const p of chart.planets) {
      const raw = Math.abs(p.lon - chart.ascLon);
      const d = Math.min(raw, 360 - raw);
      if (d <= 5) vote(planetQuality(p.name, chart), tally);
    }
  }

  return { temperament: temperament(tally), votes: tally };
}

function vote(q, tally) {
  if (!q) return;
  if (q.primary   && q.primary   in tally) tally[q.primary]++;
  if (q.secondary && q.secondary in tally) tally[q.secondary]++;
}

// PART 3.3 / 15.4 — combine two qualities.
export function combineQualities(a, b) {
  if (!a || !b) return 'mixed';
  const reinforced = (a.primary === b.primary) || (a.secondary === b.secondary);
  const opposed    = (PRIMARY_OPPOSITES[a.primary] === b.primary)
                  || (SECONDARY_OPPOSITES[a.secondary] === b.secondary);
  if (reinforced && !opposed) return 'reinforced';
  if (opposed && !reinforced) return 'opposed';
  return 'mixed';
}

/**
 * Human-readable quality interaction between two planets, for transit /
 * aspect copy. PART 15.4 in narrative form.
 */
export function qualityInteraction(p1Name, p2Name, chart) {
  const q1 = planetQuality(p1Name, chart);
  const q2 = planetQuality(p2Name, chart);
  if (!q1 || !q2) return null;
  const combined = combineQualities(q1, q2);
  const verb = pickVerb(q1, q2, combined);
  return {
    resonance:   combined,
    q1, q2,
    description: `${capitalize(p1Name)} ${shortQ(q1)} ${verb} ` +
                 `${capitalize(p2Name)} ${shortQ(q2)}`,
  };
}

function pickVerb(q1, q2, combined) {
  if (combined === 'reinforced') return 'reinforces';
  if (combined === 'opposed') {
    if (q1.primary === 'cold' && q2.primary === 'hot')    return 'cools';
    if (q1.primary === 'hot'  && q2.primary === 'cold')   return 'heats';
    if (q1.secondary === 'dry'   && q2.secondary === 'moist') return 'dries out';
    if (q1.secondary === 'moist' && q2.secondary === 'dry')   return 'moistens';
    return 'opposes';
  }
  return 'mixes with';
}

function shortQ(q)      { return `(${q.primary}/${q.secondary})`; }
function capitalize(s)  { return s.charAt(0).toUpperCase() + s.slice(1); }
