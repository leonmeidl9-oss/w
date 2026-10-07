import * as THREE from 'three';
import { installFog } from '../fog.js';
import { buildSkyDome, skyEnvironment } from '../sky2.js';
import { rng, screenToWorld } from '../util.js';
import { glowQuad, glowPoints, ribbon, flameQuad } from '../fx.js';
import { pineTree, cliffRing, standingStone, dolmen, candle, grassField, grassTexture, cobbleTexture } from '../village.js';
import { buildAvatar, holdItem, aimItem } from '../avatar.js';
import { buildSword } from '../sword.js';

const RIM = { right: 0xffa060, left: 0xb070ff, strengthR: 0.4, strengthL: 0.35, power: 2.4 };

// Thumbnail 5: two blades meet inside the old stone circle at sunset.
export function build({ W, H, DPR, q, want, renderer }) {
  installFog({
    resX: W * DPR, resY: H * DPR,
    density: 0.0065, start: 18, max: 0.75,
    left: 0x4a2a5a, right: 0x8a3a30,
    splitA: 0.25, splitB: 0.75,
    mistTop: 1.2, mistBottom: -3, mistNear: 25, mistFar: 80, mistMax: 0.45,
    mistLeft: 0x6a3a6a, mistRight: 0xa0503a,
  });
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.001);   // only switches fog on; look is defined in fog.js

  const cam = new THREE.PerspectiveCamera(+(q.get('fov') || 44), W / H, 0.1, 9000);
  cam.position.set(-4.6, 4.4, 10.8);
  cam.lookAt(new THREE.Vector3(0.4, 4.6, -3));
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  const S = (sx, sy, d) => { const p = screenToWorld(cam, sx, sy, d); p.y = 0.1; return p; };

  const sunDir = new THREE.Vector3(0.3, 0.08, -1).normalize();
  const sky = buildSkyDome({
    zenith: 0x120c30, horizon: 0xff6a3a, below: 0x140a10,
    sunDir, sunColor: 0xffa860, sunSize: 0.05, sunGlow: 1.6,
    clouds: 0.8, cloudDark: 0x2a1030, cloudLit: 0xff9a7a, cloudScale: 0.55, cloudSeed: 2.2,
    horizonGlow: 1.2, horizonGlowColor: 0xff5a2a,
  });
  sky.position.copy(cam.position);
  scene.add(sky);
  scene.environment = skyEnvironment(renderer, sky);
  scene.environmentIntensity = 0.45;

  // ---------- lights: low sun behind the fighters ----------
  scene.add(new THREE.HemisphereLight(0x8a5aa8, 0x2a160e, 0.75));
  const sun = new THREE.DirectionalLight(0xffa060, 3.2);
  sun.position.copy(sunDir).multiplyScalar(80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 250 });
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  const front = new THREE.DirectionalLight(0x9a8aff, 1.3);   // cool fill from the camera side
  front.position.set(-6, 8, 20);
  scene.add(front);

  const r = rng(55);

  // ---------- ground: grass and the stone circle floor ----------
  const grass = grassTexture(4, { a: [60, 96, 34], b: [110, 132, 44] });
  grass.repeat.set(50, 50);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(400, 48), new THREE.MeshStandardMaterial({ map: grass, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const floorTex = cobbleTexture(17, { base: [214, 168, 156], mortar: [120, 90, 86], cells: 60 });
  floorTex.repeat.set(3, 3);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9.5, 64), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.8 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.03;
  floor.receiveShadow = true;
  scene.add(floor);
  // carved rune ring on the floor
  const ring = new THREE.Mesh(new THREE.RingGeometry(6.6, 6.85, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb050).multiplyScalar(1.4), transparent: true, opacity: 0.8 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05;
  scene.add(ring);

  // ---------- standing stones with candles ----------
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.13;
    const p = new THREE.Vector3(Math.cos(a) * 11.5, 0, Math.sin(a) * 11.5);
    if (p.z > 5 && p.x < 4) continue;   // keep the camera side open
    const st = standingStone(400 + i, { h: 5 + r() * 2.5, w: 1.3 + r() * 0.4 });
    st.position.copy(p);
    st.rotation.y = -a + (r() - 0.5) * 0.3;
    scene.add(st);
    const cd = candle({ h: 0.4 + r() * 0.3 });
    cd.position.copy(p).multiplyScalar(0.86);
    scene.add(cd);
    const fp = cd.localToWorld(cd.userData.flame.clone());
    scene.add(flameQuad(cam, fp, 0.28, 0.5, new THREE.Color(0xffa040).multiplyScalar(1.2), 0.9));
    scene.add(glowQuad(cam, fp.clone().add(new THREE.Vector3(0, 0.2, 0)), 1.2, new THREE.Color(0xff9a40), 0.3));
  }
  const gate = dolmen(7, { rim: RIM });
  gate.position.set(-7.5, 0, -18);
  gate.rotation.y = 0.35;
  scene.add(gate);
  gate.updateMatrixWorld(true);
  const gl = gate.localToWorld(gate.userData.light.clone());
  scene.add(glowQuad(cam, gl, 4, new THREE.Color(0xffd25a), 0.5));

  // ---------- backdrop: pines and canyon walls ----------
  for (let i = 0; i < 50; i++) {
    const a = r() * Math.PI * 2, rad = 22 + r() * 40;
    const p = new THREE.Vector3(Math.cos(a) * rad, 0, Math.sin(a) * rad);
    if (p.z > 0 && Math.abs(p.x) < 20) continue;
    const t = pineTree(500 + i, { h: 8 + r() * 8, rim: RIM });
    t.position.copy(p);
    scene.add(t);
  }
  scene.add(cliffRing(23, { radius: 95, height: 30, thickness: 20, rim: RIM }));

  if (want('grass')) {
    scene.add(grassField(31, {
      count: 26000, h: [0.6, 1.4], colA: 0x5a7a2a, colB: 0xc0b048, rim: RIM,
      place: (rr) => {
        const a = rr() * Math.PI * 2, rad = 9.7 + rr() * 20;
        const p = new THREE.Vector3(Math.cos(a) * rad, 0, Math.sin(a) * rad);
        return p.distanceTo(cam.position) > 4 ? p : null;
      },
    }));
  }

  // ---------- the duel ----------
  const fighters = new THREE.Group();
  scene.add(fighters);
  const hero = buildAvatar({
    seed: 3, skin: 0xe6b48a, shirt: 0x231d33, pants: 0x17141f, shoes: 0x2a1d18, belt: 0x2a1d18, buckle: 0xb8a0e0, sleeves: 'long', gloves: 0x2a2236,
    hair: 'spiky', hairColor: 0x15101e, face: { brows: 'angry', mouth: 'grin' },
    pauldrons: 0x3a3650,
    rim: { right: 0xffa060, left: 0xb070ff, strengthR: 0.6, strengthL: 0.4, power: 2.2 },
    pose: { armR: [-1.65, 0, 0.12], armL: [0.55, 0, 0.18], legR: [0.4, 0, 0.04], legL: [-0.45, 0, -0.04], lean: 0.12 },
  });
  const heroAt = S(0.2, 0.92, 8.0), rivalAt = S(0.7, 0.8, 15.0);
  hero.position.copy(heroAt);
  hero.rotation.y = Math.atan2(rivalAt.x - heroAt.x, rivalAt.z - heroAt.z) + 0.1;
  fighters.add(hero);
  const heroSword = buildSword({ length: 3.9, width: 0.46, style: 'crystal', blade: 0x1c0836, metalness: 0.5, roughness: 0.25, glow: 0xa040ff, veins: { seed: 43 }, glowIntensity: 1.6, guard: 0x2b2836, gem: 0x8a2cff });
  const heroHold = holdItem(hero, 'R', heroSword, { rx: 2.25, offset: 0.5 });

  const rival = buildAvatar({
    seed: 9, skin: 0xd8a07a, shirt: 0x5a1414, pants: 0x241414, shoes: 0x1a1010, belt: 0x2a1410, buckle: 0xe0a030, sleeves: 'long',
    armor: 0x7a1818, pauldrons: 0x8a2020, hat: 'helmet', hatColor: 0x3a1a1a,
    face: { brows: 'angry', mouth: 'frown', eyeGlow: '#ff7a20', scar: true },
    rim: { right: 0xffa060, left: 0xb070ff, strengthR: 0.6, strengthL: 0.4, power: 2.2 },
    pose: { armR: [-1.65, 0, -0.12], armL: [0.5, 0, -0.18], legL: [0.4, 0, -0.04], legR: [-0.45, 0, 0.04], lean: 0.12, headX: 0.05 },
  });
  rival.position.copy(rivalAt);
  rival.rotation.y = Math.atan2(heroAt.x - rivalAt.x, heroAt.z - rivalAt.z) + 0.35;
  fighters.add(rival);
  const rivalSword = buildSword({ length: 4.0, width: 0.5, style: 'flame', blade: 0x3a1206, metalness: 0.5, roughness: 0.3, glow: 0xff5a10, glowIntensity: 1.6, edgeLit: true, shell: 0.3, guard: 0x1a1414, guardWidth: 1.3, gem: 0xff3a10 });
  const rivalHold = holdItem(rival, 'R', rivalSword, { rx: 2.25, offset: 0.5 });
  scene.updateMatrixWorld(true);
  // aim both blades at a shared point between the fighters, above their hands
  const hHand = hero.userData.arms.R.hand.getWorldPosition(new THREE.Vector3());
  const rHand = rival.userData.arms.R.hand.getWorldPosition(new THREE.Vector3());
  const meet = hHand.clone().lerp(rHand, 0.45).add(new THREE.Vector3(0, 2.0, 0));
  // both blades aim at the same point, so they cross there
  aimItem(heroHold, heroSword, meet);
  aimItem(rivalHold, rivalSword, meet);
  scene.updateMatrixWorld(true);

  // where the blades cross: closest points of the two blade lines
  const segOf = (sw, len) => [sw.localToWorld(new THREE.Vector3(0, 0.2, 0)), sw.localToWorld(new THREE.Vector3(0, len, 0))];
  const [a0, a1] = segOf(heroSword, 3.9), [b0, b1] = segOf(rivalSword, 4.0);
  const clash = new THREE.Vector3();
  {
    const u = a1.clone().sub(a0), v = b1.clone().sub(b0), w0 = a0.clone().sub(b0);
    const A = u.dot(u), B = u.dot(v), C = v.dot(v), D = u.dot(w0), E = v.dot(w0);
    const den = A * C - B * B;
    const s = THREE.MathUtils.clamp((B * E - C * D) / den, 0, 1), t = THREE.MathUtils.clamp((A * E - B * D) / den, 0, 1);
    clash.copy(a0.clone().addScaledVector(u, s)).add(b0.clone().addScaledVector(v, t)).multiplyScalar(0.5);
  }

  // impact: flash, flare streaks, sparks, shockwave ring
  const flashL = new THREE.PointLight(0xfff0d0, 14, 0, 2);
  flashL.position.copy(clash).add(new THREE.Vector3(0, 0, 1.2));
  scene.add(flashL);
  scene.add(glowQuad(cam, clash, 2.0, new THREE.Color(1.1, 0.95, 0.85), 0.35));
  scene.add(glowQuad(cam, clash, 0.6, new THREE.Color(2.0, 1.8, 1.6), 0.8));
  for (const [dx, dy, len, w, col] of [[1, 0, 3.4, 0.04, [2.0, 1.7, 1.5]], [0, 1, 1.8, 0.03, [1.8, 1.6, 1.6]], [0.7, 0.7, 1.2, 0.025, [2.2, 1.1, 2.4]], [0.7, -0.7, 1.2, 0.025, [2.4, 1.3, 0.5]]]) {
    const dir = new THREE.Vector3(dx, dy, 0).normalize();
    scene.add(ribbon(cam, [clash.clone().addScaledVector(dir, -len / 2), clash.clone(), clash.clone().addScaledVector(dir, len / 2)], (t) => w * Math.sin(t * Math.PI) * 2, new THREE.Color(...col)));
  }
  const P = [], C = [], Z = [];
  for (let i = 0; i < 360; i++) {
    const dir = new THREE.Vector3(r() - 0.5, r() - 0.35, (r() - 0.5) * 0.6).normalize();
    const d = r() ** 0.6 * 3.6;
    const p = clash.clone().addScaledVector(dir, d);
    p.y -= d * d * 0.05;
    P.push(p.x, p.y, p.z);
    const purple = p.x < clash.x;
    if (purple) C.push(1.8, 0.8, 3.0); else C.push(3.0, 1.3, 0.3);
    Z.push(0.035 + r() * 0.06);
  }
  scene.add(glowPoints(P, C, Z));
  for (let i = 0; i < 60; i++) {
    const dir = new THREE.Vector3(r() - 0.5, r() - 0.3, (r() - 0.5) * 0.5).normalize();
    const d0 = 0.3 + r() * 1.4, len = 0.4 + r() * 0.9;
    const pts = [];
    for (let k = 0; k <= 4; k++) { const d = d0 + len * k / 4; const p = clash.clone().addScaledVector(dir, d); p.y -= d * d * 0.05; pts.push(p); }
    const purple = dir.x < 0;
    scene.add(ribbon(cam, pts, (t) => 0.05 * (0.2 + t), purple ? new THREE.Color(1.6, 0.8, 3.0) : new THREE.Color(3.0, 1.5, 0.4)));
  }
  const shock = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.015, 6, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.4, 1.3), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
  shock.position.copy(clash);
  shock.lookAt(cam.position);
  scene.add(shock);

  // swing trails behind each blade
  const trail = (center, r0, a0, a1, col, z) => {
    const pts = [];
    for (let k = 0; k <= 24; k++) {
      const a = a0 + (a1 - a0) * k / 24;
      pts.push(new THREE.Vector3(center.x + Math.cos(a) * r0, center.y + Math.sin(a) * r0, z));
    }
    scene.add(ribbon(cam, pts, (t) => 0.42 * Math.pow(t, 1.5) * (1 - 0.6 * t), col, { opacity: 0.5 }));
  };
  const hs = hero.userData.arms.R.pivot.localToWorld(new THREE.Vector3(0, 0, 0));
  const rs = rival.userData.arms.R.pivot.localToWorld(new THREE.Vector3(0, 0, 0));
  const tipA = Math.atan2(a1.y - hs.y, a1.x - hs.x), tipB = Math.atan2(b1.y - rs.y, b1.x - rs.x);
  trail(hs, a1.distanceTo(hs) * 0.97, tipA + 0.75, tipA + 0.05, new THREE.Color(1.2, 0.4, 2.6), clash.z - 0.2);
  trail(rs, b1.distanceTo(rs) * 0.97, tipB - 0.75, tipB - 0.05, new THREE.Color(2.6, 0.9, 0.2), clash.z - 0.25);

  // sword glow lights
  const hl = new THREE.PointLight(0xa64dff, 10, 0, 2); hl.position.copy(heroSword.localToWorld(new THREE.Vector3(0, 1.5, 0.8))); scene.add(hl);
  const rl = new THREE.PointLight(0xff6a20, 10, 0, 2); rl.position.copy(rivalSword.localToWorld(new THREE.Vector3(0, 1.5, 0.8))); scene.add(rl);

  // dust kicked up at their feet + floating embers
  const D = [], DC = [], DZ = [];
  for (let i = 0; i < 120; i++) {
    D.push((r() - 0.5) * 9, r() * 1.2, (r() - 0.5) * 3);
    DC.push(0.9, 0.55, 0.35);
    DZ.push(0.08 + r() * 0.12);
  }
  for (let i = 0; i < 120; i++) {
    D.push((r() - 0.5) * 30, 1 + r() * 10, -5 - r() * 20);
    DC.push(2.4, 1.0, 0.3);
    DZ.push(0.05 + r() * 0.06);
  }
  scene.add(glowPoints(D, DC, DZ, { opacity: 0.6 }));

  return {
    scene, camera: cam,
    logo: { cx: 960, cy: 958, size: 112, gap: 58 },
    post: { bloomStrength: 0.75, bloomRadius: 0.55, bloomThreshold: 0.88, vignette: 0.5 },
  };
}
