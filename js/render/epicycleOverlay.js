// Animated corner inset — live Ptolemaic geometry for whichever body the
// user is currently tracking.  Runs a requestAnimationFrame loop so the
// circles move smoothly in sync with the simulation's time.
//
// Drag to reposition: click-and-drag anywhere on the canvas.  The last
// position is saved to localStorage so it survives page reloads.
//
// Diagram style mirrors the Almagest figures:
//   Sun     → eccentric model (Book III) — Earth ≠ orbit centre
//   Moon    → deferent + epicycle (Book V) — simplified, evection omitted
//   Outer   → bisected eccentricity (Book IX–XI): Earth (Z), deferent
//             centre (D), equant (Q), apogee (A), perigee (G)
//   Inner   → Sun-anchored deferent (Book IX): epicycle anomaly gives
//             elongation from Sun; equant governs uniform motion
//   Neptune → synthetic outer model (not in Almagest)

import { epicycleGeometry } from '../core/ephemerisPtolemy.js';
import { JUPITER_MOON_DEFS } from '../core/jupiterMoons.js';

// Build a fast lookup map: moonId → moonDef
const _JMOON_MAP = new Map(JUPITER_MOON_DEFS.map((m) => [m.id, m]));

// Group labels for the info strip / title
const JMOON_GROUP = {
  metis: 'Inner moon', adrastea: 'Inner moon', amalthea: 'Inner moon', thebe: 'Inner moon',
  io: 'Galilean', europa: 'Galilean', ganymede: 'Galilean', callisto: 'Galilean',
  leda: 'Himalia group', himalia: 'Himalia group', lysithea: 'Himalia group', elara: 'Himalia group',
  ananke: 'Retrograde ↺', carme: 'Retrograde ↺', pasiphae: 'Retrograde ↺', sinope: 'Retrograde ↺',
};

// Laplace resonance badge (Io:Europa:Ganymede = 1:2:4)
const JMOON_LAPLACE = { io: '1:2:4', europa: '1:2:4', ganymede: '1:2:4' };

// Canvas colors — matching JUPITER_MOON_COLORS in jupiterMoons.js
const JMOON_COLORS = {
  metis: '#888898', adrastea: '#888898', amalthea: '#aa8866', thebe: '#b09070',
  io: '#ffe060', europa: '#b8ddf0', ganymede: '#c8b890', callisto: '#8899aa',
  leda: '#7788a0', himalia: '#7788a0', lysithea: '#7fa898', elara: '#a09878',
  ananke: '#c87890', carme: '#c87888', pasiphae: '#b888c8', sinope: '#9898c8',
};

// Bump this version whenever the saved schema changes (v4: position:fixed).
const STORE_VERSION = 4;

const MIN_SIZE = 160;   // smallest the overlay can be dragged to (CSS px)
const MAX_SIZE = 520;   // largest

const ALL_BODIES = new Set([
  'sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'neptune',
]);

const BODY_COLORS = {
  sun:     '#ffe066',
  moon:    '#c8d8f0',
  mercury: '#b0b0b8',
  venus:   '#e8e080',
  mars:    '#e06040',
  jupiter: '#d4a8c4',
  saturn:  '#ceb860',
  neptune: '#6080e0',
};

const BODY_LABELS = {
  sun:     'Sun',
  moon:    'Moon',
  mercury: 'Mercury',
  venus:   'Venus',
  mars:    'Mars',
  jupiter: 'Jupiter',
  saturn:  'Saturn',
  neptune: 'Neptune',
};

// Display eccentricities for the bisected-eccentricity diagram.
// These are Earth→equant distances as a fraction of the deferent radius.
// Slightly exaggerated from true Ptolemaic values so the offset is
// visible at 280 px. Mars is large enough to need no exaggeration.
//   True Ptolemaic: Mars 0.20, Jupiter 0.046, Saturn 0.057
const BODY_ECC = {
  mars:    0.18,
  jupiter: 0.09,
  saturn:  0.10,
  neptune: 0.07,   // synthetic
};

// Subtitle and formula lines per model type
const MODEL_META = {
  outer: {
    subtitle: 'Deferent + Epicycle + Equant',
    lines: [
      'λ = L̄ + eq.centre(D,Q) + eq.anomaly(Θ)',
      'Uniform motion as seen from Q (equant)',
    ],
  },
  inner: {
    subtitle: 'Sun-anchored Deferent + Epicycle',
    lines: [
      'Deferent centre follows Sun’s mean longitude',
      'λ = ☉̅ + eq.anomaly  (elongation from Sun)',
    ],
  },
  moon: {
    subtitle: 'Deferent + Epicycle (Book V)',
    lines: [
      'λ = L̄m + eq.centre(Mm) + evection terms',
      'Epicycle anomaly ≈ 2× elongation from Sun',
    ],
  },
  eccentric: {
    subtitle: 'Eccentric Deferent (Book III)',
    lines: [
      'λ = L̄☉ + eq.centre(e)',
      'Earth (Z) ≠ centre of orbit — no epicycle',
    ],
  },
  jmoon: {
    subtitle: 'Compound Epicycle (Ptolemaic)',
    lines: [
      'pos(t) = ♃RA + r·cos(ωt + φ₀)',
      'Two angular rates · one observer · zero globe constants',
    ],
  },
};

const CSS_SIZE  = 280;   // logical CSS pixels (square)
const TITLE_H   =  38;   // px reserved for title strip (≥ innerPad=17 + font clearance)
const INFO_H    =  60;   // px reserved for formula strip at bottom (≥ bottom fret=15 + 4 lines)
// Greek border geometry constants (mirrors _drawGreekBorder):
const _BORDER_PAD   = 4;   // outer frame offset from canvas edge
const _FRET_H       = 9;   // fret strip height
const _INNER_PAD    = _BORDER_PAD + _FRET_H + 4;  // = 17 — safe y for text
const STORE_KEY = 'epicycle-overlay-pos';

export class EpicycleOverlay {
  constructor(canvas, model) {
    this._canvas   = canvas;
    this._model    = model;
    this._ctx      = canvas.getContext('2d');
    this._dpr      = 1;
    this._cssSize  = CSS_SIZE;   // current size in CSS px — updated by resize
    this._dragging = false;
    this._dragOffX = 0;
    this._dragOffY = 0;
    this._resizing      = false;
    this._resizeStartX  = 0;
    this._resizeStartY  = 0;
    this._resizeStartSz = 0;

    this._setSize();
    this._loadPosition();
    this._attachDrag();

    // RAF loop — reads model state each frame so animation rate exactly
    // matches the simulation's playback speed.
    const tick = () => {
      this._draw();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    window.addEventListener('resize', () => this._setSize());
  }

  _setSize() {
    const dpr = window.devicePixelRatio || 1;
    const sz  = this._cssSize;
    this._canvas.width  = sz * dpr;
    this._canvas.height = sz * dpr;
    // Also keep the CSS dimensions in sync so the element occupies the
    // right amount of screen real estate after a resize drag.
    this._canvas.style.width  = `${sz}px`;
    this._canvas.style.height = `${sz}px`;
    this._dpr = dpr;
  }

  // Restore saved bottom/right position + size; fall back to CSS defaults.
  // Discards positions saved by older versions to avoid layout surprises.
  _loadPosition() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (saved && saved.v === STORE_VERSION
          && typeof saved.right === 'number' && typeof saved.bottom === 'number') {
        // Restore size first so positioning math uses the right value.
        if (typeof saved.size === 'number') {
          this._cssSize = Math.max(MIN_SIZE, Math.min(MAX_SIZE, saved.size));
          this._setSize();
        }
        const sz        = this._cssSize;
        const minBottom = 136;   // stay above 122px bar + 14px clearance
        const maxBottom = Math.max(minBottom, window.innerHeight - sz);
        const bottom    = Math.max(minBottom, Math.min(maxBottom, saved.bottom));
        const right     = Math.max(0, Math.min(window.innerWidth - sz, saved.right));
        this._canvas.style.right  = `${right}px`;
        this._canvas.style.bottom = `${bottom}px`;
        this._canvas.style.left   = 'auto';
        this._canvas.style.top    = 'auto';
      } else if (saved) {
        // Old version — clear stale data so CSS defaults apply.
        localStorage.removeItem(STORE_KEY);
      }
    } catch (_e) { /* ignore corrupt storage */ }
  }

  _savePosition(right, bottom) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(
        { v: STORE_VERSION, right, bottom, size: this._cssSize }
      ));
    } catch (_e) {}
  }

  _attachDrag() {
    const el = this._canvas;

    // Bottom-left 28×28 CSS-px corner is the resize handle.
    // The overlay is anchored bottom-right, so dragging that corner
    // toward the upper-left grows the panel; toward lower-right shrinks it.
    const inResizeZone = (localX, localY) => {
      const sz = this._cssSize;
      return localX < 28 && localY > sz - 28;
    };

    // ── Pointer start ──────────────────────────────────────────────────
    const onStart = (clientX, clientY, isTouch) => {
      const rect  = el.getBoundingClientRect();
      const zoom  = parseFloat(getComputedStyle(el).zoom) || 1;
      const localX = (clientX - rect.left) / zoom;
      const localY = (clientY - rect.top)  / zoom;

      if (inResizeZone(localX, localY)) {
        // ── Resize mode ──
        this._resizing      = true;
        this._resizeStartX  = clientX;
        this._resizeStartY  = clientY;
        this._resizeStartSz = this._cssSize;
        el.style.cursor     = 'nesw-resize';
      } else {
        // ── Drag/move mode ──
        this._dragging = true;
        el.style.cursor = 'grabbing';
        this._dragOffX = clientX - rect.left;
        this._dragOffY = clientY - rect.top;
        // Switch to left/top positioning so movement maths is simple.
        el.style.left   = `${rect.left}px`;
        el.style.top    = `${rect.top}px`;
        el.style.right  = 'auto';
        el.style.bottom = 'auto';
      }
    };

    // ── Pointer move ───────────────────────────────────────────────────
    const onMove = (clientX, clientY) => {
      if (this._resizing) {
        // Diagonal drag: left OR up = bigger; right OR down = smaller.
        const dx    = this._resizeStartX - clientX;
        const dy    = this._resizeStartY - clientY;
        const delta = (dx + dy) / 2;
        const newSz = Math.max(MIN_SIZE, Math.min(MAX_SIZE,
                        Math.round(this._resizeStartSz + delta)));
        if (newSz !== this._cssSize) {
          this._cssSize = newSz;
          this._setSize();
        }
        return;
      }
      if (!this._dragging) return;
      const zoom   = parseFloat(getComputedStyle(el).zoom) || 1;
      const vw     = window.innerWidth;
      const vh     = window.innerHeight;
      const size   = this._cssSize * zoom;
      let newLeft  = clientX - this._dragOffX;
      let newTop   = clientY - this._dragOffY;
      newLeft = Math.max(0, Math.min(vw - size, newLeft));
      newTop  = Math.max(0, Math.min(vh - size, newTop));
      el.style.left = `${newLeft}px`;
      el.style.top  = `${newTop}px`;
    };

    // ── Pointer end ────────────────────────────────────────────────────
    const onEnd = () => {
      if (!this._dragging && !this._resizing) return;
      const wasResizing = this._resizing;
      this._dragging = false;
      this._resizing = false;
      el.style.cursor = 'grab';

      // Convert back to right/bottom anchoring and save.
      const rect   = el.getBoundingClientRect();
      const zoom   = parseFloat(getComputedStyle(el).zoom) || 1;
      const size   = this._cssSize * zoom;
      const right  = Math.max(0, window.innerWidth  - rect.left - size);
      const bottom = Math.max(136, Math.min(window.innerHeight - size, window.innerHeight - rect.top - size));
      el.style.right  = `${right}px`;
      el.style.bottom = `${bottom}px`;
      el.style.left   = 'auto';
      el.style.top    = 'auto';
      this._savePosition(right, bottom);
    };

    // ── Cursor hint on hover (desktop) ─────────────────────────────────
    el.addEventListener('mousemove', (e) => {
      if (this._dragging || this._resizing) return;
      const rect  = el.getBoundingClientRect();
      const zoom  = parseFloat(getComputedStyle(el).zoom) || 1;
      const localX = (e.clientX - rect.left) / zoom;
      const localY = (e.clientY - rect.top)  / zoom;
      el.style.cursor = inResizeZone(localX, localY) ? 'nesw-resize' : 'grab';
    });
    el.addEventListener('mouseleave', () => {
      if (!this._dragging && !this._resizing) el.style.cursor = 'grab';
    });

    // ── Mouse events ───────────────────────────────────────────────────
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      onStart(e.clientX, e.clientY, false);
    });
    window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup',   () => onEnd());

    // ── Touch events (drag OR resize via corner handle) ────────────────
    el.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        // Single touch: drag or resize (corner handle)
        const t = e.touches[0];
        onStart(t.clientX, t.clientY, true);
      } else if (e.touches.length === 2) {
        // Two-finger pinch to resize
        this._dragging = false;
        this._resizing = true;
        const t0 = e.touches[0], t1 = e.touches[1];
        this._pinchStartDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        this._resizeStartSz  = this._cssSize;
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (!this._dragging && !this._resizing) return;
      e.preventDefault();
      if (this._resizing && e.touches.length === 2) {
        // Pinch: scale size proportionally to distance change
        const t0 = e.touches[0], t1 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        const newSz = Math.max(MIN_SIZE, Math.min(MAX_SIZE,
                        Math.round(this._resizeStartSz * (dist / this._pinchStartDist))));
        if (newSz !== this._cssSize) {
          this._cssSize = newSz;
          this._setSize();
        }
        return;
      }
      if (e.touches.length === 1) {
        const t = e.touches[0];
        onMove(t.clientX, t.clientY);
      }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) onEnd();
    });
  }

  _draw() {
    const s   = this._model.state;
    const ctx = this._ctx;
    const dpr = this._dpr;
    const sz  = this._cssSize;    // dynamic — updated by resize drags

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, sz, sz);

    const follow    = s.FollowTarget;
    const isJupMoon = typeof follow === 'string' && follow.startsWith('jmoon:');
    const moonId    = isJupMoon ? follow.slice(6) : null;
    const body      = isJupMoon ? follow
      : (typeof follow === 'string' && ALL_BODIES.has(follow)) ? follow : 'mars';

    // Per-body animation rates (days per real-second) — see VIZ_DPS_MAP below.
    const VIZ_DPS_MAP = {
      moon:    2,   sun:    15,   mercury: 6,   venus:  10,
      mars:   25,   jupiter:120,  saturn: 250,  neptune:800,
      // Inner moons (very fast — tiny epicycles, short periods)
      'jmoon:metis':    2,  'jmoon:adrastea': 2,
      'jmoon:amalthea': 2,  'jmoon:thebe':    2,
      // Galilean moons — 6 d/s → Io ~3 s/orbit, Callisto ~28 s/orbit
      'jmoon:io':       6,  'jmoon:europa':   6,
      'jmoon:ganymede': 6,  'jmoon:callisto': 6,
      // Himalia group (prograde distant, ~250-day periods)
      'jmoon:leda':    200, 'jmoon:himalia':  200,
      'jmoon:lysithea':200, 'jmoon:elara':    200,
      // Retrograde outer moons (~630–760-day periods)
      'jmoon:ananke':  600, 'jmoon:carme':    700,
      'jmoon:pasiphae':700, 'jmoon:sinope':   700,
    };

    const now = performance.now();
    const dt  = this._lastRaf !== undefined ? (now - this._lastRaf) / 1000 : 0;
    this._lastRaf = now;

    // Reset accumulated days when the tracked body changes so the diagram
    // always starts from a sensible position rather than inheriting days
    // accumulated at a different body's rate.
    if (this._lastBody !== body) {
      this._animDays = 0;
      this._lastBody = body;
    }
    // Sync animation with the simulation autoplay state.
    // • Paused → do not advance the diagram at all.
    // • Speed multiplier (½×, 2×, …) scales the visual rate proportionally.
    // • Reverse playback (negative speed) runs the diagram backwards.
    const ap = this._model && this._model._autoplay;
    let effectiveDPS = 0;
    if (!ap || ap.playing) {
      const BASE_DPS   = 1 / 24;          // 1× autoplay = 1 day / 24 s
      const simSpeed   = ap ? ap.speed : BASE_DPS;
      const speedRatio = Math.abs(simSpeed) / BASE_DPS;
      const direction  = simSpeed >= 0 ? 1 : -1;
      effectiveDPS = direction * (VIZ_DPS_MAP[body] ?? 50) * Math.min(speedRatio, 16);
    }
    this._animDays = (this._animDays || 0) + dt * effectiveDPS;
    const EPOCH_MS  = 946684800000; // 2000-01-01 UTC
    const animDate  = new Date(EPOCH_MS + this._animDays * 86400000);

    // Jupiter-moon branch: build a synthetic geo object instead of querying Ptolemy
    let geo, col, label, moonDef = null;
    if (isJupMoon) {
      moonDef = _JMOON_MAP.get(moonId);
      if (!moonDef) return;
      // Jupiter's deferent rate (Almagest: 0.08312386°/day sidereal)
      const JUP_NLONG = 0.08312386;
      const jupAngle  = ((this._animDays * JUP_NLONG) % 360 + 360) % 360;
      const moonRate  = 360 / moonDef.period;   // °/day (negative = retrograde)
      const moonAngle = ((moonDef.l0 + this._animDays * moonRate) % 360 + 360) % 360;
      geo   = { type: 'jmoon', jupAngle, moonAngle, moonDef };
      col   = JMOON_COLORS[moonId] || '#aabbcc';
      label = moonDef.name;
    } else {
      geo = epicycleGeometry(body, animDate);
      if (!geo) return;
      col   = BODY_COLORS[body] || '#f4a640';
      label = BODY_LABELS[body] || body;
    }

    // ── Panel background — warm parchment, semi-transparent ──────────
    // Radial gradient so edges darken slightly like aged papyrus.
    const bgGrad = ctx.createRadialGradient(sz/2, sz/2, 0, sz/2, sz/2, sz * 0.72);
    bgGrad.addColorStop(0,   'rgba(22, 12, 4, 0.76)');
    bgGrad.addColorStop(0.6, 'rgba(18,  9, 3, 0.82)');
    bgGrad.addColorStop(1,   'rgba(10,  5, 1, 0.90)');
    _roundRect(ctx, 0, 0, sz, sz, 10);
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // ── Greek meander border ─────────────────────────────────────────
    _drawGreekBorder(ctx, sz);

    // ── Title strip ─────────────────────────────────────────────────
    _drawTitle(ctx, sz, col, label, geo);

    // ── Diagram area ─────────────────────────────────────────────────
    const diagY  = TITLE_H;
    const diagH  = sz - TITLE_H - INFO_H;
    const cx     = sz / 2;
    const cy     = diagY + diagH / 2;
    const maxR   = Math.min(cx, diagH / 2) - 18;

    if (geo.type === 'jmoon') {
      _drawJupiterMoon(ctx, cx, cy, maxR, col, label, moonDef, geo.jupAngle, geo.moonAngle, sz);
    } else if (geo.type === 'eccentric') {
      _drawEccentric(ctx, cx, cy, maxR, col, label, geo);
    } else if (body === 'moon') {
      _drawMoon(ctx, cx, cy, maxR, col, geo);
    } else if (body === 'mercury' || body === 'venus') {
      _drawInnerPlanet(ctx, cx, cy, maxR, col, label, geo);
    } else {
      _drawOuterPlanet(ctx, cx, cy, maxR, col, label, body, geo);
    }

    // ── Formula strip ─────────────────────────────────────────────────
    _drawInfoStrip(ctx, sz, geo, body, col);

    // ── Resize grip — bottom-left corner ─────────────────────────────
    // Three diagonal lines pointing toward the upper-left; matches the
    // nesw-resize cursor and the direction of the resize drag.
    ctx.save();
    ctx.strokeStyle = 'rgba(212, 160, 32, 0.55)';
    ctx.lineWidth   = 1;
    ctx.lineCap     = 'round';
    for (let i = 0; i < 3; i++) {
      const off = 5 + i * 4;        // staggered offsets from corner
      ctx.beginPath();
      ctx.moveTo(6,       sz - 6 - off);   // top of line (going left)
      ctx.lineTo(6 + off, sz - 6);          // bottom of line (going right)
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function _roundRect(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath(); ctx.rect(x, y, w, h);
  }
}

// Build a 24×8 step-key (Greek fret) tile canvas.
// Cached per colour so we don't recreate every frame.
const _fretCache = new Map();
function _makeGreekFretTile(color) {
  if (_fretCache.has(color)) return _fretCache.get(color);
  const tc = document.createElement('canvas');
  tc.width = 24; tc.height = 8;
  const tx = tc.getContext('2d');
  tx.strokeStyle = color;
  tx.lineWidth = 1.5;
  tx.lineCap  = 'square';
  tx.lineJoin = 'miter';
  tx.beginPath();
  tx.moveTo(0, 2); tx.lineTo(8,  2);
  tx.lineTo(8, 6); tx.lineTo(16, 6);
  tx.lineTo(16,2); tx.lineTo(24, 2);
  tx.stroke();
  _fretCache.set(color, tc);
  return tc;
}

// Ptolemaic Greek border: outer gold frame + meander strip top & bottom +
// inner hair-line + filled corner squares.
function _drawGreekBorder(ctx, sz) {
  const GOLD   = 'rgba(212, 160, 32, 0.90)';
  const GOLDFAINT = 'rgba(212, 160, 32, 0.38)';
  const pad = 4;   // outer frame offset from edge
  const fH  = 9;   // fret strip height (px)

  // ── Outer gold frame ────────────────────────────────────────────────
  ctx.strokeStyle = GOLD;
  ctx.lineWidth   = 1.2;
  ctx.strokeRect(pad + 0.6, pad + 0.6, sz - 2*pad - 1.2, sz - 2*pad - 1.2);

  // ── Fret tile strips (top and bottom, inside the outer frame) ───────
  const tile = _makeGreekFretTile(GOLD);
  const stripX = pad + 2;
  const stripW = sz - 2 * (pad + 2);

  // Top strip
  ctx.save();
  ctx.beginPath();
  ctx.rect(stripX, pad + 2, stripW, fH);
  ctx.clip();
  for (let x = stripX; x < stripX + stripW + 24; x += 24) {
    ctx.drawImage(tile, x, pad + 2);
  }
  ctx.restore();

  // Bottom strip (flipped vertically so steps face inward)
  ctx.save();
  ctx.translate(0, sz);
  ctx.scale(1, -1);
  ctx.beginPath();
  ctx.rect(stripX, pad + 2, stripW, fH);
  ctx.clip();
  for (let x = stripX; x < stripX + stripW + 24; x += 24) {
    ctx.drawImage(tile, x, pad + 2);
  }
  ctx.restore();

  // ── Inner hair-line (below top fret, above bottom fret) ─────────────
  const innerPad = pad + fH + 4;
  ctx.strokeStyle = GOLDFAINT;
  ctx.lineWidth   = 0.7;
  ctx.strokeRect(
    innerPad + 0.35, innerPad + 0.35,
    sz - 2*innerPad - 0.7, sz - 2*innerPad - 0.7,
  );

  // ── Corner squares (4 corners of the outer frame) ───────────────────
  const cs = 4;
  ctx.fillStyle = GOLD;
  [ [pad, pad], [sz-pad-cs, pad], [pad, sz-pad-cs], [sz-pad-cs, sz-pad-cs] ]
    .forEach(([x, y]) => ctx.fillRect(x, y, cs, cs));
}

/** Small labelled dot at (x,y) */
function _dot(ctx, x, y, r, fill, label, lx, ly, lCol) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (label) {
    ctx.font = 'bold italic 9px Georgia, "Palatino Linotype", serif';
    ctx.fillStyle = lCol || fill;
    ctx.textAlign = lx >= x ? 'left' : 'right';
    ctx.textBaseline = ly >= y ? 'top' : 'bottom';
    ctx.fillText(label, lx, ly);
  }
}

/** Earth symbol (⊕) */
function _earthDot(ctx, x, y) {
  const r = 5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#3a7acc';
  ctx.fill();
  ctx.strokeStyle = '#7ab8f0';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Cross
  ctx.beginPath();
  ctx.moveTo(x - r, y); ctx.lineTo(x + r, y);
  ctx.moveTo(x, y - r); ctx.lineTo(x, y + r);
  ctx.strokeStyle = '#7ab8f0';
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

/** Apogee / Perigee badge (A or G) */
function _apsisBadge(ctx, x, y, letter, color) {
  const r = 7;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.font = 'bold 8px Georgia, serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, x, y + 0.5);
}

/** Draw a line segment */
function _line(ctx, x1, y1, x2, y2, style, width, dash) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash); else ctx.setLineDash([]);
  ctx.stroke();
  ctx.setLineDash([]);
}

/** Circle (no fill) */
function _circle(ctx, cx, cy, r, style, width, dash) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash); else ctx.setLineDash([]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function _drawTitle(ctx, sz, col, label, geo) {
  // Warm parchment title band — slightly lighter than body background
  ctx.fillStyle = 'rgba(212, 160, 32, 0.07)';
  ctx.fillRect(0, 0, sz, TITLE_H);
  // Separator: faint gold line at bottom of title band
  _line(ctx, 14, TITLE_H - 0.5, sz - 14, TITLE_H - 0.5, 'rgba(212, 160, 32, 0.28)', 0.6);

  ctx.textBaseline = 'middle';
  // Center text in the safe zone between inner hairline (_INNER_PAD=17) and
  // the title separator (TITLE_H=38), so it never overlaps the Greek fret.
  const midY = Math.round((_INNER_PAD + TITLE_H) / 2) + 1;

  // Body name — bold italic Georgia, body's own colour
  ctx.font = 'bold italic 13px Georgia, "Palatino Linotype", serif';
  ctx.fillStyle = col;
  ctx.textAlign = 'left';
  ctx.fillText(label, 18, midY);

  const type = geo.type === 'jmoon'     ? 'jmoon'
             : geo.type === 'eccentric' ? 'eccentric'
             : (label === 'Moon') ? 'moon'
             : (label === 'Mercury' || label === 'Venus') ? 'inner' : 'outer';
  const sub = MODEL_META[type]?.subtitle || '';

  // Subtitle — small italic, warm amber, right-aligned with safe margin
  ctx.font = 'italic 8px Georgia, "Palatino Linotype", serif';
  ctx.fillStyle = 'rgba(210, 175, 90, 0.65)';
  ctx.textAlign = 'right';
  ctx.fillText(sub, sz - 18, midY);
}

function _drawInfoStrip(ctx, sz, geo, body, col) {
  const y0 = sz - INFO_H;
  _line(ctx, 14, y0 + 0.5, sz - 14, y0 + 0.5, 'rgba(212, 160, 32, 0.28)', 0.6);
  ctx.fillStyle = 'rgba(212, 160, 32, 0.05)';
  ctx.fillRect(0, y0, sz, INFO_H);

  const type = geo.type === 'jmoon'     ? 'jmoon'
             : geo.type === 'eccentric' ? 'eccentric'
             : (body === 'moon' || body?.startsWith('jmoon:')) ? 'moon'
             : (body === 'mercury' || body === 'venus') ? 'inner' : 'outer';
  const meta = MODEL_META[type] || {};

  const SERIF = 'Georgia, "Palatino Linotype", serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';

  // ── Jupiter-moon info strip (richer detail) ───────────────────────
  // Line positions: keep all text inside safe zone (above bottom fret at sz-15).
  // With INFO_H=60, y0=sz-60. Lines at y0+L_n must satisfy y0+L_n < sz-17.
  // Max L_n = sz-17-y0 = sz-17-(sz-60) = 43. Use L0=8, L1=21, L2=34, L3=45.
  const L = [8, 21, 34, 45];

  if (geo.type === 'jmoon') {
    const md     = geo.moonDef;
    const rate   = Math.abs(360 / md.period).toFixed(2);
    const group  = JMOON_GROUP[md.id] || '';
    const retro  = md.period < 0;
    const laplace = JMOON_LAPLACE[md.id];

    ctx.font      = `italic 9px ${SERIF}`;
    ctx.fillStyle = col + 'cc';
    ctx.fillText('pos(t) = ♃·RA + r·cos(ωt + φ₀)', 14, y0 + L[0]);

    ctx.font      = `8px ${SERIF}`;
    ctx.fillStyle = 'rgba(210, 175, 90, 0.70)';
    ctx.fillText(`${group}${retro ? '  ·  retrograde' : ''}`, 14, y0 + L[1]);

    ctx.fillStyle = 'rgba(190, 155, 90, 0.55)';
    ctx.fillText(`T = ${Math.abs(md.period).toFixed(3)} d  ·  ω = ${rate}°/day`, 14, y0 + L[2]);

    if (laplace) {
      ctx.fillStyle = 'rgba(255, 200, 68, 0.60)';
      ctx.fillText(`Laplace  Io:Eu:Gan = ${laplace}`, 14, y0 + L[3]);
    } else {
      ctx.fillStyle = 'rgba(180, 150, 80, 0.35)';
      ctx.fillText('Observer-centred · no globe constants', 14, y0 + L[3]);
    }
    return;
  }

  const lines  = meta.lines || [];
  const epicPct = geo.epicRadius != null ? (geo.epicRadius * 100).toFixed(1) : null;

  ctx.font      = `italic 9px ${SERIF}`;
  ctx.fillStyle = col + 'cc';
  ctx.fillText(lines[0] || '', 14, y0 + L[0]);

  ctx.font      = `8px ${SERIF}`;
  ctx.fillStyle = 'rgba(210, 175, 90, 0.60)';
  ctx.fillText(lines[1] || '', 14, y0 + L[1]);

  ctx.fillStyle = 'rgba(190, 155, 90, 0.45)';
  if (epicPct) {
    const eccLabel = BODY_ECC[body] ? `   e = ${(BODY_ECC[body]*100).toFixed(0)}%` : '';
    ctx.fillText(`rᵖᴵc = ${epicPct}%${eccLabel}`, 14, y0 + L[2]);
  } else if (geo.type === 'eccentric') {
    ctx.fillText(`e = ${(geo.eccOffset * 100).toFixed(1)}%  (${(geo.eccOffset * 60).toFixed(1)}∕60)`, 14, y0 + L[2]);
  }

  if (geo.synthetic) {
    ctx.fillStyle = 'rgba(190, 155, 90, 0.38)';
    ctx.fillText('* synthetic — not in Almagest', 14, y0 + L[3]);
  }
}

// ── Jupiter moon — compound Ptolemaic epicycle ───────────────────────────────
//
// Two-circle compound: Jupiter's 12-year deferent (outer ring) + the moon's
// own orbital epicycle (inner ring centered on Jupiter's current position).
// Diagram matches Almagest Book IX kinematics:
//   • Earth (Z) at canvas centre
//   • Jupiter (♃) rides the large deferent ring at jupAngle
//   • The moon rides a smaller circle around Jupiter at moonAngle
//   • Retrograde moons: moonRate is negative → epicycle spins CW
//
function _drawJupiterMoon(ctx, cx, cy, maxR, col, label, moonDef, jupAngle, moonAngle, sz) {
  const SERIF = 'Georgia, "Palatino Linotype", serif';
  const retro  = moonDef.period < 0;
  const group  = JMOON_GROUP[moonDef.id] || '';
  const isGalileo = ['io','europa','ganymede','callisto'].includes(moonDef.id);
  const laplace   = JMOON_LAPLACE[moonDef.id];

  // ── Sizing —  leave room for badges at edges ──────────────────────
  const deferR = maxR * 0.68;   // Jupiter's deferent ring radius

  // Moon orbit radius: Galilean moons scale by maxElong ratio to Callisto (2.54)
  // Outer moons use a gentler fraction so the orbit circle isn't comically large.
  let moonOrbitR;
  if (moonDef.maxElong <= 3) {
    // Inner / Galilean moons: normalized so Callisto = 40% of deferR
    moonOrbitR = deferR * 0.40 * (moonDef.maxElong / 2.54);
  } else {
    // Outer irregulars: slightly smaller fraction
    moonOrbitR = deferR * 0.36 * Math.min(1, moonDef.maxElong / 17.5);
  }
  moonOrbitR = Math.max(8, moonOrbitR);   // never invisible

  // ── Jupiter position on deferent ─────────────────────────────────
  const jA   = (jupAngle - 90) * Math.PI / 180;
  const jupX = cx + deferR * Math.cos(jA);
  const jupY = cy + deferR * Math.sin(jA);

  // ── Moon position on its epicycle ────────────────────────────────
  const mA    = (moonAngle - 90) * Math.PI / 180;
  const moonX = jupX + moonOrbitR * Math.cos(mA);
  const moonY = jupY + moonOrbitR * Math.sin(mA);

  // ── Outer guide circle (max reach of moon from Earth) ─────────────
  _circle(ctx, cx, cy, deferR + moonOrbitR, 'rgba(180, 140, 60, 0.09)', 0.7, [4, 8]);

  // ── Jupiter's deferent ring ──────────────────────────────────────
  _circle(ctx, cx, cy, deferR, 'rgba(212, 160, 32, 0.50)', 1.4, [5, 4]);

  // ── Earth → Jupiter arm (faint reference line) ───────────────────
  _line(ctx, cx, cy, jupX, jupY, 'rgba(200, 170, 80, 0.20)', 0.7);

  // ── Moon orbit (solid circle centered on Jupiter) ─────────────────
  const moonOrbitColor = retro ? 'rgba(200, 120, 140, 0.70)' : col + 'bb';
  _circle(ctx, jupX, jupY, moonOrbitR, moonOrbitColor, retro ? 1.6 : 1.4);

  // ── Jupiter → Moon arm ────────────────────────────────────────────
  _line(ctx, jupX, jupY, moonX, moonY, col + 'dd', 1.6);

  // ── Direction tick on moon orbit (small arrowhead showing spin) ───
  // Draw a small curved arrow segment at the top of the moon orbit
  {
    const tickAngle = mA + (retro ? -0.35 : 0.35);
    const tx = jupX + moonOrbitR * Math.cos(tickAngle);
    const ty = jupY + moonOrbitR * Math.sin(tickAngle);
    const perpX = -Math.sin(tickAngle) * (retro ? -1 : 1);
    const perpY =  Math.cos(tickAngle) * (retro ? -1 : 1);
    const arrowSize = Math.max(4, moonOrbitR * 0.22);
    ctx.beginPath();
    ctx.moveTo(tx + perpX * arrowSize * 0.6, ty + perpY * arrowSize * 0.6);
    ctx.lineTo(tx, ty);
    ctx.lineTo(tx - perpX * arrowSize * 0.6, ty - perpY * arrowSize * 0.6);
    ctx.strokeStyle = col + 'aa';
    ctx.lineWidth = 1.3;
    ctx.setLineDash([]);
    ctx.stroke();
  }

  // ── Earth dot (Z) ─────────────────────────────────────────────────
  _earthDot(ctx, cx, cy);
  ctx.font         = 'bold 8px Georgia, serif';
  ctx.fillStyle    = 'rgba(120, 180, 240, 0.80)';
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('Z', cx - 7, cy + 4);

  // ── Jupiter dot (♃) ───────────────────────────────────────────────
  // Gold-orange disc with "♃" glyph
  ctx.beginPath();
  ctx.arc(jupX, jupY, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#d88840';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 200, 80, 0.70)';
  ctx.lineWidth   = 1;
  ctx.setLineDash([]);
  ctx.stroke();
  // Jupiter bands (two horizontal stripes)
  ctx.save();
  ctx.beginPath();
  ctx.arc(jupX, jupY, 7, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(180, 100, 30, 0.55)';
  ctx.fillRect(jupX - 8, jupY - 2.5, 16, 2);
  ctx.fillRect(jupX - 8, jupY + 1,   16, 1.5);
  ctx.restore();
  // ♃ label
  ctx.font         = 'bold 8px Georgia, serif';
  ctx.fillStyle    = 'rgba(255, 210, 100, 0.95)';
  ctx.textAlign    = jupX > cx ? 'left' : 'right';
  ctx.textBaseline = jupY > cy ? 'top' : 'bottom';
  ctx.fillText('♃', jupX + (jupX > cx ? 9 : -9), jupY + (jupY > cy ? 3 : -3));

  // ── Moon dot ──────────────────────────────────────────────────────
  const moonDotR = isGalileo ? 5 : 4;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonDotR, 0, Math.PI * 2);
  ctx.fillStyle = col;
  ctx.fill();
  if (retro) {
    // Retrograde: dashed ring around moon dot
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonDotR + 3, 0, Math.PI * 2);
    ctx.strokeStyle = col + '66';
    ctx.lineWidth   = 0.8;
    ctx.setLineDash([2, 2]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Moon label — position it away from Jupiter
  const labelDX = moonX - jupX, labelDY = moonY - jupY;
  const labelDist = Math.hypot(labelDX, labelDY) || 1;
  const lx = moonX + (labelDX / labelDist) * (moonDotR + 5);
  const ly = moonY + (labelDY / labelDist) * (moonDotR + 5);
  ctx.font         = `bold italic 9px ${SERIF}`;
  ctx.fillStyle    = col;
  ctx.textAlign    = lx > cx ? 'left' : 'right';
  ctx.textBaseline = ly < cy  ? 'bottom' : 'top';
  ctx.fillText(label, lx, ly);

  // ── Badges — period rate group resonance ─────────────────────────
  // Positioned in the lower-left of the diagram area, above the info strip
  const badgeY = cy + deferR * 0.52;   // below diagram centre
  const rate   = Math.abs(360 / moonDef.period).toFixed(1);

  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';

  // Group badge (top line)
  ctx.font      = `bold 8px ${SERIF}`;
  ctx.fillStyle = 'rgba(212, 160, 32, 0.70)';
  ctx.fillText(group + (retro ? '  ↺' : ''), 14, badgeY);

  // Rate badge
  ctx.font      = `8px ${SERIF}`;
  ctx.fillStyle = 'rgba(190, 160, 90, 0.55)';
  ctx.fillText(`ω = ${rate}°/day`, 14, badgeY + 12);

  // Laplace resonance badge (Galilean trio only)
  if (laplace) {
    ctx.fillStyle = 'rgba(255, 200, 68, 0.75)';
    ctx.font      = `bold 8px ${SERIF}`;
    ctx.fillText(`Laplace  ${laplace}`, 14, badgeY + 24);
  }

  // Retrograde note
  if (retro) {
    ctx.fillStyle = 'rgba(200, 120, 140, 0.60)';
    ctx.font      = `italic 8px ${SERIF}`;
    ctx.fillText('retrograde orbit — ω < 0', 14, badgeY + (laplace ? 36 : 24));
  }
}

// ── Outer planet — bisected eccentricity (Mars, Jupiter, Saturn, Neptune) ────
// Geometry: Earth (Z) at canvas centre; D offset by e; Q at 2e.
// Apogee (A) and Perigee (G) on the apse line from D.
function _drawOuterPlanet(ctx, cx, cy, maxR, col, label, body, geo) {
  const eccFrac = BODY_ECC[body] || 0.09;

  // Scale so the deferent + a margin fits the diagram area.
  // Need room for apogee badge on the left (≈12px) and perigee on right (≈12px)
  // and label text. Shrink deferR to leave ~22px padding each side.
  const deferR  = maxR * 0.70;
  const eccOff  = deferR * eccFrac;          // Earth-to-D distance
  const equOff  = 2 * eccOff;               // Earth-to-Q distance (bisected ecc)

  // Earth at cx,cy; D to the RIGHT (toward perigee side)
  const Dx = cx + eccOff, Dy = cy;
  const Qx = cx + equOff, Qy = cy;

  // Apogee and Perigee on the deferent (centred on D)
  const apogX = Dx - deferR, apogY = Dy;
  const perigX = Dx + deferR, perigY = Dy;

  // Epicycle centre angle from D
  const dAngle  = (geo.deferAngle - 90) * Math.PI / 180;
  const epicCx  = Dx + deferR * Math.cos(dAngle);
  const epicCy  = Dy + deferR * Math.sin(dAngle);
  const epicR   = deferR * geo.epicRadius;

  // Planet angle on epicycle
  const pAngle  = (geo.deferAngle + geo.epicAngle - 90) * Math.PI / 180;
  const planX   = epicCx + epicR * Math.cos(pAngle);
  const planY   = epicCy + epicR * Math.sin(pAngle);

  // ── Guide circle (dashed, from Earth, = max reach of planet) ──────
  _circle(ctx, cx, cy, deferR + epicR, 'rgba(180, 140, 60, 0.14)', 0.8, [4, 7]);

  // ── Apse line ──────────────────────────────────────────────────────
  _line(ctx, apogX - 10, apogY, perigX + 10, perigY,
        'rgba(212, 160, 32, 0.22)', 0.6);

  // ── Deferent circle (centred on D) ────────────────────────────────
  _circle(ctx, Dx, Dy, deferR, 'rgba(180, 145, 65, 0.62)', 1.3);

  // ── Equant line: Q → epicycle centre (uniform motion reference) ───
  _line(ctx, Qx, Qy, epicCx, epicCy,
        'rgba(130, 160, 240, 0.75)', 1.1, [5, 3]);

  // ── Deferent arm: D → epicycle centre (dashed, light) ─────────────
  _line(ctx, Dx, Dy, epicCx, epicCy,
        'rgba(210, 175, 100, 0.22)', 0.8, [3, 4]);

  // ── Earth-to-epicycle-centre arm (very faint reference) ───────────
  _line(ctx, cx, cy, epicCx, epicCy,
        'rgba(180, 190, 220, 0.18)', 0.7);

  // ── Epicycle ──────────────────────────────────────────────────────
  _circle(ctx, epicCx, epicCy, epicR, col + 'bb', 1.5);

  // ── Planet arm: Θ → planet ────────────────────────────────────────
  _line(ctx, epicCx, epicCy, planX, planY, col + 'ee', 1.6);

  // ── Apogee badge ──────────────────────────────────────────────────
  _apsisBadge(ctx, apogX, apogY, 'A', '#3a8c5a');
  ctx.font = 'italic 8px Georgia, "Palatino Linotype", serif';
  ctx.fillStyle = 'rgba(80, 190, 120, 0.80)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Apogee', apogX + 10, apogY - 2);

  // ── Perigee badge ─────────────────────────────────────────────────
  _apsisBadge(ctx, perigX, perigY, 'G', '#3a8c5a');
  ctx.font = 'italic 8px Georgia, "Palatino Linotype", serif';
  ctx.fillStyle = 'rgba(80, 190, 120, 0.80)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Perigee', perigX - 10, perigY - 2);

  // ── D dot (deferent centre) ───────────────────────────────────────
  ctx.beginPath();
  ctx.arc(Dx, Dy, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(210, 175, 100, 0.75)';
  ctx.fill();
  ctx.font = 'italic 9px Georgia, serif';
  ctx.fillStyle = 'rgba(210, 175, 100, 0.80)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('D', Dx, Dy + 4);

  // ── Q dot (equant) ────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(Qx, Qy, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(130, 160, 240, 0.85)';
  ctx.fill();
  ctx.font = 'italic 9px Georgia, serif';
  ctx.fillStyle = 'rgba(130, 160, 240, 0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Q', Qx, Qy + 4);

  // ── Epicycle centre Θ ─────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(epicCx, epicCy, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#c06040';
  ctx.fill();
  ctx.font = 'italic 9px Georgia, "Palatino Linotype", serif';
  ctx.fillStyle = 'rgba(220, 130, 90, 0.90)';
  const thetaLX = epicCx + (epicCx > cx ? 5 : -5);
  const thetaLY = epicCy + (epicCy > cy ? 5 : -5);
  ctx.textAlign  = thetaLX >= epicCx ? 'left' : 'right';
  ctx.textBaseline = thetaLY >= epicCy ? 'top' : 'bottom';
  ctx.fillText('Θ', thetaLX, thetaLY);

  // ── Earth ─────────────────────────────────────────────────────────
  _earthDot(ctx, cx, cy);
  ctx.font = 'bold 8px Georgia, serif';
  ctx.fillStyle = 'rgba(120, 180, 240, 0.80)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('Z', cx - 7, cy + 4);

  // ── Planet dot ────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(planX, planY, 5, 0, Math.PI * 2);
  ctx.fillStyle = col;
  ctx.fill();
  ctx.font = 'bold italic 9px Georgia, "Palatino Linotype", serif';
  ctx.fillStyle = col;
  ctx.textAlign  = planX > cx ? 'left' : 'right';
  ctx.textBaseline = planY < cy ? 'bottom' : 'top';
  ctx.fillText(label, planX + (planX > cx ? 6 : -6), planY + (planY < cy ? -2 : 2));

  // ── "uniform motion about Q" annotation ──────────────────────────
  // Draw near midpoint of the equant line
  const midQX = (Qx + epicCx) / 2;
  const midQY = (Qy + epicCy) / 2;
  ctx.save();
  ctx.font = '7.5px Georgia, serif';
  ctx.fillStyle = 'rgba(130, 160, 240, 0.65)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  // Only draw if there's reasonable space
  const lineLen = Math.hypot(epicCx - Qx, epicCy - Qy);
  if (lineLen > 40) {
    const angle = Math.atan2(epicCy - Qy, epicCx - Qx);
    ctx.translate(midQX, midQY);
    ctx.rotate(angle);
    ctx.fillText('uniform motion — Q', 0, -3);
  }
  ctx.restore();
}

// ── Inner planet — Sun-anchored deferent (Venus, Mercury) ────────────────────
// The epicycle centre rides on a deferent whose line of apsides follows the
// Sun's mean longitude.  The anomaly gives the elongation from the Sun.
function _drawInnerPlanet(ctx, cx, cy, maxR, col, label, geo) {
  const deferR = maxR * 0.55;
  const epicR  = deferR * geo.epicRadius;

  // Deferent arm direction = Sun's mean longitude (deferAngle)
  const dAngle  = (geo.deferAngle - 90) * Math.PI / 180;
  const epicCx  = cx + deferR * Math.cos(dAngle);
  const epicCy  = cy + deferR * Math.sin(dAngle);

  // Planet on epicycle
  const pAngle  = (geo.deferAngle + geo.epicAngle - 90) * Math.PI / 180;
  const planX   = epicCx + epicR * Math.cos(pAngle);
  const planY   = epicCy + epicR * Math.sin(pAngle);

  // Sun's mean longitude direction (same as deferAngle)
  const sunX = cx + deferR * 0.85 * Math.cos(dAngle);
  const sunY = cy + deferR * 0.85 * Math.sin(dAngle);

  // ── Guide circles ──────────────────────────────────────────────────
  _circle(ctx, cx, cy, deferR + epicR, 'rgba(180, 140, 60, 0.11)', 0.7, [4, 7]);
  _circle(ctx, cx, cy, deferR - epicR, 'rgba(120, 140, 200, 0.10)', 0.7, [4, 7]);

  // ── Deferent ──────────────────────────────────────────────────────
  _circle(ctx, cx, cy, deferR, 'rgba(180, 145, 65, 0.52)', 1.2);

  // ── Sun direction line (apse line of deferent) ────────────────────
  _line(ctx, cx, cy, epicCx, epicCy,
        'rgba(255, 220, 80, 0.45)', 1.0, [5, 3]);

  // ── Epicycle ──────────────────────────────────────────────────────
  _circle(ctx, epicCx, epicCy, epicR, col + 'cc', 1.5);

  // ── Planet arm ────────────────────────────────────────────────────
  _line(ctx, epicCx, epicCy, planX, planY, col + 'ee', 1.6);

  // ── Sun icon at epicycle centre (deferent arm tip) ────────────────
  // The epicycle centre orbits at the Sun's mean rate
  ctx.beginPath();
  ctx.arc(epicCx, epicCy, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#ffe08844';
  ctx.fill();
  ctx.strokeStyle = '#ffe066cc';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Sun rays (4 tiny lines)
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    _line(ctx, epicCx + 5 * Math.cos(a), epicCy + 5 * Math.sin(a),
               epicCx + 8 * Math.cos(a), epicCy + 8 * Math.sin(a),
               '#ffe06699', 0.8);
  }
  ctx.font = 'italic 8px Georgia, "Palatino Linotype", serif';
  ctx.fillStyle = 'rgba(255, 220, 80, 0.75)';
  ctx.textAlign  = epicCx > cx ? 'left' : 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('☉̅ mean', epicCx + (epicCx > cx ? 10 : -10), epicCy - 2);

  // ── Epicycle centre Θ ─────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(epicCx, epicCy, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#c06040';
  ctx.fill();
  ctx.font = 'italic 9px Georgia, "Palatino Linotype", serif';
  ctx.fillStyle = 'rgba(220, 130, 90, 0.85)';
  ctx.textAlign  = epicCx > cx ? 'right' : 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Θ', epicCx + (epicCx > cx ? -10 : 10), epicCy + 4);

  // ── Earth ─────────────────────────────────────────────────────────
  _earthDot(ctx, cx, cy);
  ctx.font = 'bold 8px Georgia, serif';
  ctx.fillStyle = 'rgba(120, 180, 240, 0.80)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('Z', cx - 7, cy + 4);

  // ── Planet dot ────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(planX, planY, 5, 0, Math.PI * 2);
  ctx.fillStyle = col;
  ctx.fill();
  ctx.font = 'bold italic 9px Georgia, "Palatino Linotype", serif';
  ctx.fillStyle = col;
  ctx.textAlign  = planX > cx ? 'left' : 'right';
  ctx.textBaseline = planY < cy ? 'bottom' : 'top';
  ctx.fillText(label, planX + (planX > cx ? 6 : -6), planY + (planY < cy ? -2 : 2));

  // ── Elongation arc hint ───────────────────────────────────────────
  // Show the arc from the Sun direction to the planet (the anomaly)
  const arcR = Math.min(epicR * 0.55, 18);
  ctx.beginPath();
  ctx.arc(epicCx, epicCy, arcR, dAngle, pAngle, false);
  ctx.strokeStyle = col + '55';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ── Moon — deferent + epicycle, evection annotation ──────────────────────────
function _drawMoon(ctx, cx, cy, maxR, col, geo) {
  const deferR  = maxR * 0.58;
  const epicR   = deferR * geo.epicRadius;

  const dAngle  = (geo.deferAngle - 90) * Math.PI / 180;
  const pAngle  = (geo.deferAngle + geo.epicAngle - 90) * Math.PI / 180;

  const epicCx  = cx + deferR * Math.cos(dAngle);
  const epicCy  = cy + deferR * Math.sin(dAngle);
  const planX   = epicCx + epicR * Math.cos(pAngle);
  const planY   = epicCy + epicR * Math.sin(pAngle);

  // Outer and inner guide circles
  _circle(ctx, cx, cy, deferR + epicR, 'rgba(180, 140, 60, 0.12)', 0.7, [4, 7]);
  _circle(ctx, cx, cy, deferR - epicR, 'rgba(120, 140, 200, 0.10)', 0.7, [4, 7]);

  // Deferent
  _circle(ctx, cx, cy, deferR, 'rgba(180, 145, 65, 0.58)', 1.3);

  // Arm: Earth → epicycle centre (dashed)
  _line(ctx, cx, cy, epicCx, epicCy, 'rgba(210, 175, 100, 0.28)', 0.9, [4, 3]);

  // Epicycle
  _circle(ctx, epicCx, epicCy, epicR, col + 'bb', 1.5);

  // Arm: Θ → Moon
  _line(ctx, epicCx, epicCy, planX, planY, col + 'ee', 1.6);

  // Mark mean longitude direction (top of canvas = north by convention)
  // Draw a small tick at the deferent where deferAngle points
  const tickX = cx + deferR * Math.cos(dAngle);
  const tickY = cy + deferR * Math.sin(dAngle);
  // (already the epicycle centre)

  // Epicycle centre Θ
  ctx.beginPath();
  ctx.arc(epicCx, epicCy, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#a090c0';
  ctx.fill();
  ctx.font = 'italic 9px Georgia, "Palatino Linotype", serif';
  ctx.fillStyle = 'rgba(210, 175, 100, 0.85)';
  ctx.textAlign  = epicCx > cx ? 'left' : 'right';
  ctx.textBaseline = epicCy > cy ? 'top' : 'bottom';
  ctx.fillText('Θ', epicCx + (epicCx > cx ? 5 : -5), epicCy + (epicCy > cy ? 4 : -4));

  // Earth
  _earthDot(ctx, cx, cy);
  ctx.font = 'bold 8px Georgia, serif';
  ctx.fillStyle = 'rgba(120, 180, 240, 0.80)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('Z', cx - 7, cy + 4);

  // Moon dot
  ctx.beginPath();
  ctx.arc(planX, planY, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = col;
  ctx.fill();
  ctx.font = 'bold italic 9px Georgia, "Palatino Linotype", serif';
  ctx.fillStyle = col;
  ctx.textAlign  = planX > cx ? 'left' : 'right';
  ctx.textBaseline = planY < cy ? 'bottom' : 'top';
  ctx.fillText('Moon', planX + (planX > cx ? 7 : -7), planY + (planY < cy ? -2 : 2));

  // Mean longitude tick on deferent
  const tickLen = 5;
  _line(ctx, tickX - tickLen * Math.sin(dAngle), tickY + tickLen * Math.cos(dAngle),
             tickX + tickLen * Math.sin(dAngle), tickY - tickLen * Math.cos(dAngle),
             'rgba(210, 175, 100, 0.40)', 1);
  ctx.font = '7.5px Georgia, serif';
  ctx.fillStyle = 'rgba(210, 175, 100, 0.50)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Label: "L̄m" near the tick if there is space
  const labelOff = 11;
  ctx.fillText('L̄m',
    tickX - labelOff * Math.sin(dAngle),
    tickY + labelOff * Math.cos(dAngle));
}

// ── Sun — eccentric model (Almagest Book III) ─────────────────────────────────
// Earth (Z) is NOT the centre of the orbit.
// The eccentric centre (E) is displaced; the deferent is centred on E.
function _drawEccentric(ctx, cx, cy, maxR, col, label, geo) {
  const deferR  = maxR * 0.70;
  const eccOff  = geo.eccOffset * deferR;

  // Apogee direction (Ptolemy's solar apogee ≈ 65.5° from vernal equinox)
  const apogRad = (geo.apogeeAngle - 90) * Math.PI / 180;

  // Eccentric centre E
  const Ex = cx + eccOff * Math.cos(apogRad);
  const Ey = cy + eccOff * Math.sin(apogRad);

  // Apogee and Perigee on the deferent from E
  const apogX = Ex + deferR * Math.cos(apogRad);
  const apogY = Ey + deferR * Math.sin(apogRad);
  const perigX = Ex - deferR * Math.cos(apogRad);
  const perigY = Ey - deferR * Math.sin(apogRad);

  // Sun's current position on the deferent
  const sunRad = (geo.deferAngle - 90) * Math.PI / 180;
  const sunX   = Ex + deferR * Math.cos(sunRad);
  const sunY   = Ey + deferR * Math.sin(sunRad);

  // ── Apse line (through E, apogee, perigee) ──────────────────────
  _line(ctx, perigX, perigY, apogX, apogY,
        'rgba(212, 160, 32, 0.24)', 0.6);

  // ── Earth-to-eccentric-centre reference ─────────────────────────
  _line(ctx, cx, cy, Ex, Ey, 'rgba(210, 175, 100, 0.18)', 0.7, [3, 4]);

  // ── Deferent (centred on E, NOT Earth) ───────────────────────────
  _circle(ctx, Ex, Ey, deferR, 'rgba(180, 145, 65, 0.62)', 1.3);

  // ── Earth → Sun arm ──────────────────────────────────────────────
  _line(ctx, cx, cy, sunX, sunY, col + 'aa', 1.3);

  // ── Apogee badge ─────────────────────────────────────────────────
  _apsisBadge(ctx, apogX, apogY, 'A', '#3a8c5a');
  ctx.font = 'italic 8px Georgia, "Palatino Linotype", serif';
  ctx.fillStyle = 'rgba(80, 190, 120, 0.75)';
  ctx.textAlign  = apogX > cx ? 'left' : 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Apogee', apogX + (apogX > cx ? 10 : -10), apogY - 2);

  // ── Perigee badge ────────────────────────────────────────────────
  _apsisBadge(ctx, perigX, perigY, 'G', '#3a8c5a');
  ctx.font = 'italic 8px Georgia, "Palatino Linotype", serif';
  ctx.fillStyle = 'rgba(80, 190, 120, 0.75)';
  ctx.textAlign  = perigX > cx ? 'left' : 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('Perigee', perigX + (perigX > cx ? 10 : -10), perigY + 2);

  // ── Eccentric centre E ────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(Ex, Ey, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(210, 175, 100, 0.75)';
  ctx.fill();
  ctx.font = 'italic 9px Georgia, serif';
  ctx.fillStyle = 'rgba(210, 175, 100, 0.80)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('E', Ex - 4, Ey + 3);

  // ── Earth (Z) ────────────────────────────────────────────────────
  _earthDot(ctx, cx, cy);
  ctx.font = 'bold 8px Georgia, serif';
  ctx.fillStyle = 'rgba(120, 180, 240, 0.80)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('Z', cx - 7, cy + 4);

  // ── Sun dot ───────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(sunX, sunY, 6, 0, Math.PI * 2);
  ctx.fillStyle = col + 'cc';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(sunX, sunY, 8, 0, Math.PI * 2);
  ctx.strokeStyle = col + '44';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = 'bold italic 9px Georgia, "Palatino Linotype", serif';
  ctx.fillStyle = col;
  ctx.textAlign  = sunX > cx ? 'left' : 'right';
  ctx.textBaseline = sunY < cy ? 'bottom' : 'top';
  ctx.fillText('☉', sunX + (sunX > cx ? 9 : -9), sunY + (sunY < cy ? -2 : 2));

  // ── "E ≠ Z" note ─────────────────────────────────────────────────
  ctx.font = '7.5px Georgia, serif';
  ctx.fillStyle = 'rgba(210, 175, 100, 0.40)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const midX = (cx + Ex) / 2;
  const midY = (cy + Ey) / 2;
  ctx.fillText('E ≠ Z', midX, midY - 8);
}
