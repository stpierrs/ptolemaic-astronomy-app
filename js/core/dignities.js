// Ptolemaic Essential Dignities — drawn directly from the Tetrabiblos, Book I,
// Chapters XX–XXVI (Ashmand translation, 1822).
//
// This module implements:
//   • Domicile rulerships (Ch. XX)
//   • Exaltations and Falls (Ch. XXII)
//   • Triplicity rulers by day and night (Ch. XXI)
//   • Ptolemaic Terms / Bounds (Ch. XXIII–XXIV)
//   • Faces / Decans (Ch. XXVI)
//   • Planetary Natures: hot/cold/moist/dry, sect, sex, benefic/malefic (Ch. IV–VII)
//   • Planetary Orbs (Appendix II)
//   • House Significations (Books III–IV)
//   • getDignity(planet, lon, isDaytime) → full dignity object

// Sign indices: 0=Aries 1=Taurus 2=Gemini 3=Cancer 4=Leo 5=Virgo
//               6=Libra 7=Scorpio 8=Sagittarius 9=Capricorn 10=Aquarius 11=Pisces

// ── Domicile Rulerships (Book I, Ch. XX) ─────────────────────────────────────
// "Cancer and Leo are the most northerly of all the twelve signs … they are
//  consequently appropriated as houses for the two principal and greater
//  luminaries; Leo for the Sun, as being masculine; and Cancer for the Moon,
//  as being feminine."  — Tetrabiblos I.XX
export const DOMICILE = {
  sun:     [4],       // Leo
  moon:    [3],       // Cancer
  mercury: [2, 5],    // Gemini, Virgo
  venus:   [1, 6],    // Taurus, Libra
  mars:    [0, 7],    // Aries, Scorpio
  jupiter: [8, 11],   // Sagittarius, Pisces
  saturn:  [9, 10],   // Capricorn, Aquarius
};

// ── Exaltations (Book I, Ch. XXII) ───────────────────────────────────────────
export const EXALTATION = {
  sun:     0,   // Aries  19°
  moon:    1,   // Taurus  3°
  saturn:  6,   // Libra  21°
  jupiter: 3,   // Cancer 15°
  mars:    9,   // Capricorn 28°
  venus:   11,  // Pisces 27°
  mercury: 5,   // Virgo  15°
};

// ── Falls (sign opposite the exaltation) ─────────────────────────────────────
export const FALL = {
  sun:     6,   // Libra
  moon:    7,   // Scorpio
  saturn:  0,   // Aries
  jupiter: 9,   // Capricorn
  mars:    3,   // Cancer
  venus:   5,   // Virgo
  mercury: 11,  // Pisces
};

// ── Triplicity Rulers (Book I, Ch. XXI) ──────────────────────────────────────
// "The first triplicity … Its lord by day is the Sun, and by night Jupiter;
//  and Saturn co-operates with both."
// Fire:  Aries / Leo / Sagittarius
// Earth: Taurus / Virgo / Capricorn
// Air:   Gemini / Libra / Aquarius
// Water: Cancer / Scorpio / Pisces
const SIGN_ELEMENT = [
  'fire','earth','air','water',
  'fire','earth','air','water',
  'fire','earth','air','water',
];

export const TRIPLICITY = {
  fire:  { day: 'sun',     night: 'jupiter', co: 'saturn'  },
  earth: { day: 'venus',   night: 'moon',    co: 'mars'    },
  air:   { day: 'saturn',  night: 'mercury', co: 'jupiter' },
  water: { day: 'moon',    night: 'mars',    co: 'mars'    },
};

// ── Ptolemaic Terms / Bounds (Book I, Ch. XXIII–XXIV) ────────────────────────
// Single source of truth in js/data/astrology/egyptian_terms.js. Convert the
// flat list into the [sign][term] = [planetName, endDeg] format the existing
// getPlanetDignity consumer expects.
import egyptianTerms from '../data/astrology/egyptian_terms.js';

export const TERMS = (() => {
  const out = Array.from({ length: 12 }, () => []);
  for (const t of egyptianTerms) out[t.signIdx].push([t.ruler, t.endDeg]);
  for (const row of out) row.sort((a, b) => a[1] - b[1]);
  return out;
})();

// ── Faces / Decans (Book I, Ch. XXVI) ────────────────────────────────────────
// Chaldean decan order: each 10° section of the zodiac (36 total) is assigned
// to a planet in the repeating order Mars → Sun → Venus → Mercury → Moon → Saturn → Jupiter.
// Aries 0–10° = Mars, Aries 10–20° = Sun, Aries 20–30° = Venus, Taurus 0–10° = Mercury, etc.
const FACE_ORDER = ['mars','sun','venus','mercury','moon','saturn','jupiter'];

// ── Planetary Orbs (Tetrabiblos Appendix II) ─────────────────────────────────
// Each planet has an orb (moiety = half-orb). An aspect is valid when the
// separation is within (moiety_A + moiety_B) of the exact angle.
export const PLANET_ORBS = {
  sun:     17,
  moon:    12.5,
  saturn:  10,
  jupiter: 12,
  mars:    7.5,
  venus:   8,
  mercury: 7.5,
};

// ── Planetary Natures (Book I, Ch. IV–VII) ────────────────────────────────────
// "Saturn produces cold and dryness … Jupiter … promotes both warmth and
//  moisture … Mars chiefly causes dryness, and is also strongly heating …
//  Jupiter and Venus … benefic, or causers of good … Saturn and Mars …
//  malefic, or causers of evil."
export const PLANET_NATURE = {
  sun:     { quality:'hot, slightly dry',    sect:'diurnal',   sex:'masculine', nature:'common',  color:'#ffd060' },
  moon:    { quality:'cold, moist',          sect:'nocturnal', sex:'feminine',  nature:'benefic', color:'#dcdcf0' },
  saturn:  { quality:'cold, dry',            sect:'diurnal',   sex:'masculine', nature:'malefic', color:'#c4aa78' },
  jupiter: { quality:'warm, moist',          sect:'diurnal',   sex:'masculine', nature:'benefic', color:'#d4b878' },
  mars:    { quality:'hot, dry',             sect:'nocturnal', sex:'masculine', nature:'malefic', color:'#ff7055' },
  venus:   { quality:'warm, moist',          sect:'nocturnal', sex:'feminine',  nature:'benefic', color:'#ffb8cc' },
  mercury: { quality:'variable',             sect:'common',    sex:'common',    nature:'common',  color:'#a8d888' },
};

// ── House Significations (Tetrabiblos Books III–IV) ───────────────────────────
export const HOUSE_MEANINGS = [
  { name:'Life',           meaning:'Vitality, constitution, and the native\'s vital force. The native himself.' },
  { name:'Livelihood',     meaning:'Wealth, possessions, substance, and the sources of material sustenance.' },
  { name:'Brethren',       meaning:'Siblings, short journeys, neighbours, early learning.' },
  { name:'Parents',        meaning:'Mother, homeland, inner foundations, the fourth angle.' },
  { name:'Children',       meaning:'Offspring, pleasures, games, creative works and speculation.' },
  { name:'Sickness',       meaning:'Bodily afflictions, servants, daily labour, enemies within.' },
  { name:'Marriage',       meaning:'Partnerships, open enemies, public contracts, the seventh angle.' },
  { name:'Death',          meaning:'Legacies, others\' resources, crises, the manner of death.' },
  { name:'Journeys',       meaning:'Long travel, philosophy, religion, foreign lands and peoples.' },
  { name:'Honour',         meaning:'Occupation, rank, reputation, the culminating angle.' },
  { name:'Friends',        meaning:'Friends, benefactors, patrons, hopes and alliances.' },
  { name:'Hidden enemies', meaning:'Secret foes, exile, affliction, self-undoing, confinement.' },
];

// ── Dignity Computation ───────────────────────────────────────────────────────

/**
 * Compute the essential dignity of a planet at a given ecliptic longitude.
 *
 * @param {string}  planet     — 'sun'|'moon'|'mercury'|'venus'|'mars'|'jupiter'|'saturn'
 * @param {number}  lon        — ecliptic longitude in degrees (0–360)
 * @param {boolean} isDaytime  — true if Sun is above horizon (affects triplicity)
 * @returns {{
 *   score:      number,
 *   label:      string,
 *   breakdown:  string[],
 *   domicile:   boolean,
 *   exaltation: boolean,
 *   triplicity: boolean,
 *   term:       boolean,
 *   face:       boolean,
 *   detriment:  boolean,
 *   fall:       boolean,
 *   peregrine:  boolean,
 *   element:    string,
 * }}
 */
export function getPlanetDignity(planet, lon, isDaytime = true) {
  const normLon   = ((lon % 360) + 360) % 360;
  const signIdx   = Math.floor(normLon / 30) % 12;
  const degInSign = normLon % 30;
  const element   = SIGN_ELEMENT[signIdx];

  let score = 0;
  const breakdown = [];

  // ── Domicile (+5) / Detriment (−5) ─────────────────────────────────────────
  const myDomiciles   = DOMICILE[planet] || [];
  const myDetriments  = myDomiciles.map((s) => (s + 6) % 12);
  const domicile      = myDomiciles.includes(signIdx);
  const detriment     = myDetriments.includes(signIdx);
  if (domicile)  { score += 5; breakdown.push('Domicile +5');   }
  if (detriment) { score -= 5; breakdown.push('Detriment −5');  }

  // ── Exaltation (+4) / Fall (−4) ─────────────────────────────────────────────
  const exaltation = EXALTATION[planet] === signIdx;
  const fall       = FALL[planet]       === signIdx;
  if (exaltation) { score += 4; breakdown.push('Exaltation +4'); }
  if (fall)       { score -= 4; breakdown.push('Fall −4');        }

  // ── Triplicity (+3) ─────────────────────────────────────────────────────────
  const tri        = TRIPLICITY[element];
  const triLord    = isDaytime ? tri?.day : tri?.night;
  const triplicity = (triLord === planet);
  if (triplicity) { score += 3; breakdown.push('Triplicity +3'); }

  // ── Term (+2) ───────────────────────────────────────────────────────────────
  let term = false;
  const termList = TERMS[signIdx];
  if (termList) {
    let prev = 0;
    for (const [p, end] of termList) {
      if (degInSign >= prev && degInSign < end) {
        if (p === planet) { term = true; score += 2; breakdown.push('Term +2'); }
        break;
      }
      prev = end;
    }
  }

  // ── Face (+1) ───────────────────────────────────────────────────────────────
  const faceIdx = (signIdx * 3 + Math.floor(degInSign / 10)) % 7;
  const face    = FACE_ORDER[faceIdx] === planet;
  if (face) { score += 1; breakdown.push('Face +1'); }

  const peregrine = score === 0 && !detriment && !fall;

  return {
    score, breakdown, element, peregrine,
    domicile, exaltation, triplicity, term, face, detriment, fall,
    label: _dignityLabel(score, domicile, exaltation, detriment, fall, peregrine),
  };
}

function _dignityLabel(score, dom, exalt, det, fall, pereg) {
  if (dom && exalt)  return 'Chariot ✦';
  if (dom)           return 'Domicile';
  if (exalt)         return 'Exaltation';
  if (det && fall)   return 'Fallen & Detrimented';
  if (det)           return 'Detriment';
  if (fall)          return 'Fall';
  if (score >= 6)    return 'Highly Dignified';
  if (score >= 4)    return 'Well Dignified';
  if (score >= 2)    return 'Dignified';
  if (score >= 1)    return 'Weakly Dignified';
  if (pereg)         return 'Peregrine';
  return 'Afflicted';
}

/** Label colour for dignity display */
export function dignityColor(dig) {
  if (dig.domicile || dig.exaltation)   return '#f0d060';
  if (dig.detriment || dig.fall)        return '#ff7055';
  if (dig.score >= 4)                   return '#a8d888';
  if (dig.score >= 2)                   return '#88ccaa';
  if (dig.peregrine)                    return '#888888';
  return '#aaaaaa';
}

/**
 * Compute the Ptolemaic aspect orb between two planets.
 * Uses moiety (half-orb) system: orb = (moiety_a + moiety_b)
 */
export function moietyOrb(planetA, planetB) {
  const ma = (PLANET_ORBS[planetA] || 8) / 2;
  const mb = (PLANET_ORBS[planetB] || 8) / 2;
  return ma + mb;
}
