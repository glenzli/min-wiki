import { t } from './i18n.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { createHearingScene, drawHearing } from './scene.ts';

export function mountHearingStudy(root: HTMLElement, changed: (pitch: number, strength: number) => void) {
  let active = true;
  createHearingScene(root);
  const byId = <T extends HTMLElement>(id: string) => root.querySelector<HTMLElement>(`#h-${id}`)! as T;
  const progressInput = byId<HTMLInputElement>('progress');
  const strengthInput = byId<HTMLInputElement>('strength');
  let progress = 0, pitch = 0, pitchTarget = 0, strength = .55, playing = false;
  let view = 0, viewTarget = 0, earZoom = 0, earTarget = 0, lastPhase = -1;
  let lastHasInput: boolean | undefined;
  let cancelPlay = () => {}, cancelPitch = () => {}, cancelView = () => {}, cancelEar = () => {};
  const phases = [
    {
      title: t('空气把振动带到鼓膜'),
      text: t('空气在声波中来回振动；不是一串空气小球一路飞到脑。先找耳道尽头那层薄膜。'),
      story: t('耳道尽头的薄膜，接住空气中的振动。'),
      mechanism: t('声波在耳道中造成压强变化，鼓膜两侧的压差驱动膜运动；这还属于机械过程。真实响应受耳道共振、膜的机械性质和中耳负载共同影响。此图只用放大的位移标示接收过程，没有计算声压场或鼓膜频率响应。'),
      reference: 'https://www.nidcd.nih.gov/health/how-do-we-hear',
    },
    {
      title: t('听小骨把振动接下去'),
      text: t('鼓膜轻轻动，三个相连的小骨头也传动，镫骨把振动交给耳蜗里的液体。'),
      story: t('鼓膜带动小骨头，再把振动交给耳蜗的液体。'),
      mechanism: t('中耳承担空气与内耳液体之间的阻抗匹配。理想力—面积近似可写成 pₒ/pₑ ≈ (Aₑ/Aₛ)r：pₑ、pₒ 分别为鼓膜侧与卵圆窗侧的压强变化，Aₑ、Aₛ 为有效鼓膜面积与镫骨底板面积，r 为杠杆力增益。真实传递随频率变化且有损耗；本页未代入这些量，也不把画中位移当成压力增益。'),
      reference: 'https://nba.uth.tmc.edu/neuroscience/m/s2/chapter12.html',
    },
    {
      title: t('耳蜗里的膜和细胞回应'),
      text: t('展开耳蜗，比较较高音和较低音的响应位置；再看感觉细胞顶端的纤毛束怎样偏转。'),
      story: t('耳蜗里的膜运动，带动感觉细胞。'),
      mechanism: t('振动在耳蜗中形成沿基底膜传播的行波。膜的机械性质沿长度变化，较高频率的响应峰偏基底端，较低频率偏顶端；响应占有一段区域。A 标记连接耳蜗整体与展开图，B 连接所选响应区域与代表性内毛细胞。金色范围及位置变化是定性编码，不是合成音赫兹数的解剖定位。') + ' ' + t('波前到达 B 处后，近景才随这处膜运动。细胞、纤毛束和液体的放大动作只连接因果，不表示它们在真实耳蜗中严格同相。'),
      reference: 'https://www.nidcd.nih.gov/health/how-do-we-hear',
    },
    {
      title: t('神经把消息传向脑'),
      text: t('感觉细胞将机械变化转为电反应，再影响听神经。脑还会经过许多步骤加工这些消息。'),
      story: t('细胞改变电反应，神经接着传消息。'),
      mechanism: t('纤毛束偏转改变机械敏感通道的开放，内毛细胞产生受体电位；细胞基部的递质释放进一步影响听神经纤维的动作电位。受体电位与神经放电是两个环节。画中离子、递质和紫线只表达这一先后关系，未求解离子梯度、释放概率、放电率或脑内识别；外毛细胞的主动反馈也未模拟。'),
      reference: 'https://nba.uth.tmc.edu/neuroscience/m/s2/chapter12.html',
    },
  ];

  function render() {
    const state = drawHearing(progress, pitch, strength, root);
    progressInput.value = String(progress * 100);
    byId('progress-value').textContent = `${Math.round(progress * 100)}%`;
    progressInput.setAttribute('aria-valuetext', t('进度 {{value}}%', { value: Math.round(progress * 100) }));
    byId('strength-value').textContent = `${Math.round(strength * 100)}%`;
    strengthInput.setAttribute('aria-valuetext', t('示意振幅 {{value}}%', { value: Math.round(strength * 100) }));
    byId<HTMLButtonElement>('play').disabled = playing;
    byId<HTMLButtonElement>('pause').disabled = !playing;
    const hasInput = state.amplitude > 0;
    if (state.phase !== lastPhase || hasInput !== lastHasInput) {
      lastPhase = state.phase;
      lastHasInput = hasInput;
      const phase = phases[state.phase]!;
      root.setAttribute('data-hearing-phase', String(state.phase));
      byId('phase-count').textContent = `0${state.phase + 1} / 04`;
      byId('phase-title').textContent = hasInput ? phase.title : t('当前没有输入振动');
      byId('phase-text').textContent = hasInput ? phase.text : t('振幅为 0%，所以本图不显示这段声音引起的机械和神经响应。把振幅调高，再比较同一位置。');
      byId('stage-number').textContent = `0${state.phase + 1}`;
      byId('stage-story').textContent = hasInput ? phase.story : t('振幅为 0%：这段声音没有引起响应。');
      byId('phase-mechanism').textContent = phase.mechanism;
      byId<HTMLAnchorElement>('phase-source').href = phase.reference;
      root.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach((button, i) => button.setAttribute('aria-pressed', String(i === state.phase)));
    }
  }

  function camera() {
    byId('detail-scene').setAttribute('viewBox', `0 ${view * 510} 600 460`);
    byId('ear-scene').setAttribute('viewBox', `${270 * earZoom} ${93 * earZoom} ${720 - 290 * earZoom} ${470 - 189.3 * earZoom}`);
  }
  function stop() { cancelPlay(); playing = false; render(); }
  function settleCameras() {
    cancelPitch(); cancelView(); cancelEar();
    pitch = pitchTarget; view = viewTarget; earZoom = earTarget;
    camera(); render();
  }
  function seek(to: number, duration = 600) {
    stop();
    cancelPlay = animateValue({ from: progress, to, duration, onUpdate: v => { progress = v; render(); } });
  }

  byId('play').addEventListener('click', () => {
    stop();
    if (progress >= .999) progress = 0;
    playing = true;
    cancelPlay = animateValue({ from: progress, to: 1, duration: 11000 * (1 - progress), onUpdate: v => {
      if (!active) return;
      progress = v; render();
    }, onComplete: () => { playing = false; render(); } });
  });
  byId('pause').addEventListener('click', stop);
  byId('reset').addEventListener('click', () => seek(0));
  progressInput.addEventListener('input', () => {
    const next = Number(progressInput.value) / 100;
    stop(); progress = next; render();
  });
  strengthInput.addEventListener('input', () => {
    strength = Number(strengthInput.value) / 100;
    changed(pitchTarget, strength); render();
  });
  root.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(button => button.addEventListener('click', () => seek(Number(button.dataset.stage))));
  root.querySelectorAll<HTMLButtonElement>('[data-pitch]').forEach(button => button.addEventListener('click', () => {
    cancelPitch();
    pitchTarget = Number(button.dataset.pitch);
    changed(pitchTarget, strength);
    root.querySelectorAll<HTMLButtonElement>('[data-pitch]').forEach(other => other.setAttribute('aria-pressed', String(button === other)));
    cancelPitch = animateValue({ from: pitch, to: pitchTarget, duration: 650, onUpdate: v => { pitch = v; render(); } });
  }));
  root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => {
    cancelView(); viewTarget = Number(button.dataset.view);
    root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(other => other.setAttribute('aria-pressed', String(button === other)));
    byId('detail-name').textContent = viewTarget ? t('毛细胞的放大原理') : t('耳蜗里的不同位置');
    byId('detail-caption').textContent = viewTarget
      ? t('B：先等振动到达这处膜，再看细胞怎样回应。换音高会改变选中的响应区域；近景动作是放大的定性示意。')
      : t('A：同一耳蜗的展开示意。金色范围表示较强响应区域；B 标出继续看细胞的位置。两幅图的倍率不同，未标定真实频率。');
    cancelView = animateValue({ from: view, to: viewTarget, duration: 850, onUpdate: v => { view = v; camera(); } });
  }));
  byId('ear-zoom').addEventListener('click', () => {
    cancelEar(); earTarget = 1 - earTarget;
    byId('ear-zoom').setAttribute('aria-pressed', String(Boolean(earTarget)));
    cancelEar = animateValue({ from: earZoom, to: earTarget, duration: 800, onUpdate: v => { earZoom = v; camera(); } });
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); settleCameras(); } });
  window.addEventListener('pagehide', () => { stop(); settleCameras(); });
  window.addEventListener('pageshow', () => { camera(); render(); });
  render(); camera();
  return {
    setActive(next: boolean) { active = next; if (!next) { stop(); settleCameras(); } },
    setConditions(nextPitch: number, nextStrength: number) {
      cancelPitch(); pitch = pitchTarget = nextPitch; strength = nextStrength;
      strengthInput.value = String(strength * 100);
      root.querySelectorAll<HTMLButtonElement>('[data-pitch]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.pitch) === pitchTarget)));
      render();
    },
    snapshot() { return { progress, pitch: pitchTarget, strength, playing, view: viewTarget, earZoom: earTarget }; },
  };
}
