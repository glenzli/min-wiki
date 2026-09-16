import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';
import type { LearningText, TopicLearning } from './model.ts';

type LearningLocale = 'zh' | 'en';

export interface LocalizedTopicLearning {
  version: 1;
  topicId: string;
  locale: LearningLocale;
  content: LearningText;
  references: TopicLearning['references'];
}

/** The authored bilingual document stays intact for validation and voice exports. */
export function projectLearning(data: TopicLearning, locale: LearningLocale): LocalizedTopicLearning {
  if (data.version !== 1 || !data.topicId || !data[locale] || !Array.isArray(data.references)) {
    throw new Error(`Invalid ${locale} learning document: ${data.topicId ?? 'unknown topic'}`);
  }
  return { version: data.version, topicId: data.topicId, locale, content: data[locale], references: data.references };
}

/** Only explicitly queried learning documents become locale-specific browser modules. */
export function learningProjectionPlugin(): Plugin {
  const projections = new Map<string, { file: string; locale: LearningLocale }>();
  return {
    name: 'learning-locale-projection',
    enforce: 'pre',
    async resolveId(source, importer) {
      const queryAt = source.indexOf('?');
      if (queryAt < 0) return;
      const query = new URLSearchParams(source.slice(queryAt + 1));
      if (!query.has('learning-locale')) return;
      const locale = query.get('learning-locale');
      if (locale !== 'zh' && locale !== 'en') this.error(`Unsupported learning locale: ${locale}`);
      const resolved = await this.resolve(source.slice(0, queryAt), importer, { skipSelf: true });
      if (!resolved || resolved.external || !/\/topics\/[^/]+\/learning\.json$/.test(resolved.id)) {
        this.error(`Learning projections require a topic learning.json: ${source}`);
      }
      // A JS virtual ID prevents Vite's normal JSON transform from processing
      // the generated module or accidentally retaining the other language.
      const id = `\0learning-locale:${locale}:${resolved.id}.js`;
      projections.set(id, { file: resolved.id, locale });
      return id;
    },
    load(id) {
      const projection = projections.get(id);
      if (!projection) return;
      this.addWatchFile(projection.file);
      const data = JSON.parse(readFileSync(projection.file, 'utf8')) as TopicLearning;
      return `export default ${JSON.stringify(projectLearning(data, projection.locale))};`;
    },
  };
}
