// js/data/astrology/quality_table.js
// PART 15 / Tetrabiblos I.IV–VII — sign and planet quality assignments.
// Hot / cold / moist / dry primitives. Mercury is dynamic; see
// js/core/qualities.js#planetQuality for the resolver.

export const SIGN_QUALITY = [
  { signIdx: 0,  name: 'Aries',       primary: 'hot',  secondary: 'dry',   element: 'fire'  },
  { signIdx: 1,  name: 'Taurus',      primary: 'cold', secondary: 'dry',   element: 'earth' },
  { signIdx: 2,  name: 'Gemini',      primary: 'hot',  secondary: 'moist', element: 'air'   },
  { signIdx: 3,  name: 'Cancer',      primary: 'hot',  secondary: 'moist', element: 'water' },
  { signIdx: 4,  name: 'Leo',         primary: 'hot',  secondary: 'dry',   element: 'fire'  },
  { signIdx: 5,  name: 'Virgo',       primary: 'cold', secondary: 'dry',   element: 'earth' },
  { signIdx: 6,  name: 'Libra',       primary: 'cold', secondary: 'moist', element: 'air'   },
  { signIdx: 7,  name: 'Scorpius',    primary: 'cold', secondary: 'moist', element: 'water' },
  { signIdx: 8,  name: 'Sagittarius', primary: 'hot',  secondary: 'dry',   element: 'fire'  },
  { signIdx: 9,  name: 'Capricornus', primary: 'cold', secondary: 'dry',   element: 'earth' },
  { signIdx: 10, name: 'Aquarius',    primary: 'cold', secondary: 'moist', element: 'air'   },
  { signIdx: 11, name: 'Pisces',      primary: 'cold', secondary: 'moist', element: 'water' },
];

export const PLANET_QUALITY = {
  sun:     { primary: 'hot',      secondary: 'dry-moderate', nature: 'benefic-moderate', sect: 'day'   },
  moon:    { primary: 'cold',     secondary: 'moist',         nature: 'variable',         sect: 'night' },
  mercury: { primary: 'variable', secondary: 'variable',      nature: 'mixed',            sect: 'mixed' },
  venus:   { primary: 'moist',    secondary: 'hot-moderate',  nature: 'benefic',          sect: 'night' },
  mars:    { primary: 'hot',      secondary: 'dry',           nature: 'malefic',          sect: 'night' },
  jupiter: { primary: 'hot',      secondary: 'moist',         nature: 'benefic',          sect: 'day'   },
  saturn:  { primary: 'cold',     secondary: 'dry',           nature: 'malefic',          sect: 'day'   },
};

export default { SIGN_QUALITY, PLANET_QUALITY };
