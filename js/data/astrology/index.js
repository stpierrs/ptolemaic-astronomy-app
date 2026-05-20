// js/data/astrology/index.js
// Single import surface for all astrology data files.

import egyptianTerms       from './egyptian_terms.js';
import faceRulers          from './face_rulers.js';
import houseSignifications from './house_significations.js';
import starNatures         from './star_natures.js';
import geographicalRulers  from './geographical_rulers.js';
import qualityTable, { SIGN_QUALITY, PLANET_QUALITY } from './quality_table.js';

export {
  egyptianTerms,
  faceRulers,
  houseSignifications,
  starNatures,
  geographicalRulers,
  qualityTable,
  SIGN_QUALITY,
  PLANET_QUALITY,
};
