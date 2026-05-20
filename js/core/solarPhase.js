// PART 8.2 — Solar phase classification.
// Cazimi (≤0°17′), combust (≤8°), under rays (8°–15°),
// morning star (oriental), evening star (occidental).
//
// Accidental dignity scoring moved to js/core/dignities.js as
// getAccidentalDignity (Guide 03). This module is the engine only.

const CAZIMI_DEG     = 17 / 60;   // 0°17′
const COMBUST_DEG    = 8;
const UNDER_RAYS_DEG = 15;

/**
 * Classify a planet's condition relative to the Sun.
 * @param {number} planetLon - ecliptic longitude in degrees
 * @param {number} sunLon    - ecliptic longitude in degrees
 * @returns {{
 *   elongation: number,       // signed degrees; positive = planet ahead of Sun
 *   cazimi: boolean,
 *   combust: boolean,
 *   underRays: boolean,
 *   oriental: boolean,        // morning star (planet rises before Sun)
 *   occidental: boolean,      // evening star (planet sets after Sun)
 * }}
 */
export function solarPhase(planetLon, sunLon) {
  const elong = ((planetLon - sunLon + 540) % 360) - 180;
  const absE = Math.abs(elong);

  const cazimi    = absE <= CAZIMI_DEG;
  const combust   = !cazimi && absE <= COMBUST_DEG;
  const underRays = !combust && !cazimi && absE <= UNDER_RAYS_DEG;

  const oriental   = elong < 0 && !combust && !cazimi;
  const occidental = elong > 0 && !combust && !cazimi;

  return { elongation: elong, cazimi, combust, underRays, oriental, occidental };
}
