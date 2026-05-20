#!/usr/bin/env node
// Generates tools/devtools-devices.md from tools/device-profiles.json so
// the Chrome DevTools "custom device" entries stay in sync with the
// harness's device list. Re-run whenever the JSON changes.
//
// Usage:  node scripts/gen-devtools-md.js
'use strict';

const fs   = require('fs');
const path = require('path');

const JSON_PATH = path.resolve(__dirname, '..', 'tools', 'device-profiles.json');
const OUT_PATH  = path.resolve(__dirname, '..', 'tools', 'devtools-devices.md');

const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

function table(devices) {
  const head = '| Name | Width | Height | DPR | Type |\n|---|---|---|---|---|';
  const rows = devices.map((d) =>
    `| ${d.name} | ${d.viewport.w} | ${d.viewport.h} | ${d.dpr} | ${d.category === 'tablet' ? 'Tablet' : 'Mobile'} |`
  );
  return [head, ...rows].join('\n');
}

function uaList(devices) {
  return devices.map((d) =>
    `### ${d.name}\n\n\`\`\`\n${d.userAgent}\n\`\`\``
  ).join('\n\n');
}

const androidDevices = data.platforms.android.devices;
const iosDevices     = data.platforms.ios.devices;

const md = `# Chrome DevTools — custom device recipe

Auto-generated from \`tools/device-profiles.json\` by \`scripts/gen-devtools-md.js\`.
Re-run \`npm run gen:devtools\` whenever the JSON changes.

DevTools → ⚙ Settings → **Devices** → **Add custom device** for each row
below. Set the User-Agent string from the matching section further down.

## Why bother

The in-browser harness at \`tools/mobile-preview.html\` is great for
visual fidelity (bezels, status bars, notches, safe-area insets). But
for **behaviour** testing (UA-string sniffing, real touch events,
network throttling, CPU throttling, Lighthouse mobile audits) DevTools
device mode is more accurate. Use both, depending on the problem.

## Android (Google Play targets)

${table(androidDevices)}

## iOS (App Store parity)

${table(iosDevices)}

## User-Agent strings

Copy-paste these into the DevTools custom-device dialog's UA field.

${uaList([...androidDevices, ...iosDevices])}

## Workflow tips

- **Touch event override**: DevTools → Device Toolbar → ⋮ → "Add touch
  screen". Without this, the app may receive \`mousedown\` instead of
  \`touchstart\`.
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
  "Portrait upright" to test \`deviceorientation\` events the AR
  overlay reads.

---

Generated ${new Date().toISOString()}
`;

fs.writeFileSync(OUT_PATH, md);
console.log('wrote ' + path.relative(process.cwd(), OUT_PATH) + ' (' + Buffer.byteLength(md) + ' bytes)');
