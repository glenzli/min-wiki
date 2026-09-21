import type { WorkspaceState, Chapter } from './workspaceModel';
import type content from './workspaceContent.json';
export type Copy = typeof content.en;
export interface WorkspaceRenderer { render(state: WorkspaceState, animate?: boolean): void; pause(): void; dispose(): void }
export type RendererFactory = (host: HTMLElement, copy: Copy) => WorkspaceRenderer;
export const escaped = (value: string): string => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export function namespaceSvg(markup: string, prefix: string): string {
  return markup.replace(/id="([^"]+)"/g, `id="${prefix}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`).replace(/href="#([^"]+)"/g, `href="#${prefix}$1"`);
}
/** Imports only scientific renderers, never their former full-page controllers. */
export async function loadRenderer(chapter: Chapter): Promise<RendererFactory> {
  if (chapter === 'environment') {
    const [{ specimenDefinitions, specimenArt, habitats, closeFrames }, { animateValue }] = await Promise.all([import('./scene'), import('../../src/visuals/transition')]);
    return (host, copy) => {
      host.innerHTML = `<svg class="micro-main-svg" viewBox="0 0 600 440" role="img" aria-label="${escaped(copy.scale)}">${specimenDefinitions}${habitats.map(habitat => `<g data-environment="${habitat}">${specimenArt[habitat]}</g>`).join('')}</svg>`;
      const svg = host.querySelector<SVGSVGElement>('svg')!;
      let frame = [0, 0, 600, 440], targetFrame = [...frame], cancel = () => {};
      return {
        render(state, animate = false) {
          for (const node of host.querySelectorAll<SVGGElement>('[data-environment]')) node.setAttribute('opacity', node.dataset.environment === state.habitat ? '1' : '0');
          svg.setAttribute('aria-label', `${copy.habitats[state.habitat]}. ${copy.habitatTexts[state.habitat]}. ${copy.scale}`);
          cancel(); const from = [...frame], target = state.closer ? closeFrames[state.habitat] : [0, 0, 600, 440];
          targetFrame = [...target];
          cancel = animateValue({ from: 0, to: 1, duration: animate ? 650 : 0, onUpdate: p => {
            frame = from.map((value, i) => value + (target[i]! - value) * p); svg.setAttribute('viewBox', frame.join(' '));
          } });
        },
        pause() { cancel(); frame = [...targetFrame]; svg.setAttribute('viewBox', frame.join(' ')); },
        dispose() { cancel(); host.replaceChildren(); },
      };
    };
  }
  if (chapter === 'bacteria') {
    const [{ drawAnatomy, drawDetail, drawDivision }, { partNames, selectionWeights }, { animateValue }] = await Promise.all([import('../bacteria/scene'), import('../bacteria/model'), import('../../src/visuals/transition')]);
    return (host, copy) => {
      host.innerHTML = `<div class="micro-bacteria-structure"><svg class="micro-anatomy" viewBox="0 0 740 480" role="img"></svg><div class="micro-detail"><p>${escaped(copy.detailLabel)}</p><svg viewBox="0 0 340 190" role="img"></svg></div></div><svg class="micro-division" viewBox="0 0 740 240" role="img" aria-label="${escaped(copy.processes.division)}"></svg>`;
      const structure = host.querySelector<HTMLElement>('.micro-bacteria-structure')!;
      const anatomy = host.querySelector<SVGSVGElement>('.micro-anatomy')!;
      const detail = host.querySelector<SVGSVGElement>('.micro-detail svg')!;
      const division = host.querySelector<SVGSVGElement>('.micro-division')!;
      let previousPart = '', previousExchange = -1, previousDivision = -1;
      let weights = [0, 1, 0, 0], selectedPart: WorkspaceState['part'] = 'membrane', cancelPart = () => {};
      return {
        render(state, animate = false) {
          selectedPart = state.part;
          structure.hidden = state.process !== 'structure'; division.toggleAttribute('hidden', state.process !== 'division');
          if (state.process === 'division') {
            const p = state.bacteria[state.resources].division;
            if (p !== previousDivision) { division.innerHTML = drawDivision(p); previousDivision = p; }
          } else {
            const exchange = state.bacteria[state.resources].exchange;
            if (previousPart !== state.part) {
              cancelPart(); const from = weights.slice();
              anatomy.setAttribute('aria-label', `${copy.identities.bacteria}. ${copy.parts[state.part]}`);
              detail.setAttribute('aria-label', copy.partTexts[state.part]);
              cancelPart = animateValue({ from: 0, to: 1, duration: animate ? 500 : 0, onUpdate: p => { weights = selectionWeights(from, state.part, p); anatomy.innerHTML = drawAnatomy(weights); detail.innerHTML = drawDetail(weights, exchange); } });
            } else if (previousExchange !== exchange) detail.innerHTML = drawDetail(weights, exchange);
            previousPart = state.part; previousExchange = exchange;
          }
        }, pause() { cancelPart(); weights = partNames.map(part => Number(part === selectedPart)); anatomy.innerHTML = drawAnatomy(weights); detail.innerHTML = drawDetail(weights, Math.max(0, previousExchange)); }, dispose() { cancelPart(); host.replaceChildren(); },
      };
    };
  }
  const [{ mountScene }, { sampleCycle, cameraFor, mixCamera }, { animateValue }] = await Promise.all([import('../viruses/scene'), import('../viruses/model'), import('../../src/visuals/transition')]);
  return (host, copy) => {
    host.innerHTML = `<svg id="virus-diagram" class="micro-main-svg" viewBox="0 0 900 600" role="img" aria-label="${escaped(copy.identities.viruses)}"></svg>`;
    const draw = mountScene(host.querySelector<SVGSVGElement>('svg')!);
    let cycle = sampleCycle(0, 'compatible'), view: WorkspaceState['view'] = 'whole';
    let camera = cameraFor(view, cycle), from = camera, blend = 1, cancelCamera = () => {};
    const paint = () => { camera = mixCamera(from, cameraFor(view, cycle), blend); draw(cycle, camera); };
    return {
      render(state, animate = false) {
        cycle = sampleCycle(state.viruses[state.host], state.host);
        if (view !== state.view) {
          cancelCamera(); from = camera; view = state.view;
          cancelCamera = animateValue({ from: 0, to: 1, duration: animate ? 560 : 0, onUpdate: value => { blend = value; paint(); } });
        } else paint();
      }, pause() { cancelCamera(); blend = 1; paint(); }, dispose() { cancelCamera(); host.replaceChildren(); },
    };
  };
}
