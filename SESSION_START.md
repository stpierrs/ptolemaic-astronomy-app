# Session Start Instructions for Claude Agents

> Paste this at the start of every new Claude Code session for this project.

---

## Repository

- **Repo:** `stpierrs/ptolemaic-astronomy-app`
- **Live site:** https://stpierrs.github.io/ptolemaic-astronomy-app/
- **GitHub token:** *(paste your token here — do not commit it to the repo)*

---

## ⚠️ Git Rules — Read Before Touching Git

### Always push to `master`. Nothing else.

```
git push https://<TOKEN>@github.com/stpierrs/ptolemaic-astronomy-app.git HEAD:master
```

- **Do NOT create feature branches.** Do not push to `claude/...` branches or any other branch.
- **Do NOT open pull requests.** Commit directly to master.
- If the session environment puts you on a non-master branch (e.g. `claude/...`), that is fine for local commits — but always push with `HEAD:master` as shown above.
- After every push, run `git fetch` to update the remote tracking ref so the stop-hook doesn't complain:

```bash
git fetch https://<TOKEN>@github.com/stpierrs/ptolemaic-astronomy-app.git master:refs/remotes/origin/master
```

### GitHub Pages deploys from `master` only

The workflow file `.github/workflows/deploy-pages.yml` only triggers on pushes to `master`. Pushing to any other branch will NOT update the live site. Always verify the deployment finished before reporting changes as live.

---

## CSS — Two Files Must Always Be in Sync

The app loads `css/styles.min.css`, **not** `css/styles.css`. Whenever you edit `css/styles.css` you **must** make the identical change in `css/styles.min.css`. Both files are plain CSS (not minified despite the name).

---

## Service Worker Cache

After CSS or JS changes, bump `CACHE_VERSION` in `sw.js`:

```js
const CACHE_VERSION = 'ptol-v6'; // increment each deploy
```

This forces existing users to get fresh files immediately.

---

## Bottom Bar Layout

The bottom bar (`#bottom-bar`) has two modes:

| Mode | Height | Rows |
|------|--------|------|
| Full mode | `122px` | 24px search + 46px controls + 52px tabs |
| Simple mode | `78px` | 46px controls + 32px simple-bar |

All elements that position themselves above the bar must use:
```css
bottom: calc(122px * var(--ui-zoom));   /* full mode */
bottom: calc(78px * var(--ui-zoom));    /* simple mode override */
```

The `--ui-zoom` variable is `clamp(0.7, min(100vw/1440, 100vh/810), 1.8)` — it scales the entire chrome with the viewport.

---

## Epicycle Overlay Canvas

- `#epicycle-canvas` uses `position: fixed` (NOT absolute). This keeps it out of `#view {overflow:hidden}` clipping.
- Do NOT add `zoom: var(--ui-zoom)` to `#epicycle-canvas` — combining `position:fixed` + `zoom` causes Chrome to silently hide the element.
- The canvas bottom is `calc(136px * var(--ui-zoom))` — 14px above the full-mode bar top.
- `STORE_VERSION` in `epicycleOverlay.js` must be bumped whenever the saved position schema changes (currently `4`).

---

## Tab Popup z-index

`#tab-popups` must have `z-index: 35` (higher than `#bottom-bar`'s `z-index: 30`). If it ever drops to 25 again, the popups will be hidden behind the bar.

---

## Lessons Learned This Session

1. **Always push to master** — the Pages workflow only watches master. Pushing to a feature branch silently does nothing to the live site.
2. **styles.min.css is what ships** — editing only styles.css has zero effect on the live site.
3. **`position:fixed` + `zoom` = invisible in Chrome** — never combine them on the same element.
4. **z-index stacking** — `#tab-popups` (z-index:25) was behind `#bottom-bar` (z-index:30), making every popup invisible. Always check stacking order when adding new layered elements.
5. **Drag code uses viewport coords** — `getBoundingClientRect()` returns viewport-relative coordinates. Elements inside `#view` that use `position:absolute` have a 26px header offset that breaks drag math. Use `position:fixed` for any draggable overlay.
6. **Simple mode height was wrong** — the bar-quick row is 46px (theme override), not 42px. When adding rows to the bar, sum the actual rendered heights including all CSS overrides, not just the base values.
7. **Stop hook** — the session environment has a git stop-hook that checks for unpushed commits. After pushing, also run `git fetch` to update the local remote-tracking ref or the hook will keep firing.
8. **EpicycleOverlay self-injects** — the overlay creates its own `<canvas>` and appends it to `<body>` in JS. A hidden `<canvas id="epicycle-canvas">` placeholder stays in HTML so old cached `main.js` can find it and call the constructor. The constructor accepts both `(model)` and `(canvas, model)` calling conventions.
9. **Browser caches JS modules independently** — even without a service worker, the browser can serve a stale `main.js` while fetching a fresh `epicycleOverlay.js`. If a refactor changes calling conventions, make the new code backward-compatible so old callers still work.
10. **GitHub Pages has no service worker for this site** — cache busting via `CACHE_VERSION` in `sw.js` is irrelevant since the SW was never registered. Hard-refresh (`Ctrl+Shift+R`) forces the browser to fetch fresh files directly.
