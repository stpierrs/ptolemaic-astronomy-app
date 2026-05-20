// js/ui/chartWheelSvg.js
// PART 21 — SVG natal chart wheel.
//
// Coordinate system: 600×600 viewBox, centre (300, 300). ASC sits at the
// 9-o'clock position (180° canvas angle). Sign arcs run anti-clockwise as
// ecliptic longitude increases — matches the Canvas wheel in astrologyApp.

import {
  ZODIAC_SYMBOLS, PLANET_SYMBOLS, lonToZodiac,
} from '../core/astrology.js';

const CX = 300, CY = 300;
const R_OUTER  = 280;
const R_ZODIAC = 240;
const R_STAR   = 210;
const R_HOUSE  = 190;
const R_PLANET = 170;
const R_ASPECT =  90;

const TRIPLICITY_FILL = {
  fire:  '#3a1a14', earth: '#1f2a14',
  air:   '#142a3a', water: '#14143a',
};
const TRIPLICITY_TEXT = {
  fire: '#ff9060', earth: '#d8c458',
  air:  '#60cce8', water: '#8898ff',
};
const ASPECT_STYLE = {
  Conjunction: null,
  Sextile:     { stroke: '#4A7FB5', strokeWidth: 1,   strokeDasharray: '4,3', opacity: 0.6 },
  Square:      { stroke: '#C54040', strokeWidth: 1.2, strokeDasharray: '',    opacity: 0.7 },
  Trine:       { stroke: '#C8A84B', strokeWidth: 1.5, strokeDasharray: '',    opacity: 0.8 },
  Opposition:  { stroke: '#888',    strokeWidth: 1,   strokeDasharray: '6,3', opacity: 0.6 },
};
const PLANET_COLOUR = {
  sun:'#ffd060', moon:'#dcdcf0', mercury:'#a8d888',
  venus:'#ffb8cc', mars:'#ff7055', jupiter:'#d4b878', saturn:'#c4aa78',
};
const ZODIAC_ELEM = ['fire','earth','air','water','fire','earth','air','water','fire','earth','air','water'];

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs, text) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === '') continue;
    e.setAttribute(k, v);
  }
  if (text != null) e.textContent = text;
  return e;
}

function polar(r, deg) {
  // ASC at 9 o'clock: canvas-angle = 180° + (degOnWheel)
  const rad = deg * Math.PI / 180;
  return { x: CX - r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function lonToWheel(lon, ascLon) {
  // 0 (at ASC) .. 360 going counter-clockwise around the wheel
  return ((lon - ascLon) % 360 + 360) % 360;
}

/**
 * @param {object} chart   - from buildNatalChart
 * @param {object} opts    - { size, outerChart, outerLabel }
 * @returns {SVGElement}
 */
export function renderChartWheelSvg(chart, opts = {}) {
  const size = opts.size || 600;
  const svg = el('svg', {
    viewBox: '0 0 600 600',
    width:  size, height: size,
    'data-wheel': 'svg',
  });
  svg.appendChild(el('rect', { x:0, y:0, width:600, height:600, fill:'#0D1117' }));

  const asc = chart.ascLon ?? 0;
  const mc  = chart.mcLon  ?? 0;

  drawZodiacRing(svg, asc);
  drawDegreeTicks(svg, asc);
  drawHouseDividers(svg, asc, mc);
  drawHouseLabels(svg, asc);
  drawAspects(svg, chart, asc);
  drawPlanets(svg, chart, asc);
  drawLots(svg, chart, asc);
  if (opts.outerChart) drawOuterRing(svg, opts.outerChart, asc, opts.outerLabel);
  drawCentre(svg, chart);

  return svg;
}

function drawZodiacRing(svg, ascLon) {
  for (let i = 0; i < 12; i++) {
    const elem  = ZODIAC_ELEM[i];
    const a1    = lonToWheel(i * 30,     ascLon);
    const a2    = lonToWheel((i+1)*30,   ascLon);
    const oS    = polar(R_OUTER, a1);
    const oE    = polar(R_OUTER, a2);
    const iS    = polar(R_ZODIAC, a1);
    const iE    = polar(R_ZODIAC, a2);
    const d = `M ${oS.x} ${oS.y} ` +
              `A ${R_OUTER} ${R_OUTER} 0 0 0 ${oE.x} ${oE.y} ` +
              `L ${iE.x} ${iE.y} ` +
              `A ${R_ZODIAC} ${R_ZODIAC} 0 0 1 ${iS.x} ${iS.y} Z`;
    svg.appendChild(el('path', { d, fill: TRIPLICITY_FILL[elem],
                                  stroke: '#2A2A3A', 'stroke-width': 0.5 }));
    const mid = polar((R_OUTER + R_ZODIAC) / 2, a1 + 15);
    svg.appendChild(el('text', {
      x: mid.x, y: mid.y, 'font-size': 16, fill: TRIPLICITY_TEXT[elem],
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-family': "'Cinzel',Georgia,serif",
    }, ZODIAC_SYMBOLS[i]));
  }
}

function drawDegreeTicks(svg, ascLon) {
  for (let lon = 0; lon < 360; lon++) {
    const isMajor = lon % 30 === 0;
    const isMid   = lon % 5  === 0;
    if (!isMajor && !isMid) continue;
    const a = lonToWheel(lon, ascLon);
    const outerR = R_ZODIAC;
    const innerR = isMajor ? R_ZODIAC - 12 : R_ZODIAC - 5;
    const o = polar(outerR, a), i = polar(innerR, a);
    svg.appendChild(el('line', {
      x1: o.x, y1: o.y, x2: i.x, y2: i.y,
      stroke: '#888', 'stroke-width': isMajor ? 1 : 0.5,
      opacity: isMajor ? 1 : 0.5,
    }));
  }
}

function drawHouseDividers(svg, ascLon, mcLon) {
  for (let i = 0; i < 12; i++) {
    const a = lonToWheel(i * 30, ascLon);
    const o = polar(R_ZODIAC, a), c = polar(R_ASPECT - 10, a);
    svg.appendChild(el('line', {
      x1: o.x, y1: o.y, x2: c.x, y2: c.y,
      stroke: '#444', 'stroke-width': 0.5, opacity: 0.6,
    }));
  }
  for (const [lon, lab] of [[ascLon, 'ASC'], [mcLon, 'MC']]) {
    if (typeof lon !== 'number') continue;
    const a = lonToWheel(lon, ascLon);
    const p1 = polar(R_ZODIAC, a), p2 = polar(R_ZODIAC, a + 180);
    svg.appendChild(el('line', {
      x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
      stroke: '#C8A84B', 'stroke-width': 1.5, opacity: 0.9,
    }));
    const pos = polar(R_ZODIAC + 15, a);
    svg.appendChild(el('text', {
      x: pos.x, y: pos.y, 'font-size': 10, fill: '#C8A84B',
      'text-anchor': 'middle',
    }, lab));
  }
}

function drawHouseLabels(svg, ascLon) {
  const roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  for (let h = 1; h <= 12; h++) {
    const midLon = ((Math.floor(ascLon / 30) + (h - 1)) % 12) * 30 + 15;
    const a = lonToWheel(midLon, ascLon);
    const pos = polar(R_HOUSE, a);
    svg.appendChild(el('text', {
      x: pos.x, y: pos.y, 'font-size': 10, fill: '#888',
      'text-anchor': 'middle', 'dominant-baseline': 'central',
    }, roman[h - 1]));
  }
}

function drawAspects(svg, chart, ascLon) {
  const aspects = chart.interpretation?.aspects ?? chart.aspects ?? [];
  for (const a of aspects) {
    const style = ASPECT_STYLE[a.aspect?.name];
    if (!style) continue;
    const planets = chart.planets || [];
    const p1 = planets.find(x => x.name === a.planetA?.name);
    const p2 = planets.find(x => x.name === a.planetB?.name);
    if (!p1 || !p2) continue;
    const a1 = lonToWheel(p1.lon, ascLon);
    const a2 = lonToWheel(p2.lon, ascLon);
    const pos1 = polar(R_ASPECT, a1), pos2 = polar(R_ASPECT, a2);
    svg.appendChild(el('line', {
      x1: pos1.x, y1: pos1.y, x2: pos2.x, y2: pos2.y,
      stroke: style.stroke, 'stroke-width': style.strokeWidth,
      'stroke-dasharray': style.strokeDasharray,
      opacity: a.aspect.applying ? style.opacity : style.opacity * 0.6,
    }));
  }
}

// Fan-out helper for clustered planets (≤7° apart)
function fanOutClusters(planets, threshold = 7) {
  const arr = planets.slice().sort((a, b) => a.lon - b.lon);
  for (let i = 0; i < arr.length; ) {
    let end = i;
    while (end + 1 < arr.length && (arr[end + 1].lon - arr[i].lon) < threshold) end++;
    if (end > i) {
      const n = end - i + 1;
      const mid = arr.slice(i, end + 1).reduce((s, p) => s + p.lon, 0) / n;
      const spread = threshold * 0.8;
      for (let k = i; k <= end; k++) {
        arr[k].display_lon = mid + (k - i - (n - 1) / 2) * (spread / n);
      }
    }
    i = end + 1;
  }
  return arr;
}

function drawPlanets(svg, chart, ascLon) {
  const arr = fanOutClusters(chart.planets || [], 7);
  for (const p of arr) {
    const a = lonToWheel(p.display_lon ?? p.lon, ascLon);
    const pos = polar(R_PLANET, a);
    const colour = PLANET_COLOUR[p.name] || '#fff';

    svg.appendChild(el('text', {
      x: pos.x, y: pos.y, 'font-size': 18, fill: colour,
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      'data-planet': p.name,
    }, PLANET_SYMBOLS[p.name] || ''));

    if (p.retrograde) {
      const rPos = polar(R_PLANET - 14, a);
      svg.appendChild(el('text', {
        x: rPos.x, y: rPos.y, 'font-size': 9, fill: colour,
        'text-anchor': 'middle', 'font-style': 'italic',
      }, 'R'));
    }
    const degStr = Math.floor(((p.lon % 30) + 30) % 30) + '°';
    const degPos = polar(R_PLANET + 16, a);
    svg.appendChild(el('text', {
      x: degPos.x, y: degPos.y, 'font-size': 9, fill: '#777',
      'text-anchor': 'middle',
    }, degStr));

    if (p.display_lon && p.display_lon !== p.lon) {
      const trueA = lonToWheel(p.lon, ascLon);
      const trueP = polar(R_PLANET - 5, trueA);
      svg.appendChild(el('line', {
        x1: pos.x, y1: pos.y, x2: trueP.x, y2: trueP.y,
        stroke: colour, 'stroke-width': 0.5, opacity: 0.5,
        'stroke-dasharray': '2,2',
      }));
    }
  }
}

function drawLots(svg, chart, ascLon) {
  const lots = chart.interpretation?.lots;
  if (!lots) return;
  const place = (lon, glyph, colour) => {
    if (typeof lon !== 'number') return;
    const a = lonToWheel(lon, ascLon);
    const p = polar(R_PLANET - 30, a);
    svg.appendChild(el('text', {
      x: p.x, y: p.y, 'font-size': 12, fill: colour,
      'text-anchor': 'middle', 'dominant-baseline': 'central',
    }, glyph));
  };
  place(lots.fortune?.lon, '⊕', '#C8A84B');
  place(lots.spirit?.lon,  '⊗', '#A0A8C8');
  place(lots.eros?.lon,    '◉', '#B488C8');
}

// Bi-wheel: optional outer ring for synastry / transits / solar return.
function drawOuterRing(svg, outerChart, ascLon, label) {
  const R_OUT = R_PLANET + 50;
  for (const p of (outerChart.planets || [])) {
    const a = lonToWheel(p.lon, ascLon);
    const pos = polar(R_OUT, a);
    svg.appendChild(el('text', {
      x: pos.x, y: pos.y, 'font-size': 14, fill: '#ffd060',
      'text-anchor': 'middle', 'dominant-baseline': 'central', opacity: 0.85,
    }, PLANET_SYMBOLS[p.name] || ''));
  }
  if (label) {
    svg.appendChild(el('text', {
      x: CX, y: 18, 'font-size': 10, fill: '#ffd060', 'text-anchor': 'middle',
    }, label));
  }
}

function drawCentre(svg, chart) {
  svg.appendChild(el('circle', {
    cx: CX, cy: CY, r: R_ASPECT - 5,
    fill: '#0D1117', stroke: '#333', 'stroke-width': 0.5,
  }));
  const lordName = chart.interpretation?.chartLord?.name || '—';
  const tempName = chart.interpretation?.temperament?.temperament || '';
  const lines = [
    { text: chart.meta?.name || '',                 y: CY - 30, fs: 14, fill: '#E8E4D8' },
    { text: formatBirthDate(chart.meta?.birth),     y: CY - 12, fs: 10, fill: '#888'    },
    { text: chart.isDiurnal ? '☉ Day chart' : '☽ Night chart', y: CY + 6,  fs: 10, fill: '#888' },
    { text: 'Lord: ' + lordName,                    y: CY + 22, fs: 10, fill: '#C8A84B' },
    ...(tempName ? [{ text: tempName, y: CY + 36, fs: 10, fill: '#888' }] : []),
  ];
  for (const l of lines) {
    svg.appendChild(el('text', {
      x: CX, y: l.y, 'font-size': l.fs, fill: l.fill,
      'text-anchor': 'middle', 'dominant-baseline': 'central',
    }, l.text));
  }
}

function formatBirthDate(b) {
  if (!b || !b.year) return '';
  return `${b.year}-${String(b.month || 1).padStart(2,'0')}-${String(b.day || 1).padStart(2,'0')}`;
}

export default renderChartWheelSvg;
