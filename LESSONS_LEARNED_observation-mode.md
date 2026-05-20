# Lessons Learned — Observation Mode session (2026-05-19)

Frank post-mortem of every mistake worth remembering from the session that
added 3D Observation Mode, the sky-layer dropdown, and the FP look-up fix.
Ordered roughly by how much time each one cost.

---

## 1. Worked in a worktree the dev server couldn't see — for hours

**What happened.** I spent the whole session editing files inside
`.claude\worktrees\nice-wright-21e773\`. The user's dev server on
`localhost:3000` was serving from the main project directory at
`C:\…\Epicycles only Astronomy App\` (master branch). Two completely
independent working trees of the same repo. Every edit I made was
invisible to the browser. The user kept seeing the original code and
the original bugs. I kept diagnosing "stale cache" when in fact my
code wasn't in the directory the server was reading from.

**The signal I missed.** When the user first said "nothing changed
after hard reload" and the stack trace still showed `main.js:173:13`
calling `setState` — and I had already verified that line 173 in *my*
`main.js` was a harmless `}` — that was the smoking gun. The line
numbers didn't match my file, so the file being loaded wasn't my
file. I attributed it to SW cache for three rounds before I checked
`git worktree list`.

**Cost.** ~3 rounds of cache-busting band-aids (SW version bump, SW
auto-reload-on-controllerchange, `?v=23` query string on the script
URL) that couldn't possibly work, because they were all changes to
the wrong directory's copy of the file.

**Next time.**
- The first thing to check when "the user can't see my changes" is
  *where is their server reading from*. Not the cache. Not the SW.
  The disk path.
- Run `git worktree list` at session start if there's any sign of
  unusual environment (the path itself, ending in
  `.claude\worktrees\…`, was a clue I ignored).
- Ask: "what command starts your server, and from which directory?"
  before making non-trivial edits.

---

## 2. Pinned a Three.js version that didn't exist

**What happened.** The implementation guide said "Three.js r149 UMD,
last build that ships `examples/js/*`." Trusted it. Tried to download
`https://unpkg.com/three@0.149.0/examples/js/controls/OrbitControls.js`.
404. Tried jsdelivr. 404. Tried GitHub raw. 404. r148 also 404.
Eventually probed back — r147 is the actual last UMD release.

**The signal I missed.** Nothing — guide just had the wrong fact. But
I could have shortened the loop by probing earlier instead of
re-trying CDN mirrors first.

**Next time.** When a CDN returns 404 for the version a spec says
should exist, the spec is more often wrong than the CDN.

---

## 3. Used a glyph that doesn't render on Windows

**What happened.** Picked `🜨` (U+1F728, alchemical Earth) for the
Observation Mode header button. The implementation guide *explicitly
warned* "If glyphs look broken, fall back to short text labels." On
Windows default fonts that code point usually renders as a missing-
glyph box. The user couldn't see the button at all when they did
finally load my code.

**The signal I missed.** It was written in plain English in the spec.
I read past it and used the prettier glyph anyway.

**Next time.** When a spec lists a fallback path, take the safer
option for cross-platform symbols. `◉` / `◎` / `⊙` are 100% safe
across every desktop font. Save the U+1F7xx alchemical glyphs for
when the rendering surface is known.

---

## 4. Stacked cache-busting band-aids on top of a misdiagnosis

**What happened.** Once the user said "still broken" after my SW
cache bump, I added: (a) a controllerchange auto-reload in the SW
registration block; (b) a `?v=23` query string on the script tag; (c)
told the user to click "Clear site data." All of these would have
worked *if my files had been in the served directory*. None of them
could work, because the actual problem was that my files were one
directory tree over.

**The pattern to recognize.** Layered defenses against a problem
that hasn't been confirmed to exist are a classic sign of
misdiagnosis. If fix #1 should solve the problem and the user says
it didn't, *re-examine the diagnosis* before adding fix #2.

**Next time.** When the first targeted fix doesn't land, stop and
re-verify the failure mode from scratch instead of layering on
additional fixes.

---

## 5. Didn't audit the existing `update`-event listeners before publishing time changes

**What happened.** My time broker calls `model.setState({DateTime})`
on incoming postMessages. That fires the model's `update` event.
There was a latent recursion bug in the existing InsideVault
listener (`_prevInsideVault = now` was assigned *after* the recursive
`setState` calls, so the recursion never bottomed out). The user
eventually hit it via the LOOK UP button — but I should have audited
every `update` listener that calls `setState` before introducing
*any* new code path that fires `update`. The bug was patchable
in two lines once I noticed.

**Next time.** Before adding a new path that calls `setState`, grep
for `addEventListener('update', …)` callsites that also call
`setState`, and check for guard ordering.

---

## 6. Didn't read `package.json` and the build pipeline upfront

**What happened.** `package.json` has `npm run build` → copies to
`www/`. `INCLUDE_FILES` in `scripts/build-www.js` is an explicit
whitelist that does *not* include `observation-mode*.html`. If the
user runs `npm run build` later to bundle for Capacitor, the new
pages will be missing from the mobile build. I didn't notice or
update the whitelist.

**Next time.** When a project has a `build` script, read it once at
session start and check whether new top-level files need to be added
to its whitelist. Five-second check, saves a future "where did
Observation Mode go on Android" question.

---

## 7. Assumed `python -m http.server` validated the deploy

**What happened.** I spun up Python's stdlib server in the worktree
to smoke-test endpoints, saw HTTP 200 across the board, and felt
good about it. That only validated *my* file tree under *my* server.
It said nothing about the user's actual environment, which was a
different server pointing at a different directory.

**Next time.** A local-server smoke test confirms the files I wrote
are servable. It does not confirm the user will see them. Those are
two different questions.

---

## 8. Saved a `state.jd` stub into the reference page that does nothing useful

**What happened.** The §6.5 caveat in the guide said "add the
time-sync receiver script to each iframe page." For
`ibn-alshatir-reference.html` I added a receiver that stashes the JD
on `window.__ptolJD` but does nothing with it (no scrubber, no
re-render trigger). That's protocol-consistent dead code. Better
would have been to omit the receiver entirely and document why, or
to actually re-render the seven canvases when the JD changes (the
parameter `t` they use could be derived from the JD).

**Next time.** "Protocol consistency" is not a good enough reason
for inert code. If the listener has no observable effect, skip it
and write a one-line comment explaining the asymmetry.

---

## 9. Spent effort on quality-bar polish before validating end-to-end

**What happened.** The implementation guide had a long quality-bar
checklist for `observation-mode.html`: engraved-normal CanvasTexture,
1/f flicker LUT for joint lamps, ACES tone mapping, Lensflare,
multi-layer Earth, etc. I built all of it before the user had even
loaded the page once. When they finally tried to open it, the
parent app couldn't render the button to launch it, so none of the
polish was exercised. Hours of fidelity work invisible until basic
plumbing landed.

**Next time.** Land the dumbest end-to-end version first (button
exists, button opens an iframe with the engine, planets render as
colored dots) and confirm the user can reach it. Then iterate up
the quality bar. The polish work isn't wasted — but its *order*
should follow validation, not precede it.

---

## 10. Three.js encoding/color-space API drift handled at the wrong layer

**What happened.** r147 uses `outputEncoding` + `sRGBEncoding`; r152+
uses `outputColorSpace` + `SRGBColorSpace`. My first pass wrote
`renderer.outputColorSpace = THREE.SRGBColorSpace || THREE.sRGBEncoding`
which is a fallback expression that sets the *property the wrong
version uses*. Caught and fixed it, but only after re-grep'ing r147
internals. A feature-detection branch (`if ('outputColorSpace' in
renderer && THREE.SRGBColorSpace) …`) is the right shape.

**Next time.** When a library has a version-spanning API rename,
feature-detect the property you're going to set, not just the value
you're going to set it to.

---

## Meta-lesson

Most of the time loss in this session was from **point 1**, and
**point 1 was telegraphed by data the user gave me in their very first
error report.** The stack frame line numbers didn't match my file.
That alone was sufficient to diagnose the worktree split if I'd
followed the thread. Everything after — three rounds of cache fixes,
adding controllerchange logic, the `?v=23` band-aid — was wheel-
spinning around a misdiagnosis I never re-examined.

**Heuristic to keep:** *When the user's symptoms don't match my model
of the system, the symptoms are right and the model is wrong. Always.
Re-derive the model.*
