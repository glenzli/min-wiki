import { bodyPath, growthState, tailPath } from './model.ts';
export function renderAnimal(progress: number, root:ParentNode=document) {
  const s = growthState(progress);
  const set = (id: string, name: string, value: string | number) => (root.querySelector(`[data-part="${id}"]`)??root.querySelector(`#${id}`))!.setAttribute(name, String(value));
  set('animal', 'transform', `translate(${s.x} ${s.y+s.swim*2}) rotate(${s.swim*1.2}) scale(${s.scale}) translate(-535 -284)`);
  set('spawn', 'opacity', s.eggs);
  set('tail', 'transform', `translate(493 294) scale(${s.tail} ${Math.sqrt(s.tail)}) translate(-493 -294)`);
  set('hind-legs', 'transform', `translate(496 302) rotate(${s.kick*12}) scale(${s.hind}) translate(-496 -302)`);
  set('fore-legs', 'transform', `translate(561 295) rotate(${-s.kick*5}) scale(${s.front}) translate(-561 -295)`);
  set('tail-fin','d',tailPath(progress));set('tail-muscle','d',tailPath(progress,false));
  set('body-shape', 'd', bodyPath(s.body));
  const color = (a: number[], b: number[]) => `rgb(${a.map((v, i) => Math.round(v + (b[i]! - v)*s.body)).join(',')})`;
  set('skin-light', 'stop-color', color([149,149,102], [180,189,100]));
  set('skin-mid', 'stop-color', color([100,111,77], [123,149,76]));
  set('mouth', 'transform', `translate(${(1-s.body)*-12} 0) scale(${0.96+0.04*s.body} 1)`);
  set('nostril', 'cx', 593 + 16*s.body);
  set('eyes', 'transform', `translate(${570 + 15*s.body} ${263 - 7*s.body}) scale(${0.5 + 0.5*s.body}) translate(-585 -256)`);
  const body=root.querySelector('[data-part="animal-body"]')??root.querySelector('#animal-body');
  // Do not fade the nested eyes with the developing adult skin markings.
  const details = body!.querySelectorAll(':scope > path:not([data-part="body-shape"]):not(#body-shape), :scope > ellipse, :scope > circle');
  details.forEach(node => node.setAttribute('opacity', String(0.1 + 0.65*s.body)));
  set('skin-grain','opacity',.12+.15*s.body);
  set('body-clip-shape','d',bodyPath(s.body));
}
