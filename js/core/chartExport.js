// js/core/chartExport.js
// PART 24 — Export chart as JSON / SVG / PNG / PDF / social-share card.
//
// jsPDF is loaded dynamically from js/vendor/jspdf.umd.min.js (note: the
// filename keeps the .umd.min suffix for spec alignment, but the actual
// bundle vendored there is the ESM build, which `import()` consumes
// cleanly). If the vendor file isn't present, exportPdf falls back to
// opening a printable HTML window.

import { renderChartWheelSvg } from '../ui/chartWheelSvg.js';
import { buildReport } from './reportGenerator.js';

// ── SVG → string / PNG ────────────────────────────────────────────────────

export function svgToString(svgEl) {
  return new XMLSerializer().serializeToString(svgEl);
}

/**
 * Rasterise an SVGElement to a PNG data URL via offscreen canvas.
 */
export function svgToPngDataUrl(svgEl, px = 1000) {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') return reject(new Error('No DOM'));
    const str  = svgToString(svgEl);
    const blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const img  = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = px; c.height = px;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#0D1117';
      ctx.fillRect(0, 0, px, px);
      ctx.drawImage(img, 0, 0, px, px);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

// ── JSON ──────────────────────────────────────────────────────────────────

export function exportJson(chart) {
  const out = {
    export_version: '1.0',
    engine:         'ibn-al-shatir-double-epicycle',
    generated_at:   new Date().toISOString(),
    meta:           chart.meta,
    astronomy:      {
      positions: chart.astronomy?.positions,
      angles:    chart.astronomy?.angles,
    },
    interpretation: chart.interpretation,
  };
  return JSON.stringify(out, null, 2);
}

// ── SVG ───────────────────────────────────────────────────────────────────

export function exportSvg(chart) {
  const svg = renderChartWheelSvg(chart, { size: 1000 });
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + svgToString(svg);
}

// ── PNG ───────────────────────────────────────────────────────────────────

export async function exportPng(chart, size = 1200) {
  const svg = renderChartWheelSvg(chart, { size });
  return svgToPngDataUrl(svg, size);
}

// ── Share card (1200×630) ─────────────────────────────────────────────────

export async function exportShareCard(chart) {
  const W = 1200, H = 630;
  const wheelSvg = renderChartWheelSvg(chart, { size: 600 });
  const wheelPng = await svgToPngDataUrl(wheelSvg, 600);

  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0D1117';
  ctx.fillRect(0, 0, W, H);

  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = wheelPng; });
  ctx.drawImage(img, 15, 15, 600, 600);

  ctx.fillStyle = '#E8E4D8';
  ctx.font = '36px Georgia, serif';
  ctx.fillText(chart.meta?.name || 'Nativity', 640, 80);

  const b = chart.meta?.birth;
  if (b) {
    ctx.font = '18px Georgia, serif';
    ctx.fillStyle = '#888';
    const pad = n => String(n).padStart(2, '0');
    ctx.fillText(`Born ${b.year}-${pad(b.month)}-${pad(b.day)}`, 640, 110);
  }

  ctx.fillStyle = '#C8A84B';
  ctx.font = '22px Georgia, serif';
  ctx.fillText(`Chart lord: ${chart.interpretation?.chartLord?.name || '—'}`, 640, 160);
  ctx.fillText(`Temperament: ${chart.interpretation?.temperament?.temperament || '—'}`, 640, 200);
  ctx.fillText(chart.isDiurnal ? '☉ Diurnal' : '☽ Nocturnal', 640, 240);

  ctx.fillStyle = '#666';
  ctx.font = '14px Georgia, serif';
  ctx.fillText('ptolemaic-astronomy-app', 640, 600);

  return c.toDataURL('image/png');
}

// ── PDF (jsPDF if available; HTML print fallback otherwise) ───────────────

export async function exportPdf(chart) {
  let jsPDF;
  try {
    const mod = await import('../vendor/jspdf.umd.min.js');
    jsPDF = mod.jsPDF || mod.default || (typeof window !== 'undefined' && window.jspdf?.jsPDF);
  } catch (_) {
    jsPDF = (typeof window !== 'undefined') ? window.jspdf?.jsPDF : null;
  }
  if (!jsPDF) return printableHtml(chart);   // graceful fallback

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const wheelPng = await exportPng(chart, 1200);

  // Page 1: wheel
  doc.addImage(wheelPng, 'PNG', 60, 60, 480, 480);
  doc.setFontSize(14);
  doc.text(chart.meta?.name || 'Nativity', 297, 580, { align: 'center' });

  // Page 2: planet positions
  doc.addPage();
  doc.setFontSize(12);
  doc.text('Planetary positions', 60, 60);
  doc.setFontSize(10);
  let y = 80;
  for (const p of (chart.planets || [])) {
    doc.text(`${p.symbol || ''} ${p.name}`, 60, y);
    doc.text(`λ ${p.lon.toFixed(2)}°`, 200, y);
    doc.text(`House ${p.house ?? '—'}`, 320, y);
    doc.text(p.retrograde ? 'R' : '', 420, y);
    y += 14;
  }

  // Page 3+: Tetrabiblos-ordered report sections
  const report = buildReport(chart);
  for (const [key, sec] of Object.entries(report.sections)) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text(`${key.toUpperCase()} — ${sec.headline}`, 60, 60);
    doc.setFontSize(10);
    y = 90;
    for (const para of (sec.body || [])) {
      const lines = doc.splitTextToSize(para, 480);
      doc.text(lines, 60, y);
      y += lines.length * 12 + 6;
      if (y > 760) { doc.addPage(); y = 60; }
    }
  }

  // Footer on every page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Ptolemaic Astrology · Ibn al-Shatir double-epicycle engine',
             297, 820, { align: 'center' });
  }

  return doc.output('blob');
}

function printableHtml(chart) {
  if (typeof window === 'undefined') return null;
  const win = window.open('', '_blank');
  if (!win) return null;
  const report = buildReport(chart);
  win.document.write(`
    <!doctype html><html><head><title>${escHtml(chart.meta?.name || 'Chart')}</title>
    <style>
      body { font-family: Georgia, serif; background:#fff; color:#111;
             max-width:700px; margin:40px auto; padding:0 24px; }
      h2 { border-bottom: 1px solid #ccc; }
      p  { line-height: 1.55; }
    </style>
    </head><body>
    <h1>${escHtml(chart.meta?.name || 'Nativity')}</h1>
    ${Object.entries(report.sections).map(([key, sec]) => `
      <h2>${escHtml(key.toUpperCase())} — ${escHtml(sec.headline)}</h2>
      ${(sec.body || []).map(p => `<p>${escHtml(p)}</p>`).join('')}
    `).join('')}
    </body></html>
  `);
  win.document.close();
  return null;
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Download helpers ─────────────────────────────────────────────────────

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function downloadDataUrl(dataUrl, filename) {
  triggerDownload(dataUrl, filename);
}

export function downloadText(text, filename, type = 'application/json') {
  downloadBlob(new Blob([text], { type }), filename);
}

function triggerDownload(href, filename) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
