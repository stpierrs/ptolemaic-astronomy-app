// js/core/reportGenerator.js
// PART 11.6 / 14 — Tetrabiblos-ordered natal report. Returns a structured
// object; UI does the formatting. Same object feeds the PDF / share-card
// pipelines in Guide 16.

import houseSig from '../data/astrology/house_significations.js';
import { DOMICILE, getPlanetDignity } from './dignities.js';
import { wholeSignHouseOf, houseTier } from './houses.js';
import { computeTemperament } from './qualities.js';
import { computeLots } from './lots.js';
import { selectChartLord } from './chartLord.js';
import { selectApheta, findAnaretae, primaryDirections } from './lifespan.js';
import { buildSectionVerdict } from './verdictLanguage.js';

const RULER_OF_SIGN = {};
for (const [planet, signs] of Object.entries(DOMICILE))
  for (const s of signs) RULER_OF_SIGN[s] = planet;

const SIGN_NAMES = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpius','Sagittarius','Capricornus','Aquarius','Pisces'];

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function signName(idx) { return SIGN_NAMES[((idx % 12) + 12) % 12]; }

/**
 * Build the Tetrabiblos-ordered report.
 *
 * @param {object} chart        - PART 20.10 chart from buildNatalChart
 * @param {{ gender?: 'm'|'f' }} [opts]
 * @returns {{ sections: object, summary: Array, computed_at: number }}
 */
export function buildReport(chart, opts = {}) {
  const gender = opts.gender || 'm';

  const sections = {
    preamble:   buildPreamble(chart),
    foundation: buildFoundation(chart),
    soul:       buildSoul(chart),
    fortune:    buildFortune(chart),
    dignity:    buildHonour(chart),
    parents:    buildParents(chart, gender),
    siblings:   buildHouseTopic(chart, 3),
    children:   buildHouseTopic(chart, 5),
    marriage:   buildMarriage(chart, gender),
    travel:     buildHouseTopic(chart, 9),
    death:      buildDeath(chart),
    predictive: buildPredictive(chart),
  };

  const summary = Object.entries(sections).map(([key, sec]) => ({
    key,
    headline: sec.headline,
    verdict:  sec.verdict,
  }));

  return { sections, summary, computed_at: Date.now() };
}

// ─── Sections ────────────────────────────────────────────────────────────

function buildPreamble(chart) {
  return {
    headline: 'Universal context',
    verdict:  'neutral',
    body: [
      'Active mundane influences — most recent eclipse, great conjunctions, current ingress lord — surface in the Mundane tab. They sit above this nativity as the broader weather.',
    ],
  };
}

function buildFoundation(chart) {
  const sectLight = chart.isDiurnal ? 'sun' : 'moon';
  const ascSign  = Math.floor((((chart.ascLon % 360) + 360) % 360) / 30);
  const ascRuler = RULER_OF_SIGN[ascSign];
  const temp     = computeTemperament(chart);
  const lord     = selectChartLord(chart);
  const lordP    = lord ? chart.planets.find(p => p.name === lord.name) : null;
  const lordDig  = lordP ? getPlanetDignity(lord.name, lordP.lon, chart.isDiurnal) : null;
  const score    = lordDig?.score ?? 0;
  const verdict  = score >= 3 ? 'flourishing' : score <= -2 ? 'difficulty' : 'neutral';
  return {
    headline: `${chart.isDiurnal ? 'Diurnal' : 'Nocturnal'} · ${cap(temp.temperament || '—')} · Chart lord ${cap(lord?.name || '—')}`,
    verdict,
    body: [
      `The chart is ${chart.isDiurnal ? 'diurnal' : 'nocturnal'}. ${cap(sectLight)} is the sect light.`,
      lord ? `${cap(lord.name)} governs this nativity (${lord.source}; essential dignity ${score >= 0 ? '+' : ''}${score}).` : 'No clear chart lord could be selected.',
      `Ascendant: ${signName(ascSign)} ruled by ${cap(ascRuler || '—')}.`,
      `Temperament: ${temp.temperament || '—'} (hot ${temp.votes.hot}, cold ${temp.votes.cold}, moist ${temp.votes.moist}, dry ${temp.votes.dry}).`,
    ],
    ascSign, ascRuler, sectLight, chartLord: lord, temperament: temp,
  };
}

function buildSoul(chart) {
  const merc = chart.planets.find(p => p.name === 'mercury');
  const moon = chart.planets.find(p => p.name === 'moon');
  const mercDig = merc ? getPlanetDignity('mercury', merc.lon, chart.isDiurnal) : null;
  const moonDig = moon ? getPlanetDignity('moon',    moon.lon, chart.isDiurnal) : null;
  const bothDig = (mercDig?.score ?? 0) > 0 && (moonDig?.score ?? 0) > 0;
  return {
    headline: `Mercury ${mercDig?.label || '—'} · Moon ${moonDig?.label || '—'}`,
    verdict:  bothDig ? 'flourishing' : 'mixed',
    body: [
      `Mercury — rational soul. In ${signName(merc?.sign_index)} (${mercDig?.label}, ${mercDig?.score >= 0 ? '+' : ''}${mercDig?.score}). Mercury's quality is dynamic; it takes on the nature of whichever planets aspect it.`,
      `Moon — irrational soul / animal character. In ${signName(moon?.sign_index)} (${moonDig?.label}, ${moonDig?.score >= 0 ? '+' : ''}${moonDig?.score}). The Moon's cold and moist nature governs habits, instincts, and bodily fluids.`,
    ],
    mercury: { lon: merc?.lon, dignity: mercDig },
    moon:    { lon: moon?.lon, dignity: moonDig },
  };
}

function buildFortune(chart) {
  const lots = computeLots(chart);
  const lord = lots.fortune.lord;
  const lordP = lord ? chart.planets.find(p => p.name === lord) : null;
  const lordDig = lordP ? getPlanetDignity(lord, lordP.lon, chart.isDiurnal) : null;
  const score = lordDig?.score ?? 0;
  const verdict = score >= 3 ? 'flourishing' : score <= -2 ? 'difficulty' : 'mixed';
  const fortuneSignIdx = Math.floor((((lots.fortune.lon % 360) + 360) % 360) / 30);
  return {
    headline: `Lot of Fortune in ${signName(fortuneSignIdx)} · Lord ${cap(lord || '—')}`,
    verdict,
    body: [
      `Lot of Fortune at ${lots.fortune.lon.toFixed(1)}°. Material circumstances follow its lord and the houses it touches.`,
      lord ? `Lord ${cap(lord)} — ${lordDig?.label}, score ${score >= 0 ? '+' : ''}${score}.` : 'Lord unavailable.',
    ],
    lot: lots.fortune,
    lordOfLot: lord,
    lordCondition: lordDig,
  };
}

function buildHonour(chart) {
  const t = buildHouseTopic(chart, 10);
  t.headline = 'Honour & Career — ' + t.headline;
  return t;
}

function buildParents(chart, gender) {
  return {
    headline: 'Parents',
    verdict:  'mixed',
    body: [
      `Father: ${gender === 'm' ? 'Sun + Saturn' : 'Saturn'} as significators; House IV as venue.`,
      `Mother: Moon + Venus as significators; House X as venue.`,
    ],
    father: buildHouseTopic(chart, 4),
    mother: buildHouseTopic(chart, 10),
  };
}

function buildMarriage(chart, gender) {
  const sig = gender === 'm' ? 'venus' : 'mars';
  const sigP = chart.planets.find(p => p.name === sig);
  const sigDig = sigP ? getPlanetDignity(sig, sigP.lon, chart.isDiurnal) : null;
  const score = sigDig?.score ?? 0;
  const verdict = score >= 3 ? 'flourishing' : score <= -2 ? 'difficulty' : 'mixed';
  return {
    headline: `${cap(sig)} — ${sigDig?.label || '—'}`,
    verdict,
    body: [
      `Significator ${cap(sig)} stands in ${signName(sigP?.sign_index)} with dignity ${score >= 0 ? '+' : ''}${score}.`,
      `House VII (Marriage) assessed below.`,
    ],
    significator: sig,
    sigCondition: sigDig,
    house7: buildHouseTopic(chart, 7),
  };
}

function buildDeath(chart) {
  const apheta = selectApheta(chart);
  const anaretae = findAnaretae(chart, apheta).slice(0, 5);
  const closest = anaretae[0];
  return {
    headline: `Apheta: ${cap(apheta.name === 'asc' ? 'Ascendant' : apheta.name)} (${apheta.source})`,
    verdict:  'neutral',
    body: [
      apheta.source,
      closest
        ? `Closest anareta candidate: ${closest.target} at arc ${closest.arcDeg.toFixed(1)}° (≈ age ${Math.round(closest.arcDeg)}).`
        : 'No anaretic candidates found within range.',
    ],
    apheta, anaretae,
    house8: buildHouseTopic(chart, 8),
  };
}

function buildPredictive(chart) {
  const now = new Date();
  const age = Math.max(0, Math.floor((now - chart.date) / (365.25 * 86400000)));
  const ascSign = Math.floor((((chart.ascLon % 360) + 360) % 360) / 30);
  const profHouse = ((age % 12) + 12) % 12 + 1;
  const profSign = (ascSign + (age % 12)) % 12;
  const lord = RULER_OF_SIGN[profSign];
  const events = primaryDirections(chart, age, 10);
  return {
    headline: `Age ${age} · House ${profHouse} (${signName(profSign)}) · Lord ${cap(lord || '—')}`,
    verdict:  'neutral',
    body: [
      `Profected house: ${profHouse} (${signName(profSign)}).`,
      `Lord of the Year: ${cap(lord || '—')}.`,
      `Primary directions in next 10 years: ${events.length} events.`,
    ],
    age, profHouse, profSign, lord, directions: events,
  };
}

// PART 11.5 — house-topic helper
function buildHouseTopic(chart, houseNum) {
  const ascSign   = Math.floor((((chart.ascLon % 360) + 360) % 360) / 30);
  const houseSign = (ascSign + (houseNum - 1) + 12) % 12;
  const lordName  = RULER_OF_SIGN[houseSign];
  const lord = chart.planets.find(p => p.name === lordName);
  const occupants = chart.planets.filter(p => p.sign_index === houseSign);
  const lordDig = lord ? getPlanetDignity(lordName, lord.lon, chart.isDiurnal) : null;
  const tier    = lord ? houseTier(wholeSignHouseOf(lord.lon, chart.ascLon)) : null;

  const verdict = buildSectionVerdict({
    lordDignityScore: lordDig?.score ?? 0,
    lordHouseTier:    tier,
    occupantCount:    occupants.length,
  });

  const meta = houseSig[houseNum - 1];
  return {
    headline: `${meta?.name || 'House ' + houseNum} (H${houseNum}) — ${lordDig?.label || 'no lord'}`,
    verdict,
    body: [
      `House sign: ${signName(houseSign)}.`,
      `Lord: ${cap(lordName)} — dignity ${(lordDig?.score ?? 0) >= 0 ? '+' : ''}${lordDig?.score ?? '—'}${tier ? ` (lord in ${tier} house)` : ''}.`,
      `Occupants: ${occupants.map(o => cap(o.name)).join(', ') || 'none'}.`,
      meta?.meaning || '',
    ].filter(Boolean),
    house: houseNum,
    sign:  houseSign,
    lord:  lordName,
    lord_condition: lordDig,
    occupants: occupants.map(o => o.name),
  };
}
