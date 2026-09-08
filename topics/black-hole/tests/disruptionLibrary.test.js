import test from 'node:test';
import assert from 'node:assert/strict';
import { DisruptionLibrary } from '../physics/disruptionLibrary.ts';

test('background preparation shares requests, keeps route identity, and releases pending work', async () => {
  const nativeWorker = globalThis.Worker;
  const workers = [];
  globalThis.Worker = class {
    constructor() { workers.push(this); this.requests = []; }
    postMessage(message) { this.requests.push(message); }
    terminate() { this.terminated = true; }
  };
  const library = new DisruptionLibrary();
  try {
    const tidal = library.get('tidal');
    assert.equal(library.get('tidal'), tidal);
    const deep = library.get('deep');
    assert.equal(workers.length, 1);
    assert.deepEqual(workers[0].requests, [{ scenario: 'tidal' }, { scenario: 'deep' }]);
    workers[0].onmessage({ data: { scenario: 'deep', snapshot: { scenario: 'deep' } } });
    assert.equal((await deep).scenario, 'deep');
    workers[0].onmessage({ data: { scenario: 'tidal', snapshot: { scenario: 'tidal' } } });
    const first = await tidal;
    assert.equal(await library.get('tidal'), first);
    assert.equal(typeof first.sample, 'function');
    assert.equal(workers[0].requests.length, 2);
    library.dispose();
    assert.equal(workers[0].terminated, true);
    assert.equal(library.models.size, 0);
    await assert.rejects(library.get('tidal'), /closed/);

    const interrupted = new DisruptionLibrary();
    const pending = interrupted.get('deep');
    const rejected = assert.rejects(pending, /closed/);
    interrupted.dispose();
    await rejected;

    const retry = new DisruptionLibrary();
    const failed = retry.get('tidal');
    const failedCheck = assert.rejects(failed, /failed/);
    workers.at(-1).onerror();
    await failedCheck;
    const recovered = retry.get('tidal');
    workers.at(-1).onmessage({ data: { scenario: 'tidal', snapshot: { scenario: 'tidal' } } });
    assert.equal((await recovered).scenario, 'tidal');
    retry.dispose();
  } finally {
    library.dispose();
    globalThis.Worker = nativeWorker;
  }
});
