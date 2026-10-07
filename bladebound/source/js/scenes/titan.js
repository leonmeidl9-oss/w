import * as THREE from 'three';
import { installFog } from '../fog.js';
import { buildSky } from '../sky.js';
import { screenToWorld, rng } from '../util.js';
import { buildIsland, buildWaterfall, buildPuff } from '../islands.js';
import { buildCastle } from '../castle.js';
import { buildTitan, buildDebris } from '../titan.js';
import { buildBridge, buildRuin } from '../bridge.js';
import { buildHero, bladePoint } from '../hero.js';
import { glowQuad, glowPoints, ribbon, lightningPath } from '../fx.js';
import { buildTree, buildWallWithLantern, buildBanner, buildRunePillar, buildBrazier, addFire, buildBoulder } from '../props.js';


// Thumbnail 1 (and the game icon): the hero on a cliff ledge facing a lava titan
// and a gothic castle under a blood-red eclipse.
export function build({ W, H, DPR, MODE, q, want }) {
  // The layout camera defines the world: things are placed by where they should
  // appear in the 16:9 thumbnail. The icon reuses the same world with another camera.
  const layoutCam = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 9000);
  layoutCam.position.set(0, 0, 0);
  layoutCam.rotation.set(0.07, 0, 0);
  layoutCam.updateMatrixWorld();
  layoutCam.updateProjectionMatrix();
  const S = (sx, sy, d) => screenToWorld(layoutCam, sx, sy, d);

  installFog({
    resX: W * DPR, resY: H * DPR,
    density: 0.0024, start: 25, max: 0.82,
    left: 0x1a1d4a, right: 0x700d16,
    splitA: 0.36, splitB: 0.74,
    mistTop: -20, mistBottom: -110, mistNear: 15, mistFar: 90, mistMax: 0.95,
    mistLeft: 0x22245a, mistRight: 0x560c18,
  });

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.001);   // only switches fog on; look is defined in fog.js

  const eclipseDir = S(0.605, 0.135, 1).sub(layoutCam.position).normalize();
  scene.add(buildSky({ camera: layoutCam, eclipseDir, eclipseRadius: 0.068 }));

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0x39407e, 0x1c0408, 0.9));
  const key = new THREE.DirectionalLight(0xff3326, 2.4);      // eclipse / titan glow from the right-back
  key.position.copy(eclipseDir.clone().multiplyScalar(300).add(new THREE.Vector3(120, -40, 0)));
  scene.add(key);
  const moon = new THREE.DirectionalLight(0x8f9cff, 1.6);    // cold moonlight from the upper left
  moon.position.set(-300, 260, 120);
  scene.add(moon);

  // ---------- render camera (thumbnail = layout camera; icon / debug zoom differ) ----------
  const heroHeadPos = S(0.262, 0.335, 9.0);
  let renderCam = layoutCam;
  if (MODE === 'icon') {
    // icam = offset x,y,z from the hero's head, look blend (head vs eclipse), fov
    const c = q.get('icam') ? q.get('icam').split(',').map(Number) : [0.9, -1.6, 6.5, 0.5, 44];
    renderCam = new THREE.PerspectiveCamera(c[4], W / H, 0.1, 9000);
    renderCam.position.copy(heroHeadPos).add(new THREE.Vector3(c[0], c[1], c[2]));
    const toHead = heroHeadPos.clone().sub(renderCam.position).normalize();
    const look = toHead.multiplyScalar(c[3]).add(eclipseDir.clone().multiplyScalar(1 - c[3])).normalize();
    renderCam.lookAt(renderCam.position.clone().add(look));
    renderCam.updateProjectionMatrix();
    renderCam.updateMatrixWorld();
  } else if (q.get('zoom')) {
    const [zx, zy, zf] = q.get('zoom').split(',').map(Number);
    renderCam = layoutCam.clone();
    renderCam.fov = zf; renderCam.aspect = W / H;
    renderCam.lookAt(S(zx, zy, 100));
    renderCam.updateProjectionMatrix();
    renderCam.updateMatrixWorld();
  }
  const fxCam = renderCam;

  // ---------- background: floating islands, castle, waterfalls ----------
  function placeIsland(seed, sx, sy, dist, opts) {
    const isl = buildIsland(seed, opts);
    isl.position.copy(S(sx, sy, dist));
    isl.rotation.y = opts.ry || 0;
    scene.add(isl);
    return isl;
  }

  if (want('castle')) {
    const top = S(0.47, 0.415, 430);
    placeIsland(11, 0.47, 0.415, 430, { radius: 70, depth: 95, roughness: 0.25, ry: 0.4 });
    const castle = buildCastle(7);
    castle.position.copy(top).add(new THREE.Vector3(0, 1.5, -6));
    castle.rotation.y = -0.3;
    castle.scale.setScalar(0.92);
    scene.add(castle);
    // waterfalls pouring off the front rim
    for (const [dx, w, h] of [[-20, 6, 150], [10, 8, 175]]) {
      const wf = buildWaterfall({ width: w, height: h, opacity: 0.6, color: 0x9fb4ee, spread: 2.4 });
      wf.position.copy(top).add(new THREE.Vector3(dx, -1, 52 - Math.abs(dx) * 0.35));
      scene.add(wf);
      for (const [fy, fs, fo] of [[0.45, 5, 0.18], [0.7, 8, 0.28], [0.9, 11, 0.3]]) {
        const mist = buildPuff({ size: w * fs, color: 0x8f9ee0, opacity: fo });
        mist.position.copy(wf.position).add(new THREE.Vector3(0, -h * fy, 6));
        scene.add(mist);
      }
    }
  }

  if (want('islands')) {
    // mid island with ruins, right of the castle
    const midTop = S(0.575, 0.5, 250);
    placeIsland(23, 0.575, 0.5, 250, { radius: 24, depth: 40, roughness: 0.3, ry: 1.2 });
    const midRuin = buildRuin(12, 22);
    midRuin.position.copy(midTop).add(new THREE.Vector3(-6, 1, 2));
    midRuin.rotation.y = -0.6;
    midRuin.scale.setScalar(0.9);
    scene.add(midRuin);
    for (const [dx, w, h] of [[-6, 3.2, 95]]) {
      const wf = buildWaterfall({ width: w, height: h, opacity: 0.55, spread: 2.2 });
      wf.position.copy(midTop).add(new THREE.Vector3(dx, -0.5, 19));
      scene.add(wf);
    }
    // scattered floating rocks
    const r = rng(5);
    const rocks = [
      [0.335, 0.39, 300, 8], [0.395, 0.17, 520, 10], [0.64, 0.43, 280, 6], [0.69, 0.52, 210, 4],
      [0.86, 0.07, 430, 9], [0.95, 0.20, 380, 6], [0.43, 0.56, 260, 5], [0.27, 0.47, 360, 9],
      [0.52, 0.10, 600, 7], [0.80, 0.47, 320, 5], [0.60, 0.30, 650, 6], [0.72, 0.13, 560, 5],
    ];
    rocks.forEach(([sx, sy, d, rad], i) => {
      const isl = placeIsland(100 + i, sx, sy, d, { radius: rad, depth: rad * (1.2 + r() * 0.8), roughness: 0.4, ry: r() * 6 });
      isl.rotation.z = (r() - 0.5) * 0.4;
    });
    // distant islands on the left (cold side)
    placeIsland(41, 0.17, 0.43, 700, { radius: 55, depth: 70, ry: 2 });
    placeIsland(42, 0.04, 0.36, 820, { radius: 60, depth: 80, ry: 3 });
  }


  if (want('titan')) {
    const titan = buildTitan(21);
    const eyes = S(0.765, 0.215, 620);
    titan.position.copy(eyes).sub(new THREE.Vector3(0, 300, 60));
    titan.rotation.y = Math.atan2(-titan.position.x, -titan.position.z) - 0.25;
    scene.add(titan);
    // drifting lava rubble around the colossus
    const debrisMat = titan.children[0].material;
    const deb = buildDebris(77, 26, [420, 300, 160], [4, 16], debrisMat);
    deb.position.copy(S(0.78, 0.33, 520));
    scene.add(deb);
    // keep the eclipse ring and the titan's face/crown clear of rubble
    deb.updateMatrixWorld(true);
    const keepClear = [[0.605, 0.135, 0.085], [0.735, 0.17, 0.075]];
    const v = new THREE.Vector3();
    for (const c of [...deb.children]) {
      c.getWorldPosition(v); v.project(layoutCam);
      const sx = (v.x + 1) / 2, sy = (1 - v.y) / 2;
      if (keepClear.some(([x, y, rr]) => Math.hypot((sx - x) * 16 / 9, sy - y) < rr * 1.6)) deb.remove(c);
    }
  }

  if (want('bridge')) {
    const a = S(0.655, 0.70, 340), b = S(0.955, 0.715, 255);
    const len = a.distanceTo(b);
    const bridge = buildBridge({ length: len, width: 10, arches: 5, pierDepth: 70 });
    bridge.position.copy(a);
    bridge.rotation.y = Math.atan2(-(b.z - a.z), b.x - a.x);
    scene.add(bridge);
    const ruin = buildRuin(3, 34);
    ruin.position.copy(S(0.635, 0.60, 300));
    ruin.rotation.y = 0.5;
    scene.add(ruin);
    const ruin2 = buildRuin(8, 44);
    ruin2.position.copy(S(0.885, 0.53, 260));
    ruin2.rotation.y = -0.4;
    scene.add(ruin2);
  }

  // ---------- near props ----------
  const heroHead = heroHeadPos;
  const groundY = heroHead.y - 4.6;
  const onGround = (sx, sy, d, yOff = 0) => { const p = S(sx, sy, d); p.y = groundY + yOff; return p; };
  const faceCam = (obj, extra = 0) => { obj.rotation.y = Math.atan2(-obj.position.x, -obj.position.z) + extra; };

  if (want('props')) {
    // ledge the hero stands on (mostly below frame) + a deeper shelf on the left
    const ledge = buildBoulder(301, 13, 6, 16);
    ledge.position.set(heroHead.x - 3.5, groundY - 3, heroHead.z + 4.5);
    scene.add(ledge);
    const shelf = buildBoulder(302, 14, 7, 14);
    shelf.position.set(heroHead.x - 9, groundY - 3.5, heroHead.z - 8);
    scene.add(shelf);

    // voxel tree, top-left
    const tree = buildTree(1, { height: 9.5, canopy: 4.4 });
    tree.position.copy(onGround(0.085, 0.3, 31));
    scene.add(tree);

    // stone wall + lantern at its right end
    const lanternTarget = S(0.092, 0.305, 17);
    const wallH = Math.max(6, (lanternTarget.y - groundY) / 0.8);
    const wall = buildWallWithLantern(2, { width: 7, height: wallH });
    const ang = Math.atan2(-lanternTarget.x, -lanternTarget.z) + 0.35;
    wall.rotation.y = ang;
    const lanternLocal = new THREE.Vector3(7 - 0.9, 0, 1.0).applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
    wall.position.set(lanternTarget.x - lanternLocal.x, groundY, lanternTarget.z - lanternLocal.z);
    scene.add(wall);
    wall.updateMatrixWorld(true);
    const lp = new THREE.Vector3(); wall.userData.lantern.getWorldPosition(lp);
    scene.add(glowQuad(fxCam, lp, 3.2, new THREE.Color(0xff9a40), 0.5));

    // banner pole
    const banner = buildBanner(4, { poleH: 15.5, bw: 2.7, bh: 6.6 });
    banner.position.copy(onGround(0.128, 0.5, 25));
    faceCam(banner, -0.15);
    scene.add(banner);

    // right ledge with the rune pillar and a fire brazier
    const rightLedge = buildBoulder(303, 12, 6, 12);
    rightLedge.position.copy(onGround(0.93, 0.8, 14, -3.2));
    scene.add(rightLedge);
    const pillar = buildRunePillar(5, { w: 1.9 });
    pillar.position.copy(onGround(0.962, 0.45, 14.5, -0.6));
    faceCam(pillar, 0.25);
    scene.add(pillar);
    pillar.updateMatrixWorld(true);
    const rp = pillar.localToWorld(pillar.userData.runePos.clone());
    scene.add(glowQuad(fxCam, rp, 5, new THREE.Color(0xff2a18), 0.28));

    const brazier = buildBrazier();
    brazier.position.copy(onGround(0.935, 0.72, 10.5, -0.2));
    faceCam(brazier);
    scene.add(brazier);
    brazier.updateMatrixWorld(true);
    addFire(scene, fxCam, brazier.localToWorld(brazier.userData.fireBase.clone()), 0.42);

    // foreground boulders framing the bottom corners (resting on the ground)
    const fg = [[311, 0.035, 0.95, 5.6, 3.4, 1.9, 2.6], [312, 0.17, 0.99, 6.4, 2.6, 1.5, 2.2], [314, 0.9, 0.98, 6.2, 3.0, 1.7, 2.4]];
    for (const [sd, sx, sy, d, w, h, dd] of fg) {
      const b = buildBoulder(sd, w, h, dd);
      b.position.copy(onGround(sx, sy, d, h / 2 - 0.35));
      b.rotation.set(0.04, sd * 0.7, 0.03);
      scene.add(b);
    }
  }

  // ---------- hero ----------
  let hero = null;
  if (want('hero')) {
    hero = buildHero(3);
    const headPos = heroHeadPos;
    hero.position.copy(headPos).sub(new THREE.Vector3(0, 4.6, 0));
    hero.rotation.y = Math.PI + (+(q.get("hrot") ?? 0.25));
    scene.add(hero);
    hero.updateMatrixWorld(true);

    // violet energy around the blade
    const r = rng(91);
    const fx = new THREE.Group();
    scene.add(fx);
    const purple = new THREE.Color(0xa040ff);
    for (const t of [0.05, 0.22, 0.4, 0.58, 0.76, 0.92]) {
      fx.add(glowQuad(fxCam, bladePoint(hero, t), 1.0 + r() * 0.6, purple, 0.12));
    }
    // lightning arcs hugging the blade
    for (let i = 0; i < 9; i++) {
      const t1 = r() * 0.9, t2 = Math.min(1, t1 + 0.06 + r() * 0.2);
      const a = bladePoint(hero, t1, r() < 0.5 ? -1 : 1);
      const b = bladePoint(hero, t2, r() < 0.5 ? -1 : 1);
      const bulge = new THREE.Vector3((r() - 0.5) * 0.9, (r() - 0.5) * 0.6, 0.2 + r() * 0.3);
      const pts = lightningPath(r, a, b, bulge, 12, 0.25);
      const w = 0.022 + r() * 0.02;
      fx.add(ribbon(fxCam, pts, (t) => w * (1 - 0.6 * Math.abs(t - 0.5)), new THREE.Color(1.4, 0.6, 3.2), { opacity: 1 }));
    }
    // sparks / embers drifting left with the wind
    const P = [], C = [], Z = [];
    for (let i = 0; i < 160; i++) {
      const t = r();
      const p = bladePoint(hero, t);
      const drift = r() ** 1.5;
      p.add(new THREE.Vector3(-drift * 2.4 + (r() - 0.5) * 0.5, (r() - 0.3) * 0.9 + drift * 0.6, (r() - 0.5) * 0.8));
      P.push(p.x, p.y, p.z);
      const hot = r();
      const c = new THREE.Color().setRGB(1.0 + hot * 1.5, 0.45 + hot, 2.4 + hot);
      C.push(c.r, c.g, c.b);
      Z.push(0.025 + r() * r() * 0.07);
    }
    fx.add(glowPoints(P, C, Z));
    // the blade lights the hero's back, the cloak and the stones
    const swordLight = new THREE.PointLight(0xa64dff, 2.2, 0, 2);
    swordLight.position.copy(bladePoint(hero, 0.45)).add(new THREE.Vector3(0, 0.1, 0.9));
    scene.add(swordLight);
    const swordLight2 = new THREE.PointLight(0x8a3cff, 1.4, 0, 2);
    swordLight2.position.copy(bladePoint(hero, 0.95)).add(new THREE.Vector3(0, 0.3, 0.6));
    scene.add(swordLight2);
  }

  // ---------- atmosphere: drifting embers, ash and a distant lightning strike ----------
  if (want('atmo')) {
    const r = rng(404);
    const P = [], C = [], Z = [];
    // embers in the mid-ground on the red side, drifting left on the wind
    for (let i = 0; i < 260; i++) {
      const sx = 0.35 + r() * 0.65, sy = r() * 0.85, d = 30 + r() * 220;
      const p = S(sx, sy, d);
      P.push(p.x, p.y, p.z);
      const hot = r();
      const c = new THREE.Color().setRGB(2.2 + hot * 1.5, 0.35 + hot * 0.6, 0.08);
      C.push(c.r, c.g, c.b);
      Z.push(d * (0.004 + r() * r() * 0.006));
    }
    // a few big out-of-focus embers close to the camera
    for (let i = 0; i < 14; i++) {
      const sx = 0.45 + r() * 0.55, sy = 0.05 + r() * 0.6, d = 4 + r() * 6;
      const p = S(sx, sy, d);
      P.push(p.x, p.y, p.z);
      const c = new THREE.Color().setRGB(1.2, 0.25, 0.06).multiplyScalar(0.5 + r() * 0.4);
      C.push(c.r, c.g, c.b);
      Z.push(0.06 + r() * 0.08);
    }
    // cold violet motes on the hero's side
    for (let i = 0; i < 90; i++) {
      const sx = r() * 0.45, sy = 0.1 + r() * 0.8, d = 6 + r() * 30;
      const p = S(sx, sy, d);
      P.push(p.x, p.y, p.z);
      const c = new THREE.Color().setRGB(0.9, 0.55, 2.0).multiplyScalar(0.6 + r() * 0.6);
      C.push(c.r, c.g, c.b);
      Z.push(d * (0.0035 + r() * 0.004));
    }
    scene.add(glowPoints(P, C, Z));

    // forked lightning far away in the cold storm (left sky)
    const strike = (sx0, sy0, sx1, sy1, dist, seed, width) => {
      const rr = rng(seed);
      const a = S(sx0, sy0, dist), b = S(sx1, sy1, dist);
      const main = lightningPath(rr, a, b, new THREE.Vector3(0, 0, 0), 22, 0.1);
      const g = new THREE.Group();
      g.add(ribbon(fxCam, main, (t) => width * (1 - 0.7 * t), new THREE.Color(1.3, 1.1, 3.4)));
      for (let k = 0; k < 4; k++) {
        const i0 = 3 + Math.floor(rr() * 12);
        const start = main[i0];
        const end = start.clone().add(new THREE.Vector3((rr() - 0.3) * dist * 0.12, -dist * (0.04 + rr() * 0.08), 0));
        g.add(ribbon(fxCam, lightningPath(rr, start, end, new THREE.Vector3(), 10, 0.15), (t) => width * 0.5 * (1 - t), new THREE.Color(0.9, 0.8, 2.6)));
      }
      g.traverse((o) => { if (o.material) o.material.depthTest = true; });
      scene.add(g);
    };
    strike(0.355, 0.0, 0.31, 0.27, 1500, 77, 2.6);
    scene.add(glowQuad(fxCam, S(0.345, 0.06, 1400), 320, new THREE.Color(0x6a5cff), 0.22));
  }

  if (q.get('debug')) {
    const box = new THREE.Box3(), v = new THREE.Vector3();
    scene.children.forEach((o, i) => {
      if (!o.isMesh && !o.isGroup) return;
      box.setFromObject(o);
      if (box.isEmpty()) return;
      const proj = (p) => { v.copy(p).project(layoutCam); return [((v.x + 1) / 2).toFixed(2), ((1 - v.y) / 2).toFixed(2)]; };
      const c = new THREE.Vector3(); box.getCenter(c);
      const top = new THREE.Vector3(c.x, box.max.y, c.z);
      console.log(i, o.type, o.name || '', 'center', c.toArray().map(x => x.toFixed(1)).join(','), 'size', box.getSize(new THREE.Vector3()).toArray().map(x => x.toFixed(1)).join(','), 'scr', proj(c).join(','), 'top', proj(top).join(','));
    });
  }

  const logo = MODE === 'icon'
    ? { cx: 256, cy: 452, size: 50, gap: 27, letterSpacing: 1 }
    : { cx: 960, cy: 905, size: 124, gap: 64 };
  return { scene, camera: renderCam, logo };
}
