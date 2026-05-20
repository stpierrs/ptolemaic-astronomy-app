// js/ui/astrologyOnboarding.js
// PART 19 — Multi-step birth-data input flow for the astrology section.
//
// Eight screens: welcome → name → date → time (or 'unknown') → location
// (geocode + manual fallback) → confirm → computing → done.
//
// Distinct from js/ui/onboarding.js (which is the astronomy-mode
// first-launch tutorial). Triggered by buildAstrologyApp.show() when
// the chart library is empty.

import { geocode, isGeocodingAvailable } from '../core/geocoding.js';
import { getOffsetAt, isHistoricallyAmbiguous, guessTzFromLon } from '../core/timezones.js';
import { buildNatalChart } from '../core/natalChartBuilder.js';
import { saveChart, setPrimaryChart } from '../core/chartStore.js';

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/**
 * Open the astrology onboarding modal.
 *
 * @param {{ markPrimary?: boolean }} [opts]
 * @returns {Promise<object|null>} saved record or null on cancel
 */
export function openAstrologyOnboarding({ markPrimary = true } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'pa-onb-overlay';
    overlay.innerHTML = onboardingHtml();
    document.body.appendChild(overlay);

    const data = {
      name: '', utcOffset: 0, birthTimeKnown: true,
      year: undefined, month: undefined, day: undefined,
      hour: 12, minute: 0,
      latitude: undefined, longitude: undefined,
      locationName: '', timezone: 'UTC',
    };

    const screens = overlay.querySelectorAll('.pa-onb-screen');
    function show(n) {
      screens.forEach((s, i) => s.classList.toggle('active', i === n));
    }
    show(0);

    function close(result) {
      overlay.remove();
      resolve(result);
    }

    overlay.querySelector('[data-action=cancel]').addEventListener('click', () => close(null));
    overlay.querySelector('[data-action=begin]').addEventListener('click',  () => show(1));

    overlay.querySelector('[data-action=name-next]').addEventListener('click', () => {
      data.name = overlay.querySelector('[data-field=name]').value.trim() || 'Unnamed';
      show(2);
    });

    overlay.querySelector('[data-action=date-next]').addEventListener('click', () => {
      const v = overlay.querySelector('[data-field=date]').value;
      if (!v) return;
      const [y, m, d] = v.split('-').map(Number);
      Object.assign(data, { year: y, month: m, day: d });
      const warnEl = overlay.querySelector('.pa-onb-accuracy-warn');
      if (warnEl) warnEl.hidden = !isHistoricallyAmbiguous(y);
      show(3);
    });

    overlay.querySelector('[data-action=time-unknown]').addEventListener('click', () => {
      data.hour = 12; data.minute = 0; data.birthTimeKnown = false;
      show(4);
    });
    overlay.querySelector('[data-action=time-next]').addEventListener('click', () => {
      const v = overlay.querySelector('[data-field=time]').value;
      if (!v) return;
      const [h, mi] = v.split(':').map(Number);
      data.hour = h; data.minute = mi; data.birthTimeKnown = true;
      show(4);
    });

    const locInput   = overlay.querySelector('[data-field=location]');
    const locResults = overlay.querySelector('.pa-onb-loc-results');
    let geocodeTimer = null;
    if (!isGeocodingAvailable()) {
      const notice = overlay.querySelector('.pa-onb-offline-notice');
      if (notice) notice.hidden = false;
    }
    locInput.addEventListener('input', () => {
      clearTimeout(geocodeTimer);
      const q = locInput.value.trim();
      if (q.length < 2) { locResults.innerHTML = ''; return; }
      geocodeTimer = setTimeout(async () => {
        const out = await geocode(q);
        locResults.innerHTML = out.map(r => `
          <button class="pa-onb-loc-opt"
                  data-lat="${r.latitude}" data-lon="${r.longitude}"
                  data-name="${escHtml(r.label)}">${escHtml(r.label)}</button>
        `).join('') || '<div class="pa-onb-no-results">No matches — try a different spelling, or enter coordinates manually.</div>';
      }, 400);
    });
    locResults.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.pa-onb-loc-opt');
      if (!btn) return;
      data.latitude     = parseFloat(btn.dataset.lat);
      data.longitude    = parseFloat(btn.dataset.lon);
      data.locationName = btn.dataset.name;
      data.timezone     = guessTzFromLon(data.longitude);
      locInput.value    = data.locationName;
      gotoConfirm();
    });
    overlay.querySelector('[data-action=loc-manual]').addEventListener('click', () => {
      const lat = parseFloat(overlay.querySelector('[data-field=lat]').value);
      const lon = parseFloat(overlay.querySelector('[data-field=lon]').value);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      data.latitude     = lat;
      data.longitude    = lon;
      data.locationName = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
      data.timezone     = guessTzFromLon(lon);
      gotoConfirm();
    });

    function gotoConfirm() {
      const summary = overlay.querySelector('[data-field=summary]');
      const pad = n => String(n).padStart(2, '0');
      const timeRow = data.birthTimeKnown
        ? `${pad(data.hour)}:${pad(data.minute)} (${escHtml(data.timezone)})`
        : '(unknown — using noon)';
      summary.innerHTML = `
        <div><span>Name:</span> <b>${escHtml(data.name)}</b></div>
        <div><span>Born:</span> ${data.year}-${pad(data.month)}-${pad(data.day)} ${timeRow}</div>
        <div><span>Place:</span> ${escHtml(data.locationName)}</div>
        <div><span>Coords:</span> ${data.latitude.toFixed(3)}°, ${data.longitude.toFixed(3)}°</div>
      `;
      show(5);
    }

    overlay.querySelector('[data-action=confirm]').addEventListener('click', async () => {
      show(6);
      try {
        data.utcOffset = await getOffsetAt(data.timezone || 'UTC',
          data.year, data.month, data.day, data.hour, data.minute);
        const chart = buildNatalChart(data);
        const record = {
          id: chart.id,
          birth: {
            name:              data.name,
            year:              data.year,
            month:             data.month,
            day:               data.day,
            hour:              data.hour,
            minute:            data.minute,
            utcOffset:         data.utcOffset,
            latitude:          data.latitude,
            longitude:         data.longitude,
            location_name:     data.locationName,
            timezone:          data.timezone,
            birth_time_known:  data.birthTimeKnown,
          },
          chart,
          meta: { is_primary: false, created_at: Date.now(), tags: [], notes: '' },
        };
        const saved = await saveChart(record);
        if (markPrimary && saved?.id) await setPrimaryChart(saved.id);
        show(7);
        setTimeout(() => close(saved || record), 1400);
      } catch (e) {
        console.error('[astrology-onboarding] confirm failed:', e);
        const err = overlay.querySelector('.pa-onb-error');
        if (err) { err.hidden = false; err.textContent = 'Something went wrong — see console.'; }
        show(5);
      }
    });
  });
}

function onboardingHtml() {
  return `
    <div class="pa-onb-modal" role="dialog" aria-modal="true">
      <button class="pa-onb-cancel" data-action=cancel type="button" aria-label="Cancel">✕</button>

      <div class="pa-onb-screen">
        <h2>Cast your nativity</h2>
        <p class="pa-onb-tagline">in the tradition of Ptolemy</p>
        <button class="pa-btn pa-btn-primary" data-action=begin type="button">Begin</button>
      </div>

      <div class="pa-onb-screen">
        <h3>What should we call you?</h3>
        <input class="pa-input" data-field=name placeholder="Your name" autocomplete="off">
        <button class="pa-btn pa-btn-primary" data-action=name-next type="button">Continue</button>
      </div>

      <div class="pa-onb-screen">
        <h3>When were you born?</h3>
        <input class="pa-input" type="date" data-field=date>
        <div class="pa-onb-accuracy-warn" hidden>
          Our engine is most accurate for 1620 onwards. Pre-1960 timezone
          rules may differ from modern conventions — review the resulting
          chart with this in mind.
        </div>
        <button class="pa-btn pa-btn-primary" data-action=date-next type="button">Continue</button>
      </div>

      <div class="pa-onb-screen">
        <h3>What time were you born?</h3>
        <input class="pa-input" type="time" data-field=time>
        <div class="pa-onb-row">
          <button class="pa-btn pa-btn-primary" data-action=time-next type="button">Continue</button>
          <button class="pa-btn" data-action=time-unknown type="button">I don't know</button>
        </div>
      </div>

      <div class="pa-onb-screen">
        <h3>Where were you born?</h3>
        <input class="pa-input" data-field=location placeholder="City, country" autocomplete="off">
        <div class="pa-onb-offline-notice" hidden>
          Offline — enter coordinates manually below.
        </div>
        <div class="pa-onb-loc-results"></div>
        <details class="pa-onb-manual">
          <summary>Enter coordinates manually</summary>
          <div class="pa-onb-row">
            <input class="pa-input" data-field=lat placeholder="Latitude  (e.g. 40.71)" inputmode="decimal">
            <input class="pa-input" data-field=lon placeholder="Longitude (e.g. -74.00)" inputmode="decimal">
            <button class="pa-btn" data-action=loc-manual type="button">Use these</button>
          </div>
        </details>
      </div>

      <div class="pa-onb-screen">
        <h3>Does this look right?</h3>
        <div class="pa-onb-summary" data-field=summary></div>
        <div class="pa-onb-error" hidden></div>
        <button class="pa-btn pa-btn-primary" data-action=confirm type="button">Looks right — create my chart</button>
      </div>

      <div class="pa-onb-screen">
        <h3>Computing…</h3>
        <div class="pa-onb-spinner">◐</div>
      </div>

      <div class="pa-onb-screen">
        <h3>Your chart is ready</h3>
        <p>Tap the planets, the aspects, and the houses to explore.</p>
      </div>
    </div>
  `;
}

/**
 * Trigger onboarding only if no chart exists in storage yet.
 */
export async function maybeRunAstrologyOnboarding(loadAllChartsFn) {
  try {
    const charts = await loadAllChartsFn();
    if (Array.isArray(charts) && charts.length > 0) return null;
  } catch (_) { /* still safe to onboard */ }
  return openAstrologyOnboarding({ markPrimary: true });
}
