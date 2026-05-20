// First-person simple mode — Stellarium-style overlay.
// Shown when InsideVault = true, replacing the full bottom bar.
// Replaces the old simpleMode.js entirely.

import { dateTimeToDate }   from '../core/time.js';
import { TIME_ORIGIN }     from '../core/constants.js';
import { buildStelTimeBar } from './stelTimeBar.js';

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
  overlay.appendChild(buildStelTimeBar(model));
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

  // ── Observation Mode (3D al-Shatir cinematic) ────────────────────
  // Dispatches a custom event that main.js's overlay listens for.
  const obsBtn = mkBtn('fp-strip-btn', '◉', 'Observation Mode (3D)');
  obsBtn.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('ptol-open-observation'));
  });

  strip.append(
    vaultBtn,
    mkSep('fp-strip-sep'),
    azBtn, worldBtn,
    mkSep('fp-strip-sep'),
    planetsBtn,
    obsBtn,
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
//
// Two buttons share one popover menu:
//   🌐 — World model: FE / Dual Pole / GE
//   🗺 — Projection (filtered by world model — FE: AE/Gleason/Prop/Hellerick;
//        GE: every wraps-sphere texture; DP: locked to AE-equatorial)
//
// The same menu lives on the right-side compass cluster as the World
// button; this is the corresponding entry point for 3rd-person mode.
function buildGodFabs(model) {
  const wrap = document.createElement('div');
  wrap.id = 'god-fabs';

  // Shared popover floats over the canvas. Both fab buttons toggle it
  // and reposition next to whichever one was clicked.
  const popover = document.createElement('div');
  popover.className = 'god-fab-popover';
  popover.setAttribute('role', 'menu');
  popover.style.cssText = [
    'position: fixed',
    'display: none',
    'flex-direction: column',
    'min-width: 240px',
    'padding: 10px',
    'background: rgba(8,10,14,0.96)',
    'border: 1px solid rgba(200,160,96,0.55)',
    'border-radius: 6px',
    'box-shadow: 0 8px 28px rgba(0,0,0,0.55)',
    'z-index: 6000',
    "font-family: 'Cinzel', serif",
    'font-size: 0.80rem',
    'color: #e8c97e',
    'letter-spacing: 0.08em',
    'text-align: left',
    'pointer-events: auto',
  ].join(';');
  popover.addEventListener('click', (e) => e.stopPropagation());

  const MODES = [
    { id: 'fe', label: 'FE — Flat Earth' },
    { id: 'dp', label: 'Dual Pole' },
    { id: 'ge', label: 'GE — Globe' },
  ];
  const FE_PROJ = [
    { id: 'ae',           label: 'AE (Normal)' },
    { id: 'hq_gleasons',  label: "Gleason's Map" },
    { id: 'proportional', label: 'Proportional AE' },
    { id: 'hellerick',    label: 'Hellerick Boreal' },
  ];
  const GE_PROJ = [
    { id: 'hq_equirect_day',    label: 'Blue Marble (day)' },
    { id: 'hq_equirect_night',  label: 'Black Marble (night)' },
    { id: 'hq_world_shaded',    label: 'Shaded Relief' },
    { id: 'hq_ortho',           label: 'Orthographic' },
    { id: 'ge_art_line',        label: 'Art — Line' },
    { id: 'ge_art_blueprint',   label: 'Art — Blueprint' },
    { id: 'ge_art_topo',        label: 'Art — Topo' },
    { id: 'ge_art_sepia',       label: 'Art — Sepia' },
    { id: 'ge_art_neon',        label: 'Art — Neon' },
    { id: 'ge_art_translucent', label: 'Art — Translucent' },
  ];

  function rowStyle(active, small) {
    return [
      'display: block', 'width: 100%',
      'padding: ' + (small ? '6px 10px' : '8px 12px'),
      'background: ' + (active ? 'rgba(200,160,96,0.22)' : 'transparent'),
      'border: 1px solid ' + (active ? 'rgba(232,201,126,0.85)' : 'rgba(200,160,96,0.30)'),
      'color: ' + (active ? '#ffe9b8' : '#e8c97e'),
      'border-radius: 3px',
      'cursor: pointer',
      'text-align: left',
      'font: inherit',
      'font-size: ' + (small ? '0.74rem' : '0.80rem'),
      'letter-spacing: 0.08em',
      'margin-bottom: 4px',
    ].join(';');
  }

  function render() {
    const wm = model.state.WorldModel || 'fe';
    popover.innerHTML = '';

    const h1 = document.createElement('div');
    h1.textContent = 'World';
    h1.style.cssText = 'font-size:0.62rem; letter-spacing:0.22em; color:#c8a06a; padding:2px 4px 6px; text-transform:uppercase;';
    popover.appendChild(h1);

    MODES.forEach((m) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = m.label;
      b.style.cssText = rowStyle(m.id === wm, false);
      b.addEventListener('click', () => {
        if (m.id !== model.state.WorldModel) model.setState({ WorldModel: m.id });
        render();
      });
      popover.appendChild(b);
    });

    let projList = null;
    if (wm === 'fe') projList = FE_PROJ;
    else if (wm === 'ge') projList = GE_PROJ;

    if (projList) {
      const h2 = document.createElement('div');
      h2.textContent = 'Projection';
      h2.style.cssText = 'font-size:0.62rem; letter-spacing:0.22em; color:#c8a06a; padding:10px 4px 6px; text-transform:uppercase; border-top:1px solid rgba(200,160,96,0.20); margin-top:6px;';
      popover.appendChild(h2);
      const cur = wm === 'fe' ? model.state.MapProjection : model.state.MapProjectionGe;
      projList.forEach((p) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = p.label;
        b.style.cssText = rowStyle(p.id === cur, true);
        b.addEventListener('click', () => {
          if (wm === 'fe') model.setState({ MapProjection: p.id });
          else model.setState({ MapProjectionGe: p.id });
          render();
        });
        popover.appendChild(b);
      });
    } else {
      const note = document.createElement('div');
      note.textContent = 'Dual Pole uses a fixed AE-equatorial graticule.';
      note.style.cssText = 'font-size:0.66rem; color:#8090b0; padding:10px 4px 0; line-height:1.4; letter-spacing:0.04em;';
      popover.appendChild(note);
    }
  }

  function showAt(anchor) {
    render();
    popover.style.display = 'flex';
    const r = anchor.getBoundingClientRect();
    // Place popover to the right of the FAB, top-aligned with it.
    popover.style.left = (r.right + 10) + 'px';
    popover.style.top  = Math.max(8, r.top) + 'px';
  }
  function hide() {
    popover.style.display = 'none';
    popover._anchor = null;
  }
  function toggle(anchor) {
    if (popover.style.display === 'flex' && popover._anchor === anchor) {
      hide();
    } else {
      popover._anchor = anchor;
      showAt(anchor);
    }
  }

  const skyBtn = document.createElement('button');
  skyBtn.type = 'button';
  skyBtn.className = 'god-fab';
  skyBtn.textContent = '🌐';
  skyBtn.title = 'World model & projection (FE / Dual Pole / GE)';
  skyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle(skyBtn);
  });

  document.addEventListener('click', hide);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hide();
  });
  model.addEventListener('update', () => {
    if (popover.style.display === 'flex') render();
  });

  wrap.append(skyBtn);
  document.body.appendChild(popover);
  return wrap;
}
