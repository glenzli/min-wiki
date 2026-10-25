import { mountSingleGallery } from '../earth/singleGallery.ts';
import english from './locales/en.json';
mountSingleGallery('minerals', 'earth-minerals', english, () => import('./study.ts'));
