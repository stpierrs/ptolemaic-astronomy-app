// js/core/ephemerisEvents.js
// Unified "upcoming events" feed for the Ephemeris views.
// Events: sign ingresses, retrograde/direct stations, heliacal-phase
// transitions, near star-conjunctions.

import { getPlanet, PLANET_NAMES_ORDERED } from './astrologyAdapter.js';
import { findUpcomingHeliacalEvents } from './heliacal.js';
import { fixedStarsAt } from './fixedStars.js';

const MS_DAY = 86400 * 1000;

/**
 * @param {Date}   fromDate
 * @param {number} [daysAhead=14]
 * @param {string} [source='ibnshatir']
 * @returns {Array<{ date: Date, kind: string, body: string, detail: string }>}
 */
export function upcomingEvents(fromDate, daysAhead = 14, source = 'ibnshatir') {
  const events = [];
  try { events.push(...signIngresses(fromDate, daysAhead, source)); } catch (_) {}
  try { events.push(...stations(fromDate, daysAhead, source)); } catch (_) {}
  try {
    events.push(...findUpcomingHeliacalEvents(PLANET_NAMES_ORDERED, fromDate, daysAhead, source)
      .map(e => ({
        date: e.date,
        kind: 'heliacal',
        body: e.planet,
        detail: `${e.fromPhase || '?'} → ${e.toPhase}`,
      })));
  } catch (_) {}
  try { events.push(...starConjunctions(fromDate, daysAhead, source)); } catch (_) {}
  events.sort((a, b) => a.date - b.date);
  return events;
}

function signIngresses(fromDate, daysAhead, source) {
  const out = [];
  const COARSE = 3 * MS_DAY;
  for (const planet of PLANET_NAMES_ORDERED) {
    let prev;
    try { prev = getPlanet(planet, fromDate, { source }); }
    catch (_) { continue; }
    for (let t = COARSE; t <= daysAhead * MS_DAY; t += COARSE) {
      let next;
      try { next = getPlanet(planet, new Date(fromDate.getTime() + t), { source }); }
      catch (_) { break; }
      if (next.sign_index !== prev.sign_index) {
        const exact = bisectSignChange(
          planet,
          new Date(fromDate.getTime() + t - COARSE),
          new Date(fromDate.getTime() + t),
          prev.sign_index,
          source,
        );
        out.push({
          date:   exact,
          kind:   'ingress',
          body:   planet,
          detail: `enters ${next.sign}`,
        });
      }
      prev = next;
    }
  }
  return out;
}

function bisectSignChange(planet, a, b, fromSign, source) {
  for (let i = 0; i < 20; i++) {
    const mid = new Date((a.getTime() + b.getTime()) / 2);
    let p;
    try { p = getPlanet(planet, mid, { source }); }
    catch (_) { return mid; }
    if (p.sign_index === fromSign) a = mid; else b = mid;
    if (b - a < 60 * 1000) break;
  }
  return b;
}

function stations(fromDate, daysAhead, source) {
  const out = [];
  for (const planet of PLANET_NAMES_ORDERED) {
    if (planet === 'sun' || planet === 'moon') continue;
    let prev;
    try { prev = getPlanet(planet, fromDate, { source }); }
    catch (_) { continue; }
    for (let d = 3; d <= daysAhead; d += 3) {
      let next;
      try { next = getPlanet(planet, new Date(fromDate.getTime() + d * MS_DAY), { source }); }
      catch (_) { break; }
      if (prev.is_retrograde !== next.is_retrograde) {
        out.push({
          date:   new Date(fromDate.getTime() + d * MS_DAY),
          kind:   'station',
          body:   planet,
          detail: next.is_retrograde ? 'stations retrograde' : 'stations direct',
        });
      }
      prev = next;
    }
  }
  return out;
}

function starConjunctions(fromDate, daysAhead, source) {
  const out = [];
  const STEP_DAYS = 2;
  for (const planet of PLANET_NAMES_ORDERED) {
    if (planet === 'sun' || planet === 'moon') continue;
    for (let d = 0; d <= daysAhead; d += STEP_DAYS) {
      const date = new Date(fromDate.getTime() + d * MS_DAY);
      let p;
      try { p = getPlanet(planet, date, { source }); }
      catch (_) { break; }
      let stars;
      try { stars = fixedStarsAt(date); }
      catch (_) { break; }
      for (const s of stars) {
        if (!s.inZodiacalBelt) continue;
        const raw = Math.abs(p.longitude - s.lon);
        const sep = Math.min(raw, 360 - raw);
        if (sep <= 0.5) {
          out.push({ date, kind: 'star-conj', body: planet, detail: `near ${s.name}` });
          break;   // one match per (planet, day) is enough for the feed
        }
      }
    }
  }
  return out;
}
