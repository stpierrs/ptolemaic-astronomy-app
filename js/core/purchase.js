// Freemium gate — tracks whether the premium content is unlocked.
//
// Free tier:   Sun, Moon, Mars (the three bodies Ptolemy described most
//              completely in the Almagest).
// Premium:     All other planets, Jupiter moons, constellation overlay,
//              parchment theme, screenshot/share.
//
// Subscription model (infrastructure only — activate by setting DEV_BYPASS
// to false and wiring purchaseSubscription() in the paywall):
//   Monthly  — $4.99 / month  (PLANS.monthly)
//   Annual   — $29.99 / year  (PLANS.annual)
//
// Legacy one-time unlock ($4.99) is still honoured for existing purchasers
// but is no longer the primary offer in the paywall UI.

const LS_KEY     = 'ptol-unlocked';   // legacy one-time purchase flag
const SUB_LS_KEY = 'ptol-sub-period'; // 'monthly' | 'annual' when subscribed

// ⚠️  TESTING MODE — set to false to re-enable the paywall for production.
const DEV_BYPASS = true;

export const FREE_BODIES = new Set(['sun', 'moon', 'mars']);
export const FREE_FOLLOW = new Set(['sun', 'moon', 'mars']);

export const PLANS = {
  monthly: { id: 'monthly', label: 'Monthly', price: '$4.99/mo',  period: 'monthly' },
  annual:  { id: 'annual',  label: 'Annual',  price: '$29.99/yr', period: 'annual'  },
};

// ── Subscription ─────────────────────────────────────────────────────────

/** Returns true if an active subscription is recorded locally. */
export function isSubscribed() {
  if (DEV_BYPASS) return true;
  return !!localStorage.getItem(SUB_LS_KEY);
}

/** Returns 'monthly' | 'annual' | null. */
export function subscriptionPeriod() {
  return localStorage.getItem(SUB_LS_KEY) || null;
}

/**
 * Persist a subscription locally and fire the unlock event.
 * @param {'monthly'|'annual'} period
 */
export function setSubscribed(period) {
  localStorage.setItem(SUB_LS_KEY, period);
  document.dispatchEvent(new CustomEvent('ptol-unlock'));
}

/** Clear subscription state (call on expiry / cancellation check). */
export function clearSubscription() {
  localStorage.removeItem(SUB_LS_KEY);
}

// ── Unlock check ─────────────────────────────────────────────────────────

/**
 * Returns true if premium content is accessible — either through an active
 * subscription or the legacy one-time purchase.
 */
export function isUnlocked() {
  if (DEV_BYPASS) return true;
  return localStorage.getItem(LS_KEY) === '1' || isSubscribed();
}

// ── Legacy one-time unlock ────────────────────────────────────────────────

/** Persist the one-time unlock and fire a DOM event so the UI can update. */
export function unlock() {
  localStorage.setItem(LS_KEY, '1');
  document.dispatchEvent(new CustomEvent('ptol-unlock'));
}

/** Dev / testing helper — force-unlock without payment. */
export function devUnlock() {
  unlock();
}

// ── Body gate ─────────────────────────────────────────────────────────────

/**
 * Returns true if the given body ID is accessible without unlocking.
 * @param {string} bodyId  e.g. 'sun', 'mars', 'jmoon:io', 'mercury'
 */
export function isBodyFree(bodyId) {
  if (isUnlocked()) return true;
  if (typeof bodyId === 'string' && bodyId.startsWith('jmoon:')) return false;
  return FREE_BODIES.has(bodyId);
}
