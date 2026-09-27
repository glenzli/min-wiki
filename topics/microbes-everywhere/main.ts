import { mountPresentationFrame } from '../../src/platform/presentation.ts';
import './style.css';
import { translateDocument } from '../../src/platform/i18n';
import { mountTopicNavigation } from '../../src/platform/topicNavigation';
import { mountMicrobialWorkspace } from './workspace';
import { t } from './i18n';
translateDocument(t);
mountTopicNavigation('microbes-everywhere');
mountMicrobialWorkspace(document.getElementById('microbial-workspace')!);

const frame = mountPresentationFrame({ root: '.micro-workspace', visual: '#micro-renderer', transport: '#micro-player', choices: '.micro-chapters' });
const currentObservation = document.querySelector<HTMLElement>('.micro-readout');
if (frame && currentObservation) frame.notes.prepend(currentObservation);
