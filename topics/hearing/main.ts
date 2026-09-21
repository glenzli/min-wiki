import { languageHref } from '../../src/platform/i18n.ts';
import { soundHref } from '../sound-vibrations/projectModel.ts';
location.replace(languageHref(soundHref('ear',location.search,location.hash)));
