// Position router — ask for a planet, get back (RA, Dec).
//
// Available pipelines:
//   ptolemy    — Almagest deferent+epicycle (original Ptolemaic constants, ~150 CE)
//   ibnshatir  — Ibn al-Shatir double-epicycle (Damascus c.1350, valid 1620–2200)

import * as ptol       from './ephemerisPtolemy.js';
import * as ibnshatir  from './epicycle_ephemeris/ephemerisIbnShatir.js';

export {
  greenwichSiderealDeg,
  equatorialToCelestCoord,
  findNextEclipses,
  julianDay,
  meanObliquityDeg,
  norm360,
} from './ephemerisCommon.js';

// Pipeline namespaces, exported for callers that need several readings at once.
export { ptol, ibnshatir };

// User-selectable sources (shown in the Tracker → Ephemeris dropdown).
export const EPHEMERIS_SOURCES = ['ptolemy', 'ibnshatir'];

// Uranus and Neptune: no classical parameters in either pipeline.
export const PLANET_NAMES = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
export const BODY_NAMES   = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

// Pipeline registry.
const PIPES = {
  ptolemy:   { ns: ptol,      cb: (n) => ptol.coversBody(n),      cd: (d) => ptol.coversDate(d) },
  ibnshatir: { ns: ibnshatir, cb: (n) => ibnshatir.coversBody(n), cd: (d) => ibnshatir.coversDate(d) },
};

// Fallback chain — ibnshatir first (1620–2200), ptolemy for anything else.
const tried = new Set();
const FALLBACK_ORDER = ['ibnshatir', 'ptolemy'];

function _tryPipeline(id, name, date) {
  const p = PIPES[id];
  if (!p) return null;
  if (!p.cb(name) || !p.cd(date)) return null;
  const r = p.ns.bodyGeocentric(name, date);
  return (r && isFinite(r.ra) && isFinite(r.dec)) ? r : null;
}

// Ask for any body by name, get back { ra, dec } in radians.
// Tries the requested source; if it can't deliver, falls back through FALLBACK_ORDER.
export function bodyRADec(name, date, source = 'ptolemy') {
  if (name === 'earth') return { ra: 0, dec: 0 };
  tried.clear();
  if (source) {
    const r = _tryPipeline(source, name, date);
    if (r) return r;
    tried.add(source);
  }
  for (const id of FALLBACK_ORDER) {
    if (tried.has(id)) continue;
    const r = _tryPipeline(id, name, date);
    if (r) return r;
  }
  return { ra: 0, dec: 0 };
}

// Same as bodyRADec but tells you which pipeline answered.
export function bodyRADecRoute(name, date, source = 'ptolemy') {
  if (name === 'earth') return { reading: { ra: 0, dec: 0 }, used: source };
  tried.clear();
  if (source) {
    const r = _tryPipeline(source, name, date);
    if (r) return { reading: r, used: source };
    tried.add(source);
  }
  for (const id of FALLBACK_ORDER) {
    if (tried.has(id)) continue;
    const r = _tryPipeline(id, name, date);
    if (r) return { reading: r, used: id };
  }
  return { reading: { ra: 0, dec: 0 }, used: 'ptolemy' };
}

// Direct per-pipeline access.
export function planetEquatorial(name, date, source = 'ptolemy') {
  return ptol.planetEquatorial(name, date);
}
export function sunEquatorial(date, source = 'ptolemy') {
  return ptol.sunEquatorial(date);
}
export function moonEquatorial(date, source = 'ptolemy') {
  return ptol.moonEquatorial(date);
}
export function bodyGeocentric(name, date) { return ptol.bodyGeocentric(name, date); }
