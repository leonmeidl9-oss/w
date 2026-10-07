import * as THREE from 'three';
import { NOISE_GLSL } from './sky.js';

// General sky dome for the hub scenes: gradient, sun or moon, stars, aurora
// curtains and a lit cloud layer. All inputs are linear HDR colours.
export function buildSkyDome({
  zenith = 0x0a1030, horizon = 0x2a3a6a, below = 0x0a0c14,
  sunDir = new THREE.Vector3(0, 0.1, -1), sunColor = 0xffffff, sunSize = 0.0, sunGlow = 0.0,
  moonDir = null, moonSize = 0.045, moonColor = 0xe8f0ff,
  stars = 0.0, aurora = 0.0, auroraA = 0x2affb0, auroraB = 0x8a4dff,
  clouds = 0.0, cloudDark = 0x101830, cloudLit = 0x8090c0, cloudScale = 0.6, cloudSeed = 1.3,
  horizonGlow = 0.0, horizonGlowColor = 0xff8a40,
} = {}) {
  const c = (x) => new THREE.Color(x);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uZenith: { value: c(zenith) }, uHorizon: { value: c(horizon) }, uBelow: { value: c(below) },
      uSunDir: { value: sunDir.clone().normalize() }, uSunCol: { value: c(sunColor) }, uSunSize: { value: sunSize }, uSunGlow: { value: sunGlow },
      uMoonDir: { value: (moonDir || new THREE.Vector3(0, -1, 0)).clone().normalize() }, uMoonSize: { value: moonDir ? moonSize : 0 }, uMoonCol: { value: c(moonColor) },
      uStars: { value: stars }, uAurora: { value: aurora }, uAurA: { value: c(auroraA) }, uAurB: { value: c(auroraB) },
      uClouds: { value: clouds }, uCloudDark: { value: c(cloudDark) }, uCloudLit: { value: c(cloudLit) }, uCloudScale: { value: cloudScale }, uCloudSeed: { value: cloudSeed },
      uHGlow: { value: horizonGlow }, uHGlowCol: { value: c(horizonGlowColor) },
    },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vDir;
      uniform vec3 uZenith, uHorizon, uBelow, uSunDir, uSunCol, uMoonDir, uMoonCol, uAurA, uAurB, uCloudDark, uCloudLit, uHGlowCol;
      uniform float uSunSize, uSunGlow, uMoonSize, uStars, uAurora, uClouds, uCloudScale, uCloudSeed, uHGlow;
      ${NOISE_GLSL}
      float hash13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.5));
        col = mix(uBelow, col, smoothstep(-0.1, 0.03, h));
        // warm band along the horizon, strongest toward the sun
        float sd = dot(d, uSunDir);
        col += uHGlowCol * uHGlow * exp(-max(h, 0.0) * 9.0) * (0.35 + 0.65 * pow(max(sd, 0.0), 3.0)) * smoothstep(-0.08, 0.0, h);
        // sun disc + glow
        col += uSunCol * uSunGlow * (pow(max(sd, 0.0), 6.0) * 0.25 + pow(max(sd, 0.0), 60.0) * 0.8);
        if (uSunSize > 0.0) col += uSunCol * smoothstep(cos(uSunSize), cos(uSunSize * 0.8), sd) * 5.0;
        // stars
        if (uStars > 0.0) {
          vec3 sp = d * 260.0;
          vec3 cell = floor(sp);
          float rnd = hash13(cell);
          float isStar = step(1.0 - 0.012 * uStars, rnd);
          vec3 f = fract(sp) - 0.5 - (vec3(hash13(cell + 7.1), hash13(cell + 3.3), hash13(cell + 5.7)) - 0.5) * 0.5;
          float s = smoothstep(0.22, 0.0, length(f)) * isStar * (0.4 + 1.6 * hash13(cell + 1.9));
          col += vec3(0.85, 0.9, 1.0) * s * 1.6 * smoothstep(0.03, 0.3, h);
        }
        // aurora curtains
        if (uAurora > 0.0) {
          float az = atan(d.x, -d.z);
          float base = 0.22 + 0.1 * snoise(vec3(az * 1.6, 2.1, 0.4));
          float hh = h - base;
          float curtain = smoothstep(-0.03, 0.02, hh) * exp(-max(hh, 0.0) * 6.0);
          float rays = 0.55 + 0.45 * snoise(vec3(az * 38.0, 0.0, 5.0));
          float band = smoothstep(0.1, 0.7, 0.5 + 0.5 * snoise(vec3(az * 2.3, 7.7, 1.0)));
          vec3 ac = mix(uAurA, uAurB, smoothstep(0.0, 0.22, hh));
          col += ac * curtain * rays * band * uAurora;
        }
        // moon
        if (uMoonSize > 0.0) {
          float md = acos(clamp(dot(d, uMoonDir), -1.0, 1.0));
          float disc = smoothstep(uMoonSize, uMoonSize * 0.96, md);
          vec3 mp = d * 90.0;
          float crater = 0.75 + 0.25 * (snoise(mp) * 0.6 + snoise(mp * 2.3) * 0.4);
          col = mix(col, uMoonCol * 1.25 * crater, disc);
          col += uMoonCol * (exp(-max(md - uMoonSize, 0.0) * 22.0) * 0.18 + exp(-max(md - uMoonSize, 0.0) * 5.0) * 0.05);
        }
        // cloud layer projected on a dome
        if (uClouds > 0.0) {
          vec2 uv = d.xz / max(h + 0.14, 0.06) * uCloudScale;
          float n = fbm(vec3(uv, uCloudSeed)) + 0.15;
          float dens = smoothstep(0.02, 0.45, n) * uClouds * smoothstep(-0.03, 0.12, h);
          float nl = fbm(vec3(uv + uSunDir.xz * 0.08, uCloudSeed)) + 0.15;
          float lit = clamp((n - nl) * 4.0 + 0.45, 0.0, 1.0);
          float toward = pow(max(sd, 0.0), 2.0);
          vec3 cc = mix(uCloudDark, uCloudLit, clamp(lit * (0.4 + 0.8 * toward) + 0.15, 0.0, 1.0));
          col = mix(col, cc, dens);
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 96, 48), mat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  return sky;
}

// Prefiltered environment map rendered from a sky dome, so metal and glossy
// surfaces pick up the sky's colours.
export function skyEnvironment(renderer, sky) {
  const pm = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const copy = sky.clone();
  copy.position.set(0, 0, 0);
  envScene.add(copy);
  const tex = pm.fromScene(envScene, 0.02, 0.1, 5000).texture;
  pm.dispose();
  return tex;
}
