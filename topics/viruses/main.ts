import { microbialHref } from '../microbes-everywhere/workspaceModel';
location.replace(microbialHref('viruses', location.search, import.meta.env.BASE_URL, location.hash));
