#!/usr/bin/env node
// Toggle Capacitor live-reload mode by writing `server.url` into
// capacitor.config.json. The native Android/iOS WebView reads this and
// points at the host dev server instead of the bundled www/. Saves to
// disk hot-reload in the emulator.
//
// Usage:
//   node scripts/cap-dev.js on  [ip:port]    — point WebView at dev server
//                                              (auto-detects LAN IP if not given)
//   node scripts/cap-dev.js off              — restore production config
//   node scripts/cap-dev.js status           — show current state
//
// IMPORTANT: never commit capacitor.config.json with `server.url` set.
// See `tools/README.md` § "Capacitor live-reload" for the workflow.
'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const CFG_PATH = path.resolve(__dirname, '..', 'capacitor.config.json');

function lanIp() {
  const nets = os.networkInterfaces();
  for (const ifaceName of Object.keys(nets)) {
    for (const n of nets[ifaceName] || []) {
      if (n.family === 'IPv4' && !n.internal) return n.address;
    }
  }
  return null;
}

function loadCfg() {
  try { return JSON.parse(fs.readFileSync(CFG_PATH, 'utf8')); }
  catch (e) { console.error('Cannot read', CFG_PATH, ':', e.message); process.exit(1); }
}

function saveCfg(cfg) {
  fs.writeFileSync(CFG_PATH, JSON.stringify(cfg, null, 2) + '\n');
}

const cmd = process.argv[2];
if (cmd === 'on') {
  let target = process.argv[3];
  if (!target) {
    const ip = lanIp();
    if (!ip) {
      console.error('No LAN IP detected — pass <ip:port> explicitly, e.g. 192.168.1.42:8080');
      process.exit(1);
    }
    target = ip + ':8080';
  }
  const cfg = loadCfg();
  cfg.server = cfg.server || {};
  cfg.server.url = 'http://' + target;
  cfg.server.cleartext = true;
  cfg.android = cfg.android || {};
  cfg.android.allowMixedContent = true;
  saveCfg(cfg);
  console.log('Capacitor live-reload ON  → ' + cfg.server.url);
  console.log('  iOS note: ATS may block http://; if so, use mkcert HTTPS via `npm run dev:https`.');
  console.log('  Next:   npx cap sync android && npx cap run android');
  console.log('  After:  node scripts/cap-dev.js off   (before committing!)');
} else if (cmd === 'off') {
  const cfg = loadCfg();
  if (cfg.server) {
    delete cfg.server.url;
    delete cfg.server.cleartext;
    if (Object.keys(cfg.server).length === 0) delete cfg.server;
  }
  if (cfg.android) cfg.android.allowMixedContent = false;
  saveCfg(cfg);
  console.log('Capacitor live-reload OFF (production config restored)');
  console.log('  Verify: git diff capacitor.config.json');
} else if (cmd === 'status') {
  const cfg = loadCfg();
  if (cfg.server && cfg.server.url) {
    console.log('LIVE-RELOAD ON  → ' + cfg.server.url);
    console.log('⚠ remember to run `node scripts/cap-dev.js off` before committing.');
    process.exit(2);
  } else {
    console.log('production config (live-reload off)');
  }
} else {
  console.error('Usage:');
  console.error('  node scripts/cap-dev.js on  [ip:port]   (default: auto-detect LAN IP, port 8080)');
  console.error('  node scripts/cap-dev.js off             (restore production)');
  console.error('  node scripts/cap-dev.js status');
  process.exit(1);
}
