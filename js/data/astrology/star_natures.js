// js/data/astrology/star_natures.js
// PART 5.2 — Ptolemaic natures of astrologically significant fixed stars.
// Longitudes are J2000.0. Apply 1.396°/century precession at use time
// (see js/core/fixedStars.js#precessedLon).

export default [
  { id: 'regulus',      name: 'Regulus',      lon2000: 149.83, lat:  0.46, mag:  1.35,
    constellation: 'Leo',              bayer: 'α Leo',  nature: ['mars','jupiter'],
    royal: true,
    note: 'Heart of the Lion. Royal star; Mars-Jupiter; brings prominence and command at risk of fall on reverse.' },

  { id: 'spica',        name: 'Spica',        lon2000: 203.84, lat: -2.05, mag:  1.04,
    constellation: 'Virgo',            bayer: 'α Vir',  nature: ['venus','mercury'],
    royal: false,
    note: 'Spike of Virgo. Most benefic of fixed stars. Venus-Mercury — refinement, gifts, artistic distinction.' },

  { id: 'antares',      name: 'Antares',      lon2000: 249.77, lat: -4.34, mag:  1.06,
    constellation: 'Scorpius',         bayer: 'α Sco',  nature: ['mars','jupiter'],
    royal: true,
    note: 'Rival of Mars. Royal star; intense ambition, courage, extremity.' },

  { id: 'aldebaran',    name: 'Aldebaran',    lon2000:  69.79, lat: -5.47, mag:  0.87,
    constellation: 'Taurus',           bayer: 'α Tau',  nature: ['mars'],
    royal: true,
    note: 'Bull\'s Eye. Royal star; bold and direct force.' },

  { id: 'fomalhaut',    name: 'Fomalhaut',    lon2000: 333.86, lat:-21.13, mag:  1.16,
    constellation: 'Piscis Austrinus', bayer: 'α PsA',  nature: ['venus','mercury'],
    royal: true,
    note: 'Royal star; artistic charisma; outside ±8° band — aspectual only.' },

  { id: 'pleiades',     name: 'Pleiades',     lon2000:  60.00, lat:  4.05, mag:  1.6,
    constellation: 'Taurus',           bayer: 'M45',    nature: ['moon','mars'],
    royal: false,
    note: 'Seven Sisters. Grief, turbulence; Moon-Mars cluster.' },

  { id: 'hyades',       name: 'Hyades',       lon2000:  67.50, lat: -5.7,  mag:  3.4,
    constellation: 'Taurus',           bayer: 'Cl',     nature: ['saturn','mercury'],
    royal: false,
    note: 'Rainy Stars. Cold analytical thinking, systematic temperament.' },

  { id: 'sirius',       name: 'Sirius',       lon2000: 104.05, lat:-39.6,  mag: -1.46,
    constellation: 'Canis Major',      bayer: 'α CMa',  nature: ['jupiter','mars'],
    royal: false,
    note: 'Brightest star; conspicuous excellence; outside ±8° — aspectual only.' },

  { id: 'procyon',      name: 'Procyon',      lon2000: 115.83, lat:-16.0,  mag:  0.4,
    constellation: 'Canis Minor',      bayer: 'α CMi',  nature: ['mercury','mars'],
    royal: false,
    note: 'Little Dog Star; quick aggressive intellect; outside ±8° — aspectual only.' },

  { id: 'arcturus',     name: 'Arcturus',     lon2000: 204.10, lat: 30.7,  mag: -0.05,
    constellation: 'Boötes',           bayer: 'α Boo',  nature: ['jupiter','mars'],
    royal: false,
    note: 'Bear-Watcher. Authority earned through effort; outside ±8° — aspectual only.' },

  { id: 'vega',         name: 'Vega',         lon2000: 285.21, lat: 61.7,  mag:  0.03,
    constellation: 'Lyra',             bayer: 'α Lyr',  nature: ['venus','mercury'],
    royal: false,
    note: 'Falling Eagle; beauty and artistic refinement; outside ±8° — aspectual only.' },

  { id: 'capella',      name: 'Capella',      lon2000:  81.79, lat: 22.9,  mag:  0.08,
    constellation: 'Auriga',           bayer: 'α Aur',  nature: ['mars','mercury'],
    royal: false,
    note: 'Little Goat; bold intellectual courage.' },

  { id: 'castor',       name: 'Castor',       lon2000: 113.51, lat: 10.1,  mag:  1.6,
    constellation: 'Gemini',           bayer: 'α Gem',  nature: ['mercury'],
    royal: false,
    note: 'Heavenly Twin (immortal); intellectual brilliance.' },

  { id: 'pollux',       name: 'Pollux',       lon2000: 113.00, lat:  6.7,  mag:  1.14,
    constellation: 'Gemini',           bayer: 'β Gem',  nature: ['mars','venus'],
    royal: false,
    note: 'Heavenly Twin (mortal); bold passion and forceful desire.' },

  { id: 'algol',        name: 'Algol',        lon2000:  56.30, lat: 22.4,  mag:  2.1,
    constellation: 'Perseus',          bayer: 'β Per',  nature: ['saturn','jupiter'],
    royal: false,
    note: 'Caput Algol — Head of Medusa. Most malefic of fixed stars; sudden reversal, violence. Outside ±8° band — aspectual only.' },

  { id: 'deneb_algedi', name: 'Deneb Algedi', lon2000: 323.86, lat: -2.7,  mag:  2.9,
    constellation: 'Capricornus',      bayer: 'δ Cap',  nature: ['saturn','mercury'],
    royal: false,
    note: 'Tail of the goat-fish; saturnine intellect, justice.' },
];
