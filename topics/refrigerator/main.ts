import {languageHref} from '../../src/platform/i18n.ts';
import {coolingHref} from '../air-conditioner/projectModel.ts';
location.replace(languageHref(coolingHref('fridge',location.search,location.hash)));
