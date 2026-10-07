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
    } else {
      ctx.fillStyle = '#16100c';
      ctx.beginPath(); ctx.ellipse(ex, ey, 17, eyes === 'happy' ? 9 : 24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(ex + 5, ey - 8, 6, 0, Math.PI * 2); ctx.fill();
    }
    // brows
    if (brows === 'none') continue;
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
  } = o;
  const r = rng(seed);
  const M = (opts) => rimMat({ roughness: 0.7, ...opts }, rim);
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
