interface PendingDisruption { promise: Promise<StellarDisruption>; resolve: (value: StellarDisruption) => void; reject: (error: Error) => void; }
import type { DisruptionResponse } from './stellarDisruption.ts';
import { StellarDisruption } from './stellarDisruption.ts';
import { SCENARIOS } from './encounter.ts';

// Owns preparation and residency. Two fixed profiles, ~216 MB of trajectory
// storage at most; requests share work and never block the animation/UI thread.
export class DisruptionLibrary {
  pending!: Map<string, PendingDisruption>;
  models!: Map<string, StellarDisruption>;
  worker: Worker | null = null;
  closed = false;

  constructor() {
    this.pending = new Map();
    this.models = new Map();
  }

  get(scenario: string): Promise<StellarDisruption> {
    if (this.closed) return Promise.reject(new Error('Scene closed'));
    if (!SCENARIOS[scenario]?.disrupted) return Promise.reject(new Error('Unknown disruption'));
    if (this.models.has(scenario)) return Promise.resolve(this.models.get(scenario)!);
    if (this.pending.has(scenario)) return this.pending.get(scenario)!.promise;
    if (!this.worker) {
      try {
        this.worker = new Worker(new URL('./disruptionWorker.ts', import.meta.url), { type: 'module' });
      } catch (error) {
        return Promise.reject(error);
      }
      this.worker.onmessage = ({ data }: MessageEvent<DisruptionResponse>) => {
        const request = this.pending.get(data.scenario);
        if (!request) return;
        this.pending.delete(data.scenario);
        if ('error' in data) request.reject(new Error(data.error));
        else {
          const model = Object.assign(Object.create(StellarDisruption.prototype), data.snapshot);
          this.models.set(data.scenario, model);
          request.resolve(model);
        }
      };
      this.worker.onerror = () => this.fail(new Error('Gas preparation failed'));
    }
    let resolve!: (value: StellarDisruption) => void, reject!: (error: Error) => void;
    const promise = new Promise<StellarDisruption>((yes, no) => { resolve = yes; reject = no; });
    this.pending.set(scenario, { promise, resolve, reject });
    this.worker.postMessage({ scenario });
    return promise;
  }

  fail(error: Error) {
    this.worker?.terminate();
    this.worker = null;
    for (const request of this.pending.values()) request.reject(error);
    this.pending.clear();
  }

  dispose() {
    this.closed = true;
    this.fail(new Error('Scene closed'));
    this.models.clear();
  }
}
