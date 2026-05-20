// js/core/synastry.js
// PART 23.4 — Classical (NOT modern) compatibility assessment.
//
// Reads two chart objects (from buildNatalChart) and returns a small set
// of relationship indicators: Moon-Moon aspect, Venus↔Mars cross-aspects,
// chart-lord aspect, shared Ascendant element.

const SIGN_DIFF_TO_ASPECT = {
  0: 'conjunction', 2: 'sextile', 3: 'square', 4: 'trine', 6: 'opposition',
};

function signOf(planet) {
  return Math.floor((((planet.lon % 360) + 360) % 360) / 30);
}

function wholeSignAspect(p1Sign, p2Sign) {
  const d = Math.abs(p1Sign - p2Sign);
  const n = Math.min(d, 12 - d);
  return SIGN_DIFF_TO_ASPECT[n] || null;
}

const ELEMENT_OF_SIGN = ['fire','earth','air','water','fire','earth','air','water','fire','earth','air','water'];

/**
 * @param {object} chart1 - PART 20.10 chart
 * @param {object} chart2 - PART 20.10 chart
 * @returns {{
 *   moon_moon: string|null,
 *   venus_mars_a: string|null,
 *   venus_mars_b: string|null,
 *   lord_aspect: string|null,
 *   shared_asc_element: string|null,
 *   highlights: string[],
 * }}
 */
export function compatibility(chart1, chart2) {
  const get = (chart, name) => chart?.planets?.find(p => p.name === name);

  const out = {
    moon_moon:           null,
    venus_mars_a:        null,
    venus_mars_b:        null,
    lord_aspect:         null,
    shared_asc_element:  null,
    highlights:          [],
  };
  if (!chart1 || !chart2) return out;

  const m1  = get(chart1, 'moon'),  m2 = get(chart2, 'moon');
  const v1  = get(chart1, 'venus'), v2 = get(chart2, 'venus');
  const ma1 = get(chart1, 'mars'),  ma2 = get(chart2, 'mars');

  if (m1 && m2)   out.moon_moon    = wholeSignAspect(signOf(m1), signOf(m2));
  if (v1 && ma2)  out.venus_mars_a = wholeSignAspect(signOf(v1), signOf(ma2));
  if (v2 && ma1)  out.venus_mars_b = wholeSignAspect(signOf(v2), signOf(ma1));

  const lord1 = chart1.interpretation?.chartLord?.name;
  const lord2 = chart2.interpretation?.chartLord?.name;
  if (lord1 && lord2) {
    const l1 = get(chart1, lord1), l2 = get(chart2, lord2);
    if (l1 && l2) out.lord_aspect = wholeSignAspect(signOf(l1), signOf(l2));
  }

  if (typeof chart1.ascLon === 'number' && typeof chart2.ascLon === 'number') {
    const e1 = ELEMENT_OF_SIGN[Math.floor(((chart1.ascLon % 360) + 360) % 360 / 30)];
    const e2 = ELEMENT_OF_SIGN[Math.floor(((chart2.ascLon % 360) + 360) % 360 / 30)];
    out.shared_asc_element = e1 === e2 ? e1 : null;
  }

  // Quick highlights for UI copy
  if (out.moon_moon === 'trine' || out.moon_moon === 'sextile') out.highlights.push('Moons in flowing aspect — emotional ease.');
  if (out.moon_moon === 'opposition' || out.moon_moon === 'square') out.highlights.push('Moons in challenging aspect — emotional friction.');
  if (out.venus_mars_a || out.venus_mars_b)                     out.highlights.push('Venus-Mars contact — erotic resonance.');
  if (out.lord_aspect && out.lord_aspect !== null)              out.highlights.push(`Chart-lord ${out.lord_aspect}.`);
  if (out.shared_asc_element)                                   out.highlights.push(`Shared rising element (${out.shared_asc_element}).`);
  return out;
}
