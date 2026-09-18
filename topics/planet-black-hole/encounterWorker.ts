/// <reference lib="webworker" />
import { buildEncounter } from './model.ts';
import type { Encounter, Planet, Route } from './model.ts';
export type EncounterResponse = { data: Encounter } | { error: string };
const worker = self as unknown as DedicatedWorkerGlobalScope;
worker.onmessage = ({ data: { planet, route } }: MessageEvent<{ planet: Planet; route: Route }>) => {
    try {
        const data = buildEncounter(planet, route);
        const transfers = Object.values(data).map(array => array.buffer as ArrayBuffer);
        worker.postMessage({ data } satisfies EncounterResponse, transfers);
    } catch (error) {
        worker.postMessage({ error: error instanceof Error ? error.message : String(error) } satisfies EncounterResponse);
    }
};
