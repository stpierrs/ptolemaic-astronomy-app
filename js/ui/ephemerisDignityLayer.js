// js/ui/ephemerisDignityLayer.js
// Read-only DOM helper: augments existing Live-Ephemeris HUD tracker
// blocks (built by js/ui/controlPanel.js#buildTrackerHud) with a left-edge
// dignity stripe + a small score badge. Pure overlay — does not modify
// the astronomy data computed elsewhere in the HUD.

import { getPlanetDignity } from '../core/dignities.js';
import { raDecToEclipticLon } from '../core/astrology.js';

const PLANETS = new Set(['sun','moon','mercury','venus','mars','jupiter','saturn']);
const DIG_CLASSES = ['dig-dom','dig-exalt','dig-tri','dig-term','dig-face','dig-per','dig-det','dig-fall'];

/**
 * @param {HTMLElement} blockEl - the tracker-block DOM node
 * @param {object}      info    - per-row info from buildTrackerHud
 *                                (must carry .target plus an ra/dec source)
 * @param {boolean}     isDiurnal - Sun above the horizon at the model's time
 */
export function applyDignityLayer(blockEl, info, isDiurnal) {
  if (!blockEl || !info) return;
  let name = info.target || info.name || '';
  if (typeof name === 'string') name = name.replace(/^body:/, '').toLowerCase();
  if (!PLANETS.has(name)) return;

  const ra  = info.ptolemy?.ra  ?? info.ra  ?? info.equatorial?.ra;
  const dec = info.ptolemy?.dec ?? info.dec ?? info.equatorial?.dec;
  if (!Number.isFinite(ra) || !Number.isFinite(dec)) return;

  let lon;
  try { lon = raDecToEclipticLon(ra, dec); }
  catch (_) { return; }

  let dig;
  try { dig = getPlanetDignity(name, lon, isDiurnal); }
  catch (_) { return; }

  // Apply / refresh the colour-coded edge stripe class.
  for (const c of DIG_CLASSES) blockEl.classList.remove(c);
  if (dig.domicile)        blockEl.classList.add('dig-dom');
  else if (dig.exaltation) blockEl.classList.add('dig-exalt');
  else if (dig.triplicity) blockEl.classList.add('dig-tri');
  else if (dig.term)       blockEl.classList.add('dig-term');
  else if (dig.face)       blockEl.classList.add('dig-face');
  else if (dig.detriment)  blockEl.classList.add('dig-det');
  else if (dig.fall)       blockEl.classList.add('dig-fall');
  else                     blockEl.classList.add('dig-per');

  // Score badge — append once, then update text on subsequent refreshes.
  let badge = blockEl.querySelector('.dig-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'dig-badge';
    const titleEl = blockEl.querySelector('.tracker-title')
                  || blockEl.querySelector('.title')
                  || blockEl.firstElementChild;
    if (titleEl) titleEl.appendChild(badge);
    else blockEl.appendChild(badge);
  }
  badge.textContent = dig.score > 0 ? `+${dig.score}` : dig.score === 0 ? '·' : `${dig.score}`;
  badge.title = `${dig.label} · ${(dig.breakdown || []).join(' · ')}`;
}
