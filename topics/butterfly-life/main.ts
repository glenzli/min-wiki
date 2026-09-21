import { languageHref } from '../../src/platform/i18n.ts';
import { metamorphosisDestination } from '../frog-life/metamorphosisModel.ts';
location.replace(languageHref(metamorphosisDestination('butterfly',location.search,location.hash,import.meta.env.BASE_URL)));
