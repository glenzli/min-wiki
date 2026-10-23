import { bounded, type Chapter, type Landform, type VolcanoCase } from './projectModel.ts';

/** Learning questions select existing process owners. Their clocks remain
 * separate; normalized progress is not a common geological time axis. */
export const STUDIES = ['mechanism', 'styles', 'building', 'submarine', 'ecology', 'lake', 'heat'] as const;
export type Study = typeof STUDIES[number];
export const UNITS = [
  { id: 'eruption', studies: ['mechanism', 'styles'] },
  { id: 'mountain', studies: ['building', 'submarine'] },
  { id: 'later', studies: ['ecology', 'lake'] },
  { id: 'heat', studies: ['heat'] },
] as const;
export function chapterForStudy(study: Study): Chapter {
  return study === 'mechanism' || study === 'styles' ? 'eruption' : study === 'ecology' ? 'life' : 'landscape';
}
export function defaultCase(study: Study): VolcanoCase {
  return study === 'submarine' ? 'submarine' : study === 'lake' ? 'lake' : study === 'ecology' ? 'scoria' : 'composite';
}
export function initialStudyProgress(study: Study) {
  return study === 'styles' ? .62 : study === 'building' ? .58 : study === 'ecology' ? .72 : study === 'heat' ? 1 : .08;
}
export function sceneProgress(study: Study, volcano: VolcanoCase, progress: number) {
  const p = bounded(progress);
  return study === 'building' ? p * (volcano === 'scoria' ? .32 : .61)
    : study === 'styles' ? .54 + p * .46 : p;
}
export function studyRenderer(study: Study, volcano: VolcanoCase) {
  if (study === 'heat' || study === 'lake' || study === 'submarine') return study;
  if (study === 'mechanism' || study === 'styles') return 'eruption';
  return volcano === 'scoria' ? 'omuro' : 'history';
}
export function nextStudy(study: Study): Study | undefined { return STUDIES[STUDIES.indexOf(study) + 1]; }
export function studyKey(study: Study, volcano: VolcanoCase) { return `${study}:${volcano}`; }
export function studyMilestones(study: Study, caldera = true): readonly number[] {
  return study === 'mechanism' ? [.08,.22,.35,.62,.86,1]
    : study === 'building' ? [.06,.38,.82,1] : study === 'ecology' ? [.08,.32,.57,1]
      : study === 'heat' ? [.23,.50,.70,1] : study === 'lake' && caldera ? [.13,.23,.36,.72] : [.08,.32,.68,1];
}

/** Old case/chapter links enter the corresponding question and meaningful
 * phase. The legacy route helpers remain intact for published child entries. */
export function studyRoute(search: string, hash = '') {
  const params = new URLSearchParams(search);
  const anchor = hash.match(/^#study-([a-z]+)(?:-(?:zh|en))?$/)?.[1];
  const requested = params.get('study') ?? anchor;
  const raw = params.get('case'), validCase = ['shield', 'composite', 'scoria', 'submarine', 'lake'].includes(raw ?? '');
  const oldCase = validCase ? raw as VolcanoCase : undefined;
  const oldChapter = params.get('chapter');
  const study: Study = STUDIES.includes(requested as Study) ? requested as Study
    : oldCase === 'lake' ? 'lake' : oldCase === 'submarine' ? 'submarine'
      : oldCase === 'scoria' ? oldChapter === 'eruption' ? 'building' : 'ecology'
        : oldCase && oldChapter === 'landscape' ? 'building'
          : oldCase && oldChapter === 'life' ? 'ecology'
            : params.get('view') === 'exterior' ? 'styles' : 'mechanism';
  let volcano = defaultCase(study);
  if (oldCase && (oldCase === 'shield' || oldCase === 'composite' || oldCase === 'scoria') &&
      (study === 'building' || study === 'ecology')) volcano = oldCase;
  // Eruption uses a representative existing mountain, not the Omuro journey.
  if ((study === 'mechanism' || study === 'styles') && (oldCase === 'shield' || oldCase === 'composite')) volcano = oldCase;
  let progress = initialStudyProgress(study);
  if (!STUDIES.includes(requested as Study) && oldCase) {
    if (study === 'building') progress = oldCase === 'scoria' ? .08 / .32 : 1;
    if (study === 'ecology') progress = oldCase === 'scoria' ? oldChapter === 'life' ? .5 : 1 : .08;
  }
  return { study, volcano, chapter: chapterForStudy(study), progress,
    view: study === 'heat' && params.get('view') === 'section' ? 'section' as const
      : params.get('view') === 'exterior' && study === 'styles' ? 'exterior' as const : 'landscape' as const };
}

export function landformFrom(value: string): Landform {
  return value === 'shield' || value === 'scoria' ? value : 'composite';
}
