import { t } from '../i18n.ts';
import { language, languageHref } from '../../../src/platform/i18n.ts';
import content from '../scaleContent.json';
const copy = language === 'en' ? content.en : content.zh;
import { createCanvas } from '../types.ts';
import type { ChapterDefinition, ChapterState, ViewOptions } from '../types.ts';
import { AU_KM, SCALE_HOLES, SCALE_STOPS, horizonRadiusKm, worldRadiusKm, scaleStage, niceScale, comparisonGeometry, COMPARISON_REFERENCES, LIGHT_YEAR_KM, DISK_INNER_HORIZON_RADII, DISK_OUTER_HORIZON_RADII, OBSERVATION_EXAMPLES, horizonMicroarcseconds } from '../scaleModel.ts';

const labels = [t('恒星级 · 10 个太阳质量'), t('人马座 A* · 银河系中心'), t('M87* · 更大的巨兽')];
const titles = [t('质量是太阳的 10 倍，视界直径约 59 千米'), t('银河系中心：约 400 万个太阳质量'), t('M87*：约 65 亿个太阳质量')];
const bodies = [
  t('这是一个假想的恒星级黑洞。把标尺拉远，它很快就小到看不清了。不是黑洞消失了，而是我们正在看更大的范围。'),
  t('我们银河系的中心有一个超大质量黑洞，叫人马座 A*。它的质量约是太阳的 400 万倍，但它的视界仍比水星轨道小很多。太阳大小的圆在这里已经很小了。'),
  t('M87 星系中心的黑洞还要巨大得多。用同一把尺子比较，它的视界半径可以超过海王星轨道半径。这并不是说太阳系真的在它里面。'),
];
const science = [
  t('以 10 M☉ 的假想无自旋黑洞为起点，rₛ = 2GM/c² 给出约 29.5 km 的视界半径。该长度是几何半径，不是吸积盘大小，也不是光像中的阴影半径。'),
  t('采用约 400 万 M☉ 的取整质量，无自旋等效视界半径约为 1180 万 km（0.079 AU）。真实自旋会改变视界几何；此处统一用史瓦西半径作质量—长度比较，不拟合人马座 A* 的实测图像。'),
  t('采用约 65 亿 M☉ 的取整质量，无自旋等效视界半径约为 192 亿 km（128 AU），约是海王星轨道半径的 4.3 倍。M87* 比人马座 A* 更远，因此物理尺寸大，并不意味着在地球天空中的角尺寸更大。'),
];
const length = (km: number) => km >= LIGHT_YEAR_KM ? `${(km / LIGHT_YEAR_KM).toLocaleString('en-US', { maximumSignificantDigits: 3 })} ly` : km >= AU_KM ? `${(km / AU_KM).toFixed(km / AU_KM < 10 ? 2 : 0)} AU` : `${km.toLocaleString('en-US', { maximumSignificantDigits: 3 })} km`;

class ScaleScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private observer: ResizeObserver;
  private width = 1;
  private height = 1;
  private lastKey = '';
  private comparison = document.createElement('section');
  private compareCanvas = document.createElement('canvas');
  private compareContext: CanvasRenderingContext2D;
  private captions = [document.createElement('p'), document.createElement('p')];
  private ratio = document.createElement('p');
  private comparisonKey = '';
  private qualifications = document.createElement('details');
  private disposed = false;
  private referenceSelect = document.createElement('select');
  private diskToggle = document.createElement('input');
  private boundary = document.createElement('p');
  private referenceNote = document.createElement('p');
  private markerNote = document.createElement('p');
  private questions = document.createElement('section');
  constructor(private host: HTMLElement, private state: ChapterState) {
    this.canvas = createCanvas(host);
    this.canvas.setAttribute('aria-label', t('黑洞视界与太阳系尺度比较；长度与模型说明见画面外'));
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');
    this.ctx = ctx;
    this.comparison.className = 'hole-comparison';
    const heading = document.createElement('h3'); heading.textContent = t('把熟悉的东西放在旁边');
    const description = document.createElement('p'); description.className = 'comparison-boundary';
    description.textContent = copy.ruler;
    const controls = document.createElement('div'); controls.className = 'comparison-controls';
    const label = document.createElement('label'); label.textContent = copy.reference;
    this.referenceSelect.setAttribute('aria-label', copy.reference);
    for (const reference of [{ id: '', spanKm: 0 }, ...COMPARISON_REFERENCES]) {
      const option = document.createElement('option'); option.value = reference.id;
      option.textContent = reference.id ? copy.names[reference.id as keyof typeof copy.names] : copy.auto;
      this.referenceSelect.append(option);
    }
    this.referenceSelect.value = state.scenario;
    this.referenceSelect.addEventListener('change', () => { state.scenario = this.referenceSelect.value; });
    label.append(this.referenceSelect);
    const diskLabel = document.createElement('label');
    this.diskToggle.type = 'checkbox'; this.diskToggle.checked = state.part === 'disk';
    this.diskToggle.addEventListener('change', () => { state.part = this.diskToggle.checked ? 'disk' : ''; });
    diskLabel.append(this.diskToggle, document.createTextNode(copy.disk));
    controls.append(label, diskLabel);
    this.boundary.className = 'comparison-boundary'; this.markerNote.className = 'comparison-boundary';
    this.referenceNote.className = 'comparison-boundary reference-note';
    this.compareCanvas.setAttribute('role', 'img');
    this.compareContext = this.compareCanvas.getContext('2d')!;
    const captions = document.createElement('div'); captions.className = 'comparison-captions'; captions.append(...this.captions);
    this.ratio.className = 'comparison-ratio';
    this.qualifications.className = 'comparison-qualifications';
    const summary = document.createElement('summary'); summary.textContent = t('图示与真实尺度');
    this.qualifications.append(summary, this.boundary, this.referenceNote);
    this.comparison.append(heading, description, controls, this.compareCanvas, captions, this.ratio, this.markerNote, this.qualifications);
    const related = document.createElement('a'); related.textContent = copy.cosmicLink;
    related.href = languageHref('/topics/cosmic-scale/?mode=compare&pair=3');
    related.className = 'comparison-related'; this.qualifications.append(related);
    this.mountQuestions();
    host.parentElement!.before(this.comparison);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host); this.resize();
  }
  private resize() {
    if (this.disposed) return;
    this.width = this.host.clientWidth; this.height = this.host.clientHeight;
    const dpr = Math.min(devicePixelRatio, 2);
    this.canvas.width = Math.round(this.width * dpr); this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); this.lastKey = ''; this.comparisonKey = '';
  }
  draw(state: ChapterState, options: ViewOptions) {
    if (this.disposed) return;
    this.drawComparison(scaleStage(state.progress));
    if (this.width <= 0 || this.height <= 0) return;
    const key = `${state.progress}:${options.annotations}:${options.guides}`;
    if (key === this.lastKey) return; this.lastKey = key;
    const c = this.ctx, w = this.width, h = this.height;
    const center = { x: w / 2, y: h / 2 - 8 };
    const pxPerKm = Math.min(w, h) * .44 / worldRadiusKm(state.progress);
    c.fillStyle = '#050a14'; c.fillRect(0, 0, w, h);
    const glow = c.createRadialGradient(center.x, center.y, 0, center.x, center.y, Math.min(w, h) * .55);
    glow.addColorStop(0, '#152538'); glow.addColorStop(1, '#050a14'); c.fillStyle = glow; c.fillRect(0, 0, w, h);
    c.font = '12px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const circle = (r: number, color: string, dash: number[] = []) => {
      c.beginPath(); c.arc(center.x, center.y, r, 0, Math.PI * 2); c.strokeStyle = color; c.setLineDash(dash); c.stroke(); c.setLineDash([]);
    };
    // Concentric overlays are a ruler comparison, never a model of co-located objects.
    for (let index = SCALE_HOLES.length - 1; index >= 0; index--) {
      const item = SCALE_HOLES[index], r = horizonRadiusKm(item.mass) * pxPerKm;
      if (r > Math.hypot(w, h) || r < .15) continue;
      c.lineWidth = 1.5;
      c.beginPath(); c.arc(center.x, center.y, r, 0, Math.PI * 2); c.fillStyle = '#010308'; c.fill();
      c.shadowColor = item.color; c.shadowBlur = 12; circle(r, item.color); c.shadowBlur = 0;
      if (options.annotations && r >= 18 && r < Math.min(w, h) * .37) {
        c.fillStyle = item.color; c.fillText(labels[index].split(' · ')[0], center.x, center.y - r - 18);
      }
    }
    let visibleReference = false;
    if (options.guides) {
      const guides = [
        { radius: 6371, label: t('地球半径'), color: '#80b7db', dash: [] },
        { radius: 695_700, label: t('太阳半径'), color: '#f5d591', dash: [] },
        { radius: .387 * AU_KM, label: t('水星轨道半径'), color: '#7baab6', dash: [4, 5] },
        { radius: 30.07 * AU_KM, label: t('海王星轨道半径'), color: '#81a9ed', dash: [4, 5] },
      ];
      let labelY = center.y + 18;
      for (const guide of guides) {
        const r = guide.radius * pxPerKm;
        if (r < .5 || r > Math.min(w, h) * .4) continue;
        visibleReference = true;
        c.lineWidth = 1; circle(r, guide.color, guide.dash);
        if (options.annotations) {
          const y = Math.max(labelY + 18, center.y + r + 17); labelY = y;
          c.fillStyle = guide.color; c.fillText(guide.label, center.x, y);
        }
      }
    }
    // A subpixel object is indicated by a cross, never inflated into a fake disk.
    if (options.annotations && state.progress > .12 && !visibleReference) {
      c.strokeStyle = '#8bddde88'; c.lineWidth = 1; c.beginPath();
      c.moveTo(center.x - 3, center.y); c.lineTo(center.x + 3, center.y);
      c.moveTo(center.x, center.y - 3); c.lineTo(center.x, center.y + 3); c.stroke();
    }
    const rulerKm = niceScale(Math.min(130, w * .3) / pxPerKm), bar = rulerKm * pxPerKm;
    c.strokeStyle = '#bac9d5'; c.lineWidth = 1; c.beginPath();
    c.moveTo(24, h - 32); c.lineTo(24 + bar, h - 32); c.moveTo(24, h - 36); c.lineTo(24, h - 28); c.moveTo(24 + bar, h - 36); c.lineTo(24 + bar, h - 28); c.stroke();
    c.textAlign = 'left'; c.fillStyle = '#bac9d5'; c.fillText(length(rulerKm), 24, h - 49);
    if (options.annotations) { c.textAlign = 'right'; c.fillStyle = '#879aaa'; c.font = `${w < 450 ? 10 : 11}px system-ui`; c.fillText(t('同心叠放 · 只比较大小'), w - 20, 25); }
  }
  private drawComparison(index: number) {
    const w = this.compareCanvas.clientWidth, h = this.compareCanvas.clientHeight;
    if (w <= 0 || h <= 0) return;
    const withDisk = this.state.part === 'disk';
    const key = `${index}:${w}:${h}:${devicePixelRatio}:${this.state.scenario}:${withDisk}`;
    if (key === this.comparisonKey) return; this.comparisonKey = key;
    const dpr = Math.min(devicePixelRatio, 2);
    this.compareCanvas.width = Math.round(w * dpr); this.compareCanvas.height = h * dpr;
    const c = this.compareContext; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    const model = comparisonGeometry(index, w, this.state.scenario, withDisk, h);
    const left = w * .25, right = w * .75, y = (h - 25) / 2, span = model.referencePixels;
    const ref = model.reference.id;
    const marker = (x: number) => {
      c.strokeStyle = '#d5e7f1'; c.lineWidth = 1; c.setLineDash([]); c.beginPath();
      c.moveTo(x - 5, y); c.lineTo(x + 5, y); c.moveTo(x, y - 5); c.lineTo(x, y + 5); c.stroke();
    };
    const disk = (x: number, r: number, color: string, black = false) => {
      if (r * 2 < 1) { marker(x); return; }
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, black ? '#02040a' : color); g.addColorStop(.7, black ? '#02040a' : color);
      g.addColorStop(1, black ? '#02040a' : '#172431');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      if (black) { c.strokeStyle = color; c.lineWidth = 1.5; c.stroke(); }
    };
    const dimension = (x: number, size: number, color: string) => {
      if (size < 1) return;
      c.strokeStyle = color; c.lineWidth = 1; c.beginPath();
      c.moveTo(x-size/2,h-16); c.lineTo(x+size/2,h-16);
      for (const end of [-1,1]) { c.moveTo(x+end*size/2,h-20); c.lineTo(x+end*size/2,h-12); } c.stroke();
    };
    const holeR = model.holePixels / 2;
    if (withDisk && holeR * DISK_OUTER_HORIZON_RADII >= .5) {
      // Physical face-on geometry, deliberately no lensing or optical-shadow claim.
      const inner = holeR * DISK_INNER_HORIZON_RADII, outer = holeR * DISK_OUTER_HORIZON_RADII;
      const glow = c.createRadialGradient(left,y,inner,left,y,outer);
      glow.addColorStop(0,'#ffe4ac'); glow.addColorStop(.32,'#cf965e'); glow.addColorStop(1,'#6d432744');
      c.fillStyle = glow; c.beginPath(); c.arc(left,y,outer,0,Math.PI*2); c.arc(left,y,inner,0,Math.PI*2,true); c.fill();
    }
    disk(left,holeR,model.hole.color,true); dimension(left,model.holePixels,model.hole.color);
    if (span < 1) marker(right);
    else if (ref === 'journey') {
      c.fillStyle = '#243a44'; c.fillRect(right-span/2,y-8,span,16);
      c.strokeStyle = '#cee3e6'; c.setLineDash([5,4]); c.beginPath(); c.moveTo(right-span/2,y); c.lineTo(right+span/2,y); c.stroke(); c.setLineDash([]);
    } else if (ref === 'neptune-orbit') {
      c.strokeStyle = '#8facdf'; c.lineWidth = 1;
      for (const orbit of [1,5.203,9.537,19.191,30.07]) { c.beginPath(); c.arc(right,y,span/2*orbit/30.07,0,Math.PI*2); c.stroke(); }
      marker(right); // Sun's position, not its physical diameter.
    } else if (ref === 'milky-way') {
      // Diffuse face-on stellar disk: no solid surface and no inflated central hole.
      const radius = span/2, haze = c.createRadialGradient(right,y,0,right,y,radius);
      haze.addColorStop(0,'#f7d2a2aa'); haze.addColorStop(.15,'#d8bb9966'); haze.addColorStop(.7,'#9fb9db22'); haze.addColorStop(1,'#9fb9db00');
      c.fillStyle = haze; c.fillRect(right-radius,y-radius,span,span);
      for (let n=0;n<450;n++) {
        const q=(n+.5)/450, r=radius*Math.sqrt(q), a=n*2.39996323;
        const arms=.5+.5*Math.cos(a*3-r/radius*15);
        c.fillStyle=`rgba(185,207,231,${(.15+.65*arms)*(1-q)})`;
        c.beginPath(); c.arc(right+Math.cos(a)*r,y+Math.sin(a)*r,.7,0,Math.PI*2); c.fill();
      }
    } else {
      const colors: Record<string,string> = {earth:'#6cabd6',jupiter:'#cfac8b',sun:'#ffe29c',arcturus:'#efbf83',antares:'#ed9170'};
      disk(right,span/2,colors[ref] ?? '#ffe29c');
      if (span > 8) {
        c.save(); c.beginPath(); c.arc(right,y,span/2,0,Math.PI*2); c.clip();
        // Stable low-contrast surface marks are illustrations, not mapped measurements.
        for (let n=0;n<90;n++) {
          const r=span*.48*Math.sqrt((n+.5)/90), a=n*2.39996323;
          c.fillStyle=ref==='earth'?'#789b724a':'#49342018'; c.beginPath();
          c.ellipse(right+Math.cos(a)*r,y+Math.sin(a)*r,span*.026,span*.013,0,0,Math.PI*2); c.fill();
        } c.restore();
      }
    }
    dimension(right,span,'#b9d4d9');
    const referenceName = copy.names[ref as keyof typeof copy.names];
    this.captions[0].textContent = t('{{name}} · 视界直径 {{diameter}}', {name:labels[index].split(' · ')[0],diameter:length(model.diameterKm)});
    this.captions[1].textContent = t('{{name}} · {{length}}', {name:referenceName,length:length(model.reference.spanKm)});
    const inverse = model.ratio < 1;
    const ratio = (inverse ? 1/model.ratio : model.ratio).toLocaleString('en-US',{maximumSignificantDigits:3});
    this.ratio.textContent = inverse
      ? t('参照跨度约是视界直径的 {{ratio}} 倍。比较长度，不比较质量。',{ratio})
      : t('视界直径约是参照跨度的 {{ratio}} 倍。比较长度，不比较质量。',{ratio});
    this.markerNote.textContent = model.holePixels < 1 || span < 1 || ref === 'neptune-orbit' ? copy.subpixel : '';
    this.markerNote.hidden = !this.markerNote.textContent;
    this.boundary.textContent = (withDisk ? copy.diskNote : copy.geometryNote) + ' ' + (ref === 'milky-way' ? copy.galaxyNote : '');
    this.referenceNote.textContent = ref === 'journey' || ref === 'neptune-orbit' || ref === 'milky-way' ? '' : copy.bodyNote;
    this.referenceNote.hidden = !this.referenceNote.textContent;
    this.compareCanvas.setAttribute('aria-label', `${this.captions[0].textContent}. ${this.captions[1].textContent}. ${this.ratio.textContent} ${this.markerNote.textContent}`);
  }
  private mountQuestions() {
    this.questions.className = 'scale-questions';
    const heading = document.createElement('h2'); heading.textContent = copy.questionsTitle;
    const distance = document.createElement('details'), summary = document.createElement('summary'); summary.textContent = copy.distanceTitle;
    const intro = document.createElement('p'); intro.textContent = copy.distanceIntro;
    const table = document.createElement('table'), caption = document.createElement('caption'); caption.textContent = copy.distanceTitle;
    table.append(caption);
    const head = document.createElement('thead'), row = document.createElement('tr');
    for (const title of copy.distanceHeaders) { const cell = document.createElement('th'); cell.scope='col'; cell.textContent=title; row.append(cell); }
    head.append(row); table.append(head);
    const body = document.createElement('tbody');
    for (const [index, example] of OBSERVATION_EXAMPLES.entries()) {
      const authored = copy.distanceRows[index];
      const values = [authored[0], `${example.distanceLightYears.toLocaleString('en-US')} ly`, `${(2 * horizonRadiusKm(example.mass)).toLocaleString('en-US', { maximumSignificantDigits: 3 })} km`, authored[1]];
      const row=document.createElement('tr');
      values.forEach((value,index)=> { const cell=document.createElement(index===0?'th':'td'); if(index===0)cell.setAttribute('scope','row'); cell.textContent=value; row.append(cell); });
      body.append(row);
    }
    table.append(body);
    const wrap=document.createElement('div'); wrap.className='distance-table'; wrap.tabIndex=0; wrap.setAttribute('role','region'); wrap.setAttribute('aria-label',copy.distanceTitle); wrap.append(table);
    const angular=document.createElement('p'); angular.textContent=copy.angular
      .replace('{{sagittarius}}', Math.round(horizonMicroarcseconds(OBSERVATION_EXAMPLES[1].mass, OBSERVATION_EXAMPLES[1].distanceLightYears)).toString())
      .replace('{{m87}}', Math.round(horizonMicroarcseconds(OBSERVATION_EXAMPLES[2].mass, OBSERVATION_EXAMPLES[2].distanceLightYears)).toString());
    const source=document.createElement('a'); source.textContent=copy.distanceSource; source.href='https://www.eso.org/public/news/eso2208-eht-mw/';
    const m87Source = document.createElement('a'); m87Source.textContent = 'ESO / EHT · M87* (2019)'; m87Source.href = 'https://www.eso.org/public/news/eso1907/'; m87Source.className = 'question-action';
    distance.append(summary,intro,wrap,angular,source,m87Source); this.questions.append(heading,distance);
    for (const item of copy.questions) {
      const details=document.createElement('details'), summary=document.createElement('summary'), text=document.createElement('p'), source=document.createElement('a');
      summary.textContent=item.title; text.textContent=item.text; source.textContent=item.source; source.href=item.url;
      details.append(summary,text,source);
      if(item.href && item.action) { const action=document.createElement('a'); action.className='question-action'; action.href=languageHref(item.href); action.textContent=item.action; details.append(action); }
      this.questions.append(details);
    }
    const diskSource=document.createElement('a'); diskSource.textContent=copy.diskSource; diskSource.href='https://science.nasa.gov/universe/black-holes/anatomy/'; this.questions.append(diskSource);
    this.host.closest('#black-hole-workspace')!.after(this.questions);
  }
  status() { return 'ready' as const; }
  readout(state: ChapterState) {
    const item = SCALE_HOLES[scaleStage(state.progress)];
    return t('当前参照：{{name}} · 等效视界直径约 {{diameter}}', { name: labels[scaleStage(state.progress)], diameter: length(horizonRadiusKm(item.mass) * 2) });
  }
  retry() {}
  dispose() { this.disposed = true; this.observer.disconnect(); this.comparison.remove(); this.questions.remove(); this.host.replaceChildren(); }
}

export const chapter: ChapterDefinition = {
  title: t('黑洞有多大'), intro: t('拉远同一把尺子：从恒星级黑洞，到银河系中心，再到 M87*。'),
  scale: t('实线为无自旋等效视界，不是阴影或发光盘。圆形同心叠放用于尺寸比较；参考轨道并非真的围绕这些黑洞。'),
  learningId: 'black-holes', choices: [], duration: () => 36,
  steps: () => labels.map((label, i) => ({ label, progress: SCALE_STOPS[i] })),
  describe(state, academic) {
    const index = scaleStage(state.progress);
    return { title: titles[index], body: academic ? science[index] : bodies[index],
      prompt: t('拖动进度，观察标尺怎样变大。点下方三个停靠点，比较每个黑洞与熟悉的尺度。'),
      formula: 'rₛ = 2GM/c² ≈ 2.95 km × (M/M☉)',
      terms: t('M☉ 是太阳质量；AU 是日地平均距离，约 1.50 亿 km。视界半径在这个模型中与质量成正比。'),
      caution: t('质量使用取整值；自旋未计入。缩放采用对数变化，但每一帧内部的长度是同一线性比例。中心十字仅定位小到看不清的天体，不代表它的直径。'),
      note: t('这是缩放，不是黑洞在长大。它们不在同一个地点；整个银河系的引力也不只来自中央黑洞。') };
  },
  create: (host, state) => new ScaleScene(host, state),
};
