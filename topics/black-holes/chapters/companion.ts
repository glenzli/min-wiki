import { CompanionScene } from '../../galactic-center/scene.ts';
import type { Scenario } from '../../galactic-center/model.ts';
import { CONTENT } from '../../galactic-center/content.ts';
import { SCIENCE } from '../../galactic-center/science.ts';
import { t } from '../i18n.ts';
import { createCanvas, releaseCanvas } from '../types.ts';
import type { ChapterDefinition } from '../types.ts';
const positions = [0, .25, .55, .85];
export const chapter: ChapterDefinition = {
  title: t('黑洞与伴星'),
  intro: t('从一次路过换成长久相伴，比较恒星风捕获和外层气体溢流。'),
  scale: t('恒星级黑洞双星；黑洞和盘的内侧单独放大。这里的大小与时间不能直接对照遭遇章节。'),
  learningId: 'galactic-center',
  choices: [{ key: 'scenario', label: t('供给方式'), options: [
    { value: 'detached', label: t('只绕行，不喂养') }, { value: 'overflow', label: t('外层气体溢流') }, { value: 'wind', label: t('恒星风喂养') },
  ] }],
  duration: () => 32,
  steps: state => CONTENT[state.scenario as Scenario].stages.map((label, i) => ({ label, progress: positions[i] })),
  describe(state, academic) {
    const data = CONTENT[state.scenario as Scenario], index = positions.reduce((found, p, i) => state.progress >= p ? i : found, 0), science = SCIENCE[index];
    return { title: academic ? science.title : data.stages[index], body: academic ? data.academic + ' ' + science.body : data.story[index],
      prompt: data.prompt, formula: science.formula, terms: science.terms, caution: data.limits + ' ' + science.caution, note: data.note };
  },
  create(host) {
    const scene = new CompanionScene(createCanvas(host));
    return {
      draw: (state, options) => scene.draw(state.progress, state.scenario as Scenario, options.guides, options.view, options.orbit),
      status: () => 'ready', retry() {},
      dispose() { scene.dispose(); releaseCanvas(host); },
    };
  },
};
