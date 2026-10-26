import { siteFor } from '../../solar-system/explorer/model.ts';
import { bounded, CITIES, DISTANCE_RANGE, EARTH_ESCAPE, ESCAPE_RANGE, STEPS, VIEWS, WORLD_IDS, type Step, type View, type WorldId, type Track } from './model.ts';

export interface Observation { site: string; view: View; descent: number; section: number }
export interface ConditionsState {
  step: Step; distance: number; escape: number; world: WorldId;
  observations: Record<WorldId, Observation>;
  track:Track; tilt:number; season:number; city:string;
}
export function readConditions(search: string): ConditionsState {
  const p = new URLSearchParams(search);
  const track=p.get('if.track')==='seasons'||p.get('if.step')==='tilt'?'seasons':'energy';
  const requested=p.get('if.step');
  const step:Step=track==='seasons'?(requested==='worlds'||requested==='return'?requested:'tilt'):STEPS.includes(requested as typeof STEPS[number])?requested as Step:'distance';
  const phase=bounded(p.get('if.season'),0,1,.25);
  const observations = Object.fromEntries(WORLD_IDS.map(id => [id, {
    site: siteFor(id, p.get(`if.${id}.site`)).id,
    view: VIEWS.includes(p.get(`if.${id}.view`) as View) ? p.get(`if.${id}.view`) as View : 'globe',
    descent: bounded(p.get(`if.${id}.descent`), 0, 1, 0),
    section: bounded(p.get(`if.${id}.section`), 0, 1, 0),
  }])) as Record<WorldId, Observation>;
  return {
    step,
    distance: bounded(p.get('if.au'), ...DISTANCE_RANGE, 1),
    escape: bounded(p.get('if.escape'), ...ESCAPE_RANGE, EARTH_ESCAPE),
    world: WORLD_IDS.includes(p.get('if.world') as WorldId) ? p.get('if.world') as WorldId : 'venus',
    observations,
    track,
    tilt:bounded(p.get('if.tilt'),0,98,23.44),season:[0,.25,.5,.75].includes(phase)?phase:.25,
    city:CITIES.find(c=>c.id===p.get('if.city'))?.id??'beijing',
  };
}
export function conditionsURL(href: string, state: ConditionsState): URL {
  const url = new URL(href), p = url.searchParams;
  for (const key of [...p.keys()]) if (key.startsWith('if.')) p.delete(key);
  p.set('if', '1'); p.set('if.step', state.step);
  p.set('if.au', state.distance.toFixed(4)); p.set('if.escape', state.escape.toFixed(4)); p.set('if.world', state.world);
  p.set('if.track',state.track);p.set('if.tilt',state.tilt.toFixed(4));p.set('if.season',state.season.toFixed(6));p.set('if.city',state.city);
  for (const id of WORLD_IDS) {
    const o = state.observations[id];
    p.set(`if.${id}.site`, o.site); p.set(`if.${id}.view`, o.view);
    p.set(`if.${id}.descent`, o.descent.toFixed(6)); p.set(`if.${id}.section`, o.section.toFixed(6));
  }
  return url;
}
/** Only known local topic destinations are allowed; no caller-provided return URL. */
export function destination(href: string, topic: 'earth' | 'solar-system' | 'atmosphere' | 'earth-seasons', state: ConditionsState): URL {
  const url = new URL(href);
  const base = url.pathname.match(/^(.*\/topics\/)[^/]+\/?$/)?.[1] ?? '/topics/';
  url.pathname = base + topic + '/';
  const lang = url.searchParams.get('lang'), staticMode = url.searchParams.get('static');
  url.search = ''; url.hash = topic === 'earth' ? 'earth-conditions' : '';
  if (lang === 'en' || lang === 'zh') url.searchParams.set('lang', lang);
  if (staticMode === '1') url.searchParams.set('static', '1');
  if (topic === 'solar-system') {
    const o = state.observations[state.world];
    url.searchParams.set('body', state.world); url.searchParams.set('view', o.view); url.searchParams.set('site', o.site);
  } else if (topic === 'atmosphere') {
    url.searchParams.set('view', 'worlds'); url.searchParams.set('world', state.world === 'earth'||state.world==='uranus' ? 'venus' : state.world);
    url.searchParams.set('display', 'structure');
  }
  return conditionsURL(url.href, state);
}
