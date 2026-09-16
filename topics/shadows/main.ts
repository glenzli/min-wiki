import { mountReadingMode } from '../../src/platform/readingMode.ts';
import { mountTopicNavigation } from '../../src/platform/topicNavigation.ts';
import { translateDocument } from '../../src/platform/i18n.ts';
import { t } from './i18n.ts';
import './style.css';
translateDocument(t);
mountTopicNavigation('shadows');
const el = (id: string) => document.getElementById(id)!;
const value = (id: string) => Number((el(id) as HTMLInputElement).value);
import { shadowTip } from './model.ts';
function update(){const h=value('height'), x=value('position'), tip=shadowTip(x,h);el('lamp').setAttribute('transform',`translate(${x} ${365-h})`);el('ray').setAttribute('d',`M${x} ${365-h}L450 245L${tip} 365`);el('shadow-wedge').setAttribute('d',`M450 245L${tip} 365H450Z`);el('shadow').setAttribute('cx',String((450+tip)/2));el('shadow').setAttribute('rx',String(Math.max(18,Math.abs(tip-450)/2)));el('shadow-label').textContent=t('影长：{{length}} 格',{length:(Math.abs(tip-450)/40).toFixed(1)});el('readout').textContent=x<450?t('灯在左边，影子伸向右边。'):x>450?t('灯在右边，影子伸向左边。'):t('灯在正上方，影子缩在脚下。');}
for(const id of ['height','position'])el(id).addEventListener('input',update);el('reset').addEventListener('click',()=>{(el('height') as HTMLInputElement).value='240';(el('position') as HTMLInputElement).value='280';update();});update();

mountReadingMode('details:not(.references)');
