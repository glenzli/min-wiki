import { t } from './i18n.ts';
import { restraintAt, RESTRAINT_WINDOW } from './restraintModel.ts';

/** One finite user-started clock for the body, belt contact and force arrow. */
export function mountRestraintStudy() {
  const el = (id: string) => document.getElementById('car-restraint-' + id)!;
  const progress = el('progress') as HTMLInputElement;
  const play = el('play') as HTMLButtonElement;
  const reference = el('reference') as HTMLInputElement;
  let frame = 0, lastTime = 0, playing = false, previousPhase = '';
  function draw() {
    const state = restraintAt(Number(progress.value) / 100);
    el('passenger').setAttribute('transform', `translate(${state.displacement} 0)`);
    el('free').setAttribute('transform', `translate(${state.freeDisplacement} 0)`);
    el('free').setAttribute('visibility', reference.checked && state.freeDisplacement - state.displacement > .5 ? 'visible' : 'hidden');
    el('belt').setAttribute('d', state.belt.path);
    el('belt').setAttribute('data-extension', String(state.belt.extension));
    el('belt').setAttribute('data-tension', String(state.belt.tension));
    el('upper-contact').setAttribute('cx', String(state.belt.upper.x));
    el('upper-contact').setAttribute('cy', String(state.belt.upper.y));
    el('lower-contact').setAttribute('cx', String(state.belt.lower.x));
    el('lower-contact').setAttribute('cy', String(state.belt.lower.y));
    const length = 52 * state.belt.horizontalForce / RESTRAINT_WINDOW.maxForce;
    const { x, y } = state.belt.center;
    el('force').setAttribute('d', `M${x} ${y}H${x - length}m0 0l8 -5m-8 5l8 5`);
    el('force').setAttribute('visibility', state.belt.horizontalForce > .05 ? 'visible' : 'hidden');
    el('force').setAttribute('data-force', String(state.belt.horizontalForce));
    if (state.phase !== previousPhase) {
      previousPhase = state.phase;
      el('stage').textContent = state.phase === 'fitted'
        ? t('起点：带子已经贴合髋部，身体和车一起运动；本例尚无附加伸长。')
        : state.phase === 'loading'
          ? t('车开始减速，身体相对车前移。贴合的带子伸长并受拉，向后的作用使前移逐渐受限；虚线参照没有这个约束。')
          : t('暂停观察第一次前移最大的位置。身体相对车的瞬时速度为零，仍受带子向后拉；这不代表身体或车已经对地停下。');
    }
    progress.setAttribute('aria-valuetext', t('约束过程 {{value}}%；{{stage}}', {
      value: Math.round(state.progress * 100), stage: el('stage').textContent,
    }));
  }
  function pause() {
    playing = false; cancelAnimationFrame(frame); frame = 0; lastTime = 0;
    play.textContent = Number(progress.value) >= 100 ? t('再看一次') : t('播放受拉过程');
    play.setAttribute('aria-pressed', 'false');
  }
  function animate(now: number) {
    if (!playing) return;
    if (lastTime) progress.value = String(Math.min(100, Number(progress.value) + Math.min(80, now - lastTime) / 60));
    lastTime = now; draw();
    if (Number(progress.value) >= 100) { pause(); return; }
    frame = requestAnimationFrame(animate);
  }
  play.addEventListener('click', () => {
    if (playing) { pause(); return; }
    if (Number(progress.value) >= 100) progress.value = '0';
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      progress.value = '100'; draw(); pause(); return;
    }
    playing = true; play.textContent = t('暂停'); play.setAttribute('aria-pressed', 'true');
    draw(); frame = requestAnimationFrame(animate);
  });
  el('reset').addEventListener('click', () => { progress.value = '0'; pause(); draw(); });
  progress.addEventListener('input', () => { pause(); draw(); });
  reference.addEventListener('change', draw);
  draw(); pause();
  return { suspend: pause, refresh: draw };
}
