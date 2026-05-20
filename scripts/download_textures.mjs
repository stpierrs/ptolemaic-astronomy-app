// Download PBR texture sets from Poly Haven's CDN into
// assets/textures/<slug>/. All Poly Haven content is CC0, so no
// attribution is required.
//
// Usage:
//   node scripts/download_textures.mjs              // all sets in MANIFEST
//   node scripts/download_textures.mjs <slug>...    // only the named slugs
//   RES=2k node scripts/download_textures.mjs       // override resolution
//
// Poly Haven CDN URL pattern:
//   https://dl.polyhaven.org/file/ph-assets/Textures/<fmt>/<res>/<slug>/<slug>_<map>_<res>.<ext>
//
// Maps we pull (skipped silently if 404):
//   diff    - albedo / diffuse colour (sRGB)
//   nor_gl  - tangent-space normal, OpenGL convention (linear)
//   rough   - roughness (linear)
//   ao      - ambient occlusion (linear)
//   disp    - displacement / height (linear)
//   arm     - AO + roughness + metallic packed (linear) — used by some sets

import { mkdir, writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'assets', 'textures');
const RES = process.env.RES || '2k';
const FMT = 'jpg';

// Logical name => Poly Haven slug.
const MANIFEST = [
  { name: 'limestone_wall',     slug: 'stone_wall'           }, // temple stone
  { name: 'marble',             slug: 'marble_01'            }, // columns / marble
  { name: 'rough_plaster',      slug: 'plastered_wall_02'    }, // house walls
  { name: 'painted_plaster',    slug: 'painted_plaster_wall' }, // house walls alt
  { name: 'wood_planks_siding', slug: 'weathered_planks'     }, // beams / pergola
  { name: 'gravel_concrete',    slug: 'gravel_concrete_04'   }, // ground
];

const MAPS = ['diff', 'nor_gl', 'rough', 'ao', 'disp', 'arm'];

function urlFor(slug, map) {
  return `https://dl.polyhaven.org/file/ph-assets/Textures/${FMT}/${RES}/${slug}/${slug}_${map}_${RES}.${FMT}`;
}

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function fetchMap(slug, map, outPath) {
  const url = urlFor(slug, map);
  const res = await fetch(url);
  if (res.status === 404) return { ok: false, status: 404 };
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(outPath, buf);
  return { ok: true, bytes: buf.length };
}

async function downloadSet({ name, slug }) {
  const dir = join(OUT_DIR, name);
  await mkdir(dir, { recursive: true });
  console.log(`\n[${name}]  slug=${slug}  res=${RES}`);
  let got = 0;
  for (const map of MAPS) {
    const outPath = join(dir, `${name}_${map}.${FMT}`);
    if (await exists(outPath)) {
      console.log(`  skip  ${map.padEnd(7)} (already on disk)`);
      got++;
      continue;
    }
    try {
      const r = await fetchMap(slug, map, outPath);
      if (r.ok) {
        console.log(`  ok    ${map.padEnd(7)} ${(r.bytes / 1024 / 1024).toFixed(1)} MB`);
        got++;
      } else {
        console.log(`  --    ${map.padEnd(7)} (no such map for this set)`);
      }
    } catch (err) {
      console.log(`  FAIL  ${map.padEnd(7)} ${err.message}`);
    }
  }
  if (got === 0) {
    console.log(`  WARN  no maps downloaded — check that "${slug}" exists at polyhaven.com/a/${slug}`);
  }
}

async function main() {
  const filter = process.argv.slice(2);
  const sets = filter.length
    ? MANIFEST.filter((s) => filter.includes(s.name) || filter.includes(s.slug))
    : MANIFEST;
  if (!sets.length) {
    console.error(`No matching sets. Known logical names: ${MANIFEST.map((s) => s.name).join(', ')}`);
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });
  for (const s of sets) await downloadSet(s);
  console.log(`\nDone. Textures in ${OUT_DIR}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
