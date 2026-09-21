import * as THREE from 'three';
import { TdeSimulation } from '../../black-hole/physics/tdeSimulation.ts';
import { SCENARIOS, motionProgress, playbackProgress, orbitAt, TIDAL_RADIUS } from '../../black-hole/physics/encounter.ts';
import { STORIES, ACADEMIC, ROUTE_DESCRIPTIONS, stageAt } from '../../black-hole/story.ts';
import { SpaceSynth } from '../../black-hole/audio/spaceSynth.ts';
import { t } from '../i18n.ts';
import type { ChapterDefinition } from '../types.ts';
import { releaseCanvas } from '../types.ts';

export const chapter: ChapterDefinition = {
  title: t('恒星路过黑洞'),
  intro: t('换一条经过黑洞的路线，比较完整飞掠、潮汐瓦解和气体回返。'),
  scale: t('恒星遭遇尺度；黑洞暗影与物质吸收边界分别放大。播放时长不是天体的真实时标。'),
  learningId: 'black-hole',
  choices: [{ key: 'scenario', label: t('经过路线'), options: [
    { value: 'free', label: t('无黑洞对照') }, { value: 'flyby', label: t('安全绕过') },
    { value: 'tidal', label: t('瓦解后回流') }, { value: 'deep', label: t('更深掠过') },
  ] }],
  duration: state => SCENARIOS[state.scenario].duration,
  steps: state => STORIES[state.scenario].map(step => ({ label: step.label, progress: playbackProgress(step.at, state.scenario) })),
  describe(state, academic) {
    const stage = stageAt(state.progress, state.scenario), child = STORIES[state.scenario][stage], adult = ACADEMIC[state.scenario][stage];
    return { title: academic ? adult.title : child.title, body: academic ? adult.desc : child.desc,
      prompt: child.notice, formula: adult.formula, terms: adult.terms, caution: adult.caution, note: ROUTE_DESCRIPTIONS[state.scenario] };
  },
  create(host, state) {
    const scene = new TdeSimulation(host), synth = new SpaceSynth();
    scene.selectScenario(state.scenario);
    const label = document.createElement('span'); label.className = 'scene-label'; host.append(label);
    return {
      draw(state, options) {
        if (scene.view !== options.view) scene.setView(options.view);
        scene.guidesVisible = options.guides;
        scene.update(motionProgress(state.progress, state.scenario), state.scenario);
        const audible = options.sound && options.playing && scene.gasStatus === 'ready';
        if (audible && !synth.isPlaying) synth.start();
        if (!audible && synth.isPlaying) synth.stop();
        synth.updateProgress(motionProgress(state.progress, state.scenario));
        const projected = scene.labelPosition(new THREE.Vector3());
        label.textContent = t('黑洞阴影');
        label.hidden = !options.annotations || !projected.visible || !!SCENARIOS[state.scenario].noBlackHole;
        label.style.left = Math.max(70, Math.min(host.clientWidth - 70, projected.x)) + 'px';
        label.style.top = Math.max(24, Math.min(host.clientHeight - 28, projected.y + 65)) + 'px';
      },
      status: () => scene.gasStatus as 'ready' | 'loading' | 'error',
      retry: state => scene.selectScenario(state.scenario),
      readout(state, academic) {
        if (SCENARIOS[state.scenario].noBlackHole) return '';
        if (academic) {
          const motion = motionProgress(state.progress, state.scenario), intact = !SCENARIOS[state.scenario].disrupted || motion < .44;
          return t('中心距离 / 潮汐尺度：{{distance}} · β：{{beta}} · 进入模型内界的采样点：{{percent}}%', {
            distance: intact ? (orbitAt(motion, state.scenario).radius / TIDAL_RADIUS).toFixed(2) : '—',
            beta: (TIDAL_RADIUS / SCENARIOS[state.scenario].pericenter).toFixed(2),
            percent: (scene.absorbed / Math.max(1, scene.gasCount) * 100).toFixed(1),
          });
        }
        return scene.absorbed ? t('一部分气体已落入模型内界，外面的气体还在运动。') : '';
      },
      dispose() { synth.stop(); scene.dispose(); releaseCanvas(host); },
    };
  },
};
