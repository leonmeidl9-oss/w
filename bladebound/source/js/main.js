import * as THREE from 'three';
import { buildComposer } from './post.js';
import { buildLogo } from './logo.js';

// Renders one Bladebound artwork. URL parameters:
//   scene=titan|monument|forge|portals|duel|icon   which picture (default titan)
//   mode=icon                                  512x512 icon framing (titan scene)
//   w, h                                       output size in CSS pixels
//   logo=0                                     hide the logo
//   only=a,b / zoom=sx,sy,fov / debug=1        development helpers
const q = new URLSearchParams(location.search);
const SCENE = q.get('scene') || 'titan';
const MODE = q.get('mode') || 'thumb';
const SQUARE = MODE === 'icon' || SCENE === 'icon';
const W = +(q.get('w') || (SQUARE ? 512 : 1920));
const H = +(q.get('h') || (SQUARE ? 512 : 1080));
const DPR = window.devicePixelRatio || 1;
const ONLY = (q.get('only') || '').split(',').filter(Boolean);
const want = (k) => ONLY.length === 0 || ONLY.includes(k);

const stage = document.getElementById('stage');
stage.style.width = W + 'px';
stage.style.height = H + 'px';

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(DPR);
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// fonts first: some scenes draw signs with them into canvas textures
await Promise.all(['900 100px CinzelBB', '700 100px CinzelBB', '900 100px CinzelDecoBB'].map((f) => document.fonts.load(f)));

const { build } = await import(`./scenes/${SCENE}.js`);
const { scene, camera, logo, logoView, post } = await build({ W, H, DPR, MODE, q, want, renderer });

let renderCam = camera;
if (q.get('zoom') && SCENE !== 'titan') {
  const [zx, zy, zf] = q.get('zoom').split(',').map(Number);
  renderCam = camera.clone();
  const target = new THREE.Vector3(zx * 2 - 1, -(zy * 2 - 1), 0.5).unproject(camera);
  renderCam.fov = zf; renderCam.aspect = W / H;
  renderCam.lookAt(target);
  renderCam.updateProjectionMatrix();
  renderCam.updateMatrixWorld();
}
const composer = buildComposer(renderer, scene, renderCam, W, H, DPR, post);
composer.render();

// logo overlay: SVG on top of the canvas, laid out in a 1920x1080 (or 512x512) design space
const logoSvg = document.getElementById('logo');
logoSvg.setAttribute('width', W);
logoSvg.setAttribute('height', H);
if (logo && q.get('logo') !== '0') {
  logoSvg.setAttribute('viewBox', logoView || (MODE === 'icon' ? '0 0 512 512' : '0 0 1920 1080'));
  logoSvg.innerHTML = buildLogo(logo);
}
await new Promise((r) => setTimeout(r, 200));
window.__done = true;
