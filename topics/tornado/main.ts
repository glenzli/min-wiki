import { languageHref } from '../../src/platform/i18n.ts';
import { worldHref } from '../wind/session.ts';
location.replace(languageHref(worldHref('tornado',location.search)) + location.hash);
