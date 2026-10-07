import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export function buildComposer(renderer, scene, camera, W, H, dpr, opts = {}) {
  const { bloomStrength = 0.9, bloomRadius = 0.55, bloomThreshold = 0.85, vignette = 0.5, samples = 4 } = opts;
  const rt = new THREE.WebGLRenderTarget(W * dpr, H * dpr, { type: THREE.HalfFloatType, samples });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(dpr);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W * dpr, H * dpr), bloomStrength, bloomRadius, bloomThreshold);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uRes: { value: new THREE.Vector2(W * dpr, H * dpr) },
      uVig: { value: vignette },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uVig;
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec2 uv = vUv;
        vec2 c = uv - 0.5;
        float ca = 0.0035 * dot(c, c);
        vec3 col;
        col.r = texture2D(tDiffuse, uv + c * ca * 2.0).r;
        col.g = texture2D(tDiffuse, uv).g;
        col.b = texture2D(tDiffuse, uv - c * ca * 2.0).b;
        float aspect = uRes.x / uRes.y;
        float vig = smoothstep(1.05, 0.30, length(c * vec2(aspect * 0.62, 1.0)));
        col *= mix(1.0 - uVig, 1.0, vig);
        float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(vec3(l), col, 1.10);
        col = clamp((col - 0.5) * 1.05 + 0.5, 0.0, 1.0);
        col += (hash(uv * uRes + 3.7) - 0.5) * 0.018;
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }`,
  });
  composer.addPass(grade);
  return composer;
}
