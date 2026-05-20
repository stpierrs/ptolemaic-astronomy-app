// js/data/astrology/geographical_rulers.js
// PART 13.4 / Tetrabiblos II.3 — geographical triplicities.

export default {
  fire:  { direction: 'NW', signs: [0, 4, 8],
           ptolemaic_regions: 'Britain, Gaul, Germany, Iberia',
           modern_approx:     'Western and Northern Europe',
           rulers: ['jupiter', 'mars'] },
  earth: { direction: 'SW', signs: [1, 5, 9],
           ptolemaic_regions: 'North Africa, Italy, Egypt',
           modern_approx:     'Southern Europe, North Africa',
           rulers: ['venus', 'mercury'] },
  air:   { direction: 'NE', signs: [2, 6, 10],
           ptolemaic_regions: 'Persia, Babylonia, Greece, W. Asia',
           modern_approx:     'Eastern Europe, Middle East, West Asia',
           rulers: ['saturn', 'mercury'] },
  water: { direction: 'SE', signs: [3, 7, 11],
           ptolemaic_regions: 'Ethiopia, Arabia, India',
           modern_approx:     'East Africa, Arabia, South Asia',
           rulers: ['jupiter', 'saturn'] },
};
