# Chrome DevTools — custom device recipe

Auto-generated from `tools/device-profiles.json` by `scripts/gen-devtools-md.js`.
Re-run `npm run gen:devtools` whenever the JSON changes.

DevTools → ⚙ Settings → **Devices** → **Add custom device** for each row
below. Set the User-Agent string from the matching section further down.

## Why bother

The in-browser harness at `tools/mobile-preview.html` is great for
visual fidelity (bezels, status bars, notches, safe-area insets). But
for **behaviour** testing (UA-string sniffing, real touch events,
network throttling, CPU throttling, Lighthouse mobile audits) DevTools
device mode is more accurate. Use both, depending on the problem.

## Android (Google Play targets)

| Name | Width | Height | DPR | Type |
|---|---|---|---|---|
| Pixel 8 | 412 | 915 | 2.625 | Mobile |
| Pixel 8 Pro | 448 | 992 | 2.625 | Mobile |
| Pixel 7a | 412 | 892 | 2.625 | Mobile |
| Pixel Fold (unfolded) | 673 | 841 | 2.625 | Mobile |
| Galaxy S24 | 360 | 800 | 3 | Mobile |
| Galaxy S24 Ultra | 412 | 883 | 3.75 | Mobile |
| Galaxy A54 | 384 | 854 | 2.625 | Mobile |
| Galaxy Tab S9 | 800 | 1280 | 2 | Tablet |
| Baseline 360×640 | 360 | 640 | 2 | Mobile |

## iOS (App Store parity)

| Name | Width | Height | DPR | Type |
|---|---|---|---|---|
| iPhone 15 | 393 | 852 | 3 | Mobile |
| iPhone 15 Plus | 430 | 932 | 3 | Mobile |
| iPhone 15 Pro | 393 | 852 | 3 | Mobile |
| iPhone 15 Pro Max | 430 | 932 | 3 | Mobile |
| iPhone SE (3rd gen) | 375 | 667 | 2 | Mobile |
| iPad Air (M2 11") | 820 | 1180 | 2 | Tablet |
| iPad Pro 11 (M4) | 834 | 1194 | 2 | Tablet |

## User-Agent strings

Copy-paste these into the DevTools custom-device dialog's UA field.

### Pixel 8

```
Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36
```

### Pixel 8 Pro

```
Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36
```

### Pixel 7a

```
Mozilla/5.0 (Linux; Android 13; Pixel 7a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36
```

### Pixel Fold (unfolded)

```
Mozilla/5.0 (Linux; Android 14; Pixel Fold) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36
```

### Galaxy S24

```
Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36
```

### Galaxy S24 Ultra

```
Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36
```

### Galaxy A54

```
Mozilla/5.0 (Linux; Android 13; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36
```

### Galaxy Tab S9

```
Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36
```

### Baseline 360×640

```
Mozilla/5.0 (Linux; Android 7.0; SM-G930F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.66 Mobile Safari/537.36
```

### iPhone 15

```
Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1
```

### iPhone 15 Plus

```
Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1
```

### iPhone 15 Pro

```
Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1
```

### iPhone 15 Pro Max

```
Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1
```

### iPhone SE (3rd gen)

```
Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1
```

### iPad Air (M2 11")

```
Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1
```

### iPad Pro 11 (M4)

```
Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1
```

## Workflow tips

- **Touch event override**: DevTools → Device Toolbar → ⋮ → "Add touch
  screen". Without this, the app may receive `mousedown` instead of
  `touchstart`.
- **Show device frame**: Device Toolbar → ⋮ → "Show device frame".
  DevTools has stock frames for some devices — usable for quick
  screenshots if our hand-tuned bezel isn't framed correctly.
- **Network throttling**: Network panel → throttling dropdown → "Slow
  4G" matches a realistic Pixel 7a on a weak signal.
- **CPU throttling**: Performance panel → record settings → 4× slowdown
  roughly equals a mid-range Android (Galaxy A54-class).
- **Lighthouse mobile audit**: Lighthouse panel → Device: Mobile →
  Categories: Performance + Accessibility + Best Practices → Analyze.
  Target Performance ≥ 80, Accessibility ≥ 95 for Play Store quality.
- **Sensor simulation**: ⋮ → Sensors panel — set "Orientation" to
  "Portrait upright" to test `deviceorientation` events the AR
  overlay reads.

---

Generated 2026-05-20T03:57:18.265Z
