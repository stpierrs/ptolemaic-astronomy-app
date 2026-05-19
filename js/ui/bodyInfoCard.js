// Body Info Card — bottom-sheet that slides up when a body is selected for tracking.
//
// Shows the body's name, category, orbital period, a short description, and
// tonight's computed rise / set times for the 8 main bodies.

import { JUPITER_MOON_DEFS } from '../core/jupiterMoons.js';
import { computeRiseSet, formatRiseSet } from '../core/riseSet.js';
import {
  isRetrograde,
  raDecToEclipticLon,
  lonToZodiac,
  PLANET_SYMBOLS,
} from '../core/astrology.js';
import { bodyRADec } from '../core/ephemeris.js';

// Static metadata for the 8 main bodies.
const BODY_INFO = {
  sun: {
    name: 'Sun (Sol)',
    cat: 'Central Luminary',
    period: '365.25 days',
    desc: "In Ptolemy's model the Sun rides an eccentric deferent centred slightly off Earth. Its annual journey traces the ecliptic, marking the seasons and governing all planetary mean motions.",
  },
  moon: {
    name: 'Moon (Luna)',
    cat: 'Inner Luminary',
    period: '29.5 days synodic · 27.3 days sidereal',
    desc: "Ptolemy assigned the Moon the innermost sphere. It rides a large deferent plus an epicycle, reproducing monthly phases, the varying angular size, and complex librations.",
  },
  mercury: {
    name: 'Mercury (Hermes)',
    cat: 'Inner Planet (inferior)',
    period: '87.97 days sidereal · 115.9 days synodic',
    desc: "The swiftest planet. Almagest Book IX gives Mercury the most complex model — a moving deferent centre and an equant — to match its erratic elongations from the Sun.",
  },
  venus: {
    name: 'Venus (Aphrodite)',
    cat: 'Inner Planet (inferior)',
    period: '224.7 days sidereal · 583.9 days synodic',
    desc: "Never straying more than 47° from the Sun, Venus blazes as the evening or morning star. Its Sun-anchored deferent means it can never appear at astronomical opposition.",
  },
  mars: {
    name: 'Mars (Ares)',
    cat: 'Outer Planet (superior)',
    period: '686.97 days',
    desc: "The red planet's prominent retrograde loops and large brightness variation made it Ptolemy's hardest target. Its bisected eccentricity model was his most precise achievement.",
  },
  jupiter: {
    name: 'Jupiter (Zeus)',
    cat: 'Outer Planet (superior)',
    period: '11.86 years',
    desc: "Ruler of the outer planets. Jupiter's slow retrograde loops occur roughly once per year as Earth overtakes it. Its four bright Galilean moons were discovered by Galileo in 1610.",
  },
  saturn: {
    name: 'Saturn (Kronos)',
    cat: 'Outer Planet (superior)',
    period: '29.46 years',
    desc: "The outermost classical planet. Its stately 30-year circuit and golden hue made Saturn the boundary of the ordered cosmos — beyond lay only the fixed-star sphere.",
  },
  neptune: {
    name: 'Neptune (Poseidon)',
    cat: 'Outer Planet (synthetic)',
    period: '164.8 years',
    desc: "Unknown to Ptolemy, discovered in 1846 by its gravitational pull on Uranus. This simulator adds Neptune via a synthetic outer-planet model consistent with Almagest equant geometry.",
  },
};

// Jupiter moon group labels by id.
const JMOON_GROUP = {
  metis:    'Inner Group',
  adrastea: 'Inner Group',
  amalthea: 'Inner Group',
  thebe:    'Inner Group',
  io:       'Galilean Moon',
  europa:   'Galilean Moon',
  ganymede: 'Galilean Moon',
  callisto: 'Galilean Moon',
  leda:     'Himalia Group',
  himalia:  'Himalia Group',
  lysithea: 'Himalia Group',
  elara:    'Himalia Group',
  ananke:   'Retrograde Outer Moon',
  carme:    'Retrograde Outer Moon',
  pasiphae: 'Retrograde Outer Moon',
  sinope:   'Retrograde Outer Moon',
};

// Build a Jupiter moon info object from JUPITER_MOON_DEFS.
function jmoonInfo(moonId) {
  const def = JUPITER_MOON_DEFS.find((d) => d.id === moonId);
  if (!def) return null;
  const absPeriod = Math.abs(def.period);
  const periodStr = absPeriod < 2
    ? `${absPeriod.toFixed(4)} days`
    : absPeriod < 365
    ? `${absPeriod.toFixed(2)} days`
    : `${(absPeriod / 365.25).toFixed(2)} years`;
  const retrograde = def.period < 0 ? ' (retrograde)' : '';
  return {
    name: `${def.name} (Jupiter moon)`,
    cat: JMOON_GROUP[moonId] || 'Jupiter Moon',
    period: periodStr + retrograde,
    desc: `One of Jupiter's moons. Orbital radius at maximum elongation: ${def.maxElong.toFixed(2)}°. Orbital inclination: ${def.incl}°.`,
  };
}

/** Retrieve body metadata for display. Returns null for star: IDs. */
function getBodyInfo(bodyId) {
  if (!bodyId) return null;
  if (BODY_INFO[bodyId]) return BODY_INFO[bodyId];
  if (bodyId.startsWith('jmoon:')) {
    const moonId = bodyId.slice(6);
    return jmoonInfo(moonId);
  }
  return null;
}

// The 8 bodies for which we compute rise/set (Jupiter moons would be too slow).
const RISE_SET_BODIES = new Set(['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'neptune']);

/**
 * Build the body info card and wire it to model state changes.
 * @param {import('../core/app.js').FeModel} model
 */
export function buildBodyInfoCard(model) {
  const card = document.createElement('div');
  card.id = 'body-info-card';
  card.setAttribute('aria-live', 'polite');

  card.innerHTML = `
    <div class="bic-handle"></div>
    <button class="bic-close" type="button" aria-label="Close body info" title="Close">✕</button>
    <div class="bic-name"></div>
    <div class="bic-category"></div>
    <div class="bic-period"></div>
    <div class="bic-zodiac" style="display:none">
      <div class="bic-riseSet-row">
        <span class="bic-rs-label">Zodiac:</span>
        <span class="bic-zodiac-pos">—</span>
        <span class="bic-retro-badge" style="display:none">℞ retrograde</span>
      </div>
    </div>
    <div class="bic-riseSet" style="display:none">
      <div class="bic-riseSet-row"><span class="bic-rs-label">Rises:</span> <span class="bic-rs-rise">—</span></div>
      <div class="bic-riseSet-row"><span class="bic-rs-label">Sets:</span> <span class="bic-rs-set">—</span></div>
    </div>
    <div class="bic-desc"></div>
  `;

  document.body.appendChild(card);

  const nameEl      = card.querySelector('.bic-name');
  const catEl       = card.querySelector('.bic-category');
  const periodEl    = card.querySelector('.bic-period');
  const zodiacEl    = card.querySelector('.bic-zodiac');
  const zodiacPosEl = card.querySelector('.bic-zodiac-pos');
  const retroBadge  = card.querySelector('.bic-retro-badge');
  const riseSetEl   = card.querySelector('.bic-riseSet');
  const riseEl      = card.querySelector('.bic-rs-rise');
  const setEl       = card.querySelector('.bic-rs-set');
  const descEl      = card.querySelector('.bic-desc');
  const closeBtn    = card.querySelector('.bic-close');

  closeBtn.addEventListener('click', () => {
    model.setState({ FollowTarget: null });
  });

  let _lastTarget = null;
  let _riseSetComputed = false;

  // Bodies for which we show ecliptic position
  const ASTRO_BODIES = new Set(['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn']);

  function updateZodiac(bodyId) {
    if (!ASTRO_BODIES.has(bodyId)) {
      zodiacEl.style.display = 'none';
      return;
    }
    zodiacEl.style.display = '';
    zodiacPosEl.textContent = '…';
    retroBadge.style.display = 'none';

    const EPOCH_MS = Date.UTC(2017, 0, 1);
    const dateTime = model.state.DateTime || 0;
    const source   = model.state.BodySource || 'epicycle2';
    const date     = new Date(EPOCH_MS + dateTime * 86400000);

    setTimeout(() => {
      try {
        const eq  = bodyRADec(bodyId, date, source);
        if (!Number.isFinite(eq.ra)) { zodiacEl.style.display = 'none'; return; }
        const lon = raDecToEclipticLon(eq.ra, eq.dec);
        const z   = lonToZodiac(lon);
        const sym = PLANET_SYMBOLS[bodyId] || '';
        zodiacPosEl.textContent = `${z.sign} ${z.symbol}  ${z.deg}°${String(z.min).padStart(2,'0')}'`;
        const retro = isRetrograde(bodyId, date, source);
        retroBadge.style.display = retro ? '' : 'none';
      } catch (_) {
        zodiacEl.style.display = 'none';
      }
    }, 0);
  }

  function updateRiseSet(bodyId) {
    if (!RISE_SET_BODIES.has(bodyId)) {
      riseSetEl.style.display = 'none';
      return;
    }
    riseSetEl.style.display = '';
    riseEl.textContent = '…';
    setEl.textContent = '…';

    const dateTime = model.state.DateTime || 0;
    const lat = model.state.ObserverLat  || 0;
    const lon = model.state.ObserverLong || 0;
    const source = model.state.EphemerisSource || 'epicycle2';

    // Run asynchronously so the card slides up immediately.
    setTimeout(() => {
      try {
        const rs = computeRiseSet(bodyId, lat, lon, dateTime, source);
        const fmt = formatRiseSet(rs);
        riseEl.textContent = fmt.rise;
        setEl.textContent  = fmt.set;
      } catch (err) {
        riseEl.textContent = 'N/A';
        setEl.textContent  = 'N/A';
      }
    }, 0);
  }

  model.addEventListener('update', () => {
    const ft = model.state.FollowTarget;

    if (ft === _lastTarget) return;
    _lastTarget = ft;
    _riseSetComputed = false;

    if (!ft) {
      card.classList.remove('open');
      return;
    }

    const info = getBodyInfo(ft);
    if (!info) {
      card.classList.remove('open');
      return;
    }

    nameEl.textContent   = info.name;
    catEl.textContent    = info.cat;
    periodEl.textContent = `Period: ${info.period}`;
    descEl.textContent   = info.desc;

    updateZodiac(ft);
    updateRiseSet(ft);

    card.classList.add('open');
  });
}
