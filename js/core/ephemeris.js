// Position router — ask for a planet, get back (RA, Dec).
//
// Available pipelines:
//   ptolemy    — Almagest deferent+epicycle (original Ptolemaic constants, ~150 CE)
//   epicycle   — "Ptolemaic (Modern Parameters)": J2000 elements, exact Kepler solver,
//                Mars/Jupiter/Saturn perturbation corrections, 943 BSC stars
//   epicycle2  — "Ibn al-Shatir (Two-Epicycle)": second epicycle absorbs residual
//                errors; DE405-calibrated phase constants, fully self-contained

import * as ptol  from './ephemerisPtolemy.js';
import * as epi1  from './epicycle_ephemeris/ephemerisEpicycle.js';
import * as epi2  from './epicycle_ephemeris/ephemerisEpicycle2.js';

export {
  greenwichSiderealDeg,
  equatorialToCelestCoord,
  findNextEclipses,
  julianDay,
  meanObliquityDeg,
  norm360,
} from './ephemerisCommon.js';

// Pipeline namespaces, exported for callers that need several readings at once.
export { ptol, epi1, epi2 };

// User-selectable sources (shown in the Tracker → Ephemeris dropdown).
// All three sources are user-selectable.
export const EPHEMERIS_SOURCES = ['ptolemy', 'epicycle', 'epicycle2'];

// Uranus and Neptune: no Ptolemaic parameters (he never saw them).
// Pluto, asteroids: no tabulated source for classic Ptolemy — NaN = no data, skip the row.
export const PLANET_NAMES = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
export const BODY_NAMES   = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

// Pipeline registry.
const PIPES = {
  ptolemy:      { ns: ptol,  cb: (n) => ptol.coversBody(n),  cd: (d) => ptol.coversDate(d) },
  epicycle:     { ns: epi1,  cb: (n) => epi1.coversBody(n),  cd: (d) => epi1.coversDate(d) },
  epicycle2:    { ns: epi2,  cb: (n) => epi2.coversBody(n),  cd: (d) => epi2.coversDate(d) },
};

// Fallback chain — epicycle covers the most bodies and is the most accurate.
// ptolemy is the last resort for Almagest-only bodies.
// Astropixels intentionally excluded: 2019–2030 table only.
const FALLBACK_ORDER = ['epicycle', 'ptolemy'];

function _readingValid(r) {
  return r && Number.isFinite(r.ra) && Number.isFinite(r.dec);
}

function _tryPipeline(id, name, date) {
  const p = PIPES[id];
  if (!p) return null;
  if (!p.cb(name) || !p.cd(date)) return null;
  const r = p.ns.bodyGeocentric(name, date);
  return _readingValid(r) ? r : null;
}

// Ask for any body by name, get back { ra, dec } in radians.
// Tries the requested source; if it can't deliver, falls back to Ptolemy.
// Use bodyRADecRoute() if you need to know which pipeline actually answered.
export function bodyRADec(name, date, source = 'ptolemy') {
  if (name === 'earth') return { ra: 0, dec: 0 };
  const tried = new Set();
  if (source) {
    const r = _tryPipeline(source, name, date);
    if (r) return r;
    tried.add(source);
  }
  for (const id of FALLBACK_ORDER) {
    if (tried.has(id)) continue;
    const r = _tryPipeline(id, name, date);
    if (r) return r;
    tried.add(id);
  }
  // Nothing covered this — NaN signals "no data" so renderers hide the body.
  return { ra: NaN, dec: NaN };
}

// Same as bodyRADec but tells you which pipeline answered — useful for
// showing a fallback indicator in the UI.
export function bodyRADecRoute(name, date, source = 'ptolemy') {
  if (name === 'earth') return { reading: { ra: 0, dec: 0 }, used: source };
  const tried = new Set();
  if (source) {
    const r = _tryPipeline(source, name, date);
    if (r) return { reading: r, used: source };
    tried.add(source);
  }
  for (const id of FALLBACK_ORDER) {
    if (tried.has(id)) continue;
    const r = _tryPipeline(id, name, date);
    if (r) return { reading: r, used: id };
    tried.add(id);
  }
  return { reading: { ra: NaN, dec: NaN }, used: null };
}

// Direct per-pipeline access for callers that know exactly what they want.
export function planetEquatorial(name, date, source = 'ptolemy') {
  return ptol.planetEquatorial(name, date);
}

// Sun and Moon — Ptolemy by default.
export function sunEquatorial(date, source = 'ptolemy') {
  return ptol.sunEquatorial(date);
}
export function moonEquatorial(date, source = 'ptolemy') {
  return ptol.moonEquatorial(date);
}

// Legacy export for older imports.
export function bodyGeocentric(name, date) { return ptol.bodyGeocentric(name, date); }
