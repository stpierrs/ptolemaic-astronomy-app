// js/core/verdictLanguage.js
// PART 14.3 / 18 — verdict-style language helpers.
// Physical-quality verbs; no hedging.

export const VERDICT_BADGE = {
  flourishing: '✓ Flourishing',
  mixed:       '~ Mixed',
  difficulty:  '✗ Difficulty',
  neutral:     '— Neutral',
};

/**
 * Combine lord dignity, house tier, and occupancy into a verdict.
 * @param {{ lordDignityScore: number, lordHouseTier: 'angular'|'succedent'|'cadent'|null, occupantCount: number }} params
 * @returns {'flourishing'|'mixed'|'difficulty'|'neutral'}
 */
export function buildSectionVerdict({ lordDignityScore = 0, lordHouseTier = null, occupantCount = 0 }) {
  if (lordDignityScore >= 4 && lordHouseTier === 'angular') return 'flourishing';
  if (lordDignityScore >= 2 && lordHouseTier !== 'cadent')  return 'flourishing';
  if (lordDignityScore <= -3) return 'difficulty';
  if (lordDignityScore <= -1 && lordHouseTier === 'cadent') return 'difficulty';
  return 'mixed';
}

// PART 14.3 — verb table for quality-of-influence prose.
export const QUALITY_VERBS = {
  hot:   ['warms','heats','agitates','enlivens'],
  cold:  ['cools','contracts','restrains','steadies'],
  moist: ['moistens','softens','dissolves','nurtures'],
  dry:   ['dries','desiccates','sharpens','fixes'],
};

/**
 * Pick a verb describing quality A acting on quality B. Returns a single
 * verb string — caller composes the sentence.
 */
export function pickVerb(qA /* unused: qB */) {
  const verbs = QUALITY_VERBS[qA] || QUALITY_VERBS.dry;
  return verbs[0];
}
