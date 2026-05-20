// js/data/astrology/egyptian_terms.js
// PART 17.1 / Tetrabiblos I.XXIII–XXIV — Ptolemaic Egyptian Terms.
// Each entry: { signIdx (0=Aries..11=Pisces), startDeg, endDeg, ruler }.
// 60 entries total (12 signs × 5 terms each).
// Boundaries cross-checked against the legacy TERMS array in
// js/core/dignities.js.

export default [
  // Aries
  { signIdx: 0,  startDeg: 0,  endDeg: 6,  ruler: 'jupiter' },
  { signIdx: 0,  startDeg: 6,  endDeg: 12, ruler: 'venus'   },
  { signIdx: 0,  startDeg: 12, endDeg: 20, ruler: 'mercury' },
  { signIdx: 0,  startDeg: 20, endDeg: 25, ruler: 'mars'    },
  { signIdx: 0,  startDeg: 25, endDeg: 30, ruler: 'saturn'  },
  // Taurus
  { signIdx: 1,  startDeg: 0,  endDeg: 8,  ruler: 'venus'   },
  { signIdx: 1,  startDeg: 8,  endDeg: 14, ruler: 'mercury' },
  { signIdx: 1,  startDeg: 14, endDeg: 22, ruler: 'jupiter' },
  { signIdx: 1,  startDeg: 22, endDeg: 27, ruler: 'saturn'  },
  { signIdx: 1,  startDeg: 27, endDeg: 30, ruler: 'mars'    },
  // Gemini
  { signIdx: 2,  startDeg: 0,  endDeg: 6,  ruler: 'mercury' },
  { signIdx: 2,  startDeg: 6,  endDeg: 12, ruler: 'jupiter' },
  { signIdx: 2,  startDeg: 12, endDeg: 17, ruler: 'venus'   },
  { signIdx: 2,  startDeg: 17, endDeg: 24, ruler: 'mars'    },
  { signIdx: 2,  startDeg: 24, endDeg: 30, ruler: 'saturn'  },
  // Cancer
  { signIdx: 3,  startDeg: 0,  endDeg: 7,  ruler: 'mars'    },
  { signIdx: 3,  startDeg: 7,  endDeg: 13, ruler: 'venus'   },
  { signIdx: 3,  startDeg: 13, endDeg: 19, ruler: 'mercury' },
  { signIdx: 3,  startDeg: 19, endDeg: 26, ruler: 'jupiter' },
  { signIdx: 3,  startDeg: 26, endDeg: 30, ruler: 'saturn'  },
  // Leo
  { signIdx: 4,  startDeg: 0,  endDeg: 6,  ruler: 'jupiter' },
  { signIdx: 4,  startDeg: 6,  endDeg: 11, ruler: 'venus'   },
  { signIdx: 4,  startDeg: 11, endDeg: 18, ruler: 'saturn'  },
  { signIdx: 4,  startDeg: 18, endDeg: 24, ruler: 'mercury' },
  { signIdx: 4,  startDeg: 24, endDeg: 30, ruler: 'mars'    },
  // Virgo
  { signIdx: 5,  startDeg: 0,  endDeg: 7,  ruler: 'mercury' },
  { signIdx: 5,  startDeg: 7,  endDeg: 17, ruler: 'venus'   },
  { signIdx: 5,  startDeg: 17, endDeg: 21, ruler: 'jupiter' },
  { signIdx: 5,  startDeg: 21, endDeg: 28, ruler: 'mars'    },
  { signIdx: 5,  startDeg: 28, endDeg: 30, ruler: 'saturn'  },
  // Libra
  { signIdx: 6,  startDeg: 0,  endDeg: 6,  ruler: 'saturn'  },
  { signIdx: 6,  startDeg: 6,  endDeg: 14, ruler: 'mercury' },
  { signIdx: 6,  startDeg: 14, endDeg: 21, ruler: 'jupiter' },
  { signIdx: 6,  startDeg: 21, endDeg: 28, ruler: 'venus'   },
  { signIdx: 6,  startDeg: 28, endDeg: 30, ruler: 'mars'    },
  // Scorpius
  { signIdx: 7,  startDeg: 0,  endDeg: 7,  ruler: 'mars'    },
  { signIdx: 7,  startDeg: 7,  endDeg: 11, ruler: 'venus'   },
  { signIdx: 7,  startDeg: 11, endDeg: 19, ruler: 'mercury' },
  { signIdx: 7,  startDeg: 19, endDeg: 24, ruler: 'jupiter' },
  { signIdx: 7,  startDeg: 24, endDeg: 30, ruler: 'saturn'  },
  // Sagittarius
  { signIdx: 8,  startDeg: 0,  endDeg: 12, ruler: 'jupiter' },
  { signIdx: 8,  startDeg: 12, endDeg: 17, ruler: 'venus'   },
  { signIdx: 8,  startDeg: 17, endDeg: 21, ruler: 'mercury' },
  { signIdx: 8,  startDeg: 21, endDeg: 26, ruler: 'saturn'  },
  { signIdx: 8,  startDeg: 26, endDeg: 30, ruler: 'mars'    },
  // Capricornus
  { signIdx: 9,  startDeg: 0,  endDeg: 7,  ruler: 'mercury' },
  { signIdx: 9,  startDeg: 7,  endDeg: 14, ruler: 'jupiter' },
  { signIdx: 9,  startDeg: 14, endDeg: 22, ruler: 'venus'   },
  { signIdx: 9,  startDeg: 22, endDeg: 26, ruler: 'saturn'  },
  { signIdx: 9,  startDeg: 26, endDeg: 30, ruler: 'mars'    },
  // Aquarius
  { signIdx: 10, startDeg: 0,  endDeg: 7,  ruler: 'mercury' },
  { signIdx: 10, startDeg: 7,  endDeg: 13, ruler: 'venus'   },
  { signIdx: 10, startDeg: 13, endDeg: 20, ruler: 'jupiter' },
  { signIdx: 10, startDeg: 20, endDeg: 25, ruler: 'mars'    },
  { signIdx: 10, startDeg: 25, endDeg: 30, ruler: 'saturn'  },
  // Pisces
  { signIdx: 11, startDeg: 0,  endDeg: 12, ruler: 'venus'   },
  { signIdx: 11, startDeg: 12, endDeg: 16, ruler: 'jupiter' },
  { signIdx: 11, startDeg: 16, endDeg: 19, ruler: 'mercury' },
  { signIdx: 11, startDeg: 19, endDeg: 28, ruler: 'mars'    },
  { signIdx: 11, startDeg: 28, endDeg: 30, ruler: 'saturn'  },
];
