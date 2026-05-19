// Freemium gate — tracks whether the premium content is unlocked.
//
// Free tier:  Sun, Moon, Mars (the three bodies visible to the naked eye
//             that Ptolemy described most completely in the Almagest).
// Premium:    All other planets, Jupiter moons, constellation overlay,
//             parchment theme, screenshot/share.

const LS_KEY = 'ptol-unlocked';

// ⚠️  TESTING MODE — REMOVE BEFORE LAUNCH ⚠️
// Set to false to re-enable the paywall for production.
const DEV_BYPASS = true;

export const FREE_BODIES = new Set(['sun', 'moon', 'mars']);
export const FREE_FOLLOW = new Set(['sun', 'moon', 'mars']);

/** Returns true if the premium unlock is active. */
export function isUnlocked() {
  if (DEV_BYPASS) return true;   // ⚠️ TESTING — REMOVE BEFORE LAUNCH
  return localStorage.getItem(LS_KEY) === '1';
}

/** Persist the unlock and fire a DOM event so the UI can update. */
export function unlock() {
  localStorage.setItem(LS_KEY, '1');
  document.dispatchEvent(new CustomEvent('ptol-unlock'));
}

/** Dev / testing helper — force-unlock without payment. */
export function devUnlock() {
  unlock();
}

/**
 * Returns true if the given body ID is accessible without unlocking.
 * @param {string} bodyId  e.g. 'sun', 'mars', 'jmoon:io', 'mercury'
 */
export function isBodyFree(bodyId) {
  if (isUnlocked()) return true;
  if (typeof bodyId === 'string' && bodyId.startsWith('jmoon:')) return false;
  return FREE_BODIES.has(bodyId);
}
