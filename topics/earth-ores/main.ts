import {mountSingleGallery} from '../earth/singleGallery.ts';
import english from './locales/en.json';
mountSingleGallery('ores','earth-ores',english,()=>import('./study.ts'));
