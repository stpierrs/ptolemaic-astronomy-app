// Planetary Hours — Chaldean order, day/night hour computation.
//
// The 24 hours of each day are assigned to the seven classical planets in
// the Chaldean order (Saturn → Jupiter → Mars → Sun → Venus → Mercury → Moon),
// starting from sunrise with the planet that rules the day.

import { computeRiseSet } from './riseSet.js';

// Chaldean order
export const CHALDEAN = ['saturn', 'jupiter', 'mars', 'sun', 'venus', 'mercury', 'moon'];
export const CHALDEAN_SYMBOLS = {
  saturn: '♄', jupiter: '♃', mars: '♂',
  sun: '☉',   venus: '♀',   mercury: '☿', moon: '☽',
};
export const CHALDEAN_COLORS = {
  saturn:  '#ceb860',
  jupiter: '#d4a8c4',
  mars:    '#e06040',
  sun:     '#ffe066',
  venus:   '#e8e080',
  mercury: '#b0b0b8',
  moon:    '#c8d8f0',
};

// Day-of-week ruler: index into CHALDEAN array.
// Sunday = Sun (3), Monday = Moon (6), Tuesday = Mars (2),
// Wednesday = Mercury (5), Thursday = Jupiter (1),
// Friday = Venus (4), Saturday = Saturn (0)
const DAY_RULER_IDX = [3, 6, 2, 5, 1, 4, 0]; // 0=Sun … 6=Sat

/**
 * Compute all 24 planetary hours for the current UTC day.
 *
 * @param {Date|null} sunrise  Sunrise UTC Date (null → 06:00 UTC)
 * @param {Date|null} sunset   Sunset UTC Date  (null → 18:00 UTC)
 * @param {Date}      refDate  Reference date (used to find day-of-week)
 * @returns {Array<{ planet, symbol, color, start: Date, end: Date, isDay: boolean, hourNum: number }>}
 */
export function computePlanetaryHours(sunrise, sunset, refDate) {
  const dayOfWeek = refDate.getUTCDay(); // 0=Sun
  const startIdx  = DAY_RULER_IDX[dayOfWeek];

  // Fallback times if no rise/set available
  const fallbackSr = new Date(refDate);
  fallbackSr.setUTCHours(6, 0, 0, 0);
  const fallbackSs = new Date(refDate);
  fallbackSs.setUTCHours(18, 0, 0, 0);

  const srMs = sunrise ? sunrise.getTime() : fallbackSr.getTime();
  const ssMs = sunset  ? sunset.getTime()  : fallbackSs.getTime();

  const dayDur   = (ssMs - srMs) / 12;          // ms per day-hour
  const nightDur = (86400000 - (ssMs - srMs)) / 12; // ms per night-hour

  const hours = [];
  let t = srMs;
  for (let i = 0; i < 24; i++) {
    const isDay = i < 12;
    const dur   = isDay ? dayDur : nightDur;
    const planet = CHALDEAN[(startIdx + i) % 7];
    hours.push({
      planet,
      symbol:  CHALDEAN_SYMBOLS[planet],
      color:   CHALDEAN_COLORS[planet],
      start:   new Date(t),
      end:     new Date(t + dur),
      isDay,
      hourNum: i + 1,
    });
    t += dur;
  }
  return hours;
}

/** Get the current planetary hour from a precomputed hours array. */
export function getCurrentHour(hours) {
  const now = Date.now();
  return hours.find((h) => now >= h.start.getTime() && now < h.end.getTime()) || hours[0];
}

/** Format a Date as HH:MM UTC. */
export function fmtTime(d) {
  if (!d) return '--:--';
  return d.toUTCString().slice(17, 22);
}

/**
 * Compute today's planetary hours using the model's current date and observer position.
 * Returns { hours, sunrise, sunset }
 */
export function computeTodayHours(model) {
  const EPOCH = Date.UTC(2017, 0, 1);
  const dt    = model.state.DateTime || 0;
  const date  = new Date(EPOCH + dt * 86400000);
  const lat   = model.state.ObserverLat  || 0;
  const lon   = model.state.ObserverLong || 0;
  const src   = model.state.BodySource   || 'ibnshatir';

  let sunrise = null;
  let sunset  = null;
  try {
    const rs = computeRiseSet('sun', lat, lon, dt, src);
    sunrise = rs.rise;
    sunset  = rs.set;
  } catch (_) {}

  const hours = computePlanetaryHours(sunrise, sunset, date);
  return { hours, sunrise, sunset };
}
