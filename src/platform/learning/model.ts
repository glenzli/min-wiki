export interface LearningText {
  question: string;
  observe: string;
  academic: { title: string; body: string }[];
  misconception: string;
  boundary: string;
  narration: { label: string; text: string; cue: string }[];
}

export interface TopicLearning {
  version: 1;
  topicId: string;
  zh: LearningText;
  en: LearningText;
  references: { title: string; url: string }[];
}

/** Only spoken words go into the synthesis export; stage directions stay in the storyboard. */
export function narrationText(content: LearningText): string {
  return `${content.narration.map(segment => segment.text.trim()).join('\n\n')}\n`;
}

export function narrationStoryboard(content: LearningText): string {
  return `${content.narration.map((segment, index) =>
    `${String(index + 1).padStart(2, '0')} · ${segment.label}\n[${segment.cue}]\n\n${segment.text.trim()}`,
  ).join('\n\n---\n\n')}\n`;
}
