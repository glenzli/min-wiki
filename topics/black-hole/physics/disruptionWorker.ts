/// <reference lib="webworker" />
import type { DisruptionSnapshot, DisruptionResponse } from './stellarDisruption.ts';
import { StellarDisruption } from './stellarDisruption.ts';
const worker = self as unknown as DedicatedWorkerGlobalScope;
worker.onmessage = ({ data: { scenario } }: MessageEvent<{scenario:string}>) => {
  try {
    const model = new StellarDisruption({ scenario });
    const snapshot: DisruptionSnapshot = {
      scenario: model.scenario,
      count: model.count,
      frames: model.frames,
      start: model.start,
      end: model.end,
      positions: model.positions,
      initial: model.initial,
      detachAt: model.detachAt,
      bound: model.bound,
      absorbedAt: model.absorbedAt,
      variation: model.variation,
      focus: model.focus,
    };
    const transfers = Object.values(snapshot).flatMap(value => ArrayBuffer.isView(value) ? [value.buffer as ArrayBuffer] : []);
    worker.postMessage({ scenario, snapshot } satisfies DisruptionResponse, transfers);
  } catch (error) {
    worker.postMessage({ scenario, error: error instanceof Error ? error.message : String(error) } satisfies DisruptionResponse);
  }
};
