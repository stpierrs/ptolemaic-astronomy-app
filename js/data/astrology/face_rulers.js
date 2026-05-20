// js/data/astrology/face_rulers.js
// PART 17.1 / Tetrabiblos I.XXVI — Faces / Decans in Chaldean order.
// Repeating sequence: mars, sun, venus, mercury, moon, saturn, jupiter
// starting at Aries 0–10°.

const CHALDEAN = ['mars','sun','venus','mercury','moon','saturn','jupiter'];

const out = [];
for (let signIdx = 0; signIdx < 12; signIdx++) {
  for (let decan = 0; decan < 3; decan++) {
    const idx = (signIdx * 3 + decan) % 7;
    out.push({
      signIdx,
      decan:    decan + 1,
      startDeg: decan * 10,
      endDeg:   decan * 10 + 10,
      ruler:    CHALDEAN[idx],
    });
  }
}
export default out;
