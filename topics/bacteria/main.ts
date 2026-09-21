import { microbialHref } from '../microbes-everywhere/workspaceModel';
location.replace(microbialHref('bacteria', location.search, import.meta.env.BASE_URL, location.hash));
