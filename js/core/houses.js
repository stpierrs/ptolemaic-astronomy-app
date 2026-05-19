// Placidus house cusp calculator.
// Exports: computePlacidusHouses(ramc, lat, eps), obliquity(date)

const R = Math.PI / 180;

/**
 * Compute ecliptic longitude whose Oblique Ascension = targetOA (degrees).
 * Used for Placidus intermediate cusps. Converges in ~15 iterations.
 * Returns degrees 0–360.
 */
function placidusIterate(targetOA, latDeg, epsDeg) {
  const latR = latDeg * R, epsR = epsDeg * R;
  let lam = ((targetOA % 360) + 360) % 360; // initial guess
  for (let i = 0; i < 30; i++) {
    const lamR = lam * R;
    const dec  = Math.asin(Math.sin(epsR) * Math.sin(lamR));
    const ra   = Math.atan2(Math.sin(lamR) * Math.cos(epsR), Math.cos(lamR)) / R;
    const ad   = Math.asin(Math.tan(dec) * Math.tan(latR)) / R;
    const oa   = ((ra - ad) % 360 + 360) % 360;
    let   err  = oa - ((targetOA % 360) + 360) % 360;
    if (err >  180) err -= 360;
    if (err < -180) err += 360;
    if (Math.abs(err) < 0.0001) break;
    lam = ((lam - err * 0.75) % 360 + 360) % 360;
  }
  return ((lam % 360) + 360) % 360;
}

/**
 * Compute all 12 Placidus house cusps.
 * @param {number} ramc - Right Ascension of Midheaven (degrees)
 * @param {number} lat  - Observer latitude (degrees)
 * @param {number} eps  - Obliquity of ecliptic (degrees, ~23.4367)
 * @returns {number[]} 12-element array: index 0=H1(ASC) … index 9=H10(MC) etc.
 *          All in degrees 0–360.
 */
export function computePlacidusHouses(ramc, lat, eps) {
  const epsR  = eps * R;
  const ramcR = ramc * R;

  // MC (H10): tan(MC) = tan(RAMC) / cos(eps)
  let mc = Math.atan2(Math.tan(ramcR), Math.cos(epsR)) / R;
  mc = ((mc % 360) + 360) % 360;
  if (Math.cos(ramcR) < 0) mc = (mc + 180) % 360;

  // ASC (H1)
  let asc = Math.atan2(
    Math.cos(epsR) * Math.sin(ramcR) + Math.sin(epsR) * Math.tan(lat * R),
    Math.cos(ramcR)
  ) / R;
  asc = ((asc % 360) + 360) % 360;
  if (Math.cos(ramcR) < 0) asc = (asc + 180) % 360;

  const ic  = (mc  + 180) % 360;
  const dsc = (asc + 180) % 360;

  // Intermediate cusps via Oblique Ascension
  const h11 = placidusIterate(ramc + 60,  lat, eps);
  const h12 = placidusIterate(ramc + 120, lat, eps);
  const h2  = placidusIterate(ramc + 240, lat, eps);
  const h3  = placidusIterate(ramc + 300, lat, eps);

  // Opposite houses
  const h5  = (h11 + 180) % 360;
  const h6  = (h12 + 180) % 360;
  const h8  = (h2  + 180) % 360;
  const h9  = (h3  + 180) % 360;

  // Return cusps indexed 0–11 for houses 1–12
  // [H1/ASC, H2, H3, H4/IC, H5, H6, H7/DSC, H8, H9, H10/MC, H11, H12]
  return [asc, h2, h3, ic, h5, h6, dsc, h8, h9, mc, h11, h12];
}

/** Obliquity of the ecliptic for a JS Date (degrees). */
export function obliquity(date) {
  const T = (date.getTime() / 86400000 - 10957.5) / 36525; // Julian centuries from J2000
  return 23.4392911 - 0.013004167 * T - 0.0000001639 * T * T + 0.0000005036 * T * T * T;
}
