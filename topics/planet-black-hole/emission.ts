import * as THREE from 'three';

/** Spatial display brightness from this topic's debris, never a filled disk. */
export class DebrisEmission {
    readonly extent = 1;
    readonly size = 96;
    readonly texture = new THREE.DataTexture(new Uint8Array(this.size ** 2), this.size, this.size, THREE.RedFormat);
    private density = new Float32Array(this.size ** 2);
    constructor() {
        this.texture.minFilter = this.texture.magFilter = THREE.LinearFilter;
        this.texture.unpackAlignment = 1;
    }
    update(positions: Float32Array, weights: Float32Array) {
        this.density.fill(0);
        const scale = this.size / (2 * this.extent);
        for (let i = 0; i < weights.length; i++) {
            if (weights[i] <= 0) continue;
            const px = (positions[i * 3] + this.extent) * scale - .5;
            const py = (positions[i * 3 + 1] + this.extent) * scale - .5;
            for (let y = Math.max(0, Math.ceil(py - 3)); y <= Math.min(this.size - 1, Math.floor(py + 3)); y++) {
                for (let x = Math.max(0, Math.ceil(px - 3)); x <= Math.min(this.size - 1, Math.floor(px + 3)); x++) {
                    const d2 = (x - px) ** 2 + (y - py) ** 2;
                    if (d2 < 9) this.density[y * this.size + x] += weights[i] * (Math.exp(-d2 / 2) - Math.exp(-4.5));
                }
            }
        }
        const pixels = this.texture.image.data;
        for (let i = 0; i < pixels.length; i++) pixels[i] = Math.round(255 * (1 - Math.exp(-this.density[i] * .8)));
        this.texture.needsUpdate = true;
    }
    dispose() { this.texture.dispose(); }
}
