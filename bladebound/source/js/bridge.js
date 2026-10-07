import * as THREE from 'three';
import { rng } from './util.js';

// Long stone arch bridge. Local: runs along +X from x = 0 to x = length,
// deck top at y = 0, width along Z (centered).
export function buildBridge({ length = 150, width = 10, arches = 5, pierDepth = 70 } = {}) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x3a3a48, roughness: 0.85, flatShading: true });
  const stone2 = new THREE.MeshStandardMaterial({ color: 0x2c2c38, roughness: 0.9, flatShading: true });
  const lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff5a20).multiplyScalar(6) });
  lamp.defines = { FOG_SCALE: '0.4' };

  const deck = 5;
  const span = length / arches;
  const pier = span * 0.28;
  const rad = (span - pier) / 2;
  // comb-shaped profile: deck on top, arch notches open toward the bottom
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(length, 0);
  shape.lineTo(length, -pierDepth);
  for (let i = arches - 1; i >= 0; i--) {
    const x0 = i * span + pier / 2, x1 = x0 + span - pier;
    const cx = (x0 + x1) / 2;
    const spring = -deck - rad;
    shape.lineTo(x1, -pierDepth);
    shape.lineTo(x1, spring);
    shape.absarc(cx, spring, rad, 0, Math.PI, false);
    shape.lineTo(x0, -pierDepth);
  }
  shape.lineTo(0, -pierDepth);
  shape.closePath();
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false, curveSegments: 12 }), stone);
  body.position.z = -width / 2;
  g.add(body);
  // pier cutwaters / buttresses
  for (let i = 0; i <= arches; i++) {
    const x = i * span;
    const b = new THREE.Mesh(new THREE.BoxGeometry(pier * 0.8, pierDepth * 0.85, width + 3), stone2);
    b.position.set(x, -deck - pierDepth * 0.45, 0);
    g.add(b);
  }
  // parapets with posts
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 1.2, 0.9), stone2);
    rail.position.set(length / 2, 2.6, s * (width / 2 - 0.4));
    g.add(rail);
    const n = Math.floor(length / 3.2);
    for (let i = 0; i <= n; i++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.4, 0.7), stone2);
      post.position.set(i * length / n, 1.2, s * (width / 2 - 0.4));
      g.add(post);
    }
  }
  // lamp posts
  for (let i = 0; i <= arches; i++) {
    const x = i * span;
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.8, 7, 0.8), stone2);
    pole.position.set(x, 3.5, width / 2 - 0.4);
    g.add(pole);
    const l = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 1.6), lamp);
    l.position.set(x, 7.6, width / 2 - 0.4);
    g.add(l);
  }
  // gatehouse towers at both ends
  const tower = (x, h) => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(12, h, 13), stone2);
    t.position.set(x, h / 2 - 8, 0);
    g.add(t);
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 13.4), stone2);
      m.position.set(x - 4.5 + i * 3, h - 8 + 1.3, 0);
      g.add(m);
    }
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.6, 0.5), lamp);
    win.position.set(x, h * 0.55 - 8, 6.8);
    g.add(win);
    const roofCone = new THREE.Mesh(new THREE.ConeGeometry(8.5, 14, 4), stone2);
    roofCone.position.set(x, h - 8 + 9.5, 0); roofCone.rotation.y = Math.PI / 4;
    g.add(roofCone);
  };
  tower(length + 4, 30);
  tower(-4, 24);
  return g;
}

// Ruined gothic watchtowers / broken walls for the mid-ground.
export function buildRuin(seed = 3, h = 30) {
  const r = rng(seed);
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x31313f, roughness: 0.9, flatShading: true });
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a18).multiplyScalar(4) });
  glow.defines = { FOG_SCALE: '0.4' };
  const t = new THREE.Mesh(new THREE.BoxGeometry(8, h, 8), stone);
  t.position.y = h / 2; g.add(t);
  // broken top: uneven merlons
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2 + r() * 5, 2.2), stone);
    const a = (i / 6) * Math.PI * 2;
    m.position.set(Math.cos(a) * 3.2, h + 1, Math.sin(a) * 3.2);
    g.add(m);
  }
  const w = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4, 0.4), glow);
  w.position.set(0, h * 0.6, 4.1); g.add(w);
  // arch fragment
  const arch = new THREE.Mesh(new THREE.TorusGeometry(7, 1.4, 4, 10, Math.PI * 0.7), stone);
  arch.position.set(10, h * 0.45, 0); arch.rotation.z = 0.2;
  g.add(arch);
  const col = new THREE.Mesh(new THREE.BoxGeometry(2.4, h * 0.5, 2.4), stone);
  col.position.set(17, h * 0.25, 0); g.add(col);
  return g;
}
