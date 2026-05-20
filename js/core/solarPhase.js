// PART 8.2 / 12.6 — Solar phase classification + arcus visionis.
//
// Cazimi (≤0°17′), combust (≤8°), under rays (8°–15°),
// morning star (oriental), evening star (occidental).
//
// Accidental-dignity scoring lives in js/core/dignities.js
// (getAccidentalDignity). This module is the engine only.

export const CAZIMI_DEG     = 17 / 60;   // 0°17′
export const COMBUST_DEG    = 8;
export const UNDER_RAYS_DEG = 15;

// PART 12.6 / Appendix A.6 — visibility arcs per planet (degrees).
export const ARCUS_VISIONIS = {
  saturn:  { morning: 11,   evening: 11   },
  jupiter: { morning: 10,   evening: 10   },
  mars:    { morning: 11.5, evening: 14.5 },
  venus:   { morning:  5,   evening:  5   },
  mercury: { morning: 11,   evening: 11   },
};

/**
 * Classify a planet's condition relative to the Sun.
 * @param {number} planetLon - ecliptic longitude in degrees
 * @param {number} sunLon    - ecliptic longitude in degrees
 * @returns {{
 *   elongation: number,       // signed degrees; positive = planet east of Sun
 *   cazimi: boolean,
 *   combust: boolean,
 *   underRays: boolean,
 *   oriental: boolean,        // morning star (planet rises before Sun)
 *   occidental: boolean,      // evening star (planet sets after Sun)
 *   phaseLabel: string,
 * }}
 */
export function solarPhase(planetLon, sunLon) {
  const elongation = ((planetLon - sunLon + 540) % 360) - 180;
  const absE = Math.abs(elongation);

  const cazimi    = absE <= CAZIMI_DEG;
  const combust   = !cazimi && absE <= COMBUST_DEG;
  const underRays = !combust && !cazimi && absE <= UNDER_RAYS_DEG;
  const oriental   = !combust && !cazimi && elongation < 0;
  const occidental = !combust && !cazimi && elongation > 0;

  let phaseLabel = 'normal';
  if (cazimi)        phaseLabel = 'cazimi';
  else if (combust)  phaseLabel = 'combust';
  else if (underRays) phaseLabel = 'under_rays';
  else if (oriental)  phaseLabel = 'morning_star';
  else if (occidental) phaseLabel = 'evening_star';

  return { elongation, cazimi, combust, underRays, oriental, occidental, phaseLabel };
}

/**
 * Visible to the naked eye: elongation exceeds the planet's arcus visionis
 * (morning or evening side). PART 12.6.
 *
 * @param {string} planetName
 * @param {number} elongation - signed degrees; negative = morning, positive = evening
 * @returns {boolean}
 */
export function isVisibleArcusVisionis(planetName, elongation) {
  const arc = ARCUS_VISIONIS[planetName];
  if (!arc) return true;  // Sun/Moon always "visible"
  const absE = Math.abs(elongation);
  if (elongation < 0) return absE >= arc.morning;
  return absE >= arc.evening;
}
