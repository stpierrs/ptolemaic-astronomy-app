// PART 15 — Mundane astrology (Tetrabiblos Books I–II).
//
// Tools:
//   • Eclipses: geographic triplicities, eclipse lord, duration of effects.
//   • Great conjunctions of Saturn / Jupiter / Mars.
//   • Cardinal ingresses — Sun's entry into Aries / Cancer / Libra / Capricornus.
//   • Qualitative weather verdict from the Moon's sign.

import { bodyRADec } from './ephemeris.js';
import { raDecToEclipticLon, lonToZodiac, buildNatalChart } from './astrology.js';
import { getPlanetDignity } from './dignities.js';
import { ASTROPIXELS_ECLIPSES } from '../data/astropixelsEclipses.js';

// PART 15.1 — Geographic triplicities (Tetrabiblos II)
export const GEOGRAPHIC_TRIPLICITIES = {
  fire:  { direction: 'NW', regions: 'Britain, Gaul, Germany, northern Europe' },
  earth: { direction: 'SW', regions: 'North Africa, Spain, Italy' },
  air:   { direction: 'NE', regions: 'Persia, Babylonia, Media' },
  water: { direction: 'SE', regions: 'Ethiopia, Arabia, Egypt' },
};

const ELEMENT_OF_SIGN = [
  'fire','earth','air','water',
  'fire','earth','air','water',
  'fire','earth','air','water',
];

// ── Eclipses ─────────────────────────────────────────────────────────────────

/**
 * Return upcoming eclipses (from astropixelsEclipses static table) after
 * `fromDate`, up to `count` events. Each event is augmented with the Sun's
 * ecliptic longitude at that moment for sign/element/region lookup.
 */
export function upcomingEclipses(fromDate, count = 6, source = 'ibnshatir') {
  const all = [
    ...ASTROPIXELS_ECLIPSES.solar.map(e => ({ ...e, kind: 'solar' })),
    ...ASTROPIXELS_ECLIPSES.lunar.map(e => ({ ...e, kind: 'lunar' })),
  ].map(e => ({ ...e, when: new Date(e.utISO || e.tdISO || e.date) }))
    .filter(e => e.when.getTime() >= fromDate.getTime())
    .sort((a, b) => a.when - b.when)
    .slice(0, count);

  return all.map(e => {
    const eq = bodyRADec('sun', e.when, source);
    const lon = raDecToEclipticLon(eq.ra, eq.dec);
    // For lunar eclipses the Moon is at +180° relative to the Sun.
    const eclipseLon = e.kind === 'solar' ? lon : ((lon + 180) % 360);
    return interpretEclipse(e, eclipseLon, source);
  });
}

/**
 * Interpret a single eclipse event.
 */
export function interpretEclipse(eventRaw, eclipseLon, source = 'ibnshatir') {
  const sign = lonToZodiac(eclipseLon);
  const element = ELEMENT_OF_SIGN[sign.idx];
  const region = GEOGRAPHIC_TRIPLICITIES[element];

  // Eclipse lord: most dignified of the seven classical planets at the moment
  let lord = null;
  let bestScore = -Infinity;
  try {
    const natal = buildNatalChart(eventRaw.when, 0, 0, source);
    for (const p of natal.planets) {
      const dig = getPlanetDignity(p.name, p.lon, true);
      if (dig.score > bestScore) { bestScore = dig.score; lord = p.name; }
    }
  } catch (_) {}

  return {
    type:        eventRaw.type || eventRaw.kind,
    kind:        eventRaw.kind,
    when:        eventRaw.when,
    dateLabel:   eventRaw.date,
    duration:    eventRaw.duration || null,
    magnitude:   eventRaw.magnitude || null,
    sign:        sign.sign,
    signSym:     sign.symbol,
    eclipseLon,
    element,
    region:      region?.regions || '',
    direction:   region?.direction || '',
    eclipseLord: lord,
    eclipseLordScore: bestScore,
  };
}

// ── Great conjunctions ───────────────────────────────────────────────────────

const SUPERIOR = ['saturn', 'jupiter', 'mars'];

/**
 * Detect any same-sign conjunction between a pair of superior planets at a
 * given date (PART 15.2; whole-sign per PART 8.2).
 */
export function detectGreatConjunctions(planetsAtDate) {
  if (!Array.isArray(planetsAtDate)) return [];
  const out = [];
  for (let i = 0; i < SUPERIOR.length; i++) {
    for (let j = i + 1; j < SUPERIOR.length; j++) {
      const a = planetsAtDate.find(p => p.name === SUPERIOR[i]);
      const b = planetsAtDate.find(p => p.name === SUPERIOR[j]);
      if (!a || !b) continue;
      const sa = Math.floor(((a.lon % 360) + 360) % 360 / 30);
      const sb = Math.floor(((b.lon % 360) + 360) % 360 / 30);
      if (sa === sb) {
        out.push({
          pair: `${a.name}-${b.name}`,
          sign: sa,
          element: ELEMENT_OF_SIGN[sa],
          elongationDeg: Math.abs(((a.lon - b.lon + 540) % 360) - 180),
        });
      }
    }
  }
  return out;
}

// ── Cardinal ingresses ───────────────────────────────────────────────────────

/**
 * For a given year, find the four cardinal ingresses (Sun enters Aries,
 * Cancer, Libra, Capricornus). Returns [{ sign, date }].
 */
export function cardinalIngresses(year, source = 'ibnshatir') {
  const TARGETS = [0, 90, 180, 270];
  const NAMES   = ['Aries', 'Cancer', 'Libra', 'Capricornus'];
  const out = [];
  for (let i = 0; i < 4; i++) {
    const guess = approxIngressMonth(year, i);
    const refined = refineIngress(guess, TARGETS[i], source);
    out.push({ sign: NAMES[i], date: refined });
  }
  return out;
}

function approxIngressMonth(year, i) {
  const day = [20, 21, 22, 21][i];
  const mo  = [2, 5, 8, 11][i];
  return new Date(Date.UTC(year, mo, day, 0, 0, 0));
}

function refineIngress(guess, targetLon, source) {
  let lo = new Date(guess.getTime() - 2 * 24 * 3600 * 1000);
  let hi = new Date(guess.getTime() + 2 * 24 * 3600 * 1000);
  for (let i = 0; i < 30; i++) {
    const mid = new Date((lo.getTime() + hi.getTime()) / 2);
    let lon;
    try {
      const eq = bodyRADec('sun', mid, source);
      lon = raDecToEclipticLon(eq.ra, eq.dec);
    } catch (_) { return mid; }
    let d = ((lon - targetLon + 540) % 360) - 180;
    if (d > 0) hi = mid; else lo = mid;
    if (Math.abs(hi.getTime() - lo.getTime()) < 60 * 1000) break;
  }
  return new Date((lo.getTime() + hi.getTime()) / 2);
}

// ── Weather ──────────────────────────────────────────────────────────────────

const WEATHER_TABLE = {
  'hot+moist':  'Warm, humid; thunderstorms likely',
  'hot+dry':    'Heat, drought, southerly winds',
  'cold+moist': 'Cold rains, snow, possible floods',
  'cold+dry':   'Frost, clear cold, harsh winds',
};

// PART 4.2 — sign quality (re-implemented here so mundane.js stands alone if
// qualities.js hasn't loaded yet; same table as js/core/qualities.js).
const SIGN_QUALITY_LOCAL = [
  ['hot','dry'],['cold','dry'],['hot','moist'],['hot','moist'],
  ['hot','dry'],['cold','dry'],['cold','moist'],['cold','moist'],
  ['hot','dry'],['cold','dry'],['cold','moist'],['cold','moist'],
];

/**
 * PART 15.4 — qualitative weather forecast from a chart. Bases on the Moon's
 * sign-quality, the Tetrabiblos's most direct mundane signifier.
 */
export function weatherFromChart(chart) {
  const moon = chart?.planets?.find(p => p.name === 'moon');
  if (!moon) return null;
  const sign = Math.floor(((moon.lon % 360) + 360) % 360 / 30);
  const [primary, secondary] = SIGN_QUALITY_LOCAL[sign];
  return {
    label: WEATHER_TABLE[`${primary}+${secondary}`],
    primary, secondary, moonSign: sign,
  };
}
