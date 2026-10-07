import * as THREE from 'three';

// ---------- deterministic randomness ----------
export function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rng(seed) {
  const r = mulberry32(seed);
  const f = () => r();
  f.range = (a, b) => a + (b - a) * r();
  f.int = (a, b) => Math.floor(a + (b - a + 1) * r());
  f.pick = (arr) => arr[Math.floor(r() * arr.length)];
  f.sign = () => (r() < 0.5 ? -1 : 1);
  return f;
}

// ---------- value noise ----------
export function makeNoise(seed) {
  const r = mulberry32(seed);
  const perm = new Uint16Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) vals[i] = r();
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const h2 = (x, y) => vals[perm[(perm[x & 255] + y) & 255]];
  const h3 = (x, y, z) => vals[perm[(perm[(perm[x & 255] + y) & 255] + z) & 255]];
  function n2(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const u = fade(x - xi), v = fade(y - yi);
    const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
    return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
  }
  function n3(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const u = fade(x - xi), v = fade(y - yi), w = fade(z - zi);
    const l = (a, b, t) => a + (b - a) * t;
    return l(
      l(l(h3(xi, yi, zi), h3(xi + 1, yi, zi), u), l(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), u), v),
      l(l(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), u), l(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), u), v),
      w);
  }
  function fbm2(x, y, oct = 5, lac = 2.0, gain = 0.5) {
    let s = 0, a = 0.5, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) { s += a * n2(x * f, y * f); norm += a; a *= gain; f *= lac; }
    return s / norm;
  }
  function fbm3(x, y, z, oct = 4, lac = 2.0, gain = 0.5) {
    let s = 0, a = 0.5, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) { s += a * n3(x * f, y * f, z * f); norm += a; a *= gain; f *= lac; }
    return s / norm;
  }
  return { n2, n3, fbm2, fbm3 };
}

// ---------- canvas textures ----------
export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

export function texFromCanvas(c, { srgb = true, repeat = null, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.needsUpdate = true;
  return t;
}

// Soft radial glow sprite texture (white -> transparent)
let _glowTex = null;
export function glowTexture() {
  if (_glowTex) return _glowTex;
  const [c, ctx] = canvas(256, 256);
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.15, 'rgba(255,255,255,0.75)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.22)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.05)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  _glowTex = texFromCanvas(c, { srgb: false });
  return _glowTex;
}

// ---------- rim-lit standard material ----------
// Adds a view-space fresnel rim: red from screen-right, blue/violet from screen-left.
export function rimMat(opts = {}, rim = {}) {
  const { right = 0xff2a2a, left = 0x6a5cff, strengthR = 1.2, strengthL = 0.6, power = 2.5 } = rim;
  const m = new THREE.MeshStandardMaterial(opts);
  const cR = new THREE.Color(right).multiplyScalar(strengthR);
  const cL = new THREE.Color(left).multiplyScalar(strengthL);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.rimR = { value: cR };
    sh.uniforms.rimL = { value: cL };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 rimR;\nuniform vec3 rimL;')
      .replace('#include <opaque_fragment>', `
        {
          vec3 vdir = normalize( vViewPosition );
          float fres = pow( 1.0 - clamp( abs( dot( normal, vdir ) ), 0.0, 1.0 ), ${power.toFixed(2)} );
          float sR = smoothstep( -0.05, 0.7, normal.x );
          float sL = smoothstep( -0.05, 0.7, -normal.x ) * (0.4 + 0.6 * smoothstep(-0.3, 0.6, normal.y));
          outgoingLight += ( rimR * sR + rimL * sL ) * fres;
        }
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'rim' + right + left + strengthR + strengthL + power;
  return m;
}

// Place point on camera ray through normalized screen coords (sx,sy in 0..1, y down) at a given distance
export function screenToWorld(camera, sx, sy, dist) {
  const ndc = new THREE.Vector3(sx * 2 - 1, -(sy * 2 - 1), 0.5);
  ndc.unproject(camera);
  const dir = ndc.sub(camera.position).normalize();
  return camera.position.clone().addScaledVector(dir, dist);
}
