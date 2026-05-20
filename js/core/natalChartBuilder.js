// js/core/natalChartBuilder.js
// PART 20 — Master natal chart assembly.
//
// Takes a `birthData` object and returns the rich PART 20.10 chart
// shape: { id, meta, astronomy, interpretation, ...flat-backcompat }.
// Every downstream consumer (UI tabs, transit engine, report
// generator, export) treats this as the canonical chart object.

import {
  getAllPositions, getAngles, toJulianDate,
  PLANET_NAMES_ORDERED,
} from './astrologyAdapter.js';
import {
  computeWholeSignHouses, wholeSignHouseOf, houseTier,
  computePlacidusHouses, obliquity,
} from './houses.js';
import { greenwichSiderealDeg } from './ephemeris.js';
import { DOMICILE, getFullDignity } from './dignities.js';
import { computeAspects } from './aspects.js';
import { computeLots } from './lots.js';
import { selectChartLord } from './chartLord.js';
import { computeTemperament, planetQuality } from './qualities.js';

const RULER_OF_SIGN = {};
for (const [planet, signs] of Object.entries(DOMICILE)) {
  for (const s of signs) RULER_OF_SIGN[s] = planet;
}

/**
 * @param {object} birthData
 *   { name, year, month, day, hour, minute, utcOffset, latitude, longitude,
 *     timezone, locationName, birthTimeKnown, source? }
 * @param {object} [opts] - { source }
 * @returns {object} PART 20.10 shape
 */
export function buildNatalChart(birthData, opts = {}) {
  const source = opts.source || birthData.source || 'ibnshatir';

  // Step 1: Date in UT
  const utHour = (birthData.hour || 0) - (birthData.utcOffset ?? 0);
  const date = new Date(Date.UTC(
    birthData.year, (birthData.month || 1) - 1, birthData.day || 1,
    utHour, birthData.minute || 0, 0
  ));
  const JD = toJulianDate(date);

  // Step 2: Positions (PART 1.7 shape per planet)
  const positions = getAllPositions(date, { source });

  // Step 3: Angles via adapter (corrects MC formula vs legacy buildNatalChart)
  const angles = getAngles(date, birthData.latitude, birthData.longitude);
  const ascLon = angles.Asc.longitude;
  const mcLon  = angles.MC.longitude;

  // Step 4: Houses — whole-sign canonical, Placidus illustrative
  const wholeSign = computeWholeSignHouses(ascLon);
  const eps  = obliquity(date);
  const gmst = greenwichSiderealDeg(date);
  const ramc = ((gmst + birthData.longitude) % 360 + 360) % 360;
  const placidus = computePlacidusHouses(ramc, birthData.latitude, eps);

  const houses = {};
  const ascSignIdx = Math.floor((((ascLon % 360) + 360) % 360) / 30);
  for (let h = 1; h <= 12; h++) {
    const signIdx = (ascSignIdx + (h - 1)) % 12;
    houses[h] = {
      number:     h,
      sign_index: signIdx,
      cuspLon:    wholeSign[h - 1],
      tier:       houseTier(h),
      lord:       RULER_OF_SIGN[signIdx],
    };
  }

  // Step 5: Sect (Sun above horizon = diurnal)
  const sunLon = positions.sun.longitude;
  const sunRel = ((sunLon - ascLon) % 360 + 360) % 360;
  const isDiurnal = sunRel >= 180;
  const sect = isDiurnal ? 'diurnal' : 'nocturnal';

  // Step 6: per-planet enriched record (flatten PART 1.7 → planet[])
  const planetList = Object.values(positions).map(p => ({
    name:           p.planet,
    symbol:         p.glyph,
    lon:            p.longitude,
    sign_index:     p.sign_index,
    degree_in_sign: p.degree_in_sign,
    daily_motion:   p.daily_motion,
    retrograde:     p.is_retrograde,
    elongation:     p.elongation,
    phase:          p.phase,
    is_combust:     p.is_combust,
    is_cazimi:      p.is_cazimi,
    is_under_rays:  p.is_under_rays,
    heliacal_state: p.heliacal_state,
    house:          wholeSignHouseOf(p.longitude, ascLon),
  }));

  // Intermediate object for dignity / lots / chart lord / temperament
  const interim = { ascLon, mcLon, planets: planetList, isDiurnal };

  const dignities = {};
  for (const p of planetList) {
    dignities[p.name] = getFullDignity(p.name, interim);
  }
  const aspects     = computeAspects(planetList);
  const lots        = computeLots(interim);
  const chartLord   = selectChartLord(interim);
  const temperament = computeTemperament(interim);

  const qualities = {};
  for (const p of planetList) {
    qualities[p.name] = planetQuality(p.name, interim);
  }

  return {
    id: generateChartId(),
    meta: {
      name:  birthData.name || '',
      birth: {
        year:   birthData.year,
        month:  birthData.month,
        day:    birthData.day,
        hour:   birthData.hour,
        minute: birthData.minute,
        utcOffset:      birthData.utcOffset ?? 0,
        birthTimeKnown: birthData.birthTimeKnown !== false,
      },
      location: {
        name:      birthData.locationName || '',
        latitude:  birthData.latitude,
        longitude: birthData.longitude,
        timezone:  birthData.timezone || 'UTC',
      },
      JD,
      source,
      computed_at: Date.now(),
    },
    astronomy: { positions, angles },
    interpretation: {
      houses,
      houseSystem:    'whole-sign',
      placidusHouses: placidus,
      sect,
      dignities,
      aspects,
      lots,
      chartLord,
      temperament,
      qualities,
    },
    // ── Flat backward-compat fields for callers that predate the
    //    structured PART 20.10 shape (drawChartWheel, render* helpers).
    ascLon,
    mcLon,
    isDiurnal,
    planets: planetList,
    date,
    lat: birthData.latitude,
    lon: birthData.longitude,
    source,
    houses:         wholeSign,
    placidusHouses: placidus,
    aspects,
    ascendant: { sign: angles.Asc.sign, symbol: angles.Asc.sign_glyph, deg: Math.floor(angles.Asc.degree), idx: angles.Asc.sign_index },
    mc:        { sign: angles.MC.sign,  symbol: angles.MC.sign_glyph,  deg: Math.floor(angles.MC.degree),  idx: angles.MC.sign_index },
  };
}

function generateChartId() {
  return 'chart_' + Math.random().toString(36).slice(2, 11) + '_' + Date.now().toString(36);
}
