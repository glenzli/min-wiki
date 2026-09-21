import { legacyCellURL } from '../cells/exploration.ts';
location.replace(legacyCellURL(location.href, import.meta.env.BASE_URL, 'blood-cells'));
