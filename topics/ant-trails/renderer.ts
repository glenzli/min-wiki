import { workerAt, scentAt, broodStage, type State } from './model';
import { antArt, definitions, worldArt, bodyHighlight, broodArt } from './art';
export type Transition = (options: { from: number; to: number; duration: number; onUpdate(value: number): void; onComplete?(): void }) => () => void;
type LabelCopy = { nest: string; food: string; gap: string; brood: string; queen: string; worker: string; nurse: string; specimen: string };
const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

/** Persistent SVG nodes preserve identity; only poses, scent strengths and the camera change. */
export function createAntRenderer(world: SVGSVGElement, body: SVGSVGElement, labels: LabelCopy, transition: Transition) {
  world.innerHTML = definitions + worldArt();
  body.innerHTML = `<rect x="-65" y="-46" width="140" height="92" rx="6" fill="#f4eedb"/><g transform="translate(-3 0)">${antArt('body-W1', true)}<g id="ant-body-highlight"></g></g>`;
  const get = (id: string) => world.querySelector<SVGElement>(`#${id}`)!;
  get('ant-scents').innerHTML = scentAt(0, 'intact').map((mark, i) => `<circle id="scent-${i}" cx="${mark.x}" cy="${mark.y}" r="4" fill="#9d60ab" opacity="0"/>`).join('');
  get('ant-world-labels').innerHTML = `<text x="60" y="325">${escape(labels.nest)}</text><text x="778" y="284">${escape(labels.food)}</text><text id="ant-gap-label" x="457" y="299">${escape(labels.gap)}</text><g fill="#fff3d1" font-size="13"><text x="187" y="497">${escape(labels.brood)}</text><text x="392" y="479">${escape(labels.queen)}</text><text x="269" y="465">${escape(labels.nurse)}</text><text x="218" y="415">${escape(labels.specimen)}</text></g><text id="ant-w1-label" font-size="18" fill="#155978">W1</text>`;
  let state: State | undefined, previousPart = '', previousBrood = -1, camera = 0, target = 0, cameraCancel = () => {}, careCancel = () => {}, disposed = false, epoch = 0, careEpoch = 0;
  const cameraAt = (mix: number) => { camera = mix; world.setAttribute('viewBox', `${40 * mix} ${305 * mix} ${960 - 460 * mix} ${335 - 75 * mix}`); };
  const careAt = (phase: number) => {
    const amount = Math.sin(Math.PI * phase);
    get('ant-care-pose').setAttribute('transform', `translate(${263 - amount * 12} ${461 - amount * 13}) rotate(-158) scale(.68)`);
  };
  function pause() { epoch++; careEpoch++; cameraCancel(); careCancel(); cameraAt(target); careAt(0); }
  function render(next: State) {
    if (disposed) return;
    state = next;
    const desired = next.chapter === 'nest' ? 1 : 0;
    if (desired !== target) {
      cameraCancel(); target = desired; const token = ++epoch;
      cameraCancel = transition({ from: camera, to: target, duration: 650, onUpdate(value) { if (!disposed && token === epoch) cameraAt(value); } });
    } else if (!world.hasAttribute('viewBox')) cameraAt(target);
    [0, 1, 2, 3].forEach(i => {
      const ant = workerAt(i, next.time, next.condition), group = get(`worker-${i}`);
      group.setAttribute('transform', `translate(${ant.x.toFixed(3)} ${ant.y.toFixed(3)}) rotate(${ant.angle.toFixed(2)}) scale(.78)`);
      group.setAttribute('data-x', ant.x.toFixed(3)); group.setAttribute('data-y', ant.y.toFixed(3));
      group.querySelector('.food-status')!.setAttribute('opacity', ant.carrying ? '1' : '0');
      group.querySelectorAll<SVGElement>('.ant-leg').forEach((node, j) => node.setAttribute('transform', `rotate(${ant.walking ? Math.sin(next.time * 5.5 + j * Math.PI) * 7 : 0} 3 0)`));
      group.querySelectorAll<SVGElement>('.ant-feeler').forEach((node, j) => node.setAttribute('transform', `rotate(${ant.walking ? Math.sin(next.time * 3.2 + j * 2) * 8 : 0} 27 0)`));
      if (i === 0) get('ant-w1-label').setAttribute('transform', `translate(${ant.x - 14} ${ant.y - 30})`);
    });
    scentAt(next.time, next.condition).forEach((mark, i) => get(`scent-${i}`).setAttribute('opacity', String(next.scent ? mark.strength * .78 : 0)));
    const obstruction = next.condition === 'blocked' && next.time >= 54;
    get('ant-obstacle').setAttribute('visibility', obstruction ? 'visible' : 'hidden');
    get('ant-gap-label').setAttribute('visibility', next.condition !== 'intact' && next.time >= 54 ? 'visible' : 'hidden');
    get('ant-world-labels').setAttribute('visibility', next.labels ? 'visible' : 'hidden');
    if (previousPart !== next.part) { body.querySelector('#ant-body-highlight')!.innerHTML = bodyHighlight(next.part); previousPart = next.part; }
    body.querySelector('#ant-body-highlight')!.setAttribute('visibility', next.labels ? 'visible' : 'hidden');
    if (previousBrood !== next.brood) { careEpoch++; careCancel(); careAt(0); get('ant-brood').innerHTML = broodArt(next.brood); previousBrood = next.brood; }
  }
  return {
    render, pause,
    care() {
      if (disposed || !state || broodStage(state.brood) === 3) return;
      careCancel(); const token = ++careEpoch;
      careCancel = transition({ from: 0, to: 1, duration: 1600, onUpdate(value) { if (!disposed && token === careEpoch) careAt(value); } });
    },
    dispose() { if (disposed) return; pause(); disposed = true; world.replaceChildren(); body.replaceChildren(); },
  };
}
