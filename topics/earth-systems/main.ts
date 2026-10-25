import {mountSingleGallery} from '../earth/singleGallery.ts';
import english from './locales/en.json';
mountSingleGallery('systems','earth-systems',english,()=>import('../earth/systems/study.ts'));
