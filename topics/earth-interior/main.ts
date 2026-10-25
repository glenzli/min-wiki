import {mountSingleGallery} from '../earth/singleGallery.ts';
import english from './locales/en.json';
mountSingleGallery('interior','earth-interior',english,()=>import('../earth/interior/study.ts'));
