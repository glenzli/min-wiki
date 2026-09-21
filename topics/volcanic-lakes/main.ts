import { languageHref, translateDocument } from '../../src/platform/i18n.ts';
import { legacyDestination } from '../volcano-eruption/projectModel.ts';
import { t } from './i18n.ts';
translateDocument(t);
const destination = languageHref(legacyDestination(location.search, 'lake', import.meta.env.BASE_URL));
(document.getElementById('continue') as HTMLAnchorElement).href = destination;
location.replace(destination);
