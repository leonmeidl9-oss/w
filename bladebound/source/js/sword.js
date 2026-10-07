import * as THREE from 'three';
import { rng, canvas, texFromCanvas, rimMat } from './util.js';

// Generic sword for the game scenes. The blade points along +Y from the guard
// (y = 0); the grip hangs below, so a hand holding it sits around y = -0.45.
export function bladeShape(L, Wd, style = 'straight') {
  const s = new THREE.Shape();
  const h = Wd / 2;
  if (style === 'crystal') {
    s.moveTo(-h, 0); s.lineTo(h, 0);
    s.lineTo(h * 1.05, L * 0.12); s.lineTo(h * 1.45, L * 0.2); s.lineTo(h * 0.95, L * 0.25);
    s.lineTo(h * 1.0, L * 0.48); s.lineTo(h * 1.38, L * 0.56); s.lineTo(h * 0.88, L * 0.62);
    s.lineTo(h * 0.78, L * 0.82); s.lineTo(0, L);
    s.lineTo(-h * 0.7, L * 0.86); s.lineTo(-h * 1.25, L * 0.74); s.lineTo(-h * 0.9, L * 0.68);
    s.lineTo(-h * 1.0, L * 0.38); s.lineTo(-h * 1.42, L * 0.31); s.lineTo(-h * 0.98, L * 0.25);
    s.lineTo(-h * 1.02, L * 0.08);
  } else if (style === 'flame') {
    // wavy flamberge edge
    s.moveTo(-h, 0); s.lineTo(h, 0);
    const n = 7;
    for (let i = 1; i <= n; i++) s.lineTo(h * (i % 2 ? 1.25 : 0.85) * (1 - i / (n + 3)), L * 0.82 * i / n);
    s.lineTo(0, L);
    for (let i = n; i >= 1; i--) s.lineTo(-h * (i % 2 ? 0.85 : 1.25) * (1 - i / (n + 3)), L * 0.82 * i / n);
  } else {
    s.moveTo(-h, 0); s.lineTo(h, 0);
    s.lineTo(h * 0.92, L * 0.82); s.lineTo(0, L); s.lineTo(-h * 0.92, L * 0.82);
  }
  s.closePath();
  return s;
}

// Branching lightning veins for glowing blades (emissive map, v = 0 at the guard)
export function veinTexture(seed, { glow = 'rgba(160,60,255,0.85)', mid = 'rgba(215,160,255,1)', core = 'rgba(255,248,255,1)', base = 'rgba(110,30,190,0.5)' } = {}) {
  const W = 256, H = 1024;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, base); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, base);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [style, blur, wmul] of [[glow, 22, 2.6], [mid, 8, 1.1], [core, 0, 0.45]]) {
    const R = rng(seed);
    ctx.strokeStyle = style; ctx.shadowColor = style; ctx.shadowBlur = blur;
    const draw = (x, y, ang, len, width, depth) => {
      ctx.beginPath(); ctx.moveTo(x, y);
      let px = x, py = y;
      const n = Math.max(4, Math.floor(len / 18));
      for (let i = 0; i < n; i++) {
        const a = ang + (R() - 0.5) * 1.2;
        px += Math.cos(a) * len / n; py += Math.sin(a) * len / n;
        px = Math.max(10, Math.min(W - 10, px));
        ctx.lineTo(px, py);
        if (depth > 0 && R() < 0.3) {
          ctx.lineWidth = width * wmul; ctx.stroke();
          draw(px, py, ang + (R() < 0.5 ? -1 : 1) * (0.5 + R() * 0.7), len * 0.45, width * 0.6, depth - 1);
          ctx.beginPath(); ctx.moveTo(px, py);
        }
      }
      ctx.lineWidth = width * wmul; ctx.stroke();
    };
    draw(W * 0.5, H * 0.98, -Math.PI / 2, H * 0.97, 7, 3);
    draw(W * 0.35, H * 0.75, -Math.PI / 2 - 0.15, H * 0.5, 4, 2);
    draw(W * 0.65, H * 0.55, -Math.PI / 2 + 0.15, H * 0.45, 4, 2);
  }
  const t = texFromCanvas(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// Edge-lit blade: bright cutting edges and a glowing fuller line down the middle.
export function edgeGlowTexture() {
  const [c, ctx] = canvas(256, 16);
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  const stops = [[0.0, 1.0], [0.1, 0.9], [0.2, 0.25], [0.42, 0.18], [0.47, 0.75], [0.5, 1.0], [0.53, 0.75], [0.58, 0.18], [0.8, 0.25], [0.9, 0.9], [1.0, 1.0]];
  for (const [o, v] of stops) { const k = Math.round(v * 255); g.addColorStop(o, `rgb(${k},${k},${k})`); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 16);
  const t = texFromCanvas(c, { srgb: false });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function buildSword({
  length = 3.6, width = 0.42, style = 'straight',
  blade = 0xc4cad8, metalness = 0.9, roughness = 0.22,
  glow = null, glowIntensity = 1.4, veins = null, shell = 0.22,
  guard = 0x34303e, guardWidth = 1.2, gem = null, grip = 0x2a1d18, gripLength = 0.9,
  rim = {}, edgeLit = false,
} = {}) {
  const g = new THREE.Group();
  const bladeOpts = { color: blade, metalness, roughness };
  if (veins) {
    const tex = veinTexture(veins.seed ?? 1, veins.colors ?? {});
    // shape UVs are in shape units: map x in [-w, w] and y in [0, L] onto the texture
    tex.repeat.set(1 / (width * 1.6), 1 / (length + 0.1));
    tex.offset.set(0.5, 0);
    Object.assign(bladeOpts, { emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: glowIntensity });
  } else if (glow !== null) {
    Object.assign(bladeOpts, { emissive: glow, emissiveIntensity: glowIntensity });
    if (edgeLit) {
      const tex = edgeGlowTexture();
      tex.repeat.set(1 / (width * 1.02), 1);
      tex.offset.set(0.5, 0);
      bladeOpts.emissiveMap = tex;
    }
  }
  const bladeMat = new THREE.MeshStandardMaterial(bladeOpts);
  const bg = new THREE.ExtrudeGeometry(bladeShape(length, width, style), { depth: 0.03, bevelEnabled: true, bevelThickness: width * 0.11, bevelSize: width * 0.14, bevelSegments: 1 });
  bg.translate(0, 0, -0.015);
  const b = new THREE.Mesh(bg, bladeMat);
  b.castShadow = true;
  g.add(b);
  if (glow !== null && shell > 0) {
    const sg = new THREE.ShapeGeometry(bladeShape(length * 1.05, width * 1.9, style));
    const sm = new THREE.MeshBasicMaterial({ color: new THREE.Color(glow).multiplyScalar(0.6), transparent: true, opacity: shell, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const sh = new THREE.Mesh(sg, sm);
    sh.position.z = 0.05;
    sh.renderOrder = 9;
    g.add(sh);
  }
  const metal = rimMat({ color: guard, roughness: 0.3, metalness: 1.0 }, rim);
  // swept guard
  const gs = new THREE.Shape();
  const gw = guardWidth / 2;
  gs.moveTo(0, -0.1);
  gs.bezierCurveTo(gw * 0.4, -0.14, gw * 0.8, -0.06, gw, 0.16);
  gs.lineTo(gw * 0.85, 0.12);
  gs.bezierCurveTo(gw * 0.6, 0.02, gw * 0.35, 0.04, 0, 0.08);
  gs.bezierCurveTo(-gw * 0.35, 0.04, -gw * 0.6, 0.02, -gw * 0.85, 0.12);
  gs.lineTo(-gw, 0.16);
  gs.bezierCurveTo(-gw * 0.8, -0.06, -gw * 0.4, -0.14, 0, -0.1);
  const guardMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(gs, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 }), metal);
  guardMesh.position.set(0, -0.02, -0.06);
  guardMesh.castShadow = true;
  g.add(guardMesh);
  const gripMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, gripLength, 8), rimMat({ color: grip, roughness: 0.7 }, rim));
  gripMesh.position.y = -gripLength / 2 - 0.08;
  gripMesh.castShadow = true;
  g.add(gripMesh);
  const pommel = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), metal);
  pommel.position.y = -gripLength - 0.16;
  pommel.scale.set(1, 1.3, 1);
  g.add(pommel);
  if (gem !== null) {
    const gemMat = new THREE.MeshStandardMaterial({ color: gem, emissive: gem, emissiveIntensity: 1.4, roughness: 0.15 });
    const gm = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), gemMat);
    gm.position.set(0, 0, 0.1); gm.scale.set(0.8, 1.2, 0.6);
    g.add(gm);
  }
  g.userData = { length, width, bladeMat };
  return g;
}

// Blacksmith hammer: handle along +Y, head at the top.
export function buildHammer({ handle = 0x6a4428, head = 0x3a3c44 } = {}) {
  const g = new THREE.Group();
  const h = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 1.7, 8), new THREE.MeshStandardMaterial({ color: handle, roughness: 0.75 }));
  h.position.y = 0.3;
  g.add(h);
  const hm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.85), new THREE.MeshStandardMaterial({ color: head, roughness: 0.45, metalness: 0.8 }));
  hm.position.y = 1.15;
  g.add(hm);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
