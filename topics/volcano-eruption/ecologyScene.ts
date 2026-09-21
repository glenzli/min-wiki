import { landscapeMarkup } from './landscapeScene.ts';
import { landformProjection, landformMesh } from './landformMesh.ts';
import type { Landform } from './projectModel.ts';
import type { EcologyState } from './ecologyModel.ts';
import { seed } from './magmaGeometry.ts';
import { smooth } from './model.ts';
const n = (v: number) => v.toFixed(2);
export function ecologyMarkup(kind: Landform, state: EcologyState) {
  const { radius, point } = landformProjection(kind, 1, 0);
  const plants = Array.from({ length: 100 }, (_, i) => {
    // Fixed front-facing sites never teleport when the environment changes.
    const r = radius * (.30 + seed(i + 781) * .62), a = .15 + seed(i + 998) * 2.8;
    const [x, y] = point(r, a), fertility = seed(i + 113);
    const cover = smooth(fertility * .63, fertility * .63 + .19, state.vegetation);
    const soil = state.soil * (.4 + seed(i + 63) * .6), size = 3 + seed(i + 44) * 6;
    const travelling = smooth(.28 + seed(i + 21) * .15, .56 + seed(i + 21) * .15, state.p);
    const seedX = x - (1 - travelling) * 300, seedY = y - Math.sin((1 - travelling) * Math.PI / 2) * 190;
    return `<g data-site="${i}"><ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(size * 1.8)}" ry="${n(size * .45)}" fill="#6e533d" opacity="${n(soil * .75)}"/>${travelling > 0 && travelling < 1 && i % 4 === 0 ? `<path d="M${n(seedX)} ${n(seedY)}q6 -8 11 -3m-8 0l2 5" stroke="#ead6a8" stroke-width="1.3" fill="none"/>` : ''}<g transform="translate(${n(x)} ${n(y)}) scale(${n(cover)})"><ellipse rx="${n(size * 1.8)}" ry="${n(size * .5)}" fill="#657f40"/><path d="M0 0q-7 -5 -6 -12M0 0q4 -10 2 -16M0 0q5 -6 9 -7" fill="none" stroke="#b5c97a" stroke-width="1.7" stroke-linecap="round"/><path d="M0 0q-1 -7 -3 -10M0 0q6 -4 6 -10" fill="none" stroke="#426443" stroke-width="2"/></g>${i % 5 === 0 ? `<path d="M${n(x-7)} ${n(y)}l4 -3 4 2 5 -3" fill="none" stroke="#f3ad66" stroke-width="2" opacity="${n(1-state.cooling)}"/>` : ''}</g>`;
  }).join('');
  const heat = Array.from({ length: 8 }, (_, i) => `<path d="M${365 + i * 36} 375q-8 -15 0 -30t0 -30" fill="none" stroke="#edab7244" stroke-width="3"/>`).join('');
  const weather = state.habitat === 'cold' ? Array.from({length:14}, (_, i) => `<path d="M${230+i*41} ${125+seed(i)*78}v12m-5-9 10 6m-10 0 10-6" stroke="#f1f4e7" opacity="${n(state.cooling*.8)}" stroke-width="1.5"/>`).join('')
    : state.habitat === 'dry' ? '' : Array.from({ length: 34 }, (_, i) => {
      const x = 190 + seed(i + 300) * 610, y = 190 + ((seed(i) + state.p * 2) % 1) * 180;
      return `<path d="M${n(x)} ${n(y)}l-3 9" stroke="#69a5b8" opacity="${n(state.cooling * .36)}" stroke-width="1.5"/>`;
    }).join('');
  const ash = state.habitat === 'buried' && state.p > .66 && state.p < .84 ? Array.from({ length: 70 }, (_, i) => `<circle cx="${n(230 + seed(i + 612) * 540)}" cy="${n(160 + ((seed(i) + state.p * 3) % 1) * 320)}" r="1.7" fill="#706b61" opacity=".7"/>`).join('') : '';
  const mantle = state.burial > 0 ? `<g opacity="${n(state.burial * .96)}">${landformMesh(kind, 1, 0, 0, 0, 1, 'ash')}</g>` : '';
  return landscapeMarkup(kind, 1, 'green', 0, state.vegetation * .35) + `<g opacity="${n(1 - state.cooling)}">${heat}</g>${weather}${plants}${mantle}${ash}`;
}
/** A magnified patch makes soil, roots and burial visible on a phone. */
export function soilMarkup(state: EcologyState) {
  const depth = 3 + state.soil * 35, plant = state.vegetation;
  const roots = Array.from({ length: 6 }, (_, i) => `<path d="M160 93q${(i - 2.5) * 8} 13 ${(i - 2.5) * 17} ${n(depth * .8)}" stroke="#e0c590" stroke-width="1.4" fill="none"/>`).join('');
  return `<rect width="320" height="160" fill="#d6ded0"/><path d="M0 93L42 87L84 96L131 88L177 94L222 88L277 95L320 91V160H0Z" fill="#777568"/><path d="M0 94h320v${n(depth)}H0Z" fill="#725640"/><g stroke="#494b42" fill="none"><path d="M20 116l32 13-12 31m55-41-13 26 8 15m147-42-25 16 4 26m74-35 9 22-9 13"/></g><g opacity="${n(plant)}">${roots}<path d="M160 94Q156 73 164 49M161 79Q141 59 135 66Q139 78 161 79M162 68Q182 45 192 53Q183 69 162 68" fill="#69904d" stroke="#405e38" stroke-width="2.5"/></g><g opacity="${n(state.seeds * (1 - plant))}"><ellipse cx="160" cy="91" rx="5" ry="2" fill="#d9b970"/></g><path d="M0 92h320v${n(-state.burial * 28)}H0Z" fill="#b8ac98"/><g opacity="${n(state.moisture * state.cooling)}" fill="#78b0c5"><path d="M84 56q-12 17 0 17q12 0 0-17M233 38q-10 15 0 15q10 0 0-15"/></g>`;
}
