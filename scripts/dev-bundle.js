#!/usr/bin/env node
// Auto-rebuild the www/ bundle whenever any source file changes. Pairs
// with `node scripts/dev-server.js` to drive the "Source: bundled" mode
// of tools/mobile-preview.html — the harness's parity badge flips
// 🟢 in-parity as soon as this finishes rebuilding.
//
// Usage:
//   node scripts/dev-bundle.js
//   (Ctrl+C to stop; it ignores its own www/ writes to avoid feedback loops.)
//
// Standalone. No npm deps. Uses fs.watch recursively where supported
// (Windows + macOS), falls back to a 1.5-second polling sweep on Linux.
'use strict';

const fs   = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const WWW  = path.join(ROOT, 'www');
const BUILD_SCRIPT = path.join(__dirname, 'build-www.js');

// Directories we watch (everything else is build artefact, .git, deps).
const WATCH_DIRS = ['js', 'css', 'assets', 'scripts', 'tools'];
const WATCH_FILES = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'ibn-alshatir.html',
  'ibn-alshatir-reference.html',
  'observation-mode.html',
  'observation-mode-explained.html',
];

let pending = false;
let running = false;

function ts() {
  const d = new Date();
  return d.toTimeString().split(' ')[0];
}
function log(msg, color) {
  const c = { gold: '\x1b[33m', green: '\x1b[32m', red: '\x1b[31m', dim: '\x1b[2m', reset: '\x1b[0m' };
  const tag = c[color] || '';
  process.stdout.write(`${c.dim}[${ts()}]${c.reset} ${tag}${msg}${c.reset}\n`);
}

function build() {
  if (running) { pending = true; return; }
  running = true;
  log('rebuild → www/ …', 'gold');
  const child = spawn(process.execPath, [BUILD_SCRIPT], { stdio: ['ignore', 'pipe', 'pipe'], cwd: ROOT });
  let out = '';
  child.stdout.on('data', (chunk) => { out += chunk.toString(); });
  child.stderr.on('data', (chunk) => { process.stderr.write(chunk); });
  child.on('close', (code) => {
    running = false;
    if (code === 0) {
      log('✓ www/ ready', 'green');
    } else {
      log('✗ build failed (exit ' + code + ')', 'red');
      process.stderr.write(out);
    }
    if (pending) { pending = false; setTimeout(build, 100); }
  });
}

// Debounce so a save that touches multiple files (e.g. on save-all) results
// in one rebuild, not five.
let debounceTimer = null;
function trigger(why) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    log('change: ' + why, 'dim');
    build();
  }, 250);
}

function watchDirRecursive(dir) {
  if (!fs.existsSync(dir)) return;
  try {
    fs.watch(dir, { recursive: true }, (ev, fname) => {
      if (!fname) return;
      if (fname.includes('node_modules')) return;
      if (fname.startsWith('www')) return;
      if (fname.endsWith('~') || fname.startsWith('.')) return;
      trigger(path.relative(ROOT, path.join(dir, fname)));
    });
    log('watching ' + path.relative(ROOT, dir) + '/', 'dim');
  } catch (e) {
    // Linux doesn't support recursive: true on older Node, fall back to polling.
    log('fs.watch recursive failed for ' + dir + ' — polling instead', 'dim');
    pollDir(dir);
  }
}

function pollDir(dir, prev = new Map()) {
  const snapshot = new Map();
  (function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); }
    catch (_e) { return; }
    for (const e of entries) {
      if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'www') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else {
        try { snapshot.set(p, fs.statSync(p).mtimeMs); }
        catch (_e) {}
      }
    }
  })(dir);
  let changed = null;
  for (const [p, m] of snapshot) {
    if (!prev.has(p) || prev.get(p) !== m) { changed = p; break; }
  }
  if (changed) trigger(path.relative(ROOT, changed));
  setTimeout(() => pollDir(dir, snapshot), 1500);
}

// ── kick off ─────────────────────────────────────────────────────────────
log('dev-bundle starting — initial build...', 'gold');
build();
for (const d of WATCH_DIRS) watchDirRecursive(path.join(ROOT, d));
for (const f of WATCH_FILES) {
  const fp = path.join(ROOT, f);
  if (!fs.existsSync(fp)) continue;
  try {
    fs.watch(fp, () => trigger(f));
    log('watching ' + f, 'dim');
  } catch (_e) {}
}

process.on('SIGINT', () => { log('bye', 'dim'); process.exit(0); });
