import {translator} from '../../src/platform/i18n.ts';
import english from './locales/en.json';
import refrigeratorEnglish from '../refrigerator/locales/en.json';
export const t=translator('air-conditioner',{...refrigeratorEnglish,...english});
