// Right-edge accordion panels — educational sidebars that slide out from the
// right side of the canvas when clicked.  Each panel is a vertical tab label
// pinned to the right edge; clicking expands a content pane to its left.
//
// Content sourced from teachastronomy.com (Ptolemy & the Geocentric Model),
// Ptolemy's Almagest, and the celestial-navigation literature.

const PANELS = [
  {
    id:    'panel-epicycles',
    label: 'Epicycles',
    icon:  '⟳',
    content: `
      <h3>Deferent &amp; Epicycle</h3>
      <p>Ptolemy explained each planet's looping path through two nested circles.
      The <strong>deferent</strong> is a large circle centred near Earth. The
      planet rides a smaller circle — the <strong>epicycle</strong> — whose centre
      moves along the deferent.</p>
      <p>As the epicycle centre travels the deferent, the planet traces a
      spirograph-like curve. When the planet is on the inner arc of its epicycle
      (closest to Earth) it appears to slow down, stop, and reverse — exactly
      the <em>retrograde motion</em> ancient observers recorded for Mars, Jupiter,
      and Saturn.</p>
      <p>The ratio of epicycle radius to deferent radius was tuned for each planet
      so the model reproduced decades of observation to within about one to two
      arc-minutes — roughly the limit of naked-eye precision.</p>
      <p>Mercury and Venus required an additional constraint: their epicycle
      centres had to stay locked to the Sun's direction from Earth, which is why
      they never stray far from the Sun in the sky.</p>
    `,
  },
  {
    id:    'panel-equant',
    label: 'Equant',
    icon:  '⊙',
    content: `
      <h3>The Equant Point</h3>
      <p>A circle spinning at a constant angular rate around its own centre
      can't reproduce the planets' varying speed across the sky.  Ptolemy
      introduced the <strong>equant point</strong>: a location offset from
      Earth on the opposite side of the deferent's geometric centre.</p>
      <p>The planet's epicycle centre moves so that it sweeps equal angles in
      equal times as seen from the equant — not from Earth, and not from the
      deferent centre.  This seemingly small change absorbed most of the
      remaining prediction error.</p>
      <p>Later Islamic astronomers (Ibn al-Haytham, al-Tusi) objected that the
      equant violated the ancient axiom of uniform circular motion and proposed
      alternatives.  Copernicus shared the objection and tried to eliminate it —
      one of his chief complaints against Ptolemy — but his own system still
      required epicycles to achieve comparable accuracy.</p>
    `,
  },
  {
    id:    'panel-two-sphere',
    label: 'Two Spheres',
    icon:  '🌐',
    content: `
      <h3>The Two-Sphere Model</h3>
      <p>Ptolemy's universe has two nested spheres.  The inner sphere is Earth
      — stationary, spherical, at the exact centre.  The outer sphere is the
      <strong>celestial sphere</strong>: an enormous shell that rotates westward
      once per day, carrying the fixed stars with it.</p>
      <p>Because the two spheres share a common axis and a common centre, every
      point in the sky has a direct mirror point on Earth's surface — its
      <strong>Geographic Position (GP)</strong>.  At any instant, the GP of a
      star is the point on Earth where the star is directly overhead (at the
      zenith).</p>
      <p>The coordinate systems of both spheres are identical in structure:
      declination (celestial) equals latitude (terrestrial); right ascension
      converts to longitude at 15° per hour.  This one-to-one mapping is not a
      coincidence — it is the whole point of the two-sphere model, and it is
      what makes celestial navigation mathematically possible.</p>
      <p>The <em>Nautical Almanac</em>, the graticule of latitude and longitude,
      and the intercept method of navigation all flow directly from this
      framework.  Ptolemy's two-sphere model is still the operative model in
      practical navigation today.</p>
    `,
  },
  {
    id:    'panel-history',
    label: 'History',
    icon:  '📜',
    content: `
      <h3>Ptolemy &amp; the Almagest</h3>
      <p>Claudius Ptolemy worked in Alexandria around 100–170 AD.  His
      <em>Almagest</em> ("The Greatest Compilation") is one of the most
      influential scientific texts ever written: a complete mathematical
      treatment of the motions of the Sun, Moon, and five visible planets,
      backed by a star catalogue of over 1,000 entries.</p>
      <p>The model rests on a philosophical foundation from Aristotle
      (384–322 BCE): the cosmos is made of concentric crystalline spheres;
      Earth occupies the centre; the heavenly bodies move in perfect circles.
      Ptolemy kept the circles but freed them from the strict concentric
      nesting, adding the eccentric, the epicycle, and the equant as
      mathematical devices to match observation.</p>
      <p>From the 9th century onward, Islamic scholars translated and extended
      the Almagest, computing new tables and identifying prediction drift as
      accumulated observational error grew.  European universities adopted it
      through Latin translations (12th–13th c.).  By the 13th century error
      had grown from ∼1–2 arcmin to ∼1–2°, prompting Alfonso X of Castile
      to commission the <em>Alfonsine Tables</em> — a recalibration, not a
      replacement.</p>
      <p>Copernicus (1543) moved the Sun to the centre and Earth into orbit,
      which eliminated the need to tie Mercury and Venus to the Sun's position.
      But he retained circular orbits and still needed epicycles for accuracy.
      Kepler's ellipses (1609) finally made epicycles unnecessary — but
      Ptolemy's two-sphere coordinate framework survived intact in every chart
      and almanac that followed.</p>
    `,
  },
  {
    id:    'panel-navigation',
    label: 'Navigation',
    icon:  '🧭',
    content: `
      <h3>Celestial Navigation</h3>
      <p>A navigator at sea has no landmarks.  The sky provides them.  At any
      moment, every celestial body has a <strong>Geographic Position</strong>
      on Earth directly beneath it.  The navigator's angular distance from that
      GP equals <em>90° minus the body's measured altitude</em> — a circle of
      position on the globe.</p>
      <p>Measure two or three bodies, compute their GPs from the almanac, and
      the circles intersect at your position.  This is the <em>intercept
      method</em> (Marcq Saint-Hilaire, 1875), still taught to naval officers
      worldwide.</p>
      <p>The <em>Nautical Almanac</em> tabulates each body's GP — expressed as
      <strong>Greenwich Hour Angle</strong> (longitude) and
      <strong>Declination</strong> (latitude) — for every hour of the year.
      Those numbers come from planetary theories descended directly from
      Ptolemy's period constants, updated with Newtonian mechanics and modern
      observation.</p>
      <p>The key insight: you do not need to know <em>why</em> a planet moves
      the way it does in order to use its position for navigation.  Ptolemy's
      tables were accurate enough for mariners for 1,400 years.  The underlying
      framework — stationary observer, celestial sphere overhead, GP concept —
      is unchanged in modern practice.</p>
    `,
  },
];

export function buildInfoPanels(container) {
  const wrap = document.createElement('div');
  wrap.id = 'info-panels-wrap';
  wrap.setAttribute('aria-label', 'Educational panels');

  let activeId = null;

  PANELS.forEach(({ id, label, icon, content }) => {
    const item = document.createElement('div');
    item.className = 'info-panel-item';
    item.id = id;

    // Vertical tab on the right edge
    const tab = document.createElement('button');
    tab.className = 'info-panel-tab';
    tab.setAttribute('aria-expanded', 'false');
    tab.setAttribute('aria-controls', id + '-body');
    tab.type = 'button';
    tab.innerHTML = `<span class="ip-icon">${icon}</span><span class="ip-label">${label}</span>`;

    // Content pane (starts collapsed)
    const body = document.createElement('div');
    body.className = 'info-panel-body';
    body.id = id + '-body';
    body.setAttribute('role', 'region');
    body.setAttribute('aria-labelledby', id + '-tab');
    tab.id = id + '-tab';
    body.hidden = true;
    body.innerHTML = content;

    tab.addEventListener('click', () => {
      const opening = activeId !== id;
      // Close whatever's open
      if (activeId) {
        const prev = wrap.querySelector('#' + activeId);
        if (prev) {
          prev.querySelector('.info-panel-tab').setAttribute('aria-expanded', 'false');
          prev.querySelector('.info-panel-body').hidden = true;
          prev.classList.remove('ip-open');
        }
      }
      if (opening) {
        activeId = id;
        tab.setAttribute('aria-expanded', 'true');
        body.hidden = false;
        item.classList.add('ip-open');
      } else {
        activeId = null;
      }
    });

    item.append(body, tab);
    wrap.appendChild(item);
  });

  container.appendChild(wrap);
  return wrap;
}
