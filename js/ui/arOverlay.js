// AR Sky Overlay — camera feed + DeviceOrientation overlay.
//
// Exported: buildArOverlay(model) → { show, hide }
// Triggered from main.js via a 👁 button in the header.
//
// Layers rendered on top of the live camera feed:
//   1. Planets (Sun + Moon + 5 classical) — always on. Original behavior.
//   2. Named stars (HYG catalog ~5000) — magnitude-gated.
//   3. Constellation lines + labels.
//   4. Galaxies & DSOs.
//   5. Satellites (SGP4-lite via core/satellites.js).
//   6. Alt/az grid (optional).
//
// All layers route through js/core/arProjection.js so the math is one
// place and we can unit-test it (tools/test-projection.html).

import { isRetrograde } from '../core/astrology.js';
import { project, angularDistance, poseFromDeviceOrientation, DEG }
  from '../core/arProjection.js';
import { raDecToAzEl }            from '../core/transforms.js';
import { greenwichSiderealDeg }   from '../core/ephemerisCommon.js';
import { CONSTELLATIONS }         from '../core/constellations.js';
import { GALAXIES }               from '../core/galaxies.js';
import { SATELLITES, satelliteSubPoint } from '../core/satellites.js';
import { NAMED_STARS_HYG }        from '../core/_namedStarsHyg.js';

const EPOCH = Date.UTC(2017, 0, 1);

// FOV defaults — per-device override read from localStorage.arCameraFov
// (set by the FOV slider in §13.2 of the implementation guide).
const DEFAULT_FOV_H = 60;

// Persisted layer + filter settings.
const LS_AR_PREFS = 'arSkyPrefs';
const DEFAULT_PREFS = {
  showPlanets:        true,
  showStars:          true,
  showConstellations: true,
  showGalaxies:       false,
  showSatellites:     false,
  showGrid:           false,
  maxStarMag:         4.5,     // bigger → fainter shown
  fovH:               DEFAULT_FOV_H,
  compassOffset:      0,        // §13.1 polar-anchor calibration
};
function loadPrefs() {
  try { return Object.assign({}, DEFAULT_PREFS, JSON.parse(localStorage.getItem(LS_AR_PREFS) || '{}')); }
  catch (_e) { return { ...DEFAULT_PREFS }; }
}
function savePrefs(p) {
  try { localStorage.setItem(LS_AR_PREFS, JSON.stringify(p)); } catch (_e) {}
}

// Magnitude → point size (px). Brighter (lower mag) = bigger.
function starSize(mag) {
  if (!Number.isFinite(mag)) return 1.5;
  return Math.max(0.7, Math.min(5.0, 5.6 - mag * 0.8));
}

// Cheap spectral-class colour (we don't have spectral data for HYG-named
// in this catalog form — fall back to magnitude tint).
function starColor(mag) {
  // bright = warmer white, dim = cooler grey
  if (!Number.isFinite(mag)) return 'rgba(220,225,235,0.85)';
  if (mag < 1) return 'rgba(255,250,225,0.95)';
  if (mag < 3) return 'rgba(245,240,220,0.90)';
  if (mag < 5) return 'rgba(220,225,235,0.80)';
  return 'rgba(180,190,210,0.55)';
}

const BODY_COLORS = {
  sun:     '#ffe066',
  moon:    '#c8d8f0',
  mercury: '#b0b0b8',
  venus:   '#e8e080',
  mars:    '#e06040',
  jupiter: '#d4a8c4',
  saturn:  '#ceb860',
};
const BODY_SYMBOLS = {
  sun:     '☉',
  moon:    '☽',
  mercury: '☿',
  venus:   '♀',
  mars:    '♂',
  jupiter: '♃',
  saturn:  '♄',
};

function getAllBodyAzEl(model) {
  const c   = model.computed;
  const src = model.state.BodySource || 'ibnshatir';
  const dt  = model.state.DateTime  || 0;
  const date = new Date(EPOCH + dt * 86400000);
  const out = [];

  function add(name, label, az, el) {
    if (!Number.isFinite(az) || !Number.isFinite(el)) return;
    if (el < -10) return; // well below horizon
    out.push({
      name,
      label,
      az,
      el,
      color:     BODY_COLORS[name]  || '#ffffff',
      symbol:    BODY_SYMBOLS[name] || '★',
      retrograde: isRetrograde(name, date, src),
    });
  }

  if (c.SunAnglesGlobe)  add('sun',  'Sun',  c.SunAnglesGlobe.azimuth,  c.SunAnglesGlobe.elevation);
  if (c.MoonAnglesGlobe) add('moon', 'Moon', c.MoonAnglesGlobe.azimuth, c.MoonAnglesGlobe.elevation);

  for (const name of ['mercury', 'venus', 'mars', 'jupiter', 'saturn']) {
    const p = c.Planets && c.Planets[name];
    if (p && p.anglesGlobe) {
      const label = name.charAt(0).toUpperCase() + name.slice(1);
      add(name, label, p.anglesGlobe.azimuth, p.anglesGlobe.elevation);
    }
  }
  return out;
}

function drawCompassRose(ctx, x, y, r, heading) {
  ctx.save();
  ctx.translate(x, y);

  // Outer circle
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(212,160,32,0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Cardinal labels
  const dirs = [
    { label: 'N', ang: -heading },
    { label: 'E', ang: -heading + 90 },
    { label: 'S', ang: -heading + 180 },
    { label: 'W', ang: -heading + 270 },
  ];
  for (const { label, ang } of dirs) {
    const rad = ang * Math.PI / 180;
    const lx  = (r - 8) * Math.sin(rad);
    const ly  = -(r - 8) * Math.cos(rad);
    ctx.font = label === 'N' ? 'bold 11px Georgia,serif' : '9px Georgia,serif';
    ctx.fillStyle = label === 'N' ? '#ffe066' : 'rgba(242,230,184,0.8)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, lx, ly);
  }

  // North arrow
  const nRad = -heading * Math.PI / 180;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo((r - 12) * Math.sin(nRad), -(r - 12) * Math.cos(nRad));
  ctx.strokeStyle = '#ffe066';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

/**
 * Build the AR overlay and return { show, hide }.
 * @param {import('../core/app.js').FeModel} model
 */
export function buildArOverlay(model) {
  const overlay = document.createElement('div');
  overlay.id = 'ar-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <video id="ar-video" autoplay muted playsinline></video>
    <canvas id="ar-canvas"></canvas>
    <div class="ar-status" id="ar-status"></div>
    <button class="ar-close" id="ar-close" type="button" aria-label="Close AR view">✕</button>
    <div class="ar-permission-card" id="ar-permission-card" hidden>
      <div class="ar-perm-icon">📷</div>
      <div class="ar-perm-title">Camera & Orientation Access</div>
      <div class="ar-perm-body">
        <p>This feature overlays planet positions on your live camera feed.</p>
        <p><strong>Camera</strong> — to show the real sky behind the symbols.</p>
        <p><strong>Device orientation</strong> — to know where your phone is pointing.</p>
        <p>If prompted, please tap <em>Allow</em> for both.</p>
      </div>
      <button class="ar-perm-btn" id="ar-perm-start" type="button">Enable AR</button>
      <div class="ar-perm-error" id="ar-perm-error" hidden></div>
    </div>
    <!-- Bottom toggle tray (layers + magnitude slider + FOV) -->
    <div class="ar-tray" id="ar-tray">
      <button class="ar-chip" data-layer="showPlanets"        type="button">☀ Planets</button>
      <button class="ar-chip" data-layer="showStars"          type="button">★ Stars</button>
      <button class="ar-chip" data-layer="showConstellations" type="button">⊕ Constellations</button>
      <button class="ar-chip" data-layer="showGalaxies"       type="button">M DSOs</button>
      <button class="ar-chip" data-layer="showSatellites"     type="button">🛰 Sats</button>
      <button class="ar-chip" data-layer="showGrid"           type="button">📐 Grid</button>
      <div class="ar-slider-wrap">
        <label>★ ≤ <span id="ar-mag-readout">4.5</span></label>
        <input type="range" id="ar-mag-slider" min="1" max="6.5" step="0.1" value="4.5">
      </div>
      <div class="ar-slider-wrap">
        <label>FOV <span id="ar-fov-readout">60</span>°</label>
        <input type="range" id="ar-fov-slider" min="35" max="100" step="1" value="60">
      </div>
      <button class="ar-chip ar-calib" id="ar-calib-btn" type="button" title="Tap when crosshair is on a known body (Sun/Polaris) to recalibrate the compass">🎯 Calib</button>
    </div>
  `;
  document.body.appendChild(overlay);

  // Inline styling for tray + chips — no separate CSS file to maintain.
  if (!document.getElementById('ar-overlay-style')) {
    const css = document.createElement('style');
    css.id = 'ar-overlay-style';
    css.textContent = `
      #ar-overlay .ar-tray {
        position: absolute; left: 8px; right: 8px; bottom: max(12px, env(safe-area-inset-bottom, 12px));
        display: flex; flex-wrap: wrap; gap: 6px;
        padding: 8px;
        background: linear-gradient(180deg, rgba(8,10,14,0.25) 0%, rgba(8,10,14,0.85) 60%);
        border-radius: 10px;
        align-items: center;
        pointer-events: auto;
        z-index: 5;
      }
      #ar-overlay .ar-chip {
        font: 11px/1.2 system-ui, sans-serif;
        color: #e8c97e;
        background: rgba(18,20,26,0.55);
        border: 1px solid rgba(212,160,32,0.40);
        border-radius: 999px;
        padding: 5px 10px;
        cursor: pointer;
        letter-spacing: 0.04em;
      }
      #ar-overlay .ar-chip[aria-pressed="true"] {
        background: rgba(212,160,32,0.22);
        color: #fff5d0;
        border-color: rgba(232,201,126,0.85);
      }
      #ar-overlay .ar-slider-wrap {
        display: inline-flex; flex-direction: column;
        font: 10px/1.2 ui-monospace, monospace;
        color: rgba(232,201,126,0.85);
        margin: 0 6px;
        min-width: 110px;
      }
      #ar-overlay .ar-slider-wrap label { padding-bottom: 2px; letter-spacing: 0.05em; }
      #ar-overlay .ar-slider-wrap input[type=range] { width: 100%; accent-color: #c8a060; }
      #ar-overlay .ar-calib { background: rgba(40,30,12,0.7); }
    `;
    document.head.appendChild(css);
  }

  const videoEl      = overlay.querySelector('#ar-video');
  const canvasEl     = overlay.querySelector('#ar-canvas');
  const statusEl     = overlay.querySelector('#ar-status');
  const closeBtn     = overlay.querySelector('#ar-close');
  const permCard     = overlay.querySelector('#ar-permission-card');
  const permStartBtn = overlay.querySelector('#ar-perm-start');
  const permError    = overlay.querySelector('#ar-perm-error');
  const ctx          = canvasEl.getContext('2d');

  let _stream   = null;
  let _animId   = null;
  let _alpha    = 0;   // compass heading (degrees, 0=North)
  let _beta     = 90;  // device tilt (degrees, 90=upright/vertical)
  let _gamma    = 0;   // device roll (degrees, 0=level)
  let _running  = false;
  let _prefs    = loadPrefs();
  let _identifyHit = null;     // tap-to-identify: last hit body for tooltip
  let _identifyTime = 0;

  // §15 of guide — when ?ar-fake=1 the head-script in index.html maintains
  // window.__AR_FAKE_ORIENTATION__ from mouse drags. Read it as the
  // authoritative source when present so the overlay can be driven
  // without holding a phone up to the sky.
  function onOrientation(e) {
    const fake = (typeof window !== 'undefined') && window.__AR_FAKE_ORIENTATION__;
    if (fake) {
      _alpha = fake.alpha; _beta = fake.beta; _gamma = fake.gamma;
      return;
    }
    if (e.alpha != null) _alpha = e.alpha;
    if (e.beta  != null) _beta  = e.beta;
    if (e.gamma != null) _gamma = e.gamma;
  }

  function resizeCanvas() {
    canvasEl.width  = overlay.clientWidth  || window.innerWidth;
    canvasEl.height = overlay.clientHeight || window.innerHeight;
  }

  // Cache for catalog → screen projections built once per frame so we can
  // hit-test on tap without re-projecting. Keys are body identifiers.
  let _lastFrameHits = [];

  function renderFrame() {
    if (!_running) return;
    _animId = requestAnimationFrame(renderFrame);

    resizeCanvas();
    const W = canvasEl.width;
    const H = canvasEl.height;
    ctx.clearRect(0, 0, W, H);

    // ── Camera pose ─────────────────────────────────────────────────
    // Apply the user's compass offset (§13.1 polar-anchor calibration).
    const screenOri = (screen.orientation && screen.orientation.angle) || 0;
    const pose = poseFromDeviceOrientation(_alpha, _beta, _gamma, screenOri);
    pose.yaw = ((pose.yaw + (_prefs.compassOffset || 0)) % 360 + 360) % 360;
    const fovH = _prefs.fovH || DEFAULT_FOV_H;

    // ── Observer + time (drives RA/Dec → alt/az for catalog bodies) ──
    const obsLat = (model.state.ObserverLat  || 0);
    const obsLon = (model.state.ObserverLong || 0);
    const dt = model.state.DateTime || 0;
    const utcDate = new Date(EPOCH + dt * 86400000);
    const gmst = greenwichSiderealDeg(utcDate);

    _lastFrameHits = [];

    // ── Horizon line ────────────────────────────────────────────────
    // Draw before everything else so other layers paint over it.
    drawHorizon(ctx, W, H, pose, fovH);

    // ── Alt/az grid (optional) ──────────────────────────────────────
    if (_prefs.showGrid) drawAltAzGrid(ctx, W, H, pose, fovH);

    // ── Constellation lines + labels ────────────────────────────────
    if (_prefs.showConstellations) {
      drawConstellations(ctx, W, H, pose, fovH, obsLat, obsLon, gmst);
    }

    // ── Stars (HYG named, magnitude-gated) ──────────────────────────
    if (_prefs.showStars) {
      drawStars(ctx, W, H, pose, fovH, obsLat, obsLon, gmst, _prefs.maxStarMag);
    }

    // ── Galaxies & DSOs ─────────────────────────────────────────────
    if (_prefs.showGalaxies) {
      drawGalaxies(ctx, W, H, pose, fovH, obsLat, obsLon, gmst);
    }

    // ── Satellites (SGP4-lite — sub-point → alt/az) ─────────────────
    if (_prefs.showSatellites) {
      drawSatellites(ctx, W, H, pose, fovH, obsLat, obsLon, gmst, utcDate);
    }

    // ── Planets (Sun + Moon + 5 classical) — original behavior ──────
    if (_prefs.showPlanets) {
      drawPlanets(ctx, W, H, pose, fovH, model);
    }

    // ── HUD: crosshair, compass rose, status strip ──────────────────
    drawCrosshair(ctx, W, H);
    drawCompassRose(ctx, W - 54, H - 54, 32, pose.yaw);
    drawStatusStrip(ctx, W, H, pose, fovH, obsLat, obsLon, _prefs);

    // ── Tap-to-identify tooltip (fades after 4 s) ───────────────────
    if (_identifyHit && (performance.now() - _identifyTime) < 4000) {
      drawIdentifyTooltip(ctx, W, H, _identifyHit);
    } else {
      _identifyHit = null;
    }
  }

  // ── Layer renderers ────────────────────────────────────────────────

  function drawHorizon(ctx, W, H, pose, fovH) {
    // Sample the horizon (alt=0) across the FOV — gives a slightly
    // curved line when the camera is rolled, unlike a single screen-Y.
    const STEPS = 32;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= STEPS; i++) {
      const az = pose.yaw + (i / STEPS - 0.5) * fovH * 1.5;
      const p = project(0, az, pose, fovH, W, H, { padDeg: fovH * 0.5 });
      if (!p) continue;
      if (!started) { ctx.moveTo(p.x, p.y); started = true; }
      else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = 'rgba(212,160,32,0.30)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawAltAzGrid(ctx, W, H, pose, fovH) {
    ctx.strokeStyle = 'rgba(160,180,220,0.18)';
    ctx.lineWidth = 0.7;
    ctx.setLineDash([2, 4]);
    // Az meridians every 30°
    for (let az = 0; az < 360; az += 30) {
      ctx.beginPath();
      let started = false;
      for (let alt = -10; alt <= 90; alt += 2) {
        const p = project(alt, az, pose, fovH, W, H, { padDeg: 5 });
        if (!p) { started = false; continue; }
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    // Alt parallels every 15°
    for (let alt = 0; alt <= 80; alt += 15) {
      ctx.beginPath();
      let started = false;
      for (let az = 0; az <= 360; az += 4) {
        const p = project(alt, az, pose, fovH, W, H, { padDeg: 5 });
        if (!p) { started = false; continue; }
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function drawConstellations(ctx, W, H, pose, fovH, lat, lon, gmst) {
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = 'rgba(120,150,210,0.55)';
    for (const con of CONSTELLATIONS) {
      // Pre-cull: skip whole constellation if its centroid is > FOV from camera.
      const c = con.stars[0];
      if (!c) continue;
      const aze = raDecToAzEl(c.ra * DEG, c.dec * DEG, lat, lon, gmst);
      if (angularDistance(aze.elevation, aze.azimuth, pose.pitch, pose.yaw) > fovH) continue;
      // Project all stars
      const pts = con.stars.map((s) => {
        const a = raDecToAzEl(s.ra * DEG, s.dec * DEG, lat, lon, gmst);
        return project(a.elevation, a.azimuth, pose, fovH, W, H, { padDeg: 10 });
      });
      // Draw lines
      for (const [i, j] of (con.lines || [])) {
        const a = pts[i], b = pts[j];
        if (!a || !b) continue;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      // Label at the centroid of the projected stars
      const visible = pts.filter(Boolean);
      if (visible.length > 1) {
        const cx = visible.reduce((s, p) => s + p.x, 0) / visible.length;
        const cy = visible.reduce((s, p) => s + p.y, 0) / visible.length;
        ctx.font = 'italic 12px Georgia, serif';
        ctx.fillStyle = 'rgba(160,200,255,0.65)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(con.name, cx, cy);
      }
    }
  }

  function drawStars(ctx, W, H, pose, fovH, lat, lon, gmst, maxMag) {
    for (const s of NAMED_STARS_HYG) {
      if (s.mag > maxMag) continue;
      const a = raDecToAzEl(s.raH * 15 * DEG, s.decD * DEG, lat, lon, gmst);
      if (a.elevation < -3) continue;
      // Cheap angular cull before projection.
      if (angularDistance(a.elevation, a.azimuth, pose.pitch, pose.yaw) > fovH * 0.9) continue;
      const p = project(a.elevation, a.azimuth, pose, fovH, W, H);
      if (!p) continue;
      const r = starSize(s.mag);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = starColor(s.mag);
      ctx.fill();
      // Label only for the brightest (mag ≤ 2.5) to avoid clutter
      if (s.mag <= 2.5 && s.name) {
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(220,230,250,0.7)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.name, p.x + r + 3, p.y);
      }
      _lastFrameHits.push({ x: p.x, y: p.y, r: Math.max(8, r + 4), body: { kind: 'star', id: s.id, name: s.name, mag: s.mag, alt: a.elevation, az: a.azimuth }});
    }
  }

  function drawGalaxies(ctx, W, H, pose, fovH, lat, lon, gmst) {
    for (const g of GALAXIES) {
      const a = raDecToAzEl(g.raH * 15 * DEG, g.decD * DEG, lat, lon, gmst);
      if (a.elevation < -3) continue;
      if (angularDistance(a.elevation, a.azimuth, pose.pitch, pose.yaw) > fovH * 0.9) continue;
      const p = project(a.elevation, a.azimuth, pose, fovH, W, H);
      if (!p) continue;
      // Small fuzzy oval — DSOs aren't pinprick points
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 6, 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,128,192,0.35)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,160,210,0.85)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.font = '9px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,180,220,0.85)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(g.name, p.x + 9, p.y);
      _lastFrameHits.push({ x: p.x, y: p.y, r: 12, body: { kind: 'galaxy', id: g.id, name: g.name, mag: g.mag, alt: a.elevation, az: a.azimuth }});
    }
  }

  function drawSatellites(ctx, W, H, pose, fovH, lat, lon, gmst, utcDate) {
    for (const sat of SATELLITES) {
      let sub;
      try { sub = satelliteSubPoint(sat, utcDate); }
      catch (_e) { continue; }
      if (!sub) continue;
      // satelliteSubPoint returns the geographic point under the satellite.
      // For a rough alt/az from the observer, treat as a point at infinity
      // along the observer→sub direction in the local horizontal frame.
      // (Not strictly correct for low orbits but good enough for the
      // overhead-pass overlay we want.)
      const dLat = (sub.latDeg - lat) * DEG;
      const dLon = (sub.lonDeg - lon) * DEG;
      const cosLat = Math.cos(lat * DEG);
      const east  = dLon * cosLat;
      const north = dLat;
      const up    = 1.0;          // ignoring earth curvature for low orbits
      const len   = Math.hypot(east, north, up);
      const az = (Math.atan2(east, north) / DEG + 360) % 360;
      const alt = Math.asin(up / len) / DEG;
      if (alt < 0) continue;
      if (angularDistance(alt, az, pose.pitch, pose.yaw) > fovH * 0.9) continue;
      const p = project(alt, az, pose, fovH, W, H);
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(120,255,160,0.95)';
      ctx.fill();
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(140,255,180,0.85)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('🛰 ' + sat.name, p.x + 8, p.y);
      _lastFrameHits.push({ x: p.x, y: p.y, r: 12, body: { kind: 'satellite', id: sat.id, name: sat.name, alt, az }});
    }
  }

  function drawPlanets(ctx, W, H, pose, fovH, model) {
    const bodies = getAllBodyAzEl(model);
    for (const b of bodies) {
      const p = project(b.el, b.az, pose, fovH, W, H, { padDeg: 5 });
      if (!p) continue;
      const sx = p.x, sy = p.y;
      // Glow halo
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 28);
      grad.addColorStop(0, b.color + 'cc');
      grad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(sx, sy, 28, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      // Dot
      ctx.beginPath();
      ctx.arc(sx, sy, 7, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Symbol
      ctx.font = 'bold 16px Georgia, serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(b.symbol, sx, sy - 10);
      // Name
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.textBaseline = 'top';
      ctx.fillText(b.label, sx, sy + 12);
      // Retrograde
      if (b.retrograde) {
        ctx.font = '10px Georgia, serif';
        ctx.fillStyle = '#ff9090';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText('℞', sx + 10, sy - 10);
      }
      _lastFrameHits.push({ x: sx, y: sy, r: 22, body: { kind: 'planet', id: b.name, name: b.label, alt: b.el, az: b.az, retrograde: b.retrograde }});
    }
  }

  function drawCrosshair(ctx, W, H) {
    const cx = W / 2, cy = H / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 22, cy); ctx.lineTo(cx - 14, cy);
    ctx.moveTo(cx + 14, cy); ctx.lineTo(cx + 22, cy);
    ctx.moveTo(cx, cy - 22); ctx.lineTo(cx, cy - 14);
    ctx.moveTo(cx, cy + 14); ctx.lineTo(cx, cy + 22);
    ctx.stroke();
  }

  function drawStatusStrip(ctx, W, H, pose, fovH, lat, lon, prefs) {
    // Top status: lat/lon, pose, FOV. Right-aligned so it doesn't clash
    // with the close button (top-left).
    ctx.font = '11px ui-monospace, Menlo, monospace';
    ctx.fillStyle = 'rgba(20,22,28,0.55)';
    const text = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°  ·  az ${pose.yaw.toFixed(0)}°  alt ${pose.pitch.toFixed(0)}°  ·  fov ${fovH.toFixed(0)}°`;
    const tw = ctx.measureText(text).width;
    ctx.fillRect(W - tw - 18, 8, tw + 12, 20);
    ctx.fillStyle = 'rgba(232,201,126,0.95)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, W - 12, 18);
  }

  function drawIdentifyTooltip(ctx, W, H, hit) {
    const lines = [
      hit.name || ('(' + hit.kind + ')'),
      `alt ${hit.alt.toFixed(1)}°  az ${hit.az.toFixed(1)}°`
        + (Number.isFinite(hit.mag) ? `  mag ${hit.mag.toFixed(1)}` : ''),
    ];
    ctx.font = '12px system-ui, sans-serif';
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 18;
    const h = 38;
    const tx = Math.max(8, Math.min(W - w - 8, hit.x - w / 2));
    const ty = Math.max(8, hit.y - h - 12);
    ctx.fillStyle = 'rgba(10,12,18,0.85)';
    ctx.strokeStyle = 'rgba(212,160,32,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(tx, ty, w, h);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffe066';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(lines[0], tx + 8, ty + 6);
    ctx.fillStyle = 'rgba(220,225,240,0.9)';
    ctx.fillText(lines[1], tx + 8, ty + 22);
  }

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width:  { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    _stream = stream;
    videoEl.srcObject = stream;
    await videoEl.play();
  }

  async function requestOrientation() {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      const perm = await DeviceOrientationEvent.requestPermission();
      if (perm !== 'granted') throw new Error('Orientation permission denied');
    }
    window.addEventListener('deviceorientation', onOrientation);
    // Fake-sensor driver (?ar-fake=1 + tools/mobile-preview.html "AR
    // mode" checkbox). The head-script in index.html dispatches the
    // 'deviceorientationfake' event from mouse drags.
    window.addEventListener('deviceorientationfake', onOrientation);
    statusEl.textContent = '';
  }

  async function startAR() {
    permCard.hidden = true;
    permError.hidden = true;
    statusEl.textContent = 'Starting camera…';

    try {
      await startCamera();
    } catch (err) {
      permError.textContent = `Camera error: ${err.message || err}. Please allow camera access.`;
      permError.hidden = false;
      permCard.hidden = false;
      statusEl.textContent = '';
      return;
    }

    statusEl.textContent = 'Requesting orientation…';
    try {
      await requestOrientation();
    } catch (err) {
      statusEl.textContent = 'Compass unavailable — pointing may be inaccurate.';
      window.addEventListener('deviceorientation', onOrientation);
      window.addEventListener('deviceorientationfake', onOrientation);
    }
    // If the head-script's fake-sensor driver is already live (?ar-fake=1
    // from the mobile-preview harness), make sure we're listening to it
    // even when the real deviceorientation never arrives.
    if (typeof window !== 'undefined' && window.__AR_FAKE_ORIENTATION__) {
      window.addEventListener('deviceorientationfake', onOrientation);
      // Prime initial values once.
      onOrientation({});
    }

    _running = true;
    renderFrame();
    statusEl.textContent = '';
  }

  function stopAR() {
    _running = false;
    if (_animId) { cancelAnimationFrame(_animId); _animId = null; }
    if (_stream) {
      _stream.getTracks().forEach((t) => t.stop());
      _stream = null;
    }
    window.removeEventListener('deviceorientation', onOrientation);
    window.removeEventListener('deviceorientationfake', onOrientation);
    videoEl.srcObject = null;
  }

  closeBtn.addEventListener('click', hide);
  permStartBtn.addEventListener('click', startAR);

  // ── Layer toggle chips ──────────────────────────────────────────
  const chips = overlay.querySelectorAll('.ar-chip[data-layer]');
  function reflectChips() {
    for (const c of chips) {
      const key = c.dataset.layer;
      c.setAttribute('aria-pressed', _prefs[key] ? 'true' : 'false');
    }
  }
  for (const c of chips) {
    c.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = c.dataset.layer;
      _prefs[key] = !_prefs[key];
      savePrefs(_prefs);
      reflectChips();
    });
  }

  // ── Magnitude slider ─────────────────────────────────────────────
  const magSlider = overlay.querySelector('#ar-mag-slider');
  const magReadout = overlay.querySelector('#ar-mag-readout');
  magSlider.value = String(_prefs.maxStarMag);
  magReadout.textContent = (+magSlider.value).toFixed(1);
  magSlider.addEventListener('input', (e) => {
    _prefs.maxStarMag = parseFloat(e.target.value);
    magReadout.textContent = _prefs.maxStarMag.toFixed(1);
    savePrefs(_prefs);
  });

  // ── FOV slider ───────────────────────────────────────────────────
  const fovSlider  = overlay.querySelector('#ar-fov-slider');
  const fovReadout = overlay.querySelector('#ar-fov-readout');
  fovSlider.value = String(_prefs.fovH);
  fovReadout.textContent = _prefs.fovH.toFixed(0);
  fovSlider.addEventListener('input', (e) => {
    _prefs.fovH = parseFloat(e.target.value);
    fovReadout.textContent = _prefs.fovH.toFixed(0);
    savePrefs(_prefs);
  });

  // ── Compass calibration — tap when crosshair is on a known body ─
  const calibBtn = overlay.querySelector('#ar-calib-btn');
  calibBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Use the brightest body currently within 6° of the screen centre.
    const hit = _lastFrameHits
      .filter((h) => {
        const W = canvasEl.width, H = canvasEl.height;
        return Math.hypot(h.x - W / 2, h.y - H / 2) < Math.min(W, H) * 0.12;
      })
      .sort((a, b) => Math.hypot(a.x - canvasEl.width/2, a.y - canvasEl.height/2)
                    - Math.hypot(b.x - canvasEl.width/2, b.y - canvasEl.height/2))[0];
    if (!hit) {
      statusEl.textContent = 'Aim at a bright body (Sun, Moon, Polaris) and tap Calib again.';
      setTimeout(() => { statusEl.textContent = ''; }, 3500);
      return;
    }
    // True az for that body − current camera yaw = offset.
    const cur = ((parseFloat(_alpha) || 0) + 360) % 360;
    const trueAz = hit.body.az;
    const offset = ((trueAz - (360 - cur) + 540) % 360) - 180;
    _prefs.compassOffset = offset;
    savePrefs(_prefs);
    statusEl.textContent = `Compass calibrated: offset ${offset.toFixed(1)}° (anchor: ${hit.body.name})`;
    setTimeout(() => { statusEl.textContent = ''; }, 4000);
  });

  // ── Tap-to-identify: hit-test the last frame's projection cache. ──
  canvasEl.addEventListener('pointerdown', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvasEl.width  / rect.width);
    const y = (e.clientY - rect.top)  * (canvasEl.height / rect.height);
    let best = null, bestD = Infinity;
    for (const h of _lastFrameHits) {
      const d = Math.hypot(h.x - x, h.y - y);
      if (d < h.r && d < bestD) { best = h; bestD = d; }
    }
    if (best) {
      _identifyHit = best.body;
      _identifyTime = performance.now();
    }
  });
  reflectChips();

  function show() {
    overlay.hidden = false;
    permCard.hidden = false;
    permError.hidden = true;
    statusEl.textContent = '';
    // Reset orientation
    _alpha = 0; _beta = 90;
    resizeCanvas();
  }

  function hide() {
    stopAR();
    overlay.hidden = true;
  }

  window.addEventListener('resize', () => {
    if (!overlay.hidden) resizeCanvas();
  });

  return { show, hide };
}
