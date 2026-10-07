import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeNoise, canvas, texFromCanvas, rng } from './util.js';

// Turn any geometry into hewn rock: noise-displace along smooth normals, then
// flat-shade and give it world-aligned box-projected UVs (no texture stretching).
export function rockify(geo, { amp = 1, freq = 0.1, seed = 1, uvScale = 0.02, chunky = 0 } = {}) {
  const nz = makeNoise(seed);
  let g = geo.clone();
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-4);
  g.computeVertexNormals();
  const pos = g.attributes.position, nor = g.attributes.normal;
  const p = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i); n.fromBufferAttribute(nor, i);
    let d = nz.fbm3(p.x * freq + 11.3, p.y * freq + 5.1, p.z * freq + 2.7, 4) - 0.5;
    if (chunky) d = Math.round(d * chunky) / chunky;
    p.addScaledVector(n, d * amp);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  g = g.toNonIndexed();
  g.computeVertexNormals();
  boxUV(g, uvScale);
  return g;
}

export function boxUV(g, scale) {
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    n.subVectors(c, b).cross(a.clone().sub(b)).normalize();
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    for (let k = 0; k < 3; k++) {
      const v = [a, b, c][k];
      let u, w;
      if (ax >= ay && ax >= az) { u = v.z; w = v.y; } else if (ay >= az) { u = v.x; w = v.z; } else { u = v.x; w = v.y; }
      uv[(i + k) * 2] = u * scale; uv[(i + k) * 2 + 1] = w * scale;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// Lava-crack textures (Voronoi cell edges): returns { map, emissiveMap }
export function lavaTextures(seed = 3, { size = 512, cells = 26, crackWidth = 0.022, coverage = 0.62, rockA = [38, 34, 40], rockB = [18, 16, 22] } = {}) {
  const r = rng(seed);
  const nz = makeNoise(seed + 17);
  const pts = [];
  for (let i = 0; i < cells; i++) pts.push([r(), r()]);
  const [cm, cmx] = canvas(size, size);
  const [ce, cex] = canvas(size, size);
  const im = cmx.createImageData(size, size), ie = cex.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      // jitter lookup for organic crack lines
      const ju = u + (nz.fbm2(u * 9, v * 9, 3) - 0.5) * 0.05;
      const jv = v + (nz.fbm2(u * 9 + 7, v * 9 + 3, 3) - 0.5) * 0.05;
      let f1 = 9, f2 = 9;
      for (const [px, py] of pts) {
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
          const dx = ju - (px + ox), dy = jv - (py + oy);
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
        }
      }
      const edge = f2 - f1;
      const active = THREE.MathUtils.smoothstep(nz.fbm2(u * 3 + 1, v * 3 + 2, 3), 1 - coverage - 0.08, 1 - coverage + 0.08);
      const w = crackWidth * (0.6 + 0.8 * nz.n2(u * 14, v * 14));
      const core = Math.max(0, 1 - edge / (w * 0.45)) * active;
      const halo = Math.max(0, 1 - edge / (w * 1.5)) ** 2 * active;
      const i = (y * size + x) * 4;
      const grain = nz.fbm2(u * 40, v * 40, 3);
      const t = nz.fbm2(u * 6, v * 6, 4);
      for (let k = 0; k < 3; k++) im.data[i + k] = (rockA[k] * t + rockB[k] * (1 - t)) * (0.75 + 0.5 * grain) + halo * [40, 8, 4][k];
      im.data[i + 3] = 255;
      const hot = core * core;
      ie.data[i] = Math.min(255, 255 * (halo * 0.35 + core));
      ie.data[i + 1] = Math.min(255, 255 * (halo * 0.05 + hot * 0.55));
      ie.data[i + 2] = Math.min(255, 255 * (hot * 0.18));
      ie.data[i + 3] = 255;
    }
  }
  cmx.putImageData(im, 0, 0); cex.putImageData(ie, 0, 0);
  const map = texFromCanvas(cm, { repeat: [1, 1] });
  const emissiveMap = texFromCanvas(ce, { repeat: [1, 1] });
  return { map, emissiveMap };
}

// Generic stone texture (for near props): mottled with darker seams.
export function stoneTexture(seed = 9, { size = 512, base = [60, 62, 74], dark = [26, 26, 34], blocks = 0 } = {}) {
  const nz = makeNoise(seed);
  const [c, ctx] = canvas(size, size);
  const im = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const t = nz.fbm2(u * 5, v * 5, 5);
      const g = nz.fbm2(u * 32, v * 32, 3);
      let k = 0.55 + 0.6 * t * (0.7 + 0.3 * g);
      const crack = Math.abs(nz.fbm2(u * 7 + 3, v * 7 + 9, 4) - 0.5);
      if (crack < 0.012) k *= 0.55;
      if (blocks) {
        const bu = (u * blocks) % 1, bv = (v * blocks * 2 + (Math.floor(u * blocks) % 2) * 0.5) % 1;
        const e = Math.min(bu, 1 - bu, bv * 0.5, (1 - bv) * 0.5);
        if (e < 0.02) k *= 0.45;
      }
      const i = (y * size + x) * 4;
      for (let j = 0; j < 3; j++) im.data[i + j] = Math.min(255, dark[j] + (base[j] - dark[j]) * k);
      im.data[i + 3] = 255;
    }
  }
  ctx.putImageData(im, 0, 0);
  return texFromCanvas(c);
}
