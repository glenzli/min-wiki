import { PERICENTER, tidalRadius } from './model.ts';
import type { Planet, Route } from './model.ts';

// These are positions in the stored encounter, not fractions of playback time.
// The final chapter begins after the camera settles, leaving time to explore it.
export const STAGE_PROGRESS = [0, .375, .57, .7] as const;

const FLYBY_SECONDS = 32;
const DISRUPTION_SECONDS = 120;
const SLOW_START = .45;
const SLOW_END = .65;
const SLOW_MIDPOINT = (SLOW_START + SLOW_END) / 2;
const EXTRA_SECONDS_PER_PROGRESS = (DISRUPTION_SECONDS - FLYBY_SECONDS) / (1 - SLOW_MIDPOINT);
const clamp = (value: number, maximum = 1) => Math.max(0, Math.min(maximum, value));

export function playbackDuration(planet: Planet, route: Route) {
    return PERICENTER[route] < tidalRadius(planet) ? DISRUPTION_SECONDS : FLYBY_SECONDS;
}

/** Nominal 1× screen time. The physical encounter and its particles stay unchanged. */
export function playbackSeconds(progress: number, planet: Planet, route: Route) {
    const p = clamp(progress);
    if (playbackDuration(planet, route) === FLYBY_SECONDS) return p * FLYBY_SECONDS;

    // Integrate a smoothstep in seconds per unit progress. This eases from the
    // original approach speed into a slower, strictly moving return phase.
    const u = clamp((p - SLOW_START) / (SLOW_END - SLOW_START));
    const easedTime = (SLOW_END - SLOW_START) * (u ** 3 - .5 * u ** 4);
    const laterTime = Math.max(0, p - SLOW_END);
    return p * FLYBY_SECONDS + EXTRA_SECONDS_PER_PROGRESS * (easedTime + laterTime);
}

/** Inverse clock for seeking and playback; reversible and independent of frame rate. */
export function motionProgress(seconds: number, planet: Planet, route: Route) {
    const duration = playbackDuration(planet, route);
    const target = clamp(seconds, duration);
    if (target === 0) return 0;
    if (target === duration) return 1;
    if (duration === FLYBY_SECONDS) return target / duration;
    let low = 0, high = 1;
    for (let i = 0; i < 44; i++) {
        const middle = (low + high) / 2;
        if (playbackSeconds(middle, planet, route) < target) low = middle;
        else high = middle;
    }
    return (low + high) / 2;
}

export function advancePlayback(progress: number, seconds: number, planet: Planet, route: Route) {
    return motionProgress(playbackSeconds(progress, planet, route) + seconds, planet, route);
}
