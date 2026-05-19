// Simple Mode — hides the advanced tab bar and shows a streamlined
// planet-tracking strip instead. On by default for new users.
// Preference is persisted in localStorage.

const LS_KEY = 'ptol-simple-mode';

const PLANETS = [
  { id: 'sun',     label: 'Sun',     symbol: '☉', color: '#ffc844' },
  { id: 'moon',    label: 'Moon',    symbol: '☽', color: '#e8e8e8' },
  { id: 'mars',    label: 'Mars',    symbol: '♂', color: '#d05040' },
  { id: 'mercury', label: 'Mercury', symbol: '☿', color: '#d0b090' },
  { id: 'venus',   label: 'Venus',   symbol: '♀', color: '#fff0a0' },
  { id: 'jupiter', label: 'Jupiter', symbol: '♃', color: '#ffa060' },
  { id: 'saturn',  label: 'Saturn',  symbol: '♄', color: '#e4c888' },
];

function isSimpleMode() {
  const stored = localStorage.getItem(LS_KEY);
  return stored === null ? true : stored === '1'; // default ON for new users
}

function applyMode(simple) {
  localStorage.setItem(LS_KEY, simple ? '1' : '0');
  document.body.classList.toggle('simple-mode', simple);
}

export function initSimpleMode(model) {
  const bottomBar = document.getElementById('bottom-bar');
  if (!bottomBar) return;

  // Inject the simple bar into the bottom bar (after the existing rows)
  const simpleBar = buildSimpleBar(model);
  bottomBar.appendChild(simpleBar);

  // Add a "Simple Mode" toggle button to the header for use in full mode
  const header = document.querySelector('header');
  if (header) {
    const toggleBtn = buildSimpleModeHeaderBtn();
    const infoBox = header.querySelector('.info-box');
    if (infoBox) header.insertBefore(toggleBtn, infoBox);
    else header.appendChild(toggleBtn);
  }

  // Apply the stored preference (or default ON)
  applyMode(isSimpleMode());
}

function buildSimpleBar(model) {
  const bar = document.createElement('div');
  bar.id = 'simple-bar';

  // ── Planet tracking buttons ──────────────────────────────────────────
  const planets = document.createElement('div');
  planets.className = 'simple-bar-planets';

  PLANETS.forEach(({ id, label, symbol, color }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'simple-planet-btn';
    btn.title = label;
    btn.style.setProperty('--planet-color', color);

    const sym = document.createElement('span');
    sym.className = 'spb-symbol';
    sym.textContent = symbol;

    const lbl = document.createElement('span');
    lbl.className = 'spb-label';
    lbl.textContent = label;

    btn.append(sym, lbl);

    function refresh() {
      const targets = Array.isArray(model.state.TrackerTargets) ? model.state.TrackerTargets : [];
      btn.classList.toggle('on', targets.includes(id));
    }

    btn.addEventListener('click', () => {
      const cur = Array.isArray(model.state.TrackerTargets) ? [...model.state.TrackerTargets] : [];
      if (cur.includes(id)) {
        model.setState({ TrackerTargets: cur.filter(t => t !== id) });
      } else {
        model.setState({ TrackerTargets: [...cur, id], FollowTarget: id });
      }
    });

    model.addEventListener('update', refresh);
    refresh();
    planets.appendChild(btn);
  });

  bar.appendChild(planets);

  // ── "Full Controls" exit button ──────────────────────────────────────
  const fullBtn = document.createElement('button');
  fullBtn.type = 'button';
  fullBtn.className = 'simple-full-btn';
  fullBtn.title = 'Show all controls';
  fullBtn.innerHTML = 'Full Controls <span class="sfb-arrow">›</span>';
  fullBtn.addEventListener('click', () => applyMode(false));

  bar.appendChild(fullBtn);

  return bar;
}

// Small header button visible only in full mode — lets users return to simple mode.
function buildSimpleModeHeaderBtn() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'info-btn header-action-btn simple-mode-header-btn';
  btn.title = 'Switch to Simple Mode';
  btn.textContent = '⊡';
  btn.addEventListener('click', () => applyMode(true));
  return btn;
}
