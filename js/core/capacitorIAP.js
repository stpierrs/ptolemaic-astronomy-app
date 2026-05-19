// Capacitor In-App Purchase bridge.
//
// Distribution: iOS App Store + Google Play via Capacitor.
//
// Setup steps for the developer:
//   1. npm install @capgo/capacitor-purchases
//   2. npx cap sync
//   3. In Xcode: enable In-App Purchase capability
//   4. In Google Play Console: create subscription/one-time product
//   5. Set PRODUCT_ID below to match your store product ID
//   6. Replace the mock implementation with the real Purchases plugin import:
//      import { Purchases, LOG_LEVEL } from '@capgo/capacitor-purchases';
//
// In-browser fallback:
//   When running outside Capacitor (normal browser), purchase() immediately
//   resolves as successful so you can test the unlock flow on desktop.
//   Remove the fallback before shipping.

import { unlock } from './purchase.js';

const PRODUCT_ID = 'com.ptolemaic.pro_unlock'; // TODO: set your real product ID

function isCapacitor() {
  return (
    typeof window !== 'undefined' &&
    !!window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === 'function' &&
    window.Capacitor.isNativePlatform()
  );
}

export async function initPurchases() {
  if (!isCapacitor()) return;
  // TODO: await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  // TODO: await Purchases.configure({ apiKey: 'YOUR_REVENUECAT_API_KEY' });
  // After configure, call restorePurchases() to recover any prior purchase.
  await restorePurchases();
}

export async function purchasePro() {
  if (!isCapacitor()) {
    // Browser dev mock — always succeeds so you can test the unlock flow.
    console.log('[IAP] Browser mock: purchase succeeded');
    unlock();
    return { success: true };
  }
  try {
    // TODO: const { customerInfo } = await Purchases.purchaseStoreProduct({ product: await getProduct() });
    // TODO: if (customerInfo.entitlements.active['pro']) { unlock(); return { success: true }; }
    throw new Error(
      'Capacitor Purchases plugin not yet installed. See js/core/capacitorIAP.js for setup steps.'
    );
  } catch (err) {
    if (err && err.userCancelled) return { success: false, cancelled: true };
    throw err;
  }
}

export async function restorePurchases() {
  if (!isCapacitor()) return { restored: false };
  try {
    // TODO: const { customerInfo } = await Purchases.restorePurchases();
    // TODO: if (customerInfo.entitlements.active['pro']) { unlock(); return { restored: true }; }
    return { restored: false };
  } catch (_) {
    return { restored: false };
  }
}
