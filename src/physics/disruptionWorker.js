import { StellarDisruption } from './stellarDisruption.js';

self.onmessage = ({ data: { scenario } }) => {
  try {
    const model = new StellarDisruption({ scenario });
    // Transfer ownership of large immutable trajectories, without a second copy.
    const snapshot = {};
    const transfers = [];
    for (const key of ['scenario', 'count', 'frames', 'start', 'end', 'positions',
      'initial', 'detachAt', 'bound', 'absorbedAt', 'variation', 'focus']) {
      snapshot[key] = model[key];
      if (ArrayBuffer.isView(model[key])) transfers.push(model[key].buffer);
    }
    self.postMessage({ scenario, snapshot }, transfers);
  } catch (error) {
    self.postMessage({ scenario, error: error.message });
  }
};
