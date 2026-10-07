import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, makeNoise, canvas, texFromCanvas, rimMat } from './util.js';
import { rockify } from './rock.js';
import { buildSword } from './sword.js';

// Building blocks that mirror the look of the Bladebound hub (see the game
// screenshots): stacked-cone pines, faceted grey canyon walls, black lamp posts,
// cream houses, striped market stalls, sealed portal gates and the sword monument.

const shadowAll = (g, cast = true, recv = true) => g.traverse((o) => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = recv; } });

// ---------- pine tree: stacked faceted cones ----------
export function pineTree(seed, { h = 12, layers = 4, color = 0x24503a, trunk = 0x4a3020, rim = {} } = {}) {
  const r = rng(seed);
  const g = new THREE.Group();
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, h * 0.3, 6), rimMat({ color: trunk, roughness: 0.9, flatShading: true }, rim));
  tr.position.y = h * 0.15;
  g.add(tr);
  const col = new THREE.Color(color).multiplyScalar(0.85 + r() * 0.3);
  const mat = rimMat({ color: col, roughness: 0.85, flatShading: true }, rim);
  for (let i = 0; i < layers; i++) {
    const t = i / layers;
    const rad = h * 0.32 * (1 - t * 0.72);
    const ch = h * 0.36;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, ch, 7, 2), mat);
    cone.position.y = h * 0.2 + i * h * (0.62 / layers) + ch / 2;
    cone.rotation.y = r() * Math.PI;
    g.add(cone);
  }
  shadowAll(g);
  return g;
}

// ---------- canyon wall: a ring of faceted grey rock ----------
export function cliffRing(seed, { radius = 90, height = 34, arc = [0, Math.PI * 2], segs = 72, color = 0x8b8e99, thickness = 18, rim = {} } = {}) {
  const nz = makeNoise(seed);
  const rows = 6;
  const pos = [], cols = [];
  const ptsAt = (i, j) => {
    const a = arc[0] + (arc[1] - arc[0]) * (i / segs);
    const t = j / rows;
    const n = nz.fbm2(Math.cos(a) * 3 + 7, Math.sin(a) * 3 + t * 2, 4);
    const top = height * (0.6 + 0.8 * nz.fbm2(a * 2.2 + 3, 1.7, 3));
    const y = t * top;
    // wall leans back with height, with bulging strata
    const rr = radius + (n - 0.5) * thickness * 1.6 + t * t * thickness * 0.8 + Math.sin(t * 9 + a * 5) * 1.5;
    return new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr);
  };
  const base = new THREE.Color(color);
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < rows; j++) {
      const a = ptsAt(i, j), b = ptsAt(i + 1, j), c = ptsAt(i, j + 1), d = ptsAt(i + 1, j + 1);
      for (const tri of [[a, c, b], [b, c, d]]) {
        const k = 0.75 + 0.5 * nz.n2(i * 0.7 + tri[0].y * 0.1, j * 1.3);
        const shade = base.clone().multiplyScalar(k * (0.75 + 0.25 * (j / rows)));
        for (const p of tri) { pos.push(p.x, p.y, p.z); cols.push(shade.r, shade.g, shade.b); }
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, rimMat({ vertexColors: true, roughness: 0.95, flatShading: true, side: THREE.DoubleSide }, rim));
  m.receiveShadow = true;
  return m;
}

// faceted grey boulder / outcrop
export function rockChunk(seed, w, h, d, { color = 0x8b8e99, rim = {} } = {}) {
  const geo = rockify(new THREE.BoxGeometry(w, h, d, 3, 3, 3), { amp: Math.min(w, h, d) * 0.35, freq: 1.4 / Math.max(w, h, d), seed, uvScale: 0.1 });
  const m = new THREE.Mesh(geo, rimMat({ color, roughness: 0.95, flatShading: true }, rim));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// ---------- lamp post with a glowing square lantern ----------
export function lampPost({ h = 5.4, lit = true, glow = 0xffd98a, intensity = 3.0, rim = {} } = {}) {
  const g = new THREE.Group();
  const black = rimMat({ color: 0x15151a, roughness: 0.5, metalness: 0.6 }, rim);
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.24, h, 0.24), black); pole.position.y = h / 2; g.add(pole);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.55), black); foot.position.y = 0.15; g.add(foot);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.9), black); plate.position.y = h; g.add(plate);
  const lantMat = lit
    ? new THREE.MeshBasicMaterial({ color: new THREE.Color(glow).multiplyScalar(intensity) })
    : rimMat({ color: 0xfff1c4, roughness: 0.4 }, rim);
  const lant = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.95, 0.75), lantMat); lant.position.y = h + 0.53; g.add(lant);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.6, 4), black); cap.position.y = h + 1.3; cap.rotation.y = Math.PI / 4; g.add(cap);
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), black); tip.position.y = h + 1.7; g.add(tip);
  shadowAll(g);
  lant.castShadow = false;
  g.userData.light = new THREE.Vector3(0, h + 0.53, 0);
  return g;
}

// ---------- house: cream walls, dark roof, warm windows ----------
export function house(seed, { w = 7, d = 6, h = 4, wall = 0xe6dccb, roof = 0x3c2a3e, lit = true, rim = {} } = {}) {
  const r = rng(seed);
  const g = new THREE.Group();
  const wm = rimMat({ color: wall, roughness: 0.9 }, rim);
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wm); body.position.y = h / 2; g.add(body);
  const shape = new THREE.Shape();
  const oh = 0.7;
  shape.moveTo(-w / 2 - oh, 0); shape.lineTo(w / 2 + oh, 0); shape.lineTo(0, h * 0.75); shape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: d + oh * 2, bevelEnabled: false });
  const rf = new THREE.Mesh(roofGeo, rimMat({ color: roof, roughness: 0.75, flatShading: true }, rim));
  rf.position.set(0, h, -d / 2 - oh); g.add(rf);
  const winMat = lit ? new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc46a).multiplyScalar(2.2) }) : rimMat({ color: 0x9fc4e0, roughness: 0.2 }, rim);
  const frame = rimMat({ color: 0x5a3a28, roughness: 0.8 }, rim);
  const nWin = Math.max(1, Math.floor(w / 3));
  for (let i = 0; i < nWin; i++) {
    const x = -w / 2 + (i + 0.5) * (w / nWin);
    if (Math.abs(x) < 0.9 && nWin > 1) continue;
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.12), winMat); win.position.set(x, h * 0.55, d / 2 + 0.03); g.add(win);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.15, 0.2), frame); fr.position.set(x, h * 0.55 - 0.62, d / 2 + 0.05); g.add(fr);
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.14), frame); door.position.set(r() < 0.5 ? -0.3 : 0.3, 1.1, d / 2 + 0.04); g.add(door);
  shadowAll(g);
  return g;
}

// ---------- market stall with a red/white striped awning ----------
function stripeTexture(a = '#9a1f2a', b = '#f2ece2') {
  const [c, ctx] = canvas(256, 64);
  for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? b : a; ctx.fillRect(i * 32, 0, 32, 64); }
  return texFromCanvas(c);
}
export function marketStall({ rim = {} } = {}) {
  const g = new THREE.Group();
  const wood = rimMat({ color: 0x6a4026, roughness: 0.85 }, rim);
  for (const [x, z] of [[-2, -1.2], [2, -1.2], [-2, 1.2], [2, 1.2]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.4, 0.22), wood); p.position.set(x, 1.7, z); g.add(p);
  }
  const counter = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 1.1), wood); counter.position.set(0, 0.55, 1.0); g.add(counter);
  const awn = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.08, 3.2), rimMat({ map: stripeTexture(), roughness: 0.9 }, rim));
  awn.position.set(0, 3.5, 0.1); awn.rotation.x = 0.22; g.add(awn);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.6), rimMat({ color: 0x7c8494, roughness: 0.6 }, rim)); stand.position.set(0.6, 1.4, 0.9); g.add(stand);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), new THREE.MeshStandardMaterial({ color: 0x3a3f66, emissive: 0x6a7cff, emissiveIntensity: 0.8, roughness: 0.1 }));
  orb.position.set(0.6, 1.95, 0.9); g.add(orb);
  shadowAll(g);
  return g;
}

// ---------- sealed world gate: stone frame with a glowing slatted panel ----------
function sealedPanelTexture(color, label) {
  const [c, ctx] = canvas(256, 360);
  const col = new THREE.Color(color);
  const css = (k) => `rgb(${Math.round(Math.min(1, col.r * k) * 255)},${Math.round(Math.min(1, col.g * k) * 255)},${Math.round(Math.min(1, col.b * k) * 255)})`;
  ctx.fillStyle = css(1); ctx.fillRect(0, 0, 256, 360);
  for (let i = 0; i < 7; i++) { ctx.fillStyle = css(0.55); ctx.fillRect(0, 22 + i * 50, 256, 12); }
  ctx.fillStyle = 'rgba(20,16,30,0.82)'; ctx.fillRect(26, 150, 204, 62);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 40px CinzelBB, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('SEALED', 128, 182);
  if (label) { ctx.font = 'bold 30px CinzelBB, serif'; ctx.fillStyle = 'rgba(20,16,30,0.9)'; ctx.fillText(label, 128, 112); }
  return texFromCanvas(c);
}
export function portalGate(seed, { color = 0x8a5cff, label = '', glow = 1.6, rim = {} } = {}) {
  const g = new THREE.Group();
  const stone = rimMat({ color: 0x5c5f6c, roughness: 0.9, flatShading: true }, rim);
  const add = (geo, x, y, z) => { const m = new THREE.Mesh(geo, stone); m.position.set(x, y, z); g.add(m); return m; };
  add(new RoundedBoxGeometry(0.75, 5.6, 0.95, 2, 0.08), -1.95, 2.8, 0);
  add(new RoundedBoxGeometry(0.75, 5.6, 0.95, 2, 0.08), 1.95, 2.8, 0);
  add(new RoundedBoxGeometry(4.9, 0.75, 1.05, 2, 0.08), 0, 5.8, 0);
  add(new RoundedBoxGeometry(4.6, 0.4, 1.1, 2, 0.08), 0, 0.2, 0);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(3.15, 4.85), new THREE.MeshBasicMaterial({ map: sealedPanelTexture(color, label), color: new THREE.Color(1, 1, 1).multiplyScalar(glow) }));
  panel.position.set(0, 2.83, 0.02);
  g.add(panel);
  const back = panel.clone(); back.rotation.y = Math.PI; back.position.z = -0.02; g.add(back);
  shadowAll(g);
  panel.castShadow = false;
  g.userData = { center: new THREE.Vector3(0, 2.8, 0.3), color };
  return g;
}

// ---------- round ice portal with a swirling core ----------
export function ringPortal({ radius = 2.6, rim = {} } = {}) {
  const g = new THREE.Group();
  const ice = rimMat({ color: 0xcfeeff, emissive: 0x3aa8e0, emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.1, flatShading: true }, rim);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.42, 6, 40), ice);
  ring.position.y = radius + 0.5;
  g.add(ring);
  const stud = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xeaffff).multiplyScalar(2.5) });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), stud);
    s.position.set(Math.cos(a) * (radius - 0.12), radius + 0.5 + Math.sin(a) * (radius - 0.12), 0.38);
    s.rotation.z = a;
    g.add(s);
  }
  const swirl = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColA: { value: new THREE.Color(1.6, 2.2, 2.4) }, uColB: { value: new THREE.Color(0.1, 0.8, 1.4) }, uColC: { value: new THREE.Color(0.35, 0.15, 1.1) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      varying vec2 vUv; uniform vec3 uColA, uColB, uColC;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;
        float a = atan(p.y, p.x);
        float sw = a + r * 5.5;
        float n = noise(vec2(sw * 2.2, r * 6.0)) * 0.6 + noise(vec2(sw * 5.0, r * 14.0)) * 0.4;
        vec3 col = mix(uColA, uColB, smoothstep(0.0, 0.75, r));
        col = mix(col, uColC, smoothstep(0.55, 1.0, r) * n);
        float bands = smoothstep(0.35, 0.95, n);
        float alpha = (0.55 + 0.45 * bands) * smoothstep(1.0, 0.86, r);
        col *= 0.55 + 0.75 * bands + 0.8 * smoothstep(0.45, 0.0, r);
        gl_FragColor = vec4(col * alpha, 1.0);
      }`,
  });
  const core = new THREE.Mesh(new THREE.CircleGeometry(radius - 0.25, 64), swirl);
  core.position.y = radius + 0.5;
  core.renderOrder = 8;
  g.add(core);
  const stoneM = rimMat({ color: 0x8a8d98, roughness: 0.9, flatShading: true }, rim);
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(new RoundedBoxGeometry(1.4, 1.0, 1.4, 2, 0.12), stoneM);
    b.position.set(s * 1.1, 0.5, 0); b.rotation.y = s * 0.2;
    g.add(b);
  }
  shadowAll(g);
  core.castShadow = false;
  g.userData = { center: new THREE.Vector3(0, radius + 0.5, 0) };
  return g;
}

// ---------- the giant sword monument at the heart of the hub ----------
export function swordMonument(seed, { rim = {}, glow = 0x7fe6ff } = {}) {
  const r = rng(seed);
  const g = new THREE.Group();
  const stone = rimMat({ color: 0xb8bfcc, roughness: 0.8, flatShading: true }, rim);
  const t1 = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.6, 0.8, 40), stone); t1.position.y = 0.4; g.add(t1);
  const t2 = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5.6, 0.6, 40), stone); t2.position.y = 1.1; g.add(t2);
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(4.9, 4.9, 0.1, 40), new THREE.MeshStandardMaterial({ color: 0x6fcfe8, emissive: 0x3fb8e0, emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.2 }));
  pool.position.y = 1.42; g.add(pool);
  // ice crystal cluster holding the blade
  const iceMat = rimMat({ color: 0xbfe9ff, emissive: 0x2a9fd0, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.1, flatShading: true }, rim);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + r() * 0.4;
    const rad = 0.6 + r() * 1.4;
    const s = 0.9 + r() * 1.2;
    const geo = rockify(new THREE.IcosahedronGeometry(s, 0), { amp: s * 0.3, freq: 1.2, seed: seed * 50 + i, uvScale: 0.3 });
    const c = new THREE.Mesh(geo, iceMat);
    c.position.set(Math.cos(a) * rad, 1.6 + s * 0.45, Math.sin(a) * rad);
    c.scale.set(1, 1.3 + r() * 0.8, 1);
    c.rotation.set(r(), r() * 6, r());
    g.add(c);
  }
  // the giant sword, blade down into the crystals
  const sword = buildSword({ length: 15, width: 1.7, style: 'straight', blade: 0xc8d4e4, metalness: 0.95, roughness: 0.18, glow, glowIntensity: 1.1, edgeLit: true, shell: 0.12, guard: 0x3c3f4a, guardWidth: 5.2, grip: 0x2c2f38, gripLength: 3.0, gem: 0x7fe6ff, rim });
  sword.scale.setScalar(1);
  sword.rotation.z = Math.PI;
  sword.position.y = 2.2 + 15;
  g.add(sword);
  // floating halo around the blade
  const haloMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(glow).multiplyScalar(2.6) });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.08, 6, 64), haloMat);
  halo.rotation.x = Math.PI / 2; halo.position.y = 10.5;
  g.add(halo);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), haloMat);
    m.position.set(Math.cos(a) * 2.5, 10.5, Math.sin(a) * 2.5); m.rotation.set(0.6, a, 0.6);
    g.add(m);
  }
  shadowAll(g);
  halo.castShadow = false;
  g.userData = { bladeTop: new THREE.Vector3(0, 17.2, 0), bladeMid: new THREE.Vector3(0, 9.5, 0), haloY: 10.5, sword };
  return g;
}

// ---------- banner on a pole ----------
function bannerTex(color, trim) {
  const [c, ctx] = canvas(128, 320);
  ctx.fillStyle = color; ctx.fillRect(0, 0, 128, 320);
  ctx.strokeStyle = trim; ctx.lineWidth = 8; ctx.strokeRect(8, 6, 112, 300);
  ctx.fillStyle = trim;
  ctx.beginPath(); ctx.moveTo(64, 70); ctx.lineTo(72, 200); ctx.lineTo(64, 230); ctx.lineTo(56, 200); ctx.closePath(); ctx.fill();
  ctx.fillRect(40, 92, 48, 8);
  return texFromCanvas(c);
}
export function bannerPole({ color = '#1d2a66', trim = '#d8b450', h = 6.5, rim = {} } = {}) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, h, 6), rimMat({ color: 0x2a2a30, metalness: 0.6, roughness: 0.4 }, rim));
  pole.position.y = h / 2; g.add(pole);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6), pole.material); bar.rotation.z = Math.PI / 2; bar.position.set(0.55, h - 0.25, 0); g.add(bar);
  const geo = new THREE.PlaneGeometry(1.15, 2.9, 4, 10);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = 0.5 - p.getY(i) / 2.9; p.setZ(i, 0.12 * Math.sin(p.getX(i) * 3 + v * 4) * v); }
  geo.computeVertexNormals();
  const ban = new THREE.Mesh(geo, rimMat({ map: bannerTex(color, trim), side: THREE.DoubleSide, roughness: 0.9 }, rim));
  ban.position.set(0.6, h - 0.3 - 1.45, 0);
  g.add(ban);
  shadowAll(g);
  return g;
}

// ---------- ritual circle stones, dolmen gate, candles ----------
export function standingStone(seed, { w = 1.3, h = 6, d = 0.9, color = 0x474c5a, rim = {} } = {}) {
  const geo = rockify(new THREE.BoxGeometry(w, h, d, 2, 4, 2), { amp: 0.18, freq: 0.6, seed, uvScale: 0.2 });
  const m = new THREE.Mesh(geo, rimMat({ color, roughness: 0.9, flatShading: true }, rim));
  m.position.y = h / 2 - 0.2;
  m.castShadow = true; m.receiveShadow = true;
  const g = new THREE.Group(); g.add(m);
  return g;
}
export function dolmen(seed, { rim = {}, light = 0xffd25a } = {}) {
  const g = new THREE.Group();
  const stone = rimMat({ color: 0x9a9ca6, roughness: 0.9, flatShading: true }, rim);
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(rockify(new THREE.BoxGeometry(1.4, 6.4, 1.4, 2, 4, 2), { amp: 0.15, freq: 0.6, seed: seed + s, uvScale: 0.2 }), stone);
    p.position.set(s * 2.3, 3.2, 0); g.add(p);
  }
  const lintel = new THREE.Mesh(rockify(new THREE.BoxGeometry(6.4, 1.1, 1.6, 4, 2, 2), { amp: 0.15, freq: 0.6, seed: seed + 9, uvScale: 0.2 }), stone);
  lintel.position.y = 6.9; g.add(lintel);
  const cube = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), new THREE.MeshBasicMaterial({ color: new THREE.Color(light).multiplyScalar(4) }));
  cube.position.set(0, 5.6, 0); g.add(cube);
  shadowAll(g);
  cube.castShadow = false;
  g.userData.light = cube.position.clone();
  return g;
}
export function candle({ h = 0.5 } = {}) {
  const g = new THREE.Group();
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, h, 8), new THREE.MeshStandardMaterial({ color: 0xf2e6c8, roughness: 0.6, emissive: 0x402008, emissiveIntensity: 0.4 }));
  c.position.y = h / 2; g.add(c);
  g.userData.flame = new THREE.Vector3(0, h + 0.02, 0);
  return g;
}

// ---------- ground textures ----------
export function grassTexture(seed = 3, { a = [64, 120, 40], b = [110, 160, 52] } = {}) {
  const nz = makeNoise(seed);
  const S = 512;
  const [c, ctx] = canvas(S, S);
  const im = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const t = nz.fbm2(x / S * 6, y / S * 6, 5);
    const f = nz.n2(x * 0.7, y * 0.7);
    const k = Math.min(1, Math.max(0, t * 1.2 - 0.1));
    const i = (y * S + x) * 4;
    for (let j = 0; j < 3; j++) im.data[i + j] = (a[j] + (b[j] - a[j]) * k) * (0.8 + 0.3 * f) * (t < 0.3 ? 0.85 : 1);
    im.data[i + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
  const t = texFromCanvas(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function cobbleTexture(seed = 5, { base = [196, 190, 176], mortar = [120, 116, 108], cells = 90 } = {}) {
  const r = rng(seed);
  const nz = makeNoise(seed + 1);
  const S = 512;
  const pts = Array.from({ length: cells }, () => [r(), r(), 0.85 + r() * 0.3]);
  const [c, ctx] = canvas(S, S);
  const im = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S;
    let f1 = 9, f2 = 9, k1 = 1;
    for (const [px, py, k] of pts) {
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
        const d = Math.hypot(u - px - ox, v - py - oy);
        if (d < f1) { f2 = f1; f1 = d; k1 = k; } else if (d < f2) f2 = d;
      }
    }
    const edge = f2 - f1;
    const m = THREE.MathUtils.smoothstep(edge, 0.004, 0.018);
    const shade = (0.82 + 0.25 * nz.fbm2(u * 30, v * 30, 3)) * k1 * (0.9 + 0.1 * Math.min(1, edge * 30));
    const i = (y * S + x) * 4;
    for (let j = 0; j < 3; j++) im.data[i + j] = mortar[j] + (base[j] * shade - mortar[j]) * m;
    im.data[i + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
  const t = texFromCanvas(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ---------- instanced grass blades ----------
export function grassField(seed, { count = 20000, place, h = [0.6, 1.4], colA = 0x6a9a2a, colB = 0xb8c84a, bend = new THREE.Vector2(0.25, 0.1), width = 0.09, rim = {} }) {
  const r = rng(seed);
  // tapered, bent blade: 4 segments along +Y
  const geo = new THREE.PlaneGeometry(width, 1, 1, 4);
  geo.translate(0, 0.5, 0);
  const p = geo.attributes.position;
  const colors = [];
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    p.setX(i, p.getX(i) * (1 - y * 0.92));
    p.setZ(i, y * y * 0.35);
    const k = 0.35 + 0.65 * y;
    colors.push(k, k, k);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = rimMat({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.75 }, rim);
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), t = new THREE.Vector3();
  const cA = new THREE.Color(colA), cB = new THREE.Color(colB), c = new THREE.Color();
  let n = 0;
  for (let i = 0; i < count * 4 && n < count; i++) {
    const pos = place(r);
    if (!pos) continue;
    const hh = h[0] + (h[1] - h[0]) * r();
    e.set(bend.y + (r() - 0.5) * 0.5, r() * Math.PI * 2, bend.x + (r() - 0.5) * 0.4);
    q.setFromEuler(e);
    s.set(1 + r() * 0.6, hh, 1);
    t.copy(pos);
    m4.compose(t, q, s);
    mesh.setMatrixAt(n, m4);
    c.copy(cA).lerp(cB, r() ** 1.3).multiplyScalar(0.8 + r() * 0.35);
    mesh.setColorAt(n, c);
    n++;
  }
  mesh.count = n;
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}
