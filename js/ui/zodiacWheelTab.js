// Ptolemaic Zodiac Wheel — interactive SVG for the Astrology section.
// Data from Ptolemy's Tetrabiblos. No external dependencies.

/* ── Ptolemaic sign data ──────────────────────────────────────────────── */
const SIGNS = [
  { name: 'Aries',       glyph: '♈', elem: 'Fire',  qual: 'Cardinal', ruler: 'Mars',    rulerG: '♂', polar: 'Diurnal',
    desc: 'The first of the cardinal signs, Aries is hot and dry in nature. Ptolemy places it under Mars and the day sect. It initiates the vernal equinox, commanding the head of the body and the first movement of the seasonal year.' },
  { name: 'Taurus',      glyph: '♉', elem: 'Earth', qual: 'Fixed',    ruler: 'Venus',   rulerG: '♀', polar: 'Nocturnal',
    desc: 'Earthy and fixed under Venus, Taurus governs the neck and throat. Its nocturnal, feminine nature inclines to stability and fertility. Ptolemy notes its sympathy with beauty and material increase.' },
  { name: 'Gemini',      glyph: '♊', elem: 'Air',   qual: 'Mutable',  ruler: 'Mercury', rulerG: '☿', polar: 'Diurnal',
    desc: 'Airy and mutable under Mercury, Gemini governs the arms and shoulders. Its diurnal, masculine duality makes it the sign of discourse, swift intelligence, and the joining of contraries into one.' },
  { name: 'Cancer',      glyph: '♋', elem: 'Water', qual: 'Cardinal', ruler: 'Moon',    rulerG: '☽', polar: 'Nocturnal',
    desc: 'Watery and cardinal, the Moon\'s sole domicile. Ptolemy calls Cancer the most lunar of signs — receptive, nurturing, and bound to the tides, governing the breast and stomach, the seat of nutrition.' },
  { name: 'Leo',         glyph: '♌', elem: 'Fire',  qual: 'Fixed',    ruler: 'Sun',     rulerG: '☉', polar: 'Diurnal',
    desc: 'The Sun\'s only domicile, Leo is the most royal of signs. Fixed and fiery, it commands the heart. Ptolemy ascribes to it the qualities of the Sun — light, authority, vitality, and the ordering of the world.' },
  { name: 'Virgo',       glyph: '♍', elem: 'Earth', qual: 'Mutable',  ruler: 'Mercury', rulerG: '☿', polar: 'Nocturnal',
    desc: 'Earthy and mutable under Mercury, Virgo governs the belly and the work of digestion. Its nocturnal, feminine nature inclines to precision, harvest, and the analytical separation of the useful from the waste.' },
  { name: 'Libra',       glyph: '♎', elem: 'Air',   qual: 'Cardinal', ruler: 'Venus',   rulerG: '♀', polar: 'Diurnal',
    desc: 'Airy and cardinal under Venus, Libra marks the autumnal equinox. Saturn is exalted here. Ptolemy notes its governance of the loins and its diurnal masculine character — the scales weighing justice and beauty equally.' },
  { name: 'Scorpio',     glyph: '♏', elem: 'Water', qual: 'Fixed',    ruler: 'Mars',    rulerG: '♂', polar: 'Nocturnal',
    desc: 'Watery and fixed under Mars, Scorpio is cold and penetrating. It governs the generative members. Ptolemy assigns it the nocturnal sect; its nature is hidden, intensely purposive, and connected to transformation.' },
  { name: 'Sagittarius', glyph: '♐', elem: 'Fire',  qual: 'Mutable',  ruler: 'Jupiter', rulerG: '♃', polar: 'Diurnal',
    desc: 'Fiery and mutable under Jupiter, Sagittarius governs the thighs. Ptolemy praises its expansive, diurnal, masculine nature — the archer\'s arrow pointing toward wisdom, philosophy, and the far horizon.' },
  { name: 'Capricorn',   glyph: '♑', elem: 'Earth', qual: 'Cardinal', ruler: 'Saturn',  rulerG: '♄', polar: 'Nocturnal',
    desc: 'Earthy and cardinal, Saturn\'s first domicile. Mars is exalted here. The winter solstice sign — cold, dry, disciplined — governs the knees. Ptolemy sees its severity as the necessary root of all lasting structure.' },
  { name: 'Aquarius',    glyph: '♒', elem: 'Air',   qual: 'Fixed',    ruler: 'Saturn',  rulerG: '♄', polar: 'Diurnal',
    desc: 'Airy and fixed, Saturn\'s second domicile. Governs the ankles. Despite pouring water, Aquarius is an air sign in Ptolemy\'s scheme — intellectual, universal, and possessed of the coldest and most detached of Saturn\'s qualities.' },
  { name: 'Pisces',      glyph: '♓', elem: 'Water', qual: 'Mutable',  ruler: 'Jupiter', rulerG: '♃', polar: 'Nocturnal',
    desc: 'Watery and mutable, Jupiter\'s second domicile with Venus exalted. Governs the feet. Ptolemy places Pisces at the year\'s end — the most receptive, diffuse, and spiritually inclined of all signs, bridging winter back to spring.' },
];

/* ── Element palette ──────────────────────────────────────────────────── */
const ELEM_COLOR = {
  Fire:  '#ff6820',
  Earth: '#48d070',
  Air:   '#38c4ff',
  Water: '#c040e0',
};

/* ── SVG geometry helpers ─────────────────────────────────────────────── */
const CX = 250, CY = 250; // viewBox center

function toXY(angleDeg, r) {
  const a = angleDeg * Math.PI / 180;
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
}

// Arc wedge path: angle measured CW from top (0=12 o'clock)
function wedgePath(centerDeg, halfSpan, rOuter, rInner) {
  const a0 = centerDeg - halfSpan, a1 = centerDeg + halfSpan;
  const [ox0, oy0] = toXY(a0, rOuter);
  const [ox1, oy1] = toXY(a1, rOuter);
  const [ix0, iy0] = toXY(a0, rInner);
  const [ix1, iy1] = toXY(a1, rInner);
  const large = halfSpan * 2 > 180 ? 1 : 0;
  return [
    `M ${ox0} ${oy0}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${ox1} ${oy1}`,
    `L ${ix1} ${iy1}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${ix0} ${iy0}`,
    'Z',
  ].join(' ');
}

// Arc path only (no fill, for textPath)
function arcOnlyPath(startDeg, endDeg, r) {
  const [x0, y0] = toXY(startDeg, r);
  const [x1, y1] = toXY(endDeg, r);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

/* ── Sign center angles: Aries at top (0°), CCW → each -30° ──────────── */
function signAngle(i) { return -i * 30; }    // CW-from-top, negative = CCW

/* ── Build the SVG string ─────────────────────────────────────────────── */
function buildWheelSVG(selected) {
  const R_RIM   = 238; // outer rim
  const R_NOUT  = 232; // name ring outer
  const R_NIN   = 188; // name ring inner / glyph outer
  const R_GIN   = 140; // glyph inner / element outer
  const R_EIN   = 128; // element inner
  const R_CORE  = 52;  // center medallion

  const parts = [];

  // ── defs: filters + arc paths ──────────────────────────────────────────
  parts.push(`<defs>
    <filter id="neon-soft" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="neon-strong" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b1"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b2"/>
      <feMerge><feMergeNode in="b1"/><feMergeNode in="b2"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <radialGradient id="bg-grad" cx="50%" cy="50%">
      <stop offset="0%"   stop-color="#1a1830"/>
      <stop offset="100%" stop-color="#08060f"/>
    </radialGradient>`);

  // Arc paths for sign names
  SIGNS.forEach((s, i) => {
    const c = signAngle(i);
    // Text reads left-to-right: path goes CCW (decreasing CW angle) for upper signs
    // Use +12 to +18 of span for textPath start (centred)
    const nameR = (R_NOUT + R_NIN) / 2 + 4;
    // Path goes CW (correct for CCW layout, names read outward)
    parts.push(`<path id="np${i}" d="${arcOnlyPath(c - 13, c + 13, nameR)}" fill="none"/>`);
  });
  parts.push(`</defs>`);

  // ── background ─────────────────────────────────────────────────────────
  parts.push(`<circle cx="${CX}" cy="${CY}" r="248" fill="url(#bg-grad)"/>`);

  // Starfield
  const rng = (seed) => { let x = seed; return () => { x = (x * 1664525 + 1013904223) & 0xffffffff; return (x >>> 0) / 0xffffffff; }; };
  const rand = rng(42);
  for (let k = 0; k < 80; k++) {
    const a = rand() * 360, r = R_RIM * 1.01 + rand() * 6;
    if (r > 246) continue;
    const [sx, sy] = toXY(a, R_EIN + rand() * (R_NIN - R_EIN));
    const op = 0.3 + rand() * 0.7;
    const sz = rand() < 0.15 ? 1.2 : 0.6;
    parts.push(`<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${sz}" fill="white" opacity="${op.toFixed(2)}"/>`);
  }

  // ── wedge backgrounds ───────────────────────────────────────────────────
  SIGNS.forEach((s, i) => {
    const c = signAngle(i);
    const col = ELEM_COLOR[s.elem];
    const isSelected = i === selected;
    const alpha = isSelected ? '22' : '0d';
    const d = wedgePath(c, 15, R_RIM, R_EIN);
    parts.push(`<path class="zw-wedge" data-i="${i}" d="${d}" fill="${col}${alpha}" stroke="${col}33" stroke-width="0.5" style="cursor:pointer;transition:fill 0.2s"/>`);
  });

  // ── outer rim ───────────────────────────────────────────────────────────
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${R_RIM}" fill="none" stroke="rgba(200,160,60,0.5)" stroke-width="1.5"/>`);
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${R_NOUT}" fill="none" stroke="rgba(200,160,60,0.25)" stroke-width="0.5"/>`);
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${R_NIN}" fill="none" stroke="rgba(200,160,60,0.3)" stroke-width="0.5"/>`);
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${R_GIN}" fill="none" stroke="rgba(200,160,60,0.25)" stroke-width="0.5"/>`);
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${R_EIN}" fill="none" stroke="rgba(200,160,60,0.4)" stroke-width="1"/>`);

  // ── spoke dividers ──────────────────────────────────────────────────────
  for (let i = 0; i < 12; i++) {
    const a = signAngle(i) - 15;
    const [x0, y0] = toXY(a, R_EIN);
    const [x1, y1] = toXY(a, R_RIM);
    parts.push(`<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="rgba(200,160,60,0.3)" stroke-width="0.5"/>`);
  }

  // ── degree tick marks (every 5°) ────────────────────────────────────────
  for (let d = 0; d < 360; d += 5) {
    const isMaj = d % 30 === 0;
    const r0 = isMaj ? R_RIM - 1 : R_RIM - 6;
    const [x0, y0] = toXY(-d, R_RIM);
    const [x1, y1] = toXY(-d, r0);
    const opacity = isMaj ? '0' : '0.5'; // skip 30° marks (already spokes)
    if (!isMaj) parts.push(`<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="rgba(200,160,60,${opacity})" stroke-width="0.5"/>`);
  }

  // ── element band ─────────────────────────────────────────────────────────
  SIGNS.forEach((s, i) => {
    const c = signAngle(i);
    const col = ELEM_COLOR[s.elem];
    const d = wedgePath(c, 14.5, R_GIN, R_EIN);
    const isSelected = i === selected;
    const alpha = isSelected ? 'cc' : '66';
    parts.push(`<path d="${d}" fill="${col}${alpha}" pointer-events="none"/>`);
  });

  // ── glyph ring ───────────────────────────────────────────────────────────
  SIGNS.forEach((s, i) => {
    const c = signAngle(i);
    const col = ELEM_COLOR[s.elem];
    const isSelected = i === selected;
    const filterId = isSelected ? 'neon-strong' : 'neon-soft';
    const [gx, gy] = toXY(c, (R_NIN + R_GIN) / 2);
    parts.push(`<text x="${gx.toFixed(1)}" y="${gy.toFixed(1)}"
      text-anchor="middle" dominant-baseline="central"
      font-size="28" fill="${col}" filter="url(#${filterId})"
      class="zw-glyph" data-i="${i}" pointer-events="none"
      transform="rotate(${c}, ${gx.toFixed(1)}, ${gy.toFixed(1)})"
      style="transition:filter 0.2s">${s.glyph}</text>`);
  });

  // ── name ring ─────────────────────────────────────────────────────────────
  SIGNS.forEach((s, i) => {
    const c = signAngle(i);
    const col = ELEM_COLOR[s.elem];
    const isSelected = i === selected;
    // Shorter names: bigger font; "Sagittarius": smaller
    const fs = s.name.length > 8 ? 7.5 : s.name.length > 6 ? 8.5 : 9.5;
    const nameR = (R_NOUT + R_NIN) / 2 + 2;
    const [nx, ny] = toXY(c, nameR);
    const opacity = isSelected ? '1' : '0.85';
    parts.push(`<text x="${nx.toFixed(1)}" y="${ny.toFixed(1)}"
      text-anchor="middle" dominant-baseline="central"
      font-size="${fs}" font-family="ui-serif, Georgia, serif" letter-spacing="0.04em"
      fill="${col}" opacity="${opacity}"
      pointer-events="none"
      transform="rotate(${c}, ${nx.toFixed(1)}, ${ny.toFixed(1)})">${s.name}</text>`);
  });

  // ── inner rim + center medallion ─────────────────────────────────────────
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${R_CORE + 2}" fill="#0d0b1a" stroke="rgba(200,160,60,0.6)" stroke-width="1.5"/>`);
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${R_CORE}" fill="url(#bg-grad)" stroke="rgba(200,160,60,0.3)" stroke-width="0.5"/>`);

  // Center: Sun symbol or astrolabe cross
  parts.push(`<text x="${CX}" y="${CY - 8}" text-anchor="middle" dominant-baseline="central"
    font-size="18" fill="rgba(220,180,60,0.9)" filter="url(#neon-soft)">☉</text>`);
  parts.push(`<text x="${CX}" y="${CY + 10}" text-anchor="middle" dominant-baseline="central"
    font-size="8" fill="rgba(200,160,60,0.6)" font-family="ui-serif,Georgia,serif"
    letter-spacing="0.08em">PTOLEMY</text>`);

  // Cardinal point markers (↑ = Aries, → = Cancer, ↓ = Libra, ← = Capricorn)
  const cardinals = [[0,'♈'],[90,'♋'],[180,'♎'],[270,'♑']];
  cardinals.forEach(([a, g]) => {
    const [mx, my] = toXY(-a, R_RIM + 10);
    parts.push(`<text x="${mx.toFixed(1)}" y="${my.toFixed(1)}" text-anchor="middle" dominant-baseline="central"
      font-size="9" fill="rgba(200,160,60,0.55)" pointer-events="none">${g}</text>`);
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" role="img" aria-label="Ptolemaic Zodiac Wheel" style="width:100%;max-width:500px;display:block;margin:0 auto">${parts.join('')}</svg>`;
}

/* ── Dossier HTML ─────────────────────────────────────────────────────── */
function buildDossier(i) {
  const s = SIGNS[i];
  const col = ELEM_COLOR[s.elem];
  return `
    <div class="zw-dossier" style="border-color:${col}44">
      <div class="zw-doss-head" style="color:${col}">
        <span class="zw-doss-glyph" style="filter:drop-shadow(0 0 6px ${col})">${s.glyph}</span>
        <span class="zw-doss-name">${s.name}</span>
      </div>
      <dl class="zw-doss-dl">
        <div class="zw-dl-row"><dt>Element</dt><dd style="color:${col}">${s.elem}</dd></div>
        <div class="zw-dl-row"><dt>Quality</dt><dd>${s.qual}</dd></div>
        <div class="zw-dl-row"><dt>Domicile Lord</dt><dd>${s.rulerG} ${s.ruler}</dd></div>
        <div class="zw-dl-row"><dt>Sect</dt><dd>${s.polar}</dd></div>
      </dl>
      <p class="zw-doss-desc">${s.desc}</p>
      <div class="zw-doss-nav">
        <button class="zw-nav-btn" id="zw-prev" type="button" title="Previous sign">‹ ${SIGNS[(i + 11) % 12].name}</button>
        <span class="zw-doss-pos">${i + 1} / 12</span>
        <button class="zw-nav-btn" id="zw-next" type="button" title="Next sign">${SIGNS[(i + 1) % 12].name} ›</button>
      </div>
    </div>`;
}

/* ── Main render function ─────────────────────────────────────────────── */
export function renderZodiacWheel(container) {
  if (container._zwBuilt) return;
  container._zwBuilt = true;

  let selected = 0;

  // Outer layout
  container.innerHTML = `
    <div class="zw-wrap">
      <div class="zw-wheel-col" id="zw-wheel-col"></div>
      <div class="zw-right-col" id="zw-doss-col"></div>
    </div>
    <p class="zw-hint">Click a wedge or use ← → to navigate</p>`;

  const wheelCol = container.querySelector('#zw-wheel-col');
  const dossCol  = container.querySelector('#zw-doss-col');

  function redraw() {
    wheelCol.innerHTML = buildWheelSVG(selected);
    dossCol.innerHTML  = buildDossier(selected);

    // Wire wedge clicks
    wheelCol.querySelectorAll('.zw-wedge').forEach((el) => {
      el.addEventListener('click', () => { selected = +el.dataset.i; redraw(); });
      el.addEventListener('mouseenter', () => { el.style.fill = ELEM_COLOR[SIGNS[+el.dataset.i].elem] + '28'; });
      el.addEventListener('mouseleave', () => { el.style.fill = ''; });
    });

    // Nav buttons
    dossCol.querySelector('#zw-prev').addEventListener('click', () => { selected = (selected + 11) % 12; redraw(); });
    dossCol.querySelector('#zw-next').addEventListener('click', () => { selected = (selected + 1)  % 12; redraw(); });
  }

  redraw();

  // Keyboard navigation
  function onKey(e) {
    if (container.closest('[style*="display: none"]') || container.closest('[hidden]')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown')  { selected = (selected + 1)  % 12; redraw(); e.preventDefault(); }
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')    { selected = (selected + 11) % 12; redraw(); e.preventDefault(); }
  }
  document.addEventListener('keydown', onKey);
  // Clean up when tab panel is removed from DOM
  new MutationObserver((_, obs) => {
    if (!document.contains(container)) { document.removeEventListener('keydown', onKey); obs.disconnect(); }
  }).observe(document.body, { childList: true, subtree: true });
}
