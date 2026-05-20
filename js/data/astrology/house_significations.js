// js/data/astrology/house_significations.js
// PART 17.1 / Tetrabiblos III–IV — house topics + co-significators for
// the report generator (Guide 15) and topic assessment (PART 11.5).
//
// `co_significators` may include planet names or special tokens:
//   'lot_fortune'      — the Lot of Fortune
//   'sun_male'         — Sun, applied only in male nativities
//   'venus_male'       — Venus, applied only in male nativities
//   'mars_female'      — Mars, applied only in female nativities
//   'moon_male'        — Moon, applied only in male nativities
//   'sun_female'       — Sun, applied only in female nativities
//   'saturn'           — Saturn (universal)
// etc.

export default [
  {
    house: 1,
    name: 'Life',
    greek: 'Horoscope',
    latin: 'Vita',
    meaning: 'Vitality, constitution, the native\'s vital force.',
    co_significators: [],
  },
  {
    house: 2,
    name: 'Livelihood',
    greek: 'Gate of Hades',
    latin: 'Lucrum',
    meaning: 'Wealth, possessions, substance, sources of sustenance.',
    co_significators: ['lot_fortune'],
  },
  {
    house: 3,
    name: 'Siblings',
    greek: 'Goddess',
    latin: 'Fratres',
    meaning: 'Siblings, short journeys, neighbours, early learning.',
    co_significators: ['jupiter'],
  },
  {
    house: 4,
    name: 'Parents',
    greek: 'Lower Heaven',
    latin: 'Genitor',
    meaning: 'Father, home, land, ancestry, end of life.',
    co_significators: ['sun_male', 'saturn'],
  },
  {
    house: 5,
    name: 'Children',
    greek: 'Good Fortune',
    latin: 'Nati',
    meaning: 'Offspring, pleasure, games, creative works.',
    co_significators: ['jupiter', 'venus'],
  },
  {
    house: 6,
    name: 'Sickness',
    greek: 'Bad Fortune',
    latin: 'Valetudo',
    meaning: 'Bodily afflictions, servants, daily labour, enemies within.',
    co_significators: [],
  },
  {
    house: 7,
    name: 'Marriage',
    greek: 'Descendant',
    latin: 'Uxor',
    meaning: 'Partnerships, open enemies, public contracts.',
    co_significators: ['venus_male', 'mars_female', 'moon_male', 'sun_female'],
  },
  {
    house: 8,
    name: 'Death',
    greek: 'Idle place',
    latin: 'Mors',
    meaning: 'Legacies, others\' resources, crises, manner of death.',
    co_significators: [],
  },
  {
    house: 9,
    name: 'Journeys',
    greek: 'God',
    latin: 'Iter',
    meaning: 'Long travel, philosophy, religion, foreign lands.',
    co_significators: ['mercury'],
  },
  {
    house: 10,
    name: 'Honour',
    greek: 'Midheaven',
    latin: 'Regnum',
    meaning: 'Occupation, rank, reputation, mother.',
    co_significators: ['sun', 'jupiter', 'moon', 'venus'],
  },
  {
    house: 11,
    name: 'Friends',
    greek: 'Good Spirit',
    latin: 'Benefacta',
    meaning: 'Friends, benefactors, hopes, alliances.',
    co_significators: [],
  },
  {
    house: 12,
    name: 'Hidden enemies',
    greek: 'Bad Spirit',
    latin: 'Carcer',
    meaning: 'Secret foes, exile, affliction, self-undoing.',
    co_significators: [],
  },
];
