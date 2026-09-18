import type { EncounterResponse } from './encounterWorker.ts';
import { DebrisEmission } from './emission.ts';
import { teachingDistanceScale, updateTeachingLens } from '../../src/visuals/teachingCamera.ts';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BlackHoleOptics } from '../../src/visuals/blackHoleOptics.ts';
import { centerAt, encounterTime, tidalRadius, PERICENTER, PARTICLES, FRAMES } from './model.ts';
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
    data?: Encounter;
    loading = false;
    error = false;
    private worker: Worker | null = null;
    private gas: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
    private emission = new DebrisEmission();
    private emissionWeights = new Float32Array(PARTICLES);
    private trailVertices = new Float32Array(18 * 24 * 6);
    private trailColors = new Float32Array(18 * 24 * 6);
    private trails = new THREE.LineSegments(new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .38, depthWrite: false }));
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
        for (const [name, size] of [['position', 3], ['previous', 3], ['origin', 3], ['color', 3], ['alpha', 1], ['released', 1]] as const)
            geometry.setAttribute(name, new THREE.BufferAttribute(new Float32Array(PARTICLES * size), size).setUsage(THREE.DynamicDrawUsage));
        geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(this.order), 1).setUsage(THREE.DynamicDrawUsage));
        const material = new THREE.ShaderMaterial({
            uniforms: { uHeight: { value: 500 }, uRatio: { value: this.renderer.getPixelRatio() } },
            vertexShader: `attribute vec3 origin;attribute vec3 previous;attribute float alpha;attribute float released;
            varying vec3 vColor;varying float vAlpha;varying vec2 vDirection;varying float vAspect;
            uniform float uHeight;uniform float uRatio;
            void main(){
              vec4 mv=modelViewMatrix*vec4(position,1.);vec4 clip=projectionMatrix*mv;
              vec4 prev=projectionMatrix*modelViewMatrix*vec4(previous,1.);
              vec2 motion=clip.xy/clip.w-prev.xy/prev.w;
              motion.x*=projectionMatrix[1][1]/projectionMatrix[0][0];
              vDirection=length(motion)>.000001?normalize(motion):vec2(1.,0.);
              vAspect=1.+released*min(1.8,length(motion)*35.);
              vec3 normal=normalize(mat3(modelViewMatrix)*origin);
              float light=mix(.4+.65*max(0.,normal.z),1.,released);
              vColor=color*light;vAlpha=alpha;gl_Position=clip;
              gl_PointSize=clamp(.047*uHeight*projectionMatrix[1][1]/max(.2,-mv.z)*vAspect,1.5,8.)*uRatio;
            }`,
            fragmentShader: `varying vec3 vColor;varying float vAlpha;varying vec2 vDirection;varying float vAspect;
            void main(){vec2 p=(gl_PointCoord-.5)*2.;vec2 d=vec2(vDirection.x,-vDirection.y);
              float along=dot(p,d),across=dot(p,vec2(-d.y,d.x))*vAspect;
              float r=along*along+across*across;if(r>1.||vAlpha<.001)discard;
              float soft=(exp(-r*3.)-exp(-3.))/(1.-exp(-3.));float density=.55*exp(-r*12.)+.45*soft;
              gl_FragColor=vec4(vColor,vAlpha*density);
              #include <tonemapping_fragment>
              #include <colorspace_fragment>
            }`, vertexColors: true, transparent: true, depthWrite: false });
        this.gas = new THREE.Points(geometry, material);
        this.gas.frustumCulled = false;
        this.trails.geometry.setAttribute('position', new THREE.BufferAttribute(this.trailVertices, 3).setUsage(THREE.DynamicDrawUsage));
        this.trails.geometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3).setUsage(THREE.DynamicDrawUsage));
        this.trails.frustumCulled = false;
        this.scene.add(this.gas, this.hole, this.trails);
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
        this.select('rocky', 'safe');
        this.observer = new ResizeObserver(() => this.resize());
        this.observer.observe(canvas);
        this.resize();
    }
    select(planet: Planet, route: Route) {
        this.worker?.terminate(); this.worker = null;
        this.data = undefined; this.error = false; this.loading = true;
        this.gas.visible = this.trails.visible = false;
        this.emissionWeights.fill(0);
        this.emission.update(this.gas.geometry.attributes.position.array as Float32Array, this.emissionWeights);
        this.hole.setAccretion(0, 0); this.needsRender = true;
        const key = planet + route, cached = this.cache.get(key);
        if (cached) { this.install(cached, planet, route); return; }
        try {
            const worker = new Worker(new URL('./encounterWorker.ts', import.meta.url), { type: 'module' });
            this.worker = worker;
            const fail = () => {
                if (this.worker !== worker) return;
                worker.terminate(); this.worker = null; this.loading = false; this.error = true;
            };
            worker.onmessage = ({ data: response }: MessageEvent<EncounterResponse>) => {
                if (this.worker !== worker) return;
                if ('error' in response) { fail(); return; }
                worker.terminate(); this.worker = null;
                if (this.cache.size >= 2) this.cache.delete(this.cache.keys().next().value!);
                this.cache.set(key, response.data);
                this.install(response.data, planet, route);
            };
            worker.onerror = fail;
            worker.postMessage({ planet, route });
        } catch { this.loading = false; this.error = true; }
    }
    private install(data: Encounter, planet: Planet, route: Route) {
        this.data = data; this.loading = false; this.gas.visible = true;
        this.needsRender = true; this.lastKey = '';
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
    }
    private resize() { this.needsRender = true; const box = this.canvas.getBoundingClientRect(); this.camera.aspect = box.width / Math.max(1, box.height); updateTeachingLens(this.camera, this.controls.target); const lensScale = teachingDistanceScale(this.camera.aspect); this.controls.minDistance = 1.1 * lensScale; this.controls.maxDistance = 38 * lensScale; this.renderer.setSize(box.width, box.height, false); this.gas.material.uniforms.uHeight.value = box.height; }
    draw(progress: number, _planet: Planet, route: Route, guides: boolean, view: View = 'overview') {
        if (!this.data) return;
        const key = [progress, _planet, route, guides, view].join(":");
        if (key === this.lastKey && !this.needsRender && performance.now() - this.cameraStarted >= 900) return;
        this.lastKey = key;
        const sample = progress * (FRAMES - 1), f = Math.min(FRAMES - 2, Math.floor(sample)), mix = sample - f, data = this.data;
        const positions = this.gas.geometry.attributes.position.array as Float32Array, colors = this.gas.geometry.attributes.color.array as Float32Array, alpha = this.gas.geometry.attributes.alpha.array as Float32Array, released = this.gas.geometry.attributes.released.array as Float32Array;
        const previous = this.gas.geometry.attributes.previous.array as Float32Array;
        for (let i = 0; i < PARTICLES; i++) {
            const a = f * PARTICLES + i, b = a + PARTICLES;
            for (let d = 0; d < 3; d++)
                positions[i * 3 + d] = data.positions[a * 3 + d] * (1 - mix) + data.positions[b * 3 + d] * mix;
            for (let d = 0; d < 3; d++) previous[i * 3 + d] = data.positions[(Math.max(0, f - 2) * PARTICLES + i) * 3 + d] * (1 - mix)
                + data.positions[(Math.max(0, f - 1) * PARTICLES + i) * 3 + d] * mix;
            const heat = data.emission[a] * (1 - mix) + data.emission[b] * mix;
            this.emissionWeights[i] = heat;
            colors[i * 3] = data.colors[i * 3] * (1 - heat) + 1.7 * heat;
            colors[i * 3 + 1] = data.colors[i * 3 + 1] * (1 - heat) + .85 * heat;
            colors[i * 3 + 2] = data.colors[i * 3 + 2] * (1 - heat) + .27 * heat;
            alpha[i] = data.states[a] === 2 ? 0 : data.states[b] === 2 ? 1 - mix : 1;
            released[i] = data.states[a] > 0 ? 1 : 0;
        }
        Object.values(this.gas.geometry.attributes).forEach(a => a.needsUpdate = true);
        this.updateTrails(sample);
        this.trails.visible = guides;
        this.ring.visible = guides;
        this.path.visible = guides && data.released[f] === 0;
        this.emission.update(positions, this.emissionWeights);
        this.hole.setEmissionMap(this.emission.texture, this.emission.extent);
        this.hole.setAccretion(progress * 32, 1);
        if (this.view !== view) {
            this.fromCamera.copy(this.camera.position); this.fromTarget.copy(this.controls.target); this.fromUp.copy(this.camera.up);
            this.cameraStarted = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? -Infinity : performance.now();
            this.view = view;
            this.controls.enabled = view === 'free';
        }
        if (view !== 'free') this.frameCamera(progress, route, view);
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
        this.needsRender = view !== 'free' && performance.now() - this.cameraStarted < 900;
    }
    private frameCamera(progress: number, route: Route, view: View) {
        const data = this.data!;
        const center = centerAt(encounterTime(progress, data.released[FRAMES-1]>0), PERICENTER[route]);
        const disrupted = data.released[FRAMES - 1] > 0;
        const stage = Math.max(0, Math.min(1, (progress - .4) / .25));
        const returning = disrupted ? stage * stage * (3 - 2 * stage) : 0;
        // Fixed late composition; a particle leaving the old radius-18
        // selection must not move or resize the whole scene.
        const target = view === 'close' ? new THREE.Vector3() : new THREE.Vector3(
            center.x*.5*(1-returning)-4*returning,
            center.y*.5*(1-returning)+3*returning,0);
        const initialWidth = Math.abs(center.x) + 4, initialHeight = Math.abs(center.y) + 4;
        const width = initialWidth * (1-returning) + 22*returning;
        const height = (initialHeight*(1-returning)+22*returning)*(view==='top'?1:.7);
        const fit = Math.max(width/this.camera.aspect, height) / (2*Math.tan(this.camera.fov*Math.PI/360));
        const distance = view === 'close' ? 6.8*teachingDistanceScale(this.camera.aspect)
            : Math.max(Math.max(17,13/this.camera.aspect)*teachingDistanceScale(this.camera.aspect),fit);
        this.controls.target.copy(target);
        this.camera.position.copy(target).add(view === 'top' ? new THREE.Vector3(0, 0, distance) : new THREE.Vector3(0, -distance * (view === 'close' ? .94 : .80), distance * (view === 'close' ? .34 : .62)));
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
    private updateTrails(frame: number) {
        let at=0;
        const data=this.data!, current=Math.min(FRAMES-1,Math.floor(frame));
        for(let n=0;n<18;n++) {
            const i=Math.floor((n+.5)/18*PARTICLES);
            if(!data.bound[i] || data.states[current*PARTICLES+i]!==1) continue;
            for(let k=0;k<24;k++) for(let end=0;end<2;end++) {
                const sample=Math.max(0,frame-(24-k-end)*1.5), f=Math.min(FRAMES-2,Math.floor(sample)), mix=sample-f;
                const glow=.08+.92*((k+end)/24)**2;
                for(let d=0;d<3;d++) {
                    this.trailVertices[at]=data.positions[(f*PARTICLES+i)*3+d]*(1-mix)+data.positions[((f+1)*PARTICLES+i)*3+d]*mix;
                    this.trailColors[at++]=[.22,.52,.64][d]*glow;
                }
            }
        }
        this.trails.geometry.setDrawRange(0,at/3);
        this.trails.geometry.attributes.position.needsUpdate=true;
        this.trails.geometry.attributes.color.needsUpdate=true;
    }
    dispose() { this.worker?.terminate(); this.worker=null; this.emission.dispose(); this.observer.disconnect(); this.controls.dispose(); this.cache.clear(); this.scene.traverse(o => { if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Line) {
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
            m.dispose();
    } }); this.renderer.dispose(); }
}
