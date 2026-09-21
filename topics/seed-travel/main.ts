import { languageHref } from '../../src/platform/i18n.ts';
import { plantDestination } from '../seed-sprouting/lifecycleModel.ts';
location.replace(languageHref(plantDestination('dispersal',location.search,location.hash)));
