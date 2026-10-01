/** A finite, local teaching trace of one online-chat message. No carrier protocol or latency simulation. */
export type Station = 'a' | 'b';
export type Conditions = { senderOnline: boolean; backboneOnline: boolean; receiverOnline: boolean; position: number };
export type Part = { id: number; hop: number; station: Station | null };
export type JourneyState = { completedSteps: number; parts: Part[]; read: boolean };
export type BlockedAt = 'sender' | 'network' | 'receiver' | null;
export const PART_COUNT = 3;
export const HOP_COUNT = 6;
export const TOTAL_STEPS = PART_COUNT * HOP_COUNT;
export const STEP_SECONDS = .9;
const bounded = (value: number, max: number) => Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0;
const initial = (): JourneyState => ({ completedSteps: 0, parts: Array.from({ length: PART_COUNT }, (_, i) => ({ id: i + 1, hop: 0, station: null })), read: false });
const clone = (s: JourneyState): JourneyState => ({ ...s, parts: s.parts.map(p => ({ ...p })) });
export function stationForPosition(position: number): Station { return bounded(position, 100) < 50 ? 'a' : 'b'; }
export class MessageJourney {
  conditions: Conditions = { senderOnline: true, backboneOnline: true, receiverOnline: true, position: 10 };
  private frames: JourneyState[] = [initial()];
  private conditionFrames: Conditions[] = [{ ...this.conditions }];
  private cursor = 0;
  private elapsed = 0;
  playing = false;
  get state(): JourneyState { return clone(this.frames[this.cursor]!); }
  get recordedSteps(): number { return this.frames.length - 1; }
  get activePart(): Part | null { return this.state.parts.find(p => p.hop < HOP_COUNT) ?? null; }
  get blockedAt(): BlockedAt {
    const part = this.activePart;
    if (!part) return null;
    if (part.hop === 0 && !this.conditions.senderOnline) return 'sender';
    if (part.hop > 0 && part.hop < 5 && !this.conditions.backboneOnline) return 'network';
    if (part.hop === 5 && !this.conditions.receiverOnline) return 'receiver';
    return null;
  }
  get status(): 'pending' | 'travelling' | 'delivered' | 'read' {
    if (this.state.read) return 'read';
    if (this.cursor === TOTAL_STEPS) return 'delivered';
    return this.cursor === 0 ? 'pending' : 'travelling';
  }
  configure(change: Partial<Conditions>): void {
    const next = { ...this.conditions, ...change };
    next.position = bounded(next.position, 100);
    if (Object.keys(next).every(key => next[key as keyof Conditions] === this.conditions[key as keyof Conditions])) return;
    this.pause();
    this.conditions = next;
    // Changed conditions branch from the current observation. Completed hops and launched identities survive.
    this.frames = this.frames.slice(0, this.cursor + 1);
    this.conditionFrames = this.conditionFrames.slice(0, this.cursor + 1);
    this.conditionFrames[this.cursor] = { ...this.conditions };
  }
  step(): boolean {
    if (this.cursor === TOTAL_STEPS) { this.pause(); return false; }
    if (this.cursor < this.recordedSteps) {
      this.cursor++; this.conditions = { ...this.conditionFrames[this.cursor]! };
      if (this.cursor === TOTAL_STEPS) this.pause();
      return true;
    }
    if (this.blockedAt) { this.pause(); return false; }
    const next = this.state;
    const part = next.parts.find(p => p.hop < HOP_COUNT)!;
    if (part.hop === 0) part.station = stationForPosition(this.conditions.position);
    part.hop++;
    next.completedSteps++;
    next.read = false;
    this.frames.push(next); this.conditionFrames.push({ ...this.conditions }); this.cursor++;
    if (this.cursor === TOTAL_STEPS) this.pause();
    return true;
  }
  seek(value: number): void {
    this.pause();
    const target = Math.round(bounded(value, TOTAL_STEPS));
    if (target <= this.recordedSteps) { this.cursor = target; this.conditions = { ...this.conditionFrames[this.cursor]! }; return; }
    this.cursor = this.recordedSteps; this.conditions = { ...this.conditionFrames[this.cursor]! };
    while (this.cursor < target && this.step()) { /* A seek cannot manufacture a hop across a disconnected gate. */ }
  }
  play(): void { if (this.cursor < TOTAL_STEPS && !this.blockedAt) { this.playing = true; this.elapsed = 0; } }
  pause(): void { this.playing = false; this.elapsed = 0; }
  tick(seconds: number): boolean {
    if (!this.playing || !Number.isFinite(seconds) || seconds <= 0) return false;
    // Background suspension must not finish a message in one large elapsed-time jump.
    this.elapsed += Math.min(seconds, .15);
    if (this.elapsed < STEP_SECONDS) return false;
    this.elapsed -= STEP_SECONDS;
    return this.step();
  }
  markRead(): boolean {
    if (this.cursor !== TOTAL_STEPS) return false;
    this.frames[this.cursor] = { ...this.state, read: true }; return true;
  }
  reset(): void { this.pause(); this.frames = [initial()]; this.conditionFrames = [{ ...this.conditions }]; this.cursor = 0; }
}
