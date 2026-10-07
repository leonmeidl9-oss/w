import * as THREE from 'three';
import { rng, rimMat } from './util.js';
import { rockify, lavaTextures } from './rock.js';

// Colossal blocky stone titan with lava veins, burning eyes, a jagged crown and
// a giant sword. Local space: feet at y = 0, faces +Z. Roughly 330 units tall.
export function buildTitan(seed = 21) {
  const r = rng(seed);
  const g = new THREE.Group();
  const { map, emissiveMap } = lavaTextures(seed, { size: 512, cells: 22, crackWidth: 0.013, coverage: 0.42 });
  const mat = rimMat(
    { map, emissiveMap, emissive: 0xffffff, emissiveIntensity: 2.6, roughness: 0.92, flatShading: true, color: 0x6a6472 },
    { right: 0xff2a1a, left: 0xff3a2a, strengthR: 0.9, strengthL: 0.45, power: 2.2 });
  mat.defines = { FOG_SCALE: '0.62' };
  const dark = rimMat({ color: 0x1c1a22, roughness: 0.8, flatShading: true, metalness: 0.3 },
    { right: 0xff2a1a, left: 0xff3a2a, strengthR: 1.4, strengthL: 0.8, power: 2.0 });
  dark.defines = { FOG_SCALE: '0.62' };
  const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff3020).multiplyScalar(14) });
  eyeMat.defines = { FOG_SCALE: '0.15' };
  const runeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a12).multiplyScalar(6) });
  runeMat.defines = { FOG_SCALE: '0.3' };

  let sd = seed * 10;
  const block = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0, parent = g, amp = null) => {
    const seg = Math.max(2, Math.round(Math.max(w, h, d) / 12));
    const geo = rockify(new THREE.BoxGeometry(w, h, d, seg, seg, seg), {
      amp: amp ?? Math.min(w, h, d) * 0.22, freq: 0.045, seed: sd++, uvScale: 1 / 70,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
    parent.add(m);
    return m;
  };
  const spike = (len, rad, parent, x, y, z, rx, rz, material = dark) => {
    const geo = rockify(new THREE.ConeGeometry(rad, len, 5, 3), { amp: rad * 0.35, freq: 0.08, seed: sd++, uvScale: 1 / 70 });
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z); m.rotation.set(rx, 0, rz);
    parent.add(m);
    return m;
  };

  // legs and hips (mostly swallowed by the mist)
  block(46, 120, 50, -30, 60, 0, 0, 0.1, 0.03);
  block(46, 120, 50, 32, 60, 4, 0, -0.1, -0.03);
  block(84, 44, 56, 0, 132, 0);

  // torso (hunched forward)
  const torso = new THREE.Group();
  torso.position.set(0, 150, 0);
  torso.rotation.x = 0.16;
  g.add(torso);
  block(74, 46, 52, 0, 26, 0, 0, 0, 0, torso);
  block(118, 80, 64, 0, 86, 2, 0, 0, 0, torso);
  // chest plates / boulders
  block(46, 40, 20, -26, 96, 34, 0.1, 0.15, 0.05, torso);
  block(46, 40, 20, 26, 98, 34, 0.1, -0.15, -0.05, torso);
  block(40, 26, 16, 0, 56, 33, 0, 0, 0, torso);
  // back spikes
  for (let i = 0; i < 6; i++) {
    spike(28 + r() * 26, 7 + r() * 4, torso, (r() - 0.5) * 90, 112 + r() * 12, -22 - r() * 10, -0.5 - r() * 0.4, (r() - 0.5) * 0.8);
  }

  // head
  const head = new THREE.Group();
  head.position.set(0, 132, 18);
  torso.add(head);
  block(40, 38, 38, 0, 18, 0, -0.1, 0, 0, head, 4);
  block(30, 12, 16, 0, 4, 18, 0, 0, 0, head, 2.5);    // jaw
  // brow ridge
  block(42, 8, 12, 0, 26, 19, 0.2, 0, 0, head, 2);
  // angry eyes (slanted inward)
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(10, 3.2, 2), eyeMat);
    e.position.set(s * 9.5, 20.5, 19.6);
    e.rotation.z = s * -0.32;
    head.add(e);
  }
  // jagged crown of spikes
  const crown = [[0, 62, 10, 0.05, 0], [-12, 48, 8, -0.05, 0.3], [12, 50, 8, 0.05, -0.3], [-21, 38, 7, 0, 0.65], [21, 40, 7, 0, -0.65], [-6, 34, 6, -0.45, 0.18], [7, 32, 6, -0.45, -0.15], [-17, 26, 5, 0.3, 0.9], [17, 27, 5, 0.3, -0.9]];
  for (const [x, len, rad, rx, rz] of crown) spike(len, rad, head, x, 36 + len * 0.42, -2, rx, rz);

  // shoulders with spiked pauldrons
  for (const s of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(s * 70, 118, 4);
    torso.add(sh);
    block(56, 44, 58, 0, 0, 0, 0, 0, s * -0.18, sh, 6);
    for (let i = 0; i < 3; i++) spike(30 + i * 8, 7, sh, s * (8 + i * 9), 26 + i * 3, -6 + i * 6, -0.2, s * (-0.5 - i * 0.18));
  }

  // ---- guardian pose: both fists on the grip of a giant sword planted in front ----
  g.updateMatrixWorld(true);
  const shoulderR = torso.localToWorld(new THREE.Vector3(-80, 104, 6));
  const shoulderL = torso.localToWorld(new THREE.Vector3(80, 104, 6));
  const gripX = 0, gripZ = 118;
  const fistHi = new THREE.Vector3(gripX, 226, gripZ), fistLo = new THREE.Vector3(gripX, 182, gripZ + 4);

  // two-segment limb from a shoulder to a fist, elbow pushed out along bendDir
  const limb = (from, to, bendDir, upperW, lowerW) => {
    const mid = from.clone().lerp(to, 0.5).addScaledVector(bendDir, from.distanceTo(to) * 0.28);
    const seg = (a, b, w, d) => {
      const len = a.distanceTo(b);
      const m = block(w, len + w * 0.3, d, 0, 0, 0);
      m.position.copy(a).lerp(b, 0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      return m;
    };
    seg(from, mid, upperW, upperW + 2);
    seg(mid, to, lowerW, lowerW);
    return mid;
  };
  const elbowR = limb(shoulderR, fistHi.clone().add(new THREE.Vector3(-18, 6, 0)), new THREE.Vector3(-0.85, -0.35, -0.2).normalize(), 36, 42);
  const elbowL = limb(shoulderL, fistLo.clone().add(new THREE.Vector3(18, 6, 0)), new THREE.Vector3(0.85, -0.45, -0.2).normalize(), 36, 42);
  // forearm spikes at the elbows
  for (const [e, sgn] of [[elbowR, -1], [elbowL, 1]]) {
    for (let i = 0; i < 3; i++) spike(18 + i * 5, 6, g, e.x + sgn * 16, e.y - 10 - i * 12, e.z - 6, 0.3, sgn * -1.3);
  }
  const fist = block(50, 42, 50, fistHi.x, fistHi.y, fistHi.z, 0, 0, 0, g, 5);
  block(50, 42, 50, fistLo.x, fistLo.y, fistLo.z, 0, 0, 0, g, 5);

  // the giant sword
  const sword = new THREE.Group();
  sword.position.set(gripX, 0, gripZ + 2);
  sword.rotation.x = -0.05;
  g.add(sword);
  const swordMat = rimMat({ color: 0x4a4452, roughness: 0.5, metalness: 0.45, flatShading: true },
    { right: 0xff3322, left: 0xff3322, strengthR: 1.2, strengthL: 0.8, power: 1.8 });
  swordMat.defines = { FOG_SCALE: '0.6' };
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 110, 6), dark); grip.position.y = 200; sword.add(grip);
  const pommel = new THREE.Mesh(new THREE.OctahedronGeometry(15), dark); pommel.position.y = 262; pommel.scale.set(1, 1.3, 1); sword.add(pommel);
  const pg = new THREE.Mesh(new THREE.OctahedronGeometry(6), runeMat); pg.position.set(0, 262, 11); sword.add(pg);
  const guardY = 146;
  const guard = new THREE.Mesh(new THREE.BoxGeometry(120, 13, 18), swordMat); guard.position.y = guardY; sword.add(guard);
  for (const s2 of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.ConeGeometry(9, 34, 4), swordMat);
    tip.position.set(s2 * 66, guardY + 10, 0); tip.rotation.z = s2 * -0.75; sword.add(tip);
    const hook = new THREE.Mesh(new THREE.ConeGeometry(6, 22, 4), swordMat);
    hook.position.set(s2 * 30, guardY - 14, 0); hook.rotation.z = s2 * 2.6; sword.add(hook);
  }
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(9), runeMat); gem.position.set(0, guardY, 10); sword.add(gem);
  const BL = 330, BW = 46;
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-BW / 2, 0);
  bladeShape.lineTo(BW / 2, 0);
  bladeShape.lineTo(BW / 2 * 0.95, -BL * 0.5);
  bladeShape.lineTo(BW / 2 * 1.2, -BL * 0.58);
  bladeShape.lineTo(BW / 2 * 0.85, -BL * 0.78);
  bladeShape.lineTo(0, -BL);
  bladeShape.lineTo(-BW / 2 * 0.85, -BL * 0.82);
  bladeShape.lineTo(-BW / 2 * 1.15, -BL * 0.7);
  bladeShape.lineTo(-BW / 2 * 0.95, -BL * 0.62);
  bladeShape.lineTo(-BW / 2 * 0.95, -BL * 0.3);
  bladeShape.closePath();
  const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(bladeShape, { depth: 4, bevelEnabled: true, bevelThickness: 3, bevelSize: 4, bevelSegments: 1 }), swordMat);
  blade.position.set(0, guardY - 6, -2);
  sword.add(blade);
  for (let i = 0; i < 9; i++) {
    const rune = new THREE.Mesh(new THREE.BoxGeometry(i % 2 ? 8 : 4, i % 3 ? 9 : 14, 1), runeMat);
    rune.position.set((i % 2 ? -1 : 1) * 2, guardY - 30 - i * 24, 5.6);
    rune.rotation.z = (i % 3 - 1) * 0.5;
    sword.add(rune);
  }
  // glowing cutting edges so the blade reads against the dark body
  for (const sgn of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(2.2, BL * 0.5, 2.0), runeMat);
    e.position.set(sgn * (BW / 2 * 0.95 + 3.2), guardY - 6 - BL * 0.25, 2);
    e.rotation.z = sgn * 0.004;
    sword.add(e);
  }
  const guardGlow = new THREE.Mesh(new THREE.BoxGeometry(110, 2.4, 2), runeMat);
  guardGlow.position.set(0, guardY - 7, 9.5); sword.add(guardGlow);

  g.userData.fist = fist;
  return g;
}

// Blocky rubble with lava cracks, for debris drifting around the titan.
export function buildDebris(seed, count, spread, sizeRange, mat) {
  const r = rng(seed);
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const s = sizeRange[0] + (sizeRange[1] - sizeRange[0]) * r() ** 2;
    const geo = rockify(new THREE.BoxGeometry(s, s * (0.6 + r() * 0.6), s * (0.7 + r() * 0.5), 2, 2, 2), { amp: s * 0.25, freq: 0.3 / s * 3, seed: seed * 100 + i, uvScale: 1 / 70 });
    const m = new THREE.Mesh(geo, mat);
    m.position.set((r() - 0.5) * spread[0], (r() - 0.5) * spread[1], (r() - 0.5) * spread[2]);
    m.rotation.set(r() * 6, r() * 6, r() * 6);
    g.add(m);
  }
  return g;
}
