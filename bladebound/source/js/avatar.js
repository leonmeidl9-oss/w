import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, canvas, texFromCanvas, rimMat } from './util.js';

// Classic blocky (R6) avatar like the NPCs in the game: 2x2x1 torso, 1x2x1 limbs,
// rounded cylinder head with a drawn face. Faces +Z; its right hand side is -X.
// Arms pivot at the shoulder, so pose = shoulder rotation (Roblox R6 style).

function rb(w, h, d, r, mat) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function headGeometry(R = 0.6, Hh = 1.2, cr = 0.24) {
  const pts = [new THREE.Vector2(0, -Hh / 2)];
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2);
    pts.push(new THREE.Vector2(R - cr + Math.cos(a) * cr, -Hh / 2 + cr + Math.sin(a) * cr));
  }
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2);
    pts.push(new THREE.Vector2(R - cr + Math.cos(a) * cr, Hh / 2 - cr + Math.sin(a) * cr));
  }
  pts.push(new THREE.Vector2(0, Hh / 2));
  return new THREE.LatheGeometry(pts, 48);
}

// Roblox-style face decal. Drawn on a 512x512 canvas that wraps ~120 degrees of the head.
export function faceTexture({ brows = 'angry', eyes = 'normal', mouth = 'smirk', beard = null, eyeGlow = null, scar = false } = {}) {
  const [c, ctx] = canvas(512, 512);
  ctx.clearRect(0, 0, 512, 512);
  const cx = 256;
  // eyes
  for (const s of [-1, 1]) {
    const ex = cx + s * 62, ey = 236;
    if (eyeGlow) {
      ctx.save();
      ctx.shadowColor = eyeGlow; ctx.shadowBlur = 30;
      ctx.fillStyle = eyeGlow;
      ctx.beginPath(); ctx.ellipse(ex, ey, 26, 14, s * -0.35, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (eyes === 'bold') {
      // big glossy cartoon eyes for the icon, read at small sizes
      ctx.fillStyle = '#120a10';
      ctx.beginPath(); ctx.ellipse(ex + s * 4, ey + 4, 25, 33, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(ex + s * 4 + 8, ey - 8, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + s * 4 - 7, ey + 17, 4, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#16100c';
      ctx.beginPath(); ctx.ellipse(ex, ey, 17, eyes === 'happy' ? 9 : 24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(ex + 5, ey - 8, 6, 0, Math.PI * 2); ctx.fill();
    }
    // brows
    if (brows === 'none') continue;
    if (brows === 'fierce') {
      // thick wedge, low and heavy at the inner end: cuts into the top of the eye
      ctx.fillStyle = '#120a10';
      ctx.beginPath();
      ctx.moveTo(cx + s * 14, ey - 16);
      ctx.lineTo(cx + s * 30, ey - 44);
      ctx.lineTo(cx + s * 104, ey - 66);
      ctx.quadraticCurveTo(cx + s * 112, ey - 56, cx + s * 100, ey - 48);
      ctx.lineTo(cx + s * 34, ey - 6);
      ctx.closePath(); ctx.fill();
      continue;
    }
    ctx.fillStyle = beard ? beard : '#2a1a10';
    ctx.save();
    ctx.translate(ex, ey - 46);
    // canvas y points down: for an angry look the inner ends of the brows dip
    const tilt = brows === 'angry' ? -s * 0.38 : brows === 'raised' ? s * 0.18 : 0;
    ctx.rotate(tilt);
    ctx.fillRect(-36, -10, 72, brows === 'angry' ? 20 : 15);
    ctx.restore();
  }
  // mouth
  ctx.strokeStyle = '#2a140c'; ctx.lineWidth = 10; ctx.lineCap = 'round';
  if (!beard && mouth !== 'none') {
    ctx.beginPath();
    if (mouth === 'smile') { ctx.arc(cx, 300, 46, 0.2 * Math.PI, 0.8 * Math.PI); }
    else if (mouth === 'grin') {
      ctx.fillStyle = '#2a140c';
      ctx.moveTo(cx - 52, 318); ctx.quadraticCurveTo(cx, 372, cx + 52, 318); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(cx - 40, 320, 80, 10);
    } else if (mouth === 'grit') {
      // clenched-teeth grin: intense but confident
      const path = new Path2D();
      path.moveTo(cx - 76, 306);
      path.quadraticCurveTo(cx + 2, 326, cx + 82, 296);
      path.quadraticCurveTo(cx + 76, 354, cx + 4, 362);
      path.quadraticCurveTo(cx - 66, 358, cx - 76, 306);
      path.closePath();
      ctx.fillStyle = '#ffffff'; ctx.fill(path);
      ctx.save(); ctx.clip(path);
      ctx.strokeStyle = '#1a0a0e'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(cx - 80, 334); ctx.quadraticCurveTo(cx, 346, cx + 86, 322); ctx.stroke();
      for (const x of [-42, -10, 22, 52]) { ctx.beginPath(); ctx.moveTo(cx + x, 296); ctx.lineTo(cx + x + 3, 372); ctx.stroke(); }
      ctx.restore();
      ctx.lineWidth = 9; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1a0a0e'; ctx.stroke(path);
      ctx.beginPath();
    } else if (mouth === 'frown') { ctx.moveTo(cx - 40, 342); ctx.quadraticCurveTo(cx, 312, cx + 40, 342); }
    else { ctx.moveTo(cx - 38, 330); ctx.quadraticCurveTo(cx + 10, 342, cx + 44, 318); }
    ctx.stroke();
  }
  if (beard) {
    // full beard joined to sideburns; its upper edge dips toward the middle so it
    // reads as a grumpy moustache line rather than a grin
    const col = new THREE.Color(beard);
    const shade = (k) => `rgb(${Math.round(col.r * 255 * k)},${Math.round(col.g * 255 * k)},${Math.round(col.b * 255 * k)})`;
    ctx.fillStyle = shade(1);
    ctx.beginPath();
    ctx.moveTo(cx - 168, 150);
    ctx.lineTo(cx - 140, 150);
    ctx.lineTo(cx - 132, 268);
    ctx.bezierCurveTo(cx - 90, 286, cx - 40, 300, cx, 316);
    ctx.bezierCurveTo(cx + 40, 300, cx + 90, 286, cx + 132, 268);
    ctx.lineTo(cx + 140, 150);
    ctx.lineTo(cx + 168, 150);
    ctx.bezierCurveTo(cx + 172, 400, cx + 90, 486, cx, 488);
    ctx.bezierCurveTo(cx - 90, 486, cx - 172, 400, cx - 168, 150);
    ctx.closePath(); ctx.fill();
    // drooping moustache
    ctx.fillStyle = shade(0.7);
    ctx.beginPath();
    ctx.moveTo(cx, 300);
    ctx.bezierCurveTo(cx - 40, 286, cx - 90, 296, cx - 104, 344);
    ctx.bezierCurveTo(cx - 70, 326, cx - 30, 330, cx, 334);
    ctx.bezierCurveTo(cx + 30, 330, cx + 70, 326, cx + 104, 344);
    ctx.bezierCurveTo(cx + 90, 296, cx + 40, 286, cx, 300);
    ctx.closePath(); ctx.fill();
    // hair strands
    ctx.strokeStyle = shade(0.75); ctx.lineWidth = 5;
    for (let k = 0; k < 11; k++) {
      const x0 = cx - 120 + k * 24;
      ctx.beginPath(); ctx.moveTo(x0, 360 + Math.abs(k - 5) * 4); ctx.lineTo(x0 + (k - 5) * 2, 452 - Math.abs(k - 5) * 9); ctx.stroke();
    }
  }
  if (scar) {
    ctx.strokeStyle = 'rgba(120,30,30,0.9)'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(cx + 40, 170); ctx.lineTo(cx + 90, 290); ctx.stroke();
  }
  return texFromCanvas(c);
}

// Hair shell hugging the rounded-cylinder head: covers everything above yMin,
// optionally leaving the face (front, +Z) open.
function hairShell(mat, { yMin = -0.2, openFront = true, R = 0.645, Hh = 1.29, cr = 0.27 } = {}) {
  const prof = [];
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2);
    prof.push(new THREE.Vector2(R - cr + Math.cos(a) * cr, -Hh / 2 + cr + Math.sin(a) * cr));
  }
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2);
    prof.push(new THREE.Vector2(R - cr + Math.cos(a) * cr, Hh / 2 - cr + Math.sin(a) * cr));
  }
  prof.push(new THREE.Vector2(0, Hh / 2));
  // the straight side has no profile points, so start the shell explicitly at yMin
  const pts = [new THREE.Vector2(R, yMin), ...prof.filter((p) => p.y > yMin + 0.01)];
  const g = new THREE.Group();
  if (openFront) {
    // back + sides down to yMin, and a full cap above the forehead
    g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 40, 1.15, Math.PI * 2 - 2.3), mat));
    g.add(new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(R, 0.3), ...prof.filter((p) => p.y > 0.31)], 40), mat));
  } else {
    g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 40), mat));
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.material.side = THREE.DoubleSide; } });
  return g;
}

// One smooth hair lock: a tapered tube along a quadratic curve, flattened so it
// lies against the head (wide along the surface, thin away from it).
function lockGeometry(p0, p1, p2, { r0 = 0.2, flat = 0.55, pow = 0.9, segs = 18, radial = 12, root, tip }) {
  const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
  const pos = [], nor = [], col = [], idx = [];
  const c = new THREE.Color();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const p = curve.getPoint(t);
    const T = curve.getTangent(t).normalize();
    const U = p.clone().sub(new THREE.Vector3(0, -0.1, 0)).normalize();
    const B = new THREE.Vector3().crossVectors(T, U);
    if (B.lengthSq() < 1e-6) B.set(1, 0, 0);
    B.normalize();
    const N = new THREE.Vector3().crossVectors(B, T).normalize();
    const rad = r0 * Math.pow(1 - t, pow) * (1 + 0.25 * Math.sin(Math.min(1, t * 3) * Math.PI / 2) * (1 - t)) + 0.004;
    c.copy(root).lerp(tip, Math.pow(t, 0.8));
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      pos.push(p.x + B.x * ca * rad + N.x * sa * rad * flat, p.y + B.y * ca * rad + N.y * sa * rad * flat, p.z + B.z * ca * rad + N.z * sa * rad * flat);
      const n = new THREE.Vector3().addScaledVector(B, ca * flat).addScaledVector(N, sa).normalize();
      nor.push(n.x, n.y, n.z);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

// Anime-style swept hair like the popular Roblox hair accessories: a smooth cap
// plus big locks: bangs over the forehead, spikes sweeping up and back.
function sweptHair(M, color, tipColor) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const base = new THREE.Color(color);
  const root = base.clone().multiplyScalar(0.8);
  const tip = new THREE.Color(tipColor ?? color);
  const g = new THREE.Group();
  g.add(hairShell(M({ color: root, roughness: 0.62 }), { yMin: -0.32 }));
  const mat = M({ color: 0xffffff, vertexColors: true, roughness: 0.6 });
  // [root (buried in the cap), bend, tip, base radius, taper power, flatness]
  const locks = [
    // a closed fringe of five wide bangs, ending above the brows
    [V(-0.42, 0.5, 0.2), V(-0.64, 0.56, 0.62), V(-0.58, 0.27, 0.66), 0.27, 0.6, 0.42],
    [V(-0.22, 0.52, 0.16), V(-0.32, 0.72, 0.74), V(-0.3, 0.27, 0.75), 0.3, 0.6, 0.42],
    [V(0.0, 0.52, 0.14), V(0.02, 0.76, 0.76), V(0.07, 0.23, 0.77), 0.32, 0.6, 0.42],
    [V(0.22, 0.52, 0.16), V(0.34, 0.72, 0.74), V(0.38, 0.29, 0.73), 0.3, 0.6, 0.42],
    [V(0.42, 0.5, 0.2), V(0.64, 0.56, 0.6), V(0.66, 0.28, 0.58), 0.27, 0.6, 0.42],
    // crown spikes, up and back
    [V(-0.05, 0.42, 0.0), V(-0.1, 1.15, 0.0), V(0.05, 1.45, -0.45), 0.36, 0.9, 0.7],
    [V(-0.3, 0.42, -0.05), V(-0.65, 1.0, -0.1), V(-0.95, 1.12, -0.45), 0.33, 0.9, 0.7],
    [V(0.3, 0.42, -0.05), V(0.65, 1.0, -0.1), V(0.98, 1.06, -0.4), 0.33, 0.9, 0.7],
    // sides and back
    [V(-0.42, 0.25, -0.1), V(-0.95, 0.45, -0.25), V(-1.18, 0.3, -0.55), 0.28, 0.9, 0.65],
    [V(0.42, 0.25, -0.1), V(0.95, 0.45, -0.25), V(1.18, 0.3, -0.55), 0.28, 0.9, 0.65],
    [V(0.0, 0.35, -0.3), V(0.0, 0.75, -0.85), V(0.0, 0.6, -1.3), 0.34, 0.9, 0.65],
    [V(-0.3, 0.05, -0.32), V(-0.62, 0.0, -0.82), V(-0.7, -0.25, -1.05), 0.28, 0.9, 0.65],
    [V(0.3, 0.05, -0.32), V(0.62, 0.0, -0.82), V(0.7, -0.25, -1.05), 0.28, 0.9, 0.65],
    // sideburns
    [V(-0.5, 0.4, 0.2), V(-0.7, 0.14, 0.34), V(-0.65, -0.14, 0.3), 0.17, 0.7, 0.5],
    [V(0.5, 0.4, 0.2), V(0.7, 0.14, 0.34), V(0.65, -0.14, 0.3), 0.17, 0.7, 0.5],
  ];
  for (const [a, b, c, r0, pow, flat] of locks) {
    const m = new THREE.Mesh(lockGeometry(a, b, c, { r0, pow, flat, root, tip }), mat);
    m.castShadow = true;
    g.add(m);
  }
  return g;
}

// Spiky hair (cones) with dark roots and coloured tips.
function spikyHair(r, mat, { count = 30, wind = new THREE.Vector3(0.4, 0.15, -0.3), len = [0.5, 1.0] } = {}) {
  const g = new THREE.Group();
  g.add(hairShell(mat, { yMin: -0.25 }));
  for (let i = 0; i < count; i++) {
    const phi = r() * Math.PI * 2;
    const el = 0.05 + r() * 1.3;
    if (Math.cos(phi) > 0.55 && el < 0.45) continue; // keep the face free
    const d0 = new THREE.Vector3(Math.cos(el) * Math.sin(phi), Math.sin(el), Math.cos(el) * Math.cos(phi));
    const dir = d0.clone().add(wind).add(new THREE.Vector3(0, 0.3, 0)).normalize();
    const L = len[0] + r() * (len[1] - len[0]);
    const geo = new THREE.ConeGeometry(0.15 + r() * 0.1, L, 4, 1);
    geo.translate(0, L / 2, 0);
    const s = new THREE.Mesh(geo, mat);
    s.position.copy(d0.multiplyScalar(0.42)).add(new THREE.Vector3(0, 0.1, 0));
    s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    s.castShadow = true;
    g.add(s);
  }
  return g;
}

export function buildAvatar(o = {}) {
  const {
    skin = 0xf0c49a, shirt = 0x6b4428, pants = 0x34343e, shoes = 0x4a2e1c, sleeves = 'short',
    face = {}, hair = null, hairColor = 0x2a1a10, hat = null, hatColor = 0x6a2a8a,
    apron = null, belt = 0x3a2416, buckle = 0xd8a830, cape = null, pauldrons = null, bag = null,
    armor = null, gloves = null, seed = 1, rim = {}, pose = {},
    roughness = 0.7, hairTip = null, strap = null, scarf = null,
  } = o;
  const r = rng(seed);
  const M = (opts) => rimMat({ roughness, ...opts }, rim);
  const mSkin = M({ color: skin, roughness: 0.55 });
  const mShirt = M({ color: shirt });
  const mPants = M({ color: pants });
  const mShoes = M({ color: shoes, roughness: 0.6 });
  const g = new THREE.Group();

  // legs
  const legs = {};
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * 0.5, 2, 0);
    const p = pose[s < 0 ? 'legR' : 'legL'] || [0, 0, 0];
    hip.rotation.set(p[0], p[1], p[2]);
    g.add(hip);
    const leg = rb(0.98, 1.4, 0.98, 0.05, mPants); leg.position.y = -0.7; hip.add(leg);
    const boot = rb(1.02, 0.66, 1.04, 0.07, mShoes); boot.position.y = -1.67; hip.add(boot);
    legs[s < 0 ? 'R' : 'L'] = hip;
  }
  // torso
  const torsoPivot = new THREE.Group();
  torsoPivot.position.y = 2;
  torsoPivot.rotation.set(pose.lean || 0, pose.twist || 0, 0);
  g.add(torsoPivot);
  const torso = rb(2, 2, 1, 0.06, mShirt); torso.position.y = 1; torsoPivot.add(torso);
  const beltM = rb(2.05, 0.24, 1.05, 0.04, M({ color: belt })); beltM.position.y = 0.2; torsoPivot.add(beltM);
  const buck = rb(0.34, 0.22, 0.06, 0.02, M({ color: buckle, metalness: 0.9, roughness: 0.3 })); buck.position.set(0, 0.2, 0.54); torsoPivot.add(buck);
  if (armor) {
    const plate = rb(2.1, 1.3, 1.12, 0.12, M({ color: armor, metalness: 0.8, roughness: 0.35 }));
    plate.position.y = 1.35; torsoPivot.add(plate);
    const trim = rb(2.14, 0.1, 1.16, 0.04, M({ color: buckle, metalness: 0.9, roughness: 0.3 }));
    trim.position.y = 0.72; torsoPivot.add(trim);
  }
  if (apron) {
    const ap = rb(1.7, 2.7, 0.08, 0.03, M({ color: apron, roughness: 0.85 }));
    ap.position.set(0, 0.15, 0.55); torsoPivot.add(ap);
    const pocket = rb(0.7, 0.45, 0.06, 0.02, M({ color: new THREE.Color(apron).multiplyScalar(0.75), roughness: 0.85 }));
    pocket.position.set(0.2, -0.15, 0.6); torsoPivot.add(pocket);
    for (const s of [-1, 1]) {
      const strap = rb(0.16, 1.0, 0.06, 0.02, M({ color: apron }));
      strap.position.set(s * 0.62, 1.6, 0.53); torsoPivot.add(strap);
    }
  }
  if (scarf) {
    // scarf wrapped around the neck, knotted at the front, two tails blowing out
    const sm = M({ color: scarf.color, roughness: 0.65 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.17, 14, 48), sm);
    ring.rotation.x = Math.PI / 2;
    ring.scale.set(1.04, 0.86, 1.15);
    ring.position.y = 2.1;
    ring.castShadow = true;
    torsoPivot.add(ring);
    const k = scarf.side ?? 1;
    const knot = rb(0.34, 0.3, 0.2, 0.09, sm);
    knot.position.set(k * 0.36, 1.98, 0.56); knot.rotation.z = k * 0.3;
    torsoPivot.add(knot);
    const tails = scarf.tails ?? [[0.34, 1.25, 0.95, -0.25], [0.3, 0.95, 1.35, 0.15]];
    for (const [w, len, ang, back] of tails) {
      const t = rb(w, len, 0.08, 0.035, sm);
      t.geometry.translate(0, -len / 2, 0);
      t.position.set(k * 0.4, 1.95, 0.6);
      t.rotation.set(back, 0, k * ang);
      torsoPivot.add(t);
    }
  }
  if (strap) {
    // diagonal sword strap from the left shoulder to the right hip
    const st = rb(0.26, 2.75, 0.08, 0.03, M({ color: strap }));
    st.position.set(0, 1.0, 0.53); st.rotation.z = -0.78; torsoPivot.add(st);
    const ring = rb(0.3, 0.3, 0.1, 0.05, M({ color: buckle, metalness: 0.9, roughness: 0.3 }));
    ring.position.set(0.32, 1.32, 0.58); ring.rotation.z = -0.78; torsoPivot.add(ring);
  }
  if (bag) {
    const strap = rb(0.18, 2.6, 0.06, 0.02, M({ color: bag }));
    strap.position.set(0, 1.05, 0.53); strap.rotation.z = 0.72; torsoPivot.add(strap);
    const back = rb(1.3, 1.1, 0.5, 0.15, M({ color: bag }));
    back.position.set(-0.3, 0.8, -0.72); torsoPivot.add(back);
  }

  // arms (pivot at the top of each arm)
  const arms = {};
  for (const s of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(s * 1.5, 1.95, 0);
    const p = pose[s < 0 ? 'armR' : 'armL'] || [0, 0, 0];
    sh.rotation.set(p[0], p[1], p[2]);
    torsoPivot.add(sh);
    const upperLen = sleeves === 'long' ? 1.5 : 0.9;
    const up = rb(1, upperLen, 1, 0.06, mShirt); up.position.y = -upperLen / 2; sh.add(up);
    const low = rb(0.98, 2 - upperLen, 0.98, 0.06, sleeves === 'long' ? mShirt : mSkin); low.position.y = -upperLen - (2 - upperLen) / 2; sh.add(low);
    if (sleeves === 'long') { const hand = rb(0.99, 0.5, 0.99, 0.08, gloves !== null ? M({ color: gloves, roughness: 0.6 }) : mSkin); hand.position.y = -1.75; sh.add(hand); }
    const hand = new THREE.Group(); hand.position.set(0, -1.75, 0); sh.add(hand);
    arms[s < 0 ? 'R' : 'L'] = { pivot: sh, hand };
    if (pauldrons) {
      const pl = rb(1.25, 0.42, 1.25, 0.14, M({ color: pauldrons, metalness: 0.55, roughness: 0.6 }));
      pl.position.set(s * 0.08, 0.05, 0); pl.rotation.z = s * -0.2; sh.add(pl);
    }
  }

  // head
  const headPivot = new THREE.Group();
  headPivot.position.y = 2.62;
  headPivot.rotation.set(pose.headX || 0, pose.headY || 0, 0);
  torsoPivot.add(headPivot);
  const head = new THREE.Mesh(headGeometry(), mSkin);
  head.castShadow = true;
  headPivot.add(head);
  const faceMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.605, 0.605, 1.2, 32, 1, true, -1.05, 2.1),
    new THREE.MeshStandardMaterial({ map: faceTexture(face), transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
  );
  headPivot.add(faceMesh);
  if (face.eyeGlow) {
    const em = new THREE.Mesh(
      new THREE.CylinderGeometry(0.607, 0.607, 1.2, 32, 1, true, -1.05, 2.1),
      new THREE.MeshBasicMaterial({ map: faceTexture({ ...face, beard: null, mouth: 'none', brows: 'none' }), color: new THREE.Color(face.eyeGlow).multiplyScalar(3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    headPivot.add(em);
  }
  const hairMat = M({ color: hairColor, roughness: 0.5, flatShading: true });
  if (hair === 'spiky') headPivot.add(spikyHair(r, hairMat));
  if (hair === 'swept') headPivot.add(sweptHair(M, hairColor, hairTip));
  if (hair === 'short') {
    headPivot.add(hairShell(hairMat, { yMin: -0.1 }));
  }
  if (hat === 'headband') {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.2, 32, 1, true), M({ color: hatColor, side: THREE.DoubleSide }));
    band.position.y = 0.36; headPivot.add(band);
  }
  if (hat === 'tophat') {
    const hm = M({ color: hatColor, roughness: 0.6 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.08, 32), hm); brim.position.y = 0.62; headPivot.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.85, 32), hm); crown.position.y = 1.06; headPivot.add(crown);
    const bandM = new THREE.Mesh(new THREE.CylinderGeometry(0.605, 0.605, 0.16, 32), M({ color: 0x2a1030 })); bandM.position.y = 0.75; headPivot.add(bandM);
    [brim, crown].forEach((m) => { m.castShadow = true; });
  }
  if (hat === 'helmet') {
    const hm = M({ color: hatColor, metalness: 0.85, roughness: 0.35 });
    // open-faced helm: sits above the eyes so the face stays readable
    const shell = rb(1.36, 0.62, 1.36, 0.26, hm); shell.position.y = 0.6; headPivot.add(shell);
    const brow = rb(1.42, 0.16, 1.42, 0.06, M({ color: buckle, metalness: 0.9, roughness: 0.3 })); brow.position.y = 0.3; headPivot.add(brow);
    const guard = rb(0.2, 0.55, 0.12, 0.04, hm); guard.position.set(0, 0.1, 0.66); headPivot.add(guard);
    for (const s of [-1, 1]) {
      const cheek = rb(0.16, 0.7, 0.9, 0.06, hm); cheek.position.set(s * 0.66, 0.05, 0.1); headPivot.add(cheek);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.5, 8), M({ color: 0xe8dcc0, roughness: 0.5 }));
      horn.geometry.translate(0, 0.75, 0);
      horn.position.set(s * 0.6, 0.72, 0); horn.rotation.z = s * -1.05; headPivot.add(horn);
    }
  }
  // optional cape hanging from the shoulders
  if (cape) {
    const geo = new THREE.PlaneGeometry(2.1, 3.4, 10, 20);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const v = 0.5 - y / 3.4;
      p.setXYZ(i, x * (1 + v * 0.35) + (cape.windX || 0) * v * v, 1.95 - v * 3.3 + (cape.lift || 0) * v * v, -0.56 - v * (cape.flow || 0.9) - 0.12 * Math.sin(x * 3 + v * 5) * v);
    }
    geo.computeVertexNormals();
    const cm = new THREE.Mesh(geo, M({ color: cape.color, side: THREE.DoubleSide, roughness: 0.85 }));
    cm.castShadow = true;
    torsoPivot.add(cm);
  }
  g.userData = { arms, legs, headPivot, torsoPivot };
  return g;
}

// Turn a held item so its +Y (blade) points at a world-space target.
export function aimItem(holder, item, target) {
  holder.updateWorldMatrix(true, false);
  const pq = new THREE.Quaternion();
  holder.parent.getWorldQuaternion(pq);
  const from = new THREE.Vector3();
  holder.getWorldPosition(from);
  const d = target.clone().sub(from).normalize();
  const wq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  holder.quaternion.copy(pq.invert().multiply(wq));
  holder.updateWorldMatrix(false, true);
  return item;
}

// Attach an item (blade along +Y) to a hand so it points forward out of the fist.
export function holdItem(avatar, side, item, { rx = Math.PI / 2, ry = 0, rz = 0, offset = 0.45 } = {}) {
  const hand = avatar.userData.arms[side].hand;
  const holder = new THREE.Group();
  holder.rotation.set(rx, ry, rz);
  hand.add(holder);
  item.position.y = offset;   // grip centre sits in the fist
  holder.add(item);
  return holder;
}
