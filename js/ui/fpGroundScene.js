// First-person ground — Three.js 3D Ancient Greek environment.
// Full-screen canvas with alpha renderer: 3D perspective terminates the ground
// exactly at the horizon (sky above is transparent — main 3D dome shows through).
// Camera FOV / heading / pitch exactly mirrors the main view's state so the
// horizon stays pixel-perfect regardless of zoom or camera tilt.
// Real 4K photo textures (Poly Haven) are loaded async; scene renders immediately
// with simple fallback colours and upgrades as each texture arrives.

import * as THREE from '../../assets/vendor/three.module.min.js';
import { upgradeMaterial } from '../render/pbrTextures.js';

// ── Paths ─────────────────────────────────────────────────────────────────
const T = './assets/textures/';

// ── Noise / FBM (used for terrain displacement only) ─────────────────────
const _fr = x => x - Math.floor(x);
const _h2 = (x, y) => _fr(Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5453));
function _n(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = _fr(x), fy = _fr(y);
  const ux = fx*fx*(3-2*fx), uy = fy*fy*(3-2*fy);
  return _h2(ix,iy)*(1-ux)*(1-uy) + _h2(ix+1,iy)*ux*(1-uy)
       + _h2(ix,iy+1)*(1-ux)*uy   + _h2(ix+1,iy+1)*ux*uy;
}
function fbm(x, y, o = 5) {
  let v=0, a=0.5, f=1;
  for (let i=0; i<o; i++) { v+=_n(x*f,y*f)*a; a*=0.5; f*=2.1; }
  return v;
}
// Flat near camera/plaza, rolling hills further out
function th(x, z) {
  const raw = fbm(x*.026+5.3, z*.026+8.1, 5) * 4.2;
  const t   = Math.max(0, Math.min(1, (Math.sqrt(x*x+z*z) - 14) / 38));
  return raw * t - 0.15;
}

// ── Fluted column shaft geometry (Doric 20-flute) ────────────────────────
function flutedCyl(rTop, rBot, height, flutes=20, depth=0.065) {
  const geo = new THREE.CylinderGeometry(rTop, rBot, height, flutes * 2, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const r = Math.sqrt(x*x + z*z);
    if (r < 0.005) continue;
    const ang = Math.atan2(z, x);
    // cos(ang*flutes) alternates +1/-1 at each of the 2*flutes vertices
    const t = Math.cos(ang * flutes) * 0.5 + 0.5; // 1=ridge, 0=valley
    const sc = 1.0 - (1.0 - t) * depth;
    pos.setXYZ(i, x * sc, pos.getY(i), z * sc);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// ── Triangular gable prism ────────────────────────────────────────────────
function mkGable(width, height, depth, mat) {
  const hw = width/2, hd = depth/2;
  const v = [[-hw,0,hd],[hw,0,hd],[0,height,hd],[-hw,0,-hd],[hw,0,-hd],[0,height,-hd]];
  const tri = [[0,1,2],[3,5,4],[0,2,5],[0,5,3],[1,4,5],[1,5,2],[0,3,4],[0,4,1]];
  const verts = [];
  tri.forEach(([a,b,c]) => { verts.push(...v[a],...v[b],...v[c]); });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

// ── Texture loader helper ─────────────────────────────────────────────────
function applyTex(loader, mat, path, slot, rx, ry, aniso, onDone) {
  loader.load(path, (tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(rx, ry);
    tex.anisotropy = aniso;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    mat[slot] = tex;
    mat.needsUpdate = true;
    if (onDone) onDone(tex);
  }, undefined, (e) => console.warn('tex load failed:', path, e));
}

// ── Materials (initial fallback colours, real textures applied async) ────
function buildMaterials(renderer) {
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const loader = new THREE.TextureLoader();

  const terrain = new THREE.MeshStandardMaterial({
    color: 0x8a7e60, roughness: 0.96, metalness: 0.0,
  });
  const floor = new THREE.MeshStandardMaterial({
    color: 0xb0a890, roughness: 0.90, metalness: 0.0,
  });
  const stone = new THREE.MeshStandardMaterial({
    color: 0xd0c8a8, roughness: 0.82, metalness: 0.0,
  });
  const marble = new THREE.MeshStandardMaterial({
    color: 0xf0eadc, roughness: 0.22, metalness: 0.04,
  });
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5828, roughness: 0.88 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc89030, roughness: 0.32, metalness: 0.78 });
  const scroll = new THREE.MeshStandardMaterial({ color: 0xd4b870, roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1228, roughness: 0.7 });

  // Load real textures async
  applyTex(loader, terrain, T+'gravel_road_diff_2k.jpg',  'map',          8,  8, aniso);
  applyTex(loader, floor,   T+'rocks_ground_diff_2k.jpg', 'map',          5,  4, aniso);
  applyTex(loader, floor,   T+'rocks_ground_rough_2k.jpg','roughnessMap', 5,  4, aniso);
  applyTex(loader, stone,   T+'rock_mossy_diff_2k.jpg',   'map',          2,  2, aniso);
  applyTex(loader, marble,  T+'plaster_stone_wall_02_diff_4k.jpg', 'map', 1.5, 5, aniso,
    () => { marble.roughness = 0.22; marble.needsUpdate = true; });

  // Tree textures
  const treeBark = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.93, metalness: 0.0 });
  const oakBark  = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, metalness: 0.0 });
  const treeLeaf = new THREE.MeshStandardMaterial({ color: 0x7a9950, roughness: 0.88, metalness: 0.0, side: THREE.DoubleSide });
  applyTex(loader, treeBark, T+'pine_bark_diff_2k.jpg',  'map', 1, 4, aniso);
  applyTex(loader, oakBark,  T+'oak_bark_diff_2k.jpg',   'map', 1, 3, aniso);
  applyTex(loader, treeLeaf, T+'leaves_diff_2k.jpg',     'map', 3, 3, aniso);

  // Generate terrain normal map from displacement PNG after image loads
  const dispLoader = new THREE.TextureLoader();
  dispLoader.load(T+'forrest_ground_01_disp_4k.png', (dispTex) => {
    // Build normal map in JS at 1024×1024
    const NZ = 1024;
    const cvs = document.createElement('canvas');
    cvs.width = cvs.height = NZ;
    const ctx = cvs.getContext('2d');
    ctx.drawImage(dispTex.image, 0, 0, NZ, NZ);
    const src = ctx.getImageData(0, 0, NZ, NZ).data;
    const dst = new Uint8ClampedArray(NZ * NZ * 4);
    const S = 6; // normal strength
    for (let y = 0; y < NZ; y++) {
      for (let x = 0; x < NZ; x++) {
        const g = (px, py) => src[(Math.max(0,Math.min(NZ-1,py))*NZ + Math.max(0,Math.min(NZ-1,px)))*4] / 255;
        let nx = (g(x-1,y) - g(x+1,y)) * S;
        let ny = (g(x,y-1) - g(x,y+1)) * S;
        let nz = 1;
        const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
        const i = (y*NZ+x)*4;
        dst[i]   = (nx/len * .5 + .5) * 255;
        dst[i+1] = (ny/len * .5 + .5) * 255;
        dst[i+2] = (nz/len * .5 + .5) * 255;
        dst[i+3] = 255;
      }
    }
    const nc = document.createElement('canvas');
    nc.width = nc.height = NZ;
    nc.getContext('2d').putImageData(new ImageData(dst, NZ, NZ), 0, 0);
    const nt = new THREE.CanvasTexture(nc);
    nt.wrapS = nt.wrapT = THREE.RepeatWrapping;
    nt.repeat.set(10, 10);
    terrain.normalMap = nt;
    terrain.normalScale.set(0.6, 0.6);
    terrain.needsUpdate = true;
  });

  // Floor displacement → normal map
  const fDispLoader = new THREE.TextureLoader();
  fDispLoader.load(T+'concrete_floor_damaged_01_disp_4k.png', (dt) => {
    const NZ = 512;
    const cvs = document.createElement('canvas');
    cvs.width = cvs.height = NZ;
    const ctx = cvs.getContext('2d');
    ctx.drawImage(dt.image, 0, 0, NZ, NZ);
    const src = ctx.getImageData(0, 0, NZ, NZ).data;
    const dst = new Uint8ClampedArray(NZ*NZ*4);
    for (let y=0; y<NZ; y++) {
      for (let x=0; x<NZ; x++) {
        const g = (px, py) => src[(Math.max(0,Math.min(NZ-1,py))*NZ+Math.max(0,Math.min(NZ-1,px)))*4]/255;
        let nx = (g(x-1,y)-g(x+1,y))*4, ny = (g(x,y-1)-g(x,y+1))*4, nz=1;
        const l = Math.sqrt(nx*nx+ny*ny+nz*nz);
        const i = (y*NZ+x)*4;
        dst[i]=(nx/l*.5+.5)*255; dst[i+1]=(ny/l*.5+.5)*255; dst[i+2]=(nz/l*.5+.5)*255; dst[i+3]=255;
      }
    }
    const nc=document.createElement('canvas'); nc.width=nc.height=NZ;
    nc.getContext('2d').putImageData(new ImageData(dst,NZ,NZ),0,0);
    const nt=new THREE.CanvasTexture(nc);
    nt.wrapS=nt.wrapT=THREE.RepeatWrapping; nt.repeat.set(3.5,2.5);
    floor.normalMap=nt; floor.normalScale.set(0.5,0.5); floor.needsUpdate=true;
  });

  // ── PBR upgrades (async — scene renders with fallbacks first) ────────────
  const A = aniso;
  upgradeMaterial(stone,   'limestone_wall',     { repeat:[2,2],   normalScale:0.9,  roughness:0.85, anisotropy:A });
  upgradeMaterial(marble,  'marble',             { repeat:[1.5,4], normalScale:0.5,  roughness:0.22, anisotropy:A });
  upgradeMaterial(floor,   'gravel_concrete',    { repeat:[5,4],   normalScale:0.7,  roughness:0.92, anisotropy:A });
  upgradeMaterial(terrain, 'gravel_concrete',    { repeat:[10,10], normalScale:0.55, roughness:0.96, anisotropy:A });
  upgradeMaterial(wood,    'wood_planks_siding', { repeat:[1,2],   normalScale:0.8,  roughness:0.88, anisotropy:A });

  return { terrain, floor, stone, marble, wood, brass, scroll, dark, treeBark, oakBark, treeLeaf };
}

// ── Terrain ───────────────────────────────────────────────────────────────
function buildTerrain(scene, mat) {
  const geo = new THREE.PlaneGeometry(400, 400, 128, 128);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, th(pos.getX(i), pos.getZ(i)));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  scene.add(m);
}

// ── Column helper ─────────────────────────────────────────────────────────
function mkCol(mShaft, mCap, mBase, H=6.0, r0=0.40, r1=0.32) {
  const g = new THREE.Group();
  // Fluted Doric shaft (20 flutes, 40 segments)
  const shaft = new THREE.Mesh(flutedCyl(r1, r0, H, 20, 0.065), mShaft);
  shaft.position.y = H/2; shaft.castShadow = shaft.receiveShadow = true;
  g.add(shaft);
  // Echinus (curved capital base)
  const ech = new THREE.Mesh(new THREE.CylinderGeometry(r1*1.68, r1*1.08, 0.38, 20), mCap);
  ech.position.y = H+0.19; g.add(ech);
  // Abacus
  const ab = new THREE.Mesh(new THREE.BoxGeometry(r1*3.4, 0.24, r1*3.4), mCap);
  ab.position.y = H+0.50; g.add(ab);
  // Base disk + torus ring
  const bd = new THREE.Mesh(new THREE.CylinderGeometry(r0*1.22, r0*1.22, 0.20, 20), mBase);
  bd.position.y = 0.10; g.add(bd);
  const bt = new THREE.Mesh(new THREE.TorusGeometry((r0+r1)*.55, 0.065, 8, 20), mBase);
  bt.rotation.x = Math.PI/2; bt.position.y = 0.08; g.add(bt);
  return g;
}

// ── Temple ────────────────────────────────────────────────────────────────
function buildTemple(scene, {stone, marble}) {
  const g    = new THREE.Group();
  const ty   = th(0, -48);
  g.position.set(0, ty, -48);

  const sMat = stone;
  const mMat = marble;
  // Warm golden limestone for capitals and entablature trim
  const capMat = new THREE.MeshStandardMaterial({ color: 0xd4c48a, roughness: 0.38 });
  // Dark groove for triglyph channels
  const grv = new THREE.MeshStandardMaterial({ color: 0x5a5040, roughness: 0.9 });

  // Krepidoma (3 steps)
  [[22, 0.44, 12.2],[20.4,0.44,11],[18.8,0.44,9.8]].forEach(([w,h,d], i) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), sMat);
    s.position.y = i*0.44 - 0.18; s.castShadow = s.receiveShadow = true; g.add(s);
  });
  const baseY = 3*0.44 - 0.18;

  // Stylobate
  const sty = new THREE.Mesh(new THREE.BoxGeometry(17.6, 0.48, 8.8), mMat);
  sty.position.y = baseY + 0.24; sty.receiveShadow = true; g.add(sty);
  const colY = baseY + 0.48;

  // Columns — 8 front, 8 back, 3 each side
  const colH=6.4, cr0=0.42, cr1=0.33;
  const xs = [-7.0,-5.0,-3.0,-1.0,1.0,3.0,5.0,7.0];
  xs.forEach(cx => {
    [[cx,colY, 3.6],[cx,colY,-3.6]].forEach(([x,y,z]) => {
      const c = mkCol(mMat, capMat, capMat, colH, cr0, cr1);
      c.position.set(x,y,z); c.castShadow=true; g.add(c);
    });
  });
  // Side columns
  const sideZs = [1.2, -1.2];
  const sideXs = [-7.0, 7.0];
  sideXs.forEach(sx => sideZs.forEach(sz => {
    const c = mkCol(mMat, capMat, capMat, colH, cr0, cr1);
    c.position.set(sx, colY, sz); c.castShadow = true; g.add(c);
  }));

  const eY = colY + colH + 0.50 + 0.24;

  // Entablature
  const ent = new THREE.Mesh(new THREE.BoxGeometry(18.2, 1.2, 9.4), mMat);
  ent.position.y = eY + 0.6; ent.castShadow = ent.receiveShadow = true; g.add(ent);

  // Triglyph frieze — dark channel strips across the front and back faces
  const friezeY = eY + 1.22;
  const frW = 18.2, frH = 0.72, frD = 9.4;
  const frieze = new THREE.Mesh(new THREE.BoxGeometry(frW, frH, frD), capMat);
  frieze.position.y = friezeY + frH/2; g.add(frieze);
  // Triglyph dark grooves (front + back)
  for (let side of [1, -1]) {
    const fz = side * (frD/2 + 0.01);
    for (let i = -4; i <= 4; i++) {
      const tg = new THREE.Mesh(new THREE.BoxGeometry(0.26, frH+0.02, 0.08), grv);
      tg.position.set(i * 2.08, friezeY + frH/2, fz); g.add(tg);
    }
  }
  // Cornice ledge
  const cor = new THREE.Mesh(new THREE.BoxGeometry(18.9, 0.28, 10.0), capMat);
  cor.position.y = friezeY + frH + 0.14; cor.castShadow = true; g.add(cor);
  const pedBaseY = friezeY + frH + 0.28;

  // Proper triangular gable ends (BufferGeometry prisms)
  const pedH = 2.8, pedW = 18.2, pedD = 0.62;
  const gf = mkGable(pedW, pedH, pedD, capMat);
  gf.position.set(0, pedBaseY, 4.86); g.add(gf);
  const gb = mkGable(pedW, pedH, pedD, capMat);
  gb.position.set(0, pedBaseY, -4.86); g.add(gb);

  // Roof slabs — pitch matched to gable height
  const roofPitch = Math.atan2(pedH, pedW * 0.5);
  const roofY = pedBaseY + pedH * 0.52;
  const rS = (az, rx) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(18.8, 0.30, 5.4), sMat);
    s.position.set(0, roofY, az); s.rotation.x = rx;
    s.castShadow = s.receiveShadow = true; g.add(s);
  };
  rS( 2.6, -roofPitch);
  rS(-2.6,  roofPitch);
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(18.8, 0.32, 0.38), sMat);
  ridge.position.set(0, pedBaseY + pedH + 0.14, 0); g.add(ridge);

  g.scale.setScalar(0.55);
  scene.add(g);
}

// ── Plaza + Sacred Way ────────────────────────────────────────────────────
function buildPlaza(scene, {floor, stone}) {
  // Foreground plaza pad
  const pz = new THREE.Mesh(new THREE.PlaneGeometry(18, 10), floor);
  pz.rotation.x = -Math.PI/2; pz.position.set(0, 0.02, -3); pz.receiveShadow=true;
  scene.add(pz);

  // Long Sacred Way path leading back to temple
  const path = new THREE.Mesh(new THREE.PlaneGeometry(7, 44), floor);
  path.rotation.x = -Math.PI/2; path.position.set(0, 0.015, -26); path.receiveShadow=true;
  scene.add(path);

  // Grout lines on foreground plaza
  const gMat = new THREE.MeshStandardMaterial({ color: 0x7a6e58, roughness: 1.0 });
  [-4,-3,-2,-1,0,1,2,3,4].forEach(i => {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(18, 0.05), gMat);
    s.rotation.x=-Math.PI/2; s.position.set(0, 0.03, i*1.4-1); scene.add(s);
  });
  [-4,-2,0,2,4].forEach(i => {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 10), gMat);
    s.rotation.x=-Math.PI/2; s.position.set(i*2.0, 0.03, -3); scene.add(s);
  });

  // Low retaining wall flanking Sacred Way
  [-4, 4].forEach(sx => {
    const lw = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.75, 44), stone);
    lw.position.set(sx, 0.38, -26); lw.castShadow=lw.receiveShadow=true; scene.add(lw);
  });
}

// ── Ruins (far left) ─────────────────────────────────────────────────────
function buildRuins(scene, stone) {
  const g = new THREE.Group();
  g.position.set(-42, th(-42,-30), -30);

  [[0,2.6],[3.2,4.2],[-2.5,3.0]].forEach(([x,h]) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.30,0.34,h,14), stone);
    col.position.set(x, h/2, 0); col.castShadow=true; g.add(col);
  });
  // Fallen drum
  const dr = new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.32,0.58,14), stone);
  dr.rotation.z=Math.PI/2; dr.position.set(1.9,0.30,1.6); g.add(dr);
  // Scattered blocks
  [[0.5,0.55,0.3,0.6,2.6],[-1.5,0.7,0.28,0.55,2.0],[2.8,0.45,0.22,0.42,-0.6]].forEach(a => {
    const [x,w,h,d,z] = a;
    const bl = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), stone);
    bl.position.set(x,h/2,z); bl.rotation.y=_h2(x,z)*Math.PI; bl.castShadow=true; g.add(bl);
  });
  scene.add(g);
}

// ── Cypress trees ─────────────────────────────────────────────────────────
function mkCypress(scene, x, z, s=1, mats={}) {
  const tM = mats.treeBark || new THREE.MeshStandardMaterial({ color: 0x4a3218, roughness: 0.96 });
  const cM = mats.treeLeaf || new THREE.MeshStandardMaterial({ color: 0x243618, roughness: 0.90 });
  const g  = new THREE.Group();
  g.position.set(x, th(x,z), z);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.15,1.4,8), tM);
  trunk.position.y=0.7; trunk.castShadow=true; g.add(trunk);
  [[0.66,4.8,0],[0.42,3.2,0],[0.24,1.9,0]].forEach(([r,h,_]) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r,h,9), cM);
    cone.position.y = 1.4+(4.8-h)*.62+h*.5; cone.castShadow=true; g.add(cone);
  });
  g.scale.setScalar(s*(0.82+_h2(x,z)*.4)); scene.add(g);
}

// ── Olive trees ───────────────────────────────────────────────────────────
function mkOlive(scene, x, z, s=1, mats={}) {
  const tM = mats.oakBark  || new THREE.MeshStandardMaterial({ color: 0x5a4828, roughness: 0.96 });
  const cM = mats.treeLeaf || new THREE.MeshStandardMaterial({ color: 0x7a9858, roughness: 0.90 });
  const g  = new THREE.Group();
  g.position.set(x, th(x,z), z);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.17,1.8,8), tM);
  trunk.position.y=0.9; trunk.castShadow=true; g.add(trunk);
  [[-0.2,2.9,0.1],[0.32,3.2,-0.22],[0.0,3.62,0.18],[-0.38,3.1,-0.28]].forEach(([dx,dy,dz]) => {
    const sp = new THREE.Mesh(new THREE.SphereGeometry(1.32,10,8), cM);
    sp.position.set(dx,dy,dz); sp.scale.y=0.70; sp.castShadow=true; g.add(sp);
  });
  g.scale.setScalar(s*(0.75+_h2(x+1,z)*.46)); scene.add(g);
}

// ── Ancient Greek thymiateria torch ─────────────────────────────────────────
function mkTorch(scene, x, z) {
  // Verdigris-patinated bronze
  const bronze = new THREE.MeshStandardMaterial({ color: 0x3d5e48, roughness: 0.72, metalness: 0.88 });
  // Gold decorative trim
  const gold   = new THREE.MeshStandardMaterial({ color: 0xc8960c, roughness: 0.20, metalness: 0.96 });
  // Black marble base
  const mbase  = new THREE.MeshStandardMaterial({ color: 0x1a1a20, roughness: 0.38, metalness: 0.12 });

  const g  = new THREE.Group();
  const ty = th(x, z);
  g.position.set(x, ty, z);

  // Square marble plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.13, 0.54), mbase);
  plinth.position.y = 0.065; plinth.castShadow = true; g.add(plinth);

  // Round column base disk
  const baseDisk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.07, 20), bronze);
  baseDisk.position.y = 0.13 + 0.035; g.add(baseDisk);

  // Thin fluted stem
  const stemH = 0.88;
  const stem  = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.072, stemH, 16), bronze);
  stem.position.y = 0.165 + stemH / 2; stem.castShadow = true; g.add(stem);

  // Flat collar disk (hand-guard style)
  const collarY = 0.165 + stemH;
  const collar  = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.058, 24), bronze);
  collar.position.y = collarY + 0.029; g.add(collar);
  // Gold rope ring on collar edge
  const collarRim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.016, 8, 28), gold);
  collarRim.rotation.x = Math.PI / 2;
  collarRim.position.y = collarY + 0.058; g.add(collarRim);

  // Fluted horn/cone — wider at top (the torch bowl)
  const hornH = 1.72, hornY = collarY + 0.058;
  const horn  = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.072, hornH, 22), bronze);
  horn.position.y = hornY + hornH / 2; horn.castShadow = true; g.add(horn);

  // Gold decorative rim at top of horn
  const rimY = hornY + hornH;
  const rim  = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.076, 22), gold);
  rim.position.y = rimY + 0.038; g.add(rim);
  const rimTorus = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.020, 8, 28), gold);
  rimTorus.rotation.x = Math.PI / 2;
  rimTorus.position.y = rimY + 0.076; g.add(rimTorus);

  // Fire glow sphere (emissive)
  const flameY = rimY + 0.076 + 0.22;
  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xff8800, emissive: 0xff5500, emissiveIntensity: 3.0, roughness: 1.0
  });
  const flameCore = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 6), flameMat);
  flameCore.position.y = flameY; g.add(flameCore);
  // Outer soft glow halo
  const haloMat = new THREE.MeshStandardMaterial({
    color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 1.4,
    roughness: 1.0, transparent: true, opacity: 0.45
  });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 6), haloMat);
  halo.position.y = flameY; g.add(halo);

  scene.add(g);

  const light = new THREE.PointLight(0xff7a18, 0, 22, 1.8);
  light.position.set(x, ty + flameY, z);
  scene.add(light);
  return { light, flame: flameCore };
}

// ── Greek island stone house ──────────────────────────────────────────────
function mkGreekHouse(scene, {stone, wood}) {
  // White-lime plaster — PBR upgraded async with rough_plaster set
  const plaster = new THREE.MeshStandardMaterial({ color: 0xf2ede0, roughness: 0.88, metalness: 0.0 });
  upgradeMaterial(plaster, 'rough_plaster', { repeat:[2,2], normalScale:0.55, roughness:0.84, anisotropy:8 });
  const wm = wood;

  // Position: opposite horizon from temple (z=+44), slightly off-centre
  const hx = 12, hz = 44;
  const g = new THREE.Group();
  g.position.set(hx, th(hx, hz), hz);
  g.rotation.y = Math.PI * 1.15; // face roughly toward camera

  // ── Main block ──────────────────────────────────────────────────────────
  const bW=7.8, bH=3.0, bD=5.2;
  const body = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), plaster);
  body.position.y = bH/2; body.castShadow = body.receiveShadow = true; g.add(body);

  // Flat roof with slight parapet lip
  const roof = new THREE.Mesh(new THREE.BoxGeometry(bW+0.28, 0.38, bD+0.28), plaster);
  roof.position.y = bH + 0.19; roof.castShadow = true; g.add(roof);
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(bW+0.36, 0.28, bD+0.36), plaster);
  parapet.position.y = bH + 0.52; parapet.castShadow = true; g.add(parapet);

  // ── Attached open pergola / lean-to ─────────────────────────────────────
  const pW=3.2, pH=bH-0.55, pD=2.6;
  const pRoof = new THREE.Mesh(new THREE.BoxGeometry(pW, 0.22, pD), wm);
  pRoof.position.set(-(bW+pD)/2+pD/2, pH, 0); pRoof.castShadow=true; g.add(pRoof);
  // Pergola beams
  for (let bz of [-pD/2+0.3, 0, pD/2-0.3]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(pD, 0.12, 0.12), wm);
    beam.rotation.y = Math.PI/2;
    beam.position.set(-(bW/2+pD/2-0.1), pH, bz); g.add(beam);
  }
  // Pergola posts
  for (const bz of [-pD/2+0.2, pD/2-0.2]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.11,pH,8), wm);
    post.position.set(-(bW/2+pD-0.18), pH/2, bz); post.castShadow=true; g.add(post);
  }

  // ── Door opening ─────────────────────────────────────────────────────────
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x120e08, roughness: 1.0 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.05, 2.35, 0.55), darkMat);
  door.position.set(-bW/2+0.05, 1.18, 0.6); g.add(door);
  const dfL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.46, 0.28), wm);
  dfL.position.set(-bW/2+0.05-0.52, 1.23, 0.46); g.add(dfL);
  const dfR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.46, 0.28), wm);
  dfR.position.set(-bW/2+0.05+0.52, 1.23, 0.46); g.add(dfR);
  const dfT = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.16, 0.28), wm);
  dfT.position.set(-bW/2+0.05, 2.42, 0.46); g.add(dfT);

  // ── Window ───────────────────────────────────────────────────────────────
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.72, 0.5), darkMat);
  win.position.set(1.0, 1.85, bD/2+0.05); g.add(win);
  const wfr = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.92, 0.22), wm);
  wfr.position.set(1.0, 1.85, bD/2+0.12); g.add(wfr);

  // ── Steps ────────────────────────────────────────────────────────────────
  for (let i=0; i<3; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(1.9-i*0.22, 0.20, 0.38), plaster);
    s.position.set(-bW/2+0.05, i*0.20+0.10, 0.6+0.38+i*0.38);
    s.castShadow = s.receiveShadow = true; g.add(s);
  }

  // ── Stone bench / seat ───────────────────────────────────────────────────
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.28, 0.45), plaster);
  bench.position.set(-bW/2+0.05, 0.50, -bD/2+0.4); bench.castShadow=true; g.add(bench);

  // ── Interior warm glow through door & window ─────────────────────────────
  const interior = new THREE.PointLight(0xffa030, 2.2, 6.5, 2.0);
  interior.position.set(0.8, 1.4, 0); g.add(interior);

  scene.add(g);
}

// ── Armillary sphere ──────────────────────────────────────────────────────
function mkArmillary(scene, {brass, dark}) {
  const g = new THREE.Group();
  const gx=-8.5, gz=-2;
  g.position.set(gx, th(gx,gz)+0.84, gz);

  const stand = new THREE.MeshStandardMaterial({ color: 0x5a3c18, roughness: 0.88 });
  const ped1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.18,0.85,12), stand);
  ped1.position.set(0,-0.43,0); g.add(ped1);
  const ped2 = new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.32,0.1,14), stand);
  ped2.position.set(0,-0.9,0); g.add(ped2);

  // Inner sphere
  const sph = new THREE.Mesh(new THREE.SphereGeometry(0.40,14,12), dark);
  g.add(sph);

  // Rings
  [[0.62,0.040,0,0],[0.62,0.040,Math.PI/2,0],[0.62,0.040,0,Math.PI/3],
   [0.62,0.040,0,Math.PI*2/3],[0.46,0.030,0,0]].forEach(([R,r,rx,ry]) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R,r,8,48), brass);
    ring.rotation.x=rx; ring.rotation.y=ry; g.add(ring);
  });
  const ax = new THREE.Mesh(new THREE.CylinderGeometry(0.028,0.028,1.32,8), brass);
  ax.rotation.z=Math.PI*.12; g.add(ax);
  scene.add(g);
}

// ── Scroll table ─────────────────────────────────────────────────────────
function mkScrolls(scene, {wood, scroll}) {
  const g = new THREE.Group();
  const tx=7.5, tz=-2;
  g.position.set(tx, th(tx,tz), tz);

  const top = new THREE.Mesh(new THREE.BoxGeometry(2.6,0.10,1.15), wood);
  top.position.y=1.05; top.castShadow=true; g.add(top);
  [[-0.85,0.5],[0.85,0.5]].forEach(([x]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.07,1.05,8), wood);
    leg.position.set(x,0.53,0); g.add(leg);
  });
  [[-0.72,1.42],[-0.38,1.38],[-0.06,1.44]].forEach(([x,y]) => {
    const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.11,0.64,12), scroll);
    sc.position.set(x,y,0); sc.castShadow=true; g.add(sc);
  });
  const open = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,2.1,12), scroll);
  open.rotation.z=Math.PI/2; open.position.set(0.35,1.12,-0.18); g.add(open);
  const parch = new THREE.Mesh(new THREE.PlaneGeometry(1.9,0.58), scroll);
  parch.rotation.x=-Math.PI/2; parch.position.set(0.35,1.13,-0.18); g.add(parch);
  scene.add(g);
}

// ── Lighting ─────────────────────────────────────────────────────────────
function buildLighting(scene) {
  const hemi    = new THREE.HemisphereLight(0x7088cc, 0x4a6a28, 1.0);
  const sun     = new THREE.DirectionalLight(0xffe8c0, 2.4);
  const fill    = new THREE.DirectionalLight(0x8898d8, 0.4);
  const ambient = new THREE.AmbientLight(0x101828, 0.5);

  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far  = 250;
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -80; sc.right = sc.top = 80;
  sun.shadow.bias       = -0.0006;
  sun.shadow.normalBias = 0.04;
  sun.shadow.radius     = 2;  // PCFSoft: slight blur

  fill.position.set(-50, 40, 30);
  scene.add(hemi, sun, fill, ambient);
  return { hemi, sun, fill, ambient };
}

// ── Main export ───────────────────────────────────────────────────────────
export function initFpGround(model) {
  const host = document.getElementById('view') || document.getElementById('app');

  const canvas = document.createElement('canvas');
  canvas.id = 'fp-ground-canvas';
  host.appendChild(canvas);

  // ── Renderer ────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.toneMapping       = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x000000, 0);  // fully transparent — sky shows through
  try { renderer.outputColorSpace = THREE.SRGBColorSpace; }
  catch(_) { try { renderer.outputEncoding = 3001; } catch(__) {} }

  // ── Camera — full-screen, matches main view exactly ──────────────────
  const camera = new THREE.PerspectiveCamera(52, 2, 0.06, 600);
  camera.position.set(0, 1.62, 0);

  // ── Scene ────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  // No scene.background — renderer.setClearColor transparent handles sky

  // Atmospheric fog (blends ground into horizon)
  scene.fog = new THREE.FogExp2(0x8899aa, 0.016);

  // ── Materials + textures ─────────────────────────────────────────────
  const mats = buildMaterials(renderer);

  // ── Geometry ─────────────────────────────────────────────────────────
  buildTerrain(scene, mats.terrain);
  buildTemple(scene, mats);
  buildPlaza(scene, mats);
  buildRuins(scene, mats.stone);
  mkGreekHouse(scene, mats);
  mkArmillary(scene, mats);
  mkScrolls(scene, mats);

  // Cypress trees
  [[-15,-10],[-19,-7],[-13,-19],[17,-13],[22,-8],[18,-23],
   [-28,-18],[31,-20],[-9,-42],[12,-38],[-35,-25],[38,-28]].forEach(([x,z]) => mkCypress(scene,x,z,1,mats));

  // Olive trees
  [[-24,-5],[-31,-3],[35,-4],[-18,-27],[28,-17],[-38,-8],[40,-12]].forEach(([x,z]) => mkOlive(scene,x,z,1,mats));

  // Olive trees scattered around the Greek house (positive z side)
  [[5,36],[19,40],[8,52],[22,48],[-2,50]].forEach(([x,z]) => mkOlive(scene,x,z,0.9,mats));
  [[3,34],[18,37]].forEach(([x,z]) => mkCypress(scene,x,z,0.85,mats));

  // Torch stands (close flanking camera)
  const torch0 = mkTorch(scene, -5.8, -0.9);
  const torch1 = mkTorch(scene,  5.8, -0.9);

  // ── Lighting ─────────────────────────────────────────────────────────
  const { hemi, sun, fill, ambient } = buildLighting(scene);

  // ── Loop state ───────────────────────────────────────────────────────
  let _raf = null, _torchT = 0, _lastMs = 0;
  let _lastW = 0, _lastH = 0;

  function tick(now) {
    const dt   = Math.min((now - _lastMs) / 1000, 0.05);
    _lastMs    = now;
    _torchT   += dt;

    // ── Resize ────────────────────────────────────────────────────────
    const W = host.clientWidth  || window.innerWidth;
    const H = host.clientHeight || window.innerHeight;
    if (W !== _lastW || H !== _lastH) {
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      _lastW = W; _lastH = H;
    }

    // ── Camera — mirror main view ─────────────────────────────────────
    const s  = model.state;
    const c  = model.computed;
    const FOV_BASE = 75;
    const zoom = Math.max(0.2, s.OpticalZoom || 5.09);
    const fovV = Math.max(1, Math.min(FOV_BASE, FOV_BASE / zoom));
    if (Math.abs(camera.fov - fovV) > 0.2) {
      camera.fov = fovV;
      camera.updateProjectionMatrix();
    }
    const heading  = (s.ObserverHeading || 0) * Math.PI / 180;
    const pitchDeg = Math.max(-30, Math.min(90, s.CameraHeight || 0));
    camera.quaternion.setFromEuler(new THREE.Euler(-pitchDeg * Math.PI / 180, -heading, 0, 'YXZ'));

    // ── Day/night factor ──────────────────────────────────────────────
    const el = c?.SunAnglesGlobe?.elevation ?? -90;
    const tf = Math.max(0, Math.min(1, (el + 18) / 24)); // 0=night, 1=day
    const tn = 1 - tf;

    // ── Sun position (from actual azimuth) ────────────────────────────
    const sAz = ((c?.SunAnglesGlobe?.azimuth ?? 180)) * Math.PI / 180;
    const sEl = Math.max(0.04, el) * Math.PI / 180;
    sun.position.set(
       120 * Math.sin(sAz) * Math.cos(sEl),
       120 * Math.sin(Math.max(0.04, sEl)),
      -120 * Math.cos(sAz) * Math.cos(sEl)
    );
    sun.intensity   = tf * 2.5;
    sun.color.setHSL(0.09 + tf * 0.04, 0.22 + tf * 0.20, 0.90);

    fill.intensity  = tn * 0.45;

    hemi.color.setHSL(0.57 - tf * 0.05, 0.32 + tf * 0.12, 0.16 + tf * 0.56);
    hemi.groundColor.setHSL(0.14 + tf * 0.04, 0.26 + tf * 0.10, 0.07 + tf * 0.34);
    hemi.intensity  = 0.32 + tf * 0.95;

    ambient.intensity = 0.10 + tf * 0.38;
    ambient.color.setHSL(0.58 * tn + 0.10 * tf, 0.40 * tn + 0.08, 0.24);

    // ── Torch flicker ─────────────────────────────────────────────────
    const fl0 = 1 + Math.sin(_torchT*7.4)*.18 + Math.sin(_torchT*13.1)*.10 + Math.sin(_torchT*19.7)*.06;
    const fl1 = 1 + Math.sin(_torchT*6.8)*.16 + Math.sin(_torchT*11.9)*.12 + Math.sin(_torchT*17.3)*.07;
    torch0.light.intensity = tn * 3.8 * fl0;
    torch1.light.intensity = tn * 3.8 * fl1;
    torch0.flame.visible = tn > 0.05;
    torch1.flame.visible = tn > 0.05;
    if (torch0.flame.material) torch0.flame.material.emissiveIntensity = 2.4 * fl0;
    if (torch1.flame.material) torch1.flame.material.emissiveIntensity = 2.4 * fl1;
    const hue0 = 0.07 + Math.sin(_torchT * 5.1) * 0.01;
    torch0.light.color.setHSL(hue0, 0.85, 0.55);
    torch1.light.color.setHSL(hue0 + 0.01, 0.85, 0.55);

    // ── Fog — warm day haze, deep blue night ──────────────────────────
    scene.fog.color.setHSL(0.54*tn + 0.13*tf, 0.22+tf*.12, 0.07+tf*.52);
    scene.fog.density = 0.020 - tf * 0.010;

    // ── Tone mapping exposure ─────────────────────────────────────────
    renderer.toneMappingExposure = 0.78 + tf * 0.46;

    renderer.render(scene, camera);
    _raf = requestAnimationFrame(tick);
  }

  // ── Start / stop with fp-mode class ──────────────────────────────────
  new MutationObserver(() => {
    const fp = document.body.classList.contains('fp-mode');
    if (fp && !_raf) {
      canvas.style.display = '';
      _lastMs = performance.now();
      tick(_lastMs);
    } else if (!fp && _raf) {
      cancelAnimationFrame(_raf);
      _raf = null;
      canvas.style.display = 'none';
    }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  const isFp = document.body.classList.contains('fp-mode');
  canvas.style.display = isFp ? '' : 'none';
  if (isFp) { _lastMs = performance.now(); tick(_lastMs); }
}
