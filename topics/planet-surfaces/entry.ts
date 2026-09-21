import { languageHref } from '../../src/platform/i18n.ts';
import { isBody } from '../solar-system/explorer/model.ts';
const query = new URLSearchParams(location.search);
const world = query.get('world');
if (world === 'cancri') void import('./main.ts');
else {
  const target = new URL(languageHref('/topics/solar-system/'), location.origin);
  target.searchParams.set('body', isBody(world) ? world : 'earth');
  target.searchParams.set('view', ['globe', 'section', 'landscape'].includes(query.get('view') ?? '') ? query.get('view')! : 'descent');
  location.replace(target);
}
