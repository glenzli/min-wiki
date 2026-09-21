import { languageHref } from '../../src/platform/i18n.ts';
import { stellarDestination } from './migration.ts';
location.replace(languageHref(stellarDestination(location.search,location.hash)));
