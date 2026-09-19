import { cameraBox, clamp, fragmentState, islandAccretion, islandSurfaceY, pillowState, SEA_FLOOR, SEA_LEVEL, submarineState, type AccretionPhase, type Environment, type Supply, type Viewpoint } from './model.ts';

export type SceneFrame = { progress: number; weights: [number, number, number]; supplyMix: number; camera: [number, number, number, number]; section: number };
const environments: Environment[] = ['deep', 'shallow', 'island'];
const n = (v: number) => v.toFixed(3);
const seeded = (index: number, salt: number): number => {
  let value = Math.imul(index + 17, 0x45d9f3b) ^ Math.imul(salt + 31, 0x27d4eb2d);
  value = Math.imul(value ^ value >>> 16, 0x45d9f3b);
  return ((value ^ value >>> 16) >>> 0) / 4294967296;
};

/** Stable, asymmetric lobe silhouettes; geometry never changes randomly between frames. */
const pillowShapes = Array.from({ length: 14 }, (_, index) => {
  const rx = 24 + seeded(index, 1) * 10, ry = 14 + seeded(index, 2) * 9;
  const points = Array.from({ length: 9 }, (_, vertex) => {
    const angle = vertex / 9 * Math.PI * 2;
    const radius = .78 + seeded(index, vertex + 8) * .39;
    return [Math.cos(angle) * rx * radius, Math.sin(angle) * ry * radius];
  });
  const mid = (a: number[], b: number[]) => `${n((a[0] + b[0]) / 2)} ${n((a[1] + b[1]) / 2)}`;
  const outline = `M${mid(points[8], points[0])}${points.map((point, vertex) => `Q${n(point[0])} ${n(point[1])} ${mid(point, points[(vertex + 1) % points.length])}`).join('')}Z`;
  const cracks = Array.from({ length: 5 }, (_, crack) => {
    const x = (seeded(index, crack + 23) - .5) * rx * 1.6;
    const y = (seeded(index, crack + 34) - .7) * ry * 1.4;
    const dx = (seeded(index, crack + 45) - .4) * 7;
    const dy = 3 + seeded(index, crack + 56) * 7;
    return `M${n(x)} ${n(y)}l${n(dx)} ${n(dy)}l${n(-dx * .6 - 2)} ${n(dy * .55)}m${n(dx * .6 + 2)} ${n(-dy * .55)}l${n(dx + 4)} ${n(dy * .3)}`;
  }).join('');
  return { outline, cracks, rx, ry, rotation: (seeded(index, 4) - .5) * 30, dx: (seeded(index, 5) - .5) * 7, dy: (seeded(index, 6) - .5) * 6 };
});

// Lobes bud from an interconnected stack instead of appearing on one diagonal string.
const pillowAnchors = [
  [0, 29], [-27, 38], [29, 38], [-53, 49], [55, 50], [-12, 18], [17, 15],
  [-39, 25], [43, 27], [-70, 58], [72, 59], [-22, 2], [9, -3], [35, 7],
] as const;

const surfaceGrain = Array.from({ length: 110 }, (_, i) => {
  const x = 50 + seeded(i, 71) * 900, y = 170 + seeded(i, 72) * 450;
  const r = .35 + seeded(i, 73) * 1.3;
  return `<path d="M${n(x)} ${n(y)}l${n(r * 2.1)} ${n(-r * .4)}" stroke="${i % 3 ? '#b6b699' : '#142d36'}" stroke-width="${n(r)}" opacity=".2"/>`;
}).join('');

export function createScene(svg: SVGSVGElement) {
  svg.innerHTML = `<defs>
    <linearGradient id="sky" x2="0" y2="1"><stop stop-color="#9dc3cc"/><stop offset="1" stop-color="#eee6ce"/></linearGradient>
    <linearGradient id="ocean" gradientUnits="userSpaceOnUse" x1="0" y1="154" x2="0" y2="670"><stop stop-color="#399b9e"/><stop offset=".48" stop-color="#154b61"/><stop offset="1" stop-color="#0a2234"/></linearGradient>
    <linearGradient id="ocean-deep" gradientUnits="userSpaceOnUse" x1="0" y1="154" x2="0" y2="440"><stop stop-color="#20647b"/><stop offset=".2" stop-color="#10394f"/><stop offset=".55" stop-color="#081d30"/><stop offset="1" stop-color="#050f1b"/></linearGradient>
    <linearGradient id="rock" x1=".2" y1="0" x2=".65" y2="1"><stop stop-color="#7b8478"/><stop offset=".28" stop-color="#455c5e"/><stop offset=".65" stop-color="#293e48"/><stop offset="1" stop-color="#192b37"/></linearGradient>
    <linearGradient id="interior" x2="0" y2="1"><stop stop-color="#857a5a"/><stop offset="1" stop-color="#333b3e"/></linearGradient>
    <linearGradient id="island-rock" x1=".2" y1="0" x2=".75" y2="1"><stop stop-color="#465e5e"/><stop offset=".48" stop-color="#253f49"/><stop offset="1" stop-color="#102936"/></linearGradient>
    <linearGradient id="fresh-flow" x1="0" x2="1"><stop stop-color="#fff0a5"/><stop offset=".3" stop-color="#ef9a3d"/><stop offset=".72" stop-color="#b6472d"/><stop offset="1" stop-color="#283c43"/></linearGradient>
    <linearGradient id="molten" x2="0" y2="1"><stop stop-color="#fff1b1"/><stop offset=".4" stop-color="#ffae43"/><stop offset="1" stop-color="#d35025"/></linearGradient>
    <radialGradient id="heat"><stop stop-color="#ffce76" stop-opacity=".64"/><stop offset=".4" stop-color="#ff9549" stop-opacity=".25"/><stop offset="1" stop-color="#eb7436" stop-opacity="0"/></radialGradient>
    <radialGradient id="pillow-skin" cx=".28" cy=".18" r=".88"><stop stop-color="#829490"/><stop offset=".27" stop-color="#4b676f"/><stop offset=".66" stop-color="#243f4d"/><stop offset="1" stop-color="#102733"/></radialGradient>
    <linearGradient id="lightshaft" x2="0" y2="1"><stop stop-color="#d4fff2" stop-opacity=".1"/><stop offset="1" stop-color="#d4fff2" stop-opacity="0"/></linearGradient>
    <linearGradient id="lamp-beam"><stop stop-color="#dbf5e6" stop-opacity=".16"/><stop offset="1" stop-color="#c0ebd8" stop-opacity="0"/></linearGradient>
    <radialGradient id="lamp-pool"><stop stop-color="#bfd9c6" stop-opacity=".06"/><stop offset="1" stop-color="#bfd9c6" stop-opacity="0"/></radialGradient>
    <radialGradient id="particle-haze"><stop stop-color="#a0aca1" stop-opacity=".36"/><stop offset="1" stop-color="#9ca99a" stop-opacity="0"/></radialGradient>
    <radialGradient id="condensation"><stop stop-color="#edf0df" stop-opacity=".66"/><stop offset=".62" stop-color="#d7e5dd" stop-opacity=".3"/><stop offset="1" stop-color="#d7e5dd" stop-opacity="0"/></radialGradient>
    <pattern id="fragment-speckle" width="18" height="14" patternUnits="userSpaceOnUse"><rect width="18" height="14" fill="#756e59"/><path d="M2 10l3-5 4 3-2 4zm9-7l4 2-1 4-4-2z" fill="#b2a17a" opacity=".55"/></pattern>
    <clipPath id="underwater"><rect x="-500" y="154" width="2000" height="1000"/></clipPath>
    <clipPath id="above-water"><rect x="-500" y="-500" width="2000" height="654"/></clipPath>
  </defs><g id="ocean-art"></g>`;
  const art = svg.querySelector<SVGGElement>('#ocean-art')!;
  return (frame: SceneFrame) => {
    svg.setAttribute('viewBox', frame.camera.map(n).join(' '));
    art.innerHTML = sceneMarkup(frame);
  };
}

/** Pure SVG projection: snapshots remain stable while paused and at the final frame. */
export function sceneMarkup(frame: SceneFrame): string {
  const deep = frame.weights[0];
  const y = frame.weights.reduce((sum, weight, i) => sum + weight * submarineState(frame.progress, environments[i], 'sustained').summit, 0);
  const rovY = y - 60;
  return `<rect x="-500" y="-500" width="2000" height="1200" fill="url(#sky)"/>
    <circle cx="817" cy="65" r="26" fill="#f9edc5" opacity=".75"/>
    <path d="M0 126 Q160 123 230 134 T520 126 T1000 130 V157 H0Z" fill="#a6c6c3" opacity=".28"/>
    <rect x="-500" y="${SEA_LEVEL}" width="2000" height="800" fill="url(#ocean)"/>
    ${deep > .001 ? `<rect data-lighting="deep" x="-500" y="${SEA_LEVEL}" width="2000" height="800" fill="url(#ocean-deep)" opacity="${n(deep)}"/>` : ''}
    ${deep < .999 ? `<path data-lighting="sunlit-shallows" d="M125 155L172 294H265L240 155Z M675 155L650 302H722L770 155Z" fill="url(#lightshaft)" opacity="${n(1 - deep)}"/>` : ''}
    <path d="M0 514L65 501L97 503L123 493L175 499L237 488L312 499L372 509L465 500L540 516L660 496L735 505L812 492L900 503L1000 494V800H0Z" fill="#0a1d2b"/>
    <g>${frame.weights.map((weight, i) => weight > .001 ? `<g opacity="${n(weight * (i === 0 ? 1 : .85))}">${i === 2
      ? `<g opacity="${n(1 - frame.supplyMix)}">${scenario(frame.progress, 'island', 'sustained', frame.section)}</g><g opacity="${n(frame.supplyMix)}">${scenario(frame.progress, 'island', 'limited', frame.section)}</g>`
      : scenario(frame.progress, environments[i], 'sustained', frame.section)}</g>` : '').join('')}</g>
    <g fill="none" stroke="#b4e0d6" opacity="${n(.16 + (1 - deep) * .14)}">${Array.from({ length: 12 }, (_, i) => `<path d="M${i * 88 - 25} ${157 + i % 3 * 4}q18-3 35 0" stroke-width="${.6 + i % 3 * .3}"/>`).join('')}</g>
    <g data-lighting="rov" opacity="${n(deep * (1 - frame.section * .45))}">
      <path d="M313 ${n(rovY)}L716 ${n(y - 34)}L647 ${n(y + 107)}Z" fill="url(#lamp-beam)"/>
      <ellipse cx="551" cy="${n(y + 33)}" rx="175" ry="92" fill="url(#lamp-pool)"/>
      <g transform="translate(285 ${n(rovY)})">${rovMarkup()}</g>
    </g>`;
}

function rovMarkup(): string {
  return `<path d="M-7-20Q-30-78-96-120" fill="none" stroke="#426474" stroke-width="1.2"/>
    <path d="M-29 11L-24-19H21L27 11Z" fill="#172b36" stroke="#8caaa7" stroke-width="2"/>
    <rect x="-23" y="-17" width="39" height="23" rx="5" fill="#d3ac53"/>
    <path d="M-20-13H11V-8H-20Z" fill="#f0d181"/><path d="M-20-3H8M-20 2H8" stroke="#8e753e" stroke-width="1"/>
    <circle cx="-18" cy="11" r="7" fill="#122431" stroke="#7a9398" stroke-width="2"/><circle cx="14" cy="11" r="7" fill="#122431" stroke="#7a9398" stroke-width="2"/>
    <path d="M-33 16H30M-26 22H23M-26 16V22M23 16V22" stroke="#9dafaa" stroke-width="2"/>
    <rect x="17" y="-9" width="12" height="10" rx="3" fill="#49626a"/><circle cx="29" cy="-4" r="4" fill="#edffe7"/>
    <path d="M18 6L34 16L41 13M34 16L39 20" fill="none" stroke="#a7b4a7" stroke-width="2"/>
    <circle cx="4" cy="-22" r="2" fill="#7ad0b4"/>`;
}

function scenario(progress: number, environment: Environment, supply: Supply, section: number): string {
  if (environment === 'island') return islandScenario(progress, supply, section);
  const s = submarineState(progress, environment, supply);
  const y = s.summit;
  const mountain = mountainPath(y);
  const hot = .12 + s.activity * .88;
  // Attenuate cold terrain separately: emitted lava light and lamp-lit rinds stay legible.
  let out = `<g opacity="${environment === 'deep' ? '.55' : '1'}">${terrainMarkup(y, environment, supply, section)}</g>`;
  out += `<clipPath id="interior-${environment}-${supply}"><path d="${mountain}"/></clipPath><g clip-path="url(#interior-${environment}-${supply})" opacity="${n(.22 + section * .78)}">
    <ellipse cx="508" cy="552" rx="87" ry="33" fill="#3f3631" stroke="#92664b" stroke-width="4"/>
    <ellipse cx="508" cy="552" rx="75" ry="25" fill="url(#molten)" opacity="${n(.35 + s.activity * .55)}"/>
    <path d="M508 533C461 480 529 ${y + 74} 499 ${y + 9}" fill="none" stroke="#243b3e" stroke-width="28" stroke-linecap="round"/>
    <path d="M508 533C461 480 529 ${y + 74} 499 ${y + 9}" fill="none" stroke="url(#molten)" stroke-width="15" stroke-linecap="round" opacity="${n(hot)}"/>
    <path d="M504 ${Math.max(y + 70, 340)}Q562 389 597 422" fill="none" stroke="#bf6441" stroke-width="8" opacity=".7"/></g>`;
  out += `<path d="M474 ${y + 11}L481 ${y + 7}Q493 ${y + 12} 504 ${y + 9}L519 ${y + 11}L526 ${y + 16}Q512 ${y + 25} 490 ${y + 22}L477 ${y + 18}Z" fill="#0d2430" stroke="#65756b" stroke-width="2"/>
    <path d="M482 ${y + 13}Q497 ${y + 9} 519 ${y + 14}Q504 ${y + 20} 487 ${y + 18}Z" fill="url(#molten)" opacity="${n(s.activity * .9)}"/>
    <path d="M477 ${y + 10}L487 ${y + 11}M512 ${y + 12}L520 ${y + 13}" stroke="#a39e7e" stroke-width="1.2" opacity=".6"/>`;
  if (environment === 'deep') {
    const fed = clamp((progress - .045) / .34);
    out += `<path d="M500 ${n(y + 82)}C499 ${n(y + 62)} 492 ${n(y + 48)} 500 ${n(y + 24)}C480 ${n(y + 30)} 462 ${n(y + 40)} 445 ${n(y + 54)}M500 ${n(y + 24)}C523 ${n(y + 31)} 543 ${n(y + 43)} 562 ${n(y + 57)}" fill="none" stroke="#182f39" stroke-width="17" stroke-linecap="round" opacity="${n(fed * .92)}"/>
      <path d="M500 ${n(y + 80)}C499 ${n(y + 61)} 493 ${n(y + 46)} 500 ${n(y + 24)}" fill="none" stroke="#e47639" stroke-width="5" stroke-linecap="round" opacity="${n(fed * (1 - clamp((progress - .48) / .42)))}"/>`;
    for (let i = 0; i < pillowAnchors.length; i++) {
      const pillow = pillowState(progress, i);
      if (pillow.growth === 0) continue;
      const shape = pillowShapes[i];
      const [anchorX, anchorY] = pillowAnchors[i];
      const x = 500 + anchorX + shape.dx;
      const py = y + anchorY + shape.dy;
      const coreScale = .66 - pillow.crust * .10;
      const cutaway = i % 3 === 1 ? clamp(section * 1.55) : 0;
      const advancing = clamp(pillow.coreHeat * (.3 + 3.4 * pillow.growth * (1 - pillow.growth)));
      out += `<g transform="translate(${n(x)} ${n(py)}) rotate(${n(shape.rotation)}) scale(${n(pillow.growth)})">
        <clipPath id="pillow-${i}"><path d="${shape.outline}"/></clipPath>
        <path d="${shape.outline}" transform="translate(2 3)" fill="#061622" opacity=".7"/>
        <path d="${shape.outline}" fill="url(#pillow-skin)" stroke="#203741" stroke-width="1.1"/>
        <g clip-path="url(#pillow-${i})">
          <path d="M${n(-shape.rx * .75)} ${n(-shape.ry * .24)}Q${n(-shape.rx * .6)} ${n(-shape.ry * .78)} ${n(-shape.rx * .12)} ${n(-shape.ry * .69)}" fill="none" stroke="#aac0ad" stroke-width="1.1" opacity=".45"/>
          <path d="${shape.cracks}" fill="none" stroke="#19333e" stroke-width=".85" stroke-linecap="round" opacity=".68"/>
          <path d="M-18-3Q-10-11 3-10M-20 1Q-10-6 0-5M-16 5Q-8-1-2 0M6-12L10-9M13 7L19 3" fill="none" stroke="#80918b" stroke-width=".5" opacity=".45"/>
          <g opacity="${n(cutaway)}" transform="translate(3 1) scale(${n(coreScale)} ${n(coreScale * .86)})">
            <path d="${shape.outline}" fill="#415b5f" opacity="${n(.2 + section * .5)}"/>
            <path d="${shape.outline}" fill="url(#molten)" stroke="#3b4947" stroke-width="1.8" opacity="${n(pillow.coreHeat * (.78 + section * .22))}"/>
          </g>
          <path d="M${n(shape.rx * .53)} ${n(-shape.ry * .3)}l3 3l-2 3l3 3" fill="none" stroke="#ffab43" stroke-width="2.1" opacity="${n(advancing)}"/>
          <path d="M${n(shape.rx * .56)} ${n(-shape.ry * .31)}l2 3l-1 3l2 3" fill="none" stroke="#fff2b7" stroke-width=".6" opacity="${n(advancing)}"/>
        </g></g>`;
    }
    out += particlePlume(progress, y, 'deep');
    out += `<ellipse cx="521" cy="${y + 30}" rx="75" ry="35" fill="url(#heat)" opacity="${n(s.activity * .2)}"/>`;
  }
  if (environment === 'shallow') {
    // Finite packets disperse and settle; no indefinitely repeating fountain.
    for (let i = 0; i < 49; i++) {
      const f = fragmentState(progress, i);
      if (!f.visible) continue;
      out += `<path d="M-3-2L2-3L4 2L-2 3Z" transform="translate(${n(500 + f.x)} ${n(y + f.y)}) rotate(${i * 37})" fill="${f.heat > .6 ? '#eda36f' : '#b2b3a0'}" stroke="#344548" stroke-width=".8"/>`;
    }
    out += particlePlume(progress, y, 'shallow');
    for (let i = 0; i < 20; i++) {
      const q = clamp((progress - (.09 + i % 7 * .082)) / .31);
      if (q <= 0 || q >= 1) continue;
      const drift = q * (34 + seeded(i, 105) * 45);
      const x = 498 + (i % 3 - 1) * q * 32 + drift;
      const py = y - q * (95 + seeded(i, 106) * 45);
      const radius = 8 + q * 33;
      out += `<g data-material="condensation" clip-path="url(#above-water)" opacity="${n(Math.sin(q * Math.PI) * .8)}"><ellipse cx="${n(x)}" cy="${n(py)}" rx="${n(radius * 1.4)}" ry="${n(radius)}" fill="url(#condensation)"/><ellipse cx="${n(x - radius * .45)}" cy="${n(py - radius * .23)}" rx="${n(radius)}" ry="${n(radius * .7)}" fill="url(#condensation)"/></g>`;
    }
  }
  return out;
}

const islandXs = Array.from({ length: 59 }, (_, index) => 65 + index * 15);
const phaseColors: Record<AccretionPhase, string[]> = {
  'deep-base': ['#1a3540', '#294950', '#385b5c', '#223f49'],
  'spreading-flows': ['#334d4f', '#58645a', '#283f46', '#687063'],
  'shallow-fragments': ['url(#fragment-speckle)', '#7b735c', '#9a8967', '#625f52'],
  'lava-cap': ['#343c3b', '#5a5348', '#27383b', '#6c5e4d'],
};

function islandProfilePath(progress: number, supply: Supply, throughIndex = Number.POSITIVE_INFINITY, eroded = true): string {
  return islandXs.map((x, index) => `${index ? 'L' : 'M'}${x} ${n(islandSurfaceY(x, progress, supply, throughIndex, eroded))}`).join('');
}

function islandBandPath(progress: number, supply: Supply, index: number): string {
  const upper = islandXs.map(x => [x, islandSurfaceY(x, progress, supply, index, false)] as const);
  const lower = islandXs.map(x => [x, islandSurfaceY(x, progress, supply, index - 1, false)] as const);
  return upper.map(([x, y], point) => `${point ? 'L' : 'M'}${x} ${n(y)}`).join('')
    + lower.reverse().map(([x, y]) => `L${x} ${n(y)}`).join('') + 'Z';
}

function islandCoastMarkup(progress: number, supply: Supply, erosion: number): string {
  const above = islandXs.filter(x => islandSurfaceY(x, progress, supply) <= SEA_LEVEL);
  if (!above.length) return '';
  const left = Math.min(...above), right = Math.max(...above);
  let out = `<path d="M${left - 18} 158q11-5 25-1M${right - 6} 157q12-4 26 1" fill="none" stroke="#e0eee2" stroke-width="4" opacity=".88"/>
    <path d="M${left - 7} 154L${left + 8} 147M${right - 8} 147L${right + 8} 154" stroke="#263b3e" stroke-width="6" opacity=".8"/>`;
  for (let wave = 0; wave < 4; wave++) {
    out += `<path d="M${left - 24 - wave * 12} ${161 + wave * 4}q13 ${n(-4 + Math.sin(progress * 8 + wave))} 27 0M${right - 3 + wave * 12} ${161 + wave * 4}q13 ${n(-4 - Math.sin(progress * 8 + wave))} 27 0" fill="none" stroke="#cfe4df" stroke-width="${n(1.8 - wave * .25)}" opacity="${n(.68 - wave * .1)}"/>`;
  }
  if (erosion > 0) {
    for (let i = 0; i < 13; i++) {
      const side = i % 2 ? 1 : -1;
      const travel = erosion * (18 + i * 4.2);
      out += `<path d="M-3-2L3-1L2 3L-2 3Z" transform="translate(${n(500 + side * (124 + travel))} ${n(176 + travel * .7 + i % 3 * 7)}) rotate(${i * 29})" fill="#8f876d" opacity="${n(erosion * .72)}"/>`;
    }
  }
  return out;
}

/** A basaltic island-building case: separate deposits widen and raise the edifice. */
function islandScenario(progress: number, supply: Supply, section: number): string {
  const accretion = islandAccretion(progress, supply);
  const state = submarineState(progress, 'island', supply);
  const profile = islandProfilePath(progress, supply);
  const clipId = `island-body-${supply}`;
  let out = `<clipPath id="${clipId}"><path d="${profile}L935 650H65Z"/></clipPath>
    <path d="${profile}L935 650H65Z" fill="url(#island-rock)" stroke="#77908a" stroke-width="1.3"/>`;

  for (const unit of accretion.units) {
    if (unit.growth <= 0) continue;
    const color = phaseColors[unit.phase][unit.texture];
    out += `<path data-deposit="${unit.phase}" d="${islandBandPath(progress, supply, unit.index)}" fill="${color}" stroke="#c0b48a" stroke-width="${n(.28 + section * .5)}" opacity="${n(.38 + section * .52)}"/>`;
    if (unit.phase === 'shallow-fragments' && unit.growth > .35) {
      for (let chip = 0; chip < 4; chip++) {
        const side = chip % 2 ? 1 : -1;
        const x = unit.center + side * (35 + chip * 18 + unit.index % 3 * 5);
        const y = islandSurfaceY(x, progress, supply, unit.index, false) + 5 + chip % 2 * 4;
        out += `<path d="M-4 2L-1-4L4-1L3 4Z" transform="translate(${n(x)} ${n(y)}) rotate(${unit.index * 17 + chip * 41})" fill="#c1ae82" stroke="#3d4845" stroke-width=".6" opacity="${n(.38 + section * .42)}"/>`;
      }
    }
  }

  const oldPillows = clamp(1 - Math.max(0, accretion.deposited - 8) / 8);
  if (oldPillows > 0) {
    const positions = [-116, -86, -55, -23, 16, 49, 82, 113];
    for (let i = 0; i < positions.length; i++) {
      const x = 500 + positions[i];
      const y = islandSurfaceY(x, progress, supply) - 3;
      out += `<ellipse cx="${x}" cy="${n(y)}" rx="${18 + i % 3 * 3}" ry="${11 + i % 2 * 3}" transform="rotate(${i % 2 ? -8 : 11} ${x} ${n(y)})" fill="url(#pillow-skin)" stroke="#77908a" stroke-width="1" opacity="${n(oldPillows * .82)}"/>`;
    }
  }

  const conduitTop = Math.min(SEA_FLOOR - 18, state.summit + 22);
  out += `<g clip-path="url(#${clipId})" opacity="${n(section)}">
    <ellipse cx="500" cy="560" rx="91" ry="29" fill="#2d3334" stroke="#a26f4d" stroke-width="4"/>
    <ellipse cx="500" cy="560" rx="75" ry="20" fill="url(#molten)" opacity=".78"/>
    <path d="M500 544C477 496 518 430 500 ${n(conduitTop)}" fill="none" stroke="#1d3033" stroke-width="31" stroke-linecap="round"/>
    <path d="M500 544C477 496 518 430 500 ${n(conduitTop)}" fill="none" stroke="url(#molten)" stroke-width="13" stroke-linecap="round" opacity="${n(.24 + state.activity * .7)}"/>
    <path d="M500 410Q422 390 365 333M504 365Q573 333 641 296" fill="none" stroke="#c0663e" stroke-width="5" opacity=".42"/>
  </g>`;

  const active = accretion.units.find(unit => unit.index === accretion.currentIndex);
  if (active && active.growth > 0 && progress < .8) {
    const side = active.index % 2 ? 1 : -1;
    const end = active.center + side * active.width * (.28 + active.growth * .58);
    const steps = Array.from({ length: 12 }, (_, index) => active.center + (end - active.center) * index / 11);
    const lavaPath = steps.map((x, index) => `${index ? 'L' : 'M'}${n(x)} ${n(islandSurfaceY(x, progress, supply) - 1.7)}`).join('');
    if (active.phase === 'shallow-fragments') {
      for (let i = 0; i < 18; i++) {
        const q = clamp(active.growth * 1.7 - i % 4 * .11);
        if (q <= 0 || q >= 1) continue;
        const drift = (i % 2 ? 1 : -1) * (18 + i * 2.6) * q;
        const y = state.summit + 12 - Math.sin(q * Math.PI) * (35 + i % 5 * 7) + q * q * 24;
        out += `<path d="M-3-2L3-1L2 3L-2 2Z" transform="translate(${n(500 + drift)} ${n(y)}) rotate(${i * 31})" fill="#d3bd8a" stroke="#384749" stroke-width=".7" opacity="${n(.35 + .5 * Math.sin(q * Math.PI))}"/>`;
      }
    } else {
      out += `<path d="${lavaPath}" fill="none" stroke="#bd4c2f" stroke-width="13" stroke-linecap="round" opacity=".88"/><path d="${lavaPath}" fill="none" stroke="url(#fresh-flow)" stroke-width="5" stroke-linecap="round"/>`;
    }
  }

  if (state.erosion > 0) {
    out += `<path d="${islandProfilePath(progress, supply, Number.POSITIVE_INFINITY, false)}" fill="none" stroke="#e4dfbe" stroke-dasharray="6 8" stroke-width="1.5" opacity="${n(state.erosion * .62)}"/>`;
  }
  if (state.emerged) out += islandCoastMarkup(progress, supply, state.erosion);
  return out;
}

/** A compressed irregular cross-section, with summit elevation still owned by the model. */
function surfaceY(x: number, y: number): number {
  if (x >= 479 && x <= 521) return y + Math.sin((x - 479) / 42 * Math.PI) * 12;
  const left = x < 479, d = left ? (479 - x) / 414 : (x - 521) / 426;
  const height = (left ? 507 : 516) - y;
  const roughness = Math.min(1, Math.abs(x - 500) / 80) * (Math.sin(x * .073) * 2 + Math.sin(x * .191) * .9);
  return y + height * Math.pow(Math.max(0, d), .74) + roughness;
}
const profileX = [...Array.from({ length: 23 }, (_, i) => 65 + i * 18), 479, 489, 500, 511, 521, ...Array.from({ length: 24 }, (_, i) => 535 + i * 18)];
function mountainPath(y: number): string {
  return profileX.map((x, i) => `${i ? 'L' : 'M'}${x} ${n(surfaceY(x, y))}`).join('') + 'L970 650H30Z';
}

function terrainMarkup(y: number, environment: Environment, supply: Supply, section: number): string {
  const outline = mountainPath(y), id = `terrain-${environment}-${supply}`;
  let out = `<clipPath id="${id}"><path d="${outline}"/></clipPath><path d="${outline}" fill="url(#rock)" stroke="#79918b" stroke-width="1.2"/>
    <g clip-path="url(#${id})"><path d="${outline}" fill="url(#interior)" opacity="${n(.08 + section * .66)}"/>`;
  for (let layer = 1; layer < 13; layer++) {
    const f = layer / 16;
    const points = profileX.map(x => [x, surfaceY(x, y) * (1 - f) + 651 * f + Math.sin(x * .021 + layer) * (2 + layer * .3)]);
    const line = points.map(([x, py], i) => `${i ? 'L' : 'M'}${x} ${n(py)}`).join('');
    const thickness = 3 + seeded(layer, 78) * 9;
    const band = line + points.slice().reverse().map(([x, py]) => `L${x} ${n(py + thickness)}`).join('') + 'Z';
    out += `<path d="${band}" fill="${['#142f3a','#aea178','#617c76','#866b50'][layer % 4]}" opacity="${n(.16 + section * .23)}"/><path d="${line}" fill="none" stroke="#b5ad8a" stroke-width=".55" opacity=".28"/>`;
  }
  for (let i = 0; i < 15; i++) {
    const x = 182 + i * 44, py = surfaceY(x, y) + 3;
    out += `<path d="M${x} ${n(py)}l${n(8 + seeded(i, 82) * 13)} 19l-6 11l14 28" stroke="#102e39" stroke-width="${n(.7 + seeded(i, 83))}" fill="none" opacity=".45"/>`;
  }
  out += surfaceGrain + '</g>';
  // Loose material and ridges rest on the terrain instead of floating in a flat triangle.
  for (let i = 0; i < 27; i++) {
    const x = 176 + i * 25 + seeded(i, 88) * 9, py = surfaceY(x, y);
    const size = 1.8 + seeded(i, 89) * 5;
    out += `<path d="M${n(x - size)} ${n(py)}l${n(size * .4)} ${n(-size * .8)}l${n(size)} ${n(-size * .25)}l${n(size * .85)} ${n(size * .8)}l${n(-size * .7)} ${n(size * .7)}Z" fill="${i % 3 ? '#405a61' : '#768077'}" stroke="#142e3a" stroke-width=".6"/>`;
  }
  return out;
}

/** Finite suspended packets: texture projection, not a temperature or buoyancy solver. */
export function plumeParcel(progress: number, index: number, summit: number, environment: 'deep' | 'shallow') {
  const q = clamp((clamp(progress) - (.07 + Math.floor(index / 3) * .035)) / .43);
  const rise = environment === 'deep' ? 91 : 55;
  return { x: 497 + q * (21 + seeded(index, 97) * 37) + Math.sin(q * 5 + index) * q * 13,
    y: Math.max(SEA_LEVEL + 9, summit + 5 - q * rise), radius: 3 + q * (11 + seeded(index, 98) * 12),
    opacity: q <= 0 || q >= 1 ? 0 : Math.sin(q * Math.PI) * .46 };
}

function particlePlume(progress: number, summit: number, environment: 'deep' | 'shallow'): string {
  let out = '<g data-material="suspended-particles" clip-path="url(#underwater)">';
  for (let i = 0; i < 30; i++) {
    const p = plumeParcel(progress, i, summit, environment);
    if (!p.opacity) continue;
    out += `<g opacity="${n(p.opacity)}"><ellipse cx="${n(p.x)}" cy="${n(p.y)}" rx="${n(p.radius * 1.35)}" ry="${n(p.radius)}" fill="url(#particle-haze)"/>`;
    for (let speck = 0; speck < 4; speck++) {
      const dx = (seeded(i, speck + 118) - .5) * p.radius * 1.9, dy = (seeded(i, speck + 124) - .5) * p.radius * 1.5;
      out += `<circle cx="${n(p.x + dx)}" cy="${n(p.y + dy)}" r="${n(.4 + seeded(i, speck + 131) * .8)}" fill="#a9b6a7"/>`;
    }
    out += '</g>';
  }
  return out + '</g>';
}

function coastMarkup(summit: number, erosion: number, progress: number): string {
  const coast = (left: boolean) => {
    let a = left ? 150 : 521, b = left ? 479 : 900;
    for (let step = 0; step < 16; step++) {
      const middle = (a + b) / 2;
      if ((surfaceY(middle, summit) > SEA_LEVEL) === left) a = middle; else b = middle;
    }
    return (a + b) / 2;
  };
  const l = coast(true), r = coast(false);
  let out = `<path d="M${n(l - 8)} 159Q${n(l + 3)} 148 ${n(l + 11)} 143M${n(r - 11)} 143Q${n(r - 1)} 151 ${n(r + 11)} 160" fill="none" stroke="#263f45" stroke-width="5" opacity=".8"/>`;
  for (let i = 0; i < 5; i++) {
    const spread = i * 8 + 4 + erosion * 5;
    const lift = Math.sin(progress * 9 + i) * 1.3;
    out += `<path d="M${n(l - spread - 18)} ${n(155 + i * 2)}q11 ${n(-3 + lift)} 24-1M${n(r + spread - 3)} ${n(155 + i * 2)}q12 ${n(-3 - lift)} 25 0" fill="none" stroke="#d4e8d5" stroke-width="${n(1.9 - i * .26)}" opacity="${n(.62 - i * .09)}"/>`;
  }
  return out;
}

export function viewCamera(view: Viewpoint, progress: number, weights: [number, number, number], supplyMix: number): [number, number, number, number] {
  const summit = weights.reduce((sum, weight, i) => sum + weight * (submarineState(progress, environments[i], 'sustained').summit * (1 - supplyMix) + submarineState(progress, environments[i], 'limited').summit * supplyMix), 0);
  return cameraBox(view, summit);
}
