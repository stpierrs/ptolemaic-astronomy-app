// PART 14.4 — Heliacal phenomena.
// Arcus visionis: minimum elongation from the Sun required for visibility.
export const ARCUS_VISIONIS = {
  saturn:  { rise: 11,   set: 11   },
  jupiter: { rise: 10,   set: 10   },
  mars:    { rise: 11.5, set: 14.5 },
  venus:   { rise: 5,    set: 5    },
  mercury: { rise: 11,   set: 11   },
};

/**
 * Classify a planet's heliacal phase given current elongation
 * (planet − Sun, signed degrees) and motion direction (retrograde flag).
 *
 * @param {string}  planet
 * @param {number}  elongation - signed degrees (planet ahead of Sun = positive)
 * @param {boolean} retrograde
 * @returns {{ phase: string|null, oriental: boolean }}
 */
export function heliacalPhase(planet, elongation, retrograde) {
  const arc = ARCUS_VISIONIS[planet];
  if (!arc) return { phase: null, oriental: false };
  const absE = Math.abs(elongation);
  const oriental = elongation < 0;

  if (absE <= 0.3) return { phase: 'cazimi', oriental };
  if (absE < arc.rise && oriental && !retrograde) return { phase: 'first-heliacal-rising', oriental: true };
  if (absE < arc.set  && !oriental && retrograde) return { phase: 'last-heliacal-setting', oriental: false };
  if (absE < arc.rise || absE < arc.set) return { phase: 'combust', oriental };

  if (oriental) {
    if (absE > 170) return { phase: 'acronychal-rising', oriental: true };
    return { phase: 'morning-star', oriental: true };
  } else {
    if (absE > 170) return { phase: 'acronychal-rising', oriental: false };
    return { phase: 'evening-star', oriental: false };
  }
}

export const PHASE_LABEL = {
  'cazimi':                'Cazimi (in solar heart)',
  'combust':               'Combust',
  'first-heliacal-rising': 'First heliacal rising',
  'morning-star':          'Morning star',
  'acronychal-rising':     'Acronychal rising',
  'evening-star':          'Evening star',
  'last-heliacal-setting': 'Last heliacal setting',
};

export const PHASE_GLYPH = {
  'cazimi':                '★',
  'combust':               '⊙',
  'first-heliacal-rising': '↑',
  'morning-star':          '←',
  'acronychal-rising':     '↔',
  'evening-star':          '→',
  'last-heliacal-setting': '↓',
};
