// js/core/mundane.js
// PART 13 / 15 — Mundane astrology engine (Tetrabiblos Books I–II).
//
// Tools:
//   • Eclipses — geographic triplicities, eclipse lord, aspecting planets,
//     duration estimate.
//   • Great conjunctions — Saturn-Jupiter, Saturn-Mars, Jupiter-Mars same sign.
//   • Cardinal ingresses — Sun's entry into Aries / Cancer / Libra / Capricornus.
//   • Weather — qualitative forecast widget driven by the Moon's sign quality.

import { getAllPositions, getPlanet } from './astrologyAdapter.js';
import { bodyRADec } from './ephemeris.js';
import { raDecToEclipticLon, lonToZodiac } from './astrology.js';
import { getPlanetDignity } from './dignities.js';
import { signQuality } from './qualities.js';
import { ASTROPIXELS_ECLIPSES } from '../data/astropixelsEclipses.js';
import geographicalRulers from '../data/astrology/geographical_rulers.js';

const MS_DAY = 86400 * 1000;

// PART 13.4 / 15.1 — sign element table (cached locally for hot paths).
const ELEMENT_OF_SIGN = [
  'fire','earth','air','water',
  'fire','earth','air','water',
  'fire','earth','air','water',
];

// ── Eclipses ────────────────────────────────────────────────────────────────

/**
 * Interpret a single eclipse event.
 * @param {{ when: Date, kind: 'solar'|'lunar', type?: string, duration?: any,
 *           date?: string, magnitude?: number }} eventRaw
 * @param {number} eclipseLon - eclipse degree on the ecliptic
 * @param {string} [source]
 */
export function interpretEclipse(eventRaw, eclipseLon, source = 'ibnshatir') {
  const sign = lonToZodiac(eclipseLon);
  const element = ELEMENT_OF_SIGN[sign.idx];
  const region  = geographicalRulers[element];
  const t = eventRaw.when;

  // Eclipse lord: highest essential dignity at the moment of eclipse.
  let lord = null;
  let bestScore = -Infinity;
  let positions = null;
  try {
    positions = getAllPositions(t, { source });
    for (const p of Object.values(positions)) {
      const dig = getPlanetDignity(p.planet, p.longitude, true);
      if (dig.score > bestScore) { bestScore = dig.score; lord = p.planet; }
    }
  } catch (_) {}

  // Whole-sign aspecting planets to the eclipse degree.
  const aspecting = [];
  if (positions) {
    for (const p of Object.values(positions)) {
      const raw = Math.abs(p.sign_index - sign.idx);
      const diff = Math.min(raw, 12 - raw);
      if ([0, 2, 3, 4, 6].includes(diff)) aspecting.push(p.planet);
    }
  }

  // Duration of effect (PART 13.2 heuristic): astropixels gives a duration
  // string for solar centrals like '03m51s'. Convert to minutes.
  let durationMinutes = null;
  if (typeof eventRaw.duration === 'string') {
    const m = eventRaw.duration.match(/(\d+)m(\d+)s/);
    if (m) durationMinutes = parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
  } else if (typeof eventRaw.duration === 'number') {
    durationMinutes = eventRaw.duration / 60;
  }
  const durationYears  = eventRaw.kind === 'solar' && durationMinutes != null ? durationMinutes : null;
  const durationMonths = eventRaw.kind === 'lunar' && durationMinutes != null ? durationMinutes : null;

  // Time-of-day modifier (PART 13.5 step 6)
  const hour = t.getUTCHours();
  const phaseOfDay = hour < 8 ? 'morning' : hour < 16 ? 'midday' : 'evening';

  return {
    type:           eventRaw.type || eventRaw.kind,
    kind:           eventRaw.kind,
    when:           t,
    dateLabel:      eventRaw.date,
    magnitude:      eventRaw.magnitude ?? null,
    sign:           sign.sign,
    signGlyph:      sign.symbol,
    signIdx:        sign.idx,
    eclipseLon,
    element,
    region:         region?.ptolemaic_regions || '',
    region_modern:  region?.modern_approx     || '',
    direction:      region?.direction         || '',
    durationYears,
    durationMonths,
    eclipseLord:    lord,
    eclipseLordScore: bestScore === -Infinity ? null : bestScore,
    aspecting,
    phaseOfDay,
    quality:        signQuality(sign.idx),
  };
}

/**
 * Upcoming eclipses (astropixels static table, 2021–2040). Each is augmented
 * via interpretEclipse with sign, region, lord, etc.
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
    // Sun's longitude at the eclipse moment gives the solar eclipse degree.
    // Lunar eclipse is opposite the Sun (+180°).
    let sunLon = 0;
    try {
      const eq = bodyRADec('sun', e.when, source);
      sunLon = raDecToEclipticLon(eq.ra, eq.dec);
    } catch (_) {}
    const eclipseLon = e.kind === 'solar' ? sunLon : ((sunLon + 180) % 360);
    return interpretEclipse(e, eclipseLon, source);
  });
}

// Alias matching Guide 12 spec name
export const findUpcomingEclipses = upcomingEclipses;

// ── Great conjunctions ──────────────────────────────────────────────────────

const SUPERIOR = ['saturn', 'jupiter', 'mars'];

/**
 * Detect any same-sign conjunction between a pair of superior planets at a
 * given date (PART 15.2; whole-sign per PART 8.2).
 *
 * Accepts either:
 *   - a planets array [{ name, lon }] (the legacy v1 call shape), or
 *   - a Date object (Guide 12 spec — engine pulls positions internally).
 */
export function detectGreatConjunctions(dateOrPlanets, source = 'ibnshatir') {
  let planets;
  if (dateOrPlanets instanceof Date) {
    try {
      const pos = getAllPositions(dateOrPlanets, { source });
      planets = Object.values(pos).map(p => ({ name: p.planet, lon: p.longitude, sign_index: p.sign_index }));
    } catch (_) { return []; }
  } else if (Array.isArray(dateOrPlanets)) {
    planets = dateOrPlanets;
  } else {
    return [];
  }

  const out = [];
  for (let i = 0; i < SUPERIOR.length; i++) {
    for (let j = i + 1; j < SUPERIOR.length; j++) {
      const a = planets.find(p => p.name === SUPERIOR[i]);
      const b = planets.find(p => p.name === SUPERIOR[j]);
      if (!a || !b) continue;
      const sa = a.sign_index ?? Math.floor((((a.lon % 360) + 360) % 360) / 30);
      const sb = b.sign_index ?? Math.floor((((b.lon % 360) + 360) % 360) / 30);
      if (sa === sb) {
        out.push({
          pair:           `${a.name}-${b.name}`,
          sign:           ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpius','Sagittarius','Capricornus','Aquarius','Pisces'][sa],
          signIdx:        sa,
          element:        ELEMENT_OF_SIGN[sa],
          elongationDeg:  Math.abs(((a.lon - b.lon + 540) % 360) - 180),
        });
      }
    }
  }
  return out;
}

// ── Cardinal ingresses ──────────────────────────────────────────────────────

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
  let lo = new Date(guess.getTime() - 4 * MS_DAY);
  let hi = new Date(guess.getTime() + 4 * MS_DAY);
  for (let i = 0; i < 32; i++) {
    const mid = new Date((lo.getTime() + hi.getTime()) / 2);
    let lon;
    try {
      const eq = bodyRADec('sun', mid, source);
      lon = raDecToEclipticLon(eq.ra, eq.dec);
    } catch (_) { return mid; }
    const d = ((lon - targetLon + 540) % 360) - 180;
    if (d > 0) hi = mid; else lo = mid;
    if (Math.abs(hi.getTime() - lo.getTime()) < 60 * 1000) break;
  }
  return new Date((lo.getTime() + hi.getTime()) / 2);
}

// ── Weather (PART 13.6) ─────────────────────────────────────────────────────

const WEATHER_TABLE = {
  'hot+moist':  'Warm, humid; thunderstorms likely',
  'hot+dry':    'Heat, drought, southerly winds',
  'cold+moist': 'Cold rains, snow, possible floods',
  'cold+dry':   'Frost, clear cold, harsh winds',
};

/**
 * PART 13.6 — qualitative weather verdict from a chart's Moon sign.
 * Accepts a chart object (for the legacy v1 call) OR a Date.
 */
export function weatherFromChart(chartOrDate, source = 'ibnshatir') {
  let moonSignIdx;
  let moonSignGlyph;
  let moonSignName;
  if (chartOrDate instanceof Date) {
    const p = getPlanet('moon', chartOrDate, { source });
    moonSignIdx   = p.sign_index;
    moonSignGlyph = p.sign_glyph;
    moonSignName  = p.sign;
  } else if (chartOrDate && Array.isArray(chartOrDate.planets)) {
    const moon = chartOrDate.planets.find(p => p.name === 'moon');
    if (!moon) return null;
    moonSignIdx = Math.floor((((moon.lon % 360) + 360) % 360) / 30);
    moonSignName = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpius','Sagittarius','Capricornus','Aquarius','Pisces'][moonSignIdx];
    moonSignGlyph = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'][moonSignIdx];
  } else {
    return null;
  }
  const q = signQuality(moonSignIdx);
  return {
    moonSign:      moonSignName,
    moonSignGlyph,
    moonSignIdx,
    quality:       q,
    label:         WEATHER_TABLE[`${q.primary}+${q.secondary}`] || 'Variable',
    primary:       q.primary,
    secondary:     q.secondary,
  };
}

export function weatherForDate(date, source = 'ibnshatir') {
  const w = weatherFromChart(date, source);
  if (!w) return null;
  return { date, ...w };
}

/**
 * Two-week qualitative forecast — one row per day.
 */
export function fortnightForecast(startDate, source = 'ibnshatir') {
  const out = [];
  for (let d = 0; d < 14; d++) {
    const date = new Date(startDate.getTime() + d * MS_DAY);
    out.push(weatherForDate(date, source));
  }
  return out;
}
