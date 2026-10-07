import * as THREE from 'three';
import { installFog } from '../fog.js';
import { buildSky } from '../sky.js';
import { rng } from '../util.js';
import { glowQuad, glowPoints, ribbon, lightningPath } from '../fx.js';
import { buildAvatar, holdItem, aimItem } from '../avatar.js';
import { buildSword } from '../sword.js';

// Game icon (512x512): close-up of the hero with his violet greatsword, the
// blood-red eclipse ring standing behind his head like a halo.
export function build({ W, H, DPR, q }) {
  installFog({
    resX: W * DPR, resY: H * DPR,
    density: 0.002, start: 40, max: 0.5,
    left: 0x1a1d4a, right: 0x700d16,
    splitA: 0.3, splitB: 0.8,
    mistTop: -50, mistBottom: -80, mistNear: 100, mistFar: 200, mistMax: 0.0,
    mistLeft: 0x22245a, mistRight: 0x560c18,
  });
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.001);   // only switches fog on; look is defined in fog.js

  const num = (k, d) => (q.get(k) || d).split(',').map(Number);
  const [cx, cy, cz, fov] = num('cam', '1.1,3.9,8.6,35');
  const cam = new THREE.PerspectiveCamera(fov, W / H, 0.1, 9000);
  cam.position.set(cx, cy, cz);
  cam.lookAt(new THREE.Vector3(0, 4.55, 0));
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();

  // eclipse centred just above the head
  const head = new THREE.Vector3(0, 4.62, 0);
  const eclipseDir = head.clone().add(new THREE.Vector3(0.15, 0.55, 0)).sub(cam.position).normalize();
  const sky = buildSky({ camera: cam, eclipseDir, eclipseRadius: +(q.get('ring') || 0.165) });
  sky.position.copy(cam.position);
  scene.add(sky);

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0x4a3a8a, 0x1a0610, 0.7));
  const key = new THREE.DirectionalLight(0xffd6e8, 1.7);       // soft key on the face from front-left
  key.position.set(-6, 7, 10);
  scene.add(key);
  const rimLight = new THREE.DirectionalLight(0xff2a1c, 3.4);  // eclipse backlight
  rimLight.position.copy(eclipseDir).multiplyScalar(40).add(new THREE.Vector3(4, 6, -20));
  scene.add(rimLight);
  const rimL = new THREE.DirectionalLight(0x8a5cff, 1.6);      // violet edge from the left
  rimL.position.set(-12, 4, -8);
  scene.add(rimL);

  const r = rng(77);

  // ---------- the hero ----------
  const [ax, ay, az] = num('arm', '-2.55,0,0.35');
  const hero = buildAvatar({
    seed: 3, skin: 0xe6b48a, shirt: 0x231d33, pants: 0x17141f, shoes: 0x2a1d18, belt: 0x2a1d18, buckle: 0xb8a0e0, sleeves: 'long', gloves: 0x2a2236,
    hair: 'spiky', hairColor: 0x15101e, face: { brows: 'angry', mouth: 'smirk' },
    pauldrons: 0x3a3650,
    rim: { right: 0xff3a2a, left: 0xa070ff, strengthR: 0.9, strengthL: 0.7, power: 2.2 },
    pose: { armR: [ax, ay, az], armL: [0.1, 0, 0.12], headY: +(q.get('headY') || 0.18) },
  });
  hero.rotation.y = +(q.get('rot') || -0.32);
  scene.add(hero);
  const sword = buildSword({ length: 4.2, width: 0.5, style: 'crystal', blade: 0x1c0836, metalness: 0.5, roughness: 0.25, glow: 0xa040ff, veins: { seed: 43 }, glowIntensity: 1.7, guard: 0x2b2836, gem: 0x8a2cff });
  const hold = holdItem(hero, 'R', sword, { rx: Math.PI / 2, offset: 0.5 });
  scene.updateMatrixWorld(true);
  const [tx, ty, tz] = num('aim', '3.5,7.7,-2.3');
  aimItem(hold, sword, new THREE.Vector3(tx, ty, tz));
  scene.updateMatrixWorld(true);

  // ---------- violet energy around the blade ----------
  const bp = (t, side = 0) => sword.localToWorld(new THREE.Vector3(side * 0.22 * (1 - t), 4.2 * t, 0.05));
  for (const t of [0.15, 0.45, 0.75]) scene.add(glowQuad(cam, bp(t), 1.6, new THREE.Color(0xa040ff), 0.16));
  for (let i = 0; i < 7; i++) {
    const t1 = r() * 0.85, t2 = Math.min(1, t1 + 0.08 + r() * 0.2);
    const pts = lightningPath(r, bp(t1, r() < 0.5 ? -1 : 1), bp(t2, r() < 0.5 ? -1 : 1), new THREE.Vector3((r() - 0.5) * 0.8, (r() - 0.5) * 0.5, 0.3), 12, 0.25);
    const w = 0.025 + r() * 0.02;
    scene.add(ribbon(cam, pts, (t) => w * (1 - 0.6 * Math.abs(t - 0.5)), new THREE.Color(1.4, 0.6, 3.2)));
  }
  const sl = new THREE.PointLight(0xa64dff, 9, 0, 2);
  sl.position.copy(bp(0.35)).add(new THREE.Vector3(0, 0, 1.2));
  scene.add(sl);

  // sparks around the blade, embers drifting in front of the eclipse
  const P = [], C = [], Z = [];
  for (let i = 0; i < 120; i++) {
    const p = bp(r()).add(new THREE.Vector3((r() - 0.5) * 1.6, (r() - 0.3) * 1.2, (r() - 0.5) * 0.8));
    P.push(p.x, p.y, p.z);
    const k = r();
    C.push(1.2 + k * 1.4, 0.5 + k, 2.6 + k);
    Z.push(0.025 + r() * r() * 0.07);
  }
  for (let i = 0; i < 90; i++) {
    P.push((r() - 0.5) * 12, 1 + r() * 9, -3 - r() * 6);
    C.push(2.4, 0.5 + r() * 0.4, 0.15);
    Z.push(0.03 + r() * 0.06);
  }
  scene.add(glowPoints(P, C, Z));

  return {
    scene, camera: cam,
    logo: { cx: 256, cy: 470, size: 53, gap: 28, letterSpacing: 1 },
    logoView: '0 0 512 512',
    post: { bloomStrength: 0.85, bloomRadius: 0.5, bloomThreshold: 0.85, vignette: 0.45 },
  };
}
