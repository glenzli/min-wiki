import {mountSingleGallery} from '../earth/singleGallery.ts';
import english from './locales/en.json';
mountSingleGallery('climate','earth-climate',english,()=>import('./study.ts'));
