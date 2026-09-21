import { languageHref } from '../../src/platform/i18n.ts';
import { waterHref } from '../rain-cycle/watershedModel.ts';
location.replace(languageHref(waterHref('cloud',location.search)) + location.hash);
