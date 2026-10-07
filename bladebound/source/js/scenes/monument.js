import * as THREE from 'three';
import { installFog } from '../fog.js';
import { buildSkyDome } from '../sky2.js';
import { rng, canvas, texFromCanvas, screenToWorld } from '../util.js';
import { glowQuad, glowPoints } from '../fx.js';
import { pineTree, cliffRing, lampPost, house, marketStall, portalGate, swordMonument, bannerPole, grassField, grassTexture, cobbleTexture } from '../village.js';
import { buildAvatar, holdItem } from '../avatar.js';
import { buildSword } from '../sword.js';
import { skyEnvironment } from '../sky2.js';

const RIM = { right: 0x8fd8ff, left: 0x9a7bff, strengthR: 0.35, strengthL: 0.3, power: 2.6 };

// soft vertical light beam (camera-facing quad)
function beam(camera, base, height, width, color, opacity) {
  const [c, ctx] = canvas(64, 256);
  const img = ctx.createImageData(64, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 64; x++) {
    const u = (x / 63 - 0.5) * 2, v = 1 - y / 255;
    const a = Math.exp(-u * u * 5) * Math.pow(1 - v, 1.6) * Math.min(1, v * 12 + 0.2);
    const i = (y * 64 + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = a * 255;
  }
  ctx.putImageData(img, 0, 0);
  const geo = new THREE.PlaneGeometry(width, height);
  geo.translate(0, height / 2, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texFromCanvas(c, { srgb: false }), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  m.position.copy(base);
  const d = camera.position.clone().sub(base); d.y = 0;
  m.rotation.y = Math.atan2(d.x, d.z);
  m.renderOrder = 12;
  return m;
}

// Thumbnail 2: the hub plaza at night, the giant sword monument blazing in the
// centre, lamp ring, banners, sealed world gates and the canyon walls.
export function build({ W, H, DPR, q, want, renderer }) {
  installFog({
    resX: W * DPR, resY: H * DPR,
    density: 0.0042, start: 18, max: 0.8,
    left: 0x0d1636, right: 0x141236,
    splitA: 0.3, splitB: 0.8,
    mistTop: 2, mistBottom: -6, mistNear: 40, mistFar: 120, mistMax: 0.5,
    mistLeft: 0x1a2a5a, mistRight: 0x221a4a,
  });
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.001);   // only switches fog on; look is defined in fog.js

  const cam = new THREE.PerspectiveCamera(+(q.get('fov') || 44), W / H, 0.1, 9000);
  cam.position.set(10.5, 2.1, 31);
  cam.lookAt(new THREE.Vector3(2.2, 8.6, 0));
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();

  const moonDir = new THREE.Vector3(-0.55, 0.42, -0.72).normalize();
  const sky = buildSkyDome({
    zenith: 0x02040e, horizon: 0x1a2a5c, below: 0x05070c,
    sunDir: moonDir, sunColor: 0x6a80c0, sunGlow: 0.12,
    moonDir, moonSize: 0.05, moonColor: 0xdfe8ff,
    stars: 1.0, aurora: 0.85, auroraA: 0x14ff9a, auroraB: 0x7a3cff,
    clouds: 0.35, cloudDark: 0x050814, cloudLit: 0x34446e, cloudScale: 0.45,
    horizonGlow: 0.25, horizonGlowColor: 0x3a4a9a,
  });
  sky.position.copy(cam.position);
  scene.add(sky);
  scene.environment = skyEnvironment(renderer, sky);
  scene.environmentIntensity = 0.55;

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0x3a4a8a, 0x0a1208, 0.75));
  const moon = new THREE.DirectionalLight(0xa8bcff, 1.5);
  moon.position.copy(moonDir).multiplyScalar(120);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 300 });
  moon.shadow.bias = -0.0005;
  scene.add(moon);
  const monLight = new THREE.PointLight(0x7fe6ff, 70, 0, 2);
  monLight.position.set(0, 9, 3);
  scene.add(monLight);
  const monLow = new THREE.PointLight(0x9ff0ff, 18, 0, 2);
  monLow.position.set(0, 2.6, 5);
  scene.add(monLow);

  const r = rng(12);

  // ---------- ground ----------
  const grassTex = grassTexture(3, { a: [40, 88, 34], b: [78, 120, 42] });
  grassTex.repeat.set(60, 60);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(400, 64), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const cob = cobbleTexture(5, { base: [188, 192, 198], mortar: [92, 96, 104] });
  cob.repeat.set(7, 7);
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(17, 72), new THREE.MeshStandardMaterial({ map: cob, roughness: 0.8 }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.02;
  plaza.receiveShadow = true;
  scene.add(plaza);

  // ---------- monument ----------
  const mon = swordMonument(4, { rim: RIM });
  scene.add(mon);
  const camFlat = (p) => { const d = cam.position.clone().sub(p); d.y = 0; return d.normalize(); };
  // glows around the blade, the halo and the pool
  for (const [y, s, o] of [[17, 5, 0.14], [12, 6, 0.1], [7, 6, 0.08], [2.2, 9, 0.12]]) scene.add(glowQuad(cam, new THREE.Vector3(0, y, 0).addScaledVector(camFlat(new THREE.Vector3()), 1.5), s, new THREE.Color(0x6fe0ff), o));
  scene.add(glowQuad(cam, new THREE.Vector3(0, 10.5, 0).addScaledVector(camFlat(new THREE.Vector3()), 3), 6.5, new THREE.Color(0xc8f6ff), 0.14));
  scene.add(beam(cam, new THREE.Vector3(0, 18, 0), 220, 6, new THREE.Color(0x7fe6ff), 0.22));
  scene.add(beam(cam, new THREE.Vector3(0, 18, 0), 260, 1.6, new THREE.Color(0xe0fbff), 0.35));

  // ---------- plaza ring: lamps and banners ----------
  // skip props that would stand between the camera and the monument
  const camXZ = new THREE.Vector2(cam.position.x, cam.position.z);
  const blocksMonument = (x, z) => {
    const toMon = new THREE.Vector2(0, 0).sub(camXZ), toP = new THREE.Vector2(x, z).sub(camXZ);
    return toP.length() < toMon.length() && Math.abs(toMon.angle() - toP.angle()) < 0.16;
  };
  const lampLights = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.1;
    if (blocksMonument(Math.cos(a) * 15, Math.sin(a) * 15)) continue;
    const lp = lampPost({ rim: RIM });
    lp.position.set(Math.cos(a) * 15, 0, Math.sin(a) * 15);
    lp.rotation.y = -a;
    scene.add(lp);
    const L = lp.localToWorld(lp.userData.light.clone());
    scene.add(glowQuad(cam, L, 2.2, new THREE.Color(0xffc870), 0.3));
    lampLights.push(L);
  }
  // warm light from the lamps closest to the camera
  lampLights.map((p) => [p, p.distanceTo(cam.position)]).sort((a, b) => a[1] - b[1]).slice(0, 5).forEach(([p]) => {
    const l = new THREE.PointLight(0xffb85a, 7, 0, 2);
    l.position.copy(p);
    scene.add(l);
  });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.5;
    if (blocksMonument(Math.cos(a) * 9.5, Math.sin(a) * 9.5)) continue;
    const b = bannerPole({ rim: RIM });
    b.position.set(Math.cos(a) * 9.5, 0, Math.sin(a) * 9.5);
    b.rotation.y = -a + Math.PI / 2;
    scene.add(b);
  }

  // ---------- sealed world gates around the back of the plaza ----------
  const gates = [[0x7fc8ff, 'CELESTIA'], [0xff9a3c, 'EMBERFALL'], [0x5ff0e0, 'FROSTHOLD'], [0xff5ad0, 'STORMREACH'], [0x9a5cff, 'VOIDSPIRE'], [0xffe08a, 'SUNKEEP']];
  const back = Math.atan2(cam.position.z, cam.position.x) + Math.PI;
  gates.forEach(([color, label], i) => {
    const a = back + (i - (gates.length - 1) / 2) * 0.42;
    const gt = portalGate(20 + i, { color, label, glow: 1.5, rim: RIM });
    gt.position.set(Math.cos(a) * 23.5, 0, Math.sin(a) * 23.5);
    gt.rotation.y = Math.atan2(-gt.position.x, -gt.position.z);
    gt.scale.setScalar(1.15);
    scene.add(gt);
    const c = gt.localToWorld(gt.userData.center.clone());
    scene.add(glowQuad(cam, c, 8, new THREE.Color(color), 0.14));
    const l = new THREE.PointLight(color, 6, 0, 2);
    l.position.copy(c).add(new THREE.Vector3(0, 0, 0).sub(c).normalize().multiplyScalar(2));
    scene.add(l);
  });

  // ---------- houses, stalls, trees, canyon ----------
  for (let i = 0; i < 9; i++) {
    const a = back + (i - 4) * 0.42 + 0.21;
    if (Math.abs(i - 4) > 4) continue;
    const hs = house(40 + i, { w: 6 + r() * 3, d: 5 + r() * 2, h: 3.6 + r() * 1.2, roof: r() < 0.3 ? 0x6a2228 : 0x3a2a40, rim: RIM });
    const rad = 31 + r() * 4;
    hs.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad);
    hs.rotation.y = Math.atan2(-hs.position.x, -hs.position.z);
    scene.add(hs);
  }
  for (const [a, rad] of [[back + 1.55, 20], [back - 1.75, 20.5]]) {
    const st = marketStall({ rim: RIM });
    st.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad);
    st.rotation.y = Math.atan2(-st.position.x, -st.position.z);
    scene.add(st);
  }
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2;
    const rad = 38 + r() * 30;
    const p = new THREE.Vector3(Math.cos(a) * rad, 0, Math.sin(a) * rad);
    if (p.distanceTo(cam.position) < 25) continue;
    const t = pineTree(100 + i, { h: 9 + r() * 7, rim: RIM });
    t.position.copy(p);
    scene.add(t);
  }
  scene.add(cliffRing(7, { radius: 88, height: 46, thickness: 20, rim: RIM }));

  // ---------- grass around the plaza ----------
  if (want('grass')) {
    scene.add(grassField(9, {
      count: 26000, h: [0.45, 1.1], colA: 0x2f5a22, colB: 0x6a8a2e, rim: RIM,
      place: (rr) => {
        const a = rr() * Math.PI * 2, rad = 17.2 + rr() * 22;
        const p = new THREE.Vector3(Math.cos(a) * rad, 0, Math.sin(a) * rad);
        return p.distanceTo(cam.position) < 34 ? p : null;
      },
    }));
  }

  // ---------- the hero, sword lowered, in the right foreground ----------
  if (want('hero')) {
    const hero = buildAvatar({
      seed: 3, skin: 0xe6b48a, shirt: 0x231d33, pants: 0x17141f, shoes: 0x2a1d18, belt: 0x2a1d18, buckle: 0xb8a0e0, sleeves: 'long', gloves: 0x2a2236,
      hair: 'spiky', hairColor: 0x15101e, face: { brows: 'angry', mouth: 'smirk' },
      pauldrons: 0x3a3650, cape: { color: 0x2a1240, windX: -1.6, lift: 0.8, flow: 1.4 },
      rim: { right: 0x7fe6ff, left: 0xa070ff, strengthR: 0.5, strengthL: 0.45, power: 2.4 },
      pose: { armR: (q.get('armR') || '-1.25,0,-0.15').split(',').map(Number), armL: [0.12, 0, 0.12], legR: [0.08, 0, -0.04], legL: [-0.1, 0, 0.05], headY: -0.25, twist: -0.1 },
    });
    const sword = buildSword({ length: 3.8, width: 0.46, style: 'crystal', blade: 0x1c0836, metalness: 0.5, roughness: 0.25, glow: 0xa040ff, veins: { seed: 43 }, glowIntensity: 1.5, guard: 0x2b2836, gem: 0x8a2cff });
    const sr = (q.get('swordR') || '1.6,0,0.5').split(',').map(Number);
    holdItem(hero, 'R', sword, { rx: sr[0], ry: sr[1], rz: sr[2], offset: 0.5 });
    const hp = screenToWorld(cam, 0.79, 0.62, 12.5); hp.y = 0;
    hero.position.copy(hp);
    hero.rotation.y = Math.atan2(cam.position.x - hero.position.x, cam.position.z - hero.position.z) - 0.5;
    scene.add(hero);
    hero.updateMatrixWorld(true);
    const mid = sword.localToWorld(new THREE.Vector3(0, 1.8, 0));
    scene.add(glowQuad(cam, mid, 3.2, new THREE.Color(0xa040ff), 0.28));
    // warm lamp light on the hero's face
    const face = new THREE.PointLight(0xffb870, 14, 0, 2);
    face.position.copy(hero.position).add(new THREE.Vector3(1.5, 6.2, 3.2));
    scene.add(face);
    const sl = new THREE.PointLight(0xa64dff, 12, 0, 2);
    sl.position.copy(mid).add(new THREE.Vector3(0.6, 0.4, 0.8));
    scene.add(sl);
    const P = [], C = [], Z = [];
    for (let i = 0; i < 70; i++) {
      const t = r();
      const p = sword.localToWorld(new THREE.Vector3((r() - 0.5) * 0.9, t * 3.8, (r() - 0.5) * 0.6));
      p.add(new THREE.Vector3((r() - 0.5) * 0.8, r() * 1.2, (r() - 0.5) * 0.8));
      P.push(p.x, p.y, p.z);
      C.push(1.6, 0.7, 3.0);
      Z.push(0.03 + r() * 0.05);
    }
    scene.add(glowPoints(P, C, Z));
  }

  // ---------- floating motes: cyan sparks rising from the monument, fireflies in the grass ----------
  const P = [], C = [], Z = [];
  for (let i = 0; i < 260; i++) {
    const a = r() * Math.PI * 2, rad = 1 + r() * 9, y = 1.5 + r() ** 1.5 * 22;
    P.push(Math.cos(a) * rad, y, Math.sin(a) * rad);
    const k = 0.6 + r();
    C.push(0.6 * k, 1.8 * k, 2.4 * k);
    Z.push(0.06 + r() * 0.12);
  }
  for (let i = 0; i < 120; i++) {
    const a = r() * Math.PI * 2, rad = 16 + r() * 22;
    P.push(Math.cos(a) * rad, 0.4 + r() * 2.5, Math.sin(a) * rad);
    C.push(2.2, 1.9, 0.6);
    Z.push(0.05 + r() * 0.07);
  }
  scene.add(glowPoints(P, C, Z));

  return {
    scene, camera: cam,
    logo: { cx: 700, cy: 948, size: 112, gap: 58 },
    post: { bloomStrength: 0.6, bloomRadius: 0.5, bloomThreshold: 0.92, vignette: 0.55 },
  };
}
