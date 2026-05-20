// First-person simple mode — Stellarium-style overlay.
// Shown when InsideVault = true, replacing the full bottom bar.
// Replaces the old simpleMode.js entirely.

import { dateTimeToDate } from '../core/time.js';
import { TIME_ORIGIN }    from '../core/constants.js';

const PLANETS = [
  { id: 'sun',     label: 'Sun',     sym: '☉', color: '#ffc844' },
  { id: 'moon',    label: 'Moon',    sym: '☽', color: '#e8e8e8' },
  { id: 'mercury', label: 'Mercury', sym: '☿', color: '#d0b090' },
  { id: 'venus',   label: 'Venus',   sym: '♀', color: '#fff0a0' },
  { id: 'mars',    label: 'Mars',    sym: '♂', color: '#d05040' },
  { id: 'jupiter', label: 'Jupiter', sym: '♃', color: '#ffa060' },
  { id: 'saturn',  label: 'Saturn',  sym: '♄', color: '#e4c888' },
];

const COUNTRY_HOPS = [
  { code: 'USA', name: 'USA (Denver)',            lat: 39.74,  lon: -104.99 },
  { code: 'BRA', name: 'Brazil (Brasília)',        lat: -15.78, lon: -47.93  },
  { code: 'GBR', name: 'UK (London)',              lat: 51.51,  lon: -0.13   },
  { code: 'EGY', name: 'Egypt (Cairo)',            lat: 30.05,  lon: 31.24   },
  { code: 'ZAF', name: 'South Africa (Cape Town)', lat: -33.92, lon: 18.42   },
  { code: 'RUS', name: 'Russia (Moscow)',          lat: 55.76,  lon: 37.62   },
  { code: 'IND', name: 'India (Delhi)',            lat: 28.61,  lon: 77.21   },
  { code: 'JPN', name: 'Japan (Tokyo)',            lat: 35.68,  lon: 139.65  },
  { code: 'AUS', name: 'Australia (Sydney)',       lat: -33.87, lon: 151.21  },
  { code: 'ARG', name: 'Argentina (Ushuaia)',      lat: -54.81, lon: -68.31  },
];

const SKY_TOGGLES = [
  { label: 'Constellation lines',  on: { ShowConstellationLines: true },  off: { ShowConstellationLines: false },  key: 'ShowConstellationLines' },
  { label: 'Constellation labels', on: { ShowConstellations: true },      off: { ShowConstellations: false },      key: 'ShowConstellations' },
  { label: 'Stars',                on: { ShowCelNav: true },              off: { ShowCelNav: false },              key: 'ShowCelNav' },
  { label: 'Night mode',           on: { PermanentNight: true },          off: { PermanentNight: false },          key: 'PermanentNight' },
  { label: 'Grids & azimuth',
    on:  { ShowAzimuthRing: true,  ShowLongitudeRing: true,  ShowOpticalVaultGrid: true,  ShowFeGrid: true  },
    off: { ShowAzimuthRing: false, ShowLongitudeRing: false, ShowOpticalVaultGrid: false, ShowFeGrid: false },
    key: 'ShowAzimuthRing' },
  { label: 'Dark background',      on: { DarkBackground: true },          off: { DarkBackground: false },          key: 'DarkBackground' },
];

const MAP_CYCLES = [
  { label: 'AE disc',     wm: 'fe', proj: 'ae' },
  { label: 'Globe',       wm: 'ge', proj: 'hq_equirect_night' },
  { label: 'Dual-pole',   wm: 'dp', proj: 'ae' },
];

export function initFpMode(model) {
  const host = document.getElementById('view') || document.getElementById('app');

  // First-person overlay (shown when InsideVault = true)
  const overlay = buildOverlay(model);
  host.appendChild(overlay);

  // God-mode floating buttons (shown when InsideVault = false)
  const godFabs = buildGodFabs(model);
  host.appendChild(godFabs);

  const sync = () => {
    document.body.classList.toggle('fp-mode', !!model.state.InsideVault);
  };
  model.addEventListener('update', sync);
  sync();
}

// ── helpers ───────────────────────────────────────────────────────────
function mkBtn(cls, text, title) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  if (text  !== undefined) b.textContent = text;
  if (title !== undefined) b.title = title;
  return b;
}

function mkSep(cls) {
  const d = document.createElement('div');
  d.className = cls;
  return d;
}

// ── overlay root ──────────────────────────────────────────────────────
function buildOverlay(model) {
  const overlay = document.createElement('div');
  overlay.id = 'fp-overlay';

  const { strip, skyMenu, planetMenu, mapMenu } = buildBottomStrip(model);

  overlay.appendChild(buildSidebar(model));
  overlay.appendChild(buildTimeBar(model));
  overlay.appendChild(buildPlanetLabelsCanvas(model));
  overlay.appendChild(skyMenu);
  overlay.appendChild(planetMenu);
  overlay.appendChild(mapMenu);
  overlay.appendChild(strip);

  // Close open submenus when tapping the 3-D canvas
  const canvas = document.getElementById('feCanvas');
  if (canvas) {
    canvas.addEventListener('pointerdown', () => {
      skyMenu.classList.remove('open');
      planetMenu.classList.remove('open');
      mapMenu.classList.remove('open');
    });
  }

  return overlay;
}

// ── planet label canvas ───────────────────────────────────────────────
function buildPlanetLabelsCanvas(model) {
  const canvas = document.createElement('canvas');
  canvas.id = 'fp-planet-labels';

  const LABEL_BODIES = [
    { key: 'sun',     sym: '☉', name: 'Sun',     color: '#ffc844' },
    { key: 'moon',    sym: '☽', name: 'Moon',    color: '#d8e8ff' },
    { key: 'mercury', sym: '☿', name: 'Mercury', color: '#c8a880' },
    { key: 'venus',   sym: '♀', name: 'Venus',   color: '#fff0a0' },
    { key: 'mars',    sym: '♂', name: 'Mars',    color: '#d05040' },
    { key: 'jupiter', sym: '♃', name: 'Jupiter', color: '#ffa060' },
    { key: 'saturn',  sym: '♄', name: 'Saturn',  color: '#e4c888' },
  ];

  function getBodyAzEl(b) {
    const c = model.computed;
    if (!c) return null;
    if (b.key === 'sun'  && c.SunAnglesGlobe)  return c.SunAnglesGlobe;
    if (b.key === 'moon' && c.MoonAnglesGlobe) return c.MoonAnglesGlobe;
    const p = c.Planets && c.Planets[b.key];
    return (p && p.anglesGlobe) ? p.anglesGlobe : null;
  }

  function render() {
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    if (W <= 0 || H <= 0) return;
    canvas.width  = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    if (!model.state.InsideVault) return;

    const s = model.state;
    const FOV_BASE = 75;
    const zoom = Math.max(0.2, s.OpticalZoom || 5.09);
    const fovV = Math.max(0.005, Math.min(FOV_BASE, FOV_BASE / zoom));
    const aspect = (model.computed && model.computed.ViewAspect) || (W / H);
    const fovH = fovV * aspect;

    const heading = s.ObserverHeading || 0;
    const pitch   = s.CameraHeight   || 0;

    for (const b of LABEL_BODIES) {
      const ang = getBodyAzEl(b);
      if (!ang) continue;
      const { azimuth, elevation } = ang;
      if (!Number.isFinite(azimuth) || !Number.isFinite(elevation)) continue;
      if (elevation < -2) continue; // well below horizon

      const dAz = ((azimuth - heading + 540) % 360) - 180;
      const dEl = elevation - pitch;

      // Cull if outside viewport (with small margin)
      if (Math.abs(dAz) > fovH / 2 + 5) continue;
      if (Math.abs(dEl) > fovV / 2 + 5) continue;

      const sx = W / 2 + dAz * (W / fovH);
      const sy = H / 2 - dEl * (H / fovV);

      // Glow halo
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 22);
      grad.addColorStop(0, b.color + 'aa');
      grad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(sx, sy, 22, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Body dot
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Symbol above dot
      ctx.font = 'bold 15px Georgia, serif';
      ctx.fillStyle = b.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(b.sym, sx, sy - 8);

      // Name below dot
      ctx.font = '11px Georgia, serif';
      ctx.fillStyle = 'rgba(255,235,160,0.92)';
      ctx.textBaseline = 'top';
      ctx.fillText(b.name, sx, sy + 9);

      ctx.shadowBlur = 0;
    }
  }

  let _rafId = null;
  function loop() {
    render();
    _rafId = requestAnimationFrame(loop);
  }

  // Start/stop the loop with fp-mode visibility
  const observer = new MutationObserver(() => {
    const active = document.body.classList.contains('fp-mode');
    if (active && _rafId === null) {
      loop();
    } else if (!active && _rafId !== null) {
      cancelAnimationFrame(_rafId);
      _rafId = null;
    }
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // Also start immediately if already in fp-mode
  if (document.body.classList.contains('fp-mode')) loop();

  return canvas;
}

// ── left sidebar: country quick-hops ─────────────────────────────────
function buildSidebar(model) {
  const sidebar = document.createElement('div');
  sidebar.className = 'fp-sidebar';

  for (const h of COUNTRY_HOPS) {
    const b = mkBtn('fp-hop', h.code, h.name);
    b.addEventListener('click', () => {
      model.setState({ ObserverLat: h.lat, ObserverLong: h.lon });
    });
    sidebar.appendChild(b);
  }
  return sidebar;
}

// ── top time bar ──────────────────────────────────────────────────────
function buildTimeBar(model) {
  const bar = document.createElement('div');
  bar.className = 'fp-time-bar';

  const stepDays = (n) => model.setState({ DateTime: (model.state.DateTime || 0) + n });
  const stepMonths = (n) => {
    const d = dateTimeToDate(model.state.DateTime || 0);
    d.setUTCMonth(d.getUTCMonth() + n);
    model.setState({ DateTime: d.getTime() / TIME_ORIGIN.msPerDay - TIME_ORIGIN.ZeroDate });
  };
  const stepYears = (n) => {
    const d = dateTimeToDate(model.state.DateTime || 0);
    d.setUTCFullYear(d.getUTCFullYear() + n);
    model.setState({ DateTime: d.getTime() / TIME_ORIGIN.msPerDay - TIME_ORIGIN.ZeroDate });
  };

  const btnRew  = mkBtn('fp-btn', '⏪', 'Rewind');
  const btnPlay = mkBtn('fp-btn fp-play-btn', '▶', 'Play / Pause');
  const btnFf   = mkBtn('fp-btn', '⏩', 'Fast forward');
  const btnSlow = mkBtn('fp-btn', '½×', 'Half speed');
  const btnFast = mkBtn('fp-btn', '2×', 'Double speed');

  const DEFAULT_SPEED = 1 / 24;
  const MIN_SPEED = DEFAULT_SPEED / 128;
  const MAX_SPEED = DEFAULT_SPEED * 128;

  btnRew.addEventListener('click', () => {
    const ap = model._autoplay;
    if (!ap) return;
    const s = ap.speed;
    ap.setSpeed(s > 0 ? -s : s * 2);
    if (!ap.playing) ap.play();
  });
  btnFf.addEventListener('click', () => {
    const ap = model._autoplay;
    if (!ap) return;
    const s = ap.speed;
    ap.setSpeed(s < 0 ? -s : Math.min(MAX_SPEED, s * 2));
    if (!ap.playing) ap.play();
  });
  btnSlow.addEventListener('click', () => {
    const ap = model._autoplay;
    if (!ap) return;
    const s = ap.speed;
    ap.setSpeed(Math.sign(s) * Math.max(MIN_SPEED, Math.abs(s) / 2));
    if (!ap.playing) ap.play();
  });
  btnFast.addEventListener('click', () => {
    const ap = model._autoplay;
    if (!ap) return;
    const s = ap.speed;
    ap.setSpeed(Math.sign(s) * Math.min(MAX_SPEED, Math.abs(s) * 2));
    if (!ap.playing) ap.play();
  });
  btnPlay.addEventListener('click', () => {
    const ap = model._autoplay;
    if (!ap) return;
    if (!ap.playing) ap.setSpeed(DEFAULT_SPEED);
    ap.toggle();
    refreshPlay();
  });

  const refreshPlay = () => {
    const ap = model._autoplay;
    if (!ap) return;
    btnPlay.textContent = ap.playing ? '⏸' : '▶';
  };
  // Poll since autoplay doesn't emit model updates
  setInterval(refreshPlay, 500);

  const dMinus  = mkBtn('fp-btn', '−d',  'Back 1 day');
  const moMinus = mkBtn('fp-btn', '−mo', 'Back 1 month');
  const yMinus  = mkBtn('fp-btn', '−y',  'Back 1 year');
  const dPlus   = mkBtn('fp-btn', '+d',  'Forward 1 day');
  const moPlus  = mkBtn('fp-btn', '+mo', 'Forward 1 month');
  const yPlus   = mkBtn('fp-btn', '+y',  'Forward 1 year');

  dMinus.addEventListener('click',  () => stepDays(-1));
  moMinus.addEventListener('click', () => stepMonths(-1));
  yMinus.addEventListener('click',  () => stepYears(-1));
  dPlus.addEventListener('click',   () => stepDays(1));
  moPlus.addEventListener('click',  () => stepMonths(1));
  yPlus.addEventListener('click',   () => stepYears(1));

  bar.append(
    btnRew, btnPlay, btnFf, btnSlow, btnFast,
    mkSep('fp-time-sep'),
    dMinus, moMinus, yMinus, dPlus, moPlus, yPlus,
  );
  return bar;
}

// ── bottom strip + submenus ───────────────────────────────────────────
function buildBottomStrip(model) {
  const strip = document.createElement('div');
  strip.className = 'fp-bottom-strip';

  // ── Vault toggle (FP ↔ 3P) ──────────────────────────────────────
  const vaultBtn = mkBtn('fp-strip-btn fp-vault-btn', '🌐', 'Switch to god mode (3rd person)');
  const refreshVault = () => {
    const fp = !!model.state.InsideVault;
    vaultBtn.textContent = fp ? '🌐' : '👁';
    vaultBtn.title = fp ? 'Exit to god mode (3rd person)' : 'Enter first-person sky view';
    vaultBtn.setAttribute('aria-pressed', fp ? 'true' : 'false');
  };
  vaultBtn.addEventListener('click', () => {
    model.setState({ InsideVault: !model.state.InsideVault });
  });
  model.addEventListener('update', refreshVault);
  refreshVault();

  // ── Azimuth / longitude ring ─────────────────────────────────────
  const azBtn = mkBtn('fp-strip-btn', '🧭', 'Azimuth / longitude ring');
  const refreshAz = () => {
    azBtn.setAttribute('aria-pressed',
      (model.state.ShowAzimuthRing || model.state.ShowLongitudeRing) ? 'true' : 'false');
  };
  azBtn.addEventListener('click', () => {
    const on = !!model.state.ShowAzimuthRing;
    model.setState({
      ShowAzimuthRing:      !on,
      ShowLongitudeRing:    !on,
      ShowOpticalVaultGrid: !on,
      ShowFeGrid:           !on,
    });
  });
  model.addEventListener('update', refreshAz);
  refreshAz();

  // ── World model (FE / GE / DP) ───────────────────────────────────
  const worldBtn = mkBtn('fp-strip-btn fp-world-btn', 'FE', 'World model (FE / GE / DP)');
  const refreshWorld = () => {
    const wm = model.state.WorldModel;
    worldBtn.textContent = wm === 'ge' ? 'GE' : wm === 'dp' ? 'DP' : 'FE';
  };
  worldBtn.addEventListener('click', () => {
    const cur = model.state.WorldModel;
    const next = cur === 'fe' ? 'ge' : cur === 'ge' ? 'dp' : 'fe';
    model.setState({ WorldModel: next });
  });
  model.addEventListener('update', refreshWorld);
  refreshWorld();

  // ── Planet tracking
  const planetsBtn = mkBtn('fp-strip-btn', '🪐', 'Planet tracking');
  const planetMenu = buildPlanetMenu(model);
  let planetOpen = false;
  planetsBtn.addEventListener('click', () => {
    planetOpen = !planetOpen;
    planetMenu.classList.toggle('open', planetOpen);
    planetsBtn.setAttribute('aria-pressed', planetOpen ? 'true' : 'false');
  });

  strip.append(
    vaultBtn,
    mkSep('fp-strip-sep'),
    azBtn, worldBtn,
    mkSep('fp-strip-sep'),
    planetsBtn,
  );

  const skyMenu = document.createElement('div');
  const mapMenu = document.createElement('div');
  return { strip, skyMenu, planetMenu, mapMenu };
}

// ── Sky layers submenu ────────────────────────────────────────────────
function buildSkyMenu(model) {
  const panel = document.createElement('div');
  panel.className = 'fp-submenu fp-sky-menu';

  const title = document.createElement('div');
  title.className = 'fp-submenu-title';
  title.textContent = 'Sky Layers';
  panel.appendChild(title);

  for (const t of SKY_TOGGLES) {
    const row = document.createElement('div');
    row.className = 'fp-submenu-row';

    const lbl = document.createElement('span');
    lbl.textContent = t.label;
    row.appendChild(lbl);

    const tog = mkBtn('fp-toggle', '', t.label);
    const refresh = () => {
      tog.setAttribute('aria-pressed', !!model.state[t.key] ? 'true' : 'false');
    };
    tog.addEventListener('click', () => {
      model.setState(!!model.state[t.key] ? t.off : t.on);
    });
    model.addEventListener('update', refresh);
    refresh();

    row.appendChild(tog);
    panel.appendChild(row);
  }
  return panel;
}

// ── Planet tracking submenu ───────────────────────────────────────────
function buildPlanetMenu(model) {
  const panel = document.createElement('div');
  panel.className = 'fp-submenu fp-planet-menu';

  const title = document.createElement('div');
  title.className = 'fp-submenu-title';
  title.textContent = 'Track Planets';
  panel.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'fp-planet-grid';

  for (const p of PLANETS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fp-planet-btn';
    b.title = p.label;

    const sym = document.createElement('span');
    sym.className = 'fp-planet-sym';
    sym.textContent = p.sym;
    sym.style.color = p.color;

    const lbl = document.createElement('span');
    lbl.className = 'fp-planet-lbl';
    lbl.textContent = p.label;

    b.append(sym, lbl);

    const refresh = () => {
      const targets = Array.isArray(model.state.TrackerTargets) ? model.state.TrackerTargets : [];
      b.setAttribute('aria-pressed', targets.includes(p.id) ? 'true' : 'false');
    };
    b.addEventListener('click', () => {
      const cur = Array.isArray(model.state.TrackerTargets) ? [...model.state.TrackerTargets] : [];
      model.setState(cur.includes(p.id)
        ? { TrackerTargets: cur.filter(t => t !== p.id) }
        : { TrackerTargets: [...cur, p.id], FollowTarget: p.id });
    });
    model.addEventListener('update', refresh);
    refresh();
    grid.appendChild(b);
  }
  panel.appendChild(grid);
  return panel;
}

// ── Map projection submenu ────────────────────────────────────────────
function buildMapMenu(model) {
  const panel = document.createElement('div');
  panel.className = 'fp-submenu fp-map-menu';

  const title = document.createElement('div');
  title.className = 'fp-submenu-title';
  title.textContent = 'Map View';
  panel.appendChild(title);

  for (const m of MAP_CYCLES) {
    const row = document.createElement('div');
    row.className = 'fp-submenu-row fp-map-row';

    const b = mkBtn('fp-map-choice', m.label, m.label);
    const refresh = () => {
      const active = model.state.WorldModel === m.wm;
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    };
    b.addEventListener('click', () => {
      model.setState({ WorldModel: m.wm, MapProjection: m.proj });
    });
    model.addEventListener('update', refresh);
    refresh();

    row.appendChild(b);
    panel.appendChild(row);
  }
  return panel;
}

// ── God-mode floating buttons (left side, visible in 3rd-person) ──────
function buildGodFabs(model) {
  const wrap = document.createElement('div');
  wrap.id = 'god-fabs';

  const mapBtn = document.createElement('button');
  mapBtn.type = 'button';
  mapBtn.className = 'god-fab';
  mapBtn.textContent = '🗺';
  mapBtn.title = 'Map Projection';
  mapBtn.addEventListener('click', () => {
    if (model._featureOpen) model._featureOpen('Show', 'Map Projection');
  });

  const skyBtn = document.createElement('button');
  skyBtn.type = 'button';
  skyBtn.className = 'god-fab';
  skyBtn.textContent = '⊕';
  skyBtn.title = 'Sky Layers';
  skyBtn.addEventListener('click', () => {
    if (model._featureOpen) model._featureOpen('Show', 'Bodies');
  });

  wrap.append(mapBtn, skyBtn);
  return wrap;
}
