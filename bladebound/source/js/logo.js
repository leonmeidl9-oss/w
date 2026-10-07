// BLADEBOUND logo as layered SVG: chiseled silver letters split by a vertical
// sword, with blood-red / violet energy slashes behind.
let uid = 0;

export function logoDefs(id, s = 1) {
  return `
  <linearGradient id="chrome${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff"/>
    <stop offset="0.22" stop-color="#eef1f7"/>
    <stop offset="0.46" stop-color="#b3b9c8"/>
    <stop offset="0.5" stop-color="#5b6172"/>
    <stop offset="0.56" stop-color="#7d8496"/>
    <stop offset="0.8" stop-color="#d9dee9"/>
    <stop offset="1" stop-color="#8e95a6"/>
  </linearGradient>
  <linearGradient id="chromeBlade${id}" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#7c8394"/>
    <stop offset="0.45" stop-color="#f4f6fb"/>
    <stop offset="0.5" stop-color="#9aa1b2"/>
    <stop offset="0.55" stop-color="#5a6070"/>
    <stop offset="1" stop-color="#c9ceda"/>
  </linearGradient>
  <linearGradient id="slashRed${id}" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#ff1f3a" stop-opacity="0"/>
    <stop offset="0.35" stop-color="#ff2a3c" stop-opacity="0.95"/>
    <stop offset="0.7" stop-color="#ff6a5a" stop-opacity="1"/>
    <stop offset="1" stop-color="#ff1f3a" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="slashViolet${id}" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#9b3bff" stop-opacity="0"/>
    <stop offset="0.4" stop-color="#b45cff" stop-opacity="0.95"/>
    <stop offset="0.75" stop-color="#e2b8ff" stop-opacity="1"/>
    <stop offset="1" stop-color="#9b3bff" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="backdrop${id}" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#05040a" stop-opacity="0.78"/>
    <stop offset="0.6" stop-color="#05040a" stop-opacity="0.45"/>
    <stop offset="1" stop-color="#05040a" stop-opacity="0"/>
  </radialGradient>
  <filter id="metal${id}" x="-10%" y="-30%" width="120%" height="160%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="${(0.8 / s).toFixed(3)} ${(0.06 / s).toFixed(3)}" numOctaves="2" seed="7" result="noise"/>
    <feColorMatrix in="noise" type="saturate" values="0" result="gn"/>
    <feGaussianBlur in="SourceAlpha" stdDeviation="${(2.6 * s).toFixed(2)}" result="blur"/>
    <feSpecularLighting in="blur" surfaceScale="${(6 * s).toFixed(2)}" specularConstant="1.25" specularExponent="16" lighting-color="#ffffff" result="spec">
      <feDistantLight azimuth="235" elevation="38"/>
    </feSpecularLighting>
    <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn"/>
    <feDiffuseLighting in="blur" surfaceScale="${(6 * s).toFixed(2)}" diffuseConstant="1.15" lighting-color="#ffffff" result="diff">
      <feDistantLight azimuth="235" elevation="52"/>
    </feDiffuseLighting>
    <feComposite in="SourceGraphic" in2="diff" operator="arithmetic" k1="1.05" k2="0" k3="0" k4="0" result="shaded"/>
    <feComposite in="shaded" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="0.85" k4="0" result="lit"/>
    <feComposite in="lit" in2="gn" operator="arithmetic" k1="0.45" k2="0.72" k3="0" k4="0" result="tex"/>
    <feComposite in="tex" in2="SourceAlpha" operator="in"/>
  </filter>
  <filter id="glow${id}" x="-30%" y="-80%" width="160%" height="260%">
    <feGaussianBlur stdDeviation="${(9 * s).toFixed(2)}"/>
  </filter>
  <filter id="glowSoft${id}" x="-30%" y="-80%" width="160%" height="260%">
    <feGaussianBlur stdDeviation="${(22 * s).toFixed(2)}"/>
  </filter>
  <filter id="shadow${id}" x="-20%" y="-50%" width="140%" height="200%">
    <feGaussianBlur stdDeviation="${(7 * s).toFixed(2)}"/>
  </filter>`;
}

// Sword path pieces (pointing down), centered at x = 0. s = scale.
function swordPaths(s, top, guardY, tipY) {
  const gw = 150 * s;   // guard half-width
  const bw = 17 * s;    // blade half-width at the guard
  const blade = `M ${-bw} ${guardY + 10 * s} L ${bw} ${guardY + 10 * s} L ${bw * 0.95} ${tipY - 120 * s} L 0 ${tipY} L ${-bw * 0.95} ${tipY - 120 * s} Z`;
  const fuller = `M ${-2.5 * s} ${guardY + 26 * s} L ${2.5 * s} ${guardY + 26 * s} L ${1.5 * s} ${tipY - 160 * s} L ${-1.5 * s} ${tipY - 160 * s} Z`;
  // swept guard with downward hooks and an upward crown
  const guard = `M 0 ${guardY - 22 * s}
    C ${28 * s} ${guardY - 20 * s}, ${60 * s} ${guardY - 2 * s}, ${gw * 0.62} ${guardY - 6 * s}
    C ${gw * 0.82} ${guardY - 10 * s}, ${gw * 0.95} ${guardY - 30 * s}, ${gw} ${guardY - 46 * s}
    C ${gw * 1.02} ${guardY - 18 * s}, ${gw * 0.9} ${guardY + 8 * s}, ${gw * 0.7} ${guardY + 14 * s}
    C ${gw * 0.5} ${guardY + 18 * s}, ${36 * s} ${guardY + 14 * s}, ${20 * s} ${guardY + 26 * s}
    L 0 ${guardY + 44 * s}
    L ${-20 * s} ${guardY + 26 * s}
    C ${-36 * s} ${guardY + 14 * s}, ${-gw * 0.5} ${guardY + 18 * s}, ${-gw * 0.7} ${guardY + 14 * s}
    C ${-gw * 0.9} ${guardY + 8 * s}, ${-gw * 1.02} ${guardY - 18 * s}, ${-gw} ${guardY - 46 * s}
    C ${-gw * 0.95} ${guardY - 30 * s}, ${-gw * 0.82} ${guardY - 10 * s}, ${-gw * 0.62} ${guardY - 6 * s}
    C ${-60 * s} ${guardY - 2 * s}, ${-28 * s} ${guardY - 20 * s}, 0 ${guardY - 22 * s} Z`;
  const grip = `M ${-9 * s} ${guardY - 22 * s} L ${9 * s} ${guardY - 22 * s} L ${8 * s} ${top + 34 * s} L ${-8 * s} ${top + 34 * s} Z`;
  const pommel = `M 0 ${top} L ${17 * s} ${top + 22 * s} L 0 ${top + 46 * s} L ${-17 * s} ${top + 22 * s} Z`;
  const wraps = [];
  for (let y = guardY - 34 * s; y > top + 44 * s; y -= 13 * s) wraps.push(`M ${-9 * s} ${y} L ${9 * s} ${y - 6 * s}`);
  return { blade, fuller, guard, grip, pommel, wraps: wraps.join(' ') };
}

// Returns an SVG <g> string. Center of the word at (cx, cy) = baseline center.
export function buildLogo({ cx, cy, size = 170, font = 'CinzelBB', weight = 900, initFont = 'CinzelDecoBB', initWeight = 900, initScale = 1.3, gap = 70, letterSpacing = 2, slashes = true, backdrop = true }) {
  const id = ++uid;
  const F = size, FI = size * initScale;
  const capH = F * 0.72;
  const s = F / 170;
  const top = cy - capH - 165 * s, guardY = cy - capH - 22 * s, tipY = cy + capH * 1.35;
  const sw = swordPaths(s, top, guardY, tipY);

  const leftText = `<tspan font-family="${initFont}" font-weight="${initWeight}" font-size="${FI}">B</tspan><tspan>LADE</tspan>`;
  const rightText = `<tspan>BOUN</tspan><tspan font-family="${initFont}" font-weight="${initWeight}" font-size="${FI}">D</tspan>`;
  const textAttrs = `font-family="${font}" font-weight="${weight}" font-size="${F}" letter-spacing="${letterSpacing}"`;
  const words = (extra) => `
    <text x="${cx - gap / 2}" y="${cy}" text-anchor="end" ${textAttrs} ${extra}>${leftText}</text>
    <text x="${cx + gap / 2}" y="${cy}" text-anchor="start" ${textAttrs} ${extra}>${rightText}</text>`;
  const swordShapes = (extra) => `<g transform="translate(${cx} 0)">
    <path d="${sw.blade}" ${extra}/>
    <path d="${sw.grip}" ${extra}/>
    <path d="${sw.guard}" ${extra}/>
    <path d="${sw.pommel}" ${extra}/></g>`;

  const halfW = F * 3.55 + gap / 2;
  // tapered energy slash: crescent between two quadratic curves
  const slash = (x0, y0, x1, y1, bend, thick) => {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - bend;
    return `M ${x0} ${y0} Q ${mx} ${my - thick} ${x1} ${y1} Q ${mx} ${my + thick} ${x0} ${y0} Z`;
  };
  const L = cx - halfW, R = cx + halfW;
  const sRedTop = slash(L - 40 * s, cy - capH * 0.78, cx + halfW * 0.15, cy - capH * 1.12, 18 * s, 10 * s);
  const sRedBot = slash(cx - halfW * 0.1, cy + capH * 0.3, R + 50 * s, cy + capH * 0.02, 14 * s, 10 * s);
  const sVioBot = slash(L - 10 * s, cy + capH * 0.42, cx + halfW * 0.35, cy + capH * 0.22, -10 * s, 7 * s);
  const sVioTop = slash(cx + halfW * 0.05, cy - capH * 1.05, R + 30 * s, cy - capH * 0.7, 10 * s, 4.5 * s);
  const slashLayer = slashes ? `
    <g filter="url(#glowSoft${id})" opacity="0.85">
      <path d="${slash(L - 80 * s, cy - capH * 0.2, R + 80 * s, cy - capH * 0.55, 30 * s, 40 * s)}" fill="url(#slashRed${id})" opacity="0.7"/>
      <path d="${sRedTop}" fill="url(#slashRed${id})"/>
      <path d="${sRedBot}" fill="url(#slashRed${id})"/>
      <path d="${sVioBot}" fill="url(#slashViolet${id})"/>
    </g>
    <g filter="url(#glow${id})">
      <path d="${sRedTop}" fill="url(#slashRed${id})"/>
      <path d="${sRedBot}" fill="url(#slashRed${id})"/>
      <path d="${sVioBot}" fill="url(#slashViolet${id})"/>
      <path d="${sVioTop}" fill="url(#slashViolet${id})"/>
    </g>
    <path d="${sRedTop}" fill="url(#slashRed${id})"/>
    <path d="${sRedBot}" fill="url(#slashRed${id})"/>
    <path d="${sVioBot}" fill="url(#slashViolet${id})"/>
    <path d="${sVioTop}" fill="url(#slashViolet${id})"/>
  ` : '';

  return `
  <defs>${logoDefs(id, s)}</defs>
  ${backdrop ? `<ellipse cx="${cx}" cy="${cy - capH * 0.45}" rx="${halfW * 1.25}" ry="${capH * 2.1}" fill="url(#backdrop${id})"/>` : ''}
  ${slashLayer}
  <!-- drop shadow -->
  <g filter="url(#shadow${id})" transform="translate(0 ${8 * s})" opacity="0.95">
    ${words(`fill="#000" stroke="#000" stroke-width="${18 * s}" stroke-linejoin="round"`)}
    ${swordShapes(`fill="#000" stroke="#000" stroke-width="${16 * s}" stroke-linejoin="round"`)}
  </g>
  <!-- colored rim glow -->
  <g filter="url(#glow${id})" opacity="0.7">
    ${words(`fill="none" stroke="#b02040" stroke-width="${10 * s}" stroke-linejoin="round"`)}
  </g>
  <!-- extrusion / thickness -->
  ${[6, 5, 4, 3, 2, 1].map((k) => `<g transform="translate(0 ${k * 1.4 * s})">${words(`fill="#272a33" stroke="#0a0a0f" stroke-width="${7 * s}" stroke-linejoin="round" paint-order="stroke"`)}${swordShapes(`fill="#272a33" stroke="#0a0a0f" stroke-width="${6 * s}" stroke-linejoin="round" paint-order="stroke"`)}</g>`).join('')}
  <!-- dark outline -->
  ${words(`fill="#0a0a0f" stroke="#0a0a0f" stroke-width="${7 * s}" stroke-linejoin="round"`)}
  ${swordShapes(`fill="#0a0a0f" stroke="#0a0a0f" stroke-width="${6 * s}" stroke-linejoin="round"`)}
  <!-- sword metal -->
  <g transform="translate(${cx} 0)">
    <g filter="url(#metal${id})">
      <path d="${sw.blade}" fill="url(#chromeBlade${id})"/>
      <path d="${sw.guard}" fill="url(#chrome${id})"/>
      <path d="${sw.grip}" fill="#3b3442"/>
      <path d="${sw.pommel}" fill="url(#chrome${id})"/>
    </g>
    <path d="${sw.fuller}" fill="#454b5a" opacity="0.9"/>
    <path d="${sw.wraps}" stroke="#1b1720" stroke-width="${3 * s}"/>
    <!-- violet gems -->
    <g filter="url(#glow${id})"><path d="M 0 ${guardY - 12 * s} L ${13 * s} ${guardY + 6 * s} L 0 ${guardY + 26 * s} L ${-13 * s} ${guardY + 6 * s} Z" fill="#c070ff"/></g>
    <path d="M 0 ${guardY - 12 * s} L ${13 * s} ${guardY + 6 * s} L 0 ${guardY + 26 * s} L ${-13 * s} ${guardY + 6 * s} Z" fill="#7a2ad0" stroke="#1a0a2a" stroke-width="${3 * s}"/>
    <path d="M 0 ${guardY - 8 * s} L ${8 * s} ${guardY + 4 * s} L 0 ${guardY + 6 * s} Z" fill="#f0d8ff" opacity="0.9"/>
    <path d="M 0 ${top + 10 * s} L ${8 * s} ${top + 22 * s} L 0 ${top + 34 * s} L ${-8 * s} ${top + 22 * s} Z" fill="#a050ff" stroke="#1a0a2a" stroke-width="${2 * s}"/>
  </g>
  <!-- letters -->
  <g filter="url(#metal${id})">
    ${words(`fill="url(#chrome${id})"`)}
  </g>`;
}
