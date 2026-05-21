// PART 11 — Tetrabiblos-ordered natal report.
//
// Produces a structured object; the renderer in astrologyApp.js formats it
// into the Report tab. Each section's shape is documented inline.

import { lonToZodiac, PLANET_SYMBOLS } from './astrology.js';
import { wholeSignHouseOf } from './houses.js';
import { getPlanetDignity, getAccidentalDignity, DOMICILE, HOUSE_MEANINGS } from './dignities.js';
import { computeLots } from './lots.js';
import { computeTemperament } from './qualities.js';
import { selectApheta, findAnaretae, primaryDirections } from './lifespan.js';

const RULER_OF_SIGN = {};
for (const [planet, signs] of Object.entries(DOMICILE)) {
  for (const s of signs) RULER_OF_SIGN[s] = planet;
}

/**
 * Build a Tetrabiblos-ordered natal report.
 * @param {object} chart - rich chart from computeFullChart()
 * @param {object} opts  - { gender: 'm'|'f' } for §5, §8 alternates
 * @returns {object}
 */
export function buildNatalReport(chart, opts = {}) {
  const gender = opts.gender || 'm';
  return {
    foundation: buildFoundation(chart),
    soul:       buildSoul(chart),
    fortune:    buildFortune(chart),
    dignity:    buildDignityCareer(chart),
    parents:    buildParents(chart, gender),
    siblings:   buildHouseTopic(chart, 3),
    children:   buildHouseTopic(chart, 5),
    marriage:   buildMarriage(chart, gender),
    livelihood: buildLivelihood(chart),
    travel:     buildHouseTopic(chart, 9),
    death:      buildDeath(chart),
    predictive: buildPredictive(chart),
  };
}

function buildFoundation(chart) {
  const sectLight = chart.isDiurnal ? 'sun' : 'moon';
  const ascSign   = Math.floor(((chart.ascLon % 360) + 360) % 360 / 30);
  const ascRuler  = RULER_OF_SIGN[ascSign];
  const temp      = computeTemperament(chart);
  const lord      = selectChartLord(chart);
  return {
    sect:        chart.isDiurnal ? 'diurnal' : 'nocturnal',
    sectLight,
    chartLord:   lord,
    ascendant:   { sign: ascSign, ruler: ascRuler, lon: chart.ascLon },
    temperament: temp.temperament,
    qualityVotes: temp.votes,
  };
}

// PART 10.3 — Chart lord (oikodespotes) selection
function selectChartLord(chart) {
  const angularHouses = new Set([1, 4, 7, 10]);
  const ascSign       = Math.floor(((chart.ascLon % 360) + 360) % 360 / 30);
  const ascRuler      = RULER_OF_SIGN[ascSign];

  let best = null;
  for (const p of chart.planets) {
    const h = wholeSignHouseOf(p.lon, chart.ascLon);
    if (!angularHouses.has(h)) continue;
    const d = getPlanetDignity(p.name, p.lon, chart.isDiurnal);
    if (!best || d.score > best.score) {
      best = { name: p.name, score: d.score, source: `angular H${h} dignity ${d.score >= 0 ? '+' : ''}${d.score}` };
    }
  }
  if (best && best.score > 0) return best;

  if (ascRuler) return { name: ascRuler, score: 0, source: 'Ascendant ruler' };

  const sectLight = chart.isDiurnal ? 'sun' : 'moon';
  const slP = chart.planets.find(p => p.name === sectLight);
  if (slP) {
    const slSign = Math.floor(((slP.lon % 360) + 360) % 360 / 30);
    return { name: RULER_OF_SIGN[slSign], score: 0, source: 'ruler of sect light' };
  }
  return null;
}

// PART 11.2 — house-topic helper
function buildHouseTopic(chart, houseNum) {
  const ascSign   = Math.floor(((chart.ascLon % 360) + 360) % 360 / 30);
  const houseSign = (ascSign + (houseNum - 1) + 12) % 12;
  const lordName  = RULER_OF_SIGN[houseSign];
  const lord      = chart.planets.find(p => p.name === lordName);
  const occupants = chart.planets.filter(p =>
    Math.floor(((p.lon % 360) + 360) % 360 / 30) === houseSign
  );
  let lordCondition = null;
  if (lord) {
    const dig = getPlanetDignity(lordName, lord.lon, chart.isDiurnal);
    const acc = getAccidentalDignity(lordName, chart);
    lordCondition = {
      dignity:    dig,
      accidental: acc,
      house:      wholeSignHouseOf(lord.lon, chart.ascLon),
      lon:        lord.lon,
    };
  }
  return {
    house:    houseNum,
    name:     HOUSE_MEANINGS[houseNum - 1]?.name,
    meaning:  HOUSE_MEANINGS[houseNum - 1]?.meaning,
    sign:     houseSign,
    lord:     lordName,
    lordCondition,
    occupants: occupants.map(o => ({ name: o.name, lon: o.lon })),
  };
}

function buildSoul(chart) {
  const merc = chart.planets.find(p => p.name === 'mercury');
  const moon = chart.planets.find(p => p.name === 'moon');
  return {
    mercury: { lon: merc?.lon, dignity: merc ? getPlanetDignity('mercury', merc.lon, chart.isDiurnal) : null },
    moon:    { lon: moon?.lon, dignity: moon ? getPlanetDignity('moon',    moon.lon, chart.isDiurnal) : null },
  };
}

function buildFortune(chart) {
  const lots = computeLots(chart);
  const lord = lots.fortune.lord;
  const lordPlanet = lord ? chart.planets.find(p => p.name === lord) : null;
  return {
    lot:        lots.fortune,
    lordOfLot:  lord,
    lordCondition: lordPlanet ? getPlanetDignity(lord, lordPlanet.lon, chart.isDiurnal) : null,
  };
}

function buildDignityCareer(chart) {
  const ascSign = Math.floor(((chart.ascLon % 360) + 360) % 360 / 30);
  const mcSign  = (ascSign + 9) % 12;
  return {
    mcSign,
    mcRuler: RULER_OF_SIGN[mcSign],
    houseX:  buildHouseTopic(chart, 10),
  };
}

function buildParents(chart, gender) {
  return {
    father: { significators: gender === 'm' ? ['sun', 'saturn'] : ['saturn'], house: buildHouseTopic(chart, 4) },
    mother: { significators: ['moon', 'venus'], house: buildHouseTopic(chart, 10) },
  };
}

function buildMarriage(chart, gender) {
  const sig = gender === 'm' ? 'venus' : 'mars';
  return {
    house: buildHouseTopic(chart, 7),
    significator: sig,
  };
}

function buildLivelihood(chart) {
  const lots = computeLots(chart);
  const ascSign = Math.floor(((chart.ascLon % 360) + 360) % 360 / 30);
  return {
    house2:    buildHouseTopic(chart, 2),
    lotOfFortune: lots.fortune,
    house10Lord:  RULER_OF_SIGN[(ascSign + 9) % 12],
  };
}

function buildDeath(chart) {
  const apheta = selectApheta(chart);
  const anaretae = findAnaretae(chart, apheta);
  return { house8: buildHouseTopic(chart, 8), apheta, anaretae: anaretae.slice(0, 5) };
}

function buildPredictive(chart) {
  const now = new Date();
  const age = Math.max(0, Math.floor((now - chart.date) / (365.25 * 24 * 3600 * 1000)));
  const ascSign = Math.floor(((chart.ascLon % 360) + 360) % 360 / 30);
  return {
    age,
    profection: {
      house: ((age % 12) + 12) % 12 + 1,
      sign:  (ascSign + (age % 12)) % 12,
    },
    directions: primaryDirections(chart, age, 10),
  };
}
