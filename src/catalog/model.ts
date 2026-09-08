import type catalogData from '../../content/catalog.json';
export type Catalog = typeof catalogData;
export type Topic = Catalog['topics'][number];
export const PAGE_SIZE = 24;
const ID = /^[a-z][a-z0-9-]*$/;
export const topicHref = (topic: Pick<Topic, "id">) => `/topics/${topic.id}/`;

// This same contract is checked by the build and consumed by the directory.
export function validateCatalog(catalog: Catalog) {
  const categories = new Set(), topics = new Set();
  for (const category of catalog.categories) {
    if (!ID.test(category.id) || categories.has(category.id) || !category.name
      || !['light', 'dark'].includes(category.theme)) throw new Error(`Invalid category: ${category.id}`);
    categories.add(category.id);
  }
  for (const topic of catalog.topics) {
    if (!ID.test(topic.id) || topics.has(topic.id) || !categories.has(topic.category)
      || !topic.title || !topic.summary || !Array.isArray(topic.tags)
      || !topic.tags.every(tag => typeof tag === 'string')
      || !Array.isArray(topic.modes) || !topic.modes.every(mode => typeof mode === 'string')
      || !['light', 'dark'].includes(topic.theme) || !['light', 'dark'].includes(topic.sceneTheme)
      || !['published', 'draft'].includes(topic.status)) throw new Error(`Invalid topic: ${topic.id}`);
    topics.add(topic.id);
  }
  return catalog;
}

export function readFilters(search: string, catalog: Catalog) {
  const params = new URLSearchParams(search);
  const category = params.get('category') ?? 'all';
  return {
    category: catalog.categories.some(item => item.id === category) ? category : 'all',
    query: (params.get('q') ?? '').slice(0, 160),
  };
}

export function findTopics(catalog: Catalog, {category = 'all', query = ''} = {}) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return catalog.topics.filter(topic => {
    if (topic.status !== 'published' || (category !== 'all' && topic.category !== category)) return false;
    const categoryName = catalog.categories.find(item => item.id === topic.category)?.name ?? '';
    const searchable = [topic.title, topic.summary, categoryName, ...topic.tags].join(' ').toLocaleLowerCase();
    return terms.every(term => searchable.includes(term));
  });
}
