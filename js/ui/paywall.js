// Paywall modal — shown when the user tries to access a premium feature.
//
// The modal is created once on buildPaywall() and shown/hidden via showPaywall()
// / hidePaywall(). Purchase and restore delegate to the Capacitor IAP bridge.

import { unlock } from '../core/purchase.js';
import { purchasePro, restorePurchases } from '../core/capacitorIAP.js';

let _modal = null;

/** Create the paywall modal and append it to document.body (hidden). */
export function buildPaywall() {
  if (_modal) return; // already built

  _modal = document.createElement('div');
  _modal.id = 'paywall-modal';
  _modal.setAttribute('aria-modal', 'true');
  _modal.setAttribute('role', 'dialog');
  _modal.setAttribute('aria-label', 'Go Premium');

  _modal.innerHTML = `
    <div id="paywall-card">
      <div class="pw-icon">🌌</div>
      <h2 class="pw-title">Go Premium</h2>
      <p class="pw-subtitle">Unlock the full cosmos</p>
      <ul class="pw-features">
        <li><span class="pw-check">✓</span> All 8 classical planets</li>
        <li><span class="pw-check">✓</span> All 16 Jupiter moons</li>
        <li><span class="pw-check">✓</span> Constellation overlay</li>
        <li><span class="pw-check">✓</span> Parchment theme</li>
        <li><span class="pw-check">✓</span> Screenshot &amp; share</li>
        <li><span class="pw-check">✓</span> Future updates forever</li>
      </ul>
      <button id="pw-unlock-btn" class="pw-btn pw-btn-primary" type="button">Unlock — $4.99</button>
      <button id="pw-restore-btn" class="pw-btn pw-btn-secondary" type="button">Restore Purchase</button>
      <button id="pw-dismiss-btn" class="pw-btn pw-btn-ghost" type="button">Maybe later</button>
      <p id="pw-status" class="pw-status" aria-live="polite"></p>
    </div>
  `;

  document.body.appendChild(_modal);

  const statusEl = _modal.querySelector('#pw-status');
  const unlockBtn = _modal.querySelector('#pw-unlock-btn');
  const restoreBtn = _modal.querySelector('#pw-restore-btn');
  const dismissBtn = _modal.querySelector('#pw-dismiss-btn');

  function setStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.style.color = isError ? '#ff8080' : '#a8d8a0';
  }

  function setBusy(busy) {
    unlockBtn.disabled = busy;
    restoreBtn.disabled = busy;
    unlockBtn.textContent = busy ? 'Processing…' : 'Unlock — $4.99';
  }

  unlockBtn.addEventListener('click', async () => {
    setBusy(true);
    setStatus('');
    try {
      const result = await purchasePro();
      if (result && result.success) {
        unlock();
        setStatus('Unlocked! Thank you.');
        setTimeout(() => hidePaywall(), 1200);
      } else if (result && result.cancelled) {
        setStatus('Purchase cancelled.', false);
      } else {
        setStatus('Purchase not completed.', true);
      }
    } catch (err) {
      console.error('[Paywall] purchase error:', err);
      setStatus(err && err.message ? err.message : 'Purchase failed.', true);
    } finally {
      setBusy(false);
    }
  });

  restoreBtn.addEventListener('click', async () => {
    setBusy(true);
    setStatus('Restoring…');
    try {
      const result = await restorePurchases();
      if (result && result.restored) {
        setStatus('Purchase restored!');
        setTimeout(() => hidePaywall(), 1200);
      } else {
        setStatus('No prior purchase found.', false);
      }
    } catch (err) {
      console.error('[Paywall] restore error:', err);
      setStatus('Restore failed.', true);
    } finally {
      setBusy(false);
    }
  });

  dismissBtn.addEventListener('click', hidePaywall);

  // Close on backdrop click
  _modal.addEventListener('click', (e) => {
    if (e.target === _modal) hidePaywall();
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && _modal && !_modal.hidden) hidePaywall();
  });

  _modal.hidden = true;
}

/** Show the paywall modal. Calls buildPaywall() if not yet created. */
export function showPaywall() {
  if (!_modal) buildPaywall();
  _modal.hidden = false;
  requestAnimationFrame(() => _modal.classList.add('open'));
}

/** Hide the paywall modal. */
export function hidePaywall() {
  if (!_modal) return;
  _modal.classList.remove('open');
  setTimeout(() => { if (_modal) _modal.hidden = true; }, 300);
}
