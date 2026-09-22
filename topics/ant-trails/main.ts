import { mountPresentationFrame } from '../../src/platform/presentation.ts';
import './style.css';
import { language, translateDocument } from '../../src/platform/i18n';
import { mountTopicNavigation } from '../../src/platform/topicNavigation';
import { mountReadingMode } from '../../src/platform/readingMode';
import { animateValue } from '../../src/visuals/transition';
import { t } from './i18n';
import { mountAntWorkspace } from './workspace';

translateDocument(t);
mountTopicNavigation('ant-trails');
const dispose = mountAntWorkspace(document.getElementById('ant-workspace')!, language === 'en' ? 'en' : 'zh', animateValue);
mountReadingMode('.ant-reading');
if (import.meta.hot) import.meta.hot.dispose(dispose);

mountPresentationFrame({ root: '.ant-workbench', visual: '.ant-drawing', transport: '#ant-player', choices: '.ant-chapters' });
