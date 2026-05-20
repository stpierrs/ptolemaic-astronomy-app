// js/core/timezones.js
// Historical UTC offset lookup. Uses Luxon (vendored at js/vendor/luxon.min.js)
// for full historical timezone correctness — falls back to Intl.DateTimeFormat
// (modern rules only) with a warning when Luxon can't be loaded.

let _luxonPromise = null;

async function getLuxon() {
  if (_luxonPromise !== null) return _luxonPromise;
  _luxonPromise = (async () => {
    try {
      const mod = await import('../vendor/luxon.min.js');
      // The ESM build exports DateTime, Zone, etc. as named exports.
      return mod;
    } catch (e) {
      console.warn('[timezones] Luxon unavailable; falling back to Intl', e);
      return null;
    }
  })();
  return _luxonPromise;
}

/**
 * Resolve UTC offset (in hours, signed) for a timezone at a given wall-clock
 * date in that zone. Positive = east of Greenwich.
 *
 * @param {string} tzName  - IANA zone name ('America/New_York') or 'UTC'
 * @param {number} year
 * @param {number} month - 1..12
 * @param {number} day
 * @param {number} hour
 * @param {number} minute
 * @returns {Promise<number>} offset in hours
 */
export async function getOffsetAt(tzName, year, month, day, hour, minute) {
  if (!tzName || tzName === 'UTC') return 0;
  const lux = await getLuxon();
  if (lux && lux.DateTime) {
    try {
      const dt = lux.DateTime.fromObject(
        { year, month, day, hour, minute },
        { zone: tzName }
      );
      if (dt.isValid) return dt.offset / 60;
    } catch (_) { /* fall through */ }
  }
  return getOffsetIntl(tzName, new Date(Date.UTC(year, (month || 1) - 1, day || 1, hour || 0, minute || 0)));
}

function getOffsetIntl(tzName, date) {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tzName, timeZoneName: 'shortOffset',
    });
    const parts = fmt.formatToParts(date);
    const tz = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT';
    const m = tz.match(/GMT([+-]\d+)(?::(\d+))?/);
    if (m) return parseInt(m[1], 10) + (m[2] ? parseInt(m[2], 10) / 60 : 0);
  } catch (_) { /* ignore */ }
  return 0;
}

/**
 * Birth years before ~1960 commonly differ from modern timezone rules
 * (LMT, war-time offsets, regional reforms). Used by onboarding to
 * surface an accuracy warning to the user.
 */
export function isHistoricallyAmbiguous(year) {
  return typeof year === 'number' && year < 1960;
}

/**
 * Best-effort IANA timezone guess from a longitude alone. Returns 'UTC'
 * for ±7.5° around Greenwich; otherwise Etc/GMT±N (note POSIX sign flip).
 * The onboarding flow should let the user override this with a real zone
 * after the geocode picks a place.
 *
 * @param {number} lon
 * @returns {string}
 */
export function guessTzFromLon(lon) {
  if (!Number.isFinite(lon)) return 'UTC';
  const offset = Math.round(lon / 15);
  if (offset === 0) return 'UTC';
  const sign = offset > 0 ? '-' : '+';   // POSIX sign-flipped
  return `Etc/GMT${sign}${Math.abs(offset)}`;
}
