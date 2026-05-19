// AR Sky Overlay — camera feed + DeviceOrientation overlay.
//
// Exported: buildArOverlay(model) → { show, hide }
// Triggered from main.js via a 👁 button in the header.

import { isRetrograde } from '../core/astrology.js';

const EPOCH = Date.UTC(2017, 0, 1);

const FOV_H = 60; // horizontal field of view degrees (typical rear camera)
const FOV_V = 40; // vertical FOV degrees

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
  const src = model.state.BodySource || 'epicycle2';
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
  `;
  document.body.appendChild(overlay);

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
  let _alpha    = 0;  // compass heading (degrees, 0=North)
  let _beta     = 90; // device tilt (degrees, 90=upright/vertical)
  let _running  = false;

  function onOrientation(e) {
    if (e.alpha != null) _alpha = e.alpha;
    if (e.beta  != null) _beta  = e.beta;
  }

  function resizeCanvas() {
    canvasEl.width  = overlay.clientWidth  || window.innerWidth;
    canvasEl.height = overlay.clientHeight || window.innerHeight;
  }

  function renderFrame() {
    if (!_running) return;
    _animId = requestAnimationFrame(renderFrame);

    resizeCanvas();
    const W = canvasEl.width;
    const H = canvasEl.height;
    ctx.clearRect(0, 0, W, H);

    const deviceAz = ((_alpha || 0) + 360) % 360;
    // beta: 90 = phone upright (camera faces horizon); 0 = flat on table (camera faces sky)
    const deviceEl = Math.max(-90, Math.min(90, 90 - (_beta || 90)));

    const bodies = getAllBodyAzEl(model);

    for (const b of bodies) {
      const dAz = ((b.az - deviceAz + 540) % 360) - 180; // signed -180..180
      const dEl = b.el - deviceEl;
      if (Math.abs(dAz) > FOV_H / 2 + 10) continue;
      if (Math.abs(dEl) > FOV_V / 2 + 10) continue;

      const sx = W / 2 + dAz * (W / FOV_H);
      const sy = H / 2 - dEl * (H / FOV_V);

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

      // Planet symbol above dot
      ctx.font = 'bold 16px Georgia, serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(b.symbol, sx, sy - 10);

      // Name below dot
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.textBaseline = 'top';
      ctx.fillText(b.label, sx, sy + 12);

      // Retrograde indicator
      if (b.retrograde) {
        ctx.font = '10px Georgia, serif';
        ctx.fillStyle = '#ff9090';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText('℞', sx + 10, sy - 10);
      }
    }

    // Compass rose bottom-right
    drawCompassRose(ctx, W - 54, H - 54, 32, deviceAz);

    // Horizon line (thin) at deviceEl === 0
    const horizY = H / 2 + deviceEl * (H / FOV_V);
    if (horizY > 0 && horizY < H) {
      ctx.beginPath();
      ctx.moveTo(0, horizY);
      ctx.lineTo(W, horizY);
      ctx.strokeStyle = 'rgba(212,160,32,0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
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
    videoEl.srcObject = null;
  }

  closeBtn.addEventListener('click', hide);
  permStartBtn.addEventListener('click', startAR);

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
