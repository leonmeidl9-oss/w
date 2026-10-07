import * as THREE from 'three';
import { installFog } from '../fog.js';
import { buildSkyDome, skyEnvironment } from '../sky2.js';
import { rng } from '../util.js';
import { glowQuad, glowPoints, ribbon, flameQuad } from '../fx.js';
import { pineTree, cliffRing, lampPost, portalGate, grassField, cobbleTexture, grassTexture } from '../village.js';
import { forgeShop, furnace, anvil, weaponRack, tongs } from '../forge.js';
import { buildAvatar, holdItem } from '../avatar.js';
import { buildSword, buildHammer } from '../sword.js';

const RIM = { right: 0xff9a50, left: 0x7a6bff, strengthR: 0.35, strengthL: 0.25, power: 2.6 };

// Thumbnail 3: the Blade Smith hammering a white-hot blade at dusk, sparks
// flying, the forge roaring and upgraded blades glowing on the rack.
export function build({ W, H, DPR, q, want, renderer }) {
  installFog({
    resX: W * DPR, resY: H * DPR,
    density: 0.006, start: 20, max: 0.7,
    left: 0x2a1a2c, right: 0x5a2c34,
    splitA: 0.3, splitB: 0.85,
    mistTop: 1, mistBottom: -4, mistNear: 30, mistFar: 90, mistMax: 0.4,
    mistLeft: 0x3a2434, mistRight: 0x6a3a3a,
  });
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.001);   // only switches fog on; look is defined in fog.js

  const cam = new THREE.PerspectiveCamera(+(q.get('fov') || 42), W / H, 0.1, 9000);
  cam.position.set(3.0, 2.5, 13.5);
  cam.lookAt(new THREE.Vector3(0.9, 3.6, -0.8));
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();

  const sunDir = new THREE.Vector3(0.85, 0.12, -0.5).normalize();
  const sky = buildSkyDome({
    zenith: 0x0c1030, horizon: 0xc0482a, below: 0x120a10,
    sunDir, sunColor: 0xff8a3a, sunSize: 0.035, sunGlow: 1.1,
    clouds: 0.75, cloudDark: 0x2a1426, cloudLit: 0xff8a5a, cloudScale: 0.5, cloudSeed: 4.2,
    horizonGlow: 0.9, horizonGlowColor: 0xff6a2a,
  });
  sky.position.copy(cam.position);
  scene.add(sky);
  scene.environment = skyEnvironment(renderer, sky);
  scene.environmentIntensity = 0.5;

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0x5a5a9a, 0x3a2414, 0.7));
  const sun = new THREE.DirectionalLight(0xff9a50, 2.2);
  sun.position.copy(sunDir).multiplyScalar(60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 200 });
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  const r = rng(31);

  // ---------- ground ----------
  const grass = grassTexture(6, { a: [70, 96, 30], b: [140, 150, 50] });
  grass.repeat.set(40, 40);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(300, 48), new THREE.MeshStandardMaterial({ map: grass, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const cob = cobbleTexture(8, { base: [214, 186, 150], mortar: [120, 96, 76] });
  cob.repeat.set(4, 3);
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(22, 16), new THREE.MeshStandardMaterial({ map: cob, roughness: 0.85 }));
  yard.rotation.x = -Math.PI / 2; yard.position.set(0.5, 0.02, 1.5);
  yard.receiveShadow = true;
  scene.add(yard);

  // ---------- the shop ----------
  const shop = forgeShop({ rim: RIM });
  shop.position.set(0, 0, -1);
  scene.add(shop);

  const fur = furnace({ rim: RIM });
  fur.position.set(-4.4, 0, -2.9);
  fur.rotation.y = 0.25;
  scene.add(fur);
  fur.updateMatrixWorld(true);
  const mouth = fur.localToWorld(fur.userData.mouth.clone());
  const fireL = new THREE.PointLight(0xff6a1a, 55, 0, 2);
  fireL.position.copy(mouth).add(new THREE.Vector3(0.3, 0.3, 1.2));
  scene.add(fireL);
  for (let i = 0; i < 6; i++) {
    const p = mouth.clone().add(new THREE.Vector3((r() - 0.5) * 1.0, -0.55, 0.05));
    scene.add(flameQuad(cam, p, 0.9, 1.1 + r() * 0.5, new THREE.Color(i % 2 ? 0xff8a20 : 0xffc04a).multiplyScalar(0.9), 0.8));
  }
  scene.add(glowQuad(cam, mouth, 3.5, new THREE.Color(0xff7a2a), 0.35));

  const rack = weaponRack({ rim: RIM });
  rack.position.set(4.3, 0, -3.7);
  scene.add(rack);
  rack.updateMatrixWorld(true);
  for (const { sword, color } of rack.userData.swords) {
    const c = sword.localToWorld(new THREE.Vector3(0, 1.3, 0.3));
    scene.add(glowQuad(cam, c, 2.4, new THREE.Color(color), 0.22));
    const l = new THREE.PointLight(color, 3.5, 0, 2);
    l.position.copy(c).add(new THREE.Vector3(0, 0, 0.6));
    scene.add(l);
  }

  // ---------- anvil with a white-hot blade ----------
  const anv = anvil({ rim: RIM });
  anv.position.set(-0.4, 0, 0.9);
  anv.rotation.y = 0.12;
  scene.add(anv);
  anv.updateMatrixWorld(true);
  const top = anv.localToWorld(anv.userData.top.clone());
  const hot = buildSword({ length: 2.5, width: 0.42, style: 'straight', blade: 0xffa040, metalness: 0.3, roughness: 0.4, glow: 0xff7a20, glowIntensity: 2.6, shell: 0.35, guard: 0x2a2620, guardWidth: 1.0, gripLength: 0.7 });
  hot.rotation.set(-Math.PI / 2, 0, -Math.PI / 2 + 0.15);
  hot.position.copy(top).add(new THREE.Vector3(-1.1, 0.05, 0.05));
  scene.add(hot);
  const hotC = top.clone().add(new THREE.Vector3(0.1, 0.12, 0));
  const hotL = new THREE.PointLight(0xff8a30, 30, 0, 2);
  hotL.position.copy(hotC).add(new THREE.Vector3(0, 0.6, 0.6));
  scene.add(hotL);
  scene.add(glowQuad(cam, hotC, 2.6, new THREE.Color(0xffa040), 0.45));

  // ---------- the Blade Smith, hammer raised ----------
  if (want('smith')) {
    const smith = buildAvatar({
      seed: 8, skin: 0xf0c49a, shirt: 0x7a4a2a, pants: 0x3a3a42, shoes: 0x4a2e1c, belt: 0x3a2416, buckle: 0xe0b030,
      apron: 0x4a2c18, hair: 'short', hairColor: 0x4a2a14, hat: 'headband', hatColor: 0xe8dcc0,
      face: { brows: 'angry', beard: '#5a3418' },
      rim: { right: 0xffa060, left: 0x8a7bff, strengthR: 0.45, strengthL: 0.25, power: 2.4 },
      pose: { armR: [-2.75, 0, 0.12], armL: [-0.75, 0, -0.05], legR: [0.05, 0, -0.03], legL: [-0.05, 0, 0.03], headX: 0.12, lean: 0.1 },
    });
    smith.position.set(-0.9, 0, -1.05);
    smith.rotation.y = 0.32;
    scene.add(smith);
    holdItem(smith, 'R', buildHammer(), { rx: 2.75 + 0.55, offset: -0.35 });
    holdItem(smith, 'L', tongs({ length: 1.5 }), { rx: 0.6, offset: -0.05 });
  }

  // ---------- sparks bursting off the blade ----------
  const P = [], C = [], Z = [];
  for (let i = 0; i < 260; i++) {
    const side = r() < 0.5 ? -1 : 1;
    const dir = new THREE.Vector3(side * (0.35 + r() * 0.65), r() * 0.55 + 0.05, r() * 0.9 - 0.2).normalize();
    const d = r() ** 0.7 * 3.2;
    const p = hotC.clone().addScaledVector(dir, d);
    p.y -= d * d * 0.08;
    P.push(p.x, p.y, p.z);
    const k = r();
    C.push(3.0, 1.4 + k * 1.4, 0.3 + k * 0.8);
    Z.push(0.04 + r() * 0.07);
  }
  scene.add(glowPoints(P, C, Z));
  scene.add(glowQuad(cam, hotC.clone().add(new THREE.Vector3(0, 0.15, 0.3)), 1.6, new THREE.Color(1.6, 1.3, 0.9), 0.9));
  for (let i = 0; i < 70; i++) {
    const side = r() < 0.5 ? -1 : 1;
    const dir = new THREE.Vector3(side * (0.4 + r() * 0.6), r() * 0.6 + 0.1, r() * 0.9 - 0.2).normalize();
    const d0 = 0.2 + r() * 1.6, len = 0.25 + r() * 0.6;
    const pts = [];
    for (let k = 0; k <= 4; k++) {
      const d = d0 + len * k / 4;
      const p = hotC.clone().addScaledVector(dir, d);
      p.y -= d * d * 0.09;
      pts.push(p);
    }
    scene.add(ribbon(cam, pts, (t) => 0.05 * (0.3 + t), new THREE.Color(3.0, 1.6, 0.5)));
  }

  // ---------- outside: lamp, grass, pines, a sealed gate, canyon ----------
  const lamp = lampPost({ rim: RIM });
  lamp.position.set(8.4, 0, 3.6);
  scene.add(lamp);
  const lampPos = lamp.localToWorld(lamp.userData.light.clone());
  scene.add(glowQuad(cam, lampPos, 2.6, new THREE.Color(0xffd080), 0.45));
  const ll = new THREE.PointLight(0xffc070, 10, 0, 2);
  ll.position.copy(lampPos);
  scene.add(ll);

  const gate = portalGate(5, { color: 0xb070ff, label: 'STORMREACH', glow: 1.7, rim: RIM });
  gate.position.set(17, 0, -14);
  gate.rotation.y = -0.6;
  scene.add(gate);
  gate.updateMatrixWorld(true);
  scene.add(glowQuad(cam, gate.localToWorld(gate.userData.center.clone()), 8, new THREE.Color(0xb070ff), 0.18));

  for (let i = 0; i < 26; i++) {
    const p = new THREE.Vector3(9 + r() * 40, 0, -8 - r() * 50);
    if (r() < 0.3) p.x = -20 - r() * 30;
    const t = pineTree(200 + i, { h: 9 + r() * 6, rim: RIM });
    t.position.copy(p);
    scene.add(t);
  }
  const cliffs = cliffRing(11, { radius: 75, height: 40, thickness: 18, rim: RIM });
  cliffs.position.set(0, 0, 10);
  scene.add(cliffs);

  if (want('grass')) {
    scene.add(grassField(14, {
      count: 18000, h: [0.8, 1.8], colA: 0x8a8a20, colB: 0xd0c050, rim: RIM,
      place: (rr) => {
        const p = new THREE.Vector3(-14 + rr() * 34, 0, -6 + rr() * 16);
        const inYard = p.x > -10.5 && p.x < 11.5 && p.z > -6.5 && p.z < 9.5;
        return inYard || p.z > 7 ? null : p;
      },
    }));
  }

  // drifting embers in the air
  const E = [], EC = [], EZ = [];
  for (let i = 0; i < 90; i++) {
    E.push(-6 + r() * 14, 1 + r() * 7, -3 + r() * 7);
    EC.push(2.4, 0.9 + r() * 0.6, 0.2);
    EZ.push(0.02 + r() * 0.04);
  }
  scene.add(glowPoints(E, EC, EZ));

  return {
    scene, camera: cam,
    logo: { cx: 960, cy: 948, size: 112, gap: 58 },
    post: { bloomStrength: 0.7, bloomRadius: 0.5, bloomThreshold: 0.88, vignette: 0.5 },
  };
}
