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
  // longer lens than the thumbnails: keeps the sword arm from ballooning towards the camera
  const [cx, cy, cz, fov] = num('cam', '0.4,4.8,10.5,24');
  const cam = new THREE.PerspectiveCamera(fov, W / H, 0.1, 9000);
  cam.position.set(cx, cy, cz);
  cam.lookAt(new THREE.Vector3(...num('look', '-0.3,5.1,0')));
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();

  // eclipse centred just above the head
  const head = new THREE.Vector3(0, 4.62, 0);
  const eclipseDir = head.clone().add(new THREE.Vector3(0.15, 0.55, 0)).sub(cam.position).normalize();
  // ring size is an angle: scale it with the lens so it frames the head the same way
  const ringDefault = 0.165 * Math.tan(THREE.MathUtils.degToRad(fov / 2)) / Math.tan(THREE.MathUtils.degToRad(17.5));
  const sky = buildSky({ camera: cam, eclipseDir, eclipseRadius: +(q.get('ring') || ringDefault) });
  sky.position.copy(cam.position);
  scene.add(sky);

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0x4a3a8a, 0x1a0610, 0.7));
  const key = new THREE.DirectionalLight(0xffe6ee, +(q.get('key') || 2.1));   // key on the face from front-left
  key.position.set(-5, 6, 10);
  scene.add(key);
  const rimLight = new THREE.DirectionalLight(0xff2a1c, +(q.get('rimI') || 2.6));  // eclipse backlight, low behind-right
  rimLight.position.set(9, 5, -14);
  scene.add(rimLight);
  const rimL = new THREE.DirectionalLight(0x8a5cff, 1.6);      // violet edge from the left
  rimL.position.set(-12, 4, -8);
  scene.add(rimL);

  const r = rng(77);

  // ---------- the hero ----------
  const hero = buildAvatar({
    seed: 3, skin: 0xefc39e, shirt: 0x302868, pants: 0x1d1832, shoes: 0x2a1d18, belt: 0x2a1d18, buckle: 0xd9b45a,
    sleeves: 'long', roughness: 0.55,
    hair: 'swept', hairColor: 0x15101e, hairTip: 0x3b2b6e,
    face: { brows: 'fierce', eyes: 'bold', mouth: q.get('mouth') || 'grit' },
    strap: 0x4a2c1a,
    scarf: { color: 0x8a1020, side: 1, tails: [[0.3, 0.9, 0.45, -0.2], [0.26, 0.7, 0.8, 0.1]] },
    rim: { right: 0xff3a2a, left: 0xa070ff, strengthR: 0.9, strengthL: 0.7, power: 2.2 },
    pose: { armL: num('armL', '0.25,0,0.1'), headY: +(q.get('headY') || -0.1), headX: +(q.get('headX') || 0) },
  });
  hero.rotation.y = +(q.get('rot') || 0.15);
  scene.add(hero);
  scene.updateMatrixWorld(true);
  // point the sword arm along a world direction (an R6 arm hangs along -Y)
  const pointArm = (side, dir) => {
    const piv = hero.userData.arms[side].pivot;
    const pq = new THREE.Quaternion();
    piv.parent.getWorldQuaternion(pq);
    const wq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(...dir).normalize());
    piv.quaternion.copy(pq.invert().multiply(wq));
    piv.updateWorldMatrix(false, true);
  };
  pointArm('R', num('armDir', '-0.25,1,-0.05'));
  const sword = buildSword({ length: 4.2, width: 0.5, style: 'crystal', blade: 0x1c0836, metalness: 0.5, roughness: 0.25, glow: 0xa040ff, veins: { seed: 43 }, glowIntensity: 1.7, guard: 0x2b2836, gem: 0x8a2cff });
  const hold = holdItem(hero, 'R', sword, { rx: Math.PI / 2, offset: 0.5 });
  scene.updateMatrixWorld(true);
  const from = new THREE.Vector3();
  hold.getWorldPosition(from);
  aimItem(hold, sword, from.add(new THREE.Vector3(...num('swordDir', '1,0.35,-0.2')).normalize()));
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
