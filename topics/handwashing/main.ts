import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { initialPractice, reviewRegion, advance, canAdvance, regions, type Region, type Stage } from './model.ts';
import { t } from './i18n.ts';
import './style.css';

translateDocument(t);
mountTopicNavigation('handwashing');
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id)! as T;
let state = initialPractice();

const regionInfo: Record<Region, { name: string; detail: string; position: [number, number] }> = {
  palm: { name: t('掌心'), detail: t('两只手掌相对，来回搓一搓。掌心的褶皱也要照顾到。'), position: [235, 262] },
  back: { name: t('手背'), detail: t('用一只手的手掌搓另一只手的手背，再交换。图中圆圈提示的是同一位置的背面。'), position: [259, 238] },
  between: { name: t('指缝'), detail: t('让两只手的手指交错，来回搓洗每道指缝。别忘了手指侧面。'), position: [249, 181] },
  thumb: { name: t('拇指'), detail: t('用另一只手握住拇指，轻轻转着搓，再换另一边。'), position: [147, 225] },
  tips: { name: t('指尖与指甲边'), detail: t('把指尖并拢，在另一只手的掌心轻轻打圈，照顾指尖与指甲周围，再交换。'), position: [224, 62] },
};
const stageInfo: Record<Stage, { micro: string; progress: string; next: string }> = {
  wet: {
    micro: t('水先打湿皮肤。图中的棕色团块代表油污，深色小形状代表部分微生物；它们小得多，这里只是放大示意。'),
    progress: t('第一站：用干净的流动水打湿双手。'),
    next: t('下一步：用皂'),
  },
  soap: {
    micro: t('肥皂来帮忙：分子的一端容易和水相处，另一端容易进入油污。浅色圆头和短线是分子符号，不是泡泡。'),
    progress: t('第二站：关上水龙头，涂上肥皂或水洗型洗手液。'),
    next: t('下一步：搓洗'),
  },
  rub: {
    micro: t('来回搓洗产生摩擦，配合肥皂让污物松动。图里的上移只表示“松动”，没有表示真实速度或清洁比例。'),
    progress: t('搓洗练习：已看过 {{count}} / 5 个区域。',{ count: 0 }),
    next: t('下一步：冲净'),
  },
  rinse: {
    micro: t('流动的清水把松动的污物和肥皂带走。少量微生物符号仍留在皮肤上：洗手并不等于让皮肤无菌。'),
    progress: t('第四站：用干净的流动清水，把肥皂冲洗干净。'),
    next: t('下一步：擦干'),
  },
  dry: {
    micro: t('最后，用干净毛巾或干手设备把手弄干。画面没有给出“洗净分数”，真正的清洁取决于实际操作。'),
    progress: t('屏幕练习完成。现在记住：用皂搓洗至少 20 秒，冲净，再擦干。'),
    next: t('练习完成'),
  },
};

function render() {
  const stage = stageInfo[state.stage];
  el('practice').dataset.stage = state.stage;
  document.querySelectorAll<HTMLElement>('[data-step]').forEach(item => {
    if (item.dataset.step === state.stage) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  });
  el('micro-caption').textContent = stage.micro;
  el('hand-caption').textContent = state.stage === 'rub'
    ? t('{{region}}：{{detail}}', { region: regionInfo[state.selected].name, detail: regionInfo[state.selected].detail })
    : t('两只手都要洗；掌心、手背和手指各处都要照顾到。');
  el('progress').textContent = state.stage === 'rub'
    ? t('搓洗练习：已看过 {{count}} / 5 个区域。', { count: state.reviewed.length })
    : stage.progress;
  el<HTMLButtonElement>('next').textContent = stage.next;
  el<HTMLButtonElement>('next').disabled = !canAdvance(state);
  el('region-controls').hidden = state.stage !== 'rub';
  document.querySelectorAll<HTMLButtonElement>('[data-region]').forEach(button => {
    const region = button.dataset.region as Region;
    button.setAttribute('aria-pressed', String(state.selected === region));
    button.dataset.reviewed = String(state.reviewed.includes(region));
  });
  const [x, y] = regionInfo[state.selected].position;
  document.getElementById('region-spot')!.setAttribute('transform', `translate(${x} ${y})`);
}

document.querySelectorAll<HTMLButtonElement>('[data-region]').forEach(button => {
  button.addEventListener('click', () => {
    const region = button.dataset.region as Region;
    if (regions.includes(region)) { state = reviewRegion(state, region); render(); }
  });
});
el('next').addEventListener('click', () => {
  state = advance(state); render();
  if (state.stage === 'rub') document.querySelector<HTMLButtonElement>('[data-region="palm"]')?.focus();
});
el('restart').addEventListener('click', () => { state = initialPractice(); render(); el('next').focus(); });

// Only decorative water motion runs, and it stops with page lifetime/visibility.
const setVisible = () => document.documentElement.classList.toggle('motion-paused', document.hidden);
document.addEventListener('visibilitychange', setVisible);
window.addEventListener('pagehide', () => document.documentElement.classList.add('motion-paused'));
window.addEventListener('pageshow', setVisible);
setVisible();
render();

mountReadingMode('details:not(.references)');
