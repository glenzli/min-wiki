import {mountSingleGallery} from '../earth/singleGallery.ts';
import english from './locales/en.json';
mountSingleGallery('history','earth-history',english,()=>import('../earth/history/study.ts'));
