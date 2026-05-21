// App bootstrap — wires everything together for the Ptolemaic geocentric model.

import { FeModel } from './core/app.js';
import { Renderer } from './render/index.js';
import { attachMouseHandler } from './ui/mouseHandler.js';
import { attachKeyboardHandler } from './ui/keyboardHandler.js';
import { buildControlPanel, buildHud, buildTrackerHud } from './ui/controlPanel.js';
import { buildTrackingInfoPopup } from './ui/trackingInfoPopup.js';
import { Demos } from './demos/index.js';
import { attachUrlState } from './ui/urlState.js';
import { setActiveProjection } from './core/canonical.js';
import { t, onLangChange, isRtl } from './ui/i18n.js';
import { EpicycleOverlay } from './render/epicycleOverlay.js';
import { buildInfoPanels }  from './ui/infoPanels.js';
import { buildShareButton }  from './ui/shareExport.js';
import { buildStelTimeBar }  from './ui/stelTimeBar.js';
import { maybeShowOnboarding, resetOnboarding } from './ui/onboarding.js';
import { initFpMode } from './ui/fpMode.js';
import { initFpGround } from './ui/fpGroundScene.js';

import { buildBodyInfoCard } from './ui/bodyInfoCard.js';
import { buildPaywall, showPaywall } from './ui/paywall.js';
import { isBodyFree, isUnlocked } from './core/purchase.js';
import { initPurchases } from './core/capacitorIAP.js';
// import { buildNatalChartModal } from './ui/natalChart.js'; // replaced by astrologyApp
import { buildAstrologyApp } from './ui/astrologyApp.js';
import { buildArOverlay } from './ui/arOverlay.js';
import { buildPlanetaryHoursWidget } from './ui/planetaryHoursWidget.js';

const model = new FeModel();
const canvas = document.getElementById('feCanvas');

// ── Cross-mode time sync (broker for ⊕ / ⊚ / observation / explained) ────
const TIME_BROKER = (() => {
  const JD_2017_01_01 = 2457754.5;
  const iframes = [];   // [{ win, id }]
  function currentJD() { return JD_2017_01_01 + (model.state.DateTime || 0); }
  function publishFromState(except) {
    const jd = currentJD();
    iframes.forEach(({ win, id }) => {
      if (id === except) return;
      try { win.postMessage({ type: 'ptol-time', jd, source: 'parent' }, '*'); }
      catch (_) { /* iframe not ready, ignore */ }
    });
  }
  function register(win, id) {
    iframes.push({ win, id });
    const send = (tries) => {
      try {
        win.postMessage({ type: 'ptol-time', jd: currentJD(), source: 'parent' }, '*');
      } catch (_) {
        if (tries > 0) setTimeout(() => send(tries - 1), 100);
      }
    };
    setTimeout(() => send(10), 50);
  }
  window.addEventListener('message', (ev) => {
    const m = ev.data;
    if (!m || m.type !== 'ptol-time' || typeof m.jd !== 'number') return;
    if (m.source === 'parent') return;
    const newDt = m.jd - JD_2017_01_01;
    if (Math.abs(newDt - (model.state.DateTime || 0)) < 1e-9) return;
    model.setState({ DateTime: newDt });
    // Re-broadcast to other iframes (model emits 'update' but we explicitly
    // skip the originator here to avoid sending back the same value).
    publishFromState(m.source);
  });
  model.addEventListener('update', () => {
    // Only re-broadcast if the time actually moved since the last broadcast.
    const jd = currentJD();
    if (TIME_BROKER._lastBroadcastJD === jd) return;
    TIME_BROKER._lastBroadcastJD = jd;
    iframes.forEach(({ win }) => {
      try { win.postMessage({ type: 'ptol-time', jd, source: 'parent' }, '*'); }
      catch (_) {}
    });
  });
  return { register, publishFromState };
})();

// ── Feature AS-4: Loading Progress Bar ───────────────────────────────────
const loadBar = document.getElementById('load-bar-fill');
function setLoadProgress(pct) {
  if (loadBar) loadBar.style.width = `${pct}%`;
  if (pct >= 100 && loadBar) {
    setTimeout(() => { if (loadBar.parentElement) loadBar.parentElement.style.display = 'none'; }, 500);
  }
}
setLoadProgress(20); // JS loaded

// Build the UI first — controls stay visible even if WebGL fails.
const demos = new Demos(model);
const viewEl_panel = document.getElementById('view');
buildControlPanel(viewEl_panel, model, demos);
initFpGround(model);
initFpMode(model);
const hudEl = document.getElementById('hud');
buildHud(hudEl, model);
const trackerHudEl = document.getElementById('tracker-hud');
if (trackerHudEl) buildTrackerHud(trackerHudEl, model);
const trackingInfoEl = document.getElementById('tracking-info-popup');
if (trackingInfoEl) buildTrackingInfoPopup(trackingInfoEl, model);

// First load only — pick the browser's language if nothing is in the URL hash yet.
const _hashHasLang = window.location.hash.includes('Language=');
if (!_hashHasLang) {
  const SUPPORTED = new Set(['en','cs','es','fr','de','it','pt','pl','nl','sk','ru','ar','he','zh','ja','ko','th','hi']);
  const prefs = (navigator.languages && navigator.languages.length)
    ? navigator.languages
    : [navigator.language || 'en'];
  for (const p of prefs) {
    const id = (p || '').toLowerCase().split('-')[0];
    if (SUPPORTED.has(id)) {
      model.setState({ Language: id });
      break;
    }
  }
}

// Keep the grid projection consistent with whatever map the user picked.
// Dual-pole mode always uses the dp grid. Otherwise, if the selected
// projection has useProjectionGrid: true, the grid follows it so the
// disc, observer, sun/moon ground points, and graticule all line up.
// Registered before the Renderer so the grid rebuilds first.
import { getProjection } from './core/projections.js';
const refreshActiveProjection = () => {
  if (model.state.WorldModel === 'dp') {
    setActiveProjection('dp');
    return;
  }
  const id = model.state.MapProjection;
  const proj = id ? getProjection(id) : null;
  setActiveProjection((proj && proj.useProjectionGrid) ? id : null);
};
model.addEventListener('update', refreshActiveProjection);
refreshActiveProjection();

let renderer = null;
try {
  renderer = new Renderer(canvas, model);
  setLoadProgress(60); // renderer initialised
  renderer.loadLand().then(() => {
    setLoadProgress(100);
  }).catch((err) => {
    console.warn('Failed to load land data:', err);
    setLoadProgress(100); // hide bar even on error
  });
  attachMouseHandler(canvas, model, renderer);
  attachKeyboardHandler(model, {
    onResetOnboarding: () => { resetOnboarding(); maybeShowOnboarding(); },
  });
} catch (err) {
  console.error('WebGL unavailable — 3D view disabled:', err);
  const warn = document.createElement('div');
  warn.style.cssText = 'position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#fff; padding:24px; text-align:center;';
  warn.textContent = 'WebGL could not be initialised. The controls still work; the 3D view is disabled.';
  canvas.parentElement.appendChild(warn);
}

try {
  model.update();
  model.dispatchEvent(new CustomEvent('update'));
} catch (err) {
  // Catch first-paint errors — controls still show, status line reports it.
  console.error('First-frame update() threw:', err);
  const _desc = document.querySelector('#desc .desc-dynamic');
  if (_desc) {
    _desc.style.color = '#ff6b6b';
    _desc.textContent =
      'First-frame error: ' + (err && err.message ? err.message : String(err))
      + '  (open DevTools \u2192 Console for the full stack)';
  }
}

const descDynamicEl = document.querySelector('#desc .desc-dynamic');

// Status line — where is the sun and what does that mean for the observer.
function defaultStatus(s, c) {
  const lat = s.ObserverLat;
  const dec = (c.SunDec || 0) * 180 / Math.PI;
  const elev = c.SunAnglesGlobe ? c.SunAnglesGlobe.elevation : 0;
  const latStr = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`;

  let sun;
  if (elev > 0)        sun = `${t('within_vault')} — ${t('daylight')}`;
  else if (elev > -6)  sun = `${t('beyond_vault')} — ${t('twilight_civil')}`;
  else if (elev > -12) sun = `${t('beyond_vault')} — ${t('twilight_nautical')}`;
  else if (elev > -18) sun = `${t('beyond_vault')} — ${t('twilight_astronomical')}`;
  else                 sun = `${t('beyond_vault')} — ${t('night')}`;

  if (Math.abs(lat + dec) > 90) return `${latStr} — ${sun} ${t('sun_never_leaves')}.`;
  if (Math.abs(lat - dec) > 90) return `${latStr} — ${sun} ${t('sun_never_enters')}.`;
  return `${latStr} — ${sun}.`;
}

model.addEventListener('update', () => {
  descDynamicEl.textContent =
    model.state.Description || defaultStatus(model.state, model.computed);
});

// Snap camera on Optical mode entry so 45° elevation sits near viewport top.
const OPTICAL_ENTRY_ZOOM  = 1.0;
const OPTICAL_ENTRY_PITCH = 7.5;
// Leaving Optical while tracking — snap to bird's-eye so the disc is
// visible with the tracked body's ground point near center.
const HEAVENLY_TRACK_PITCH = 80.3;
const HEAVENLY_TRACK_DIST  = 10;
const HEAVENLY_TRACK_ZOOM  = 4.67;
let _prevInsideVault = !!model.state.InsideVault;
model.addEventListener('update', () => {
  const now = !!model.state.InsideVault;
  // Update the flag BEFORE any setState below — those calls re-fire this
  // listener synchronously, and if _prevInsideVault is still stale the
  // branch fires again and recurses until the stack blows.
  if (now === _prevInsideVault) return;
  _prevInsideVault = now;
  if (now) {
    if (model.state.FollowTarget) {
      // Tracking while entering Optical — keep zoom, skip pitch snap.
      // mouseHandler re-aims at the target on the next tick.
      model.setState({
        OpticalZoom: OPTICAL_ENTRY_ZOOM,
        FreeCamActive: false,
      });
    } else {
      model.setState({
        OpticalZoom:  OPTICAL_ENTRY_ZOOM,
        CameraHeight: OPTICAL_ENTRY_PITCH,
      });
    }
  } else if (model.state.FollowTarget) {
    model.setState({
      CameraHeight:   HEAVENLY_TRACK_PITCH,
      CameraDistance: HEAVENLY_TRACK_DIST,
      Zoom:           HEAVENLY_TRACK_ZOOM,
      FreeCamActive:  true,
    });
  }
});

// Cadence chip — step size, FOV, and heading when in Optical mode.
// When you're looking up at the dome you need to know where you're pointed.
const cadenceChip = document.createElement('div');
cadenceChip.id = 'cadence-chip';
cadenceChip.style.cssText = `
  position: absolute;
  top: 8px;
  right: 12px;
  pointer-events: none;
  font: 12px/1.4 ui-monospace, Menlo, monospace;
  color: #f4a640;
  background: rgba(10, 14, 22, 0.78);
  border: 1px solid rgba(244, 166, 64, 0.4);
  border-radius: 6px;
  padding: 4px 10px;
  z-index: 10;
  display: none;
  zoom: var(--ui-zoom);
`;
const viewEl = document.getElementById('view');
if (viewEl) viewEl.appendChild(cadenceChip);

// Must stay in sync with refinedAzCadenceForFov (worldObjects.js)
// and opticalCadenceStepDeg (mouseHandler.js).
function activeCadenceLabel(fovDeg) {
  if (fovDeg >= 30) return '15°';
  if (fovDeg >= 8)  return '5°';
  return '1°';
}

model.addEventListener('update', () => {
  if (!cadenceChip) return;
  const s = model.state;
  if (!s.InsideVault) {
    cadenceChip.style.display = 'none';
    return;
  }
  const zoom = Math.max(0.2, s.OpticalZoom || 5.09);
  const fov  = Math.max(1, Math.min(75, 75 / zoom));
  const heading = ((s.ObserverHeading || 0) % 360 + 360) % 360;
  cadenceChip.textContent =
    `Step: ${activeCadenceLabel(fov)}  ·  FOV ${fov.toFixed(1)}°  ·  `
    + `Facing ${heading.toFixed(1)}°`;
  cadenceChip.style.display = '';
});


const aboutBtn    = document.getElementById('about-btn');
const aboutPopup  = document.getElementById('about-popup');
const legendBtn   = document.getElementById('legend-btn');
const legendPopup = document.getElementById('legend-popup');
const infoBoxBtns = [aboutBtn, legendBtn].filter(Boolean);
const infoBoxPopups = [aboutPopup, legendPopup].filter(Boolean);

function openInfoPopup(popup) {
  for (const p of infoBoxPopups) p.hidden = (p !== popup) ? true : !p.hidden;
}

if (aboutBtn && aboutPopup) {
  aboutBtn.addEventListener('click', (e) => { e.stopPropagation(); openInfoPopup(aboutPopup); });
}
if (legendBtn && legendPopup) {
  // Try the translated about_<lang>.md first, fall back to English.
  let legendLoadedLang = null;
  let legendLoading = null;
  const loadLegend = async () => {
    const lang = model.state.Language || 'en';
    if (legendLoadedLang === lang) return;
    if (legendLoading) await legendLoading;
    legendLoading = (async () => {
      let md = null;
      if (lang !== 'en') {
        try {
          const res = await fetch(`about_${lang}.md`);
          if (res.ok) md = await res.text();
        } catch (_) {}
      }
      if (md == null) {
        try {
          const res = await fetch('about.md');
          if (res.ok) md = await res.text();
        } catch (_) {}
      }
      if (md != null) {
        legendPopup.innerHTML = renderMarkdown(md);
        legendLoadedLang = lang;
      } else {
        legendPopup.textContent = 'Legend unavailable.';
      }
    })();
    await legendLoading;
    legendLoading = null;
  };
  legendBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await loadLegend();
    openInfoPopup(legendPopup);
  });
  // Language changed — bust the cache so the next open pulls fresh content.
  onLangChange(() => {
    legendLoadedLang = null;
    if (!legendPopup.hidden) loadLegend();
  });
}
document.addEventListener('click', (e) => {
  for (const popup of infoBoxPopups) {
    if (popup.hidden) continue;
    if (popup.contains(e.target)) continue;
    if (infoBoxBtns.some((b) => b && b.contains(e.target))) continue;
    popup.hidden = true;
  }
});

// Minimal markdown renderer for the Legend popup — headings, paragraphs,
// bullet lists, GFM tables, code spans, bold, italic. Nothing more needed.
function renderMarkdown(src) {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;
  const inline = (s) => s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/&lt;kbd&gt;([^&]+)&lt;\/kbd&gt;/g, '<kbd>$1</kbd>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  while (i < lines.length) {
    const ln = lines[i];
    if (/^---+\s*$/.test(ln)) { out.push('<hr>'); i++; continue; }
    const h = ln.match(/^(#{1,6})\s+(.*)$/);
    if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (ln.startsWith('| ')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) { rows.push(lines[i]); i++; }
      if (rows.length >= 2) {
        const split = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        const headers = split(rows[0]);
        const body = rows.slice(2).map(split);
        out.push('<table>');
        out.push('<thead><tr>' + headers.map((h) => `<th>${inline(h)}</th>`).join('') + '</tr></thead>');
        out.push('<tbody>' + body.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody>');
        out.push('</table>');
        continue;
      }
    }
    if (/^[-*]\s+/.test(ln)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^[-*]\s+/, ''))}</li>`);
        i++;
      }
      out.push('<ul>' + items.join('') + '</ul>');
      continue;
    }
    if (ln.trim() === '') { i++; continue; }
    const p = [ln];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#|---|\||[-*]\s)/.test(lines[i])) {
      p.push(lines[i]); i++;
    }
    out.push(`<p>${inline(p.join(' '))}</p>`);
  }
  return out.join('\n');
}

// Translate all data-i18n nodes in the DOM — About popup text and so on.
function refreshI18nNodes() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const k = el.getAttribute('data-i18n');
    el.textContent = t(k);
  });
}
onLangChange(refreshI18nNodes);
refreshI18nNodes();

attachUrlState(model, demos);

// ── Feature AS-9: Freemium gate ──────────────────────────────────────────
buildPaywall();
model.addEventListener('update', () => {
  const ft = model.state.FollowTarget;
  if (ft && !isBodyFree(ft) && !isUnlocked()) {
    model.setState({ FollowTarget: null });
    showPaywall();
  }
});

// Listen for unlock event to refresh UI if needed
document.addEventListener('ptol-unlock', () => {
  // Re-dispatch an update so any gated UI re-evaluates
  try { model.dispatchEvent(new CustomEvent('update')); } catch (_) {}
});

// ── Feature AS-5: Body Info Card ────────────────────────────────────────
buildBodyInfoCard(model);

// ── Feature AS-6: Tracker Search / Filter ───────────────────────────────
requestAnimationFrame(() => {
  // Find the tracker button grid — buttons have class 'tracker-btn'
  const trackerBtns = document.querySelectorAll('.tracker-btn');
  if (trackerBtns.length === 0) return;

  // Find the nearest common scrollable ancestor to prepend the search box to.
  // The tracker buttons live inside tab-panel sections; we insert the search
  // box before the first group heading or before the first button grid wrapper.
  // To keep it simple, insert at the top of the first .tab-panel that contains
  // tracker buttons — or just before the first .button-grid-row.
  const firstBtn = trackerBtns[0];
  // Walk up to find .tab-panel or the nearest .panel-content / section wrapper
  let insertTarget = null;
  let node = firstBtn.parentElement;
  while (node && node !== document.body) {
    if (
      node.classList.contains('tab-panel') ||
      node.classList.contains('tab-content') ||
      node.getAttribute('data-tab') === 'Tracker'
    ) {
      insertTarget = node;
      break;
    }
    node = node.parentElement;
  }

  // Fallback: find the panel section that contains the first tracker-btn
  if (!insertTarget) {
    node = firstBtn;
    while (node && node !== document.body) {
      if (node.classList.contains('section') || node.tagName === 'SECTION') {
        insertTarget = node.parentElement || node;
        break;
      }
      node = node.parentElement;
    }
  }

  if (!insertTarget) return;

  const wrap = document.createElement('div');
  wrap.id = 'tracker-search-wrap';

  const searchInput = document.createElement('input');
  searchInput.id = 'tracker-search';
  searchInput.type = 'search';
  searchInput.placeholder = 'Filter bodies…';
  searchInput.autocomplete = 'off';
  searchInput.spellcheck = false;

  wrap.appendChild(searchInput);
  insertTarget.insertBefore(wrap, insertTarget.firstChild);

  searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim().toLowerCase();
    const allBtns = document.querySelectorAll('.tracker-btn');
    for (const btn of allBtns) {
      const label = btn.textContent.toLowerCase();
      const row = btn.closest('.button-grid-row') || btn.closest('.row');
      if (!term) {
        btn.style.display = '';
        if (row) row.style.display = '';
      } else {
        const visible = label.includes(term);
        btn.style.display = visible ? '' : 'none';
      }
    }

    // Hide entire button-grid-row sections if all their buttons are hidden
    if (term) {
      const rows = document.querySelectorAll('.button-grid-row');
      for (const row of rows) {
        const rowBtns = row.querySelectorAll('.tracker-btn');
        const anyVisible = [...rowBtns].some((b) => b.style.display !== 'none');
        row.style.display = anyVisible ? '' : 'none';
      }
    } else {
      // Restore all rows
      for (const row of document.querySelectorAll('.button-grid-row')) {
        row.style.display = '';
      }
    }
  });
});

const _epicycleOverlay = new EpicycleOverlay(model);

const viewForPanels = document.getElementById('view');
if (viewForPanels) buildInfoPanels(viewForPanels);

// Legacy 'meeus-warning' DOM element — markup may still carry it.
// Hide it on boot; the surrounding banner code is gone.
const _legacyBanner = document.getElementById('meeus-warning');
if (_legacyBanner) _legacyBanner.hidden = true;

// Keep the app title and subtitle translated as language changes.
const _titleEl = document.getElementById('app-title');
const _subEl   = document.getElementById('app-subtitle');
const refreshTitle = () => {
  if (_titleEl) _titleEl.textContent = t('app_title');
  if (_subEl)   _subEl.textContent   = t('app_subtitle');
  document.documentElement.setAttribute('dir', isRtl() ? 'rtl' : 'ltr');
};
onLangChange(refreshTitle);
refreshTitle();

window.model = model;
window.renderer = renderer;
window.demos = demos;

// ── Feature 8: Theme Dropdown ─────────────────────────────────────────────
// Replaces the old 🌙 / 📜 toggle with a five-palette dropdown picker:
// Codex Vesper (free default), Parchment Scholastica, Marble Olympus,
// Lapis Auream, Nyx Astera (last four premium → showPaywall() on
// selection when !isUnlocked()).
//
// Why a one-time legacy-key migration: returning users carry the old
// 'ptol-theme' = 'parchment' in localStorage from the dark/parchment-only
// era. Dropping that lands them on the new free default cleanly without
// silently flipping them onto the premium Parchment Scholastica palette.
(async function () {
  const { THEMES, setTheme, listThemes } = await import('./ui/themes/themes.js');

  const STORAGE_KEY   = 'ptol-theme-v2';
  const LEGACY_KEY    = 'ptol-theme';
  const DEFAULT_THEME = 'codex-vesper';
  const FREE_THEMES   = new Set(['codex-vesper']);
  const themeColorMeta = document.getElementById('theme-color-meta');

  if (localStorage.getItem(LEGACY_KEY) !== null) {
    localStorage.removeItem(LEGACY_KEY);
  }

  function applyTheme(name) {
    if (!THEMES[name]) name = DEFAULT_THEME;
    setTheme(name);
    if (themeColorMeta) themeColorMeta.content = THEMES[name].color.bg;
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  applyTheme(stored && THEMES[stored] ? stored : DEFAULT_THEME);

  const headerEl = document.querySelector('header');
  const infoBox  = headerEl && headerEl.querySelector('.info-box');
  if (!headerEl || !infoBox) return;

  const wrap = document.createElement('div');
  wrap.className = 'theme-picker';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'info-btn header-action-btn theme-picker-btn';
  btn.title = 'Choose theme';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '🎨';

  const popup = document.createElement('div');
  popup.className = 'theme-picker-popup';
  popup.setAttribute('role', 'listbox');
  popup.hidden = true;

  function renderPopup() {
    popup.innerHTML = '';
    const current = document.documentElement.dataset.theme || DEFAULT_THEME;
    listThemes().forEach((name) => {
      const t       = THEMES[name];
      const isFree  = FREE_THEMES.has(name);
      const locked  = !isFree && !isUnlocked();
      const active  = name === current;

      const row = document.createElement('button');
      row.type  = 'button';
      row.className = 'theme-picker-row' + (active ? ' active' : '');
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', active ? 'true' : 'false');
      row.dataset.theme = name;

      const sw = document.createElement('span');
      sw.className = 'theme-picker-swatch';
      sw.style.background =
        `linear-gradient(135deg, ${t.color.bg} 0% 33%, ${t.color.surface} 33% 66%, ${t.color.accent} 66% 100%)`;
      sw.style.border = `1px solid ${t.color.ornament}`;

      const label = document.createElement('span');
      label.className = 'theme-picker-label';
      label.textContent = t.label;

      const sub = document.createElement('span');
      sub.className = 'theme-picker-sub';
      sub.textContent = t.subtitle;

      const badge = document.createElement('span');
      badge.className = 'theme-picker-badge';
      badge.textContent = active ? '✓' : (locked ? '🔒' : '');

      row.append(sw, label, sub, badge);
      row.addEventListener('click', () => {
        if (locked) { showPaywall(); return; }
        applyTheme(name);
        localStorage.setItem(STORAGE_KEY, name);
        renderPopup();
        closePopup();
      });
      popup.appendChild(row);
    });
  }

  function openPopup()  {
    renderPopup();
    popup.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', onDocClick, true);
    document.addEventListener('keydown', onKey, true);
  }
  function closePopup() {
    popup.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onDocClick, true);
    document.removeEventListener('keydown', onKey, true);
  }
  function onDocClick(e) { if (!wrap.contains(e.target)) closePopup(); }
  function onKey(e)      { if (e.key === 'Escape') closePopup(); }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    popup.hidden ? openPopup() : closePopup();
  });

  wrap.append(btn, popup);
  headerEl.insertBefore(wrap, infoBox);
})();

// ── Ptolemaic Epicycle Ephemeris (Ibn al-Shatir) ────────────────────────────
{
  // Fullscreen iframe overlay — self-contained HTML, no CSS/JS conflict
  const overlay = document.createElement('div');
  overlay.id = 'ias-overlay';
  Object.assign(overlay.style, {
    position:'fixed', inset:'0', zIndex:'8500', display:'none',
    flexDirection:'column', background:'#080a12',
  });

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.title = 'Close Ephemeris';
  closeBtn.innerHTML = '✕ Close';
  Object.assign(closeBtn.style, {
    position:'absolute', top:'10px', right:'14px', zIndex:'8501',
    fontFamily:"'Cinzel',serif", fontSize:'0.72rem', letterSpacing:'0.15em',
    background:'rgba(10,12,16,0.85)', border:'1px solid #c8960a',
    color:'#c8960a', padding:'5px 14px', borderRadius:'3px',
    cursor:'pointer', textTransform:'uppercase',
  });
  closeBtn.onmouseenter = () => { closeBtn.style.background='#c8960a'; closeBtn.style.color='#080a12'; };
  closeBtn.onmouseleave = () => { closeBtn.style.background='rgba(10,12,16,0.85)'; closeBtn.style.color='#c8960a'; };

  const iframe = document.createElement('iframe');
  iframe.src = './ibn-alshatir.html';
  iframe.title = 'Ibn al-Shatir Ptolemaic Epicycle Ephemeris';
  Object.assign(iframe.style, { width:'100%', height:'100%', border:'none', display:'block' });

  overlay.appendChild(closeBtn);
  overlay.appendChild(iframe);
  document.body.appendChild(overlay);
  iframe.addEventListener('load', () => {
    TIME_BROKER.register(iframe.contentWindow, 'ephemeris');
  });

  closeBtn.addEventListener('click', () => { overlay.style.display = 'none'; });
  // Esc key also closes
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display !== 'none') overlay.style.display = 'none';
  });

  const headerEl = document.querySelector('header');
  if (headerEl) {
    const btn = document.createElement('button');
    btn.className = 'info-btn header-action-btn';
    btn.type = 'button';
    btn.title = 'Ptolemaic Epicycle Ephemeris';
    btn.textContent = '⊕';
    btn.addEventListener('click', () => { overlay.style.display = 'flex'; });
    // Insert between dark-mode button and astrology button
    const astrologyBtn = headerEl.querySelector('[title="Ptolemaic Astrology"]');
    const infoBox = headerEl.querySelector('.info-box');
    if (astrologyBtn) headerEl.insertBefore(btn, astrologyBtn);
    else if (infoBox) headerEl.insertBefore(btn, infoBox);
  }
}

// ── Ephemeris Reference (Ibn al-Shatir Complete Reference) ──────────────────
{
  const overlay = document.createElement('div');
  overlay.id = 'iar-overlay';
  Object.assign(overlay.style, {
    position:'fixed', inset:'0', zIndex:'8500', display:'none',
    flexDirection:'column', background:'#080a12',
  });

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ Close';
  Object.assign(closeBtn.style, {
    alignSelf:'flex-end', margin:'0.5rem 1rem', padding:'0.4rem 1.2rem',
    background:'rgba(10,12,16,0.85)', color:'#c8960a',
    border:'1px solid #c8960a', borderRadius:'4px',
    fontFamily:'Cinzel,serif', fontSize:'0.85rem',
    cursor:'pointer', zIndex:'1', flexShrink:'0',
  });
  closeBtn.onmouseenter = () => { closeBtn.style.background='#c8960a'; closeBtn.style.color='#08090e'; };
  closeBtn.onmouseleave = () => { closeBtn.style.background='rgba(10,12,16,0.85)'; closeBtn.style.color='#c8960a'; };

  const iframe = document.createElement('iframe');
  iframe.src = './ibn-alshatir-reference.html';
  iframe.title = 'Ibn al-Shatir Complete Ephemeris Reference';
  Object.assign(iframe.style, { width:'100%', height:'100%', border:'none', display:'block' });

  overlay.appendChild(closeBtn);
  overlay.appendChild(iframe);
  document.body.appendChild(overlay);
  iframe.addEventListener('load', () => {
    TIME_BROKER.register(iframe.contentWindow, 'reference');
  });

  closeBtn.addEventListener('click', () => { overlay.style.display = 'none'; });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.style.display !== 'none') overlay.style.display = 'none';
  });

  const headerEl = document.querySelector('header');
  if (headerEl) {
    const btn = document.createElement('button');
    btn.className = 'info-btn header-action-btn';
    btn.type = 'button';
    btn.title = 'Ephemeris Reference';
    btn.textContent = '⊚';
    btn.addEventListener('click', () => { overlay.style.display = 'flex'; });
    const astrologyBtn = headerEl.querySelector('[title="Ptolemaic Astrology"]');
    const infoBox = headerEl.querySelector('.info-box');
    if (astrologyBtn) headerEl.insertBefore(btn, astrologyBtn);
    else if (infoBox) headerEl.insertBefore(btn, infoBox);
  }
}

// ── 3D Observation Mode (al-Shatir cinematic geocentric) ───────────────────
{
  const overlay = document.createElement('div');
  overlay.id = 'obs-overlay';
  Object.assign(overlay.style, {
    position:'fixed', inset:'0', zIndex:'8500', display:'none',
    flexDirection:'column', background:'#04060a',
  });

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.title = 'Close the Orrery';
  closeBtn.innerHTML = '✕ Close';
  Object.assign(closeBtn.style, {
    position:'absolute', top:'10px', right:'14px', zIndex:'8501',
    fontFamily:"'Cinzel',serif", fontSize:'0.72rem', letterSpacing:'0.15em',
    background:'rgba(10,12,16,0.85)', border:'1px solid #c8960a',
    color:'#c8960a', padding:'5px 14px', borderRadius:'3px',
    cursor:'pointer', textTransform:'uppercase',
  });
  closeBtn.onmouseenter = () => { closeBtn.style.background='#c8960a'; closeBtn.style.color='#080a12'; };
  closeBtn.onmouseleave = () => { closeBtn.style.background='rgba(10,12,16,0.85)'; closeBtn.style.color='#c8960a'; };

  const iframe = document.createElement('iframe');
  iframe.src = './observation-mode.html';
  iframe.title = 'The Orrery — al-Shatir Geocentric';
  Object.assign(iframe.style, { width:'100%', height:'100%', border:'none', display:'block' });

  overlay.appendChild(closeBtn);
  overlay.appendChild(iframe);
  document.body.appendChild(overlay);
  iframe.addEventListener('load', () => {
    TIME_BROKER.register(iframe.contentWindow, 'observation');
  });

  closeBtn.addEventListener('click', () => { overlay.style.display = 'none'; });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.style.display !== 'none') overlay.style.display = 'none';
  });

  // FP-mode launcher dispatches this event so the in-sky button can open us.
  window.addEventListener('ptol-open-observation', () => { overlay.style.display = 'flex'; });

  const headerEl = document.querySelector('header');
  if (headerEl) {
    const btn = document.createElement('button');
    btn.className = 'info-btn header-action-btn';
    btn.type = 'button';
    btn.title = 'The Orrery';
    btn.textContent = '◉';
    btn.addEventListener('click', () => { overlay.style.display = 'flex'; });
    const astrologyBtn = headerEl.querySelector('[title="Ptolemaic Astrology"]');
    const infoBox = headerEl.querySelector('.info-box');
    if (astrologyBtn) headerEl.insertBefore(btn, astrologyBtn);
    else if (infoBox) headerEl.insertBefore(btn, infoBox);
  }
}

// ── Observation Mode — Explained (per-body geometry walkthrough) ───────────
{
  const overlay = document.createElement('div');
  overlay.id = 'obse-overlay';
  Object.assign(overlay.style, {
    position:'fixed', inset:'0', zIndex:'8500', display:'none',
    flexDirection:'column', background:'#07080d',
  });

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.title = 'Close';
  closeBtn.innerHTML = '✕ Close';
  Object.assign(closeBtn.style, {
    position:'absolute', top:'10px', right:'14px', zIndex:'8501',
    fontFamily:"'Cinzel',serif", fontSize:'0.72rem', letterSpacing:'0.15em',
    background:'rgba(10,12,16,0.85)', border:'1px solid #c8960a',
    color:'#c8960a', padding:'5px 14px', borderRadius:'3px',
    cursor:'pointer', textTransform:'uppercase',
  });
  closeBtn.onmouseenter = () => { closeBtn.style.background='#c8960a'; closeBtn.style.color='#080a12'; };
  closeBtn.onmouseleave = () => { closeBtn.style.background='rgba(10,12,16,0.85)'; closeBtn.style.color='#c8960a'; };

  const iframe = document.createElement('iframe');
  iframe.src = './observation-mode-explained.html';
  iframe.title = 'The Orrery — Explained';
  Object.assign(iframe.style, { width:'100%', height:'100%', border:'none', display:'block' });

  overlay.appendChild(closeBtn);
  overlay.appendChild(iframe);
  document.body.appendChild(overlay);
  iframe.addEventListener('load', () => {
    TIME_BROKER.register(iframe.contentWindow, 'explained');
  });

  closeBtn.addEventListener('click', () => { overlay.style.display = 'none'; });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.style.display !== 'none') overlay.style.display = 'none';
  });

  const headerEl = document.querySelector('header');
  if (headerEl) {
    const btn = document.createElement('button');
    btn.className = 'info-btn header-action-btn';
    btn.type = 'button';
    btn.title = 'The Orrery — Explained';
    btn.textContent = '◎';
    btn.addEventListener('click', () => { overlay.style.display = 'flex'; });
    const astrologyBtn = headerEl.querySelector('[title="Ptolemaic Astrology"]');
    const infoBox = headerEl.querySelector('.info-box');
    if (astrologyBtn) headerEl.insertBefore(btn, astrologyBtn);
    else if (infoBox) headerEl.insertBefore(btn, infoBox);
  }
}

// ── Ptolemaic Astrology App ─────────────────────────────────────────────────
{
  const { show: showAstrology } = buildAstrologyApp(model);
  const headerEl = document.querySelector('header');
  if (headerEl) {
    const btn = document.createElement('button');
    btn.className = 'info-btn header-action-btn';
    btn.type = 'button';
    btn.title = 'Ptolemaic Astrology';
    btn.textContent = '♈';
    const infoBox = headerEl.querySelector('.info-box');
    if (infoBox) headerEl.insertBefore(btn, infoBox);
    btn.addEventListener('click', showAstrology);
  }
}

// ── AR Sky Overlay Button (👁) ───────────────────────────────────────────
{
  const arView = buildArOverlay(model);
  const headerEl = document.querySelector('header');
  if (headerEl) {
    const arBtn = document.createElement('button');
    arBtn.className = 'info-btn header-action-btn';
    arBtn.type = 'button';
    arBtn.title = 'AR Sky Overlay (camera + planet positions)';
    arBtn.textContent = '👁';
    arBtn.addEventListener('click', () => arView.show());
    const infoBox = headerEl.querySelector('.info-box');
    if (infoBox) headerEl.insertBefore(arBtn, infoBox);
  }
}

// ── Feature 4: GPS "Use My Location" Button ──────────────────────────────
(function () {
  const headerEl = document.querySelector('header');
  if (!headerEl) return;

  const wrap = document.createElement('div');
  wrap.style.position = 'relative';

  const gpsBtn = document.createElement('button');
  gpsBtn.className = 'info-btn header-action-btn';
  gpsBtn.type = 'button';
  gpsBtn.title = 'Use my location (GPS)';
  gpsBtn.textContent = '📍';

  let tooltipTimeout = null;

  function showTooltip(msg) {
    const existing = wrap.querySelector('.gps-tooltip');
    if (existing) existing.remove();
    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    const tip = document.createElement('div');
    tip.className = 'gps-tooltip';
    tip.textContent = msg;
    wrap.appendChild(tip);
    tooltipTimeout = setTimeout(() => tip.remove(), 2200);
  }

  gpsBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showTooltip('Location unavailable');
      return;
    }
    gpsBtn.classList.add('gps-locating');
    gpsBtn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        gpsBtn.classList.remove('gps-locating');
        gpsBtn.disabled = false;
        model.setState({
          ObserverLat:  pos.coords.latitude,
          ObserverLong: pos.coords.longitude,
        });
      },
      () => {
        gpsBtn.classList.remove('gps-locating');
        gpsBtn.disabled = false;
        showTooltip('Location unavailable');
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  });

  wrap.appendChild(gpsBtn);
  const infoBox = headerEl.querySelector('.info-box');
  if (infoBox) headerEl.insertBefore(wrap, infoBox);
})();

// ── FIND ME — prominent FAB to enter first-person sky view at your location ──
{
  const viewEl2 = document.getElementById('view');
  if (viewEl2) {
    const fab = document.createElement('button');
    fab.id = 'find-me-btn';
    fab.type = 'button';
    fab.innerHTML = `<span class="fmb-icon">👁</span><span class="fmb-label">LOOK UP</span>`;
    fab.title = 'Enter first-person sky view at your location';
    viewEl2.appendChild(fab);

    // NOTE: uses module-level OPTICAL_ENTRY_ZOOM = 1.0 (defined at top of file)

    function enterSkyView(lat, lon) {
      const nextState = {
        InsideVault: true,
        OpticalZoom: OPTICAL_ENTRY_ZOOM,
      };
      if (lat !== undefined && lon !== undefined) {
        nextState.ObserverLat  = lat;
        nextState.ObserverLong = lon;
      }
      model.setState(nextState);
      fab.classList.remove('fmb-locating');
      fab.disabled = false;
    }

    fab.addEventListener('click', () => {
      // If already in vault, toggle back to overhead view
      if (model.state.InsideVault) {
        model.setState({ InsideVault: false });
        return;
      }
      // Try GPS first; fall back to current observer location
      if (navigator.geolocation) {
        fab.classList.add('fmb-locating');
        fab.disabled = true;
        navigator.geolocation.getCurrentPosition(
          (pos) => enterSkyView(pos.coords.latitude, pos.coords.longitude),
          ()    => enterSkyView(),
          { timeout: 5000, maximumAge: 60000 }
        );
      } else {
        enterSkyView();
      }
    });

    // Update label to show EXIT when inside vault
    model.addEventListener('update', () => {
      const inVault = !!model.state.InsideVault;
      fab.classList.toggle('fmb-active', inVault);
      fab.querySelector('.fmb-label').textContent = inVault ? 'EXIT SKY' : 'LOOK UP';
      fab.querySelector('.fmb-icon').textContent  = inVault ? '🗺' : '👁';
    });
  }
}

// ── Feature 2: Screenshot / Share Export ────────────────────────────────
{
  const headerEl = document.querySelector('header');
  if (headerEl) {
    buildShareButton(headerEl, model, canvas, _epicycleOverlay ? _epicycleOverlay._canvas : null);
    // Gate share behind freemium: intercept click before shareExport handles it
    const shareBtn = headerEl.querySelector('.header-action-btn[title*="Screenshot"], .header-action-btn[title*="Share"]');
    if (shareBtn) {
      shareBtn.addEventListener('click', (e) => {
        if (!isUnlocked()) {
          e.stopImmediatePropagation();
          showPaywall();
        }
      }, true); // capture phase so we fire before shareExport's listener
    }
  }
}

// ── Stellarium time bar (god mode) ───────────────────────────────────────
{
  const view = document.getElementById('view');
  if (view) view.appendChild(buildStelTimeBar(model));
}

// ── Planetary Hours Widget ───────────────────────────────────────────────
{
  const viewForHours = document.getElementById('view');
  if (viewForHours) buildPlanetaryHoursWidget(viewForHours, model);
}


// ── Feature 3: Splash Screen ─────────────────────────────────────────────
{
  const splash = document.getElementById('splash-screen');
  if (splash) {
    const dismissSplash = () => {
      if (splash._fadedOut) return;
      splash._fadedOut = true;
      setTimeout(() => {
        splash.style.transition = 'opacity 0.6s';
        splash.style.opacity = '0';
        setTimeout(() => { splash.remove(); }, 700);
      }, 800);
    };
    // Dismiss on first model update (e.g. user interaction or autoplay tick)
    model.addEventListener('update', dismissSplash, { once: true });
    // Fallback: dismiss after 1.8s even if autoplay is paused
    setTimeout(dismissSplash, 1800);
  }
}

// ── Feature 1: Onboarding Tutorial ──────────────────────────────────────
// Called last so the overlay appears on top of everything
maybeShowOnboarding();

// ── Feature AS-10: Capacitor IAP initialisation ──────────────────────────
initPurchases().catch(() => {});

// Service worker — re-enabled with cache-first strategy (AS-2).
// When a new SW finishes installing while an old one is still in control,
// kick the page so the user sees fresh JS/CSS instead of having to refresh
// twice. Guard with a sessionStorage flag to avoid reload loops.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      if (!reg) return;
      const reloadOnce = () => {
        if (sessionStorage.getItem('ptol-sw-reloaded') === '1') return;
        sessionStorage.setItem('ptol-sw-reloaded', '1');
        location.reload();
      };
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            // A new SW is waiting because an old one still controls this page.
            reloadOnce();
          }
        });
      });
      // First arrival of a controller (e.g. after our SW activated mid-session).
      let _hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (_hadController) reloadOnce();
        _hadController = true;
      });
    }).catch(() => {});
  });
  // Clear the reload-once flag whenever the user successfully ends up on
  // a page whose controller is the fresh SW (so a real future update
  // can trigger the reload again).
  window.addEventListener('pageshow', () => {
    if (sessionStorage.getItem('ptol-sw-reloaded') === '1') {
      // Give the freshly-loaded page one tick to settle, then clear.
      setTimeout(() => sessionStorage.removeItem('ptol-sw-reloaded'), 1000);
    }
  });
}
