import * as THREE from 'three';
import { installFog } from '../fog.js';
import { buildSkyDome, skyEnvironment } from '../sky2.js';
import { rng, screenToWorld } from '../util.js';
import { glowQuad, glowPoints } from '../fx.js';
import { pineTree, cliffRing, rockChunk, portalGate, ringPortal, grassField, grassTexture, cobbleTexture } from '../village.js';
import { buildAvatar } from '../avatar.js';
import { buildSword } from '../sword.js';

const RIM = { right: 0x6ff0ff, left: 0x9a6bff, strengthR: 0.4, strengthL: 0.3, power: 2.6 };

// Thumbnail 4: the hero walks a moonlit path toward the great ice portal; the
// sealed world gates glow along the canyon wall behind it.
export function build({ W, H, DPR, q, want, renderer }) {
  installFog({
    resX: W * DPR, resY: H * DPR,
    density: 0.006, start: 22, max: 0.78,
    left: 0x14143a, right: 0x101e3a,
    splitA: 0.3, splitB: 0.8,
    mistTop: 1.5, mistBottom: -3, mistNear: 30, mistFar: 90, mistMax: 0.55,
    mistLeft: 0x22305a, mistRight: 0x1a3a50,
  });
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.001);   // only switches fog on; look is defined in fog.js

  const cam = new THREE.PerspectiveCamera(+(q.get('fov') || 46), W / H, 0.1, 9000);
  cam.position.set(-1.6, 3.4, 17);
  cam.lookAt(new THREE.Vector3(1.2, 4.6, -12));
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  const S = (sx, sy, d) => screenToWorld(cam, sx, sy, d);

  const moonDir = S(0.2, 0.17, 1).sub(cam.position).normalize();
  const sky = buildSkyDome({
    zenith: 0x03040f, horizon: 0x2a2060, below: 0x05060c,
    sunDir: moonDir, sunColor: 0x8a7ad0, sunGlow: 0.2,
    moonDir, moonSize: 0.065, moonColor: 0xe4ecff,
    stars: 1.3, aurora: 0.3, auroraA: 0x6a4dff, auroraB: 0xff4dd0,
    clouds: 0.3, cloudDark: 0x06060f, cloudLit: 0x40407a, cloudScale: 0.4, cloudSeed: 7.7,
    horizonGlow: 0.3, horizonGlowColor: 0x5a3aa0,
  });
  sky.position.copy(cam.position);
  scene.add(sky);
  scene.environment = skyEnvironment(renderer, sky);
  scene.environmentIntensity = 0.5;

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0x3a4a9a, 0x081008, 0.6));
  const moon = new THREE.DirectionalLight(0xa8b4ff, 1.4);
  moon.position.copy(moonDir).multiplyScalar(100);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 250 });
  moon.shadow.bias = -0.0006;
  scene.add(moon);

  const r = rng(44);

  // ---------- ground and path ----------
  const grass = grassTexture(9, { a: [34, 74, 34], b: [60, 104, 40] });
  grass.repeat.set(50, 50);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(400, 48), new THREE.MeshStandardMaterial({ map: grass, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  // winding gravel path from the camera to the portal
  const pathEnd = S(0.6, 0.62, 33); pathEnd.y = 0;
  const pathStart = new THREE.Vector3(cam.position.x - 1.5, 0, cam.position.z + 2);
  const pathPts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const p = pathStart.clone().lerp(pathEnd, t);
    p.x += Math.sin(t * Math.PI) * -2.6 + Math.sin(t * 7) * 0.4 * (1 - t);
    pathPts.push(p);
  }
  const curve = new THREE.CatmullRomCurve3(pathPts);
  const pathGeo = new THREE.BufferGeometry();
  const pv = [], puv = [], idx = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120;
    const p = curve.getPoint(t), tg = curve.getTangent(t);
    const side = new THREE.Vector3(-tg.z, 0, tg.x).normalize();
    const w = 2.3 - t * 0.6;
    pv.push(p.x + side.x * w, 0.03, p.z + side.z * w, p.x - side.x * w, 0.03, p.z - side.z * w);
    puv.push(0, t * 14, 1, t * 14);
    if (i < 120) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  pathGeo.setAttribute('position', new THREE.Float32BufferAttribute(pv, 3));
  pathGeo.setAttribute('uv', new THREE.Float32BufferAttribute(puv, 2));
  pathGeo.setIndex(idx);
  pathGeo.computeVertexNormals();
  const gravel = cobbleTexture(12, { base: [150, 152, 158], mortar: [80, 82, 90], cells: 160 });
  gravel.repeat.set(1, 1);
  const path = new THREE.Mesh(pathGeo, new THREE.MeshStandardMaterial({ map: gravel, roughness: 0.9 }));
  path.receiveShadow = true;
  scene.add(path);
  // small stone studs lining the path (as in the game)
  const studMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd6, roughness: 0.6 });
  for (let i = 1; i < 30; i++) {
    const t = i / 30;
    const p = curve.getPoint(t), tg = curve.getTangent(t);
    const side = new THREE.Vector3(-tg.z, 0, tg.x).normalize();
    for (const s of [-1, 1]) {
      const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.3, 10), studMat);
      stud.position.copy(p).addScaledVector(side, s * (2.6 - t * 0.6)); stud.position.y = 0.15;
      stud.castShadow = true;
      scene.add(stud);
    }
  }

  // ---------- the great ice portal ----------
  const portal = ringPortal({ radius: 5.2, rim: RIM });
  const pAt = S(0.6, 0.62, 33); pAt.y = 0;
  portal.position.copy(pAt);
  portal.rotation.y = Math.atan2(cam.position.x - portal.position.x, cam.position.z - portal.position.z) * 0.6;
  scene.add(portal);
  portal.updateMatrixWorld(true);
  const pc = portal.localToWorld(portal.userData.center.clone());
  const pl = new THREE.PointLight(0x6fe8ff, 140, 0, 2);
  pl.position.copy(pc).add(new THREE.Vector3(0, -1, 3));
  scene.add(pl);
  const pg = new THREE.PointLight(0x5aff9a, 40, 0, 2);
  pg.position.copy(portal.position).add(new THREE.Vector3(0, 0.8, 2.5));
  scene.add(pg);
  scene.add(glowQuad(cam, pc, 16, new THREE.Color(0x6fe8ff), 0.22));
  scene.add(glowQuad(cam, portal.position.clone().add(new THREE.Vector3(0, 0.8, 1.5)), 12, new THREE.Color(0x5aff9a), 0.28));
  // rocky dais under the portal
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const rc = rockChunk(70 + i, 2.6 + r() * 2, 1.2 + r(), 2.4 + r() * 2, { color: 0x6a6e7c, rim: RIM });
    rc.position.copy(portal.position).add(new THREE.Vector3(Math.cos(a) * 4.6, 0.3, Math.sin(a) * 2.6 - 0.6));
    scene.add(rc);
  }

  // ---------- sealed world gates along the canyon wall ----------
  const gateSpots = [];
  const gates = [[0xff9a3c, 'EMBERFALL'], [0xff5ad0, 'STORMREACH'], [0x7fc8ff, 'CELESTIA'], [0x9a5cff, 'VOIDSPIRE'], [0x5ff0e0, 'FROSTHOLD']];
  gates.forEach(([color, label], i) => {
    const gt = portalGate(60 + i, { color, label, glow: 1.6, rim: RIM });
    const at = S([0.1, 0.25, 0.8, 0.93, 0.4][i], 0.5, [58, 52, 50, 56, 70][i]); at.y = 0;
    gt.position.copy(at);
    gateSpots.push({ x: [0.1, 0.25, 0.8, 0.93, 0.4][i], d: at.distanceTo(cam.position) });
    gt.rotation.y = Math.atan2(cam.position.x - at.x, cam.position.z - at.z) * 0.8;
    gt.scale.setScalar(1.6);
    scene.add(gt);
    gt.updateMatrixWorld(true);
    const c = gt.localToWorld(gt.userData.center.clone());
    scene.add(glowQuad(cam, c, 12, new THREE.Color(color), 0.2));
    const l = new THREE.PointLight(color, 14, 0, 2);
    l.position.copy(c).add(new THREE.Vector3(0, 0, 3));
    scene.add(l);
  });

  // ---------- pines framing the path, canyon behind ----------
  for (let i = 0; i < 60; i++) {
    const z = 10 - r() * 70;
    const side = r() < 0.5 ? -1 : 1;
    const x = side * (6 + r() * 26) + (z < -20 ? side * 6 : 0);
    const p = new THREE.Vector3(x, 0, z);
    if (p.distanceTo(portal.position) < 10) continue;
    if (p.z < -40 && Math.abs(p.x) < 30) continue;
    if (p.distanceTo(cam.position) < 16) continue;
    const v = p.clone().project(cam);
    const sx = (v.x + 1) / 2;
    if (gateSpots.some((g) => Math.abs(sx - g.x) < 0.075 && p.distanceTo(cam.position) < g.d)) continue;
    const t = pineTree(300 + i, { h: 9 + r() * 9, rim: RIM });
    t.position.copy(p);
    scene.add(t);
  }
  const cliffs = cliffRing(17, { radius: 120, height: 34, thickness: 22, rim: RIM });
  cliffs.position.set(0, 0, 5);
  scene.add(cliffs);

  if (want('grass')) {
    scene.add(grassField(21, {
      count: 30000, h: [0.7, 1.7], colA: 0x2a5a26, colB: 0x7a9a38, rim: RIM,
      place: (rr) => {
        const p = new THREE.Vector3(-14 + rr() * 30, 0, 12 - rr() * 34);
        const t = THREE.MathUtils.clamp((16 - p.z) / 32, 0, 1);
        const c = curve.getPoint(t);
        if (Math.hypot(p.x - c.x, p.z - c.z) < 3.0 - t * 0.6) return null;
        if (p.distanceTo(portal.position) < 5.5) return null;
        return p.z < 13 ? p : null;
      },
    }));
  }

  // ---------- the hero, walking toward the portal ----------
  if (want('hero')) {
    const hero = buildAvatar({
      seed: 3, skin: 0xe6b48a, shirt: 0x231d33, pants: 0x17141f, shoes: 0x2a1d18, belt: 0x2a1d18, buckle: 0xb8a0e0, sleeves: 'long', gloves: 0x2a2236,
      hair: 'spiky', hairColor: 0x15101e, face: { brows: 'angry', mouth: 'smirk' },
      pauldrons: 0x3a3650,
      rim: { right: 0x6ff0ff, left: 0xa070ff, strengthR: 0.7, strengthL: 0.5, power: 2.2 },
      pose: { armR: [0.35, 0, -0.08], armL: [-0.4, 0, 0.08], legR: [-0.35, 0, 0], legL: [0.4, 0, 0], headY: 0.15 },
    });
    // greatsword strapped across the back
    const sword = buildSword({ length: 3.8, width: 0.46, style: 'crystal', blade: 0x1c0836, metalness: 0.5, roughness: 0.25, glow: 0xa040ff, veins: { seed: 43 }, glowIntensity: 1.5, guard: 0x2b2836, gem: 0x8a2cff });
    sword.position.set(-0.55, 1.75, -0.62);
    sword.rotation.set(0, 0, 2.55);
    hero.userData.torsoPivot.add(sword);
    const hp = S(0.34, 0.8, 12.5); hp.y = 0;
    hero.position.copy(hp);
    hero.rotation.y = Math.atan2(portal.position.x - hp.x, portal.position.z - hp.z);
    scene.add(hero);
    hero.updateMatrixWorld(true);
    const mid = sword.localToWorld(new THREE.Vector3(0, 1.8, 0));
    const sl = new THREE.PointLight(0xa64dff, 6, 0, 2);
    sl.position.copy(mid).add(new THREE.Vector3(0, 0.3, 1.2));
    scene.add(sl);
  }

  // ---------- magic motes swirling toward the portal, fireflies ----------
  const P = [], C = [], Z = [];
  for (let i = 0; i < 320; i++) {
    const a = r() * Math.PI * 2, rad = 1 + r() ** 0.6 * 9;
    const p = pc.clone().add(new THREE.Vector3(Math.cos(a) * rad, (r() - 0.4) * 7, Math.sin(a) * rad * 0.5 + 1));
    P.push(p.x, Math.max(0.3, p.y), p.z);
    const g = r();
    C.push(0.4 + g * 0.6, 1.6 + g, 2.2);
    Z.push(0.05 + r() * 0.1);
  }
  for (let i = 0; i < 140; i++) {
    const t = r();
    const c = curve.getPoint(t);
    P.push(c.x + (r() - 0.5) * 12, 0.4 + r() * 2.5, c.z + (r() - 0.5) * 6);
    C.push(1.4, 2.4, 0.8);
    Z.push(0.04 + r() * 0.05);
  }
  scene.add(glowPoints(P, C, Z));

  return {
    scene, camera: cam,
    logo: { cx: 960, cy: 948, size: 112, gap: 58 },
    post: { bloomStrength: 0.7, bloomRadius: 0.55, bloomThreshold: 0.88, vignette: 0.55 },
  };
}
