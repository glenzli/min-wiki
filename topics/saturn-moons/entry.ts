import { legacySaturnMoonTarget } from '../solar-system/explorer/ringsModel.ts';
import { languageHref } from '../../src/platform/i18n.ts';
location.replace(languageHref(legacySaturnMoonTarget(location.search,location.hash)));
