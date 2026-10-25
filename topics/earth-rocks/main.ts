import {mountSingleGallery} from '../earth/singleGallery.ts';
import english from './locales/en.json';
mountSingleGallery('rocks','earth-rocks',english,()=>import('../earth/rocks/study.ts'));
