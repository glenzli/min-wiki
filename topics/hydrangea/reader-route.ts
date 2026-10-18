import {languageHref} from '../../src/platform/i18n.ts';
import {readFlowerState} from '../flower-colors/model.ts';
const target=new URL(location.href);target.pathname=languageHref('/topics/flower-colors/').split('?')[0];target.searchParams.set('case',readFlowerState(location.search,true).case);location.replace(target);
