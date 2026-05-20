// js/core/transitEngine.js
// PART 22 — Transit engine: current planet positions vs natal, scored by
// strength, with real start/end dates and stations.

import { getAllPositions, getPlanet } from './astrologyAdapter.js';
import { findAspect } from './aspects.js';
import { getPlanetDignity } from './dignities.js';
import { qualityInteraction } from './qualities.js';

const MS_DAY = 86400 * 1000;

const ASPECT_WEIGHT = {
  Conjunction: 1.2,
  Trine:       1.0,
  Opposition:  1.0,
  Square:      0.8,
  Sextile:     0.6,
};

const PHASE_WEIGHT = {
  cazimi:        2.0,
  morning_star:  1.1,
  evening_star:  0.9,
  under_rays:    0.5,
  combust:       0.2,
  normal:        1.0,
};

/**
 * Compute all active transits at `targetDate` for a natal chart.
 *
 * @param {object} natalChart  - from buildNatalChart
 * @param {Date}   [targetDate]
 * @returns {{ active: Array, upcoming: Array }}
 */
export function computeTransits(natalChart, targetDate = new Date()) {
  if (!natalChart || !Array.isArray(natalChart.planets)) {
    return { active: [], upcoming: [] };
  }
  const source = natalChart.source || 'ibnshatir';
  const currentPlanets = Object.values(getAllPositions(targetDate, { source }));

  const active = [];
  for (const transit of currentPlanets) {
    for (const natal of natalChart.planets) {
      const asp = findAspect(transit.longitude, natal.lon, transit.planet, natal.name);
      if (!asp) continue;

      const dates = computeTransitDates(transit.planet, natal.sign_index, asp.name, targetDate, source);
      const strength = transitStrength(transit, natal, natalChart, asp);
      const qi = safeQualityInteraction(transit.planet, natal.name, natalChart);

      active.push({
        transit_planet:    transit.planet,
        transit_position:  transit,
        natal_planet:      natal.name,
        natal_position:    natal,
        natal_dignity:     natalChart.interpretation?.dignities?.[natal.name] ?? null,
        aspect_type:       asp.name,
        applying:          asp.applying,
        degreeOffExact:    asp.degreeOffExact,
        strength,
        quality_interaction: qi,
        start_date:        dates.start,
        end_date:          dates.end,
        stations:          dates.stations,
      });
    }
  }
  active.sort((a, b) => b.strength - a.strength);

  // Upcoming = those whose start is in the future (and not currently active
  // by virtue of present elongation). We treat anything with start > target
  // as upcoming for the feed.
  const upcoming = active
    .filter(t => t.start_date && t.start_date > targetDate)
    .sort((a, b) => {
      const aDays = Math.max(1, (a.start_date - targetDate) / MS_DAY);
      const bDays = Math.max(1, (b.start_date - targetDate) / MS_DAY);
      return (b.strength / bDays) - (a.strength / aDays);
    });

  return { active, upcoming };
}

function safeQualityInteraction(p1, p2, chart) {
  try { return qualityInteraction(p1, p2, chart); }
  catch (_) { return null; }
}

function transitStrength(transit, natal, chart, asp) {
  // Essential dignity of the transiting planet at its current position.
  const essential = getPlanetDignity(transit.planet, transit.longitude, chart.isDiurnal);
  const base = (essential.score + 5) / 14;     // normalise into ~0..1
  const aspectW = ASPECT_WEIGHT[asp.name] || 0.5;
  const phaseW  = PHASE_WEIGHT[transit.heliacal_state] || 1.0;
  const retroW  = transit.is_retrograde ? 1.3 : 1.0;
  const nDig    = chart.interpretation?.dignities?.[natal.name]?.essential?.score ?? 0;
  const nResil  = nDig > 3 ? 0.7 : nDig < -2 ? 1.4 : 1.0;
  return Math.max(0, base * aspectW * phaseW * retroW * nResil);
}

// ── Sign-ingress / station date detection ─────────────────────────────────

const ASPECT_TO_SIGN_OFFSET = {
  Conjunction: 0,
  Sextile:     2,
  Square:      3,
  Trine:       4,
  Opposition:  6,
};

function computeTransitDates(planetName, natalSignIndex, aspectName, currentDate, source) {
  const offset = ASPECT_TO_SIGN_OFFSET[aspectName];
  if (offset === undefined) return { start: null, end: null, stations: [] };

  // Two candidate signs form this whole-sign aspect (offset to either side).
  const candidates = [
    (natalSignIndex + offset) % 12,
    (natalSignIndex - offset + 12) % 12,
  ];
  let cur;
  try { cur = getPlanet(planetName, currentDate, { source }); }
  catch (_) { return { start: null, end: null, stations: [] }; }
  if (!candidates.includes(cur.sign_index)) return { start: null, end: null, stations: [] };

  const activeSign = cur.sign_index;
  const start = findSignBoundary(planetName, activeSign, currentDate, -1, source);
  const end   = findSignBoundary(planetName, activeSign, currentDate, +1, source);
  const stations = (planetName === 'sun' || planetName === 'moon')
    ? []
    : findStationsBetween(planetName, start, end, source);
  return { start, end, stations };
}

function findSignBoundary(planetName, signIdx, fromDate, direction, source) {
  const STEP = 30 * MS_DAY;
  const MAX_ITER = 60;     // ~5-year search horizon
  let prev = fromDate;
  for (let i = 0; i < MAX_ITER; i++) {
    const next = new Date(prev.getTime() + direction * STEP);
    let p;
    try { p = getPlanet(planetName, next, { source }); }
    catch (_) { return prev; }
    if (p.sign_index !== signIdx) {
      // Bisect [prev, next] for the precise crossing
      const a = direction > 0 ? prev : next;
      const b = direction > 0 ? next : prev;
      return bisectSignBoundary(planetName, signIdx, a, b, source);
    }
    prev = next;
  }
  return prev;
}

function bisectSignBoundary(planetName, signIdx, a, b, source) {
  for (let i = 0; i < 30; i++) {
    const mid = new Date((a.getTime() + b.getTime()) / 2);
    let p;
    try { p = getPlanet(planetName, mid, { source }); }
    catch (_) { return mid; }
    if (p.sign_index === signIdx) a = mid; else b = mid;
    if (Math.abs(b - a) < 6 * 3600 * 1000) break;   // 6h precision
  }
  return new Date((a.getTime() + b.getTime()) / 2);
}

function findStationsBetween(planetName, fromDate, toDate, source) {
  if (!fromDate || !toDate || fromDate >= toDate) return [];
  const STEP = 3 * MS_DAY;
  const out = [];
  let prev;
  try { prev = getPlanet(planetName, fromDate, { source }); }
  catch (_) { return []; }
  let t = fromDate.getTime();
  while (t < toDate.getTime()) {
    t += STEP;
    let next;
    try { next = getPlanet(planetName, new Date(t), { source }); }
    catch (_) { break; }
    if (prev.is_retrograde !== next.is_retrograde) {
      out.push({
        date: new Date(t),
        type: next.is_retrograde ? 'retrograde' : 'direct',
      });
    }
    prev = next;
  }
  return out;
}
