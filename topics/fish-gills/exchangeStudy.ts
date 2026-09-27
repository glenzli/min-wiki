/** Qualitative inputs for a gill exchange comparison. These are visual ratios,
 * not measured concentrations, ventilation rates, or survival predictions. */
export const waterConditions = ['renewed', 'low-oxygen', 'slow-flow'] as const;
export type WaterCondition = typeof waterConditions[number];

export function conditionAt(condition: WaterCondition) {
  switch (condition) {
    case 'low-oxygen': return { oxygenDots: 4, flow: 1 };
    case 'slow-flow': return { oxygenDots: 12, flow: .38 };
    default: return { oxygenDots: 12, flow: 1 };
  }
}
