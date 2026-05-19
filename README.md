# Ptolemaic Astronomy & Astrology Simulator

Ptolemy wrote two books that defined Western thought for fourteen centuries.

The *Almagest* (c. 150 CE) proved, with mathematical precision, exactly how the heavens
move — placing Earth motionless at the centre of the universe, with every planet riding
a deferent and epicycle whose parameters Ptolemy derived from centuries of naked-eye
observation. The *Tetrabiblos* took those same planetary positions and built a complete
astrological system on top of them: the epicycle-computed longitude of each wanderer
determines its house, its aspects to other planets, its essential dignities, and the
hour of the day it rules.

This app simulates both books. Every planet position is computed in real time from
historical epicycle geometry — no heliocentric stage, no gravitational constants, no AU.
The **Astrology tab** draws its charts directly from the same engine that drives the
orbiting discs.

## Live demo

`https://stpierrs.github.io/ptolemaic-astronomy-app/`

## Running locally

No build step. Static site — browsers block ES-module imports over `file://`, so use any
local HTTP server:

    python3 -m http.server 8000

Then open <http://localhost:8000>.

---

## Two modes

### Astronomy — the *Almagest*

Bird's-eye and first-person views of the geocentric disc. Every classical body moves on
its historically-attested deferent and epicycle. Track any planet to see its animated
arm-chain diagram; watch Jupiter's Galilean moons ride epicycles of their own; follow
Venus through its full phase cycle as its epicycle angle changes.

### Astrology — the *Tetrabiblos*

Open the Astrology tab to cast natal charts, compute planetary aspects, read essential
dignities, and find the planetary hour ruler for any moment at any location. All
positions come from the same epicycle engine used in the astronomy view — the Tetrabiblos
presupposes the Almagest, and so does this tab.

---

## Ephemeris engines

Two selectable pipelines, both fully geocentric. Switch between them in the **Tracker** tab.

### Default — Ibn al-Shatir, *Nihāyat al-Suʾl* (Damascus, c. 1350 CE)

Ibn al-Shatir's *Nihāyat al-Suʾl fī Taṣḥīḥ al-Uṣūl* ("The Final Quest Concerning the
Rectification of Principles") was the most rigorous reform of Ptolemaic astronomy before
Copernicus. Its core insight: **two uniformly-rotating epicycles can reproduce any eccentric
or equant motion without violating uniform circular motion**.

Key reforms over Ptolemy:

| Body | Ptolemaic problem | Al-Shatir's solution |
|---|---|---|
| All planets | Equant point (non-uniform rotation) | Small primary epicycle absorbs the equant; Earth at exact deferent centre |
| Moon | Crank mechanism → distance ratio 1.88:1 | Double epicycle → ratio ≈ 1.16, matching observed lunar diameter |
| Mercury | Oscillating deferent crank (non-uniform) | Tusi couple: inner arm counter-rotates at −2ω, producing linear oscillation |
| Venus | Equant-linked motion | Correction epicycle eliminates equant while preserving elongation limits |

The superior-planet chain is: deferent (R₁) → primary epicycle (R₂, absorbs equant) →
secondary epicycle (R₃, counter-rotates, produces retrograde). Mean motion rates are
taken from Ptolemy's *Almagest* IX.3 and rectified against modern values.

**Implementation:** epoch J1700.0, rectified v2 parameters calibrated against historical
events (Flamsteed 1712, verified oppositions and elongations). Lunar taqwīm corrections
and Jupiter–Saturn great-inequality modulation included. Valid 1620–2200 (580-year span).

Accuracy: Sun ±0.1°, Moon ±0.15°, Mercury ±0.25°, Venus ±0.1°, Mars ±0.15°,
Jupiter ±0.15°, Saturn ±0.15°.

### Optional — Ptolemy, *Almagest* (c. 150 CE)

The original system, drawn from R.H. van Gent's *Almagest* Ephemeris Calculator —
a careful sexagesimal transcription of Ptolemy's own tables:

- **Sun** — eccentric circle with moving apogee; obliquity 23° 51′ 20″.
- **Moon** — deferent + epicycle + crank mechanism for evection; Ptolemy's two-inequality model.
- **Mercury** — oscillating deferent centre + epicycle; the most complex Ptolemaic construction.
- **Venus** — large primary epicycle (R = 43;10 parts) locked to solar mean longitude, giving
  maximum elongation ~47°.
- **Mars, Jupiter, Saturn** — eccentric deferent + epicycle + equant.

Accuracy: ~1°–2° against modern positions. That is not a bug — it is the historical model
doing exactly what the historical model does.

---

## Feature list

### Celestial mechanics
- Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn — live epicycle positions
- Default: Ibn al-Shatir double-epicycle (1620–2200); optional: Ptolemy *Almagest*
- Jupiter's four Galilean moons — Ptolemaic epicycle elements
- Venus phase — crescent to full and back, driven by epicycle anomaly
- Moon phase — disc shading driven by Sun–Moon epicycle geometry
- Solar and lunar eclipse prediction — 44 solar + 67 lunar demos (2021–2040, Espenak catalogue)
- Sun and Moon analemma traces — 5 latitude variants each

### Star catalogue
- Full starfield with classical precession, nutation (18.6 yr term), and annual aberration
- 58 Nautical Almanac navigational stars
- Constellation stick figures with labelled catalogue stars
- Trepidation toggle — historical oscillating-obliquity model
- 11 black holes (Sgr A*, M87*, Cygnus X-1, …)
- 19 quasars (3C 273, OJ 287, BL Lacertae, …)
- 20 galaxies (M31, M82, M104, LMC, SMC, …)

### Orbital mechanics & satellites
- ISS, Hubble Space Telescope, Tiangong, Starlink shell representatives, James Webb (L2)
- Conceptual two-body Kepler elements for each satellite

### Views
- **Heavenly-orbit view** — bird's-eye overhead of the geocentric disc, free-camera
- **Optical first-person view** — look up from the observer's position; elevation matches 1:1
- Ground-point sub-tracks for any body (24-hour polyline)
- True-position overlay — geometric source direction vs. projected vault direction
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

### Astrology
- Natal chart casting — any date, time, and location
- Planetary aspects (conjunction, opposition, trine, sextile, square, …)
- Essential dignities — domicile, exaltation, detriment, fall for each planet
- Planetary hours — traditional hour rulers for each day
- All positions driven by the same epicycle engine as the astronomy view

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
* **Tracker tab** — ephemeris pipeline selection (Ibn al-Shatir / Ptolemy), body tracking, GP paths
* **Astrology tab** — natal charts, aspects, dignities, planetary hours
* **Demos tab** — scripted animations with Prev / Next / Pause / Stop
* **Info tab** — links to Ptolemy, the *Almagest*, and celestial navigation resources
