// PART 16 — Fixed stars in classical astrology.
//
// All catalogue longitudes are J2000.0. Precession applied at 1.396°/century
// (spec PART 16.1). Each entry's `nature` follows Tetrabiblos I.9 / spec
// PART 16.2.

const PRECESSION_DEG_PER_CENT = 1.396;
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

export const FIXED_STARS = [
  // The four Royal Stars and the principal zodiacal stars (PART 16.2).
  { id: 'algol',      name: 'Algol',      starId: null,
    lon2000: 56.30, lat: 22.4, mag: 2.1,
    nature: ['saturn','jupiter'],
    nick: 'Caput Algol — Head of Medusa',
    note: 'The most malefic of the fixed stars; sudden reversal, violence, beheading (literal or figurative). Outside ±8° belt — aspectual only.',
    lore: 'The most malefic of the fixed stars. "When it reaches the Midheaven or Ascendant it destroys life." — Ptolemy. Conjunctions to natal planets bring danger of violence, sudden reversal, and beheading (literal or figurative). The 26th degree of Taurus is one of the most feared points in traditional astrology.' },

  { id: 'aldebaran',  name: 'Aldebaran',  starId: 'aldebaran',
    lon2000: 69.79, lat: -5.47, mag: 0.87,
    nature: ['mars'],
    nick: 'The Eye of the Bull — Watcher of the East',
    note: 'Royal star (eastern guardian); bold and direct martial force. Within ±8° belt.',
    lore: 'One of the four Royal Stars, guardian of the eastern quarter of heaven. Angular or ascending, it gives great honour, wealth, and military distinction, with Jupiter-like generosity. Ptolemy assigns it a Mars nature — it can bring as sudden a downfall as a rise when afflicted.' },

  { id: 'pleiades',   name: 'Pleiades',   starId: null,
    lon2000: 60.00, lat: 4.05, mag: 1.6,
    nature: ['moon','mars'],
    nick: 'Seven Sisters',
    note: 'Grief, turbulence, weeping; Moon-Mars combination. Within ±8° belt.' },

  { id: 'hyades',     name: 'Hyades',     starId: null,
    lon2000: 67.50, lat: -5.7, mag: 3.4,
    nature: ['saturn','mercury'],
    nick: 'Rainy Stars',
    note: 'Cold analytical thinking, systematic temperament; storms in mundane work. Within ±8° belt.' },

  { id: 'capella',    name: 'Capella',    starId: null,
    lon2000: 81.79, lat: 22.9, mag: 0.08,
    nature: ['mars','mercury'],
    nick: 'Little Goat',
    note: 'Bold intellectual courage. Outside ±8° belt — aspectual only.' },

  { id: 'sirius',     name: 'Sirius',     starId: null,
    lon2000: 104.05, lat: -39.6, mag: -1.46,
    nature: ['jupiter','mars'],
    nick: 'Dog Star',
    note: 'Brightest star; conspicuous excellence. Outside ±8° belt — aspectual only.' },

  { id: 'procyon',    name: 'Procyon',    starId: null,
    lon2000: 115.83, lat: -16.0, mag: 0.4,
    nature: ['mercury','mars'],
    nick: 'Little Dog Star',
    note: 'Quick aggressive intellect. Outside ±8° belt — aspectual only.' },

  { id: 'pollux',     name: 'Pollux',     starId: null,
    lon2000: 113.00, lat: 6.7, mag: 1.14,
    nature: ['mars'],
    nick: 'Heavenly Twin (mortal)',
    note: 'Bold passion, forceful desire. Within ±8° belt.' },

  { id: 'regulus',    name: 'Regulus',    starId: 'regulus',
    lon2000: 149.83, lat: 0.46, mag: 1.35,
    nature: ['mars','jupiter'],
    nick: 'The Heart of the Lion — Rex',
    note: 'Royal star (northern guardian); prominence and command; price of fall on reverse. Within ±8° belt.',
    lore: 'The Royal Star of the north, associated with kings and generals. Angular placement or conjunction to Sun, Moon, or ASC confers immense renown, high office, and military honour. The price, per Ptolemy: eminence is followed by sudden disgrace unless morally tempered.' },

  { id: 'spica',      name: 'Spica',      starId: 'spica',
    lon2000: 203.84, lat: -2.05, mag: 1.04,
    nature: ['venus','mercury'],
    nick: 'The Spike of Virgo — Arista',
    note: 'Most benefic of fixed stars. Venus-Mercury; refinement, gifts, artistic distinction. Within ±8° belt.',
    lore: 'The most benefic of all the fixed stars. "It produces brilliant, distinguished and eminent persons." — Ptolemy. Conjunctions bring gifts of art, science, justice, and grace. Spica on the Ascendant or Midheaven is the classic mark of a gifted and celebrated life.' },

  { id: 'arcturus',   name: 'Arcturus',   starId: 'arcturus',
    lon2000: 204.10, lat: 30.7, mag: -0.05,
    nature: ['jupiter','mars'],
    nick: 'The Guardian of the Bear',
    note: 'Authority earned through effort. Outside ±8° belt — aspectual only.',
    lore: 'Of the nature of Mars and Jupiter, Arcturus confers wealth, distinction, and success in government and commerce. It is a great protector star — those with natal planets here tend to be guided through crises that would undo others.' },

  { id: 'antares',    name: 'Antares',    starId: 'antares',
    lon2000: 249.77, lat: -4.34, mag: 1.06,
    nature: ['mars','jupiter'],
    nick: 'The Heart of the Scorpion — Rival of Ares',
    note: 'Royal star (western guardian); intensity, ambition, risk of overreach. Within ±8° belt.',
    lore: 'One of the four Royal Stars, guardian of the western quarter. Like Algol it cuts both ways — a star of brilliant success through martial courage and also of ruin through excess. Conjunctions to Mars, Saturn, or the Lights demand caution; to Jupiter or Venus they promise exceptional achievement.' },

  { id: 'vega',       name: 'Vega',       starId: null,
    lon2000: 285.21, lat: 61.7, mag: 0.03,
    nature: ['venus','mercury'],
    nick: 'Falling Eagle',
    note: 'Beauty and artistic refinement. Outside ±8° belt — aspectual only.' },

  { id: 'fomalhaut',  name: 'Fomalhaut',  starId: 'fomalhaut',
    lon2000: 333.86, lat: -21.13, mag: 1.16,
    nature: ['venus','mercury'],
    nick: 'The Mouth of the Southern Fish — Watcher of the South',
    note: 'Royal star (southern guardian); artistic charisma; eminence via idealism. Outside ±8° belt — aspectual only.',
    lore: 'The southernmost of the four Royal Stars. "It produces an immortal name, though sometimes notorious." — Ptolemy. Associated with eminence through idealism, mysticism, and artistic genius. Fomalhaut on the angles or conjunct the Lights is a mark of either inspired greatness or inspired self-destruction.' },
];

/**
 * Apply precession to bring a J2000 longitude to the given date.
 * Rate: 1.396°/century (PART 16.1).
 */
export function precessedLon(lon2000, date) {
  const centuries = (date.getTime() - J2000_MS) / (100 * 365.25 * 24 * 3600 * 1000);
  return ((lon2000 + PRECESSION_DEG_PER_CENT * centuries) % 360 + 360) % 360;
}

/**
 * Return the catalogue as of `date`. Each entry gets a fresh `lon` (precessed),
 * `inZodiacalBelt` (|lat| ≤ 8°), and `signIdx`.
 */
export function fixedStarsAt(date) {
  return FIXED_STARS.map(s => {
    const lon = precessedLon(s.lon2000, date);
    return {
      ...s,
      lon,
      signIdx: Math.floor(((lon % 360) + 360) % 360 / 30),
      inZodiacalBelt: Math.abs(s.lat) <= 8,
    };
  });
}

/**
 * Find all star-planet conjunctions within `orbDeg`.
 * PART 16.1 — direct contact only for stars within ±8° ecliptic latitude.
 */
export function starPlanetConjunctions(chartPlanets, date, orbDeg = 1) {
  if (!Array.isArray(chartPlanets)) return [];
  const stars = fixedStarsAt(date);
  const out = [];
  for (const star of stars) {
    if (!star.inZodiacalBelt) continue;
    for (const p of chartPlanets) {
      const sep = Math.min(
        Math.abs(p.lon - star.lon),
        360 - Math.abs(p.lon - star.lon)
      );
      if (sep <= orbDeg) out.push({ star: star.name, planet: p.name, sepDeg: sep });
    }
  }
  return out;
}

/**
 * Whole-sign aspects between named stars and natal planets (PART 16.3).
 * Stars outside the ±8° belt are still listed since aspectual influence is
 * allowed at any latitude.
 */
export function starPlanetWholeSignAspects(chartPlanets, date) {
  if (!Array.isArray(chartPlanets)) return [];
  const stars = fixedStarsAt(date);
  const out = [];
  for (const star of stars) {
    for (const p of chartPlanets) {
      const pSign = Math.floor(((p.lon % 360) + 360) % 360 / 30);
      const ds = Math.abs(pSign - star.signIdx);
      const signDiff = Math.min(ds, 12 - ds);
      if ([0, 2, 3, 4, 6].includes(signDiff) && signDiff !== 0) {
        out.push({ star: star.name, planet: p.name, signDiff });
      }
    }
  }
  return out;
}
