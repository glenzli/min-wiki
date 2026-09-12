import { teachingDistanceScale, updateTeachingLens } from '../../src/visuals/teachingCamera.ts';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BlackHoleOptics } from '../../src/visuals/blackHoleOptics.ts';
import { DONOR_X, HOLE_X, DONOR_LOBE, donorRadius, streamParcel, seedValue, transferPath } from './model.ts';
import type { Scenario } from './model.ts';
import { t } from './i18n.ts';
export type { Scenario } from './model.ts';
export type View = 'overview' | 'close' | 'top' | 'free';
const GAS_COUNT = 3200, WIND_COUNT = 1300;
export class CompanionScene {
    private needsRender = true;
    private lastKey = "";
    private scene = new THREE.Scene();
    private root = new THREE.Group();
    private camera = new THREE.PerspectiveCamera(42, 1, .01, 3000);
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private observer: ResizeObserver;
    private star: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
    private hole = new BlackHoleOptics(.22);
    private gas: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
    private guides = new THREE.Group();
    private lobe: THREE.LineLoop;
    private tracer = new THREE.Mesh(new THREE.SphereGeometry(.035, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff8d1 }));
    private labels: HTMLDivElement[] = [];
    private currentView: View = 'overview';
    private width = 1;
    private height = 1;
    constructor(private canvas: HTMLCanvasElement) {
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
        this.renderer.setClearColor(0x030812);
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.controls = new OrbitControls(this.camera, canvas);
        this.controls.addEventListener("change", () => { this.needsRender = true; });
        this.controls.enablePan = false;
        this.controls.minDistance = 1.2;
        this.controls.maxDistance = 28;
        this.controls.enabled = false;
        this.scene.add(this.root);
        this.root.add(this.hole);
        this.hole.position.x = HOLE_X;
        const starMaterial = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uBlue: { value: 0 } }, vertexShader: `varying vec3 vP;varying vec3 vN;varying vec3 vV;void main(){vP=position;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=-mv.xyz;gl_Position=projectionMatrix*mv;}`, fragmentShader: `
  varying vec3 vP;varying vec3 vN;varying vec3 vV;uniform float uTime;uniform float uBlue;
  float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  void main(){float n=noise(vP*23.+uTime*.03)*.7+noise(vP*55.-uTime*.02)*.3;float limb=pow(max(0.,dot(normalize(vN),normalize(vV))),.38);vec3 warm=mix(vec3(1.1,.39,.06),vec3(2.0,1.3,.48),n),blue=mix(vec3(.33,.67,1.),vec3(1.5,1.8,2.1),n);gl_FragColor=vec4(mix(warm,blue,uBlue)*(.45+.65*limb),1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  }` });
        this.star = new THREE.Mesh(new THREE.SphereGeometry(1, 72, 48), starMaterial);
        this.star.position.x = DONOR_X;
        this.root.add(this.star);
        const geometry = new THREE.BufferGeometry();
        for (const [name, size] of [['position', 3], ['color', 3], ['alpha', 1]] as const)
            geometry.setAttribute(name, new THREE.BufferAttribute(new Float32Array((GAS_COUNT + WIND_COUNT) * size), size).setUsage(THREE.DynamicDrawUsage));
        const material = new THREE.ShaderMaterial({ uniforms: { uHeight: { value: 500 }, uRatio: { value: this.renderer.getPixelRatio() } }, vertexShader: `attribute float alpha;varying vec3 vColor;varying float vAlpha;uniform float uHeight;uniform float uRatio;void main(){vColor=color;vAlpha=alpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(.027*uHeight*projectionMatrix[1][1]/max(.3,-mv.z),1.4,5.)*uRatio;}`, fragmentShader: `varying vec3 vColor;varying float vAlpha;void main(){vec2 p=(gl_PointCoord-.5)*2.;float r=dot(p,p);if(r>1.||vAlpha<.001)discard;float density=.65*exp(-r*10.)+.35*(exp(-r*3.)-exp(-3.))/(1.-exp(-3.));gl_FragColor=vec4(vColor,density*vAlpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  }`, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.NormalBlending });
        this.gas = new THREE.Points(geometry, material);
        this.gas.frustumCulled = false;
        this.root.add(this.gas, this.tracer, this.guides);
        this.lobe = this.circle(DONOR_LOBE, DONOR_X, 0x699eab);
        this.lobe.scale.y = .93;
        this.lobe.scale.x = 1.1;
        this.guides.add(this.lobe);
        for (const r of [Math.abs(DONOR_X), HOLE_X]) {
            const ring = this.circle(r, 0, 0x334955);
            this.scene.add(ring);
            ring.userData.orbitGuide = true;
        }
        const positions = new Float32Array(700 * 3);
        for (let i = 0; i < 700; i++) {
            const phi = seedValue(i) * Math.PI * 2, z = seedValue(i + 1111) * 2 - 1, r = 65;
            positions.set([r * Math.sqrt(1 - z * z) * Math.cos(phi), r * Math.sqrt(1 - z * z) * Math.sin(phi), r * z], i * 3);
        }
        const bg = new THREE.BufferGeometry();
        bg.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.scene.add(new THREE.Points(bg, new THREE.PointsMaterial({ size: .11, color: 0x678297, transparent: true, opacity: .48, depthWrite: false })));
        for (let i = 0; i < 3; i++) {
            const label = document.createElement('div');
            label.className = 'object-label';
            canvas.parentElement!.append(label);
            this.labels.push(label);
        }
        this.observer = new ResizeObserver(() => this.resize());
        this.observer.observe(canvas);
        this.resize();
    }
    private circle(radius: number, x: number, color: number) { const points = Array.from({ length: 160 }, (_, i) => new THREE.Vector3(Math.cos(i / 160 * Math.PI * 2) * radius, Math.sin(i / 160 * Math.PI * 2) * radius, 0)); const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, transparent: true, opacity: .5 })); line.position.x = x; return line; }
    private resize() { this.needsRender = true; const box = this.canvas.getBoundingClientRect(); this.width = box.width; this.height = box.height; this.camera.aspect = box.width / Math.max(1, box.height); updateTeachingLens(this.camera, this.controls.target); const lensScale = teachingDistanceScale(this.camera.aspect); this.controls.minDistance = 1.2 * lensScale; this.controls.maxDistance = 28 * lensScale; this.renderer.setSize(box.width, box.height, false); if (this.gas)
        this.gas.material.uniforms.uHeight.value = box.height; }
    draw(progress: number, scenario: Scenario, guides: boolean, view: View, showOrbit = false) {
        const key = [progress, scenario, guides, view, showOrbit].join(":");
        if (key === this.lastKey && !this.needsRender) return;
        this.lastKey = key;
        const time = progress * 32;
        this.root.rotation.z = showOrbit ? progress * Math.PI * 2 : 0;
        const radius = donorRadius(scenario);
        this.star.scale.set(radius * (scenario === 'overflow' ? 1.1 : 1), radius, radius);
        this.star.material.uniforms.uTime.value = time;
        this.star.material.uniforms.uBlue.value = scenario === 'wind' ? 1 : 0;
        this.hole.setAccretion(time, scenario === 'detached' ? 0 : 1);
        this.guides.visible = guides && scenario !== 'wind';
        this.lobe.visible = scenario !== 'wind';
        this.scene.children.forEach(x => { if (x.userData.orbitGuide)
            x.visible = guides && showOrbit; });
        const positions = this.gas.geometry.attributes.position.array as Float32Array, colors = this.gas.geometry.attributes.color.array as Float32Array, alphas = this.gas.geometry.attributes.alpha.array as Float32Array;
        for (let i = 0; i < GAS_COUNT + WIND_COUNT; i++) {
            if (i < GAS_COUNT) {
                const p = streamParcel(i, time, scenario);
                positions.set([p.x, p.y, p.z], i * 3);
                colors.set([1.2 + p.heat * .7, .5 + p.heat * .6, .15 + p.heat * .4], i * 3);
                alphas[i] = scenario === 'detached' ? 0 : p.alpha * .44;
            }
            else {
                const age = (seedValue(i) + time * .065) % 1, a = seedValue(i + 4401) * Math.PI * 2, lat = seedValue(i + 7601) * 2 - 1, r = radius + age * 4;
                positions.set([DONOR_X + r * Math.sqrt(1 - lat * lat) * Math.cos(a), r * Math.sqrt(1 - lat * lat) * Math.sin(a), r * lat * .7], i * 3);
                colors.set([.65, .84, 1], i * 3);
                alphas[i] = scenario === 'wind' ? Math.sin(age * Math.PI) * .26 : 0;
            }
        }
        Object.values(this.gas.geometry.attributes).forEach(a => a.needsUpdate = true);
        const marker = transferPath(progress, scenario);
        this.tracer.position.set(marker.x, marker.y, .03);
        this.tracer.visible = scenario !== 'detached' && progress < .995;
        if (view !== this.currentView) {
            this.currentView = view;
            this.controls.enabled = view === 'free';
        }
        this.root.updateMatrixWorld(true);
        if (view !== 'free') {
            const target = view === 'close' ? this.hole.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(.35, 0, 0);
            const distance = (view === 'close' ? 3.1 : Math.max(12.3, 10.5 / this.camera.aspect)) * teachingDistanceScale(this.camera.aspect);
            this.controls.target.copy(target);
            this.camera.position.copy(target).add(view === 'top' ? new THREE.Vector3(0, 0, distance) : new THREE.Vector3(0, -distance * (view === 'close' ? .98 : .92), distance * (view === 'close' ? .20 : .42)));
            this.camera.up.set(0, 0, 1);
            if (view === 'top')
                this.camera.up.set(0, 1, 0);
            this.camera.lookAt(target);
        }
        this.controls.update();
        this.camera.updateMatrixWorld();
        this.renderer.render(this.scene, this.camera);
        const items = [{ point: new THREE.Vector3(DONOR_X, 0, radius + .22), text: t('伴星 · 外层气体的来源') }, { point: new THREE.Vector3(HOLE_X, 0, -.48), text: scenario === 'detached' ? t('恒星级黑洞') : t('黑洞周围的吸积盘') }, { point: new THREE.Vector3(1.05, -.2, .58), text: scenario === 'wind' ? t('被捕获的部分恒星风') : t('从伴星流出的气体') }];
        this.needsRender = false;
        items.forEach((item, i) => { const v = this.root.localToWorld(item.point).project(this.camera), label = this.labels[i]; label.hidden = Math.abs(v.x) > .91 || Math.abs(v.y) > .74 || v.z > 1 || (i === 2 && scenario === 'detached') || (view === 'close' && i !== 1); label.textContent = item.text; label.style.left = `${(v.x + 1) * this.width / 2}px`; label.style.top = `${(1 - v.y) * this.height / 2}px`; });
    }
    dispose() { this.observer.disconnect(); this.controls.dispose(); this.labels.forEach(x => x.remove()); this.scene.traverse(o => { if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Line) {
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
            m.dispose();
    } }); this.renderer.dispose(); }
}
