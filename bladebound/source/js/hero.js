import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, makeNoise, canvas, texFromCanvas, rimMat } from './util.js';

// Blocky (R6-style) avatar seen from behind with a tattered cloak, a scarf and a
// glowing violet greatsword strapped across the back.
// Local space: feet at y = 0, faces +Z. Character's right hand side is -X.
const RIM = { right: 0xff3a30, left: 0x8a6bff, strengthR: 0.16, strengthL: 0.4, power: 2.8 };
// slender proportions (Roblox body-width scale ~0.8)
const TW = 1.6, TD = 0.84, AW = 0.8, LW = 0.78, SX = TW / 2 + AW / 2;

function rb(w, h, d, r, mat, seg = 3) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, r), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function headGeometry(R = 0.56, Hh = 1.14, cr = 0.23) {
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

// Torn cloth alpha mask: ragged bottom, a few holes and slits.
function tatterTexture(seed, { bottom = 0.78, teeth = 22, holes = 7, slits = 5 } = {}) {
  const r = rng(seed);
  const nz = makeNoise(seed + 5);
  const W = 512, H = 1024;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(W, 0);
  const steps = teeth * 2;
  for (let i = steps; i >= 0; i--) {
    const x = (i / steps) * W;
    const base = bottom + (nz.fbm2(i * 0.15, 3, 3) - 0.5) * 0.28;
    const tooth = i % 2 === 0 ? 0.0 : -(0.04 + r() * 0.12);
    ctx.lineTo(x, Math.min(0.995, base + tooth + (r() - 0.5) * 0.03) * H);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#000';
  for (let i = 0; i < holes; i++) {
    const x = r() * W, y = (0.45 + r() * 0.35) * H;
    ctx.beginPath();
    ctx.ellipse(x, y, 6 + r() * 16, 10 + r() * 30, r() * 0.6 - 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < slits; i++) {
    const x = r() * W, y = (0.55 + r() * 0.25) * H, len = (0.08 + r() * 0.2) * H;
    ctx.beginPath(); ctx.moveTo(x - 5, y + len); ctx.lineTo(x + (r() - 0.5) * 20, y); ctx.lineTo(x + 5, y + len); ctx.closePath(); ctx.fill();
  }
  return texFromCanvas(c, { srgb: false });
}

// Subtle woven/worn cloth color texture
function clothTexture(seed, base, dark, { lines = 0 } = {}) {
  const nz = makeNoise(seed);
  const S = 256;
  const [c, ctx] = canvas(S, S);
  const im = ctx.createImageData(S, S);
  const b = new THREE.Color(base), d = new THREE.Color(dark);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const t = nz.fbm2(x / S * 6, y / S * 6, 4) * 0.8 + nz.n2(x * 0.9, y * 0.9) * 0.2;
    let k = t;
    if (lines && (x % lines === 0 || y % lines === 0)) k *= 0.7;
    const i = (y * S + x) * 4;
    im.data[i] = (d.r + (b.r - d.r) * k) * 255; im.data[i + 1] = (d.g + (b.g - d.g) * k) * 255; im.data[i + 2] = (d.b + (b.b - d.b) * k) * 255; im.data[i + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
  return texFromCanvas(c, { repeat: [1, 1] });
}

// Lightning-vein emissive texture for the blade
function veinTexture(seed) {
  const W = 256, H = 1024;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(110,30,190,0.55)'); g.addColorStop(0.5, 'rgba(100,30,200,0.18)'); g.addColorStop(1, 'rgba(110,30,190,0.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // the same branching bolts are drawn three times: wide glow, mid, hot core
  const passes = [['rgba(160,60,255,0.85)', 22, 2.6], ['rgba(215,160,255,1)', 8, 1.1], ['rgba(255,248,255,1)', 0, 0.45]];
  for (const [style, blur, wmul] of passes) {
    const R = rng(seed);
    ctx.strokeStyle = style; ctx.shadowColor = 'rgba(190,90,255,1)'; ctx.shadowBlur = blur;
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
    draw(W * 0.5, H * 0.02, Math.PI / 2, H * 0.97, 7, 3);
    draw(W * 0.35, H * 0.25, Math.PI / 2 + 0.15, H * 0.5, 4, 2);
    draw(W * 0.65, H * 0.45, Math.PI / 2 - 0.15, H * 0.45, 4, 2);
  }
  // bright rim along both edges
  const eg = ctx.createLinearGradient(0, 0, W, 0);
  eg.addColorStop(0, 'rgba(230,180,255,0.9)'); eg.addColorStop(0.06, 'rgba(160,70,255,0.0)');
  eg.addColorStop(0.94, 'rgba(160,70,255,0.0)'); eg.addColorStop(1, 'rgba(230,180,255,0.9)');
  ctx.shadowBlur = 0; ctx.fillStyle = eg; ctx.fillRect(0, 0, W, H);
  return texFromCanvas(c);
}

function bladeShape(L, Wd) {
  const s = new THREE.Shape();
  const h = Wd / 2;
  // right edge (x>0) from guard to tip, with crystal barbs
  s.moveTo(-h, 0);
  s.lineTo(h, 0);
  s.lineTo(h * 1.05, -L * 0.12);
  s.lineTo(h * 1.45, -L * 0.2);
  s.lineTo(h * 0.95, -L * 0.25);
  s.lineTo(h * 1.0, -L * 0.48);
  s.lineTo(h * 1.38, -L * 0.56);
  s.lineTo(h * 0.88, -L * 0.62);
  s.lineTo(h * 0.78, -L * 0.82);
  s.lineTo(0, -L);
  // left edge back up
  s.lineTo(-h * 0.7, -L * 0.86);
  s.lineTo(-h * 1.25, -L * 0.74);
  s.lineTo(-h * 0.9, -L * 0.68);
  s.lineTo(-h * 1.0, -L * 0.38);
  s.lineTo(-h * 1.42, -L * 0.31);
  s.lineTo(-h * 0.98, -L * 0.25);
  s.lineTo(-h * 1.02, -L * 0.08);
  s.closePath();
  return s;
}

function guardShape() {
  const s = new THREE.Shape();
  // swept wings curving up toward the hilt (+y), centered at origin
  s.moveTo(0, -0.12);
  s.bezierCurveTo(0.25, -0.16, 0.5, -0.08, 0.66, 0.22);
  s.lineTo(0.56, 0.16);
  s.bezierCurveTo(0.44, 0.02, 0.3, 0.02, 0.2, 0.1);
  s.lineTo(0.12, 0.2);
  s.lineTo(0, 0.13);
  s.lineTo(-0.12, 0.2);
  s.lineTo(-0.2, 0.1);
  s.bezierCurveTo(-0.3, 0.02, -0.44, 0.02, -0.56, 0.16);
  s.lineTo(-0.66, 0.22);
  s.bezierCurveTo(-0.5, -0.08, -0.25, -0.16, 0, -0.12);
  return s;
}

export function buildHero(seed = 3) {
  const r = rng(seed);
  const hero = new THREE.Group();

  const shirtTex = clothTexture(seed, 0x302a40, 0x15121d);
  const shirt = rimMat({ color: 0xffffff, map: shirtTex, roughness: 0.8 }, RIM);
  const pants = rimMat({ color: 0x201d29, roughness: 0.85 }, RIM);
  const skin = rimMat({ color: 0xdcae86, roughness: 0.55 }, RIM);
  const leather = rimMat({ color: 0x2a1d18, roughness: 0.6 }, RIM);
  const metal = rimMat({ color: 0x5b5a6e, roughness: 0.3, metalness: 1.0 }, RIM);
  const trim = rimMat({ color: 0x4a1d7a, roughness: 0.5, emissive: 0x2a0850, emissiveIntensity: 0.6 }, RIM);
  const hairMat = rimMat({ color: 0xffffff, vertexColors: true, roughness: 0.42, flatShading: true }, { ...RIM, strengthR: 0.12, strengthL: 0.75, left: 0xa070ff, power: 3.2 });

  // ---- legs ----
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * LW / 2, 2, 0);
    hip.rotation.set(s < 0 ? 0.05 : -0.08, 0, s * 0.05);
    hero.add(hip);
    const leg = rb(LW - 0.02, 2, TD - 0.02, 0.06, pants); leg.position.y = -1; hip.add(leg);
    const boot = rb(LW + 0.04, 0.75, TD + 0.06, 0.08, leather); boot.position.y = -1.62; hip.add(boot);
  }
  // ---- torso ----
  const torso = rb(TW, 2, TD, 0.07, shirt); torso.position.y = 3; hero.add(torso);
  const belt = rb(TW + 0.06, 0.26, TD + 0.06, 0.05, leather); belt.position.y = 2.2; hero.add(belt);
  const buckle = rb(0.32, 0.22, 0.06, 0.02, metal); buckle.position.set(0.0, 2.2, -TD / 2 - 0.04); hero.add(buckle);
  // a dark vest panel with violet trim on the back
  const vest = rb(TW * 0.8, 1.55, 0.06, 0.03, rimMat({ color: 0x15121d, roughness: 0.7 }, RIM)); vest.position.set(0, 3.15, -TD / 2 - 0.02); hero.add(vest);
  const trimL = rb(0.08, 1.5, 0.07, 0.02, trim); trimL.position.set(TW * 0.4, 3.15, -TD / 2 - 0.04); hero.add(trimL);
  const trimR = trimL.clone(); trimR.position.x = -TW * 0.4; hero.add(trimR);

  // ---- arms ----
  for (const s of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(s * SX, 4, 0);
    sh.rotation.set(s < 0 ? -0.08 : -0.05, 0, s * 0.08);
    hero.add(sh);
    const sleeve = rb(AW, 1.05, AW, 0.06, shirt); sleeve.position.y = -0.52; sh.add(sleeve);
    const cuff = rb(AW + 0.04, 0.16, AW + 0.04, 0.04, trim); cuff.position.y = -1.04; sh.add(cuff);
    const fore = rb(AW - 0.02, 0.98, AW - 0.02, 0.06, skin); fore.position.y = -1.52; sh.add(fore);
  }
  // right shoulder pauldron (silhouette interest)
  const paul = new THREE.Group();
  paul.position.set(-SX - 0.05, 4.05, 0); paul.rotation.z = 0.22; hero.add(paul);
  const pl = rb(0.92, 0.32, 0.9, 0.11, metal); paul.add(pl);
  const pl2 = rb(0.82, 0.24, 0.84, 0.09, metal); pl2.position.set(-0.08, -0.3, 0); pl2.rotation.z = 0.15; paul.add(pl2);
  const plTrim = rb(0.95, 0.06, 0.93, 0.03, trim); plTrim.position.y = -0.18; paul.add(plTrim);
  for (let i = 0; i < 3; i++) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 4), metal);
    sp.position.set(-0.25 + i * 0.25, 0.32, -0.1 + i * 0.05); sp.rotation.z = 0.5 - i * 0.2;
    paul.add(sp);
  }

  // ---- head ----
  const head = new THREE.Mesh(headGeometry(), skin);
  head.position.set(0, 4.6, 0);
  head.castShadow = true;
  hero.add(head);

  // ---- hair: cap + swept spikes ----
  const hair = new THREE.Group();
  hair.position.copy(head.position);
  hero.add(hair);
  const capGeo = new THREE.SphereGeometry(0.62, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.68);
  const capCol = [];
  for (let i = 0; i < capGeo.attributes.position.count; i++) capCol.push(0.018, 0.015, 0.03);
  capGeo.setAttribute('color', new THREE.Float32BufferAttribute(capCol, 3));
  const cap = new THREE.Mesh(capGeo, hairMat);
  cap.position.set(0, 0.04, -0.02); cap.scale.set(0.97, 0.97, 1.0);
  hair.add(cap);
  const spikeCount = 34;
  const wind = new THREE.Vector3(0.55, 0.1, -0.25);
  for (let i = 0; i < spikeCount; i++) {
    const phi = r() * Math.PI * 2;
    let el = 0.15 + r() * 1.2;
    // fewer, shorter spikes at the very front (fringe)
    const front = Math.cos(phi) > 0.6 && el < 0.7;
    const d0 = new THREE.Vector3(Math.cos(el) * Math.sin(phi), Math.sin(el), Math.cos(el) * Math.cos(phi));
    const dir = d0.clone().add(wind.clone().multiplyScalar(0.6 + r() * 0.4)).add(new THREE.Vector3(0, 0.25, -0.15)).normalize();
    const len = front ? 0.4 + r() * 0.2 : 0.55 + r() * 0.5;
    const rad = 0.15 + r() * 0.1;
    const geo = new THREE.ConeGeometry(rad, len, 4, 1);
    geo.translate(0, len / 2, 0);
    const col = [];
    const pa = geo.attributes.position;
    for (let k = 0; k < pa.count; k++) {
      const t = pa.getY(k) / len;
      col.push(0.03 + 0.18 * t * t, 0.025 + 0.04 * t * t, 0.05 + 0.32 * t * t);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const spk = new THREE.Mesh(geo, hairMat);
    spk.position.copy(d0.clone().multiplyScalar(0.4)).add(new THREE.Vector3(0, 0.12, 0));
    spk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    spk.rotateY(r() * Math.PI);
    spk.castShadow = true;
    hair.add(spk);
  }

  // mane: locks covering the back of the head, sweeping down and toward the wind
  for (let i = 0; i < 16; i++) {
    const phi = Math.PI + (r() - 0.5) * 2.4;
    const el = -0.45 + r() * 0.6;
    const d0 = new THREE.Vector3(Math.cos(el) * Math.sin(phi), Math.sin(el), Math.cos(el) * Math.cos(phi));
    const dir = d0.clone().add(new THREE.Vector3(0.45, -0.35, -0.35)).normalize();
    const len = 0.5 + r() * 0.35, rad = 0.17 + r() * 0.08;
    const geo = new THREE.ConeGeometry(rad, len, 4, 1);
    geo.translate(0, len / 2, 0);
    const col = [];
    const pa = geo.attributes.position;
    for (let k = 0; k < pa.count; k++) { const t = pa.getY(k) / len; col.push(0.03 + 0.14 * t * t, 0.025 + 0.03 * t * t, 0.05 + 0.26 * t * t); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const spk = new THREE.Mesh(geo, hairMat);
    spk.position.copy(d0.clone().multiplyScalar(0.36)).add(new THREE.Vector3(0, 0.1, 0));
    spk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    spk.rotateY(r() * Math.PI);
    spk.castShadow = true;
    hair.add(spk);
  }

  // ---- scarf ----
  const scarfMat = rimMat({ color: 0x24103a, roughness: 0.9, side: THREE.DoubleSide, map: clothTexture(seed + 5, 0x3a1a5a, 0x120818) }, RIM);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.19, 10, 28), scarfMat);
  collar.rotation.x = Math.PI / 2; collar.position.set(0, 4.06, 0); collar.scale.set(1.0, 0.82, 0.9);
  collar.castShadow = true;
  hero.add(collar);

  // ---- cloak ----
  const cloakAlpha = tatterTexture(seed + 1);
  const cloakMat = rimMat({ color: 0x1b1426, roughness: 0.9, side: THREE.DoubleSide, alphaMap: cloakAlpha, alphaTest: 0.5, map: clothTexture(seed + 2, 0x241a33, 0x0c0912) }, RIM);
  const cg = new THREE.PlaneGeometry(1, 1, 44, 72);
  const cp = cg.attributes.position;
  const L = 3.7;
  for (let i = 0; i < cp.count; i++) {
    const u = cp.getX(i) + 0.5, v = 0.5 - cp.getY(i);
    const halfW = 0.92 + 0.7 * v;
    let x = (u - 0.5) * 2 * halfW;
    let y = 4.08 - v * L;
    let z = -TD / 2 - 0.12 - 0.18 * v;
    // gust toward image-left (+X local) and toward the camera (-Z), lifting the hem
    x += 2.1 * Math.pow(v, 1.5) * (0.7 + 0.5 * u);
    z += -1.25 * Math.pow(v, 1.25) - 0.35 * Math.sin(u * Math.PI) * v;
    y += 1.0 * Math.pow(v, 1.9) * (0.4 + 0.8 * u);
    // ripples
    z += 0.2 * v * Math.sin(u * 10 + v * 6);
    x += 0.12 * v * Math.sin(v * 9 + u * 5);
    y += 0.1 * v * Math.cos(u * 8 + v * 5);
    cp.setXYZ(i, x, y, z);
  }
  cg.computeVertexNormals();
  const cloak = new THREE.Mesh(cg, cloakMat);
  cloak.castShadow = true; cloak.receiveShadow = true;
  hero.add(cloak);

  // scarf tails streaming left
  const tail = (offset, w, len, phase) => {
    const geo = new THREE.PlaneGeometry(1, 1, 1, 40);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const side = p.getX(i);          // -0.5..0.5 across
      const t = 0.5 - p.getY(i);       // 0 at neck .. 1 at tip
      const cx = 0.35 + offset + len * t;
      const cy = 4.05 - 0.55 * t + 0.25 * Math.sin(t * 5 + phase) * t;
      const cz = -0.55 - 0.9 * t + 0.18 * Math.sin(t * 7 + phase);
      const twist = 0.8 + t * 1.5;
      p.setXYZ(i, cx + side * w * 0.25 * Math.cos(twist), cy + side * w * Math.cos(twist * 0.5), cz + side * w * Math.sin(twist));
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, rimMat({ color: 0x3a1460, roughness: 0.75, side: THREE.DoubleSide, alphaMap: tatterTexture(seed + 9 + phase, { bottom: 0.86, teeth: 3, holes: 1, slits: 1 }), alphaTest: 0.5 }, RIM));
    m.castShadow = true;
    hero.add(m);
  };
  tail(0.0, 0.42, 2.4, 0.0);
  tail(0.1, 0.34, 1.8, 1.7);

  // ---- greatsword on the back ----
  const sword = new THREE.Group();
  sword.position.set(-0.86, 4.32, -0.84);
  const dir = new THREE.Vector3(1.0, -1.42, -0.3).normalize();   // blade direction (down-left, toward camera)
  const yAx = dir.clone().negate();
  const zAx = new THREE.Vector3(0, 0, -1).addScaledVector(yAx, yAx.z).normalize();
  const xAx = new THREE.Vector3().crossVectors(yAx, zAx).normalize();
  zAx.crossVectors(xAx, yAx).normalize();
  sword.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAx, yAx, zAx));
  hero.add(sword);

  const BL = 4.3, BW = 0.5;
  const vein = veinTexture(seed + 40);
  vein.repeat.set(1 / (BW * 1.6), 1 / (BL + 0.1));
  vein.offset.set(0.5, 1.0);
  vein.wrapS = vein.wrapT = THREE.ClampToEdgeWrapping;
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x1c0836, roughness: 0.25, metalness: 0.5, emissive: 0xffffff, emissiveMap: vein, emissiveIntensity: 1.45 });
  const bg = new THREE.ExtrudeGeometry(bladeShape(BL, BW), { depth: 0.03, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.07, bevelSegments: 1 });
  bg.translate(0, 0, -0.015);
  const blade = new THREE.Mesh(bg, bladeMat);
  blade.position.y = -0.62;
  blade.castShadow = true;
  sword.add(blade);
  // outer glow shell
  const shellGeo = new THREE.ShapeGeometry(bladeShape(BL * 1.04, BW * 1.9));
  const shell = new THREE.Mesh(shellGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9a40ff).multiplyScalar(0.5), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  shell.position.set(0, -0.6, 0.09);
  shell.renderOrder = 9;
  sword.add(shell);

  const guardMat = rimMat({ color: 0x2b2836, roughness: 0.28, metalness: 1.0 }, RIM);
  const guard = new THREE.Mesh(new THREE.ExtrudeGeometry(guardShape(), { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 }), guardMat);
  guard.position.set(0, -0.55, -0.05); guard.scale.set(1.15, 1.0, 1);
  guard.castShadow = true;
  sword.add(guard);
  const gemMat = new THREE.MeshStandardMaterial({ color: 0x3a0a70, emissive: 0x8a2cff, emissiveIntensity: 1.3, roughness: 0.15, metalness: 0.2 });
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), gemMat);
  gem.position.set(0, -0.5, 0.1); gem.scale.set(0.8, 1.2, 0.6);
  sword.add(gem);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.95, 8), leather);
  grip.position.y = -0.02; grip.castShadow = true;
  sword.add(grip);
  for (let i = 0; i < 6; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.083, 0.018, 4, 12), guardMat);
    ring.rotation.x = Math.PI / 2; ring.position.y = -0.38 + i * 0.15; ring.rotation.z = 0.2;
    sword.add(ring);
  }
  const pommel = new THREE.Mesh(new THREE.OctahedronGeometry(0.15), guardMat);
  pommel.position.y = 0.55; pommel.scale.set(1, 1.4, 1);
  sword.add(pommel);
  const pgem = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), gemMat);
  pgem.position.set(0, 0.55, 0.1);
  sword.add(pgem);

  // baldric strap across the back, following the sword
  const strap = rb(0.2, 2.9, 0.05, 0.02, leather);
  strap.position.set(0.05, 3.2, -TD / 2 - 0.08);
  strap.rotation.z = Math.atan2(1.0, 1.42);
  hero.add(strap);
  const strapBuckle = rb(0.3, 0.3, 0.06, 0.03, metal);
  strapBuckle.position.set(0.15, 3.05, -TD / 2 - 0.11); strapBuckle.rotation.z = strap.rotation.z;
  hero.add(strapBuckle);

  hero.userData = { sword, blade, BL, BW, head, cloak };
  return hero;
}

// World-space points along the blade's center line (t = 0 guard .. 1 tip)
export function bladePoint(hero, t, side = 0) {
  const { sword, BL, BW } = hero.userData;
  const p = new THREE.Vector3(side * BW * 0.5 * (1 - t * 0.8), -0.62 - BL * t, 0.02);
  return sword.localToWorld(p);
}
