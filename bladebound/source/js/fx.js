import * as THREE from 'three';
import { glowTexture, rng } from './util.js';

// Camera-facing additive glow quad.
export function glowQuad(camera, pos, size, color, opacity = 1, fog = false) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: glowTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog }),
  );
  m.position.copy(pos);
  m.quaternion.copy(camera.quaternion);
  m.renderOrder = 10;
  return m;
}

// Soft additive particles with per-point color and size (world units).
export function glowPoints(positions, colors, sizes, { opacity = 1, depthTest = true } = {}) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: window.innerHeight * (window.devicePixelRatio || 1) * 0.5 }, uOpacity: { value: opacity } },
    vertexShader: /* glsl */`
      attribute float size; attribute vec3 color; varying vec3 vColor;
      uniform float uScale;
      void main(){
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * uScale * projectionMatrix[1][1] / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vColor; uniform float uOpacity;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float r = length(c) * 2.0;
        float a = smoothstep(1.0, 0.0, r);
        a = a * a * (0.35 + 0.65 * smoothstep(0.55, 0.0, r));
        gl_FragColor = vec4(vColor * a * uOpacity, 1.0);
      }`,
    transparent: true, depthWrite: false, depthTest, blending: THREE.AdditiveBlending,
  });
  const p = new THREE.Points(geo, mat);
  p.renderOrder = 11;
  p.frustumCulled = false;
  return p;
}

// Camera-facing ribbon along a world-space polyline (for lightning, slashes).
export function ribbon(camera, pts, widthFn, color, { opacity = 1, additive = true } = {}) {
  const pos = [], uv = [], idx = [];
  const camPos = camera.position;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const t = b.clone().sub(a).normalize();
    const v = camPos.clone().sub(p).normalize();
    const side = new THREE.Vector3().crossVectors(t, v).normalize();
    const w = widthFn(i / (pts.length - 1)) / 2;
    pos.push(p.x + side.x * w, p.y + side.y * w, p.z + side.z * w, p.x - side.x * w, p.y - side.y * w, p.z - side.z * w);
    uv.push(i / (pts.length - 1), 0, i / (pts.length - 1), 1);
    if (i < pts.length - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      varying vec2 vUv; uniform vec3 uColor; uniform float uOpacity;
      void main(){
        float across = 1.0 - abs(vUv.y * 2.0 - 1.0);
        float core = smoothstep(0.55, 1.0, across);
        float soft = across * across;
        vec3 c = uColor * soft + vec3(1.0) * core * 0.9 * length(uColor) * 0.35;
        gl_FragColor = vec4(c * uOpacity, 1.0);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 12;
  m.frustumCulled = false;
  return m;
}

// Jagged lightning polyline between two points, bulging away from a center line.
export function lightningPath(r, a, b, bulge, segs = 14, jitter = 0.12) {
  const pts = [];
  const dir = b.clone().sub(a);
  const len = dir.length();
  const n1 = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).cross(dir).normalize();
  const n2 = new THREE.Vector3().crossVectors(dir, n1).normalize();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const p = a.clone().addScaledVector(dir, t);
    const arc = Math.sin(t * Math.PI);
    p.addScaledVector(bulge, arc);
    if (i > 0 && i < segs) {
      p.addScaledVector(n1, (r() - 0.5) * jitter * len);
      p.addScaledVector(n2, (r() - 0.5) * jitter * len);
    }
    pts.push(p);
  }
  return pts;
}

// Flame billboard texture (teardrop gradient with noise wisps)
let _flameTex = null;
export function flameTexture() {
  if (_flameTex) return _flameTex;
  const W = 128, H = 256;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  const r = rng(31);
  const offs = Array.from({ length: 8 }, () => r() * 6.28);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = (x / W - 0.5) * 2, v = 1 - y / H; // v: 0 bottom .. 1 top
      const wob = 0.12 * Math.sin(v * 9 + offs[0]) * v + 0.06 * Math.sin(v * 17 + offs[1]) * v;
      const width = (1 - v) ** 0.7 * (0.55 + 0.45 * Math.sin(Math.min(v * 3.2, Math.PI / 2))) * 0.95;
      const d = Math.abs(u - wob) / Math.max(width, 1e-3);
      let a = THREE.MathUtils.smoothstep(1 - d, 0.0, 0.45) * Math.min(1, v * 8) * (1 - v) ** 0.5;
      const i = (y * W + x) * 4;
      img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255; img.data[i + 3] = Math.min(255, a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  _flameTex = new THREE.CanvasTexture(c);
  return _flameTex;
}

export function flameQuad(camera, pos, w, h, color, opacity = 1) {
  const geo = new THREE.PlaneGeometry(w, h);
  geo.translate(0, h / 2, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: flameTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  m.position.copy(pos);
  // face camera but stay upright
  const dir = camera.position.clone().sub(pos); dir.y = 0;
  m.rotation.y = Math.atan2(dir.x, dir.z);
  m.renderOrder = 13;
  return m;
}
