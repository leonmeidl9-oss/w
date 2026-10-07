import * as THREE from 'three';

const v3 = (c) => {
  const col = new THREE.Color(c);
  return `vec3(${col.r.toFixed(5)}, ${col.g.toFixed(5)}, ${col.b.toFixed(5)})`;
};

// Replaces three's fog chunks with a screen-split colored fog (cold blue on the
// left, blood red on the right) plus a low-lying mist that fills the chasm.
// Materials can set defines.FOG_SCALE to weaken/strengthen fog per material.
export function installFog(o) {
  THREE.ShaderChunk.fog_pars_vertex = `
#ifdef USE_FOG
  varying float vFogDepth;
  varying vec3 vFogWorld;
#endif`;

  THREE.ShaderChunk.fog_vertex = `
#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  {
    vec4 fwp = vec4( transformed, 1.0 );
    #ifdef USE_INSTANCING
      fwp = instanceMatrix * fwp;
    #endif
    vFogWorld = ( modelMatrix * fwp ).xyz;
  }
#endif`;

  THREE.ShaderChunk.fog_pars_fragment = `
#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  varying vec3 vFogWorld;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif`;

  THREE.ShaderChunk.fog_fragment = `
#ifdef USE_FOG
  #ifndef FOG_SCALE
    #define FOG_SCALE 1.0
  #endif
  {
    float fsx = gl_FragCoord.x / ${o.resX.toFixed(1)};
    float fsy = gl_FragCoord.y / ${o.resY.toFixed(1)};
    float fdist = vFogDepth;
    float ff = 1.0 - exp( - ${o.density.toFixed(6)} * max( fdist - ${o.start.toFixed(2)}, 0.0 ) );
    ff = min( ff * ${o.max.toFixed(3)} * FOG_SCALE, 1.0 );
    float hm = smoothstep( ${o.mistTop.toFixed(2)}, ${o.mistBottom.toFixed(2)}, vFogWorld.y )
             * smoothstep( ${o.mistNear.toFixed(1)}, ${o.mistFar.toFixed(1)}, fdist );
    hm = min( hm * ${o.mistMax.toFixed(3)} * FOG_SCALE, 1.0 );
    float fside = smoothstep( ${o.splitA.toFixed(3)}, ${o.splitB.toFixed(3)}, fsx );
    vec3 fc = mix( ${v3(o.left)}, ${v3(o.right)}, fside );
    vec3 mc = mix( ${v3(o.mistLeft)}, ${v3(o.mistRight)}, fside );
    fc *= 0.8 + 0.45 * smoothstep( 0.25, 0.6, fsy );
    gl_FragColor.rgb = mix( gl_FragColor.rgb, fc, ff );
    gl_FragColor.rgb = mix( gl_FragColor.rgb, mc, hm );
  }
#endif`;
}
