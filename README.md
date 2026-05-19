# Ptolemaic Astronomy & Astrology Simulator

An interactive, browser-based simulation of Ptolemy's geocentric cosmology, built with three.js.
The scene renders the observer's position on the ground plane, the vault of the heavens above, and
the optical dome onto which the Sun, Moon, stars, and planets are projected. Every motion in the sky
is driven by Ptolemy's deferent-and-epicycle machinery, tuned to the period constants published in
the *Almagest* (c. 150 CE). No heliocentric constants. No gravitational constant. Just the sky,
described the way Ptolemy described it.

## Live demo

`https://stpierrs.github.io/ptolemaic-astronomy-app/`

## Running locally

No build step. It's a static site, but browsers block ES-module imports over `file://`, so you need
any local HTTP server:

    python3 -m http.server 8000

Then open <http://localhost:8000>.

## Controls

* **View tab** — observer lat/long, camera, heavenly vault, optical vault,
  per-body vault heights, ray shape.
* **Time tab** — day of year, time, date-time.
* **Show tab** — visibility toggles for land, grid, shadow terminator,
  starfield, rays, declination circles, etc.
* **Demos tab** — scripted camera/time animations illustrating key phenomena
  from the Almagest.

The "ⓘ About" button in the header explains the model's geocentric geometry and the
relationship between the observer, the optical vault, and the heavenly vault.

## Historical basis

The ephemeris runs directly on Ptolemy's *Almagest* tables — the same mathematical
framework used by astronomers from 150 CE through the early 1600s:

- The Sun rides an eccentric circle with a moving apogee.
- Each planet rides a deferent carrying an epicycle, with the equant point accounting
  for non-uniform motion.
- Mercury has the extra moving-deferent mechanism Ptolemy devised to match observation.
- The Moon's model includes the crank mechanism for evection.
- Fixed-star positions receive classical precession, nutation, and aberration corrections.

This is an educational tool and historical recreation, not a navigation instrument.

## Special Thanks

* **Shane St. Pierre** — for the conceptual framing and the push to actually
  build a working, interactive demonstration of the Ptolemaic model.
* **Walter Bislin** — for visual style and layout inspiration.
* **Fred Espenak** — for the public eclipse catalogues and observed-position
  tables on [AstroPixels](https://www.astropixels.com/eclipses/), used by the
  eclipse-demo refiner to pin the moment of each historical eclipse to its
  observed time. See `js/core/ephemerisAstropixels.js` and
  `js/data/astropixelsEclipses.js` for the runtime attribution.
* **Roohif** — for the flight-path KMZ data behind the Flight Routes demo group.
* **R.H. van Gent** (Utrecht University) — Almagest Ephemeris Calculator, the
  source for the Ptolemaic deferent + epicycle code the simulation runs on.

Without their work, their published theory, and their public data tables,
this wouldn't exist.
