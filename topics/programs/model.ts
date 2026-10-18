/** A bounded instruction interpreter, not a model of a real vehicle or AI. */
export type Scenario = 'sequence' | 'condition' | 'debug';
export type Operation = 'load' | 'east' | 'north' | 'south' | 'look' | 'unload';
export type Instruction = { id: string; operation: Operation; branch?: 'clear' | 'blocked' };
export type Point = { x: number; y: number };
export type Fault = 'not-at-pickup' | 'not-at-delivery' | 'no-parcel' | 'obstacle' | 'outside-table';
export type ProgramState = {
  scenario: Scenario; corrected: boolean; obstacle: boolean;
  instructions: Instruction[]; pc: number; last: string | null;
  position: Point; trail: Point[]; parcel: 'pickup' | 'onboard' | 'delivered';
  sensor: boolean | null; choice: 'clear' | 'blocked' | null;
  status: 'ready' | 'running' | 'paused' | 'finished' | 'error';
  fault: Fault | null; elapsed: number; executed: number;
};
export const COMMAND_INTERVAL = 1100;
const pickup = { x: 1, y: 1 }, delivery = { x: 5, y: 1 };
const instruction = (operation: Operation, id: string, branch?: Instruction['branch']): Instruction => ({ operation, id, ...(branch ? { branch } : {}) });
export function createProgram(scenario: Scenario, corrected = false, obstacle = scenario === 'condition'): ProgramState {
  const operations: Operation[] = scenario === 'condition'
    ? ['load', 'east', 'look', 'unload']
    : scenario === 'debug' && !corrected
      ? ['east', 'load', 'east', 'east', 'east', 'unload']
      : ['load', 'east', 'east', 'east', 'east', 'unload'];
  return { scenario, corrected, obstacle, instructions: operations.map((op, i) => instruction(op, `base-${i}`)), pc: 0,
    last: null, position: { ...pickup }, trail: [{ ...pickup }], parcel: 'pickup', sensor: null, choice: null,
    status: 'ready', fault: null, elapsed: 0, executed: 0 };
}
export function resetProgram(state: ProgramState): ProgramState {
  return createProgram(state.scenario, state.corrected, state.obstacle);
}
export function setObstacle(state: ProgramState, obstacle: boolean): ProgramState {
  return { ...state, obstacle };
}
export function fixOrder(state: ProgramState, corrected: boolean): ProgramState {
  return createProgram(state.scenario, corrected, state.obstacle);
}
export function playProgram(state: ProgramState): ProgramState {
  if (state.status === 'error' || state.status === 'finished') return state;
  return { ...state, status: 'running' };
}
export function pauseProgram(state: ProgramState): ProgramState {
  return state.status === 'running' ? { ...state, status: 'paused' } : state;
}
/** One command is atomic. A decision reads the live sensor once and expands only that branch. */
export function stepProgram(state: ProgramState): ProgramState {
  if (state.status === 'error' || state.status === 'finished') return state;
  const card = state.instructions[state.pc];
  if (!card) return { ...state, status: 'finished', elapsed: 0 };
  const next: ProgramState = { ...state, position: { ...state.position }, trail: state.trail.map(p => ({ ...p })),
    instructions: state.instructions.slice(), last: card.id, pc: state.pc + 1, executed: state.executed + 1, elapsed: 0 };
  function fail(fault: Fault) { next.status = 'error'; next.fault = fault; }
  if (card.operation === 'load') {
    if (next.position.x !== pickup.x || next.position.y !== pickup.y) fail('not-at-pickup');
    else next.parcel = 'onboard';
  } else if (card.operation === 'unload') {
    if (next.position.x !== delivery.x || next.position.y !== delivery.y) fail('not-at-delivery');
    else if (next.parcel !== 'onboard') fail('no-parcel');
    else next.parcel = 'delivered';
  } else if (card.operation === 'look') {
    // This example's sensor reports whether the next eastward square is obstructed.
    next.sensor = state.obstacle && state.position.x === 2 && state.position.y === 1;
    next.choice = next.sensor ? 'blocked' : 'clear';
    const branch: Operation[] = next.sensor ? ['north', 'east', 'east', 'east', 'south'] : ['east', 'east', 'east'];
    next.instructions.splice(next.pc, 0, ...branch.map((op, i) => instruction(op, `${next.choice}-${i}`, next.choice!)));
  } else {
    const target = { x: next.position.x + (card.operation === 'east' ? 1 : 0),
      y: next.position.y + (card.operation === 'north' ? -1 : card.operation === 'south' ? 1 : 0) };
    if (target.x < 1 || target.x > 5 || target.y < 0 || target.y > 1) fail('outside-table');
    // Screen-activity overlap guard, not a new sensor sample or a real robot's safety controller.
    // A real cart following a stale route without sensing again could collide.
    else if (next.obstacle && target.x === 3 && target.y === 1) fail('obstacle');
    else { next.position = target; next.trail.push({ ...target }); }
  }
  if (next.status !== 'error' && next.pc === next.instructions.length) next.status = 'finished';
  return next;
}
/** Elapsed time is accepted only while running; pause/resume cannot accumulate hidden commands. */
export function tickProgram(state: ProgramState, milliseconds: number): ProgramState {
  if (state.status !== 'running' || !Number.isFinite(milliseconds) || milliseconds <= 0) return state;
  let next = { ...state, elapsed: state.elapsed + Math.min(milliseconds, 250) };
  if (next.elapsed >= COMMAND_INTERVAL) next = stepProgram(next);
  return next;
}
