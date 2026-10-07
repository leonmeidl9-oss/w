import * as THREE from 'three';

export const NOISE_GLSL = /* glsl */`
vec3 mod289(vec3 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
float fbm(vec3 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 6; i++) { s += a * snoise(p); p = p * 2.02 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
  return s;
}
float fbm4(vec3 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * snoise(p); p = p * 2.03 + vec3(4.1, 2.7, 8.3); a *= 0.5; }
  return s;
}
`;

// Stormy sky dome: cold indigo storm on the left, blood-red storm on the right,
// a black eclipse with a burning red ring.
export function buildSky({ camera, eclipseDir, eclipseRadius = 0.07 }) {
  const right = new THREE.Vector3(), up = new THREE.Vector3(), fwd = new THREE.Vector3();
  camera.matrixWorld.extractBasis(right, up, fwd);
  fwd.negate();
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uEclipse: { value: eclipseDir.clone().normalize() },
      uRight: { value: right },
      uUp: { value: up },
      uFwd: { value: fwd },
      uR: { value: eclipseRadius },
    },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize( position );
        vec4 p = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vDir;
      uniform vec3 uEclipse, uRight, uUp, uFwd;
      uniform float uR;
      ${NOISE_GLSL}
      float cloudField( vec3 d ) {
        vec3 p = vec3( d.x * 1.7, d.y * 3.8, d.z * 1.7 ) + vec3( 0.0, 0.0, 2.0 );
        vec3 w = vec3( fbm4( p * 0.6 ), fbm4( p * 0.6 + vec3( 3.1, 7.2, 1.4 ) ), fbm4( p * 0.6 + vec3( 8.3, 2.2, 5.5 ) ) );
        p += w * 0.45;
        float base = fbm4( p );
        float bill = 0.0, a = 0.5;
        vec3 pb = p * 2.6;
        for ( int i = 0; i < 4; i++ ) { bill += a * abs( snoise( pb ) ); pb = pb * 2.1 + vec3( 1.3, 0.7, 2.1 ); a *= 0.5; }
        return base + ( 0.45 - bill ) * 0.45;
      }
      void main() {
        vec3 d = normalize( vDir );
        float fz = max( dot( d, uFwd ), 0.05 );
        float sx = dot( d, uRight ) / fz;
        float sy = dot( d, uUp ) / fz;
        float side = smoothstep( -0.20, 0.16, sx );
        float elev = d.y;

        // base gradient
        vec3 zenL = vec3( 0.003, 0.005, 0.018 );
        vec3 horL = vec3( 0.022, 0.026, 0.090 );
        vec3 zenR = vec3( 0.020, 0.001, 0.006 );
        vec3 horR = vec3( 0.150, 0.008, 0.016 );
        float hg = smoothstep( -0.08, 0.55, elev );
        vec3 col = mix( mix( horL, zenL, hg ), mix( horR, zenR, hg ), side );

        // eclipse geometry
        float ang = acos( clamp( dot( d, uEclipse ), -1.0, 1.0 ) );
        float outside = max( ang - uR, 0.0 );
        float coronaWide = exp( -outside * 3.0 );
        float corona = exp( -outside * 20.0 );
        col += vec3( 0.30, 0.012, 0.02 ) * coronaWide * 0.5 * smoothstep( 0.0, 0.6, side );

        float n = cloudField( d );
        float dens = smoothstep( -0.16, 0.22, n );
        dens *= mix( 0.10, 1.0, smoothstep( uR * 1.15, uR * 3.2, ang ) );

        // fake directional lighting: step toward the light, compare density
        vec3 toE = normalize( uEclipse - d * dot( d, uEclipse ) );
        float nR = cloudField( normalize( d + toE * 0.028 ) );
        float litR = clamp( ( n - nR ) * 3.5 + 0.30, 0.0, 1.0 );
        float nL = cloudField( normalize( d + uUp * 0.022 - uRight * 0.016 ) );
        float litL = clamp( ( n - nL ) * 3.5 + 0.25, 0.0, 1.0 );

        vec3 cDarkL = vec3( 0.010, 0.013, 0.038 );
        vec3 cLitL  = vec3( 0.075, 0.095, 0.260 );
        vec3 cDarkR = vec3( 0.045, 0.002, 0.007 );
        vec3 cLitR  = vec3( 0.900, 0.060, 0.040 );
        vec3 cl = mix( cDarkL, cLitL, litL );
        vec3 cr = mix( cDarkR, cLitR * mix( 0.22, 1.25, coronaWide ), litR * litR );
        vec3 cloudCol = mix( cl, cr, side );
        cloudCol += vec3( 0.06, 0.008, 0.10 ) * ( 1.0 - abs( side * 2.0 - 1.0 ) ) * ( 0.2 + litL );
        // silver lining around cloud edges near the eclipse
        float edge = dens * ( 1.0 - dens ) * 4.0;
        cloudCol += vec3( 1.4, 0.12, 0.06 ) * edge * corona * 2.0;
        col = mix( col, cloudCol, dens );

        // eclipse disk and burning ring
        float disk = 1.0 - smoothstep( uR - 0.0015, uR + 0.0005, ang );
        col = mix( col, vec3( 0.002, 0.0, 0.001 ), disk );
        float ring = exp( -pow( ( ang - uR ) / 0.0030, 2.0 ) );
        float ring2 = exp( -pow( ( ang - uR ) / 0.0090, 2.0 ) );
        col += vec3( 3.2, 0.32, 0.18 ) * ring;
        col += vec3( 0.9, 0.05, 0.03 ) * ring2 * ( 1.0 - disk * 0.7 );
        col += vec3( 0.7, 0.04, 0.03 ) * corona * ( 1.0 - disk );
        col += vec3( 0.12, 0.004, 0.01 ) * disk * smoothstep( uR * 0.5, uR, ang );

        gl_FragColor = vec4( col, 1.0 );
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 96, 48), mat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  sky.position.copy(camera.position);
  return sky;
}
