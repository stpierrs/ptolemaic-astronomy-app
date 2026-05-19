# Ptolemaic Astronomy Simulator — Legend & Feature Reference

An interactive simulation of Ptolemy's geocentric astronomy as described in the *Almagest* (c. 150 AD). The observer sits at the centre of a rotating celestial sphere; the Sun, Moon, and planets move on deferents and epicycles tuned to Almagest period constants. No physical units, no assumed earth radius.

---

## Two layers, one observer

- **Optical vault** — the cap overhead onto which the sun, moon, planets, and starfield project. In first-person (Optical) view the cap is a strict hemisphere so rendered elevation matches reported elevation 1:1.
- **True positions** — the heavenly-vault reading that places each body at its geographic ground point. Toggle on to see the underlying geometry; toggle off to see only what reaches the observer's eye.

---

## Sun and Moon bodies

When zoomed in inside the optical vault (Optical view, body actively tracked):

- **Moon** — disc with phase shading driven by the Ptolemaic sun–moon geometry, faint rim outline so the moon stays distinct from the sun at new moon.
- **Sun** — yellow disc with procedural sunspots and an additive-blend halo. Sized to match the moon so a solar eclipse overlays cleanly.
- **Equirect day/night map (GE)** — when the active map is `hq_equirect_*`, the renderer flips between the day and night raster per frame based on the observer's sun angle.

---

# Bottom bar — icon legend

The dark bar runs the full width of the viewport.

## Transport (left cluster)

| Icon | Meaning |
| --- | --- |
| 🌐 / 👁 | Vault swap. 🌐 = Heavenly orbit; 👁 = Optical first-person. Click to flip. |
| ⏪ | Rewind. First click reverses direction; subsequent clicks double the negative magnitude. |
| ▶ / ⏸ | Play / Pause. Pressing ▶ resets autoplay to the Day preset. While a demo is playing, this pauses / resumes without ending it. |
| ⏩ | Fast-forward. Mirror of ⏪. |
| ½× | Halve current speed magnitude. Direction preserved. |
| 2× | Double current speed magnitude. Direction preserved. |
| End Demo / End Tracking | Appears in the info bar while a demo is active or a target is tracked. Click to stop. |

### Country quick-hops

A compact 5 × 2 grid of ISO 3-letter codes:

`USA · BRA · GBR · EGY · ZAF · RUS · IND · JPN · AUS · ARG`

One click sets the observer's lat/lon to that country's representative city. Hover for full name + decimal coords.

## Compass cluster (centre-right)

Three vertical sub-stacks: a swap-stack (1 × 2), a mode grid (4 × 2), a cycle row (2 × 2), and a cardinal grid (2 × 2).

### Swap stack

| Icon | Meaning |
| --- | --- |
| 👁 / 🌐 | **Vault swap.** Lights up an accent border while in Optical view. |
| ↕ | **Toggle observer marker.** Shows the orange axis line + dots. Double-click the orange dot to teleport between surface and pole; drag to relocate. |

### Mode grid

| Icon | Meaning |
| --- | --- |
| 🌙 | Toggle **Permanent Night** (stars stay visible). |
| ◉ | Toggle **True Positions** — vault dots showing each body's geographic source direction. |
| 🎯 | **Specified Tracker Mode** — narrow the scene to just the active `FollowTarget`. |
| ▦ | Combined grid toggle — flips vault grid + azimuth ring + longitude ring together. |
| 📍 | Jump to the **Observer** group in the View tab. |
| 🎥 | **Free-camera** mode. Arrow keys rotate the orbit camera. |
| 🔦 | Cycle the **Rays** layer. |
| ⌫ | **Clear Trace** — wipes any active tracer polylines. |

### Cycle row

| Icon | Meaning |
| --- | --- |
| 🗺 | Open **Map Projection** settings. |
| ✨ | Cycle **Starfield** variant. |
| 🧭 | Toggle the full compass readout. |
| EN / CZ / ES / … | **Language cycler.** Click to step through the 18 supported languages. |

### Cardinal grid

| Icon | Meaning |
| --- | --- |
| N | Snap heading to North (0°). |
| E | Snap to East (90°). |
| W | Snap to West (270°). |
| S | Snap to South (180°). |

## Search boxes

- **Body search** — type 3+ characters of any celestial body. Suggestions are colour-coded by category. Enter / click engages the tracking protocol.
- **Visibility search** — type 2+ characters of any Show- or Tracker-tab setting. Results list `Tab › Group`; click to open + expand.

## Tabs

**View / Time / Show / Tracker / Demos / Info**. Each opens a popup anchored above its button. Click again or press <kbd>Esc</kbd> to close.

---

# View tab

## Observer

- **Figure** — observer figure: various sprites plus None.
- **ObserverLat / ObserverLong** — observer's position on the graticule, step 0.0001°.
- **Elevation** — observer height above the disc.
- **Heading** — compass facing 0–360° CW from north.
- Nudge buttons: ±1°, ±1′, ±1″.
- Arrow keys pan lat/lon; <kbd>Space</kbd> toggles play/pause.

## Camera (Heavenly orbit)

- **CameraDir** — orbit azimuth, −180° … +180°.
- **CameraHeight** — orbit elevation, −30° … +89.9°.
- **CameraDist** — orbit distance, 2–100.
- **Zoom** — orbit zoom, 0.1–10×.

Optical first-person uses its own `OpticalZoom`; values don't leak between the two.

## Vault of the Heavens

- **VaultSize / VaultHeight** — horizontal radius and flattened-cap ratio for the Heavenly dome.

## Optical Vault

- **Size / Height** — horizontal radius and vertical extent of the Optical cap.

## Body Vaults

Per-body heights: Starfield, Moon, Sun, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune.

## Rays

- **RayParam** — curvature for the bezier ray lines.

---

# Time tab

## Calendar

- **Timezone** — UTC offset in minutes.
- **Date / time** — direct date-time entry; slider also available.

## Autoplay

- **▶ Pause / Resume**, **status** chip, **Day / Week / Month / Year** speed presets.
- **Speed** — fine slider in d/s (days per real-second), log-scaled.

---

# Show tab

Visibility groups:

- **Heavenly Vault** — vault, vault grid, sun / moon tracks.
- **Optical Vault** — vault, grid, azimuth ring, facing vector, celestial poles, declination circles.
- **Ground** — graticule grid, Tropic of Cancer, Equator, Tropic of Capricorn, Polar Circles, Sun / Moon GP, Shadow, longitude ring.
- **Rays** — vault rays, optical vault rays, projection rays.
- **Cosmology** — Axis Mundi variants.
- **Map Projection** — FE math projections and HQ raster maps; GE equirectangular sphere maps.
- **Misc** — Planets, Dark Background.

---

# Tracker tab

The Tracker is the single source of truth for body visibility.

## Ephemeris

- **Source** — Ptolemy's deferent + epicycle (*Almagest*), via the Almagest Ephemeris Calculator. The runtime ephemeris for the model.
- **Precession** — classical J2000-to-date precession applied to fixed-star RA / Dec.
- **Nutation** — short-period wobble of the celestial pole (~18.6 yr term).
- **Aberration** — annual aberration: stars shift up to ~20″ along an annual ellipse.
- **Trepidation** — historical pre-Newtonian model of an oscillating obliquity, for comparison with precession.

> **Note**: Precession / Nutation / Aberration apply to *fixed-star* RA/Dec only. Ptolemy's planet readings are deferent + epicycle — none of the modern corrections apply; the readings are intentionally historical.

## Tracker Options

- **Specified Tracker Mode** — lock attention on a single object (`FollowTarget`).
- **GP Override** — paints a body's ground-point even when the master Show Ground Points toggle is off.
- **True Positions** — heavenly-vault dots showing each body's true geographic source direction.
- **GP Path (24 h)** — 24-hour sub-point polyline on the disc for every tracked body.

## Sub-menus

Every sub-menu has the same four chrome rows: **Show**, **GP Override**, **Enable All**, **Disable All**. The button grid below lists every entry; click to toggle membership in `TrackerTargets`.

### Per-category contents

- **Celestial Bodies** — Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune.
- **Cel Nav** — 58 Nautical-Almanac navigational stars.
- **Constellations** — named catalogue stars with optional stick-figure outlines.
- **Black Holes** — 11 entries (Sgr A*, M87*, Cygnus X-1, etc.).
- **Quasars** — 19 entries (3C 273, OJ 287, BL Lacertae, etc.).
- **Galaxies** — 20 entries (M31, M82, M104, LMC, SMC, etc.).
- **Satellites** — ISS, Hubble, Tiangong, Starlink-shell representatives, James Webb (L2). Conceptual two-body Kepler elements.

---

# Demos tab

Scripted-animation browser. Controls: **Stop**, **Pause / Resume**, **Prev / Next**. While a demo plays:

- Transport bar ▶ / ⏸ pauses in place; ½× / 2× scale its tempo.
- **End Demo** appears in the info bar.
- Autoplay is suspended so pause truly freezes time.
- Default playback runs at 1/8 the authored cadence (use 2× to speed up).
- Pre-demo state snapshots on play and restores on stop.

Sections:

- **24 h Sun (4)** — polar-sun demonstrations (Alert NU, West Antarctica, midnight sun N/S). Auto-switches the map to HQ Equirectangular Daytime.
- **24 h Moon (2)** — 75°N and 75°S, near maximum declination standstills.
- **General (6)** — equinox at equator, summer / winter solstice at 45°N, moon-phase month, observer travel, 78°N 24-hour daylight.
- **Sun Analemma / Moon Analemma / Sun + Moon Analemma** — 5 latitude variants each (90°N, 45°N, 0°, 45°S, 90°S). Trace and noon-position notches render in both FE and GE views on the observer's local sky hemisphere.
- **Solar Eclipses (44 entries, 2021–2040)** — one per real solar eclipse (Espenak). Demo refines syzygy time using the active pipeline's own sun + moon.
- **Lunar Eclipses (67 entries, 2021–2040)** — same structure, including 22 penumbrals.

---

# Info tab

Resources for learning more about Ptolemaic astronomy, the *Almagest*, and celestial navigation:

- **[Ptolemy and the Geocentric Model](https://www.teachastronomy.com/textbook/The-Copernican-Revolution/Ptolemy-and-the-Geocentric-Model/)** — teachastronomy.com overview of the deferent-epicycle system and its historical context.
- **[Almagest (Wikipedia)](https://en.wikipedia.org/wiki/Almagest)** — overview of the text, its contents, and its transmission through Islamic and European scholarship.
- **[Ptolemy (Wikipedia)](https://en.wikipedia.org/wiki/Claudius_Ptolemy)** — biography and works.
- **[Celestial Navigation (Wikipedia)](https://en.wikipedia.org/wiki/Celestial_navigation)** — the intercept method and its relationship to the two-sphere model.
- **[Nautical Almanac (Wikipedia)](https://en.wikipedia.org/wiki/Nautical_almanac)** — how GP tables are constructed and used.
- **[Almagest Book III — Online Text](https://www.wilbourhall.org/pdfs/AlmagestPtolemy.pdf)** — the full *Almagest* in English translation (Toomer).

---

# HUD panels

- **Main HUD (top-left, collapsible)** — Live Moon Phases header. Body holds DateTime, sun + moon az/el, moon phase %, next solar + lunar eclipse countdowns, moon-phase illustration.
- **Live Ephemeris tracker HUD** — toggled by the button under the HUD. One card per tracked body with az/el and per-pipeline RA/Dec rows.
- **Bottom info strip** — Lat · Lon · El · Az · Mouse El · Mouse Az · ephem · time · current speed on top; `Tracking: <name>` on the bottom.

---

# Interactive tracking

- **Hover** — cursor tooltip (`Name / Azi / Alt`) over any visible body.
- **Click to lock** — engages `FollowTarget`. In Optical: snaps heading + pitch to the body. In Heavenly: enables free-cam with a bird's-eye preset.
- **Free-cam (Heavenly + tracking)** — orbit anchors around the body's ground point.
- **Break the lock** — any real drag (≥ 4 px) clears `FollowTarget`.

---

# Keyboard

- **Arrow keys** — move the observer's lat / lon (or rotate the camera in free-cam mode).
- **<kbd>Space</kbd>** — toggle play / pause.
- **<kbd>Esc</kbd>** — close open tab popup → pause active demo → clear tracking, in priority order.

---

# Languages

18 supported via the bottom-bar language cycler:

EN · CZ · ES · FR · DE · IT · PT · PL · NL · SK · RU · AR · HE · ZH · JA · KO · TH · HI

---

# Orientation persistence

Every state field lives in the URL hash so a setup can be shared as a link. The URL is versioned — when a default changes between releases, the version bump drops stale keys and uses the new default.

---

# Mobile / install

The sim ships a PWA manifest, theme-color, and the mobile-web-app-capable meta tags, so modern mobile browsers offer **Install / Add to Home Screen** and the app runs full-screen. Responsive breakpoints kick in below 900 px (tablet) and 520 px (phone).
