// Natal Chart modal — full-screen zodiac wheel + planet positions.
//
// Exported: buildNatalChartModal(model) → { show, hide }
// Triggered from main.js via a ♈ button in the header.

import {
  buildNatalChart,
  ZODIAC_NAMES, ZODIAC_SYMBOLS,
  PLANET_SYMBOLS, PLANET_NAMES_ORDERED,
  ELEMENT_COLORS, ZODIAC_ELEMENT,
  lonToZodiac,
} from '../core/astrology.js';

const EPOCH = Date.UTC(2017, 0, 1);

function dtToDate(dt) {
  return new Date(EPOCH + dt * 86400000);
}

function toDateInputValue(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toTimeInputValue(d) {
  const h = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

function inputsToDate(dateVal, timeVal) {
  return new Date(`${dateVal}T${timeVal || '00:00'}:00Z`);
}

/**
 * Draw the zodiac wheel onto a canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W canvas width
 * @param {number} H canvas height
 * @param {object} chart result of buildNatalChart()
 */
function drawWheel(ctx, W, H, chart) {
  const cx = W / 2;
  const cy = H / 2;
  const outerR  = Math.min(W, H) * 0.46;
  const innerR  = outerR * 0.70;  // planet ring inner edge
  const centerR = outerR * 0.42;  // inner clear circle

  ctx.clearRect(0, 0, W, H);

  // Dark sky background
  ctx.fillStyle = '#0c0906';
  ctx.fillRect(0, 0, W, H);

  // ── Zodiac segments ──────────────────────────────────────────────────────
  for (let i = 0; i < 12; i++) {
    const name  = ZODIAC_NAMES[i];
    const elem  = ZODIAC_ELEMENT[name];
    const col   = ELEMENT_COLORS[elem];
    const start = (i * 30 - 90) * Math.PI / 180;
    const end   = ((i + 1) * 30 - 90) * Math.PI / 180;

    // Fill segment
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, start, end);
    ctx.closePath();
    ctx.fillStyle = col + '55'; // translucent
    ctx.fill();
    ctx.strokeStyle = '#6a3e1c';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Radial divider lines
    ctx.beginPath();
    ctx.moveTo(cx + centerR * Math.cos(start), cy + centerR * Math.sin(start));
    ctx.lineTo(cx + outerR * Math.cos(start), cy + outerR * Math.sin(start));
    ctx.strokeStyle = 'rgba(212,160,32,0.5)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Zodiac glyph at mid-segment
    const midAng = start + 15 * Math.PI / 180;
    const glyphR = (outerR + innerR) / 2;
    const gx = cx + glyphR * Math.cos(midAng);
    const gy = cy + glyphR * Math.sin(midAng);
    ctx.font = `${Math.round(outerR * 0.11)}px Georgia, serif`;
    ctx.fillStyle = '#f2e6b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ZODIAC_SYMBOLS[i], gx, gy);
  }

  // Outer ring border
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.strokeStyle = '#d4a020';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner ring border
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(212,160,32,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Center circle
  ctx.beginPath();
  ctx.arc(cx, cy, centerR, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, centerR);
  grad.addColorStop(0, '#1e1408');
  grad.addColorStop(1, '#0c0906');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(212,160,32,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Earth symbol in center
  ctx.font = `${Math.round(centerR * 0.28)}px Georgia, serif`;
  ctx.fillStyle = '#4488cc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⊕', cx, cy);

  // ── ASC line ────────────────────────────────────────────────────────────
  const ascAng = (chart.ascLon - 90) * Math.PI / 180;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + outerR * Math.cos(ascAng), cy + outerR * Math.sin(ascAng));
  ctx.strokeStyle = '#d4a020';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  // ASC label
  const ascLx = cx + (outerR + 12) * Math.cos(ascAng);
  const ascLy = cy + (outerR + 12) * Math.sin(ascAng);
  ctx.font = 'bold 11px Georgia, serif';
  ctx.fillStyle = '#d4a020';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ASC', ascLx, ascLy);

  // ── MC line ─────────────────────────────────────────────────────────────
  const mcAng = (chart.mcLon - 90) * Math.PI / 180;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + outerR * Math.cos(mcAng), cy + outerR * Math.sin(mcAng));
  ctx.strokeStyle = '#a0c0e0';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  const mcLx = cx + (outerR + 12) * Math.cos(mcAng);
  const mcLy = cy + (outerR + 12) * Math.sin(mcAng);
  ctx.font = '10px Georgia, serif';
  ctx.fillStyle = '#a0c0e0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MC', mcLx, mcLy);

  // ── Planet dots & symbols ────────────────────────────────────────────────
  const planetR = (innerR + centerR) / 2;
  const DOT_COLORS = {
    sun: '#ffe066', moon: '#c8d8f0', mercury: '#b0b0b8',
    venus: '#e8e080', mars: '#e06040', jupiter: '#d4a8c4', saturn: '#ceb860',
  };

  // Collect angles to detect clusters and offset them
  const placed = [];
  for (const p of chart.planets) {
    let ang = (p.lon - 90) * Math.PI / 180;
    // Nudge if too close to already-placed planet
    let tries = 0;
    while (tries < 12) {
      const conflict = placed.find((q) => {
        let d = Math.abs(ang - q.ang);
        if (d > Math.PI) d = 2 * Math.PI - d;
        return d < 0.18;
      });
      if (!conflict) break;
      ang += 0.18;
      tries++;
    }
    placed.push({ ang, p });
  }

  for (const { ang, p } of placed) {
    const px = cx + planetR * Math.cos(ang);
    const py = cy + planetR * Math.sin(ang);
    const col = DOT_COLORS[p.name] || '#f2e6b8';

    // Glow
    const grd = ctx.createRadialGradient(px, py, 0, px, py, 14);
    grd.addColorStop(0, col + 'aa');
    grd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(px, py, 14, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Dot
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();

    // Symbol above dot
    ctx.font = `bold ${Math.round(outerR * 0.09)}px Georgia, serif`;
    ctx.fillStyle = col;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(p.symbol, px, py - 7);

    // Retrograde marker
    if (p.retrograde) {
      ctx.font = `${Math.round(outerR * 0.07)}px Georgia, serif`;
      ctx.fillStyle = '#ff9090';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('℞', px + 7, py - 7);
    }

    // Thin line from planet to edge of center circle
    ctx.beginPath();
    ctx.moveTo(cx + centerR * Math.cos(ang), cy + centerR * Math.sin(ang));
    ctx.lineTo(px - 6 * Math.cos(ang), py - 6 * Math.sin(ang));
    ctx.strokeStyle = col + '55';
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
}

/**
 * Build the natal chart modal and return { show, hide }.
 * @param {import('../core/app.js').FeModel} model
 */
export function buildNatalChartModal(model) {
  // ── Overlay container ──────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'natal-chart-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="nc-modal" role="dialog" aria-modal="true" aria-label="Natal Chart">
      <div class="nc-header">
        <span class="nc-title">♈ Natal Chart</span>
        <button class="nc-close" type="button" aria-label="Close natal chart">✕</button>
      </div>

      <div class="nc-controls">
        <div class="nc-ctrl-row">
          <label class="nc-lbl">Birth date</label>
          <input class="nc-input" type="date" id="nc-date-input">
        </div>
        <div class="nc-ctrl-row">
          <label class="nc-lbl">Birth time (UTC)</label>
          <input class="nc-input" type="time" id="nc-time-input">
          <button class="nc-btn" id="nc-now-btn" type="button">Use now</button>
        </div>
        <div class="nc-ctrl-row">
          <label class="nc-lbl">Location</label>
          <span class="nc-loc-label" id="nc-loc-label">—</span>
          <button class="nc-btn" id="nc-loc-btn" type="button">Use observer</button>
        </div>
      </div>

      <canvas class="nc-canvas" id="nc-canvas" width="500" height="500"></canvas>

      <div class="nc-planet-list" id="nc-planet-list"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const modal      = overlay.querySelector('.nc-modal');
  const closeBtn   = overlay.querySelector('.nc-close');
  const dateInput  = overlay.querySelector('#nc-date-input');
  const timeInput  = overlay.querySelector('#nc-time-input');
  const nowBtn     = overlay.querySelector('#nc-now-btn');
  const locLabel   = overlay.querySelector('#nc-loc-label');
  const locBtn     = overlay.querySelector('#nc-loc-btn');
  const canvas     = overlay.querySelector('#nc-canvas');
  const planetList = overlay.querySelector('#nc-planet-list');
  const ctx        = canvas.getContext('2d');

  // Current chart params
  let chartLat = model.state.ObserverLat  || 0;
  let chartLon = model.state.ObserverLong || 0;

  function syncInputsToNow() {
    const d = dtToDate(model.state.DateTime || 0);
    dateInput.value = toDateInputValue(d);
    timeInput.value = toTimeInputValue(d);
  }

  function updateLocLabel() {
    const lat = chartLat.toFixed(2);
    const lon = chartLon.toFixed(2);
    const ns = chartLat >= 0 ? 'N' : 'S';
    const ew = chartLon >= 0 ? 'E' : 'W';
    locLabel.textContent = `${Math.abs(lat)}°${ns} / ${Math.abs(lon)}°${ew}`;
  }

  function redraw() {
    const date = inputsToDate(dateInput.value, timeInput.value);
    if (isNaN(date.getTime())) return;
    const src = model.state.BodySource || 'ibnshatir';
    let chart;
    try {
      chart = buildNatalChart(date, chartLat, chartLon, src);
    } catch (err) {
      console.warn('Natal chart error:', err);
      return;
    }

    // Resize canvas to fit
    const size = Math.min(500, overlay.clientWidth - 48);
    canvas.width  = size;
    canvas.height = size;
    drawWheel(ctx, size, size, chart);
    renderPlanetList(chart);
  }

  function renderPlanetList(chart) {
    let html = '';
    for (const p of chart.planets) {
      const z = p.zodiac;
      const retStr = p.retrograde ? ' <span class="nc-retro">℞</span>' : '';
      html += `<div class="nc-prow">
        <span class="nc-psym">${p.symbol}</span>
        <span class="nc-pname">${p.name.charAt(0).toUpperCase() + p.name.slice(1)}:</span>
        <span class="nc-ppos">${z.sign} ${z.symbol} ${z.deg}°${String(z.min).padStart(2,'0')}'${retStr}</span>
      </div>`;
    }
    // ASC row
    const a = chart.ascendant;
    html += `<div class="nc-prow nc-asc-row">
      <span class="nc-psym">↑</span>
      <span class="nc-pname">Rising:</span>
      <span class="nc-ppos">${a.sign} ${a.symbol} ${a.deg}°${String(a.min).padStart(2,'0')}'</span>
    </div>`;
    // MC row
    const m = chart.mc;
    html += `<div class="nc-prow nc-mc-row">
      <span class="nc-psym">↑</span>
      <span class="nc-pname">MC:</span>
      <span class="nc-ppos">${m.sign} ${m.symbol} ${m.deg}°${String(m.min).padStart(2,'0')}'</span>
    </div>`;
    planetList.innerHTML = html;
  }

  // ── Event wiring ─────────────────────────────────────────────────────────
  closeBtn.addEventListener('click', hide);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hide();
  });

  nowBtn.addEventListener('click', () => {
    syncInputsToNow();
    redraw();
  });

  locBtn.addEventListener('click', () => {
    chartLat = model.state.ObserverLat  || 0;
    chartLon = model.state.ObserverLong || 0;
    updateLocLabel();
    redraw();
  });

  dateInput.addEventListener('change', redraw);
  timeInput.addEventListener('change', redraw);

  function show() {
    syncInputsToNow();
    chartLat = model.state.ObserverLat  || 0;
    chartLon = model.state.ObserverLong || 0;
    updateLocLabel();
    overlay.hidden = false;
    // Defer draw until layout is ready
    requestAnimationFrame(redraw);
  }

  function hide() {
    overlay.hidden = true;
  }

  return { show, hide };
}
