// Feature 1: Onboarding Tutorial Overlay
// Three-step walkthrough shown once per browser, gated by localStorage.

const LS_KEY = 'ptol-onboarding-v1';

export function resetOnboarding() {
  localStorage.removeItem(LS_KEY);
}

export function maybeShowOnboarding() {
  if (localStorage.getItem(LS_KEY)) return;

  const overlay = document.createElement('div');
  overlay.id = 'onboarding-overlay';

  const steps = [
    {
      title: '🪐 Track Any Planet',
      body: "Tap any body label on the disc — or open the Tracker tab — to lock on. An animated Ptolemaic epicycle diagram appears in the corner.",
      extra: buildEpicyclePreview(),
    },
    {
      title: '🔭 Jupiter\'s Moons',
      body: "Track any of Jupiter's 16 moons for a compound Ptolemaic diagram: Jupiter's 12-year deferent plus the moon's own epicycle. Io, Europa, and Ganymede show their 1:2:4 Laplace resonance.",
    },
    {
      title: '📍 Your Sky, Right Now',
      body: "Tap the 📍 button in the header to place yourself on the map using GPS. The simulation updates to show exactly what's in your sky at this moment.",
    },
  ];

  let current = 0;

  const card = document.createElement('div');
  card.className = 'onboarding-card';
  overlay.appendChild(card);

  const skipLink = document.createElement('button');
  skipLink.className = 'onboarding-skip';
  skipLink.type = 'button';
  skipLink.textContent = 'Skip tutorial';
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

    // Deferent line
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

    // Planet
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

  // Stop animating when removed from DOM
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
