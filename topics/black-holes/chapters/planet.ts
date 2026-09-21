import { PlanetScene } from '../../planet-black-hole/scene.ts';
import { CONTENT, childStory } from '../../planet-black-hole/content.ts';
import { SCIENCE } from '../../planet-black-hole/science.ts';
import { DENSITY, PERICENTER, tidalRadius } from '../../planet-black-hole/model.ts';
import type { Route } from '../../planet-black-hole/model.ts';
import { motionProgress, playbackDuration, playbackSeconds, STAGE_PROGRESS } from '../../planet-black-hole/playback.ts';
import { t } from '../i18n.ts';
import { createCanvas, releaseCanvas } from '../types.ts';
import type { ChapterDefinition } from '../types.ts';

export const chapter: ChapterDefinition = {
  title: t('行星路过黑洞'),
  intro: t('从发光的恒星换成行星。保持路线相同，比较岩石行星与气态巨行星。'),
  scale: t('行星潮汐尺度；行星、暗影和内边界分别缩放，不能与上一章直接比较屏幕大小。'),
  learningId: 'planet-black-hole',
  choices: [
    { key: 'planet', label: t('行星类型'), options: [{ value: 'rocky', label: t('类地球行星') }, { value: 'gas', label: t('类木星行星') }] },
    { key: 'scenario', label: t('经过路线'), options: [{ value: 'safe', label: t('远远掠过') }, { value: 'grazing', label: t('同一路线，不同行星') }, { value: 'deep', label: t('靠得太近') }] },
  ],
  duration: state => playbackDuration(state.planet, state.scenario as Route),
  change(state, key, value) {
    if (key === 'planet') {
      const motion = motionProgress(state.progress * chapter.duration(state), state.planet, state.scenario as Route);
      state.planet = value as 'rocky' | 'gas';
      state.progress = playbackSeconds(motion, state.planet, state.scenario as Route) / chapter.duration(state);
    } else { state.scenario = value; state.progress = 0; }
  },
  steps: state => CONTENT.shared.stages.map((label, index) => ({ label, progress: playbackSeconds(STAGE_PROGRESS[index], state.planet, state.scenario as Route) / chapter.duration(state) })),
  describe(state, academic) {
    const route = state.scenario as Route;
    const progress = motionProgress(state.progress * chapter.duration(state), state.planet, route);
    const index = STAGE_PROGRESS.reduce<number>((found, at, i) => progress >= at ? i : found, 0), science = SCIENCE[index];
    return { title: academic ? science.title : CONTENT.shared.stages[index], body: academic ? science.body : childStory(index, route, state.planet),
      prompt: CONTENT[route].prompt, formula: science.formula, terms: science.terms, caution: CONTENT.shared.limits + ' ' + science.caution,
      note: t('平均密度 {{density}} g/cm³ · 潮汐尺度 {{tidal}} · 最近距离 {{pericenter}}', { density: DENSITY[state.planet].toFixed(2), tidal: tidalRadius(state.planet).toFixed(2), pericenter: PERICENTER[route].toFixed(2) }) };
  },
  create(host, state) {
    const scene = new PlanetScene(createCanvas(host));
    let key = 'rocky:safe';
    if (state.planet + ':' + state.scenario !== key) { scene.select(state.planet, state.scenario as Route); key = state.planet + ':' + state.scenario; }
    return {
      draw(state, options) {
        if (key !== state.planet + ':' + state.scenario) { key = state.planet + ':' + state.scenario; scene.select(state.planet, state.scenario as Route); }
        scene.draw(motionProgress(state.progress * chapter.duration(state), state.planet, state.scenario as Route), state.planet, state.scenario as Route, options.guides, options.view);
      },
      status: () => scene.error ? 'error' : scene.loading ? 'loading' : 'ready',
      retry: state => scene.select(state.planet, state.scenario as Route),
      dispose() { scene.dispose(); releaseCanvas(host); },
    };
  },
};
