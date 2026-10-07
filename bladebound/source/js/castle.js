import * as THREE from 'three';
import { rng } from './util.js';

// Dark gothic castle with blood-red windows and energy veins.
// Local space: ground y = 0, facade faces +Z (toward the camera).
export function buildCastle(seed = 7) {
  const r = rng(seed);
  const g = new THREE.Group();

  const stone = new THREE.MeshStandardMaterial({ color: 0x343748, roughness: 0.82, flatShading: true });
  const stone2 = new THREE.MeshStandardMaterial({ color: 0x2a2c3b, roughness: 0.85, flatShading: true });
  const roof = new THREE.MeshStandardMaterial({ color: 0x1d1e2b, roughness: 0.6, metalness: 0.2, flatShading: true });
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2418).multiplyScalar(5.0) });
  glow.defines = { FOG_SCALE: '0.35' };
  const glowSoft = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff1a14).multiplyScalar(2.2) });
  glowSoft.defines = { FOG_SCALE: '0.45' };

  const add = (geo, mat, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.rotation.y = ry;
    g.add(m);
    return m;
  };

  // window slit facing roughly toward +Z on a cylinder tower
  const slit = (cx, cz, rad, y, ang, w = 0.9, h = 3.2, mat = glow) => {
    const m = add(new THREE.BoxGeometry(w, h, 0.6), mat, cx + Math.sin(ang) * (rad + 0.05), y, cz + Math.cos(ang) * (rad + 0.05), ang);
    // pointed arch top
    const top = add(new THREE.ConeGeometry(w * 0.72, w * 1.1, 4), mat, m.position.x, y + h / 2 + w * 0.4, m.position.z, ang + Math.PI / 4);
    top.scale.set(1, 1, 0.4);
    return m;
  };

  const spikeRing = (cx, cy, cz, rad, n, h, mat = roof) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.PI / n;
      add(new THREE.ConeGeometry(h * 0.16, h, 4), mat, cx + Math.cos(a) * rad, cy + h / 2, cz + Math.sin(a) * rad);
    }
  };

  const tower = (x, z, rad, h, spireH, { sides = 8, windows = 3, vein = false, crown = true } = {}) => {
    add(new THREE.CylinderGeometry(rad, rad * 1.08, h, sides), r() < 0.5 ? stone : stone2, x, h / 2, z, Math.PI / sides);
    // string courses
    for (let k = 1; k <= 2; k++) add(new THREE.CylinderGeometry(rad * 1.1, rad * 1.1, 0.8, sides), stone2, x, h * k / 3, z, Math.PI / sides);
    // machicolation / cornice
    add(new THREE.CylinderGeometry(rad * 1.22, rad * 1.02, 2.2, sides), stone, x, h + 0.6, z, Math.PI / sides);
    if (crown) spikeRing(x, h + 1.7, z, rad * 1.12, sides, Math.max(2.2, rad * 0.75));
    // spire
    const sp = add(new THREE.ConeGeometry(rad * 1.06, spireH, sides), roof, x, h + 1.7 + spireH / 2, z, Math.PI / sides);
    // little dormers on the spire
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      add(new THREE.ConeGeometry(rad * 0.28, spireH * 0.28, 4), roof, x + Math.cos(a) * rad * 0.7, h + 1.7 + spireH * 0.2, z + Math.sin(a) * rad * 0.7);
    }
    // finial
    add(new THREE.CylinderGeometry(0.12, 0.25, spireH * 0.35, 4), roof, x, h + 1.7 + spireH + spireH * 0.15, z);
    // windows
    for (let w = 0; w < windows; w++) {
      const y = h * (0.35 + 0.55 * (w + r() * 0.5) / windows);
      const ang = (r() - 0.5) * 1.3;
      slit(x, z, rad, y, ang, 0.7 + rad * 0.08, 2.4 + rad * 0.25);
    }
    if (vein) {
      const ang = (r() - 0.5) * 0.6;
      add(new THREE.BoxGeometry(0.35, h * 0.9, 0.3), glowSoft, x + Math.sin(ang) * (rad + 0.1), h * 0.5, z + Math.cos(ang) * (rad + 0.1), ang);
    }
    return sp;
  };

  const wall = (x1, z1, x2, z2, h, thick = 3, mat = stone2) => {
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const ang = Math.atan2(dx, dz);
    const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    const w = add(new THREE.BoxGeometry(thick, h, len), mat, cx, h / 2, cz, ang);
    // merlons
    const n = Math.floor(len / 2.4);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n - 0.5;
      add(new THREE.BoxGeometry(thick * 1.05, 1.6, 1.2), mat, cx + Math.sin(ang) * t * len, h + 0.8, cz + Math.cos(ang) * t * len, ang);
    }
    return w;
  };

  // ---- cathedral-like keep ----
  const keepW = 26, keepD = 34, keepH = 38;
  add(new THREE.BoxGeometry(keepW, keepH, keepD), stone, 0, keepH / 2, -16);
  // steep gable roof
  const gable = new THREE.Shape();
  gable.moveTo(-keepW / 2 - 1, 0); gable.lineTo(keepW / 2 + 1, 0); gable.lineTo(0, 24); gable.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(gable, { depth: keepD, bevelEnabled: false });
  add(roofGeo, roof, 0, keepH, -16 - keepD / 2);
  // front gable wall + rose window
  const fg = new THREE.Shape();
  fg.moveTo(-keepW / 2, 0); fg.lineTo(keepW / 2, 0); fg.lineTo(0, 22); fg.closePath();
  add(new THREE.ExtrudeGeometry(fg, { depth: 1.5, bevelEnabled: false }), stone, 0, keepH, 1.0);
  const rose = add(new THREE.TorusGeometry(4.2, 0.7, 6, 24), glow, 0, keepH - 6, 2.7);
  add(new THREE.CircleGeometry(3.5, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8a0c10).multiplyScalar(1.5) }), 0, keepH - 6, 2.6);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI;
    const spoke = add(new THREE.BoxGeometry(0.35, 7.4, 0.3), glow, 0, keepH - 6, 2.75);
    spoke.rotation.z = a;
  }
  rose.scale.set(1, 1, 0.5);
  // tall lancet windows on the facade
  for (const sx of [-7.5, 7.5]) {
    add(new THREE.BoxGeometry(2.0, 12, 0.6), glow, sx, keepH - 14, 1.2);
    add(new THREE.ConeGeometry(1.45, 2.4, 4), glow, sx, keepH - 7, 1.2, Math.PI / 4).scale.set(1, 1, 0.4);
  }
  // gate
  add(new THREE.BoxGeometry(6, 9, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff3a1a).multiplyScalar(1.6) }), 0, 4.5, 1.2);
  // buttresses with pinnacles along the nave
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const z = -4 - k * 8.5;
      const b = add(new THREE.BoxGeometry(2.2, keepH * 0.85, 3), stone2, side * (keepW / 2 + 1.6), keepH * 0.42, z);
      add(new THREE.ConeGeometry(1.0, 6, 4), roof, side * (keepW / 2 + 1.6), keepH * 0.85 + 3, z, Math.PI / 4);
      b.rotation.z = side * 0.06;
      slit(side * (keepW / 2 + 0.2), z - 4.2, 0, keepH * 0.55, side * Math.PI / 2, 1.1, 6);
    }
  }

  // ---- towers ----
  tower(0, -26, 7.5, 78, 46, { sides: 8, windows: 5, vein: true });          // great central tower
  tower(-13, 1, 5.6, 60, 36, { sides: 8, windows: 4, vein: true });           // twin facade towers
  tower(13, 1, 5.6, 64, 38, { sides: 8, windows: 4, vein: true });
  tower(-26, -8, 4.6, 48, 28, { sides: 6, windows: 3 });
  tower(27, -10, 4.8, 52, 30, { sides: 6, windows: 3, vein: true });
  tower(-17, -40, 4.4, 58, 30, { sides: 8, windows: 3 });
  tower(18, -42, 4.6, 66, 32, { sides: 8, windows: 3 });
  tower(-38, 2, 4.0, 34, 22, { sides: 6, windows: 2 });
  tower(39, 0, 4.2, 38, 22, { sides: 6, windows: 2, vein: true });
  tower(-33, -28, 3.6, 42, 22, { sides: 6, windows: 2 });
  tower(34, -30, 3.8, 46, 24, { sides: 6, windows: 2 });
  tower(-6, -48, 3.4, 50, 26, { sides: 6, windows: 2 });
  tower(7, -50, 3.2, 44, 22, { sides: 6, windows: 2 });
  // slender needle spires for a jagged silhouette
  for (let i = 0; i < 10; i++) {
    const x = (r() - 0.5) * 76, z = -10 - r() * 40;
    const h = 30 + r() * 30;
    tower(x, z, 1.6 + r() * 1.2, h, 14 + r() * 14, { sides: 4, windows: 1, crown: false });
  }

  // ---- curtain walls ----
  wall(-38, 2, -13, 2, 16);
  wall(13, 2, 39, 0, 17);
  wall(-38, 2, -33, -28, 14);
  wall(39, 0, 34, -30, 14);
  wall(-33, -28, -17, -40, 13);
  wall(34, -30, 18, -42, 13);
  // glowing wall slits
  for (let i = 0; i < 14; i++) {
    const x = (i < 7 ? -35 + i * 3.2 : 16 + (i - 7) * 3.2);
    add(new THREE.BoxGeometry(0.7, 2.2, 0.4), glow, x, 9 + r() * 3, 3.6);
  }

  // ---- lower town around the base ----
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI - Math.PI;   // front half mostly
    const rad = 46 + r() * 12;
    const x = Math.cos(a) * rad * 0.95, z = Math.sin(a) * rad * 0.35 + 8;
    const w = 4 + r() * 4, h = 4 + r() * 7, d = 4 + r() * 4;
    add(new THREE.BoxGeometry(w, h, d), stone2, x, h / 2, z, r() * 0.6);
    const rf = add(new THREE.ConeGeometry(Math.max(w, d) * 0.72, 4 + r() * 5, 4), roof, x, h + 2.5, z, Math.PI / 4 + r() * 0.6);
    rf.scale.y = 1.2;
    if (r() < 0.7) add(new THREE.BoxGeometry(0.8, 1.4, 0.3), glow, x + (r() - 0.5) * w * 0.5, h * 0.5, z + d / 2 + 0.2);
  }

  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return g;
}
