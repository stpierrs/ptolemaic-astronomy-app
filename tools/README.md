# Mobile-preview tools

This directory + `scripts/dev-server.js` is the **iteration path** for the
mobile build. The **publishing** path (signed APK, Play Console, App
Store) lives in `MOBILE_PUBLISHING_GUIDE.md` at the repo root.

## One-screen decision tree

| What you're doing right now                | Run                                                   | Open |
|-------------------------------------------|--------------------------------------------------------|------|
| Tweaking CSS / layout, fast loop          | `npm run dev`                                          | <http://localhost:8080/tools/mobile-preview.html> → Source: **live** |
| Proving the bundle matches what ships     | `npm run dev` + `npm run dev:bundle` (two terminals)   | same URL → Source: **bundled (www/)** → wait for 🟢 in parity |
| Debugging UA / sensors / network / Lighthouse | `npm run dev`                                      | <http://localhost:8080/> in Chrome → DevTools → Device Mode → custom device (see `devtools-devices.md`) |
| Capturing Play Store screenshots          | `npm run dev`                                          | <http://localhost:8080/tools/screenshot-export.html> → Store: Play |
| Capturing App Store screenshots           | `npm run dev`                                          | same URL → Store: Apple |
| Capturing both at once                    | `npm run dev`                                          | same URL → Store: **Both stores (synced)** |
| Running the real Android WebView          | `npm run dev` + `npm run dev:android`                  | App opens in Android Studio AVD; hot-reloads on save |
| Running the real iOS WebView (macOS only) | `npm run dev` + `npx cap open ios`                     | App opens in Xcode; pick iPhone 15 Pro simulator → Cmd+R |

**When finished** with any Capacitor live-reload session:
```bash
npm run dev:cap:off
git diff capacitor.config.json   # should show no diff
```
Never commit `capacitor.config.json` with `server.url` set. The
`pre-commit` hook will block it if you forget; do **not** bypass with
`--no-verify`.

## File map

| File | Purpose |
|---|---|
| `mobile-preview.html`       | Main harness. Platform toggle, device picker, source picker, status-bar overlay, safe-area injection. |
| `device-profiles.json`      | Canonical list of 9 Android + 7 iOS devices. Single source of truth for the harness, the DevTools recipe, and the screenshot exporter. |
| `devtools-devices.md`       | Copy-paste recipe for adding the same devices to Chrome DevTools. Regenerate via `npm run gen:devtools`. |
| `screenshot-export.html`    | Captures PNGs at exact Play / Apple required pixel dimensions. |
| `../scripts/dev-server.js`  | No-cache static server. Binds `0.0.0.0:8080`. `/_cap/*` rewrites to `../www/*` for parity mode. |
| `../scripts/dev-bundle.js`  | Auto-rebuilds `www/` on source change. Pair with `dev-server.js` for parity mode. |
| `../scripts/cap-dev.js`     | Toggles `server.url` in `capacitor.config.json` for live-reload into Android/iOS emulator. |
| `../scripts/gen-devtools-md.js` | Regenerates `devtools-devices.md` from `device-profiles.json`. |

## How the harness works (high-level)

1. Browser opens `mobile-preview.html`.
2. It fetches `device-profiles.json` and renders a phone "body" as inline
   SVG (built at runtime from the JSON — no per-device SVG files to
   maintain).
3. Inside the phone's screen pocket sits an `<iframe>` loading the app
   with `?mobile-preview=1&platform=…&device=…` query params.
4. The 50-line head-script in `index.html` (gated on
   `?mobile-preview=1`) patches `navigator.maxTouchPoints`,
   `matchMedia('(hover:hover)')`, etc. so the app behaves like a touch
   device.
5. The harness injects `--safe-area-inset-*` CSS custom properties on
   the iframe's `:root` so app CSS that uses
   `var(--safe-area-inset-top, env(safe-area-inset-top))` resolves to
   the device's real safe-area values.
6. A platform toggle (Android | Apple) at the top filters the device
   list to one platform, swaps the status-bar style, and swaps the nav
   indicator style.

## Capacitor-parity contract (Source: bundled)

The `www/` build is what `npx cap copy` ships to the Android/iOS
WebView. To prove the harness renders the same thing the bundled app
will:

1. `npm run dev`           ← terminal 1 (server)
2. `npm run dev:bundle`    ← terminal 2 (auto-rebuilds `www/` on save)
3. Open mobile-preview, switch **Source** to **bundled**.
4. The "parity badge" in the dev bar polls `/_cap/_meta` every ~2 s:
   - 🟢 in parity — `www/` is newer than every source file. Bundled
     mode matches what Android Studio will ship.
   - 🟡 stale bundle — at least one source file was saved after the
     last build. The watcher should pick it up in seconds; if it
     doesn't, check the `dev:bundle` terminal for errors.
   - ⚪ live mode — Source is set to "live", parity check skipped.
   - ✖ no www/ — run `npm run build` once.

## Conventions for the rest of the codebase

- **Safe-area-aware CSS** should use
  `var(--safe-area-inset-top, env(safe-area-inset-top))` (and friends).
  In the real Capacitor WebView the `env()` fallback kicks in; in the
  harness, the `--safe-area-inset-*` variables the harness injects
  take precedence.
- **Touch vs hover** — never gate behaviour on
  `matchMedia('(hover:hover)')`. Gate on the actual event types
  (`pointerType === 'touch'` etc.) or treat both. The harness lies
  about hover support.
- **No new npm deps for the harness.** Vanilla HTML + Node + the
  Capacitor CLI we already have. If you find yourself reaching for
  React or Tailwind for `tools/`, stop and reconsider.

## Troubleshooting

- **`tools/mobile-preview.html` shows "Loading device profiles…" forever**
  → the page can't fetch `device-profiles.json` because you're opening
    it via `file://`. Run `npm run dev` and open via
    `http://localhost:8080/...`.
- **Parity badge says "no www/ — run npm run build"**
  → `www/` doesn't exist yet. Run `npm run build` once, or start
    `npm run dev:bundle` and let it create the directory on first
    rebuild.
- **Capacitor live-reload doesn't load anything in the emulator**
  → emulator may not be able to reach your laptop's LAN IP. Verify
    with `adb shell curl http://<your-ip>:8080/` from a desktop
    terminal. If that fails, your firewall is blocking inbound 8080.
- **Capacitor live-reload says "ERR_CLEARTEXT_NOT_PERMITTED"**
  → run `node scripts/cap-dev.js on` again; it sets both
    `cleartext: true` and `android.allowMixedContent: true`. If it
    still fails, fall back to HTTPS via `npm run dev:https` + mkcert.
- **iOS simulator blocks the dev-server URL (ATS)**
  → either add an `NSAllowsArbitraryLoads` exception in
    `ios/App/App/Info.plist` (dev only — never ship that to TestFlight)
    or use HTTPS via mkcert.
