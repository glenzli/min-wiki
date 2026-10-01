import { t } from './i18n.ts';
import { painSequence } from './model.ts';

export type Focus = 'both' | 'reflex' | 'brain';

const routePaths = {
  incoming: 'M164 212 C230 220 274 265 336 276 S428 320 472 320',
  reflex: 'M472 320 C533 334 516 407 584 430',
  ascending: 'M472 320 C569 308 611 247 638 196 S663 151 681 149',
};

function route(id: keyof typeof routePaths, color: string) {
  const d = routePaths[id];
  return `<g id="route-${id}"><path d="${d}" fill="none" stroke="#fff9ee" stroke-width="15" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${color}" stroke-opacity=".27" stroke-width="8" stroke-linecap="round"/><path id="${id}" d="${d}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"/><circle id="dot-${id}" r="7" fill="#fff9e9" stroke="${color}" stroke-width="3" opacity="0"/></g>`;
}

export function createPainScene() {
  const cells = Array.from({ length: 36 }, (_, i) => {
    const x = 35 + (i % 12) * 23.5;
    const y = 153 + Math.floor(i / 12) * 22;
    return `<path d="M${x - 10} ${y}q7-9 17-4l4 12q-8 8-18 2Z" fill="${i % 4 ? '#edcbb6' : '#f3dbc8'}" stroke="#c3947b" stroke-width=".8"/>`;
  }).join('');
  const fibers = Array.from({ length: 7 }, (_, i) => `<path d="M${36 + i * 41} 248q20-15 39 0m-37 19q20-14 38 1" fill="none" stroke="#c68e78" stroke-width="1.5" opacity=".58"/>`).join('');
  document.getElementById('art')!.innerHTML = `
    <rect width="900" height="520" fill="url(#paper)"/>
    <path d="M25 348H875" stroke="#cabfae" stroke-width="1.5" stroke-dasharray="3 8" opacity=".5"/>
    <g id="skin-panel" filter="url(#tissue-shadow)">
      <rect x="22" y="105" width="302" height="220" rx="18" fill="url(#dermis)" stroke="#c7a38c"/>
      <g clip-path="url(#skin-clip)">
        <path d="M22 112Q58 104 92 111T166 111T243 110T324 112V147Q283 165 246 149T171 151T96 150T22 151Z" fill="url(#skin)"/>
        ${cells}${fibers}
        <path d="M28 276q40-20 69-3t55-6t63 2t100-4" fill="none" stroke="#bd806d" stroke-width="5" opacity=".38"/>
        <path d="M28 278q40-20 69-3t55-6t63 2t100-4" fill="none" stroke="#f4d9c2" stroke-width="2"/>
      </g>
      <path d="M24 112Q58 105 92 111T166 111T243 110T322 112" fill="none" stroke="#a97361" stroke-width="4" stroke-linecap="round"/>
    </g>
    <g id="ending-emphasis"><path d="M164 212Q170 185 165 159m-2 23q-21-8-23-29m22 24q14-15 33-21m-40 23q-16 0-27-12m42-4q13-17 11-36" fill="none" stroke="#8f7458" stroke-width="3.6" stroke-linecap="round"/><circle id="ending-halo" cx="166" cy="150" r="35" fill="#e9aa5e" opacity="0"/></g>
    <g id="zoom-detail" opacity="0" pointer-events="none" class="zoom-detail"><path d="M74 137L92 150M205 183L179 176M228 254L203 234" fill="none" stroke="#7a6958" stroke-width="1"/><text x="37" y="132">${t('表皮')}</text><text x="207" y="181">${t('游离神经末梢')}</text><text x="230" y="257">${t('传入纤维')}</text></g>
    <path d="M113 76q-6 8 0 16m18-20q-6 8 0 16m18-18q-6 8 0 16" fill="none" stroke="#b97b55" stroke-width="2.2" stroke-linecap="round"/>
    <text x="28" y="55" data-wide-label>${t('01 皮肤末梢')}</text><text x="22" y="341" class="scene-small" data-wide-label>${t('局部放大 · 非实际比例')}</text>

    <g id="cord-structure" filter="url(#tissue-shadow)">
      <path d="M441 250C409 262 402 295 409 341C418 392 472 413 518 387C551 367 557 288 522 260Q500 271 483 257Q462 266 441 250Z" fill="url(#cord-tissue)" stroke="#aa9b88" stroke-width="2"/>
      <path d="M443 281q-21 8-11 32q17 5 11 21q-15 31 4 28q19-6 19-30q10-17 19-2q6 33 27 28q17-8-3-25q-9-13 6-31q14-24-6-24q-19 4-22 25q-10 13-21-2q-7-19-23-20Z" fill="#be9ca0" stroke="#9f8387" stroke-width="1.5"/>
      <circle cx="470" cy="319" r="5" fill="#f7e3bc" stroke="#ad8a56"/><circle cx="488" cy="341" r="5" fill="#d4dabc" stroke="#718b73"/><path d="M470 324q2 12 14 16" fill="none" stroke="#72695d" stroke-width="2" stroke-dasharray="2 3"/>
    </g>
    <text x="480" y="229" text-anchor="middle" data-wide-label>${t('02 脊髓回路')}</text><text x="480" y="419" text-anchor="middle" class="scene-small academic-label" data-wide-label>${t('示意：中间神经元与运动神经元')}</text>

    <g id="brain-structure" filter="url(#tissue-shadow)">
      <path d="M746 92C707 68 681 92 681 116C655 132 660 165 688 177C698 205 725 215 749 201C778 214 813 191 812 165C837 143 822 112 799 107C787 84 766 83 746 92Z" fill="url(#brain-tissue)" stroke="#9b7d8b" stroke-width="2.5"/>
      <path d="M743 94q-15 18-4 34q-22-8-30 11m7-40q-16 13-7 23m-18 18q26-6 25 20q-24 7-14 26m20-24q24-9 28 13q-22 10-9 27m18-86q27-6 28 18m-32 16q14-22 36-6q-7 21 12 29m-44-14q-5 28 17 33q18 1 21-9" fill="none" stroke="#a98a94" stroke-width="3" stroke-linecap="round"/>
      <path d="M693 109q22-29 47-15" fill="none" stroke="#f6e8de" stroke-width="3" opacity=".75"/>
    </g>
    <g id="brain-network" opacity="0"><path d="M712 136L753 124L783 170L724 179Z M712 136L783 170M753 124L724 179" fill="none" stroke="#6d5575" stroke-width="2.2" opacity=".7"/><g fill="#795982" stroke="#f5e7ee" stroke-width="2"><circle cx="712" cy="136" r="6"/><circle cx="753" cy="124" r="6"/><circle cx="783" cy="170" r="6"/><circle cx="724" cy="179" r="6"/></g></g>
    <text x="748" y="55" text-anchor="middle" data-wide-label>${t('03 多处脑区加工')}</text>

    ${route('incoming', '#b87946')}${route('reflex', '#447f72')}${route('ascending', '#936c9b')}
    <circle cx="472" cy="320" r="7" fill="#fbf3e6" stroke="#9f7c59" stroke-width="2"/>
    <text x="313" y="249" class="scene-small academic-label" data-wide-label>${t('传入神经')}</text><text x="572" y="287" class="scene-small academic-label" data-wide-label>${t('向脑通路')}</text><text x="556" y="390" class="scene-small academic-label" data-wide-label>${t('运动支路')}</text>

    <g id="muscle-drawing" filter="url(#tissue-shadow)"><path id="muscle-tendons" d="M540 430H576M688 430H725" stroke="#d9c3a0" stroke-width="11" stroke-linecap="round"/><ellipse id="muscle-body" cx="632" cy="430" rx="56" ry="25" fill="url(#muscle)" stroke="#945f51" stroke-width="2"/><g id="muscle-fibers" fill="none" stroke="#edbda6" stroke-width="1.6" opacity=".7"><path d="M585 420Q632 405 679 420M580 430Q632 416 684 430M585 440Q632 423 679 440"/></g></g>
    <text x="630" y="483" text-anchor="middle" data-wide-label>${t('肌肉收缩')}</text>
    <g id="hand" transform="translate(0 0)"><path d="M720 416L771 415Q790 400 811 407L861 421Q874 428 866 435Q862 439 852 436L831 431L858 447Q868 454 861 460Q855 464 844 459L822 447L844 467Q850 475 843 479Q837 483 827 475L805 455Q787 469 768 462L720 455Z" fill="url(#skin)" stroke="#ad806d" stroke-width="2"/><path d="M734 423L765 423Q791 409 807 416" fill="none" stroke="#fff1de" stroke-width="3" opacity=".7"/></g>
    <path id="move-arrow" d="M860 378H803m16-13-16 13 16 13" fill="none" stroke="#447f72" stroke-width="3" stroke-linecap="round" opacity="0"/>
    <text x="807" y="496" text-anchor="middle" data-wide-label>${t('手缩回')}</text>
  `;
}

function trace(id: keyof typeof routePaths, progress: number) {
  const path = document.getElementById(id) as unknown as SVGPathElement;
  path.setAttribute('stroke-dashoffset', String(1 - progress));
  const point = path.getPointAtLength(path.getTotalLength() * progress);
  const dot = document.getElementById(`dot-${id}`)!;
  dot.setAttribute('cx', String(point.x)); dot.setAttribute('cy', String(point.y));
  dot.setAttribute('opacity', progress > 0 && progress < 1 ? '1' : '0');
}

export function drawPain(progress: number, focus: Focus) {
  const state = painSequence(progress);
  trace('incoming', state.incoming); trace('reflex', state.reflex); trace('ascending', state.ascending);
  document.getElementById('route-reflex')!.setAttribute('opacity', focus === 'brain' ? '.17' : '1');
  document.getElementById('route-ascending')!.setAttribute('opacity', focus === 'reflex' ? '.17' : '1');
  document.getElementById('ending-halo')!.setAttribute('opacity', String(.24 * state.ending));
  document.getElementById('brain-network')!.setAttribute('opacity', String(state.processing));
  const linkage = state.linkage;
  document.getElementById('muscle-tendons')!.setAttribute('d', `M${linkage.origin} 430H${linkage.bellyStart}M${linkage.bellyEnd} 430H${linkage.attachment}`);
  document.getElementById('muscle-body')!.setAttribute('cx', String(linkage.bellyCenter));
  document.getElementById('muscle-body')!.setAttribute('rx', String(linkage.bellyRadius));
  document.getElementById('muscle-body')!.setAttribute('ry', String(linkage.bellyHeight));
  document.getElementById('muscle-fibers')!.setAttribute('transform', `translate(${linkage.fiberOffset} 0) scale(${linkage.fiberScale} 1)`);
  document.getElementById('hand')!.setAttribute('transform', `translate(${linkage.handOffset} 0)`);
  document.getElementById('move-arrow')!.setAttribute('opacity', String(state.withdrawal));
}
