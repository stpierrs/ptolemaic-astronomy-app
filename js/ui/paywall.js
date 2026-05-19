// Paywall modal — shown when the user tries to access a premium feature.
//
// UI shows subscription plans (monthly / annual) as the primary offer.
// The legacy one-time unlock is retained for restore flows but not shown
// as a primary CTA. Activate by setting DEV_BYPASS = false in purchase.js.

import { unlock, setSubscribed, PLANS } from '../core/purchase.js';
import { purchaseSubscription, purchasePro, restorePurchases } from '../core/capacitorIAP.js';

let _modal = null;

/** Create the paywall modal and append it to document.body (hidden). */
export function buildPaywall() {
  if (_modal) return;

  _modal = document.createElement('div');
  _modal.id = 'paywall-modal';
  _modal.setAttribute('aria-modal', 'true');
  _modal.setAttribute('role', 'dialog');
  _modal.setAttribute('aria-label', 'Unlock Premium');

  _modal.innerHTML = `
    <div id="paywall-card">
      <div class="pw-icon">🌌</div>
      <h2 class="pw-title">Unlock the Full Cosmos</h2>
      <ul class="pw-features">
        <li><span class="pw-check">✓</span> All 7 classical planets</li>
        <li><span class="pw-check">✓</span> All 16 Jupiter moons</li>
        <li><span class="pw-check">✓</span> Constellation overlay</li>
        <li><span class="pw-check">✓</span> Parchment theme</li>
        <li><span class="pw-check">✓</span> Screenshot &amp; share</li>
      </ul>
      <div class="pw-plan-group">
        <button id="pw-annual-btn" class="pw-btn pw-plan-btn pw-plan-featured" type="button">
          <span class="pw-plan-badge">Best value — save 50%</span>
          <span class="pw-plan-label">Annual</span>
          <span class="pw-plan-price">$29.99 / year</span>
        </button>
        <button id="pw-monthly-btn" class="pw-btn pw-plan-btn" type="button">
          <span class="pw-plan-label">Monthly</span>
          <span class="pw-plan-price">$4.99 / month</span>
        </button>
      </div>
      <button id="pw-restore-btn" class="pw-btn pw-btn-secondary" type="button">Restore Purchase</button>
      <button id="pw-dismiss-btn" class="pw-btn pw-btn-ghost" type="button">Maybe later</button>
      <p id="pw-status" class="pw-status" aria-live="polite"></p>
    </div>
  `;

  document.body.appendChild(_modal);

  const statusEl   = _modal.querySelector('#pw-status');
  const annualBtn  = _modal.querySelector('#pw-annual-btn');
  const monthlyBtn = _modal.querySelector('#pw-monthly-btn');
  const restoreBtn = _modal.querySelector('#pw-restore-btn');
  const dismissBtn = _modal.querySelector('#pw-dismiss-btn');

  function setStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.style.color = isError ? '#ff8080' : '#a8d8a0';
  }

  function setBusy(busy, activeBtn) {
    annualBtn.disabled  = busy;
    monthlyBtn.disabled = busy;
    restoreBtn.disabled = busy;
    if (activeBtn && busy) activeBtn.dataset.originalText = activeBtn.querySelector('.pw-plan-price').textContent;
    if (activeBtn && busy) activeBtn.querySelector('.pw-plan-price').textContent = 'Processing…';
    if (activeBtn && !busy && activeBtn.dataset.originalText) {
      activeBtn.querySelector('.pw-plan-price').textContent = activeBtn.dataset.originalText;
    }
  }

  async function handleSubscription(period) {
    const btn = period === 'annual' ? annualBtn : monthlyBtn;
    setBusy(true, btn);
    setStatus('');
    try {
      const result = await purchaseSubscription(period);
      if (result && result.success) {
        setSubscribed(period);
        setStatus(`Subscribed! Thank you.`);
        setTimeout(() => hidePaywall(), 1200);
      } else if (result && result.cancelled) {
        setStatus('Purchase cancelled.');
      } else {
        setStatus('Purchase not completed.', true);
      }
    } catch (err) {
      console.error('[Paywall] subscription error:', err);
      setStatus(err && err.message ? err.message : 'Purchase failed.', true);
    } finally {
      setBusy(false, btn);
    }
  }

  annualBtn.addEventListener('click',  () => handleSubscription('annual'));
  monthlyBtn.addEventListener('click', () => handleSubscription('monthly'));

  restoreBtn.addEventListener('click', async () => {
    restoreBtn.disabled = true;
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
      restoreBtn.disabled = false;
    }
  });

  dismissBtn.addEventListener('click', hidePaywall);

  _modal.addEventListener('click', (e) => {
    if (e.target === _modal) hidePaywall();
  });

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
