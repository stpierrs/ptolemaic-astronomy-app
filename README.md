# Ptolemaic Astronomy & Astrology Simulator

An interactive, browser-based simulation of Ptolemy's geocentric cosmology, built with three.js.
The observer sits at the stationary centre of the universe; the Sun, Moon, and all planets
move above on deferents and epicycles exactly as described in the *Almagest* (c. 150 CE).
Every position is computed in real time from the historical tables — no heliocentric stage,
no gravitational constants, no AU.

## Live demo

`https://stpierrs.github.io/ptolemaic-astronomy-app/`

## Running locally

No build step. Static site — browsers block ES-module imports over `file://`, so use any
local HTTP server:

    python3 -m http.server 8000

Then open <http://localhost:8000>.

---

## Ephemeris engines

The simulator ships **two selectable ephemeris pipelines**, both fully geocentric:

### 1. Ptolemy — *Almagest* (c. 150 CE)

The original system, drawn directly from R.H. van Gent's *Almagest* Ephemeris Calculator,
a careful sexagesimal transcription of Ptolemy's own tables:

- **Sun** — eccentric circle with moving apogee; Ptolemy's measured obliquity of 23° 51′ 20″.
- **Moon** — deferent + epicycle + crank mechanism for evection; Ptolemy's two-inequality model.
- **Mercury** — oscillating deferent centre (moving perigee mechanism) + epicycle; the most complex
  Ptolemaic construction.
- **Venus** — large primary epicycle (R = 43;10 parts) locked to the solar mean longitude, producing
  the observed maximum elongation of ~47°.
- **Mars, Jupiter, Saturn** — eccentric deferent + epicycle with an equant point to account for
  observed non-uniform motion.

Accuracy: ~1°–2° against modern positions for the classical planets. That is not a bug — it is
the historical model doing exactly what the historical model does.

### 2. Ibn al-Shatir — Double-Epicycle (Damascus, c. 1350 CE)

Ibn al-Shatir's *Nihāyat al-Suʾl fī Taṣḥīḥ al-Uṣūl* ("The Final Quest Concerning the
Rectification of Principles") was the most rigorous reform of Ptolemaic astronomy before
Copernicus. Its core insight: **two uniformly-rotating epicycles can reproduce any eccentric
or equant motion without violating uniform circular motion**.

Key reforms over Ptolemy:

| Body | Ptolemaic problem | Al-Shatir's solution |
|---|---|---|
| All planets | Equant point (non-uniform rotation) | Small primary epicycle absorbs the equant; Earth at exact deferent centre |
| Moon | Crank mechanism → wildly varying distance (ratio 1.88:1) | Double epicycle → distance ratio ≈ 1.16, matching observed lunar diameter |
| Mercury | Oscillating deferent crank (non-uniform) | Tusi couple: inner circle counter-rotates at −2ω inside outer, producing linear oscillation |
| Venus | Equant-linked motion | Correction epicycle eliminates equant while preserving elongation limits |

The chain for each superior planet is: deferent (R₁) → primary epicycle (R₂, absorbs equant,
rotates at mean anomaly rate) → secondary epicycle (R₃, counter-rotates at −mean anomaly,
produces retrograde). Mean motion rates are preserved from Ptolemy's *Almagest* IX.3.

The simulator's implementation extends al-Shatir's framework with a **fitted second-epicycle
corrector** — parameters determined by minimising RMS angular error against JPL DE405 over
a 5-year calibration window (2019–2024). This reduces Mars's residual error from ~6.6° to
~4.2° and brings the other classical planets to sub-degree accuracy. DE405 is used only for
calibration; the runtime pipeline has no dependency on it.

---

## Feature list

### Celestial mechanics
- Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune — live epicycle positions
- Selectable ephemeris pipeline: Ptolemaic (*Almagest*) or Ibn al-Shatir double-epicycle
- Jupiter's four Galilean moons — Ptolemaic epicycle elements
- Venus phase — crescent to full and back, driven by epicycle geometry
- Moon phase — disc shading driven by Ptolemaic Sun–Moon geometry
- Solar and lunar eclipse prediction — 44 solar + 67 lunar demos (2021–2040, Espenak catalogue)
- Sun and Moon analemma traces — 5 latitude variants each

### Star catalogue
- Full starfield with classical precession, nutation (18.6 yr term), and annual aberration
- 58 Nautical Almanac navigational stars
- Constellation stick figures with labelled catalogue stars
- Trepidation toggle — historical oscillating-obliquity model for comparison with precession
- 11 black holes (Sgr A*, M87*, Cygnus X-1, …)
- 19 quasars (3C 273, OJ 287, BL Lacertae, …)
- 20 galaxies (M31, M82, M104, LMC, SMC, …)

### Orbital mechanics & satellites
- ISS, Hubble Space Telescope, Tiangong, Starlink shell representatives, James Webb (L2)
- Conceptual two-body Kepler elements for each satellite

### Views
- **Heavenly-orbit view** — bird's-eye overhead of the geocentric disc, free-camera
- **Optical first-person view** — look up from the observer's position; rendered elevation
  matches reported elevation 1:1
- Ground-point sub-tracks for any body (24-hour polyline)
- True-position overlay — shows geometric source direction vs. projected vault direction
- Day/night shadow terminator with eclipse-path ellipse

### Observer & time
- Observer latitude, longitude, elevation — adjustable to any point; 18 quick-hop cities
- Date, time, and timezone control — full history and future
- Autoplay at Day / Week / Month / Year speed presets; fine log-scaled speed slider
- Scripted demo browser — equinox, solstice, midnight sun, polar night, moon-phase month,
  observer travel, eclipse ground tracks, flight route playback

### Maps & projections
- Azimuthal equidistant (AE) projection — geocentric disc geometry
- Dual-pole AE variant
- Globe (GE) equirectangular sphere maps — day/night raster switching per frame
- High-quality raster daytime and nighttime maps

### Astrology
- Planetary aspects (conjunction, opposition, trine, sextile, square, …)
- Essential dignities — domicile, exaltation, detriment, fall for each planet
- Planetary hours — traditional hour rulers for each day

### Language & accessibility
- 18 supported languages: EN · CZ · ES · FR · DE · IT · PT · PL · NL · SK · RU · AR · HE · ZH · JA · KO · TH · HI
- URL-hash state — every setting serialised; share a complete setup as a link
- PWA manifest — installable from the browser on desktop and mobile (full-screen, offline-capable)
- Responsive layout — breakpoints at 900 px (tablet) and 520 px (phone)

---

## Controls

* **View tab** — observer position, camera, vault sizes, per-body vault heights, ray curvature
* **Time tab** — date, time, timezone, autoplay speed
* **Show tab** — visibility toggles for every layer
* **Tracker tab** — ephemeris pipeline selection, body tracking, GP paths
* **Demos tab** — scripted animations with Prev / Next / Pause / Stop
* **Info tab** — links to Ptolemy, the *Almagest*, and celestial navigation resources

---

## Special thanks

* **Shane St. Pierre** — conceptual framing and original design of the model
* **Walter Bislin** — visual style and layout inspiration
* **Fred Espenak** — eclipse catalogues and observed-position tables at
  [AstroPixels](https://www.astropixels.com/eclipses/)
* **Roohif** — flight-path KMZ data behind the Flight Routes demo group
* **R.H. van Gent** (Utrecht University) — *Almagest* Ephemeris Calculator, source for the
  Ptolemaic deferent + epicycle constants
