import { bounded } from './projectModel.ts';
import { smooth } from './model.ts';
export const HABITATS = ['wet', 'dry', 'cold', 'buried'] as const;
export type Habitat = typeof HABITATS[number];
/** Illustrative recovery on one already-built slope. No calendar, universal
 * succession ladder, or claim that all volcanoes must become forests. */
export function ecologyState(progress: number, habitat: Habitat) {
  const p = bounded(progress), cooling = smooth(0, .22, p);
  const weathering = smooth(.16, .67, p);
  const moisture = habitat === 'dry' ? .13 : habitat === 'cold' ? .45 : .86;
  const warmth = habitat === 'cold' ? .12 : .9;
  const seeds = smooth(.29, .59, p);
  const burial = habitat === 'buried' ? smooth(.66, .78, p) : 0;
  const soil = weathering * (habitat === 'dry' ? .26 : habitat === 'cold' ? .38 : .83) * (1 - burial * .72);
  const establishment = smooth(.40, .96, p) * Math.min(moisture, warmth) * seeds * cooling;
  const vegetation = establishment * (1 - burial * .92);
  return { p, habitat, cooling, weathering, moisture, warmth, seeds, burial, soil, vegetation,
    stage: p < .22 ? 0 : p < .43 ? 1 : p < .70 ? 2 : 3 };
}
export type EcologyState = ReturnType<typeof ecologyState>;
