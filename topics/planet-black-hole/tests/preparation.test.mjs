import test from 'node:test';
import assert from 'node:assert/strict';
import { PlanetScene } from '../scene.ts';

test('route changes cancel old preparation, ignore stale replies, and bound the cache', () => {
    const original = globalThis.Worker, workers = [];
    globalThis.Worker = class {
        constructor() { workers.push(this); }
        postMessage(request) { this.request = request; }
        terminate() { this.terminated = true; }
    };
    try {
        const scene = Object.create(PlanetScene.prototype);
        Object.assign(scene, {
            worker: null, cache: new Map(),
            gas: { visible: true, geometry: { attributes: { position: { array: new Float32Array(3) } } } },
            trails: { visible: true }, emissionWeights: new Float32Array(1),
            emission: { update() {} }, hole: { setAccretion() {} },
            install(data) { this.data = data; this.loading = false; },
        });
        scene.select('rocky', 'deep');
        assert.equal(scene.loading, true);
        assert.equal(scene.gas.visible, false);
        scene.select('gas', 'deep');
        assert.equal(workers[0].terminated, true);
        workers[0].onmessage({ data: { data: { key: 'stale' } } });
        assert.equal(scene.data, undefined);
        const first = { key: 'gasdeep' };
        workers[1].onmessage({ data: { data: first } });
        assert.equal(scene.data, first);
        assert.equal(scene.loading, false);
        scene.select('gas', 'deep');
        assert.equal(workers.length, 2);
        for (const route of ['safe', 'grazing']) {
            scene.select('rocky', route);
            workers.at(-1).onmessage({ data: { data: { key: route } } });
        }
        assert.equal(scene.cache.size, 2);
        assert.equal(scene.cache.has('gasdeep'), false);
        scene.select('gas', 'deep');
        workers.at(-1).onerror();
        assert.equal(scene.error, true);
        assert.equal(scene.loading, false);
        assert.equal(scene.worker, null);
        scene.select('gas', 'deep');
        assert.equal(scene.error, false);
        assert.equal(scene.loading, true);
    } finally { globalThis.Worker = original; }
});
