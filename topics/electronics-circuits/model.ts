export type ControlMode = 'manual' | 'automatic';
export type LightRule = 'dark' | 'bright';
export type CircuitState = {
  mode: ControlMode;
  switchClosed: boolean;
  returnIntact: boolean;
  sensorConnected: boolean;
  lightLevel: number;
  threshold: number;
  rule: LightRule;
};
export type CircuitObservation = {
  state: CircuitState;
  sensorReading: number | null;
  belowThreshold: boolean | null;
  commandOn: boolean;
  electronicConducting: boolean;
  lampOn: boolean;
  blockers: ('switch' | 'return' | 'sensor' | 'rule')[];
};

export function initialCircuit(): CircuitState {
  return { mode: 'manual', switchClosed: false, returnIntact: true, sensorConnected: true, lightLevel: 70, threshold: 40, rule: 'dark' };
}

const bounded = (value: number, fallback: number) => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback;

/** A stable, qualitative DC state, not a transient solver or a wiring design. */
export function observeCircuit(input: CircuitState): CircuitObservation {
  const state: CircuitState = {
    ...input,
    mode: input.mode === 'automatic' ? 'automatic' : 'manual',
    rule: input.rule === 'bright' ? 'bright' : 'dark',
    lightLevel: bounded(input.lightLevel, 70),
    threshold: bounded(input.threshold, 40),
  };
  const sensorReading = state.sensorConnected ? state.lightLevel : null;
  const belowThreshold = sensorReading === null ? null : sensorReading < state.threshold;
  const commandOn = state.mode === 'manual' || (belowThreshold !== null && (state.rule === 'dark' ? belowThreshold : !belowThreshold));
  const electronicConducting = commandOn;
  const blockers: CircuitObservation['blockers'] = [];
  if (!state.switchClosed) blockers.push('switch');
  if (!state.returnIntact) blockers.push('return');
  if (state.mode === 'automatic' && sensorReading === null) blockers.push('sensor');
  else if (!commandOn) blockers.push('rule');
  return { state, sensorReading, belowThreshold, commandOn, electronicConducting, lampOn: blockers.length === 0, blockers };
}

export function circuitModeFromQuery(value: string | null): ControlMode {
  return value === 'automatic' ? 'automatic' : 'manual';
}
