// Loader for PBR texture sets fetched by scripts/download_textures.mjs.
//
// Expects files at:
//   assets/textures/<name>/<name>_<map>.jpg
// where <map> is one of: diff, nor_gl, rough, ao, disp, arm.
//
// Usage:
//   import { loadPbrMaterial } from './pbrTextures.js';
//   const mat = await loadPbrMaterial('limestone_wall', { repeat: [4, 4] });
//   mesh.material = mat;
//
// All Poly Haven assets are CC0 — no attribution needed.

import * as THREE from '../../assets/vendor/three.module.min.js';

export const PBR_SETS = [
  'limestone_wall',
  'marble',
  'rough_plaster',
  'painted_plaster',
  'wood_planks_siding',
  'gravel_concrete',
];

const BASE = 'assets/textures';
const EXT = 'jpg';
const _loader = new THREE.TextureLoader();
const _cache = new Map(); // key: `${name}/${map}` -> Promise<Texture | null>

function loadMap(name, map, { sRGB = false, repeat = [1, 1], anisotropy = 8 } = {}) {
  const key = `${name}/${map}`;
  if (_cache.has(key)) return _cache.get(key);
  const url = `${BASE}/${name}/${name}_${map}.${EXT}`;
  const p = new Promise((resolve) => {
    _loader.load(
      url,
      (tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeat[0], repeat[1]);
        tex.anisotropy = anisotropy;
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        if (sRGB) {
          try { tex.colorSpace = THREE.SRGBColorSpace; }
          catch(_) { tex.encoding = 3001; }
        }
        resolve(tex);
      },
      undefined,
      () => resolve(null), // missing map -> null, material falls back gracefully
    );
  });
  _cache.set(key, p);
  return p;
}

// Build a MeshStandardMaterial from a downloaded set. Missing maps are
// just skipped — e.g. a set with no `disp` still works fine.
//
// Options:
//   repeat:           [u, v] tiling, default [1, 1]
//   anisotropy:       default 8
//   roughness:        base roughness scalar, default 1.0
//   metalness:        default 0.0
//   normalScale:      scalar applied to both X and Y, default 1.0
//   displacementScale: default 0 (needs subdivided geometry to show)
export async function loadPbrMaterial(name, opts = {}) {
  if (!PBR_SETS.includes(name)) {
    console.warn(`pbrTextures: unknown set "${name}". Known: ${PBR_SETS.join(', ')}`);
  }
  const repeat = opts.repeat || [1, 1];
  const anisotropy = opts.anisotropy ?? 8;
  const [diff, nor, rough, ao, disp, arm] = await Promise.all([
    loadMap(name, 'diff',   { sRGB: true,  repeat, anisotropy }),
    loadMap(name, 'nor_gl', { sRGB: false, repeat, anisotropy }),
    loadMap(name, 'rough',  { sRGB: false, repeat, anisotropy }),
    loadMap(name, 'ao',     { sRGB: false, repeat, anisotropy }),
    loadMap(name, 'disp',   { sRGB: false, repeat, anisotropy }),
    loadMap(name, 'arm',    { sRGB: false, repeat, anisotropy }),
  ]);

  const mat = new THREE.MeshStandardMaterial({
    map:            diff || null,
    normalMap:      nor  || null,
    roughnessMap:   rough || arm || null,
    aoMap:          ao    || arm || null,
    metalnessMap:   arm  || null,
    displacementMap: disp || null,
    roughness:      opts.roughness        ?? 1.0,
    metalness:      opts.metalness        ?? 0.0,
    displacementScale: opts.displacementScale ?? 0.0,
  });
  if (nor && opts.normalScale != null) {
    mat.normalScale.set(opts.normalScale, opts.normalScale);
  }
  return mat;
}

// Apply PBR maps onto an EXISTING material in-place (keeps the material
// reference intact so all meshes sharing it update automatically).
export async function upgradeMaterial(mat, name, opts = {}) {
  const pbr = await loadPbrMaterial(name, opts);
  mat.map          = pbr.map;
  mat.normalMap    = pbr.normalMap;
  mat.roughnessMap = pbr.roughnessMap;
  mat.aoMap        = pbr.aoMap;
  if (pbr.normalMap && opts.normalScale != null)
    mat.normalScale.set(opts.normalScale, opts.normalScale);
  mat.needsUpdate = true;
  pbr.dispose();   // free the temp material shell
  return mat;
}

// Preload every known set in parallel.
export async function preloadAllPbrSets(opts = {}) {
  await Promise.all(PBR_SETS.map((name) => loadPbrMaterial(name, opts)));
}
