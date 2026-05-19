#!/usr/bin/env node
/**
 * Copies the static web assets into www/ for Capacitor to bundle.
 * Run via: npm run build
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT  = path.join(ROOT, 'www');

// Folders and files to include in the mobile bundle
const INCLUDE_DIRS  = ['js', 'css', 'assets'];
const INCLUDE_FILES = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'privacy-policy.html',
  'about.md',
  'about_cs.md',
  'about_es.md',
  'ibn-alshatir.html',
  'ibn-alshatir-reference.html',
];

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

console.log('Building www/ ...');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const dir of INCLUDE_DIRS) {
  const src = path.join(ROOT, dir);
  if (fs.existsSync(src)) {
    copyDir(src, path.join(OUT, dir));
    console.log(`  copied ${dir}/`);
  }
}

for (const file of INCLUDE_FILES) {
  const src = path.join(ROOT, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(OUT, file));
    console.log(`  copied ${file}`);
  }
}

console.log('Done. www/ is ready for cap sync.');
