import type { Language, StudyInstance } from '../../earth/studyContract.ts';
import { createFinitePlayback, type FinitePlayback } from '../../earth/finitePlayback.ts';
import { parseBurgessState, WAPTIA_CAMERAS, WAPTIA_PARTS, WAPTIA_STOPS, type BurgessState } from './model.ts';
import content from './content.json';
import './style.css';

type Pair = { zh: string; en: string };
const PARTS = content.parts as Record<BurgessState['part'], { name: Pair; record: Pair; reconstruction: Pair; unknown: Pair; detail: Pair; panels: string }>;
const escape = (value: string | number) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const PHOTO = new URL('../assets/waptia-fossils-fig1.jpg', import.meta.url).href;
export function mountBurgess(host: HTMLElement, options: { language: Language; initial: BurgessState; onStateChange(state: BurgessState): void }): StudyInstance {
  const zh = options.language === 'zh', w = (a: string, b: string) => zh ? a : b, p = (pair: Pair) => pair[options.language];
  const cameraName = (id: BurgessState['camera']) => ({ oblique: w('斜侧面', 'Oblique'), side: w('侧面', 'Side'), dorsal: w('背面', 'Dorsal'), ventral: w('腹面', 'Ventral') })[id];
  const root = host.ownerDocument.createElement('section'); root.className = 'burgess-study';
  const events = new AbortController();
  let state = parseBurgessState(options.initial), visualProgress = state.progress, disposed = false, generation = 0, loading = false, failed = false;
  let scene: ReturnType<typeof import('./scene3d.ts')['createBurgessScene']> | undefined, playback: FinitePlayback | undefined, lastPart = '';
  const find = <T extends HTMLElement = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const text = (selector: string, value: string) => { find(selector).textContent = value; };
  root.innerHTML = `
    <p class="life-eyebrow">${escape(w('伯吉斯页岩 · Walcott采石场 · 约5.08亿年前', 'Burgess Shale · Walcott Quarry · about 508 million years ago'))}</p>
    <h2 class="life-heading">${escape(w('瓦普塔虫：身体怎样拼回来？', 'Waptia: reconstruct a body'))}</h2>
    <details class="life-choices"><summary>${escape(w('观察位置与复原方式', 'View & evidence'))} · <strong data-burgess-choice></strong></summary>
      <div class="earth-controls burgess-controls"><label>${escape(w('观察方向', 'Viewpoint'))}<select data-animal="camera">${WAPTIA_CAMERAS.map(id => `<option value="${id}">${escape(cameraName(id))}</option>`).join('')}</select></label>
      <label>${escape(w('活动对照', 'Activity contrast'))}<select data-animal="activity"><option value="paddle">${escape(w('展示可能的片肢划水', 'Inferred stroke'))}</option><option value="rest">${escape(w('静止形态对照', 'Neutral form'))}</option></select></label>
      <label class="burgess-checkbox"><input type="checkbox" data-burgess-evidence>${escape(w('高亮化石约束部位；必要时淡化甲壳', 'Highlight constrained parts; fade shield when needed'))}</label></div>
      <p class="earth-note">${escape(w('身体厚度、颜色、光照、海底间距与活动节律包含作者补全。相机和参考尺用于观察；模型中线体长50毫米，不含触角。十秒不是实测游泳周期。', 'Body volume, color, lighting, distance above the seafloor and motion rhythm include authored completion. The camera and ruler support inspection. Representative midline length is 50 mm excluding antennules; ten seconds is not a measured swimming cycle.'))}</p>
    </details>
    <div class="burgess-grid"><div class="burgess-main">
      <figure class="life-figure"><div class="life-three-wrap burgess-three-wrap"><div class="life-three-host burgess-three-host" data-burgess-three></div><div class="life-three-status" data-burgess-status role="status">${escape(w('正在准备瓦普塔虫……', 'Preparing Waptia…'))}</div><span class="burgess-scene-badge">${escape(w('原创复原 · 展示配色', 'Original reconstruction · display colors'))}</span></div>
      <figcaption class="life-caption">${escape(w('拖动旋转；双指缩放或使用 + / −，方向键与Home可操作。10毫米尺与模型共用长度单位，透视会缩短投影；细毛适度加粗。模型综合多件化石，不是扫描。', 'Drag to rotate; pinch or use + / − to zoom, arrow keys and Home also work. The 10 mm ruler shares model units; perspective foreshortens its projection. Fine setae are slightly thickened. This combines fossils rather than scanning one specimen.'))}</figcaption></figure>
      <div class="burgess-player" data-burgess-player><div class="life-playback-actions"><button type="button" data-burgess-toggle></button><button type="button" data-burgess-reset>${escape(w('回到起始姿态', 'Reset pose'))}</button><button type="button" data-burgess-camera>${escape(w('恢复观察镜头', 'Reset camera'))}</button></div>
      <label class="life-progress-label">${escape(w('可能的划水姿态', 'Inferred stroke pose'))}<output data-burgess-progress aria-live="off"></output><input type="range" min="0" max="100" step="1" data-burgess-scrub aria-label="${escape(w('拖动瓦普塔虫示意动作', 'Scrub the illustrative Waptia movement'))}"></label>
      <p class="burgess-motion-note" data-burgess-motion></p><p class="life-sr-only" data-burgess-announcement aria-live="polite" aria-atomic="true"></p></div>
      <div class="burgess-part-buttons" role="group" aria-label="${escape(w('同一个体的身体部位', 'Parts of the same reconstructed body'))}">${WAPTIA_PARTS.map(id => `<button type="button" data-burgess-part="${id}">${escape(p(PARTS[id].name))}</button>`).join('')}</div>
      <button type="button" data-burgess-retry hidden>${escape(w('保留当前地址并重新载入3D', 'Reload 3D with the current URL'))}</button>
    </div><aside class="burgess-evidence-panel">
      <p class="life-eyebrow">${escape(w('对照证据，不把补全当成看见', 'Compare evidence and completion'))}</p><h3 data-burgess-part-title></h3>
      <dl class="burgess-evidence-list"><div><dt>${escape(w('化石约束', 'Fossil constraints'))}</dt><dd data-burgess-record></dd></div><div><dt>${escape(w('模型怎样补成立体', 'How the model completes volume'))}</dt><dd data-burgess-reconstruction></dd></div><div><dt>${escape(w('仍不知道什么', 'What remains unknown'))}</dt><dd data-burgess-unknown></dd></div></dl>
      <details class="burgess-photo" open data-burgess-photo><summary>${escape(w('真实化石图版：可点开看清', 'Real fossil plate: open for detail'))}</summary><figure><a href="${PHOTO}" target="_blank" rel="noopener"><img src="${PHOTO}" width="680" height="557" loading="lazy" decoding="async" alt="${escape(w('2018年论文图1的十个瓦普塔虫化石面板，保存姿态不同；黑色比例尺每条为1厘米。', 'Ten Waptia fossil panels from Figure 1 of the 2018 paper, in different preserved poses. Each black scale bar represents 1 cm.'))}" data-burgess-photo-image></a><figcaption><p data-burgess-photo-panels></p><p>${escape(w('图1b：USNM 139214。每条黑色标尺为1厘米。此图未裁切；各面板不是同一个体。压扁后的宽度与厚度不能直接等同活体。', 'Panel 1b: USNM 139214. Each black scale bar is 1 cm. This plate is unmodified; panels are different individuals. Flattened dimensions do not directly determine living width or thickness.'))}</p><p>Vannier, Aria, Taylor & Caron (2018), Fig. 1. ©2018 The Authors. <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a> · <a href="https://doi.org/10.1098/rsos.172206" target="_blank" rel="noopener">${escape(w('原始研究与图注', 'Research & full caption'))}</a></p><p data-burgess-photo-error hidden>${escape(w('本地图版暂未载入，可打开原始研究查看；文字依据仍然保留。', 'The local plate did not load. Open the research to inspect it; the evidence text remains available.'))}</p></figcaption></figure></details>
    </aside></div>
    <details class="earth-deeper"><summary>${escape(w('为什么会动，还不能称为“真实录像”？', 'Why movement is still an inference'))}</summary><p>${escape(w('化石能留下附肢的形状、连接与部分细毛。研究者据此并参考活体节肢动物，讨论瓦普塔虫在海底附近划水的可能方式。前三对短肢不应直接当作海底步足；本场景不安排它走路或捕食。六对片肢采用协调划动，具体角度、频率及小幅触角姿势由作者安排。', 'Fossils preserve appendage shape, connections and some setae. Researchers use those structures and living arthropod comparisons to discuss possible swimming near the bottom. The first three short limbs should not simply be treated as walking legs; this scene adds neither crawling nor predation. Six lamellate pairs move together, with authored angles, frequency and small antennular poses.'))}</p><p>${escape(w('年代锁定在伯吉斯Walcott采石场附近的约5.08亿年前。这里没有把澄江、埃迪卡拉或现代珊瑚礁的动物混放。海底底色、摆放高度和光源只是观察环境，不是该古海底的实测地图或古代光照数据。', 'The context is the Walcott Quarry Burgess Shale, about 508 million years ago. Chengjiang, Ediacaran and modern reef animals are not mixed into the setting. Substrate color, placement and lights are viewing choices, rather than a measured ancient seafloor or light field.'))}</p><ul class="life-sources"><li><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC6030330/" target="_blank" rel="noopener">Vannier et al. (2018), Waptia fieldensis</a><span>${escape(w('身体和附肢重描述、体长定义、图1及20–23；运动讨论为功能推断。', 'Redescribed body and appendages, length definition, Figs 1 and 20–23; movement is a functional interpretation.'))}</span></li><li><a href="https://burgess-shale.rom.on.ca/fossils/waptia-fieldensis/" target="_blank" rel="noopener">Royal Ontario Museum · Waptia fieldensis</a><span>${escape(w('地点、标本与机构讲解；网页旧复原色彩不作为本模型配色证据。', 'Localities, specimens and institutional interpretation; colors in older artwork are not evidence for this model.'))}</span></li></ul></details>`;
  host.replaceChildren(root);
  function emit() { options.onStateChange({ ...state }); }
  function updateControls() {
    const playing = playback?.isPlaying() ?? false;
    const button = find<HTMLButtonElement>('[data-burgess-toggle]');
    button.textContent = playing ? w('暂停划水示意', 'Pause inferred stroke') : state.progress >= 100 ? w('重新观察划水', 'Replay inferred stroke') : w('播放划水示意', 'Play inferred stroke');
    button.setAttribute('aria-pressed', String(playing)); button.disabled = failed || !scene || state.activity === 'rest';
    find<HTMLInputElement>('[data-burgess-scrub]').value = String(state.progress);
    find<HTMLInputElement>('[data-burgess-scrub]').disabled = state.activity === 'rest';
    find<HTMLButtonElement>('[data-burgess-reset]').disabled = state.progress === 0;
    text('output[data-burgess-progress]', `${state.progress}%`);
    text('[data-burgess-motion]', state.activity === 'rest' ? w('静止形态对照：不播放；已选的动作位置仍保留。', 'Neutral comparison: playback is off; the chosen motion position is retained.') : w('10秒有限示意 · 暂停保留姿态 · 划动节律为推断补全', '10-second finite example · pause retains pose · stroke rhythm is authored inference'));
  }
  function update() {
    if (disposed) return;
    root.dataset.burgessProgress = String(state.progress); root.dataset.burgessPart = state.part;
    text('[data-burgess-choice]', `${p(PARTS[state.part].name)} · ${cameraName(state.camera)}`);
    for (const select of root.querySelectorAll<HTMLSelectElement>('[data-animal]')) select.value = String(state[select.dataset.animal as 'camera' | 'activity']);
    find<HTMLInputElement>('input[data-burgess-evidence]').checked = state.evidence;
    for (const button of root.querySelectorAll<HTMLButtonElement>('button[data-burgess-part]')) button.setAttribute('aria-pressed', String(button.dataset.burgessPart === state.part));
    if (lastPart !== state.part) {
      lastPart = state.part; const part = PARTS[state.part];
      text('[data-burgess-part-title]', p(part.name)); text('[data-burgess-record]', p(part.record));
      text('[data-burgess-reconstruction]', p(part.reconstruction)); text('[data-burgess-unknown]', p(part.unknown));
      text('[data-burgess-photo-panels]', `${w('在原始图版中寻找面板', 'Look in original plate panels')}: ${part.panels}. ${p(part.detail)}`);
    }
    scene?.resume(); scene?.update({ ...state, progress: visualProgress }); updateControls(); playback?.sync();
  }
  function unavailable(error: unknown) {
    if (disposed) return;
    failed = true; find('[data-burgess-status]').hidden = false; find('[data-burgess-retry]').hidden = false;
    text('[data-burgess-status]', w('3D暂不可用，化石、部位说明和来源仍可核对。', '3D is unavailable. Fossils, part explanations and sources remain available.'));
    playback?.pause(); scene?.dispose(); scene = undefined;
    find<HTMLDetailsElement>('[data-burgess-photo]').open = true; updateControls();
    root.dataset.burgessFailure = error instanceof Error ? error.name : 'unavailable';
  }
  function ensureScene() {
    if (disposed || loading || scene || failed) return;
    loading = true; const ticket = ++generation;
    void import('./scene3d.ts').then(module => {
      if (disposed || ticket !== generation) return;
      scene = module.createBurgessScene(find('[data-burgess-three]'), { label: w('可旋转的瓦普塔虫完整复原；中线体长50毫米，触角另计。未知颜色和示意划水不作为化石观测。', 'Rotatable whole Waptia reconstruction; midline body length 50 mm excluding antennules. Unknown colors and inferred strokes are not fossil observations.'), initial: state, onUnavailable: unavailable,
        onResetView() { if (disposed) return; state.camera = 'oblique'; update(); emit(); } });
      if (!failed) find('[data-burgess-status]').hidden = true;
      update();
    }).catch(unavailable).finally(() => { if (ticket === generation) loading = false; });
  }
  root.addEventListener('click', event => {
    if (!(event.target instanceof Element) || disposed) return;
    const button = event.target.closest<HTMLButtonElement>('button'); if (!button) return;
    event.stopPropagation();
    if (button.hasAttribute('data-burgess-toggle')) { playback?.toggle(); updateControls(); return; }
    if (button.hasAttribute('data-burgess-reset')) { playback?.reset(); return; }
    if (button.hasAttribute('data-burgess-camera')) { state.camera = 'oblique'; scene?.resetCamera(); }
    if (button.hasAttribute('data-burgess-retry')) { location.reload(); return; }
    if (WAPTIA_PARTS.includes(button.dataset.burgessPart as BurgessState['part'])) state.part = button.dataset.burgessPart as BurgessState['part'];
    update(); emit();
  }, { signal: events.signal });
  root.addEventListener('change', event => {
    if (disposed || !(event.target instanceof HTMLSelectElement || event.target instanceof HTMLInputElement)) return;
    const target = event.target; event.stopPropagation();
    if (target.hasAttribute('data-burgess-evidence')) state.evidence = (target as HTMLInputElement).checked;
    if (target.dataset.animal === 'camera') state.camera = parseBurgessState({ ...state, camera: target.value }).camera;
    if (target.dataset.animal === 'activity') { playback?.pause(); state.activity = parseBurgessState({ ...state, activity: target.value }).activity; }
    update(); emit();
  }, { signal: events.signal });
  root.addEventListener('input', event => {
    if (!(event.target instanceof HTMLInputElement) || !event.target.hasAttribute('data-burgess-scrub')) return;
    event.stopPropagation(); playback?.setProgress(Number(event.target.value) / 100);
  }, { signal: events.signal });
  find<HTMLImageElement>('[data-burgess-photo-image]').addEventListener('error', () => { find('[data-burgess-photo-error]').hidden = false; }, { signal: events.signal });
  root.ownerDocument.addEventListener('visibilitychange', () => { if (!root.ownerDocument.hidden) scene?.resume(); }, { signal: events.signal });
  playback = createFinitePlayback({ element: find('[data-burgess-player]'), id: 'life-waptia-stroke', durationMs: 10000,
    readProgress: () => visualProgress / 100, visibilityTarget: find('[data-burgess-three]'), frameIntervalMs: 40, reducedMotionSteps: WAPTIA_STOPS.length - 1,
    writeProgress(fraction) { visualProgress = fraction * 100; state.progress = Math.round(visualProgress); update(); emit(); },
    onPlayingChange(playing) { if (disposed) return; updateControls(); text('[data-burgess-announcement]', playing ? '' : `${w('动作位置', 'Motion position')} ${state.progress}%`); emit(); },
  });
  update(); ensureScene();
  return {
    pause() { playback?.pause(); scene?.pause(); },
    dispose() { if (disposed) return; playback?.dispose(); disposed = true; ++generation; events.abort(); scene?.dispose(); scene = undefined; root.remove(); },
  };
}
