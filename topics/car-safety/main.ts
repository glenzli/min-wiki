import {languageHref} from '../../src/platform/i18n.ts';
import {motionHref,legacyCarChapter} from '../friction/projectModel.ts';
location.replace(languageHref(motionHref(legacyCarChapter(location.hash),location.search,location.hash)));
