import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, makeNoise, canvas, texFromCanvas, rimMat } from './util.js';
import { rockify, stoneTexture } from './rock.js';
import { glowQuad, glowPoints, flameQuad } from './fx.js';

const RIM = { right: 0xff2b24, left: 0x7a6bff, strengthR: 0.16, strengthL: 0.18, power: 2.8 };

let _stone = null;
function stoneMat() {
  if (_stone) return _stone;
  const t = stoneTexture(9, { base: [70, 70, 84], dark: [22, 22, 30] });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  _stone = rimMat({ map: t, roughness: 0.9, flatShading: true, color: 0xb0b0c0 }, RIM);
  return _stone;
}

// ---------- voxel tree ----------
export function buildTree(seed = 1, { height = 9, canopy = 4.2 } = {}) {
  const r = rng(seed);
  const nz = makeNoise(seed + 3);
  const g = new THREE.Group();
  const bark = rimMat({ color: 0x2c2420, roughness: 0.95, flatShading: true }, RIM);
  let x = 0, z = 0;
  for (let y = 0; y < height; y += 1.1) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.15, 1.3), bark);
    x += (r() - 0.5) * 0.25; z += (r() - 0.5) * 0.25;
    b.position.set(x, y + 0.55, z);
    b.rotation.y = r() * 0.3;
    b.castShadow = true; b.receiveShadow = true;
    g.add(b);
  }
  // a couple of branches
  for (const [dx, dy, len, ang] of [[0.6, height * 0.6, 3, 0.8], [-0.6, height * 0.75, 2.6, -0.9]]) {
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.7, len, 0.7), bark);
    br.position.set(x + dx + Math.sin(ang) * len * 0.4, dy + Math.cos(ang) * len * 0.3, z);
    br.rotation.z = -ang;
    g.add(br);
  }
  // canopy: blobby clusters of leaf cubes (instanced)
  const centers = [[0, height + 1.5, 0, canopy], [2.6, height + 0.6, 0.6, canopy * 0.75], [-2.4, height + 0.9, -0.4, canopy * 0.8], [0.6, height + 3.4, -0.6, canopy * 0.7], [-1, height + 0.4, 2.0, canopy * 0.7]];
  const cubes = [];
  const cs = 1.0;
  const seen = new Set();
  for (const [cx, cy, cz, rad] of centers) {
    for (let ix = -Math.ceil(rad); ix <= Math.ceil(rad); ix++) for (let iy = -Math.ceil(rad); iy <= Math.ceil(rad); iy++) for (let iz = -Math.ceil(rad); iz <= Math.ceil(rad); iz++) {
      const px = Math.round(cx / cs + ix), py = Math.round(cy / cs + iy * 0.8), pz = Math.round(cz / cs + iz);
      const d = Math.hypot(ix, iy * 1.25, iz) / rad;
      const n = nz.n3(px * 0.35, py * 0.35, pz * 0.35);
      if (d < 0.75 + 0.45 * n) {
        const key = px + ',' + py + ',' + pz;
        if (seen.has(key)) continue;
        seen.add(key);
        cubes.push([px * cs, py * cs, pz * cs]);
      }
    }
  }
  const leafMat = rimMat({ color: 0xffffff, roughness: 0.85, flatShading: true }, { ...RIM, strengthR: 0.15, strengthL: 0.5 });
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(cs * 1.02, cs * 1.02, cs * 1.02), leafMat, cubes.length);
  const m = new THREE.Matrix4(), col = new THREE.Color();
  const palette = [0x4a8a50, 0x5a9a5a, 0x3c7046, 0x6aa862, 0x44806a];
  cubes.forEach(([px, py, pz], i) => {
    m.makeTranslation(px + x, py, pz + z);
    inst.setMatrixAt(i, m);
    col.set(palette[Math.floor(r() * palette.length)]).multiplyScalar(0.8 + r() * 0.4);
    inst.setColorAt(i, col);
  });
  inst.castShadow = true; inst.receiveShadow = true;
  g.add(inst);
  return g;
}

// ---------- stone wall with an iron lantern ----------
export function buildWallWithLantern(seed = 2, { width = 7, height = 9 } = {}) {
  const r = rng(seed);
  const g = new THREE.Group();
  const mat = stoneMat();
  const bh = 0.8;
  for (let row = 0; row * bh < height; row++) {
    const off = (row % 2) * 0.8;
    const rowW = width - (row * bh > height - 2.5 ? r() * 3 : 0);   // broken top
    for (let x = -off; x < rowW; x += 1.6) {
      const w = Math.min(1.6, rowW - x);
      if (w < 0.4) continue;
      const geo = new RoundedBoxGeometry(w - 0.06, bh - 0.06, 1.2 + r() * 0.15, 1, 0.08);
      const b = new THREE.Mesh(geo, mat);
      b.position.set(x + w / 2, row * bh + bh / 2, (r() - 0.5) * 0.12);
      b.castShadow = true; b.receiveShadow = true;
      g.add(b);
    }
  }
  // lantern on a bracket at the right end
  const iron = rimMat({ color: 0x1a1a20, roughness: 0.5, metalness: 0.8 }, RIM);
  const lant = new THREE.Group();
  lant.position.set(width - 0.9, height * 0.8, 1.0);
  g.add(lant);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 1.1), iron); arm.position.set(0, 0.95, -0.55); lant.add(arm);
  const glassMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb050).multiplyScalar(4.5) });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.55), glassMat); lant.add(glass);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.08), iron); bar.position.set(sx * 0.3, 0, sz * 0.3); lant.add(bar);
  }
  const capTop = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.45, 4), iron); capTop.position.y = 0.68; capTop.rotation.y = Math.PI / 4; lant.add(capTop);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.72), iron); base.position.y = -0.48; lant.add(base);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 4, 10), iron); ring.position.y = 0.98; lant.add(ring);
  const light = new THREE.PointLight(0xff9a40, 8, 0, 2);
  light.position.set(0, -0.2, 0.5);
  lant.add(light);
  g.userData.lantern = lant;
  return g;
}

// ---------- banner on a pole ----------
function bannerTexture(seed) {
  const W = 256, H = 640;
  const [c, ctx] = canvas(W, H);
  const r = rng(seed);
  ctx.fillStyle = '#0d0c16'; ctx.fillRect(0, 0, W, H);
  // cloth grain
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = `rgba(${40 + r() * 30},${30 + r() * 20},${60 + r() * 40},${0.05 + r() * 0.08})`;
    ctx.fillRect(r() * W, r() * H, 1 + r() * 2, 4 + r() * 18);
  }
  // violet border
  ctx.strokeStyle = '#3c1a66'; ctx.lineWidth = 10; ctx.strokeRect(14, 10, W - 28, H - 20);
  ctx.strokeStyle = '#6d3aa8'; ctx.lineWidth = 2; ctx.strokeRect(24, 20, W - 48, H - 40);
  // emblem: sword pointing down with wings
  ctx.save();
  ctx.translate(W / 2, H * 0.36);
  ctx.fillStyle = '#9aa0b8';
  ctx.shadowColor = 'rgba(170,110,255,0.8)'; ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(-9, -60); ctx.lineTo(9, -60); ctx.lineTo(9, 120); ctx.lineTo(0, 150); ctx.lineTo(-9, 120); ctx.closePath(); ctx.fill();
  ctx.fillRect(-46, -66, 92, 12);
  ctx.beginPath(); ctx.arc(0, -82, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-5, -82, 10, 18);
  // wings
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 14, -40);
    ctx.quadraticCurveTo(s * 70, -80, s * 100, -30);
    ctx.quadraticCurveTo(s * 70, -40, s * 60, -10);
    ctx.quadraticCurveTo(s * 50, -20, s * 14, -10);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  return texFromCanvas(c);
}

export function buildBanner(seed = 4, { poleH = 15, bw = 3.2, bh = 7.5 } = {}) {
  const g = new THREE.Group();
  const wood = rimMat({ color: 0x241b16, roughness: 0.9 }, RIM);
  const iron = rimMat({ color: 0x2a2a32, roughness: 0.4, metalness: 0.9 }, RIM);
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.45, poleH, 0.45), wood); pole.position.y = poleH / 2; g.add(pole);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(bw + 1.0, 0.32, 0.32), wood); bar.position.set(bw / 2 + 0.2, poleH - 0.8, 0); g.add(bar);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.4, 4), iron); tip.position.y = poleH + 0.7; g.add(tip);
  for (const s of [0, 1]) {
    const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), iron); cap.position.set(s ? bw + 0.7 : -0.3, poleH - 0.8, 0); g.add(cap);
  }
  // cloth
  const geo = new THREE.PlaneGeometry(bw, bh, 20, 40);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const u = x / bw + 0.5, v = 0.5 - y / bh;   // v: 0 top .. 1 bottom
    const z = 0.35 * Math.sin(u * 5 + v * 3) * v + 0.25 * Math.sin(v * 7) * v;
    const sx = -0.9 * v * v;    // blown slightly toward image-left
    p.setXYZ(i, x + bw / 2 + 0.2 + sx, poleH - 1.0 - v * bh + 0.25 * v * v, z);
  }
  geo.computeVertexNormals();
  const tat = (() => {
    const W = 256, H = 640;
    const [c, ctx] = canvas(W, H);
    const r = rng(seed + 7);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let i = 0; i <= 12; i++) ctx.lineTo((i / 12) * W, H - (i % 2 ? 40 + r() * 70 : r() * 20) - (Math.abs(i - 6) < 2 ? 50 : 0));
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(r() * W, H * (0.6 + r() * 0.25), 6 + r() * 10, 12 + r() * 20, 0, 0, Math.PI * 2); ctx.fill(); }
    return texFromCanvas(c, { srgb: false });
  })();
  const cloth = new THREE.Mesh(geo, rimMat({ map: bannerTexture(seed), alphaMap: tat, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }, RIM));
  cloth.castShadow = true;
  g.add(cloth);
  return g;
}

// ---------- rune pillar ----------
function runeTexture() {
  const W = 256, H = 512;
  const [c, ctx] = canvas(W, H);
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = '#ff3a26'; ctx.fillStyle = '#ff3a26';
  ctx.lineCap = 'square'; ctx.lineJoin = 'miter';
  ctx.shadowColor = 'rgba(255,40,20,1)';
  for (const [blur, lw, col] of [[26, 18, 'rgba(255,40,20,0.9)'], [8, 10, 'rgba(255,90,60,1)'], [0, 4, 'rgba(255,220,200,1)']]) {
    ctx.shadowBlur = blur; ctx.lineWidth = lw; ctx.strokeStyle = col;
    ctx.beginPath();
    // central sword rune with cross bars and hooks
    ctx.moveTo(W / 2, 40); ctx.lineTo(W / 2, H - 50);
    ctx.moveTo(W / 2 - 70, 150); ctx.lineTo(W / 2 + 70, 150);
    ctx.moveTo(W / 2 - 70, 150); ctx.lineTo(W / 2 - 70, 200);
    ctx.moveTo(W / 2 + 70, 150); ctx.lineTo(W / 2 + 70, 110);
    ctx.moveTo(W / 2 - 45, 290); ctx.lineTo(W / 2 + 45, 330);
    ctx.moveTo(W / 2 + 45, 290); ctx.lineTo(W / 2 - 45, 330);
    ctx.moveTo(W / 2 - 30, 80); ctx.lineTo(W / 2, 40); ctx.lineTo(W / 2 + 30, 80);
    ctx.moveTo(W / 2 - 25, H - 90); ctx.lineTo(W / 2, H - 50); ctx.lineTo(W / 2 + 25, H - 90);
    ctx.stroke();
  }
  return texFromCanvas(c);
}

export function buildRunePillar(seed = 5, { w = 2.8 } = {}) {
  const r = rng(seed);
  const g = new THREE.Group();
  const mat = stoneMat();
  let y = 0;
  const blocks = [[w + 0.6, 1.0], [w, 2.9], [w - 0.1, 2.7], [w + 0.4, 0.9], [w + 0.8, 0.8]];
  for (const [bw, bh] of blocks) {
    const geo = rockify(new THREE.BoxGeometry(bw, bh, bw, 3, 3, 3), { amp: 0.12, freq: 0.9, seed: seed * 10 + y * 7, uvScale: 0.35 });
    const b = new THREE.Mesh(geo, mat);
    b.position.set((r() - 0.5) * 0.12, y + bh / 2, (r() - 0.5) * 0.12);
    b.rotation.y = (r() - 0.5) * 0.08;
    b.castShadow = true; b.receiveShadow = true;
    g.add(b);
    y += bh;
  }
  // glowing rune carved into the front face (+Z)
  const runeMat = new THREE.MeshBasicMaterial({ map: runeTexture(), color: new THREE.Color(1.0, 0.35, 0.3).multiplyScalar(1.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const rune = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.82, w * 1.64), runeMat);
  rune.position.set(0, 4.0, w / 2 + 0.08);
  g.add(rune);
  const l = new THREE.PointLight(0xff2a18, 2.2, 0, 2);
  l.position.set(0, 4.0, w / 2 + 0.7);
  g.add(l);
  g.userData.runePos = rune.position.clone();
  return g;
}

// ---------- fire brazier ----------
export function buildBrazier() {
  const g = new THREE.Group();
  const mat = stoneMat();
  const iron = rimMat({ color: 0x1b1a20, roughness: 0.45, metalness: 0.85 }, RIM);
  const ped = new THREE.Mesh(new RoundedBoxGeometry(1.4, 1.6, 1.4, 2, 0.1), mat); ped.position.y = 0.8; g.add(ped);
  const cap = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.3, 1.8, 2, 0.08), mat); cap.position.y = 1.75; g.add(cap);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.5, 0.6, 8, 1, true), iron); bowl.position.y = 2.2; g.add(bowl);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.07, 4, 8), iron); rim.rotation.x = Math.PI / 2; rim.position.y = 2.5; rim.rotation.z = Math.PI / 8; g.add(rim);
  const coals = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.1, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff4a10).multiplyScalar(1.6) }));
  coals.position.y = 2.42; g.add(coals);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.fireBase = new THREE.Vector3(0, 2.42, 0);
  return g;
}

export function addFire(scene, camera, base, scale, seed = 12) {
  const r = rng(seed);
  const g = new THREE.Group();
  const cols = [0xff3a0a, 0xff6a14, 0xffa030, 0xffd27a];
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const c = new THREE.Color(cols[Math.min(3, Math.floor(t * 4))]).multiplyScalar(0.4 + t * 0.45);
    const w = (1.9 - t * 1.1) * scale, h = (2.6 - t * 0.9 + r() * 0.8) * scale;
    const p = base.clone().add(new THREE.Vector3((r() - 0.5) * 0.7 * scale, -0.1 * scale, (r() - 0.5) * 0.4 * scale));
    const f = flameQuad(camera, p, w, h, c, 0.7);
    f.rotation.z = (r() - 0.5) * 0.25 + 0.12;   // lean with the wind (toward image-left)
    g.add(f);
  }
  g.add(glowQuad(camera, base.clone().add(new THREE.Vector3(0, 1.0 * scale, 0)), 3.0 * scale, new THREE.Color(0xff6a20), 0.2));
  // embers rising and drifting left
  const P = [], C = [], Z = [];
  for (let i = 0; i < 70; i++) {
    const h = r() * 7 * scale;
    P.push(base.x - h * (0.25 + r() * 0.4) + (r() - 0.5) * 0.8, base.y + 0.6 + h, base.z + (r() - 0.5) * 1.5);
    const c = new THREE.Color().setRGB(3.0, 0.9 + r() * 0.8, 0.2);
    C.push(c.r, c.g, c.b);
    Z.push((0.04 + r() * 0.07) * scale);
  }
  g.add(glowPoints(P, C, Z));
  const light = new THREE.PointLight(0xff6a1a, 2.4 * scale, 0, 2);
  light.position.copy(base).add(new THREE.Vector3(0, 1.2 * scale, 0.3));
  g.add(light);
  scene.add(g);
  return g;
}

// ---------- rough foreground boulders ----------
export function buildBoulder(seed, w, h, d) {
  const geo = rockify(new THREE.BoxGeometry(w, h, d, 4, 3, 4), { amp: Math.min(w, h, d) * 0.22, freq: 0.6 / Math.max(w, h, d) * 3, seed, uvScale: 0.25 });
  const m = new THREE.Mesh(geo, stoneMat());
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
