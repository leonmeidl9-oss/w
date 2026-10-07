import * as THREE from 'three';
import { rng, makeNoise, canvas, texFromCanvas } from './util.js';

// Floating rock island: irregular flat top, jagged inverted-cone underside.
export function islandGeometry(seed, { radius = 50, depth = 70, rows = 22, segs = 56, roughness = 0.22, topBump = 2.5, lumpy = 1 } = {}) {
  const r = rng(seed);
  const nz = makeNoise(seed * 7 + 3);
  const outline = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const n = nz.fbm2(Math.cos(a) * 1.6 + 10, Math.sin(a) * 1.6 + 10, 4);
    outline.push(radius * (0.78 + 0.44 * n) * (1 + 0.06 * Math.sin(a * 5 + seed)));
  }
  const positions = [];
  const colors = [];
  const cTop = new THREE.Color(0x26302a), cTop2 = new THREE.Color(0x2e3a2c);
  const cRim = new THREE.Color(0x3a3644), cRock = new THREE.Color(0x2c2834), cDeep = new THREE.Color(0x15121b);
  const grid = [];
  for (let j = 0; j <= rows; j++) {
    const t = j / rows;
    const row = [];
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      let rad = outline[i] * Math.pow(1 - t, 0.9 + 0.5 * lumpy * nz.n2(i * 0.31, j * 0.4));
      // overhang lip just below the rim
      if (j === 1) rad *= 1.05;
      const y = -t * depth * (0.75 + 0.5 * nz.fbm2(Math.cos(a) * 2 + 3, Math.sin(a) * 2 + 3, 3));
      const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      // rocky displacement
      const d = (nz.fbm3(x * 0.06, y * 0.09, z * 0.06, 4) - 0.5) * radius * roughness * (0.4 + t);
      row.push(new THREE.Vector3(x + Math.cos(a) * d, y + d * 0.3, z + Math.sin(a) * d));
    }
    grid.push(row);
  }
  const tip = new THREE.Vector3((r() - 0.5) * radius * 0.2, -depth * (1.05 + r() * 0.25), (r() - 0.5) * radius * 0.2);
  const pushTri = (a, b, c, ca, cb, cc) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    colors.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b, cc.r, cc.g, cc.b);
  };
  const rockCol = (p) => {
    const t = THREE.MathUtils.clamp(-p.y / depth, 0, 1);
    const strata = 0.5 + 0.5 * Math.sin(p.y * 0.35 + nz.n2(p.x * 0.05, p.z * 0.05) * 4);
    const c = cRim.clone().lerp(cRock, Math.min(1, t * 2)).lerp(cDeep, Math.max(0, t * 1.3 - 0.3));
    return c.multiplyScalar(0.85 + 0.3 * strata);
  };
  // underside
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < segs; i++) {
      const i2 = (i + 1) % segs;
      const a = grid[j][i], b = grid[j][i2], c = grid[j + 1][i], d = grid[j + 1][i2];
      pushTri(a, c, b, rockCol(a), rockCol(c), rockCol(b));
      pushTri(b, c, d, rockCol(b), rockCol(c), rockCol(d));
    }
  }
  for (let i = 0; i < segs; i++) {
    const i2 = (i + 1) % segs;
    const a = grid[rows][i], b = grid[rows][i2];
    pushTri(a, tip, b, rockCol(a), rockCol(tip), rockCol(b));
  }
  // top cap with gentle bumps
  const center = new THREE.Vector3(0, topBump, 0);
  const ring2 = grid[0].map((p) => new THREE.Vector3(p.x * 0.6, topBump * 0.6 + (nz.n2(p.x * 0.1, p.z * 0.1) - 0.5) * topBump, p.z * 0.6));
  for (let i = 0; i < segs; i++) {
    const i2 = (i + 1) % segs;
    const ca = cTop.clone().lerp(cTop2, nz.n2(i * 0.5, 1.5));
    pushTri(grid[0][i], grid[0][i2], ring2[i], cRim, cRim, ca);
    pushTri(grid[0][i2], ring2[i2], ring2[i], cRim, ca, ca);
    pushTri(ring2[i], ring2[i2], center, ca, ca, cTop2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  geo.userData.outline = outline;
  return geo;
}

const islandMat = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.0, flatShading: true });

export function buildIsland(seed, opts = {}) {
  const m = new THREE.Mesh(islandGeometry(seed, opts), opts.material || islandMat());
  m.castShadow = false; m.receiveShadow = false;
  return m;
}

// ---------- waterfalls ----------
let _wfTex = null;
function waterfallTexture() {
  if (_wfTex) return _wfTex;
  const W = 128, H = 512;
  const [c, ctx] = canvas(W, H);
  const nz = makeNoise(99);
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;
      const streak = nz.fbm2(u * 34, v * 1.6, 4);
      const fine = nz.n2(u * 70, v * 6);
      let a = Math.pow(streak, 1.8) * 1.6 + fine * 0.2;
      const side = Math.min(1, Math.min(u, 1 - u) * 6);   // soft left/right edges
      const top = Math.min(1, v * 25) * (1 + 0.6 * Math.max(0, 1 - v * 6));
      const bottom = Math.pow(1 - v, 2.4);
      a = Math.min(1, a) * side * top * bottom;
      const i = (y * W + x) * 4;
      const b = 0.75 + 0.25 * streak;
      img.data[i] = 200 * b + 55; img.data[i + 1] = 215 * b + 40; img.data[i + 2] = 255; img.data[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  _wfTex = texFromCanvas(c);
  return _wfTex;
}

export function buildWaterfall({ width = 8, height = 120, color = 0xa9bff0, opacity = 0.9, curve = 3, spread = 1.0 }) {
  const geo = new THREE.PlaneGeometry(width, height, 1, 24);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const v = 0.5 - y / height; // 0 top .. 1 bottom
    pos.setY(i, -v * height);
    pos.setX(i, pos.getX(i) * (1 + (spread - 1) * Math.pow(v, 0.8)));
    pos.setZ(i, curve * (1 - Math.pow(1 - Math.min(v * 4, 1), 2)));
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshBasicMaterial({
    map: waterfallTexture(), color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 2;
  return m;
}

// Soft billboard puff (mist, smoke, haze cards)
let _puffTex = null;
export function puffTexture() {
  if (_puffTex) return _puffTex;
  const S = 256;
  const nz = makeNoise(1234);
  const [c, ctx] = canvas(S, S);
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (x / S - 0.5) * 2, dy = (y / S - 0.5) * 2;
      const r = Math.sqrt(dx * dx + dy * dy);
      const n = nz.fbm2(x / S * 5, y / S * 5, 5);
      const a = Math.max(0, 1 - r) ** 1.6 * (0.45 + 0.9 * n);
      const i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.min(255, a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  _puffTex = texFromCanvas(c, { srgb: false });
  return _puffTex;
}

export function buildPuff({ size = 20, color = 0xffffff, opacity = 0.5, additive = false, fog = true }) {
  const mat = new THREE.MeshBasicMaterial({
    map: puffTexture(), color, transparent: true, opacity, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, fog,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  m.renderOrder = 3;
  return m;
}
