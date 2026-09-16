import { DebrisEmission } from './emission.ts';
import { teachingDistanceScale, updateTeachingLens } from '../../src/visuals/teachingCamera.ts';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BlackHoleOptics } from '../../src/visuals/blackHoleOptics.ts';
import { buildEncounter, centerAt, tidalRadius, PERICENTER, PARTICLES, FRAMES } from './model.ts';
import type { Planet, Route, Encounter } from './model.ts';
export type View = 'overview' | 'top' | 'close' | 'free';
export class PlanetScene {
    private cameraStarted = -Infinity;
    private fromCamera = new THREE.Vector3();
    private fromTarget = new THREE.Vector3();
    private fromUp = new THREE.Vector3(0, 0, 1);
    private needsRender = true;
    private lastKey = "";
    private scene = new THREE.Scene();
    private camera = new THREE.PerspectiveCamera(42, 1, .01, 3000);
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private observer: ResizeObserver;
    private cache = new Map<string, Encounter>();
    data: Encounter;
    private gas: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
    private emission = new DebrisEmission();
    private emissionWeights = new Float32Array(PARTICLES);
    private hole = new BlackHoleOptics(.18);
    private ring: THREE.LineLoop;
    private path: THREE.Line;
    private view: View = 'overview';
    private depth = new Float32Array(PARTICLES);
    private order = Array.from({ length: PARTICLES }, (_, i) => i);
    constructor(private canvas: HTMLCanvasElement) {
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setClearColor(0x030812);
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.controls = new OrbitControls(this.camera, canvas);
        this.controls.addEventListener("change", () => { this.needsRender = true; });
        this.controls.enablePan = false;
        this.controls.enabled = false;
        this.controls.minDistance = 1.1;
        this.controls.maxDistance = 38;
        const geometry = new THREE.BufferGeometry();
        for (const [name, size] of [['position', 3], ['origin', 3], ['color', 3], ['alpha', 1], ['released', 1]] as const)
            geometry.setAttribute(name, new THREE.BufferAttribute(new Float32Array(PARTICLES * size), size).setUsage(THREE.DynamicDrawUsage));
        geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(this.order), 1).setUsage(THREE.DynamicDrawUsage));
        const material = new THREE.ShaderMaterial({ uniforms: { uHeight: { value: 500 }, uRatio: { value: this.renderer.getPixelRatio() } }, vertexShader: `attribute vec3 origin;attribute float alpha;attribute float released;varying vec3 vColor;varying float vAlpha;uniform float uHeight;uniform float uRatio;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vec3 normal=normalize(mat3(modelViewMatrix)*origin);float light=mix(.4+.65*max(0.,normal.z),1.,released);vColor=color*light;vAlpha=alpha;gl_Position=projectionMatrix*mv;gl_PointSize=clamp(.055*uHeight*projectionMatrix[1][1]/max(.2,-mv.z),1.7,6.)*uRatio;}`, fragmentShader: `varying vec3 vColor;varying float vAlpha;void main(){vec2 p=(gl_PointCoord-.5)*2.;float r=dot(p,p);if(r>1.||vAlpha<.001)discard;float soft=(exp(-r*3.)-exp(-3.))/(1.-exp(-3.));float density=.55*exp(-r*12.)+.45*soft;gl_FragColor=vec4(vColor,vAlpha*density);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  }`, vertexColors: true, transparent: true, depthWrite: false });
        this.gas = new THREE.Points(geometry, material);
        this.gas.frustumCulled = false;
        this.scene.add(this.gas, this.hole);
        const circle = Array.from({ length: 160 }, (_, i) => new THREE.Vector3(Math.cos(i / 160 * Math.PI * 2), Math.sin(i / 160 * Math.PI * 2), 0));
        this.ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circle), new THREE.LineDashedMaterial({ color: 0x64beba, dashSize: .06, gapSize: .06, transparent: true, opacity: .4 }));
        this.ring.computeLineDistances();
        this.scene.add(this.ring);
        this.path = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x7285a3, transparent: true, opacity: .20 }));
        this.scene.add(this.path);
        const bg = new Float32Array(550 * 3);
        for (let i = 0; i < 550; i++) {
            const a = i * 2.39996, z = Math.sin(i * 74.717), r = 70;
            bg.set([r * Math.sqrt(1 - z * z) * Math.cos(a), r * Math.sqrt(1 - z * z) * Math.sin(a), r * z], i * 3);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(bg, 3));
        this.scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x6a839e, size: .12, transparent: true, opacity: .4 })));
        this.data = this.select('rocky', 'safe');
        this.observer = new ResizeObserver(() => this.resize());
        this.observer.observe(canvas);
        this.resize();
    }
    select(planet: Planet, route: Route) {
        const key = planet + route;
        let data = this.cache.get(key);
        if (!data) {
            if (this.cache.size >= 2)
                this.cache.delete(this.cache.keys().next().value!);
            data = buildEncounter(planet, route);
            this.cache.set(key, data);
        }
        this.data = data;
        const origin = this.gas.geometry.attributes.origin.array as Float32Array, c = centerAt(-12, PERICENTER[route]);
        for (let i = 0; i < PARTICLES; i++) {
            origin[i * 3] = data.positions[i * 3] - c.x;
            origin[i * 3 + 1] = data.positions[i * 3 + 1] - c.y;
            origin[i * 3 + 2] = data.positions[i * 3 + 2];
        }
        this.gas.geometry.attributes.origin.needsUpdate = true;
        this.ring.scale.setScalar(tidalRadius(planet));
        this.path.geometry.dispose();
        this.path.geometry = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 180 }, (_, i) => { const p = centerAt(-12 + i / 179 * 32, PERICENTER[route]); return new THREE.Vector3(p.x, p.y, 0); }));
        return data;
    }
    private resize() { this.needsRender = true; const box = this.canvas.getBoundingClientRect(); this.camera.aspect = box.width / Math.max(1, box.height); updateTeachingLens(this.camera, this.controls.target); const lensScale = teachingDistanceScale(this.camera.aspect); this.controls.minDistance = 1.1 * lensScale; this.controls.maxDistance = 38 * lensScale; this.renderer.setSize(box.width, box.height, false); this.gas.material.uniforms.uHeight.value = box.height; }
    draw(progress: number, _planet: Planet, route: Route, guides: boolean, view: View = 'overview') {
        const key = [progress, _planet, route, guides, view].join(":");
        if (key === this.lastKey && !this.needsRender && performance.now() - this.cameraStarted >= 900) return;
        this.lastKey = key;
        const sample = progress * (FRAMES - 1), f = Math.min(FRAMES - 2, Math.floor(sample)), mix = sample - f, data = this.data;
        const positions = this.gas.geometry.attributes.position.array as Float32Array, colors = this.gas.geometry.attributes.color.array as Float32Array, alpha = this.gas.geometry.attributes.alpha.array as Float32Array, released = this.gas.geometry.attributes.released.array as Float32Array;
        for (let i = 0; i < PARTICLES; i++) {
            const a = f * PARTICLES + i, b = a + PARTICLES;
            for (let d = 0; d < 3; d++)
                positions[i * 3 + d] = data.positions[a * 3 + d] * (1 - mix) + data.positions[b * 3 + d] * mix;
            const heat = data.emission[a] * (1 - mix) + data.emission[b] * mix;
            this.emissionWeights[i] = heat;
            colors[i * 3] = data.colors[i * 3] * (1 - heat) + 1.7 * heat;
            colors[i * 3 + 1] = data.colors[i * 3 + 1] * (1 - heat) + .85 * heat;
            colors[i * 3 + 2] = data.colors[i * 3 + 2] * (1 - heat) + .27 * heat;
            alpha[i] = data.states[a] === 2 ? 0 : data.states[b] === 2 ? 1 - mix : 1;
            released[i] = data.states[a] > 0 ? 1 : 0;
        }
        Object.values(this.gas.geometry.attributes).forEach(a => a.needsUpdate = true);
        this.ring.visible = guides;
        this.path.visible = guides;
        this.emission.update(positions, this.emissionWeights);
        this.hole.setEmissionMap(this.emission.texture, this.emission.extent);
        this.hole.setAccretion(progress * 32, 1);
        if (this.view !== view) {
            this.fromCamera.copy(this.camera.position); this.fromTarget.copy(this.controls.target); this.fromUp.copy(this.camera.up);
            this.cameraStarted = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? -Infinity : performance.now();
            this.view = view;
            this.controls.enabled = view === 'free';
        }
        if (view !== 'free') {
            const center = centerAt(-12 + progress * 32, PERICENTER[route]), target = view === 'close' ? new THREE.Vector3() : new THREE.Vector3(center.x * .25, center.y * .25, 0);
            const distance = (view === 'close' ? 2.8 : Math.max(17, 13 / this.camera.aspect)) * teachingDistanceScale(this.camera.aspect);
            this.controls.target.copy(target);
            this.camera.position.copy(target).add(view === 'top' ? new THREE.Vector3(0, 0, distance) : new THREE.Vector3(0, -distance * (view === 'close' ? .98 : .80), distance * (view === 'close' ? .20 : .62)));
            this.camera.up.set(0, 0, 1);
            if (view === 'top')
                this.camera.up.set(0, 1, 0);
            const elapsed = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : Math.min(1, Math.max(0, (performance.now() - this.cameraStarted) / 900));
            const blend = elapsed * elapsed * (3 - 2 * elapsed);
            if (blend < 1) {
                this.camera.position.lerpVectors(this.fromCamera, this.camera.position.clone(), blend);
                this.controls.target.lerpVectors(this.fromTarget, target, blend);
                this.camera.up.lerpVectors(this.fromUp, this.camera.up.clone(), blend).normalize();
            }
            this.camera.lookAt(this.controls.target);
        }
        this.controls.update();
        this.camera.updateMatrixWorld();
        // Back-to-front order preserves the visible surface instead of mixing the far side through it.
        const m = this.camera.matrixWorldInverse.elements;
        for (let i = 0; i < PARTICLES; i++)
            this.depth[i] = m[2] * positions[i * 3] + m[6] * positions[i * 3 + 1] + m[10] * positions[i * 3 + 2];
        this.order.sort((a, b) => this.depth[a] - this.depth[b]);
        this.gas.geometry.index!.array.set(this.order);
        this.gas.geometry.index!.needsUpdate = true;
        this.renderer.render(this.scene, this.camera);
        this.needsRender = false;
    }
    dispose() { this.emission.dispose(); this.observer.disconnect(); this.controls.dispose(); this.cache.clear(); this.scene.traverse(o => { if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Line) {
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
            m.dispose();
    } }); this.renderer.dispose(); }
}
