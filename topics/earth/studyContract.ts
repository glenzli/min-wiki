export type Language = 'zh' | 'en';
export type StudyState = Record<string, string>;
export interface StudyContext {
  language: Language;
  initialState: StudyState;
  onStateChange: (state: StudyState) => void;
}
export interface StudyInstance {
  pause: () => void;
  dispose: () => void;
}
export type MountStudy = (host: HTMLElement, context: StudyContext) => StudyInstance;
