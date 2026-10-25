import './style.css';
import content from './content.json';
import { languageHref } from '../../src/platform/i18n.ts';
import { earthRouteURL, readEarthRoute, type Chapter } from '../earth/journey.ts';
import { createFinitePlayback } from '../earth/finitePlayback.ts';
import type { MineralScene } from './scene.ts';
import type { StudyContext, StudyInstance } from '../earth/studyContract.ts';
import { EVIDENCE, MINERALS, OCCURRENCES, SPECIMENS, VIEWS, cavityLining, evidenceResult, graphiteOffset, growthAt, mineralById, oreBudget, parseState, serializeState, type Evidence, type MineralState, type Specimen, type View } from './model.ts';

const escape = (value: string | number) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const n = (value: number, digits = 1) => value.toFixed(digits).replace(/\.0$/, '');
const polygon = (points: readonly (readonly number[])[]) => points.map(p => p.map(v => n(v, 2)).join(',')).join(' ');

export function mountStudy(host: HTMLElement, context: StudyContext): StudyInstance {
  const w = (zh: string, en: string) => context.language === 'en' ? en : zh;
  const copy = context.language === 'en' ? content.en : content.zh;
  let state = parseState(context.initialState);
  let disposed = false;
  let scene: MineralScene | undefined, sceneEpoch = 0, sceneLoading = false, sceneFailed = false;
  const events = new AbortController();
  const root = document.createElement('section');
  root.className = 'earth-module minerals-study';
  const viewName = (view: View) => ({ structure: w('碳的连接', 'Carbon connections'), growth: w('长出晶体', 'Growing crystals'), evidence: w('证据工作台', 'Evidence workbench'), resources: w('从矿物到资源', 'From minerals to resources') })[view];
  const testName = (test: Evidence) => ({ hardness: w('硬度', 'Hardness'), streak: w('条痕', 'Streak'), cleavage: w('解理 / 断口', 'Cleavage / fracture'), luster: w('光泽', 'Luster'), density: w('密度', 'Density') })[test];
  const select = (key: string, label: string, options: readonly (readonly [string, string])[]) => `<label>${escape(label)}<select data-key="${key}">${options.map(([value, text]) => `<option value="${value}">${escape(text)}</option>`).join('')}</select></label>`;
  const slider = (key: string, label: string, min = 0, max = 100, step = 1) => `<label class="minerals-slider"><span>${escape(label)} <output data-output="${key}"></output></span><input type="range" data-key="${key}" min="${min}" max="${max}" step="${step}"></label>`;
  root.innerHTML = `
    <details class="minerals-map"><summary>${escape(w('本馆观察厅', 'Gallery rooms'))}: <span data-current-view></span></summary><nav aria-label="${escape(w('选择矿物观察层次', 'Choose a mineral observation level'))}">${VIEWS.map((view, i) => `<button type="button" data-view="${view}" aria-pressed="false"><small>0${i + 1}</small> ${escape(viewName(view))}</button>`).join('')}</nav><p>${escape(w('内部连接 → 成晶条件 → 观察证据 → 用途与代价。每一厅保留自己的选择。', 'Connections → growth conditions → evidence → uses and costs. Each room retains its choices.'))}</p></details>
    <header class="minerals-heading"><h3 tabindex="-1" data-title></h3><p data-intro></p></header>
    <div data-panel="structure">
      <div class="minerals-controls">${select('representation', w('3D观察尺度与对象', '3D observation scale and object'), [['carbon', w('微观：钻石与石墨连接', 'Microscopic: diamond & graphite bonds')], ['quartz', w('宏观：石英晶簇形态', 'Macroscopic: quartz crystal cluster')]])}<button type="button" data-camera-reset>${escape(w('恢复观察角度', 'Reset camera'))}</button></div>
      <div data-quartz-exposure hidden><div class="minerals-controls">${slider('exposure', w('围岩显示：自然位置 → 露出展品', 'Surroundings: natural position → exposed display'))}<button type="button" data-natural-location>${escape(w('看自然位置', 'See natural position'))}</button><button type="button" data-display-location>${escape(w('看露出展品', 'See exposed display'))}</button></div><p class="minerals-note">${escape(w('琥珀色圆环A标记同一晶簇的根部。只改变围岩显示，晶簇不移动、不缩放；不是采集、清理或溶解的过程模拟。自然位置采用前侧剖开、围岩半透明的教学示意。', 'Amber ring A marks the same cluster root. Only surrounding-rock visibility changes; the cluster neither moves nor scales. This is not extraction, cleaning or dissolution. The natural view uses a front cutaway with translucent teaching rock.'))}</p></div>
      <div data-structure-exhibit-slot><div data-mineral-exhibit><div class="minerals-three-shell"><div class="minerals-three-host" data-three-host></div><div class="minerals-growth-overlay" data-growth-overlay hidden><span>A · ${escape(w('固定根部', 'Fixed root'))}</span><span>${escape(w('蓝点：材料搬运示意', 'Blue marks: illustrative transport'))}</span></div><p data-three-status role="status">${escape(w('正在准备可旋转的3D展品……', 'Preparing the rotatable 3D exhibit…'))}</p><button type="button" data-three-retry hidden>${escape(w('重试3D展品', 'Retry 3D exhibit'))}</button></div>
      <p class="minerals-3d-caption" data-three-caption></p><p class="minerals-note">${escape(w('拖动旋转，双指或滚轮缩放；键盘聚焦画面后用方向键、加减号与Home。没有自动转动。', 'Drag to rotate, pinch or scroll to zoom. Focus the scene for arrow keys, +/− and Home. Rotation never starts automatically.'))}</p></div></div>
      <details class="minerals-flat" data-flat open><summary>${escape(w('二维连接对照与3D降级说明', '2D bond comparison and 3D fallback'))}</summary><div class="minerals-pair"><figure><div data-diamond></div><figcaption><strong>${escape(w('钻石 · 三维强连接', 'Diamond · bonds in three dimensions'))}</strong><span>${escape(w('局部四邻连接单元', 'Local four-neighbor unit'))}</span></figcaption></figure><figure><div data-graphite></div><figcaption><strong>${escape(w('石墨 · 层内强，层间弱', 'Graphite · strong sheets, weaker between'))}</strong><span>${escape(w('同一层整体移动，层内六边形保留', 'A sheet shifts while its hexagons remain'))}</span></figcaption></figure></div>
      </details><div class="minerals-controls" data-carbon-controls>${slider('shear', w('推一推：看层间相对滑动', 'Give it a push: compare layer sliding'))}<button type="button" data-reset="shear">${escape(w('回到原位', 'Return to start'))}</button></div>
      <p class="minerals-result" data-structure-result></p>
      <div class="minerals-occurrence" data-quartz-context hidden><h4>${escape(w('漂亮标本，原本长在哪里？', 'Where did a beautiful specimen grow?'))}</h4><div data-occurrence-scene class="minerals-stage"></div><div class="minerals-controls">${select('occurrence', w('比较赋存状态（不同代表情景）', 'Compare occurrences (different representative settings)'), OCCURRENCES.map(id=>[id,copy.occurrences[id].title]))}</div><p data-occurrence-copy></p><p class="minerals-note">${escape(w('剖面尺度各自简化，不按同一长度或时间比例。只有裂隙图的A连接上方3D晶簇；换情景不是同一块岩石的变化历史，也不能凭外形确定标本来源。', 'Section sizes and times are schematic, without a shared metric. Only A in the fracture case links to the 3D cluster above. Changing settings is not one rock’s history, and shape alone does not establish a locality.'))}</p><details class="minerals-options"><summary>${escape(w('天然晶面，还是后来切出的面？', 'A natural crystal face or a later cut surface?'))}</summary><div class="minerals-controls">${select('finish',w('对照表面来源（独立说明图）','Compare surface origins (separate diagrams)'),[['natural',w('天然生长面','Natural growth faces')],['cut',w('切开 / 切磨面','Sawn / faceted surfaces')]])}</div><div data-finish-scene></div><p data-finish-copy></p><p class="minerals-note">${escape(w('这幅对照不切磨上方原晶簇。清理附着物、露出围岩和改变晶体形状是不同处理；不是所有馆藏都被染色或打磨。标签、处理记录与检验比“看起来闪亮”更有证据力。', 'These diagrams do not cut the cluster above. Cleaning deposits, exposing host rock and reshaping a crystal are different treatments. Museum specimens are not all dyed or polished. Labels, treatment records and examination offer stronger evidence than sparkle alone.'))}</p></details></div>
    </div>
    <div data-panel="growth" hidden>
      <div class="minerals-controls minerals-growth-setting">${select('environment', w('选择形成环境', 'Choose a formation setting'), [['hydrothermal', w('热水溶液降温 · 3D代表例', 'Cooling hot solution · 3D example')], ['melt', w('熔体冷却 · 材料预算', 'Cooling melt · material budget')], ['evaporation', w('水溶液蒸发 · 材料预算', 'Evaporating solution · material budget')]])}<button type="button" data-growth-camera>${escape(w('恢复观察角度', 'Reset camera'))}</button></div>
      <div class="minerals-playback" data-growth-playback><div class="minerals-playback-buttons"><button type="button" class="minerals-play-toggle" data-playback-toggle aria-pressed="false">${escape(w('播放生长', 'Play growth'))}</button><button type="button" data-playback-reset>${escape(w('重置', 'Reset'))}</button><button type="button" data-growth-back>${escape(w('上一步', 'Previous step'))}</button><button type="button" data-growth-next>${escape(w('下一步', 'Next step'))}</button><button type="button" data-end>${escape(w('看终点', 'See endpoint'))}</button></div><label class="minerals-slider minerals-progress"><span>${escape(w('形成阶段 · 无真实时间单位', 'Formation stage · no real time units'))}<output data-output="progress"></output></span><input type="range" data-key="progress" data-playback-scrub min="0" max="100" step="0.1"></label><p class="minerals-note" data-playback-status role="status"></p></div>
      <div class="minerals-growth-stops" aria-label="${escape(w('跳到教学阶段', 'Jump to a teaching stage'))}">${[[0,w('起始材料','Starting material')],[35,w('观察起点','Inspect onset')],[65,w('观察晶粒','Observe grains')],[100,w('材料去向','Material destinations')]].map(([value,label])=>`<button type="button" data-growth-seek="${value}"><small>${value}%</small> ${escape(label)}</button>`).join('')}</div>
      <div data-growth-viewport><div class="minerals-growth-ledger" aria-label="${escape(w('当前教学预算', 'Current teaching budget'))}"><small>${escape(w('教学份额 · 不是质量或温度单位', 'Teaching shares · not mass or temperature units'))}</small><div><span data-growth-ledger-label="0"></span><strong data-growth-ledger-value="0"></strong></div><div><span data-growth-ledger-label="1"></span><strong data-growth-ledger-value="1"></strong></div><div><span data-growth-ledger-label="2"></span><strong data-growth-ledger-value="2"></strong></div></div><p class="minerals-result" data-growth-result></p><div data-growth-exhibit-slot></div>
      <details class="minerals-growth-meaning"><summary>${escape(w('3D晶体与材料预算怎样连接？', 'How do the 3D crystals connect to the budget?'))}</summary><p class="minerals-note minerals-growth-scope" data-growth-scope></p></details>
      <details class="minerals-growth-diagram" data-growth-diagram><summary>${escape(w('展开材料预算剖面 · 三种环境共用', 'Open the material-budget section · all three settings'))}</summary><div class="minerals-stage" data-growth-scene></div></details></div>
      <details class="minerals-options" open><summary>${escape(w('改变形成条件', 'Change formation conditions'))}</summary><div class="minerals-control-grid">${slider('rate', w('变化速度：慢 → 很快', 'Change rate: slow → very fast'))}<div data-supply-control>${slider('supply', w('起始溶质供给：少 → 多', 'Initial solute supply: low → high'))}</div></div><p class="minerals-note">${escape(w('改动条件会暂停播放，保持进度来比较平行情景；不是给同一标本倒放温度历史。蒸发分支的水量随进度降低，热液分支的水量保持。画面每次都由当前阶段重新求值，拖回同一位置会得到同一结果。', 'Changing conditions pauses playback and keeps progress for a parallel comparison, not a reversed thermal history of one sample. Water decreases in the evaporation branch and stays fixed in the cooling-solution branch. Every view is evaluated from the current stage; returning to the same position gives the same result.'))}</p></details>
      <div class="minerals-budget" data-growth-budget></div>
    </div>
    <div data-panel="evidence" hidden>
      <div class="minerals-evidence-layout"><figure class="minerals-specimen"><div data-specimen-scene></div><figcaption data-specimen-caption></figcaption></figure><div class="minerals-observations"><h4>${escape(w('观察记录', 'Observation record'))}</h4><dl data-observations></dl></div></div>
      <div class="minerals-controls">${select('specimen', w('选择虚拟标本', 'Choose a virtual specimen'), SPECIMENS.map((id, i) => [id, `${String.fromCharCode(65 + i)} · ${w('标本', 'Specimen')}`]))}<button type="button" data-clear-evidence>${escape(w('收起全部线索', 'Hide all clues'))}</button></div>
      <fieldset class="minerals-tests"><legend>${escape(w('打开或收起证据', 'Reveal or hide evidence'))}</legend>${EVIDENCE.map(test => `<label><input type="checkbox" data-evidence="${test}"> ${escape(testName(test))}</label>`).join('')}</fieldset>
      <p class="minerals-result" data-evidence-result role="status"></p><ul class="minerals-candidates" data-candidates></ul>
      <p class="minerals-note">${escape(w('六个名字组成一个有限练习集；“相容”不是鉴定证明。看不到的平面不代表没有解理，未经处理的照片也不提供硬度和条痕。', 'Six names form a limited exercise set. “Compatible” is not proof of identification. Unseen planes do not establish absent cleavage, and an untreated photograph does not provide hardness or streak.'))}</p>
    </div>
    <div data-panel="resources" hidden>
      <div class="minerals-stage" data-resource-scene></div><p class="minerals-result" data-resource-result></p>
      <div class="minerals-control-grid">${slider('grade', w('品位：原料中目标金属质量 %', 'Grade: target metal in feed, mass %'), 0.1, 5, 0.1)}${slider('recovery', w('回收率：取回已有金属的 %', 'Recovery: % of feed metal retrieved'), 20, 95)}${slider('price', w('每千克金属价值（虚构代币）', 'Value per kg metal (fictional tokens)'), 2, 20)}${slider('cost', w('每吨原料总成本（虚构代币）', 'Total cost per tonne feed (fictional tokens)'), 20, 300)}</div>
      <div class="minerals-equation" data-resource-budget></div>
      <p class="minerals-note">${escape(w('品位的分母是原料质量；回收率的分母是原料里已有的目标金属。两者不能相加。剩余原料中仍有没取回的金属；这张理想分离账没有加入水、药剂和矿外废石。', 'Grade divides by feed mass; recovery divides by target metal already in the feed. They cannot be added. Remaining feed still contains unrecovered metal. This ideal separation excludes added water, reagents and off-feed waste rock.'))}</p>
      <details class="minerals-options"><summary>${escape(w('把常见矿物连到生活', 'Connect familiar minerals to daily life'))}</summary><div class="minerals-use-list">${MINERALS.map(m => `<article><h4>${escape(copy.minerals[m.id].name)} <small>${escape(m.formula)}</small></h4><p>${escape(copy.minerals[m.id].habitat)}</p><p>${escape(copy.minerals[m.id].use)}</p></article>`).join('')}</div></details>
    </div>
    <p class="minerals-prompt" data-prompt></p>
    <div class="minerals-deeper" data-deeper></div><p class="minerals-boundary" data-boundary></p>
    <nav class="minerals-connections" aria-label="${escape(w('继续探索地球', 'Continue exploring Earth'))}"><a data-earth-link="rocks" href="/topics/earth/?chapter=rocks">${escape(w('岩石：把矿物放回形成过程 →', 'Rocks: place minerals in their formation processes →'))}</a><a data-earth-link="history" href="/topics/earth/?chapter=history">${escape(w('历史：铁矿与氧气留下的证据 →', 'History: iron deposits and evidence of oxygen →'))}</a><a data-earth-link="systems" href="/topics/earth/?chapter=systems">${escape(w('系统：水怎样搬运地球的材料 →', 'Systems: how water carries Earth materials →'))}</a></nav>`;
  host.append(root);
  const find = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const text = (selector: string, value: string) => { const target=find(selector);if(target.textContent!==value)target.textContent = value; };
  const svg = (body: string, label: string, width = 340, height = 270) => `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(label)}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  function drawOccurrence() {
    const rock = '#b7a68d', crystalColor = '#a9c3c8';
    const crystal = (x: number, y: number, size: number, angle = 0) => `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${size})"><path d="M-8 0V-25L0-38 8-25V0Z" fill="${crystalColor}" stroke="#62838c" stroke-width="1.3"/><path d="M0-38V0M-8-25 0-19 8-25" stroke="#dfeeed" fill="none"/></g>`;
    let body = `<rect x="25" y="35" width="335" height="225" rx="13" fill="${rock}"/>`;
    if (state.occurrence === 'vein') {
      body += `<path d="M146 35c-12 43 25 70 6 105s5 82-12 120h98c15-45-13-63 4-99s-17-84 1-126Z" fill="#e9eeeb" stroke="#7d8c85" stroke-width="2"/>`;
      for (let i=0;i<5;i++) body += crystal(174+i*10,223,.45+i*.055);
      body += `<path d="m148 225 67 0-4 17-62 6Z" fill="${rock}" stroke="#8d7b64"/><path d="M58 70h72M265 92h66M48 182h83M264 211h69" stroke="#8d7b64" stroke-width="2"/><path d="m194 71 0 58m-5-9 5 9 5-9" stroke="#4c91a0" fill="none" stroke-width="2"/><circle cx="194" cy="226" r="24" fill="none" stroke="#b47c28" stroke-width="3"/><text x="195" y="252" text-anchor="middle" fill="#7f541b" font-size="14">A</text>`;
    } else if (state.occurrence === 'geode') {
      const cavity = { x: 193, y: 148, rx: 99, ry: 70 };
      body += `<ellipse cx="193" cy="148" rx="133" ry="99" fill="#8d8272"/><ellipse cx="193" cy="148" rx="115" ry="82" fill="#d5ccad"/><ellipse cx="${cavity.x}" cy="${cavity.y}" rx="${cavity.rx}" ry="${cavity.ry}" fill="#e9eeeb"/>`;
      for(const p of cavityLining(13,cavity.x,cavity.y,cavity.rx,cavity.ry)) body += crystal(p.x,p.y,.47,p.rotation);
    } else if (state.occurrence === 'pocket') {
      const grains = ['45,75 95,45 135,80 110,121 60,115','259,57 319,72 343,121 301,141 253,108','38,176 77,147 119,190 95,244 43,229','252,201 300,170 343,210 323,251 265,247'];
      grains.forEach((points,i)=>body+=`<polygon points="${points}" fill="${i%2?'#d2b4a0':'#c4c4ab'}" stroke="#8f8674" stroke-width="2"/>`);
      body += `<path d="m149 71 54-8 50 56-20 73-63 32-52-51 12-56Z" fill="#e9eeeb" stroke="#7d8c85" stroke-width="2"/>`;
      for(let i=0;i<5;i++)body+=crystal(154+i*12,198-i%2*9,.5+(i%3)*.14);
      body+=crystal(225,105,.42,165);
      body+=`<path d="m125 207 33-14 47 8 2 26-37 9-45-16Z" fill="${rock}"/>`;
    } else {
      const cells=['30,40 98,39 121,98 70,135 27,117','98,39 182,38 204,92 151,128 121,98','182,38 265,38 281,113 204,92','265,38 355,40 355,113 314,149 281,113','27,117 70,135 118,187 89,257 28,257','70,135 121,98 151,128 174,207 118,187','151,128 204,92 281,113 258,183 174,207','314,149 355,113 355,255 280,256 258,183','118,187 174,207 217,256 89,257','174,207 258,183 280,256 217,256'];
      cells.forEach((points,i)=>body+=`<polygon points="${points}" fill="${i===6?crystalColor:i%3===0?'#c4aaa0':i%3===1?'#c8c6b0':'#9d947e'}" stroke="#736f62" stroke-width="1.7"/>`);
    }
    const isVein=state.occurrence==='vein';
    if(isVein){
      body += `<path d="M376 152h36m-8-6 8 6-8 6" fill="none" stroke="#a77d3b" stroke-width="2"/>`;
      for(let i=0;i<5;i++)body+=crystal(461+i*13,222,.48+(i%3)*.16);
      body += `<path d="m441 226 68-8 35 19-24 12-77-4Z" fill="${rock}" stroke="#85745b"/><circle cx="490" cy="226" r="27" fill="none" stroke="#b47c28" stroke-width="3"/><text x="490" y="258" text-anchor="middle" fill="#7f541b" font-size="14">A</text><text x="487" y="73" text-anchor="middle" fill="#536a73" font-size="14">${escape(w('同一晶簇的局部', 'Same cluster, exposed'))}</text>`;
    } else {
      body += `<text x="390" y="108" fill="#536a73" font-size="13">${escape(w('不同代表情景', 'A different setting'))}</text><text x="390" y="142" fill="#536a73" font-size="13">${escape(w('不是3D标本的变身', 'Not a transformed 3D sample'))}</text>`;
    }
    body += `<text x="193" y="289" text-anchor="middle" fill="#536a73" font-size="14">${escape(copy.occurrences[state.occurrence].title)}</text>`;
    find('[data-occurrence-scene]').innerHTML = svg(body, w('岩体剖面比较：矿脉、晶洞、晶囊或相互接触的晶粒。A只把裂隙案例的同一晶簇连到3D。', 'Rock sections compare a vein, geode, pocket or interlocking grains. A links only the fracture case to the same cluster in 3D.'), 600, 305);
    text('[data-occurrence-copy]', copy.occurrences[state.occurrence].body);
    const natural = state.finish==='natural';
    const finishBody = `<rect x="20" y="15" width="247" height="155" rx="10" fill="${natural?'#eef4ed':'#f3f2eb'}" stroke="${natural?'#73927a':'#c9ccc2'}"/>${crystal(141,145,2.2)}<rect x="294" y="15" width="247" height="155" rx="10" fill="${natural?'#f3f2eb':'#f5efe3'}" stroke="${natural?'#c9ccc2':'#ad8241'}"/><path d="m356 73 38-21h46l39 21 10 31-70 52-72-52Z" fill="#bed2d6" stroke="#597983" stroke-width="2"/><path d="m356 73 40 25 44 0 39-25M394 52l2 46 23 58 21-58V52M347 104l49-6m44 0 49 6M356 73h123" fill="none" stroke="#f0f5ed" stroke-width="2"/>`;
    find('[data-finish-scene]').innerHTML = svg(finishBody,w('独立对照：左边天然柱面与尖端，右边切磨形成的规则刻面；不表示所有天然晶体或宝石都长这样。', 'Separate comparison: natural prism faces and termination on the left, cut facets on the right; these are not universal natural-crystal or gem shapes.'),560,185);
    text('[data-finish-copy]', natural
      ? w('天然晶面是在生长中形成的表面，可能留下横纹、台阶或生长痕迹；有平面不表示一定被人工打磨，也不能把所有平面都叫解理。', 'Natural crystal faces form during growth and may retain striations, steps or growth features. A flat face does not prove polishing, and not every flat face is cleavage.')
      : w('切开可以露出岩块内部的纹带或晶洞；切磨和抛光可按设计创造新表面与刻面，服务观察或宝石用途。这里画的是另一种处理对照，不能仅凭光亮或几何规则就判定未知标本的处理史。', 'Sawing may expose bands or a cavity inside rock. Cutting and polishing can create designed surfaces and facets for examination or gem use. This separate treatment comparison does not let shine or regularity alone establish an unknown specimen’s history.'));
  }
  function drawStructure() {
    const neighbors = [[170, 42], [74, 151], [266, 151], [170, 226]];
    let diamond = `<path d="M170 42 74 151 170 226 266 151Z M74 151H266" fill="none" stroke="#c4cacc" stroke-width="1.5" stroke-dasharray="4 5"/>`;
    for (const [i, [x, y]] of neighbors.entries()) {
      diamond += `<line x1="170" y1="127" x2="${x}" y2="${y}" stroke="#567f8a" stroke-width="7" ${i === 3 ? 'stroke-dasharray="7 4"' : ''}/><circle cx="${x}" cy="${y}" r="14" fill="#a0c0c9" stroke="#426a77" stroke-width="2"/>`;
    }
    diamond += `<circle cx="170" cy="127" r="19" fill="#43839b" stroke="#245968" stroke-width="2"/><text x="170" y="133" text-anchor="middle" fill="white" font-size="16">C</text><text x="35" y="30" fill="#536a73" font-size="13">${escape(w('一个碳 · 四个近邻', 'One carbon · four neighbors'))}</text>`;
    find('[data-diamond]').innerHTML = svg(diamond, w('钻石的一个四邻连接单元，虚线连接表示朝向纸面后方的键。', 'One diamond four-neighbor unit; the dashed bond points behind the drawing plane.'));
    let graphite = '';
    for (let layer = 0; layer < 3; layer++) {
      const edges = new Map<string, number[][]>(), atoms = new Map<string, number[]>();
      for (let q = 0; q < 4; q++) for (let row = 0; row < 2; row++) {
        const cx = 82 + q * 36 + graphiteOffset(state.shear, layer);
        const cy = 58 + layer * 65 + (row + q / 2) * 16.63;
        const vertices = Array.from({ length: 6 }, (_, k) => [cx + 24 * Math.cos(k * Math.PI / 3), cy + 9.6 * Math.sin(k * Math.PI / 3)]);
        for (let k = 0; k < 6; k++) {
          const a = vertices[k], b = vertices[(k + 1) % 6];
          const ak = a.map(x => n(x, 1)).join(','), bk = b.map(x => n(x, 1)).join(',');
          atoms.set(ak, a); edges.set([ak, bk].sort().join(':'), [a, b]);
        }
      }
      graphite += `<g opacity="${0.64 + layer * 0.16}">`;
      for (const [a, b] of edges.values()) graphite += `<line x1="${n(a[0], 2)}" y1="${n(a[1], 2)}" x2="${n(b[0], 2)}" y2="${n(b[1], 2)}" stroke="#53646b" stroke-width="3"/>`;
      for (const [x, y] of atoms.values()) graphite += `<circle cx="${n(x, 2)}" cy="${n(y, 2)}" r="3.3" fill="#344c57"/>`;
      graphite += `<text x="${260 + graphiteOffset(state.shear, layer)}" y="${80 + layer * 65}" font-size="13" fill="#344c57">${layer + 1}</text></g>`;
    }
    graphite += `<path d="M110 245h${50 + state.shear * 0.5}m-8-5 8 5-8 5" fill="none" stroke="#a46a27" stroke-width="3"/><text x="26" y="28" fill="#536a73" font-size="13">${escape(w('层号不变 · 层内连接不变', 'Same sheets · same bonds inside'))}</text>`;
    find('[data-graphite]').innerHTML = svg(graphite, w('石墨的三层六边形连接网；推移改变层的相对位置，不改变层内连接。', 'Three connected hexagonal graphite sheets; shifting changes relative sheet position without changing in-sheet bonds.'));
    text('[data-structure-result]', state.shear > 5 ? w('同样是碳，连接方式不同。石墨层发生相对滑动；钻石的四邻三维连接单元保持原样作比较。', 'The element stays carbon, but its connections differ. Graphite sheets slide relative to one another; the diamond four-neighbor unit stays unchanged for comparison.') : w('先找同一层中的六边形，再拖动。强连接用实线表示；钻石后方的一条键用虚线标出方向。', 'Find hexagons within one sheet, then drag. Solid lines show strong bonds; one dashed diamond bond indicates the rearward direction.'));
  }
  let growthNodes: { water: SVGRectElement; glass: SVGPathElement; markers: SVGCircleElement[]; grains: SVGGElement[]; arrows: SVGGElement; footer: SVGTextElement } | undefined;
  function prepareGrowthDiagram() {
    if (growthNodes) return growthNodes;
    const vertices = Array.from({ length: 6 }, (_, k) => [Math.cos(k * Math.PI / 3 + Math.PI / 6), Math.sin(k * Math.PI / 3 + Math.PI / 6)]);
    const body = `<path d="M55 30v255h450V30" fill="none" stroke="#6a7d7f" stroke-width="5"/><rect data-growth-water x="59" y="64" width="442" height="218" fill="#82b1bd" opacity=".3"/><path data-growth-glass fill="#465b65" opacity=".85"/>${Array.from({length:70},(_,i)=>`<circle data-material-id="${i}" r="2.5" fill="#397e94" opacity=".55"/>`).join('')}${Array.from({length:32},(_,i)=>`<g data-grain-id="${i}"><polygon points="${polygon(vertices)}" fill="#dfcc91" stroke="#8f742f" stroke-width=".05"/><path d="M0-1V1M-.86-.5 .86 .5" stroke="#fff4c8" stroke-width=".035" opacity=".6"/></g>`).join('')}<g data-evaporation-arrows><path d="M170 40v-26m-5 8 5-8 5 8M270 40v-26m-5 8 5-8 5 8M370 40v-26m-5 8 5-8 5 8" stroke="#397e94" fill="none" stroke-width="2"/></g><text data-growth-footer x="280" y="314" text-anchor="middle" font-size="14" fill="#536a73"></text>`;
    find('[data-growth-scene]').innerHTML = svg(body, w('成晶容器示意：点代表未进入晶体的材料，多面体代表晶粒，深色连续区域代表玻璃。', 'Crystallization chamber: dots represent material outside crystals, polygons grains, and a continuous dark region glass.'), 560, 335);
    find('[data-growth-budget]').innerHTML = `<p>${escape(w('材料预算 · 教学份额，不是实测质量', 'Material budget · teaching shares, not measured mass'))}</p><div class="minerals-bars">${['crystal','glass','fluid'].map((id,i)=>`<div data-budget-row="${id}"><span><span data-budget-label="${id}"></span> <strong data-budget-value="${id}"></strong></span><meter data-budget-meter="${id}" min="0" max="100" value="0" class="minerals-meter-${i}"></meter></div>`).join('')}</div><p data-budget-explanation></p>`;
    growthNodes = { water:find<SVGRectElement>('[data-growth-water]'),glass:find<SVGPathElement>('[data-growth-glass]'),markers:[...root.querySelectorAll<SVGCircleElement>('[data-material-id]')],grains:[...root.querySelectorAll<SVGGElement>('[data-grain-id]')],arrows:find<SVGGElement>('[data-evaporation-arrows]'),footer:find<SVGTextElement>('[data-growth-footer]') };
    return growthNodes;
  }
  function drawGrowth() {
    const g = growthAt(state), isMelt = state.environment === 'melt', nodes=prepareGrowthDiagram();
    const waterY = isMelt ? 64 : 64 + (1 - g.waterFraction) * 130;
    nodes.water.setAttribute('y',String(waterY));nodes.water.setAttribute('height',String(282-waterY));nodes.water.setAttribute('fill',isMelt?'#c37c51':'#82b1bd');nodes.water.setAttribute('opacity',String(isMelt?.6*g.fluid/100:.3));
    nodes.glass.style.display=g.glass>.1?'':'none';nodes.glass.setAttribute('d',`M59 282V${282-g.glass*1.5}Q170 ${260-g.glass} 280 ${278-g.glass}T501 ${282-g.glass*1.5}V282Z`);
    for(let i=0;i<nodes.markers.length;i++){
      const marker=nodes.markers[i];marker.style.display=i/70>=g.fluid/g.supplied?'none':'';
      marker.setAttribute('cx',String(75+(i*71%405)));marker.setAttribute('cy',String(waterY+12+((i*37)%180)/180*Math.max(0,257-waterY)));marker.setAttribute('fill',isMelt?'#965c36':'#397e94');
    }
    for(let i=0;i<nodes.grains.length;i++){
      const grain=nodes.grains[i];grain.style.display=i<g.count?'':'none';
      grain.setAttribute('transform',`translate(${93+(i*113%370)} ${108+(i*59%125)}) scale(${Math.max(.001,Math.min(42,g.size*6))})`);
    }
    nodes.arrows.style.display=state.environment==='evaporation'?'':'none';
    nodes.footer.textContent=isMelt?w('同一批材料 · 排好队或来不及','One batch · ordered or trapped as glass'):w('同一份溶质 · 容量改变后才可能析晶','One solute batch · changing capacity may allow crystals');
    const phrases = { waiting: w('还在开始阶段，晶体尚未长出。', 'At the beginning; crystals have not grown yet.'), growing: w('条件允许，一部分材料正在进入有序晶体。', 'Conditions allow some material to join ordered crystals.'), quenched: w('变化太快，大量材料来不及有序排列，留成玻璃。', 'Change is too fast: much material is trapped as glass before it can order.'), undersaturated: w('这时供给没有超过平衡容量，不出现净析晶。', 'Supply has not exceeded capacity here, so there is no net crystallization.') };
    text('[data-growth-result]',phrases[g.condition]);
    const ledger=isMelt?[[w('晶体份额','Crystal share'),g.crystal],[w('玻璃份额','Glass share'),g.glass],[w('熔体份额','Melt share'),g.fluid]] as const:[[w('起始供给','Initial supply'),g.supplied],[w('溶液当前容量','Current solution capacity'),g.capacity],[w('已析晶份额','Precipitated share'),g.crystal]] as const;
    ledger.forEach(([label,value],index)=>{text(`[data-growth-ledger-label="${index}"]`,label);text(`[data-growth-ledger-value="${index}"]`,n(value));});
    find('[data-supply-control]').toggleAttribute('hidden',isMelt);
    const labels={crystal:isMelt?w('晶体','Crystals'):w('进入晶体','In crystals'),glass:w('玻璃','Glass'),fluid:isMelt?w('未固结熔体','Remaining melt'):w('仍在溶液','In solution')};
    for(const id of ['crystal','glass','fluid'] as const){
      find<HTMLElement>(`[data-budget-row="${id}"]`).hidden=id==='glass'&&!isMelt;
      text(`[data-budget-label="${id}"]`,labels[id]);text(`[data-budget-value="${id}"]`,`${n(g[id])} / ${n(g.supplied)}`);
      const meter=find<HTMLMeterElement>(`[data-budget-meter="${id}"]`);meter.max=g.supplied;meter.value=g[id];meter.setAttribute('aria-label',labels[id]);
    }
    text('[data-budget-explanation]',isMelt?w('晶核较少时，每个晶粒可分到更多材料；极快冷却还会限制有序排列。','With fewer nuclei, each grain can receive more material; extreme quenching also limits ordering.'):`${w('供给量 / 当时平衡容量','Supply / current equilibrium capacity')}: ${n(g.supplied)} / ${n(g.capacity)} · ${w('水量保留','Water remaining')} ${n(g.waterFraction*100)}%`);
    const useQuartz=state.environment==='hydrothermal';
    if(useQuartz)scene?.updateGrowth(state);
    find<HTMLElement>('[data-growth-exhibit-slot]').hidden=!useQuartz;
    find<HTMLElement>('[data-growth-camera]').hidden=!useQuartz;
    text('[data-growth-scope]',useQuartz?w('同一母岩、同一根部A、同一组A–E代表晶体；晶面随预算中的析晶份额向外推进。五个主晶体不是预测晶核数，蓝点不是原子或真实流速。这里用石英的代表外形连接热液情景；通用容量模型不是石英溶解度或晶体形态计算。','The same matrix, root A and representative crystals A–E remain in place. Faces advance with the budget’s precipitated share. Five main crystals are not a predicted nucleus count, and blue marks are neither atoms nor a real flow speed. A representative quartz habit connects to this hydrothermal setting; the generic capacity budget is not a quartz-solubility or crystal-habit calculation.'):w('此分支用二维材料预算观察，不把熔体或蒸发的通用模型画成石英生长。多边形只代表晶粒；矿物种类和最终习性还取决于成分、压力与空间。切回热水溶液可追踪母岩上同一组3D晶体。','This branch uses the 2D material budget, without depicting a generic melt or evaporation case as quartz growth. Polygons represent grains; mineral species and final habit also depend on chemistry, pressure and space. Return to the hot-solution setting to trace the same 3D cluster on its matrix.'));
    for(const stop of root.querySelectorAll<HTMLButtonElement>('[data-growth-seek]'))stop.setAttribute('aria-pressed',String(Math.abs(Number(stop.dataset.growthSeek)-state.progress)<.05));
  }
  function property(test: Evidence, id = state.specimen): string {
    const m = mineralById(id);
    if (test === 'hardness') return `${m.hardness[0] === m.hardness[1] ? n(m.hardness[0]) : `${n(m.hardness[0])}–${n(m.hardness[1])}`} ${w('莫氏（相对顺序）', 'Mohs (relative rank)')}`;
    if (test === 'density') return `${n(m.density, 2)} g/cm³ ${w('典型值；比较带 ±0.16', 'typical; comparison band ±0.16')}`;
    if (test === 'streak') return ({ white: w('白色粉末', 'White powder'), dark: w('绿黑至棕黑色粉末', 'Green-black to brown-black powder'), red: w('红褐色粉末', 'Red-brown powder') })[m.streak];
    if (test === 'cleavage') return ({ none: w('无明显解理；可见断口', 'No obvious cleavage; fracture visible'), oblique: w('三组良好解理，非直角', 'Three good directions, not at right angles'), sheet: w('一组很完全的主解理；另有较弱方向', 'One very good main cleavage; other weaker directions'), cube: w('三组良好解理，近直角', 'Three good near-right-angle directions') })[m.cleavage];
    return ({ glassy: w('玻璃光泽', 'Glassy luster'), pearly: w('玻璃至珍珠光泽（所选面）', 'Glassy to pearly (selected face)'), metallic: w('金属光泽（所选典型）', 'Metallic (selected example)') })[m.luster];
  }
  function specimenSVG() {
    const m = mineralById(state.specimen), fill = m.color;
    let shape = '';
    if (state.specimen === 'quartz') shape = `<path d="M150 55 115 100v100l35 30 35-30V100Z" fill="${fill}"/><path d="m150 55 35 45-35 20-35-20M150 120v110" fill="none" stroke="#f2f9f8" stroke-width="2"/><path d="m115 100 35-45 35 45v100l-35 30-35-30Z" stroke="#5e8a99" fill="none" stroke-width="2"/>`;
    else if (state.specimen === 'calcite') shape = `<path d="m85 130 85-55 62 45-85 55Z" fill="${fill}" stroke="#a18a64" stroke-width="2"/><path d="m85 130 62 45v75l-62-45Z" fill="#c3ae83"/><path d="m147 175 85-55v75l-85 55Z" fill="#d5c49f" stroke="#a18a64" stroke-width="2"/>`;
    else if (state.specimen === 'halite' || state.specimen === 'pyrite') shape = `<path d="m90 105 80-40 60 40-80 40Z" fill="${fill}" stroke="#9a805d" stroke-width="2"/><path d="m90 105 60 40v95l-60-40Z" fill="${fill}" stroke="#9a805d" stroke-width="2"/><path d="m150 145 80-40v95l-80 40Z" fill="${fill}" filter="brightness(.8)" stroke="#9a805d" stroke-width="2"/>${state.specimen === 'pyrite' ? Array.from({ length: 6 }, (_, i) => `<path d="M${98 + i * 7} ${121 + i * 5}v58" stroke="#826d38" stroke-width="1.5"/>`).join('') : ''}`;
    else if (state.specimen === 'gypsum') shape = [0, 1, 2].map(i => `<path d="m${103 + i * 16} ${105 + i * 10} 65-40 26 29-65 115-26-30Z" fill="${fill}" opacity=".8" stroke="#9b9a7d" stroke-width="2"/>`).join('');
    else shape = `<path d="m65 172 22-48 46-29 43 4 43 35 14 60-26 29-100-7Z" fill="${fill}" stroke="#534744" stroke-width="2"/>${Array.from({ length: 8 }, (_, i) => `<path d="m${85 + i * 14} ${152 + (i % 3) * 11} 21-12 10 18-18 11Z" fill="${i % 2 ? '#998e82' : '#625a57'}"/>`).join('')}`;
    if (state.evidence.includes('streak')) shape += `<rect x="18" y="252" width="86" height="39" rx="4" fill="#f6f1df" stroke="#b2ae9c"/><path d="M32 272h53" stroke="${m.streak === 'red' ? '#a04c35' : m.streak === 'dark' ? '#454a3f' : '#ccc8b9'}" stroke-width="8"/><text x="116" y="278" font-size="12" fill="#536a73">${escape(w('虚拟粉末记录', 'Virtual powder record'))}</text>`;
    return svg(shape, w('虚拟标本的手绘形态，只作观察锚点，不是照片鉴定证据。', 'Hand-drawn virtual specimen: an observation anchor, not photographic identification evidence.'), 300, 310);
  }
  function drawEvidence() {
    const results = evidenceResult(state.specimen, state.evidence);
    const count = results.filter(r => !r.contradictions.length).length;
    find('[data-specimen-scene]').innerHTML = specimenSVG();
    text('[data-specimen-caption]', `${w('虚拟标本', 'Virtual specimen')} ${String.fromCharCode(65 + SPECIMENS.indexOf(state.specimen))} · ${w('形态与颜色为示意', 'shape and color are illustrative')}`);
    find('[data-observations]').innerHTML = EVIDENCE.map(test => `<div><dt>${escape(testName(test))}</dt><dd>${escape(state.evidence.includes(test) ? property(test) : w('尚未打开', 'Not revealed'))}</dd></div>`).join('');
    text('[data-evidence-result]', `${w('有限候选集里相容', 'Compatible within this limited set')}: ${count} / 6 · ${w('已用证据', 'Clues used')}: ${state.evidence.length} / 5`);
    find('[data-candidates]').innerHTML = results.map(({ mineral, contradictions }) => `<li data-compatible="${!contradictions.length}"><div><strong>${escape(copy.minerals[mineral.id].name)}</strong><small>${escape(mineral.formula)}</small></div><span>${escape(contradictions.length ? `${w('冲突', 'Conflict')}: ${contradictions.map(testName).join(' / ')}` : w('与已选证据相容', 'Compatible with revealed clues'))}</span></li>`).join('');
  }
  function drawResources() {
    const b = oreBudget(state);
    let body = `<path d="m35 58 125-25 100 30-23 91-164-5Z" fill="#c2b49b" stroke="#8c7b63" stroke-width="2"/>`;
    for (let i = 0; i < 30; i++) body += `<circle cx="${66 + i * 43 % 162}" cy="${66 + i * 31 % 65}" r="${state.grade * .7 + 1}" fill="#a46d2c"/>`;
    body += `<text x="145" y="184" text-anchor="middle" font-size="16" fill="#344c57">1 000 kg</text><text x="145" y="205" text-anchor="middle" font-size="13" fill="#536a73">${escape(w('处理原料', 'Treated feed'))}</text><path d="M275 103h52m-8-7 8 7-8 7" stroke="#66808a" stroke-width="3" fill="none"/><rect x="349" y="64" width="162" height="53" rx="7" fill="#d8ba75" stroke="#9c7b37"/><text x="430" y="96" text-anchor="middle" font-size="17" fill="#423923">${n(b.recovered, 2)} kg</text><text x="430" y="43" text-anchor="middle" font-size="13" fill="#536a73">${escape(w('取回目标金属', 'Target metal recovered'))}</text><rect x="349" y="150" width="162" height="53" rx="7" fill="#d9d6ca" stroke="#8f9188"/><text x="430" y="182" text-anchor="middle" font-size="17" fill="#344c57">${n(b.residue, 2)} kg</text><text x="430" y="226" text-anchor="middle" font-size="13" fill="#536a73">${escape(w('原料剩余部分', 'Remaining feed material'))}</text><path d="M303 103v73h31m-8-6 8 6-8 6" stroke="#66808a" stroke-width="2" fill="none"/>`;
    body += `<text x="280" y="265" text-anchor="middle" font-size="13" fill="#536a73">${escape(w('方框只标去向，大小不代表质量；斑点不按含量计数', 'Boxes show destinations, not mass scale; spots are not counted metal'))}</text>`;
    find('[data-resource-scene]').innerHTML = svg(body, w('一吨原料的理想分离质量账：取回金属与剩余原料合计仍为一吨。', 'Ideal separation from one tonne: recovered metal plus remaining feed still totals one tonne.'), 560, 286);
    text('[data-resource-result]', `${w('简化收支', 'Simplified balance')}: ${n(b.balance, 2)} ${w('代币 / 吨原料', 'tokens / tonne feed')} · ${b.balance > 0 ? w('此假设下收入高于成本；仍需环境、技术与许可证据。', 'Revenue exceeds cost under these assumptions; environmental, technical and permitting evidence is still needed.') : w('此假设下尚未覆盖成本；含金属不等于现在值得提取。', 'Revenue does not exceed cost under these assumptions; metal content alone does not establish economic extraction.')}`);
    find('[data-resource-budget]').innerHTML = `<p><strong>${escape(w('先算材料', 'First, the material'))}</strong> 1 000 kg × ${n(state.grade)}% × ${n(state.recovery)}% = ${n(b.recovered, 2)} kg</p><p><strong>${escape(w('再算收支', 'Then, the balance'))}</strong> ${n(b.recovered, 2)} kg × ${n(state.price)} − ${n(state.cost)} = ${n(b.balance, 2)} ${escape(w('代币', 'tokens'))}</p><p>${escape(w('原料里没取回的目标金属', 'Target metal left in the remaining feed'))}: ${n(b.unrecovered, 2)} kg</p>`;
  }
  function destroyScene() {
    ++sceneEpoch; sceneLoading = false; scene?.dispose(); scene = undefined;
    find('[data-three-host]').replaceChildren();
  }
  const needsScene = () => state.view==='structure'||(state.view==='growth'&&state.environment==='hydrothermal');
  function updateScene() {
    if(state.view==='growth'&&state.environment==='hydrothermal')scene?.updateGrowth(state);
    else if(state.view==='structure')scene?.update(state.representation,state.shear,state.exposure);
    else scene?.pause();
  }
  function ensureScene() {
    if (scene) { updateScene(); return; }
    if (sceneLoading || sceneFailed) return;
    sceneLoading = true;
    const ticket = ++sceneEpoch;
    text('[data-three-status]', w('正在准备可旋转的3D展品……', 'Preparing the rotatable 3D exhibit…'));
    find<HTMLElement>('[data-three-status]').hidden = false;
    const unavailable = () => {
      if (disposed || ticket !== sceneEpoch) return;
      sceneFailed = true;
      playback.pause();
      find<HTMLElement>('[data-three-retry]').hidden = false;
      text('[data-three-status]', w('此设备暂时不能显示3D，下面的二维连接图和全部观察仍可使用。', '3D is unavailable on this device. The 2D diagrams and all observations below remain available.'));
      find<HTMLElement>('[data-three-status]').hidden = false;
      find<HTMLDetailsElement>('[data-flat]').open = true;
      find<HTMLDetailsElement>('[data-growth-diagram]').open = true;
    };
    void import('./scene.ts').then(module => {
      if (disposed || ticket !== sceneEpoch || !needsScene()) return;
      scene = module.createMineralScene(find<HTMLElement>('[data-three-host]'), {
        label: w('可旋转的矿物展品；碳连接为结构示意，石英为自制宏观形态模型，无共同长度标尺。', 'Rotatable mineral exhibits: illustrative carbon bonds and an authored macroscopic quartz habit, without a shared length scale.'),
        camera: state.camera, representation: state.view==='growth'?'quartz':state.representation,
        onCamera(value) { if (!disposed && ticket === sceneEpoch) { state.camera = value; context.onStateChange(serializeState(state)); } },
        onUnavailable: unavailable,
      });
      updateScene();
      if (!sceneFailed) { find<HTMLElement>('[data-three-status]').hidden = true; find<HTMLDetailsElement>('[data-flat]').open = false; }
    }).catch(unavailable).finally(() => { if (ticket === sceneEpoch) sceneLoading = false; });
  }
  function render(emit = true) {
    if (disposed) return;
    root.dataset.view = state.view;
    text('[data-current-view]', viewName(state.view));
    for (const element of root.querySelectorAll<HTMLElement>('[data-panel]')) element.hidden = element.dataset.panel !== state.view;
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-view]')) button.setAttribute('aria-pressed', String(button.dataset.view === state.view));
    for (const input of root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-key]')) {
      input.value = String(state[input.dataset.key as keyof MineralState]);
      const output = root.querySelector<HTMLOutputElement>(`[data-output="${input.dataset.key}"]`);
      if (output) output.value = input.dataset.key==='progress'?`${n(state.progress)}%`:String(state[input.dataset.key as keyof MineralState]);
    }
    for (const input of root.querySelectorAll<HTMLInputElement>('[data-evidence]')) input.checked = state.evidence.includes(input.dataset.evidence as Evidence);
    const page = copy.views[state.view];
    text('[data-title]', state.view === 'structure' && state.representation === 'quartz' ? w('晶体的外形，留下哪些生长线索？', 'What growth clues remain in a crystal habit?') : page.title);
    text('[data-intro]', state.view === 'structure' && state.representation === 'quartz' ? w('这次换成宏观石英晶簇。寻找平坦柱面、尖端和细横纹；外形受内部结构与生长条件共同影响。这里只观察代表性形态，不能由它独自推出形成温度或矿物鉴定。', 'Switch to a macroscopic quartz cluster. Find prism faces, terminations and fine transverse lines: habit reflects both internal structure and growth conditions. This representative shape alone cannot establish a formation temperature or identify a real mineral.') : page.intro); text('[data-prompt]', state.view === 'structure' && state.representation === 'quartz' ? w('旋转晶簇，寻找柱面、尖端与横向生长纹。再切回碳的连接：外形观察与内部结构提供不同层次的线索。', 'Rotate the cluster to find prism faces, terminations and transverse growth lines. Then return to carbon bonds: external habit and internal structure provide different kinds of clues.') : page.prompt); text('[data-boundary]', state.view === 'structure' && state.representation === 'quartz' ? w('石英形态为程序自制，保留可辨认晶面和生长纹，但未按实物扫描、完整晶体面指数或真实尺寸重建。材质近似透光与反射，不计算双折射、光谱或多晶体精确光路。', 'Quartz habit is procedurally authored with recognizable facets and growth lines, without a scan, complete face-index reconstruction or measured size. Materials approximate transmission and reflections; they do not solve birefringence, spectra or exact light paths through multiple crystals.') : page.boundary);
    // Preserve open disclosure sections across slider input in the same room.
    if (find('[data-deeper]').getAttribute('data-room') !== state.view) {
      find('[data-deeper]').setAttribute('data-room', state.view);
      find('[data-deeper]').innerHTML = page.deeper.map(d => `<details><summary>${escape(d.title)}</summary><p>${escape(d.body)}</p></details>`).join('');
    }
    if (state.view === 'structure') {
      find('[data-structure-exhibit-slot]').append(find('[data-mineral-exhibit]'));
      find<HTMLElement>('[data-growth-overlay]').hidden=true;
      drawStructure(); ensureScene();
      find<HTMLElement>('[data-structure-result]').hidden = state.representation !== 'carbon';
      find<HTMLElement>('[data-carbon-controls]').hidden = state.representation !== 'carbon';
      find<HTMLElement>('[data-quartz-exposure]').hidden = state.representation !== 'quartz';
      find<HTMLElement>('[data-quartz-context]').hidden = state.representation !== 'quartz';
      if (state.representation === 'quartz') drawOccurrence();
      text('[data-three-caption]', state.representation === 'carbon'
        ? w('左：钻石的立方晶格片段，金色标出一个碳及其四条键；右：石墨的三个蜂巢层。边缘切断了继续向外的连接；原子球和键粗细夸大，颜色为编码。不是宏观标本，也不是电子云或变形求解。', 'Left: a cubic diamond lattice fragment, with one carbon and its four bonds highlighted. Right: three graphite honeycomb sheets. Boundary bonds are truncated; spheres and bond widths are enlarged and colors are codes. These are not macroscopic specimens, electron clouds or deformation calculations.')
        : w('宏观石英晶簇：自制晶面、细生长纹、内部薄雾与基质表现形态。它不是碳结构的放大图、实物扫描或鉴定证据；晶簇比例、光学与包裹体为代表性创作，不提供真实长度或成分测量。', 'Macroscopic quartz cluster: authored facets, fine growth striations, internal veils and matrix convey habit. This is neither an enlargement of carbon structure nor a scan or identification record. Cluster proportions, optics and inclusions are representative artwork, without a measured length or assay.'));
    } else if (state.view!=='growth'&&(scene || sceneLoading)) destroyScene();
    if (state.view === 'growth') {
      find('[data-growth-exhibit-slot]').append(find('[data-mineral-exhibit]'));
      find<HTMLElement>('[data-growth-overlay]').hidden=false;
      text('[data-three-caption]',w('晶面、横纹和内部薄雾是程序自制的代表形态，非实物扫描。生长只改变固定根部之上的形态；围岩不消失。进度可以回退作比较，真实晶体不会因此自动缩回。','Facets, striations and internal veils are authored representative shapes, not a specimen scan. Growth changes habit above fixed roots; host rock remains. Progress can be reversed for comparison; real crystals do not automatically shrink back.'));
      if(needsScene())ensureScene();else scene?.pause();
      const diagram=find<HTMLDetailsElement>('[data-growth-diagram]');
      if(diagram.dataset.environment!==state.environment){diagram.dataset.environment=state.environment;diagram.open=state.environment!=='hydrothermal'||sceneFailed;}
      drawGrowth();
    }
    if (state.view === 'evidence') drawEvidence();
    if (state.view === 'resources') drawResources();
    for (const anchor of root.querySelectorAll<HTMLAnchorElement>('[data-earth-link]')) {
      const route = readEarthRoute(location.search);
      route.chapter = anchor.dataset.earthLink as Chapter;
      route.states.minerals = serializeState(state);
      const url = new URL(location.href);
      url.pathname = new URL(languageHref('/topics/earth/'), location.href).pathname;
      if (context.language === 'en') url.searchParams.set('lang', 'en');
      anchor.href = earthRouteURL(url.href, route).href;
    }
    if (emit) context.onStateChange(serializeState(state));
  }
  function playbackControls() {
    const playing=playback.isPlaying(),complete=state.progress>=100;
    const toggle=find<HTMLButtonElement>('[data-playback-toggle]');
    toggle.setAttribute('aria-pressed',String(playing));toggle.textContent=playing?w('暂停','Pause'):complete?w('再播放一次','Replay growth'):w('播放生长','Play growth');
    const stepped=root.dataset.playbackMotion==='stepped';
    text('[data-playback-status]',playing?(stepped?w('分步播放中；可暂停或用上一步、下一步查看。','Playing in steps; pause or inspect with Previous and Next.'):w('正在播放；可随时暂停、拖动或旋转观察。','Playing; pause, scrub or rotate at any time.')):complete?w('已到教学终点，播放已停止；可回退比较。','Teaching endpoint reached; playback stopped. Step back to compare.'):w('已暂停；按播放开始，也可拖动或逐步查看。','Paused. Press Play, scrub, or inspect one step at a time.'));
  }
  const playback=createFinitePlayback({
    element:root,id:'mineral-growth',durationMs:18000,frameIntervalMs:1000/24,reducedMotionSteps:12,
    visibilityTarget:find('[data-growth-viewport]'),readProgress:()=>state.progress/100,
    writeProgress(fraction){
      if(disposed)return;
      state.progress=Math.round(fraction*10000)/100;
      find<HTMLInputElement>('[data-key="progress"]').value=String(state.progress);
      find<HTMLOutputElement>('[data-output="progress"]').value=`${n(state.progress)}%`;
      drawGrowth();context.onStateChange(serializeState(state));
    },
    onPlayingChange(playing){
      if(disposed)return;
      playbackControls();
      if(!playing){render(false);context.onStateChange(serializeState(state));}
    },
  });
  root.addEventListener('click', event => {
    if (disposed || !(event.target instanceof Element)) return;
    const view = event.target.closest<HTMLButtonElement>('button[data-view]')?.dataset.view as View | undefined;
    if (view && VIEWS.includes(view)) {
      playback.pause();
      state.view = view; render(); find<HTMLDetailsElement>('.minerals-map').open = false;
      find<HTMLElement>('[data-title]').focus({ preventScroll: true }); return;
    }
    if (event.target.closest('[data-three-retry]')) { location.reload(); return; }
    if (event.target.closest('[data-natural-location]')) { state.exposure = 0; render(); }
    if (event.target.closest('[data-display-location]')) { state.exposure = 100; render(); }
    if (event.target.closest('[data-camera-reset]')) scene?.resetCamera();
    if (event.target.closest('[data-growth-camera]')) scene?.resetCamera();
    if (event.target.closest('[data-playback-toggle]')) { playback.toggle();return; }
    if (event.target.closest('[data-playback-reset]')) { playback.reset();render(false);playbackControls();return; }
    if (event.target.closest('[data-growth-back]')) { playback.setProgress((state.progress-10)/100);render(false);playbackControls();return; }
    if (event.target.closest('[data-growth-next]')) { playback.setProgress((state.progress+10)/100);render(false);playbackControls();return; }
    const seek=event.target.closest<HTMLButtonElement>('[data-growth-seek]');
    if(seek){playback.setProgress(Number(seek.dataset.growthSeek)/100);render(false);playbackControls();return;}
    const reset = event.target.closest<HTMLButtonElement>('[data-reset]')?.dataset.reset;
    if (reset === 'shear' || reset === 'progress') { state[reset] = 0; render(); }
    if (event.target.closest('[data-end]')) { playback.setProgress(1);render(false);playbackControls();return; }
    if (event.target.closest('[data-clear-evidence]')) { state.evidence = []; render(); }
  }, { signal: events.signal });
  root.addEventListener('input', event => {
    if (disposed || !(event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement)) return;
    const input = event.target;
    const value=input.value;
    if (input.dataset.evidence) {
      const key = input.dataset.evidence as Evidence;
      if (EVIDENCE.includes(key)) state.evidence = EVIDENCE.filter(test => test === key ? (input as HTMLInputElement).checked : state.evidence.includes(test));
    } else if (input.dataset.key) {
      playback.pause();
      state = parseState({ ...serializeState(state), [input.dataset.key]: value });
    } else return;
    render();playback.sync();playbackControls();
  }, { signal: events.signal });
  for (const anchor of root.querySelectorAll<HTMLAnchorElement>('[data-earth-link]')) {
    const url = new URL(anchor.getAttribute('href')!, location.href);
    if (context.language === 'en') url.searchParams.set('lang', 'en');
    anchor.href = url.pathname + url.search;
  }
  render();playback.sync();playbackControls();
  return {
    pause() { playback.pause();scene?.pause(); },
    dispose() { if (disposed) return;playback.dispose();disposed = true; events.abort(); destroyScene(); root.remove(); },
  };
}
