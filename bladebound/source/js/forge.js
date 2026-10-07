import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, makeNoise, canvas, texFromCanvas, rimMat } from './util.js';
import { buildSword } from './sword.js';

// Props for the Blade Smith: brick-and-timber shop, sign, furnace, anvil, weapon rack.

export function brickTexture(seed = 2, { brick = [150, 58, 44], mortar = [92, 78, 70], rows = 16, cols = 6 } = {}) {
  const r = rng(seed);
  const nz = makeNoise(seed);
  const S = 512;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = `rgb(${mortar.join(',')})`; ctx.fillRect(0, 0, S, S);
  const bh = S / rows, bw = S / cols;
  for (let y = 0; y < rows; y++) {
    for (let x = -1; x < cols + 1; x++) {
      const ox = (y % 2) * bw / 2;
      const k = 0.75 + r() * 0.4;
      ctx.fillStyle = `rgb(${brick.map((v) => Math.round(v * k)).join(',')})`;
      ctx.fillRect(x * bw + ox + 3, y * bh + 3, bw - 6, bh - 6);
    }
  }
  const im = ctx.getImageData(0, 0, S, S);
  for (let i = 0; i < S * S; i++) {
    const n = 0.85 + 0.3 * nz.n2((i % S) * 0.08, Math.floor(i / S) * 0.08);
    for (let j = 0; j < 3; j++) im.data[i * 4 + j] *= n;
  }
  ctx.putImageData(im, 0, 0);
  const t = texFromCanvas(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function plankTexture(seed = 4, { wood = [110, 46, 36], dark = 0.55 } = {}) {
  const r = rng(seed);
  const nz = makeNoise(seed);
  const S = 512;
  const [c, ctx] = canvas(S, S);
  const im = ctx.createImageData(S, S);
  const n = 8;
  const tone = Array.from({ length: n }, () => 0.8 + r() * 0.35);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const p = Math.floor(x / (S / n));
    const grain = 0.85 + 0.25 * nz.fbm2(x * 0.02, y * 0.003 + p * 7, 3);
    const seam = (x % (S / n)) < 3 ? dark : 1;
    const i = (y * S + x) * 4;
    for (let j = 0; j < 3; j++) im.data[i + j] = wood[j] * tone[p] * grain * seam;
    im.data[i + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
  const t = texFromCanvas(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function signTexture() {
  const [c, ctx] = canvas(1024, 384);
  // weathered wooden board
  const g = ctx.createLinearGradient(0, 0, 0, 384);
  g.addColorStop(0, '#6a4024'); g.addColorStop(1, '#4a2a16');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 384);
  for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, i * 96, 1024, 4); }
  ctx.strokeStyle = '#2a160a'; ctx.lineWidth = 14; ctx.strokeRect(7, 7, 1010, 370);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 118px CinzelBB, serif';
  ctx.fillStyle = '#2a1408'; ctx.fillText('BLADE SMITH', 516, 136);
  ctx.fillStyle = '#ffd36a'; ctx.fillText('BLADE SMITH', 512, 130);
  ctx.font = '700 66px CinzelBB, serif';
  ctx.fillStyle = '#f4ead8'; ctx.fillText('Forge  ·  Upgrade', 512, 268);
  for (const x of [70, 954]) { ctx.fillStyle = '#c8a050'; ctx.beginPath(); ctx.arc(x, 192, 12, 0, Math.PI * 2); ctx.fill(); }
  return texFromCanvas(c);
}

// Open-front shop: brick back wall and pillars, timber posts, red plank roof, hanging sign.
export function forgeShop({ w = 13, d = 7, h = 7.4, signX = 3.6, rim = {} } = {}) {
  const g = new THREE.Group();
  const brick = brickTexture(2); brick.repeat.set(3, 1.6);
  const brickM = rimMat({ map: brick, roughness: 0.9 }, rim);
  const wood = rimMat({ color: 0x5a3420, roughness: 0.8 }, rim);
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, h + 0.5, 0.8), brickM); back.position.set(0, (h + 0.5) / 2, -d / 2); g.add(back);
  const brick2 = brickTexture(5); brick2.repeat.set(0.6, 2.2);
  const pillarM = rimMat({ map: brick2, roughness: 0.9 }, rim);
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, h, d * 0.55), pillarM); leftWall.position.set(-w / 2 + 0.4, h / 2, -d / 2 + d * 0.27); g.add(leftWall);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new RoundedBoxGeometry(0.55, h, 0.55, 2, 0.06), wood); post.position.set(s * (w / 2 - 0.5), h / 2, d / 2 - 0.4); g.add(post);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.55, 0.55), wood); beam.position.set(0, h, d / 2 - 0.4); g.add(beam);
  // roof: tilted plank slab, overhanging the front
  const planks = plankTexture(4); planks.repeat.set(3, 1);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 2.2, 0.35, d + 2.6), rimMat({ map: planks, roughness: 0.75 }, rim));
  roof.position.set(0, h + 1.15, 0.2); roof.rotation.x = -0.24; g.add(roof);
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(w + 2.3, 0.45, 0.25), rimMat({ color: 0x3a1410, roughness: 0.7 }, rim));
  fascia.position.set(0, h + 0.62, d / 2 + 1.2); fascia.rotation.x = -0.24; g.add(fascia);
  // hanging sign
  const sign = new THREE.Group();
  sign.position.set(signX, h - 0.25, d / 2 - 0.1);
  const signTex = signTexture();
  const board = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.75, 0.16), [wood, wood, wood, wood, rimMat({ map: signTex, emissiveMap: signTex, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.7 }, rim), wood]);
  board.position.y = -1.25; sign.add(board);
  for (const s of [-1, 1]) {
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 6), rimMat({ color: 0x2a2a2e, metalness: 0.9, roughness: 0.4 }, rim));
    chain.position.set(s * 1.9, -0.2, 0); sign.add(chain);
  }
  sign.rotation.x = 0.06;
  g.add(sign);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// Brick furnace with a glowing mouth and chimney.
export function furnace({ rim = {} } = {}) {
  const g = new THREE.Group();
  const brick = brickTexture(7, { brick: [120, 50, 40] }); brick.repeat.set(1, 1);
  const m = rimMat({ map: brick, roughness: 0.9 }, rim);
  const body = new THREE.Mesh(new RoundedBoxGeometry(3.2, 3.0, 2.6, 2, 0.15), m); body.position.y = 1.5; g.add(body);
  const chim = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5, 1.2), m); chim.position.set(0, 5, -0.4); g.add(chim);
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff5a10).multiplyScalar(1.6) }));
  mouth.position.set(0, 1.25, 1.31); g.add(mouth);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.12, 6, 16, Math.PI), rimMat({ color: 0x2a1a14, roughness: 0.8 }, rim));
  arch.position.set(0, 1.82, 1.33); g.add(arch);
  g.traverse((o) => { if (o.isMesh && o !== mouth) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.mouth = new THREE.Vector3(0, 1.3, 1.5);
  return g;
}

// Blacksmith's anvil on a stump.
export function anvil({ rim = {} } = {}) {
  const g = new THREE.Group();
  const iron = rimMat({ color: 0x2c2d33, metalness: 0.85, roughness: 0.35 }, rim);
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 1.2, 10), rimMat({ color: 0x5a3a24, roughness: 0.9 }, rim)); stump.position.y = 0.6; g.add(stump);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.8), iron); foot.position.y = 1.35; g.add(foot);
  const waist = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.5), iron); waist.position.y = 1.72; g.add(waist);
  const face = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.42, 0.7), iron); face.position.y = 2.15; g.add(face);
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.0, 8), iron); horn.rotation.z = -Math.PI / 2; horn.position.set(1.45, 2.2, 0); horn.scale.set(1, 1, 0.8); g.add(horn);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.top = new THREE.Vector3(0, 2.36, 0);
  return g;
}

// Rack with swords of every rarity, each glowing in its colour.
export function weaponRack({ rim = {}, colors = [0x4aa8ff, 0xa040ff, 0xffb020, 0x40ff9a] } = {}) {
  const g = new THREE.Group();
  const wood = rimMat({ color: 0x5a3822, roughness: 0.85 }, rim);
  const base = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.35, 0.9), wood); base.position.y = 0.6; g.add(base);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.2, 0.3), wood); rail.position.y = 2.6; g.add(rail);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.2, 0.25), wood); p.position.set(s * 2.2, 1.6, 0); g.add(p); }
  const swords = [];
  colors.forEach((c, i) => {
    const sw = buildSword({ length: 2.4, width: 0.32, style: i === 3 ? 'flame' : i === 1 ? 'crystal' : 'straight', blade: 0x9aa4b8, glow: c, glowIntensity: 0.9, edgeLit: true, shell: 0.2, guard: 0x2a2730, guardWidth: 0.9, gripLength: 0.6, gem: c, rim });
    sw.position.set(-1.65 + i * 1.1, 1.55, 0.1);
    g.add(sw);
    swords.push({ sword: sw, color: c });
  });
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.swords = swords;
  return g;
}

// Tongs: two thin iron bars from the hand toward the work piece.
export function tongs({ length = 1.6 } = {}) {
  const g = new THREE.Group();
  const iron = new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.85, roughness: 0.4 });
  for (const s of [-1, 1]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, length, 0.06), iron);
    bar.position.set(s * 0.06, length / 2, 0); bar.rotation.z = s * 0.04;
    g.add(bar);
  }
  return g;
}
