#!/usr/bin/env node
// Dev server for the mobile preview harness and live iteration of the
// main app. Python's http.server works for casual use but caches
// aggressively and doesn't bind 0.0.0.0 (needed for the Capacitor
// emulator to reach this machine over LAN). This server does both.
//
// Endpoints:
//   /              → /index.html
//   /<file>        → ./<file> from repo root
//   /_cap/<file>   → ./www/<file>      (Capacitor parity contract, §2.8)
//   /_cap/_meta    → { buildTime, sourceMaxMtime }  (parity-badge feed)
//
// Headers:
//   Cache-Control: no-store        (so reloads always pick up fresh code)
//   Service-Worker-Allowed: /      (so /_cap/sw.js can take / scope)
//   Access-Control-Allow-Origin: * (so the iframe + SW tests don't trip CORS)
//
// Usage:
//   node scripts/dev-server.js               # http://0.0.0.0:8080
//   PORT=4000 node scripts/dev-server.js     # custom port
//   SSL=1 node scripts/dev-server.js         # HTTPS via ./certs/*.pem (mkcert)
//
// Standalone. No npm deps.
'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const port = Number(process.env.PORT) || 8080;
const root = path.resolve(__dirname, '..');
const www  = path.join(root, 'www');

const MIME = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'application/javascript; charset=utf-8',
  '.mjs':   'application/javascript; charset=utf-8',
  '.css':   'text/css; charset=utf-8',
  '.json':  'application/json; charset=utf-8',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.webp':  'image/webp',
  '.svg':   'image/svg+xml',
  '.ico':   'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
  '.geojson': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.map':   'application/json; charset=utf-8',
};

function safeJoin(base, rel) {
  const full = path.normalize(path.join(base, rel));
  return full.startsWith(base) ? full : null;
}

function maxMtime(dir) {
  // Recursively find the newest mtime under `dir` — used by /_cap/_meta to
  // tell the harness when the source tree is newer than the bundled www/.
  let max = 0;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); }
    catch (_e) { continue; }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;          // skip dotfiles
      if (e.name === 'node_modules') continue;
      if (e.name === 'www') continue;                 // would self-reference
      if (e.name === 'android' || e.name === 'ios') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else {
        try {
          const m = fs.statSync(p).mtimeMs;
          if (m > max) max = m;
        } catch (_e) {}
      }
    }
  }
  return max;
}

function serveFile(full, res) {
  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('not found: ' + full);
    }
    const ext = path.extname(full).toLowerCase();
    res.writeHead(200, {
      'Content-Type':           MIME[ext] || 'application/octet-stream',
      'Content-Length':         st.size,
      'Last-Modified':          st.mtime.toUTCString(),
      'Cache-Control':          'no-store, must-revalidate',
      'Pragma':                 'no-cache',
      'Expires':                '0',
      'Service-Worker-Allowed': '/',
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    });
    fs.createReadStream(full).pipe(res);
  });
}

function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    });
    return res.end();
  }

  let p = decodeURIComponent(req.url.split('?')[0]);

  // /_cap/_meta — parity-badge feed
  if (p === '/_cap/_meta') {
    const bundleExists = fs.existsSync(path.join(www, 'index.html'));
    let buildTime = 0;
    if (bundleExists) {
      try { buildTime = fs.statSync(path.join(www, 'index.html')).mtimeMs; }
      catch (_e) {}
    }
    const sourceMaxMtime = maxMtime(root);
    res.writeHead(200, {
      'Content-Type':  'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    });
    return res.end(JSON.stringify({ bundleExists, buildTime, sourceMaxMtime }));
  }

  // /_cap/ rewrites — serve www/ under this prefix (Capacitor parity)
  if (p.startsWith('/_cap/')) {
    const rel = p.slice('/_cap/'.length) || 'index.html';
    if (!fs.existsSync(www)) {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      return res.end('www/ not built — run `npm run build` or `npm run dev:bundle`');
    }
    const full = safeJoin(www, rel);
    if (!full) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('forbidden');
    }
    return serveFile(full, res);
  }

  // Root → index.html
  if (p === '/' || p === '') p = '/index.html';

  // Standard tree under repo root
  const full = safeJoin(root, p);
  if (!full) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('forbidden');
  }
  // If they hit a directory, serve its index.html if present
  fs.stat(full, (err, st) => {
    if (!err && st.isDirectory()) {
      return serveFile(path.join(full, 'index.html'), res);
    }
    serveFile(full, res);
  });
}

// ── start ────────────────────────────────────────────────────────────────
const useHttps = process.env.SSL === '1';
let server;
if (useHttps) {
  const keyPath  = process.env.SSL_KEY  || './certs/localhost-key.pem';
  const certPath = process.env.SSL_CERT || './certs/localhost.pem';
  try {
    server = require('https').createServer({
      key:  fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    }, handler);
  } catch (e) {
    console.error('HTTPS requested but cert files not found.');
    console.error('  Expected:', keyPath, '+', certPath);
    console.error('  Install mkcert and run: mkcert -install && mkdir -p certs && mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost 127.0.0.1 <your-lan-ip>');
    process.exit(1);
  }
} else {
  server = require('http').createServer(handler);
}

server.listen(port, '0.0.0.0', () => {
  const proto = useHttps ? 'https' : 'http';
  console.log(`dev-server listening on ${proto}://0.0.0.0:${port}`);
  console.log(`  local:    ${proto}://localhost:${port}/`);
  console.log(`  harness:  ${proto}://localhost:${port}/tools/mobile-preview.html`);
  const nets = os.networkInterfaces();
  for (const ifaceName of Object.keys(nets)) {
    for (const n of nets[ifaceName] || []) {
      if (n.family === 'IPv4' && !n.internal) {
        console.log(`  LAN:      ${proto}://${n.address}:${port}/  (point Capacitor emulator here)`);
      }
    }
  }
  if (!fs.existsSync(www)) {
    console.log('  note:     www/ not built yet — Capacitor-parity mode will 503 until you run `npm run build`');
  }
});
