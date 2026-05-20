// Stellarium mobile-style time bar — unified for god mode and first-person mode.
// Bottom-docked, dark-glass, with date/time display, play/pause, step buttons,
// speed presets, and a scrub track (drag left/right to move through time).

const EPOCH_MS = Date.UTC(2017, 0, 1);
const MS_PER_DAY = 86400000;

const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function dtToDate(dt) { return new Date(EPOCH_MS + dt * MS_PER_DAY); }
function dateToDt(d)  { return (d.getTime() - EPOCH_MS) / MS_PER_DAY; }
function nowDt()      { return dateToDt(new Date()); }

function fmtDateTime(dt) {
  const d  = dtToDate(dt);
  const mo = MON[d.getUTCMonth()];
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const yr = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mn = String(d.getUTCMinutes()).padStart(2, '0');
  return { date: `${dd} ${mo} ${yr}`, time: `${hh}:${mn} UTC` };
}

// Speed presets — label shown on preset chip, days_per_sec for autoplay.
const SPEED_PRESETS = [
  { label: '1h',  dps: 1 / 24      },
  { label: '1d',  dps: 1           },
  { label: '1wk', dps: 7           },
  { label: '1mo', dps: 30          },
  { label: '1yr', dps: 365.25      },
];
const DEFAULT_DPS = 1 / 24; // 1 sim-hour per real second (matches Autoplay default)

export function buildStelTimeBar(model) {
  const bar = document.createElement('div');
  bar.className = 'stel-bar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Time controls');

  // Helpers
  const getDt  = () => model.state.DateTime || 0;
  const setDt  = (v) => model.setState({ DateTime: v });
  const ap     = () => model._autoplay;

  function stepDays(n)   { setDt(getDt() + n); }
  function stepMonths(n) {
    const d = dtToDate(getDt());
    d.setUTCMonth(d.getUTCMonth() + n);
    setDt(dateToDt(d));
  }
  function stepYears(n)  {
    const d = dtToDate(getDt());
    d.setUTCFullYear(d.getUTCFullYear() + n);
    setDt(dateToDt(d));
  }

  function mk(tag, cls, txt, ttl) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (txt != null) el.textContent = txt;
    if (ttl) el.title = ttl;
    return el;
  }
  function btn(cls, txt, ttl) {
    const b = mk('button', `stel-btn ${cls}`, txt, ttl);
    b.type = 'button';
    return b;
  }

  // ── drag-to-move handle (top of bar) ────────────────────────────────
  const dragHandle = mk('div', 'stel-drag-handle');
  dragHandle.title = 'Drag to move time bar';
  const dragGrip = mk('span', 'stel-drag-grip', '⠿⠿⠿');
  dragHandle.appendChild(dragGrip);

  let _moveX = 0, _moveY = 0;
  let _moveDragStartX = 0, _moveDragStartY = 0;
  let _moveActive = false;

  dragHandle.addEventListener('pointerdown', (e) => {
    _moveActive = true;
    _moveDragStartX = e.clientX;
    _moveDragStartY = e.clientY;
    dragHandle.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  dragHandle.addEventListener('pointermove', (e) => {
    if (!_moveActive) return;
    const zoom = parseFloat(getComputedStyle(bar).zoom) || 1;
    _moveX += (e.clientX - _moveDragStartX) / zoom;
    _moveY += (e.clientY - _moveDragStartY) / zoom;
    _moveDragStartX = e.clientX;
    _moveDragStartY = e.clientY;
    bar.style.transform = `translateX(calc(-50% + ${_moveX}px)) translateY(${_moveY}px)`;
  });
  dragHandle.addEventListener('pointerup',     () => { _moveActive = false; });
  dragHandle.addEventListener('pointercancel', () => { _moveActive = false; });

  // ── scrub track (drag to move time) ─────────────────────────────────
  const scrubTrack = mk('div', 'stel-scrub-track');
  const scrubArrowL = mk('span', 'stel-scrub-arrow stel-scrub-arrow-l', '◀ Past');
  const scrubThumb  = mk('div',  'stel-scrub-thumb');
  const scrubArrowR = mk('span', 'stel-scrub-arrow stel-scrub-arrow-r', 'Future ▶');
  scrubTrack.append(scrubArrowL, scrubThumb, scrubArrowR);

  let _scrubbing = false;
  let _scrubX0 = 0;
  let _scrubDt0 = 0;
  const SCRUB_DAYS_PER_PX = 0.25; // 1 day per 4px drag

  scrubTrack.addEventListener('pointerdown', (e) => {
    _scrubbing = true;
    _scrubX0 = e.clientX;
    _scrubDt0 = getDt();
    scrubTrack.setPointerCapture(e.pointerId);
    scrubTrack.classList.add('scrubbing');
    if (ap() && ap().playing) {
      ap().pause();
      bar._pausedForScrub = true;
    }
    e.preventDefault();
  });
  scrubTrack.addEventListener('pointermove', (e) => {
    if (!_scrubbing) return;
    const dx = e.clientX - _scrubX0;
    setDt(_scrubDt0 + dx * SCRUB_DAYS_PER_PX);
  });
  const endScrub = () => {
    if (!_scrubbing) return;
    _scrubbing = false;
    scrubTrack.classList.remove('scrubbing');
    if (bar._pausedForScrub) {
      bar._pausedForScrub = false;
      if (ap()) ap().play();
    }
  };
  scrubTrack.addEventListener('pointerup',     endScrub);
  scrubTrack.addEventListener('pointercancel', endScrub);

  // ── main control row ─────────────────────────────────────────────────
  const mainRow = mk('div', 'stel-main-row');

  // Left: step back
  const leftGroup = mk('div', 'stel-group');
  const bYear  = btn('stel-step', '−1yr', 'Back 1 year');
  const bMonth = btn('stel-step', '−1mo', 'Back 1 month');
  const bDay   = btn('stel-step', '−1d',  'Back 1 day');
  leftGroup.append(bYear, bMonth, bDay);

  // Center-left: rewind / play / fast-forward
  const playGroup = mk('div', 'stel-group stel-play-group');
  const rewBtn  = btn('stel-rew',  '⏪', 'Reverse / speed up rewind');
  const playBtn = btn('stel-play', '▶',  'Play / Pause');
  const ffBtn   = btn('stel-ff',   '⏩', 'Fast-forward / speed up');
  playGroup.append(rewBtn, playBtn, ffBtn);

  // Center: date/time display
  const display = mk('div', 'stel-display', null, 'Drag left/right to scrub time');
  const dateEl  = mk('div', 'stel-date');
  const timeEl  = mk('div', 'stel-time');
  display.append(dateEl, timeEl);

  // Add drag-to-scrub on the display itself too
  display.addEventListener('pointerdown', (e) => {
    _scrubbing = true;
    _scrubX0 = e.clientX;
    _scrubDt0 = getDt();
    display.setPointerCapture(e.pointerId);
    display.classList.add('scrubbing');
    if (ap() && ap().playing) {
      ap().pause();
      bar._pausedForScrub = true;
    }
    e.preventDefault();
  });
  display.addEventListener('pointermove', (e) => {
    if (!_scrubbing) return;
    const dx = e.clientX - _scrubX0;
    setDt(_scrubDt0 + dx * SCRUB_DAYS_PER_PX);
  });
  const endDisplayScrub = () => {
    if (!_scrubbing) return;
    _scrubbing = false;
    display.classList.remove('scrubbing');
    if (bar._pausedForScrub) {
      bar._pausedForScrub = false;
      if (ap()) ap().play();
    }
  };
  display.addEventListener('pointerup',     endDisplayScrub);
  display.addEventListener('pointercancel', endDisplayScrub);

  // Right: step forward + now
  const rightGroup = mk('div', 'stel-group');
  const fDay   = btn('stel-step', '+1d',  'Forward 1 day');
  const fMonth = btn('stel-step', '+1mo', 'Forward 1 month');
  const fYear  = btn('stel-step', '+1yr', 'Forward 1 year');
  const nowBtn = btn('stel-now',  '⌂',   'Jump to today');
  rightGroup.append(fDay, fMonth, fYear, nowBtn);

  mainRow.append(leftGroup, playGroup, display, rightGroup);

  // ── speed preset row ─────────────────────────────────────────────────
  const speedRow = mk('div', 'stel-speed-row');
  const speedLbl = mk('span', 'stel-speed-lbl', 'Speed');
  speedRow.appendChild(speedLbl);

  let _activeSpeed = DEFAULT_DPS;

  const presetBtns = SPEED_PRESETS.map((p) => {
    const b = btn('stel-preset', p.label, `Autoplay at ${p.label} per second`);
    b.addEventListener('click', () => {
      _activeSpeed = p.dps;
      const a = ap();
      if (a) {
        a.setSpeed(p.dps);
        if (!a.playing) a.play();
      }
      refreshPresets();
      refreshPlay();
    });
    speedRow.appendChild(b);
    return { btn: b, dps: p.dps };
  });

  // Assemble bar
  bar.append(dragHandle, scrubTrack, mainRow, speedRow);

  // ── event wiring ─────────────────────────────────────────────────────
  bYear.addEventListener('click',  () => stepYears(-1));
  bMonth.addEventListener('click', () => stepMonths(-1));
  bDay.addEventListener('click',   () => stepDays(-1));
  fDay.addEventListener('click',   () => stepDays(1));
  fMonth.addEventListener('click', () => stepMonths(1));
  fYear.addEventListener('click',  () => stepYears(1));
  nowBtn.addEventListener('click', () => setDt(nowDt()));

  const DEFAULT_RW_DPS = -(DEFAULT_DPS); // reverse at default speed

  rewBtn.addEventListener('click', () => {
    const a = ap();
    if (!a) return;
    const s = a.speed;
    if (s > 0) {
      a.setSpeed(-s);           // flip to reverse
    } else {
      a.setSpeed(s * 2);        // double rewind speed
    }
    if (!a.playing) a.play();
    refreshPlay();
    refreshPresets();
  });

  ffBtn.addEventListener('click', () => {
    const a = ap();
    if (!a) return;
    const s = a.speed;
    const maxDps = 365.25;
    if (s < 0) {
      a.setSpeed(-s);                                   // flip to forward
    } else {
      a.setSpeed(Math.min(maxDps, s * 2));              // double ff speed
    }
    if (!a.playing) a.play();
    refreshPlay();
    refreshPresets();
  });

  playBtn.addEventListener('click', () => {
    const a = ap();
    if (!a) return;
    if (!a.playing) {
      if (a.speed === 0) a.setSpeed(_activeSpeed);
      a.play();
    } else {
      a.pause();
    }
    refreshPlay();
    refreshPresets();
  });

  // ── refresh functions ─────────────────────────────────────────────────
  function refreshDisplay() {
    const { date, time } = fmtDateTime(getDt());
    dateEl.textContent = date;
    timeEl.textContent = time;
  }

  function refreshPlay() {
    const a  = ap();
    const pl = a ? a.playing : false;
    const s  = a ? a.speed   : _activeSpeed;
    playBtn.textContent = pl ? '⏸' : '▶';
    playBtn.setAttribute('aria-pressed', pl ? 'true' : 'false');
    bar.classList.toggle('stel-playing', pl);
    // Dim rewind/ff when near their limits
    rewBtn.setAttribute('aria-pressed', (pl && s < 0) ? 'true' : 'false');
    ffBtn.setAttribute('aria-pressed',  (pl && s > 0) ? 'true' : 'false');
  }

  function refreshPresets() {
    const a   = ap();
    const spd = a ? Math.abs(a.speed) : _activeSpeed;
    presetBtns.forEach(({ btn: b, dps }) => {
      const active = Math.abs(dps - spd) < 1e-6;
      b.setAttribute('aria-current', active ? 'true' : 'false');
    });
  }

  // Wire into model update for display refresh
  model.addEventListener('update', refreshDisplay);

  // Wire autoplay — it may not be attached to model yet, poll briefly
  function wireAutoplay() {
    const a = ap();
    if (!a) return false;
    a.onChange(() => { refreshPlay(); refreshPresets(); });
    _activeSpeed = Math.abs(a.speed) || DEFAULT_DPS;
    return true;
  }

  if (!wireAutoplay()) {
    let _polls = 0;
    const _poll = setInterval(() => {
      if (wireAutoplay() || ++_polls > 40) clearInterval(_poll);
      refreshPlay();
      refreshPresets();
    }, 200);
  }

  refreshDisplay();
  refreshPlay();
  refreshPresets();

  return bar;
}
