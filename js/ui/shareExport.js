// Feature 2: Screenshot / Share Export
// Composites feCanvas + epicycleCanvas + watermark, then shares via
// Web Share API (mobile) or downloads a PNG (desktop).

export function buildShareButton(headerEl, model, feCanvas, epicycleCanvas) {
  const btn = document.createElement('button');
  btn.className = 'info-btn header-action-btn';
  btn.type = 'button';
  btn.title = 'Screenshot / Share';
  btn.textContent = '📸';

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const origText = btn.textContent;
    btn.textContent = '⏳';

    try {
      // Offscreen composite canvas matching feCanvas pixel size
      const w = feCanvas.width  || feCanvas.offsetWidth  || 1920;
      const h = feCanvas.height || feCanvas.offsetHeight || 1080;

      const off = document.createElement('canvas');
      off.width  = w;
      off.height = h;
      const ctx = off.getContext('2d');

      // Layer 1: main FE canvas
      ctx.drawImage(feCanvas, 0, 0, w, h);

      // Layer 2: epicycle overlay — position it in the bottom-right corner
      // mirroring its CSS layout (bottom: 8px; right: 8px).
      if (epicycleCanvas && epicycleCanvas.width && epicycleCanvas.height) {
        const ecW = epicycleCanvas.width;
        const ecH = epicycleCanvas.height;
        const margin = Math.round(w * 0.008);
        const destX  = w - ecW - margin;
        const destY  = h - ecH - margin;
        ctx.drawImage(epicycleCanvas, destX, destY);
      }

      // Layer 3: watermark — bottom-left, small gold text
      const fontSize = Math.max(12, Math.round(w * 0.012));
      ctx.font = `${fontSize}px system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(212, 160, 32, 0.85)';
      ctx.textBaseline = 'bottom';
      const margin = Math.round(w * 0.008);
      ctx.fillText('Ptolemaic Astronomy & Astrology', margin, h - margin);

      // Convert to blob
      const blob = await new Promise((resolve) =>
        off.toBlob(resolve, 'image/png')
      );

      if (!blob) throw new Error('Canvas toBlob returned null');

      const file = new File([blob], 'ptolemy.png', { type: 'image/png' });

      // Web Share API (mobile / modern browsers)
      if (
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: 'Ptolemaic Astronomy & Astrology',
          files: [file],
        });
      } else {
        // Fallback: direct download
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = 'ptolemy.png';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } catch (err) {
      if (err && err.name !== 'AbortError') {
        console.warn('Share/export failed:', err);
      }
    } finally {
      btn.disabled = false;
      btn.textContent = origText;
    }
  });

  // Insert before the .info-box
  const infoBox = headerEl.querySelector('.info-box');
  if (infoBox) {
    headerEl.insertBefore(btn, infoBox);
  } else {
    headerEl.appendChild(btn);
  }
}
