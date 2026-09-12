export const regions = ['palm', 'back', 'between', 'thumb', 'tips'] as const;
export type Region = typeof regions[number];
export const stages = ['wet', 'soap', 'rub', 'rinse', 'dry'] as const;
export type Stage = typeof stages[number];
export type Practice = { stage: Stage; selected: Region; reviewed: Region[] };
export const initialPractice = (): Practice => ({ stage: 'wet', selected: 'palm', reviewed: [] });

/** Screen lesson state only: it never estimates cleanliness or real washing time. */
export function reviewRegion(state: Practice, region: Region): Practice {
  return {
    ...state, selected: region,
    reviewed: state.stage === 'rub' && !state.reviewed.includes(region)
      ? [...state.reviewed, region] : state.reviewed,
  };
}
export function canAdvance(state: Practice): boolean {
  return state.stage !== 'dry' && (state.stage !== 'rub' || regions.every(region => state.reviewed.includes(region)));
}
export function advance(state: Practice): Practice {
  if (!canAdvance(state)) return state;
  return { ...state, stage: stages[stages.indexOf(state.stage) + 1]! };
}
