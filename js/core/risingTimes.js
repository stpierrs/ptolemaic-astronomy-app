// js/core/risingTimes.js
// PART 9.4 — Ptolemaic rising-time / oblique-ascension tables.
//
// Ptolemy interpolates between six terrestrial parallels:
//   Soene (23°51′), Lower Egypt (30°22′), Rhodes (36°),
//   Hellespont (40°56′), Middle of Pontus (45°1′),
//   Mouths of Borysthenes (48°32′).
//
// We reconstruct each parallel's oblique-ascension table at 1° intervals of
// ecliptic longitude using the standard formulae:
//
//   ad(λ, φ) = arcsin(tan(dec(λ)) · tan(φ))
//   OA(λ, φ) = RA(λ) − ad(λ, φ)
//
// where dec(λ) = arcsin(sin(eps) · sin(λ))
//       RA(λ)  = atan2(cos(eps) · sin(λ), cos(λ))
//
// All values in degrees.

const R = Math.PI / 180;
const EPS = 23.8367; // Ptolemy's measured obliquity 23°51'20"

export const PARALLELS = [
  { name: 'Soene',                 lat: 23 + 51/60 },
  { name: 'Lower Egypt',           lat: 30 + 22/60 },
  { name: 'Rhodes',                lat: 36 +  0/60 },
  { name: 'Hellespont',            lat: 40 + 56/60 },
  { name: 'Middle of Pontus',      lat: 45 +  1/60 },
  { name: 'Mouths of Borysthenes', lat: 48 + 32/60 },
];

function obliqueAscension(lonDeg, latDeg) {
  const lon = lonDeg * R;
  const lat = latDeg * R;
  const eps = EPS * R;
  const sinDec = Math.sin(eps) * Math.sin(lon);
  const dec    = Math.asin(sinDec);
  let raDeg = Math.atan2(Math.cos(eps) * Math.sin(lon), Math.cos(lon)) / R;
  if (raDeg < 0) raDeg += 360;
  // Guard against |tan(dec)*tan(lat)| > 1 (circumpolar) — return RA when undefined.
  const arg = Math.tan(dec) * Math.tan(lat);
  if (!Number.isFinite(arg) || Math.abs(arg) > 1) return ((raDeg % 360) + 360) % 360;
  const adDeg  = Math.asin(arg) / R;
  return ((raDeg - adDeg) % 360 + 360) % 360;
}

// Pre-build OA tables once at module load
const OA_TABLES = PARALLELS.map(par => {
  const tbl = new Float64Array(361);
  for (let i = 0; i <= 360; i++) tbl[i] = obliqueAscension(i, par.lat);
  return { name: par.name, lat: par.lat, tbl };
});

function ascendantModernFormula(targetOA, latDeg) {
  const ramc = (targetOA - 90) * R;
  const lat = latDeg * R;
  const eps = EPS * R;
  let asc = Math.atan2(Math.cos(ramc),
    -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat) * Math.sin(eps))) / R;
  asc = ((asc % 360) + 360) % 360;
  if (Math.cos(ramc) < 0) asc = (asc + 180) % 360;
  return asc;
}

function invertOATable(tbl, target) {
  for (let i = 0; i < 360; i++) {
    const a = tbl[i], b = tbl[i + 1];
    if (a <= b) {
      if (target >= a && target <= b) {
        return i + (target - a) / (b - a);
      }
    } else {
      // wrap segment (e.g. 359 → 1)
      if (target >= a || target <= b) {
        const span = (b + 360 - a);
        const off  = (target >= a) ? (target - a) : (target + 360 - a);
        return i + off / span;
      }
    }
  }
  return 0;
}

/**
 * Inverse: given a target OA at latitude φ, find the ecliptic longitude λ
 * that rises at that OA. Linear interpolation between the two nearest
 * Ptolemaic parallels.
 *
 * @param {number} targetOA - oblique-ascension target in degrees
 * @param {number} latDeg   - observer latitude in degrees (signed)
 * @returns {{ lon: number, method: 'tabular'|'modern-fallback',
 *             parallels: string[], frac?: number }}
 */
export function ascendantFromOA(targetOA, latDeg) {
  const oa = ((targetOA % 360) + 360) % 360;
  const phi = Math.abs(latDeg);

  if (phi < PARALLELS[0].lat - 0.5 || phi > PARALLELS[PARALLELS.length - 1].lat + 0.5) {
    return { lon: ascendantModernFormula(oa, latDeg), method: 'modern-fallback', parallels: [] };
  }

  let lo = 0, hi = PARALLELS.length - 1;
  for (let i = 0; i < PARALLELS.length - 1; i++) {
    if (phi >= PARALLELS[i].lat && phi <= PARALLELS[i + 1].lat) {
      lo = i; hi = i + 1; break;
    }
  }
  const span = (PARALLELS[hi].lat - PARALLELS[lo].lat) || 1;
  const frac = (phi - PARALLELS[lo].lat) / span;
  const lonLo = invertOATable(OA_TABLES[lo].tbl, oa);
  const lonHi = invertOATable(OA_TABLES[hi].tbl, oa);
  let dl = lonHi - lonLo;
  if (dl >  180) dl -= 360;
  if (dl < -180) dl += 360;
  const lon = ((lonLo + dl * frac) % 360 + 360) % 360;

  // Southern hemisphere: tables only encode northern latitudes per Ptolemy.
  // For φ < 0 we use modern-formula fallback (no Ptolemaic precedent).
  if (latDeg < 0) {
    return { lon: ascendantModernFormula(oa, latDeg), method: 'modern-fallback', parallels: [] };
  }

  return {
    lon,
    method: 'tabular',
    parallels: [PARALLELS[lo].name, PARALLELS[hi].name],
    frac,
  };
}
