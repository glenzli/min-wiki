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
