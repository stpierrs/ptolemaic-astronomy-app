// Onboarding Tutorial Overlay — shown once per browser, gated by localStorage.
// v2: four slides covering the two modes (astronomy + astrology) and the
// historical relationship between the Almagest and the Tetrabiblos.

const LS_KEY = 'ptol-onboarding-v2';

export function resetOnboarding() {
  localStorage.removeItem(LS_KEY);
}

export function maybeShowOnboarding() {
  if (localStorage.getItem(LS_KEY)) return;

  const overlay = document.createElement('div');
  overlay.id = 'onboarding-overlay';

  const steps = [
    {
      title: 'Two Books, One Universe',
      body: "Ptolemy wrote two books that defined Western thought for fourteen centuries. The Almagest proved, with mathematical precision, exactly how the heavens move. The Tetrabiblos explained what those movements mean. This app simulates both — the geometry that makes a planet's position calculable, and the astrological framework built on top of it.",
      extra: buildEpicyclePreview(),
    },
    {
      title: 'Earth at the Centre — The Almagest',
      body: "In the Almagest (c. 150 CE) Ptolemy placed Earth motionless at the centre of the universe. Each planet rides a small circle — the epicycle — whose centre traces a larger circle — the deferent. Their overlapping rotations reproduce retrograde motion, the varying speeds of the planets, and the unequal seasons, all through pure circular geometry. Ibn al-Shatir of Damascus (c. 1350 CE) refined this framework: two epicycles per planet eliminate Ptolemy's equant, bringing lunar distances and planetary positions to sub-degree accuracy. His double-epicycle engine is this app's default.",
    },
    {
      title: 'Epicycles Drive the Horoscope',
      body: "The Tetrabiblos opens with the Almagest's math as its premise: before interpreting the sky, you must know where each planet stands. The zodiacal longitude computed from the deferent and epicycle determines a planet's house position, its aspects to other planets, its essential dignity (domicile, exaltation, detriment, fall), and the ruling planet of each hour of the day. Every natal chart cast from Ptolemy's era through the Renaissance — and this app's Astrology tab — uses exactly these same circles.",
    },
    {
      title: 'Getting Started',
      body: "Tap any planet label on the disc to track it — an animated epicycle diagram appears in the corner. Open the Astrology tab for natal charts, planetary aspects, and hourly rulers. In the Tracker tab you can switch between Ibn al-Shatir's double-epicycle (1620–2200, ±0.15°) and Ptolemy's original Almagest parameters. Tap the 📍 button to centre the simulation on your current location and see exactly what is in your sky right now.",
    },
  ];

  let current = 0;

  const card = document.createElement('div');
  card.className = 'onboarding-card';
  overlay.appendChild(card);

  const skipLink = document.createElement('button');
  skipLink.className = 'onboarding-skip';
  skipLink.type = 'button';
  skipLink.textContent = 'Skip';
  skipLink.addEventListener('click', finish);
  overlay.appendChild(skipLink);

  document.body.appendChild(overlay);
  render();

  function render() {
    const step = steps[current];
    card.innerHTML = '';

    const stepCount = document.createElement('div');
    stepCount.className = 'onboarding-step-count';
    stepCount.textContent = `${current + 1} / ${steps.length}`;
    card.appendChild(stepCount);

    const title = document.createElement('h2');
    title.className = 'onboarding-title';
    title.textContent = step.title;
    card.appendChild(title);

    if (step.extra) {
      const extraWrap = document.createElement('div');
      extraWrap.className = 'onboarding-extra';
      extraWrap.appendChild(step.extra);
      card.appendChild(extraWrap);
    }

    const body = document.createElement('p');
    body.className = 'onboarding-body';
    body.textContent = step.body;
    card.appendChild(body);

    const nav = document.createElement('div');
    nav.className = 'onboarding-nav';

    if (current > 0) {
      const back = document.createElement('button');
      back.className = 'onboarding-btn secondary';
      back.type = 'button';
      back.textContent = '← Back';
      back.addEventListener('click', () => { current--; render(); });
      nav.appendChild(back);
    }

    const next = document.createElement('button');
    next.className = 'onboarding-btn primary';
    next.type = 'button';
    next.textContent = current === steps.length - 1 ? 'Get Started' : 'Next →';
    next.addEventListener('click', () => {
      if (current < steps.length - 1) { current++; render(); }
      else finish();
    });
    nav.appendChild(next);

    card.appendChild(nav);
  }

  function finish() {
    localStorage.setItem(LS_KEY, '1');
    overlay.style.transition = 'opacity 0.35s';
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 400);
  }
}

function buildEpicyclePreview() {
  const cv = document.createElement('canvas');
  cv.width  = 160;
  cv.height = 160;
  cv.className = 'onboarding-preview-canvas';
  const ctx = cv.getContext('2d');

  let angle = 0;
  let rafId = null;
  let mounted = true;

  function draw() {
    if (!mounted) return;
    ctx.clearRect(0, 0, 160, 160);

    const cx = 80, cy = 80;

    // Deferent
    ctx.beginPath();
    ctx.arc(cx, cy, 55, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(212,160,32,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Epicycle centre
    const ecx = cx + 55 * Math.cos(angle);
    const ecy = cy + 55 * Math.sin(angle);

    // Deferent arm
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ecx, ecy);
    ctx.strokeStyle = 'rgba(212,160,32,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Epicycle circle
    ctx.beginPath();
    ctx.arc(ecx, ecy, 22, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(180,220,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Planet on epicycle
    const px = ecx + 22 * Math.cos(-angle * 2.5);
    const py = ecy + 22 * Math.sin(-angle * 2.5);
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#d4a020';
    ctx.fill();

    // Earth at centre
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#4488cc';
    ctx.fill();

    angle += 0.018;
    rafId = requestAnimationFrame(draw);
  }

  draw();

  const obs = new MutationObserver(() => {
    if (!document.body.contains(cv)) {
      mounted = false;
      if (rafId) cancelAnimationFrame(rafId);
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });

  return cv;
}
