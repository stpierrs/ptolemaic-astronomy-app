// Classical Astrology — Hot / Cold / Moist / Dry primitives.
// Source: Tetrabiblos Books I (Ch. IV–VII) and III (Ch. XI).
// Spec reference: PART 3 (qualities), PART 4.2 (sign table),
// PART 5.2 (planet natures), PART 10.5 (temperament).

import { DOMICILE } from './dignities.js';

// Sign index 0=Aries … 11=Pisces (matches ZODIAC_NAMES in astrology.js).

// ── PART 4.2 — Sign qualities ────────────────────────────────────
export const SIGN_QUALITY = [
  { element: 'fire',  primary: 'hot',  secondary: 'dry'   }, // Aries
  { element: 'earth', primary: 'cold', secondary: 'dry'   }, // Taurus
  { element: 'air',   primary: 'hot',  secondary: 'moist' }, // Gemini
  { element: 'water', primary: 'hot',  secondary: 'moist' }, // Cancer (PART 4.2 — spec calls Cancer hot/moist)
  { element: 'fire',  primary: 'hot',  secondary: 'dry'   }, // Leo
  { element: 'earth', primary: 'cold', secondary: 'dry'   }, // Virgo
  { element: 'air',   primary: 'cold', secondary: 'moist' }, // Libra
  { element: 'water', primary: 'cold', secondary: 'moist' }, // Scorpius
  { element: 'fire',  primary: 'hot',  secondary: 'dry'   }, // Sagittarius
  { element: 'earth', primary: 'cold', secondary: 'dry'   }, // Capricornus
  { element: 'air',   primary: 'cold', secondary: 'moist' }, // Aquarius
  { element: 'water', primary: 'cold', secondary: 'moist' }, // Pisces
];

// ── PART 5.2 — Planet quality natures ─────────────────────────────
// Sun and Moon are not pure — see spec PART 5.2 notes.
export const PLANET_QUALITY_STATIC = {
  sun:     { primary: 'hot',  secondary: 'dry-moderate' },
  moon:    { primary: 'cold', secondary: 'moist'        },
  saturn:  { primary: 'cold', secondary: 'dry'          },
  jupiter: { primary: 'hot',  secondary: 'moist'        }, // 'warm' ≡ moderate hot
  mars:    { primary: 'hot',  secondary: 'dry'          },
  venus:   { primary: 'moist',secondary: 'hot-moderate' },
  mercury: { primary: null,   secondary: null           }, // dynamic — see planetQuality()
};

export function signQuality(signIdx) {
  const i = (((signIdx | 0) % 12) + 12) % 12;
  return { ...SIGN_QUALITY[i] };
}

// PART 5.2 — Mercury has no fixed quality; it takes the nature of whatever
// planet it is configured with. If aspecting hot planets, it becomes hot.
// If unaspected, it defaults to cold and dry.
export function planetQuality(planetName, { chart } = {}) {
  if (planetName !== 'mercury') {
    const base = PLANET_QUALITY_STATIC[planetName];
    if (!base) return { primary: null, secondary: null };
    return { ...base };
  }
  if (!chart || !chart.planets) {
    return { primary: 'cold', secondary: 'dry' };
  }
  const merc = chart.planets.find(p => p.name === 'mercury');
  if (!merc) return { primary: 'cold', secondary: 'dry' };
  const mercSign = Math.floor(((merc.lon % 360) + 360) % 360 / 30);
  const tally = { hot: 0, cold: 0, moist: 0, dry: 0 };
  let aspected = 0;
  for (const p of chart.planets) {
    if (p.name === 'mercury') continue;
    const otherSign = Math.floor(((p.lon % 360) + 360) % 360 / 30);
    const raw = Math.abs(otherSign - mercSign);
    const signDiff = Math.min(raw, 12 - raw);
    // Whole-sign aspects: 0, 2, 3, 4, 6 signs apart (PART 20.4)
    if (![0, 2, 3, 4, 6].includes(signDiff)) continue;
    const q = PLANET_QUALITY_STATIC[p.name];
    if (!q || !q.primary) continue;
    aspected++;
    voteFor(q.primary, tally);
    voteFor(q.secondary, tally);
  }
  if (!aspected) return { primary: 'cold', secondary: 'dry' };
  const primary  = tally.hot   >= tally.cold ? 'hot'   : 'cold';
  const secondary = tally.moist >= tally.dry  ? 'moist' : 'dry';
  return { primary, secondary };
}

function voteFor(label, tally) {
  if (!label) return;
  if (label.startsWith('hot'))   tally.hot++;
  if (label.startsWith('cold'))  tally.cold++;
  if (label.startsWith('moist')) tally.moist++;
  if (label.startsWith('dry'))   tally.dry++;
}

// PART 3.3 — Combine rule
export function combineQualities(a, b) {
  const opposites = { hot: 'cold', cold: 'hot', moist: 'dry', dry: 'moist' };
  const aP = stripModifier(a.primary),   aS = stripModifier(a.secondary);
  const bP = stripModifier(b.primary),   bS = stripModifier(b.secondary);
  const reinforced =
    (aP === bP) || (aS === bS) || (aP === bS) || (aS === bP);
  const opposed =
    (opposites[aP] === bP) || (opposites[aS] === bS) ||
    (opposites[aP] === bS) || (opposites[aS] === bP);
  if (reinforced && !opposed) return 'reinforced';
  if (opposed && !reinforced) return 'opposed';
  return 'mixed';
}

function stripModifier(label) {
  if (!label) return null;
  return label.replace(/-moderate$/, '');
}

const TEMPERAMENTS = {
  'hot+moist':  'sanguine',
  'hot+dry':    'choleric',
  'cold+dry':   'melancholic',
  'cold+moist': 'phlegmatic',
};

export function temperament({ hot, cold, moist, dry }) {
  const p = hot   >= cold ? 'hot'   : 'cold';
  const s = moist >= dry  ? 'moist' : 'dry';
  return TEMPERAMENTS[`${p}+${s}`];
}

// PART 10.5 — count hot/cold/moist/dry votes across Asc sign,
// lord of the Ascendant, Moon sign, and any planet within 5° of the
// Ascendant degree.
export function computeTemperament(chart) {
  const tally = { hot: 0, cold: 0, moist: 0, dry: 0 };
  if (!chart || typeof chart.ascLon !== 'number') {
    return { temperament: null, votes: tally };
  }
  const ascSign = Math.floor(((chart.ascLon % 360) + 360) % 360 / 30);
  const ascQ = signQuality(ascSign);
  voteFor(ascQ.primary,   tally);
  voteFor(ascQ.secondary, tally);

  const lordEntry = Object.entries(DOMICILE)
    .find(([, signs]) => signs.includes(ascSign));
  if (lordEntry && Array.isArray(chart.planets)) {
    const [lordName] = lordEntry;
    const lordPlanet = chart.planets.find(p => p.name === lordName);
    if (lordPlanet) {
      const lordSign = Math.floor(((lordPlanet.lon % 360) + 360) % 360 / 30);
      const lq = signQuality(lordSign);
      voteFor(lq.primary,   tally);
      voteFor(lq.secondary, tally);
    }
  }

  if (Array.isArray(chart.planets)) {
    const moon = chart.planets.find(p => p.name === 'moon');
    if (moon) {
      const mq = signQuality(Math.floor(((moon.lon % 360) + 360) % 360 / 30));
      voteFor(mq.primary,   tally);
      voteFor(mq.secondary, tally);
    }
    for (const p of chart.planets) {
      const raw = Math.abs(p.lon - chart.ascLon);
      const d = Math.min(raw, 360 - raw);
      if (d <= 5) {
        const pq = planetQuality(p.name, { chart });
        voteFor(pq.primary,   tally);
        voteFor(pq.secondary, tally);
      }
    }
  }

  return { temperament: temperament(tally), votes: tally };
}
