import { mountPresentationFrame } from '../../src/platform/presentation.ts';
import './style.css';
import { language, translateDocument } from '../../src/platform/i18n';
import { mountReadingMode } from '../../src/platform/readingMode';
import { animateValue } from '../../src/visuals/transition';
import { t } from './i18n';
import { mountAntWorkspace } from './workspace';

translateDocument(t);

const dispose = mountAntWorkspace(document.getElementById('ant-workspace')!, language === 'en' ? 'en' : 'zh', animateValue);
mountReadingMode('.ant-reading');
window.addEventListener('pagehide',event=>{if(!event.persisted)dispose();});

mountPresentationFrame({ root: '.ant-workbench', visual: '.ant-drawing', transport: '#ant-player', choices: '.ant-chapters' });
