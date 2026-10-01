export type Demo = 'chat' | 'image' | 'recognize';
export type FirstAction = 'help' | 'observe' | 'keep' | 'share';
export type Evidence = 'count' | 'test' | 'adult';
export type Entity = 'person' | 'program' | 'ai' | 'robot';
export const demos: Demo[] = ['chat', 'image', 'recognize'];
export const entities: Entity[] = ['person', 'program', 'ai', 'robot'];
export const taskChoices: FirstAction[][] = [['help', 'observe'], ['help', 'observe'], ['help', 'observe'], ['keep', 'share'], ['help', 'observe']];
export const taskRules: FirstAction[][] = [['help', 'observe'], ['help', 'observe'], ['observe'], ['keep'], ['observe']];
export const claimEvidence: Evidence[] = ['count', 'test', 'adult'];
export interface ActivityState {
  demo: Demo;
  refined: boolean;
  entity: Entity;
  task: number;
  answers: (FirstAction | null)[];
  claim: number;
  checked: (Evidence | null)[];
}
export function initialState(): ActivityState {
  return { demo: 'chat', refined: false, entity: 'ai', task: 0,
    answers: taskRules.map(() => null), claim: 0, checked: claimEvidence.map(() => null) };
}
export function selectDemo(state: ActivityState, demo: Demo): ActivityState {
  return demos.includes(demo) ? { ...state, demo } : state;
}
export function selectTask(state: ActivityState, task: number): ActivityState {
  return Number.isInteger(task) && task >= 0 && task < taskRules.length ? { ...state, task } : state;
}
export function answerTask(state: ActivityState, answer: FirstAction): ActivityState {
  if (!taskChoices[state.task]?.includes(answer)) return state;
  const answers = [...state.answers]; answers[state.task] = answer;
  return { ...state, answers };
}
export function selectClaim(state: ActivityState, claim: number): ActivityState {
  return Number.isInteger(claim) && claim >= 0 && claim < claimEvidence.length ? { ...state, claim } : state;
}
export function checkClaim(state: ActivityState, evidence: Evidence): ActivityState {
  if (!claimEvidence.includes(evidence)) return state;
  const checked = [...state.checked]; checked[state.claim] = evidence;
  return { ...state, checked };
}
export function taskMatches(state: ActivityState): boolean {
  const answer = state.answers[state.task];
  return answer !== null && answer !== undefined && !!taskRules[state.task]?.includes(answer);
}
export function evidenceMatches(state: ActivityState): boolean {
  return state.checked[state.claim] === claimEvidence[state.claim];
}
