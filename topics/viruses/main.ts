import { mountReadingMode } from '../../src/platform/readingMode.ts';
import './style.css';
import { translateDocument } from '../../src/platform/i18n.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { t } from './i18n.ts';
translateDocument(t);
mountTopicNavigation('viruses');
const el = <T extends Element = HTMLElement>(id: string): T => document.getElementById(id)! as unknown as T;
const host = el<HTMLSelectElement>('host');
let step = 0;
const titles = [t('相遇之前'), t('先与表面结合'), t('遗传信息进入'), t('借用细胞，制造部件'), t('组装新的噬菌体'), t('释放，寻找下一次相遇')];
const texts = [
  t('这个例子中的病毒叫噬菌体，会感染某些细菌。外壳包着 DNA，但它不能独自制造新病毒。'),
  t('噬菌体的尾部结构与细菌表面结合。这里假设这个细菌也能支持接下来的复制。'),
  t('DNA 沿尾部进入细菌。这个例子里，蛋白质外壳留在细胞外面。'),
  t('在细胞里，病毒的 DNA 被复制，细胞的蛋白质制造工具参与制造新部件。部件还不是完整病毒。'),
  t('新部件组装起来，DNA 被装进外壳。不是原来那个病毒长大后分成两半。'),
  t('这个裂解性周期中，细菌裂开，新噬菌体释放出来。画面只画了少量代表；不是所有病毒都用这种方式离开细胞。'),
];
const visible = (id: string, show: boolean) => el(id).setAttribute('visibility', show ? 'visible' : 'hidden');
const positions = [[300,325],[405,308],[540,330],[642,359],[365,410],[535,422]];
const released = [[145,300],[310,183],[621,185],[730,357],[353,457],[565,473]];
for (let i = 0; i < positions.length; i++) {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '#phage-shape');
  const dna = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  dna.setAttribute('d', 'M-17-21Q20-36 14-11T-13 10 17 25');
  dna.setAttribute('fill', 'none');
  dna.setAttribute('stroke', '#f2d58c');
  dna.setAttribute('stroke-width', '5');
  group.append(use, dna);
  el('offspring').append(group);
}
function render(): void {
  const mismatch = host.value === 'mismatch';
  const defended = host.value === 'defended';
  const limit = mismatch ? 1 : defended ? 2 : 5;
  step = Math.min(step, limit);
  const blocked = step === limit && limit < 5;
  const title = blocked ? (mismatch ? t('这一关：不能附着') : t('这一关：被内部防御阻止')) : titles[step]!;
  const text = blocked ? (mismatch ? t('这个细菌的表面与该噬菌体不匹配，过程在附着前停下。换一个宿主再观察。') : t('虽然表面匹配，遗传信息也进入了细胞，但这个例子中的内部防御阻断了复制，没有产生新病毒。')) : texts[step]!;
  el('step-title').textContent = title;
  el('step-text').textContent = text;
  el('step-number').textContent = `${String(step + 1).padStart(2, '0')} / 06`;
  el('scene-stage').textContent = title;
  el('diagram-desc').textContent = text;
  el('original-virus').setAttribute('transform', `translate(${step === 0 ? 170 : mismatch ? 363 : 480} ${step === 0 ? 106 : mismatch ? 90 : 122})`);
  visible('original-virus', step < 5);
  visible('virus-label', step === 0);
  visible('packed-dna', step < 2);
  visible('incoming-dna', step === 2 && !defended);
  visible('receptor-match', !mismatch && step < 5);
  visible('receptor-mismatch', mismatch);
  visible('cell', step < 5);
  visible('parts', step === 3);
  visible('offspring', step >= 4);
  visible('broken-cell', step === 5);
  visible('defense', defended && step === 2);
  el('cell-label').textContent = step === 5 ? t('本例：细菌裂解，子代释放') : t('细菌也是细胞');
  const coordinates = step === 5 ? released : positions;
  [...el('offspring').children].forEach((node, i) => {
    const [x, y] = coordinates[i]!;
    node.setAttribute('transform', `translate(${x} ${y}) rotate(${step === 5 ? i * 37 - 75 : -15 + i * 14}) scale(.3)`);
  });
  el<HTMLButtonElement>('prev').disabled = step === 0;
  el<HTMLButtonElement>('next').disabled = step === limit;
}
host.addEventListener('change', () => { step = 0; render(); });
el('prev').addEventListener('click', () => { step--; render(); });
el('next').addEventListener('click', () => { step++; render(); });
el('restart').addEventListener('click', () => { step = 0; render(); });
render();

mountReadingMode('details:last-of-type');
