// Capacitor In-App Purchase bridge.
//
// Distribution: iOS App Store + Google Play via Capacitor.
//
// Setup steps (subscription model):
//   1. npm install @capgo/capacitor-purchases
//   2. npx cap sync
//   3. In Xcode: enable In-App Purchase capability
//   4. In App Store Connect / Google Play Console: create subscription products
//      with the IDs defined below (MONTHLY_PRODUCT_ID, ANNUAL_PRODUCT_ID)
//   5. Sign up for RevenueCat (revenuecat.com) and set YOUR_REVENUECAT_API_KEY
//   6. Replace TODO stubs with real Purchases plugin calls:
//      import { Purchases, LOG_LEVEL } from '@capgo/capacitor-purchases';
//
// In-browser fallback:
//   When running outside Capacitor (normal browser), purchases immediately
//   resolve as successful so you can test the unlock flow on desktop.
//   Remove the browser fallback before shipping.

import { unlock, setSubscribed } from './purchase.js';

// ── Product IDs ───────────────────────────────────────────────────────────

const MONTHLY_PRODUCT_ID = 'com.ptolemaic.premium_monthly'; // TODO: set real store ID
const ANNUAL_PRODUCT_ID  = 'com.ptolemaic.premium_annual';  // TODO: set real store ID
const LEGACY_PRODUCT_ID  = 'com.ptolemaic.pro_unlock';      // legacy one-time (keep for restore)

// ── Platform detection ────────────────────────────────────────────────────

function isCapacitor() {
  return (
    typeof window !== 'undefined' &&
    !!window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === 'function' &&
    window.Capacitor.isNativePlatform()
  );
}

// ── Initialisation ────────────────────────────────────────────────────────

export async function initPurchases() {
  if (!isCapacitor()) return;
  // TODO: await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  // TODO: await Purchases.configure({ apiKey: 'YOUR_REVENUECAT_API_KEY' });
  await restorePurchases();
}

// ── Subscription purchases ────────────────────────────────────────────────

/**
 * Purchase a subscription plan.
 * @param {'monthly'|'annual'} period
 * @returns {{ success: boolean, cancelled?: boolean }}
 */
export async function purchaseSubscription(period) {
  const productId = period === 'annual' ? ANNUAL_PRODUCT_ID : MONTHLY_PRODUCT_ID;
  if (!isCapacitor()) {
    console.log(`[IAP] Browser mock: subscription (${period}) succeeded`);
    setSubscribed(period);
    return { success: true };
  }
  try {
    // TODO: const { products } = await Purchases.getProducts({ productIdentifiers: [productId] });
    // TODO: const { customerInfo } = await Purchases.purchaseStoreProduct({ product: products[0] });
    // TODO: if (customerInfo.entitlements.active['premium']) {
    // TODO:   setSubscribed(period);
    // TODO:   return { success: true };
    // TODO: }
    throw new Error(
      'Capacitor Purchases plugin not yet installed. See js/core/capacitorIAP.js for setup steps.'
    );
  } catch (err) {
    if (err && err.userCancelled) return { success: false, cancelled: true };
    throw err;
  }
}

/**
 * Poll the store for current subscription status.
 * Call on app resume to catch lapsed subscriptions.
 * @returns {{ active: boolean, period?: 'monthly'|'annual' }}
 */
export async function checkSubscriptionStatus() {
  if (!isCapacitor()) return { active: false };
  try {
    // TODO: const { customerInfo } = await Purchases.getCustomerInfo();
    // TODO: const entitlement = customerInfo.entitlements.active['premium'];
    // TODO: if (entitlement) {
    // TODO:   const period = entitlement.productIdentifier === ANNUAL_PRODUCT_ID ? 'annual' : 'monthly';
    // TODO:   setSubscribed(period);
    // TODO:   return { active: true, period };
    // TODO: }
    // TODO: clearSubscription(); // subscription lapsed
    return { active: false };
  } catch (_) {
    return { active: false };
  }
}

// ── Legacy one-time purchase ──────────────────────────────────────────────

/** @deprecated Use purchaseSubscription() for new purchases. */
export async function purchasePro() {
  if (!isCapacitor()) {
    console.log('[IAP] Browser mock: one-time purchase succeeded');
    unlock();
    return { success: true };
  }
  try {
    // TODO: const { products } = await Purchases.getProducts({ productIdentifiers: [LEGACY_PRODUCT_ID] });
    // TODO: const { customerInfo } = await Purchases.purchaseStoreProduct({ product: products[0] });
    // TODO: if (customerInfo.entitlements.active['pro']) { unlock(); return { success: true }; }
    throw new Error(
      'Capacitor Purchases plugin not yet installed. See js/core/capacitorIAP.js for setup steps.'
    );
  } catch (err) {
    if (err && err.userCancelled) return { success: false, cancelled: true };
    throw err;
  }
}

// ── Restore purchases ─────────────────────────────────────────────────────

/**
 * Restore any prior purchase from the store — checks both the subscription
 * entitlement ('premium') and the legacy one-time entitlement ('pro').
 * @returns {{ restored: boolean }}
 */
export async function restorePurchases() {
  if (!isCapacitor()) return { restored: false };
  try {
    // TODO: const { customerInfo } = await Purchases.restorePurchases();
    // TODO: if (customerInfo.entitlements.active['premium']) {
    // TODO:   const id = customerInfo.entitlements.active['premium'].productIdentifier;
    // TODO:   setSubscribed(id === ANNUAL_PRODUCT_ID ? 'annual' : 'monthly');
    // TODO:   return { restored: true };
    // TODO: }
    // TODO: if (customerInfo.entitlements.active['pro']) { unlock(); return { restored: true }; }
    return { restored: false };
  } catch (_) {
    return { restored: false };
  }
}
