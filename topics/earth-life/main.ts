import {mountSingleGallery} from '../earth/singleGallery.ts';
import english from './locales/en.json';
mountSingleGallery('life','earth-life',english,()=>import('./study.ts'));
