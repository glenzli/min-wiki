export type Scenario = 'normal' | 'microbial' | 'chemical';
export type Stage = 'before' | 'after';
export type Component = 'water' | 'minerals' | 'disinfectant' | 'risk';
/** Qualitative symbols, never a measurement or drinking-safety certification. */
export function composition(scenario: Scenario, stage: Stage) {
  return {
    mineralsRemain: true,
    pathogenSymbol: scenario === 'microbial' ? (stage === 'after' ? 'inactivated' : 'possible') : 'not-shown',
    chemicalWarning: scenario === 'chemical',
    boilingRemovesChemicalHazard: false,
  } as const;
}
