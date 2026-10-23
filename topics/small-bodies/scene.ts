import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { cometFrame, tailPoint, earthFrame, reservoirPoints, specimenPoint, DISPLAY_RADII, random01, TAU,
  type SmallBodiesState, type Specimen, type Reservoir } from './model.ts';

export interface SceneLabels {
  sun: string; nucleus: string; ion: string; dustTail: string; earth: string;
  main: string; kuiper: string; dustCloud: string; oort: string; mars: string; jupiter: string; neptune: string;
}
interface CameraPose { position: THREE.Vector3; target: THREE.Vector3; automatic?: boolean }
interface SceneLabel {
  node: HTMLElement; connector: SVGPathElement; dot: SVGCircleElement;
  anchor: THREE.Vector3; keys: string[]; condition?: () => boolean;
}
const vector = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/** One retained renderer, finite scene graphs and demand-driven frames. Camera state is separate. */
export class SmallBodiesScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(36, 1, .015, 500);
  private controls: OrbitControls;
  private groups = { shapes: new THREE.Group(), comet: new THREE.Group(), belts: new THREE.Group() };
  private specimens = new Map<Specimen, THREE.Mesh>();
  private reservoirs = new Map<Reservoir, THREE.Group>();
  private sunlight = new THREE.DirectionalLight(0xffecd0, 3.5);
  private nucleus: THREE.Mesh;
  private coma: THREE.Group;
  private ion: THREE.Points;
  private dust: THREE.Points;
  private jets: THREE.LineSegments;
  private earth = new THREE.Mesh(new THREE.SphereGeometry(DISPLAY_RADII.earth, 24, 16), new THREE.MeshBasicMaterial({ color: 0x8abdd5 }));
  private earthHalo = new THREE.Mesh(new THREE.SphereGeometry(DISPLAY_RADII.earthHalo, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffd5a1, transparent: true, opacity: .5, depthWrite: false }));
  private state: SmallBodiesState;
  private key = '';
  private poses = new Map<string, CameraPose>();
  private labels: SceneLabel[] = [];
  private cometAnchor = vector();
  private ionAnchor = vector();
  private dustAnchor = vector();
  private earthAnchor = vector();
  private observer: ResizeObserver;
  private frame = 0;
  private disposed = false;
  private failed = false;
  private previousComet = vector();
  private projecting = vector();
  private automaticCamera = true;
  private leaders = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  private framePoints = new Map<string, THREE.Vector3[]>();

  constructor(private host: HTMLElement, initial: SmallBodiesState, words: SceneLabels, private onFailure: () => void) {
    this.state = { ...initial };
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
    this.renderer.setClearColor(0x080d15, 1);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.16;
    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.setAttribute('aria-label', host.getAttribute('aria-label') ?? 'Interactive 3D model');
    this.renderer.domElement.setAttribute('aria-describedby', 'sb-gesture-note');
    host.prepend(this.renderer.domElement);
    this.leaders.classList.add('sb3d-leaders'); this.leaders.setAttribute('aria-hidden', 'true'); host.append(this.leaders);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = false;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = .65;
    this.controls.zoomSpeed = .7;
    this.controls.minPolarAngle = .08;
    this.controls.maxPolarAngle = Math.PI - .08;
    this.controls.addEventListener('change', this.requestRender);
    this.controls.addEventListener('start', this.manualCamera);
    this.scene.add(new THREE.AmbientLight(0xd5dced, 1.0), this.sunlight);
    this.scene.add(this.groups.shapes, this.groups.comet, this.groups.belts);
    this.buildStars();
    for (const specimen of ['carbon', 'silicate', 'metal', 'ceres'] as const) {
      const mesh = this.rock(specimen); this.specimens.set(specimen, mesh); this.groups.shapes.add(mesh);
    }
    this.nucleus = this.rock('carbon'); this.nucleus.scale.setScalar(DISPLAY_RADII.nucleus); this.nucleus.rotation.set(.3, .8, -.1);
    this.groups.comet.add(this.nucleus);
    this.coma = new THREE.Group();
    // A smooth column-density cue avoids implying discrete solid shells.
    const comaMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
      vertexShader: 'varying vec3 n;varying vec3 v;void main(){n=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.0);v=-p.xyz;gl_Position=projectionMatrix*p;}',
      fragmentShader: 'varying vec3 n;varying vec3 v;void main(){float mu=max(0.0,dot(normalize(n),normalize(v)));float r2=1.0-mu*mu;float a=.17*exp(-r2*5.0)*smoothstep(0.0,.35,mu);gl_FragColor=vec4(.72,.78,.75,a);}',
    });
    this.coma.add(new THREE.Mesh(new THREE.SphereGeometry(.66, 32, 24), comaMaterial));
    this.groups.comet.add(this.coma);
    this.ion = this.tail(420, 0x86c8ec, .033);
    this.dust = this.tail(850, 0xd2bc98, .041);
    this.groups.comet.add(this.ion, this.dust);
    this.jets = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(8 * 6), 3)),
      new THREE.LineBasicMaterial({ color: 0xe4e2d6, transparent: true, opacity: .45 }));
    this.groups.comet.add(this.jets, this.sun(DISPLAY_RADII.cometSun), this.orbitLine());
    this.buildReservoirs();
    this.prepareFraming();
    this.addLabel(words.sun, vector(0, DISPLAY_RADII.cometSun, 0), ['comet', 'main', 'kuiper', 'dust', 'oort']);
    this.addLabel(words.nucleus, this.cometAnchor, ['comet']);
    this.addLabel(words.ion, this.ionAnchor, ['comet'], () => this.state.exposedIce && cometFrame(this.state.cometPhase).activity > .04);
    this.addLabel(words.dustTail, this.dustAnchor, ['comet'], () => this.state.exposedIce && cometFrame(this.state.cometPhase).activity > .04);
    this.addLabel(words.earth, this.earthAnchor, ['dust']);
    this.addLabel(words.main, vector(-2.7, .15, 0), ['main']);
    this.addLabel(words.mars, vector(0, 0, -1.52), ['main']);
    this.addLabel(words.jupiter, vector(0, 0, 5.2), ['main']);
    this.addLabel(words.kuiper, vector(-36, 1, 0), ['kuiper']);
    this.addLabel(words.neptune, vector(0, 0, 30), ['kuiper']);
    this.addLabel(words.dustCloud, vector(-2.2, .25, 1.5), ['dust']);
    this.addLabel(words.oort, vector(-7.5, 3, 0), ['oort']);
    this.observer = new ResizeObserver(this.resize); this.observer.observe(host);
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLost);
    this.renderer.domElement.addEventListener('keydown', this.keyboardCamera);
    this.renderer.domElement.tabIndex = 0;
    this.update(initial); this.resize();
  }

  private rock(specimen: Specimen) {
    const geometry = new THREE.SphereGeometry(1, 96, 64);
    const positions = geometry.getAttribute('position');
    const colors = new Float32Array(positions.count * 3);
    const base = new THREE.Color(specimen === 'carbon' ? '#757268' : specimen === 'silicate' ? '#a79a86' : specimen === 'metal' ? '#8c8982' : '#92928c');
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      const point = specimenPoint(x, y, z, specimen);
      positions.setXYZ(i, point.x, point.y, point.z);
      const shade = .86 + .1 * Math.sin(x * 32 + y * 13) * Math.cos(z * 29 - x * 11) + .1 * Math.sin(x * 5 + z * 7);
      colors[i * 3] = base.r * shade; colors[i * 3 + 1] = base.g * shade; colors[i * 3 + 2] = base.b * shade;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geometry.computeVertexNormals(); geometry.computeBoundingBox();
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .96, metalness: .015 });
    const mesh = new THREE.Mesh(geometry, material); mesh.rotation.set(.2, -.4, -.12); return mesh;
  }
  private buildStars() {
    const points = new Float32Array(220 * 3);
    for (let i = 0; i < 220; i++) {
      const phi = random01(i + 5010) * TAU, y = random01(i + 6000) * 2 - 1;
      points.set([200 * Math.sqrt(1 - y * y) * Math.cos(phi), 200 * y, 200 * Math.sqrt(1 - y * y) * Math.sin(phi)], i * 3);
    }
    this.scene.add(new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(points, 3)),
      new THREE.PointsMaterial({ color: 0xa8b7ca, size: 1.05, sizeAttenuation: false, transparent: true, opacity: .35, depthWrite: false })));
  }
  private sun(radius: number) {
    // Emission and stable, illustrative surface mottling distinguish the Sun from reflected rock.
    const material = new THREE.ShaderMaterial({
      vertexShader: `varying vec3 p; varying vec3 n; varying vec3 v;
        void main(){p=position;n=normalize(normalMatrix*normal);vec4 q=modelViewMatrix*vec4(position,1.0);v=-q.xyz;gl_Position=projectionMatrix*q;}`,
      fragmentShader: `varying vec3 p; varying vec3 n; varying vec3 v;
        void main(){
          vec3 s=normalize(p);float mu=max(0.0,dot(normalize(n),normalize(v)));
          float grain=.5+.24*sin(s.x*57.0+s.z*29.0)*sin(s.y*51.0-s.z*39.0)
            +.12*sin(s.x*19.0-s.y*23.0+s.z*17.0);
          vec3 color=mix(vec3(1.0,.45,.09),vec3(1.0,.84,.4),grain);
          gl_FragColor=vec4(color*(1.35+.4*sqrt(mu)),1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    return new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), material);
  }
  private circle(radius: number, color: number) {
    const points = Array.from({ length: 193 }, (_, i) => vector(radius * Math.cos(i / 192 * TAU), 0, radius * Math.sin(i / 192 * TAU)));
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, transparent: true, opacity: .65 }));
  }
  private orbitLine() {
    const points = Array.from({ length: 321 }, (_, i) => { const f = cometFrame(i / 320); return vector(f.x, 0, f.z); });
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x6b7e91, transparent: true, opacity: .65 }));
  }
  private tail(count: number, color: number, size: number) {
    const material = new THREE.PointsMaterial({ color, size, sizeAttenuation: true, transparent: true, opacity: .6, depthWrite: false });
    material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_particle_fragment>',
        '#include <map_particle_fragment>\nfloat r=length(gl_PointCoord-vec2(.5))*2.0;if(r>1.0)discard;diffuseColor.a*=exp(-r*r*2.0)*(1.0-smoothstep(.6,1.0,r));');
    };
    material.customProgramCacheKey = () => 'small-bodies-soft-tail-v1';
    return new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3)),
      material);
  }
  private buildReservoirs() {
    for (const region of ['main', 'kuiper', 'dust', 'oort'] as const) {
      const group = new THREE.Group();
      group.add(this.sun(region === 'kuiper' ? DISPLAY_RADII.kuiperSun : region === 'oort' ? DISPLAY_RADII.oortSun
        : region === 'dust' ? DISPLAY_RADII.dustSun : DISPLAY_RADII.mainSun));
      group.add(new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(reservoirPoints(region), 3)),
        new THREE.PointsMaterial({ color: region === 'kuiper' ? 0xa0b9c9 : region === 'dust' ? 0xbfac8f : region === 'oort' ? 0xb7bdc7 : 0xc3b8a3,
          size: region === 'kuiper' ? 2.2 : region === 'dust' ? 1.4 : 2.6, sizeAttenuation: false,
          transparent: true, opacity: region === 'dust' ? .4 : .8, depthWrite: false })));
      if (region === 'main') { group.add(this.circle(1.52, 0x7d6e5a), this.circle(5.2, 0x655d53)); }
      if (region === 'kuiper') group.add(this.circle(30, 0x51667d));
      if (region === 'dust') {
        group.add(this.circle(1, 0x678597), this.orbitLine(), this.earth, this.earthHalo);
        const stream = new Float32Array(400 * 3);
        for (let i = 0; i < 400; i++) {
          const f = cometFrame(random01(i + 9500));
          const width = (random01(i + 9100) - .5) * .09;
          stream.set([f.x + width, (random01(i + 9800) - .5) * .06, f.z + width], i * 3);
        }
        group.add(new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(stream, 3)),
          new THREE.PointsMaterial({ color: 0xe2c8a0, size: 2.2, sizeAttenuation: false, transparent: true, opacity: .8 })));
      }
      if (region === 'oort') {
        for (const radius of [6, 10.5]) {
          const ring = this.circle(radius, 0x344252); group.add(ring);
          const second = this.circle(radius, 0x344252); second.rotation.x = Math.PI / 2; group.add(second);
        }
      }
      this.reservoirs.set(region, group); this.groups.belts.add(group);
    }
  }
  private addLabel(text: string, anchor: THREE.Vector3, keys: string[], condition?: () => boolean) {
    const node = document.createElement('span'); node.className = 'sb3d-label'; node.textContent = text;
    const connector = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); dot.setAttribute('r', '2');
    this.leaders.append(connector, dot);
    node.setAttribute('aria-hidden', 'true'); this.host.append(node); this.labels.push({ node, connector, dot, anchor, keys, condition });
  }
  private prepareFraming() {
    for (const [specimen, mesh] of this.specimens) {
      mesh.updateMatrixWorld(true);
      const positions = mesh.geometry.getAttribute('position');
      this.framePoints.set(`shape-${specimen}`, Array.from({ length: positions.count }, (_, i) =>
        vector().fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld)));
    }
    const orbit: THREE.Vector3[] = [];
    // Fixed full-cycle framing keeps a reversible drag from silently changing zoom.
    for (let i = 0; i <= 256; i++) {
      const f = cometFrame(i / 256);
      orbit.push(vector(f.x, .16, f.z), vector(f.x, -.16, f.z));
      for (const kind of ['ion', 'dust'] as const) for (const u of [.5, 1]) {
        const p = tailPoint(f, u, kind); orbit.push(vector(p.x, .18, p.z), vector(p.x, -.18, p.z));
      }
    }
    this.framePoints.set('comet-orbit', orbit);
    const samples = (region: Reservoir) => { const points = reservoirPoints(region); return Array.from({ length: points.length / 3 }, (_, i) => vector(points[i * 3], points[i * 3 + 1], points[i * 3 + 2])); };
    this.framePoints.set('main', [...samples('main'), ...Array.from({ length: 65 }, (_, i) => vector(5.35 * Math.cos(i / 64 * TAU), 0, 5.35 * Math.sin(i / 64 * TAU)))]);
    this.framePoints.set('kuiper', [...samples('kuiper'), ...Array.from({ length: 65 }, (_, i) => vector(51 * Math.cos(i / 64 * TAU), 0, 51 * Math.sin(i / 64 * TAU)))]);
    this.framePoints.set('dust', [...orbit, ...Array.from({ length: 65 }, (_, i) => vector(4.5 * Math.cos(i / 64 * TAU), .3, 4.5 * Math.sin(i / 64 * TAU)))]);
    const cloud = reservoirPoints('oort'); this.framePoints.set('oort', Array.from({ length: cloud.length / 3 }, (_, i) => vector(cloud[i * 3], cloud[i * 3 + 1], cloud[i * 3 + 2])));
  }
  private fittedPose(key: string, direction: THREE.Vector3): CameraPose {
    const nucleus = key === 'comet-nucleus', shape = key === 'shapes';
    const f = cometFrame(this.state.cometPhase);
    const target = nucleus ? vector(f.x, 0, f.z) : key === 'comet-orbit' ? vector(-1.25, 0, 0) : vector();
    const points = nucleus ? [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z => vector(f.x + x * .21, y * .18, f.z + z * .2))))
      : this.framePoints.get(shape ? `shape-${this.state.specimen}` : key)!;
    if (shape) new THREE.Box3().setFromPoints(points).getCenter(target);
    const width = Math.max(1, this.host.clientWidth), height = Math.max(1, this.host.clientHeight);
    const aspect = width / height, forward = direction.clone().normalize();
    const right = vector().crossVectors(vector(0, 1, 0), forward).normalize(), up = vector().crossVectors(forward, right).normalize();
    const vertical = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2), horizontal = vertical * aspect;
    if (shape) {
      const coordinates = points.map(point => {
        const relative = point.clone().sub(target);
        return { x: relative.dot(right), y: relative.dot(up), depth: relative.dot(forward) };
      });
      // Fit the current silhouette, rather than empty corners of all four specimens' union.
      const diameter = Math.min(width, height) * .66, focal = height / (2 * vertical);
      let near = Math.max(...coordinates.map(point => point.depth)) + .05, far = 40;
      for (let i = 0; i < 28; i++) {
        const distance = (near + far) / 2;
        let left = Infinity, right = -Infinity, bottom = Infinity, top = -Infinity;
        for (const point of coordinates) {
          const scale = focal / (distance - point.depth), x = point.x * scale, y = point.y * scale;
          left = Math.min(left, x); right = Math.max(right, x); bottom = Math.min(bottom, y); top = Math.max(top, y);
        }
        if (Math.max(right - left, top - bottom) > diameter) near = distance; else far = distance;
      }
      return { position: target.clone().addScaledVector(forward, far), target, automatic: true };
    }
    const safeX = nucleus ? .66 : Math.max(.62, 1 - (width < 600 ? 54 : 190) / width);
    const safeY = nucleus ? .64 : Math.max(.62, 1 - 105 / height);
    let distance = nucleus ? .45 : 1;
    for (const point of points) {
      const relative = point.clone().sub(target), depth = relative.dot(forward);
      distance = Math.max(distance, depth + Math.abs(relative.dot(right)) / (horizontal * safeX), depth + Math.abs(relative.dot(up)) / (vertical * safeY));
    }
    return { position: target.clone().addScaledVector(forward, distance * 1.025), target, automatic: true };
  }
  private cameraKey(state = this.state) { return state.view === 'belts' ? state.reservoir : state.view === 'comet' ? `comet-${state.cometLens}` : state.view; }
  private defaultPose(key: string): CameraPose {
    if (key === 'shapes') return this.fittedPose(key, vector(.38, .22, 1));
    if (key === 'comet-orbit') return this.fittedPose(key, vector(0, 1.1, 1.45));
    if (key === 'comet-nucleus') return this.fittedPose(key, vector(.35, .23, 1));
    return this.fittedPose(key, key === 'oort' ? vector(.5, .35, 1) : vector(0, 1.1, 1.45));
  }
  private restorePose(key: string) {
    const remembered = this.poses.get(key), pose = remembered && !remembered.automatic ? remembered : this.defaultPose(key);
    this.automaticCamera = pose.automatic ?? true;
    if (key === 'comet-nucleus') {
      const f = cometFrame(this.state.cometPhase, this.state.exposedIce);
      const offset = pose.position.clone().sub(pose.target);
      this.controls.target.set(f.x, 0, f.z);
      this.camera.position.copy(this.controls.target).add(offset);
    } else { this.camera.position.copy(pose.position); this.controls.target.copy(pose.target); }
    this.controls.minDistance = key === 'comet-nucleus' ? .38 : key === 'shapes' ? 1.9 : key === 'kuiper' ? 40 : key === 'oort' ? 14 : 2;
    this.controls.maxDistance = key === 'kuiper' ? 360 : key === 'oort' ? 90 : key === 'shapes' || key === 'comet-nucleus' ? 12 : 65;
    this.controls.update();
  }
  resetCamera() { this.poses.delete(this.key); this.restorePose(this.key); this.requestRender(); }
  topCamera() {
    const pose = this.fittedPose(this.key, vector(0, 1, .001)); this.automaticCamera = false;
    this.controls.target.copy(pose.target); this.camera.position.copy(pose.position); this.controls.update(); this.requestRender();
  }
  private manualCamera = () => { this.automaticCamera = false; };
  update(next: SmallBodiesState) {
    const old = this.state, key = this.cameraKey(next);
    this.state = { ...next };
    if (key !== this.key) {
      if (this.key) this.poses.set(this.key, { position: this.camera.position.clone(), target: this.controls.target.clone(), automatic: this.automaticCamera });
      this.key = key; this.restorePose(key);
    } else if (key === 'shapes' && next.specimen !== old.specimen && this.automaticCamera) {
      this.poses.delete(key); this.restorePose(key);
    }
    for (const [view, group] of Object.entries(this.groups)) group.visible = next.view === view;
    for (const [sample, mesh] of this.specimens) mesh.visible = sample === next.specimen;
    for (const [region, group] of this.reservoirs) group.visible = region === next.reservoir;
    const lightAngle = next.light * Math.PI / 180;
    this.sunlight.position.set(Math.sin(lightAngle) * 5, 1.6, Math.cos(lightAngle) * 5);
    if (next.view === 'comet') {
      const f = cometFrame(next.cometPhase, next.exposedIce);
      this.nucleus.position.set(f.x, 0, f.z); this.coma.position.copy(this.nucleus.position);
      this.coma.visible = f.activity > .001; this.coma.scale.setScalar(.2 + f.activity * .9);
      this.sunlight.position.set(0, .05, 0); this.sunlight.target = this.nucleus;
      for (const [kind, points] of [['ion', this.ion], ['dust', this.dust]] as const) {
        points.visible = f.activity > .001;
        const attr = points.geometry.getAttribute('position');
        for (let i = 0; i < attr.count; i++) {
          const u = (i + .5) / attr.count, center = tailPoint(f, u, kind);
          const width = f.activity * (kind === 'ion' ? .055 : .24) * Math.sqrt(u);
          attr.setXYZ(i, center.x + (random01(i + 100) - .5) * width,
            (random01(i + 700) - .5) * width, center.z + (random01(i + 1200) - .5) * width);
        }
        attr.needsUpdate = true; points.geometry.computeBoundingSphere();
      }
      const jet = this.jets.geometry.getAttribute('position');
      for (let i = 0; i < 8; i++) {
        jet.setXYZ(i * 2, f.x - f.antiSun.x * .11, 0, f.z - f.antiSun.z * .11);
        jet.setXYZ(i * 2 + 1, f.x - f.antiSun.x * (.18 + f.activity * .32) + (random01(i + 1000) - .5) * .1,
          (random01(i + 4000) - .5) * .12, f.z - f.antiSun.z * (.18 + f.activity * .32) + (random01(i + 1001) - .5) * .1);
      }
      jet.needsUpdate = true; this.jets.geometry.computeBoundingSphere(); this.jets.visible = f.activity > .015;
      this.cometAnchor.copy(this.nucleus.position);
      const ion = tailPoint(f, .68, 'ion'), dust = tailPoint(f, .8, 'dust');
      this.ionAnchor.set(ion.x, 0, ion.z); this.dustAnchor.set(dust.x, 0, dust.z);
      if (next.cometLens === 'nucleus') {
        if (old.cometLens === 'nucleus' && old.view === 'comet' && this.previousComet.lengthSq()) {
          const movement = vector(f.x, 0, f.z).sub(this.previousComet);
          this.camera.position.add(movement); this.controls.target.add(movement); this.controls.update();
        }
      }
      this.previousComet.set(f.x, 0, f.z);
    } else this.sunlight.target = this.groups.shapes;
    const earth = earthFrame(next.earthPhase); this.earth.position.set(earth.x, 0, earth.z);
    this.earthHalo.position.copy(this.earth.position); this.earthHalo.visible = earth.inStream;
    this.earthAnchor.copy(this.earth.position);
    this.requestRender();
  }
  private resize = () => {
    if (this.disposed || this.failed) return;
    const width = Math.max(1, this.host.clientWidth), height = Math.max(1, this.host.clientHeight);
    this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
    this.leaders.setAttribute('viewBox', `0 0 ${width} ${height}`);
    if (this.automaticCamera && this.key) {
      this.poses.delete(this.key); this.restorePose(this.key);
    }
    this.renderer.setSize(width, height, false); this.requestRender();
  };
  requestRender = () => {
    if (this.disposed || this.failed || document.hidden || this.frame) return;
    this.frame = requestAnimationFrame(() => { this.frame = 0; this.render(); });
  };
  private render() {
    if (this.disposed || this.failed || document.hidden) return;
    try {
      this.renderer.render(this.scene, this.camera);
      const width = this.host.clientWidth, height = this.host.clientHeight;
      const rails: { left: boolean; items: { label: SceneLabel; x: number; y: number; top: number; height: number }[] }[] = [{ left: true, items: [] }, { left: false, items: [] }];
      const labelWidth = width < 600 ? 102 : 134, inset = width < 600 ? 10 : 14;
      for (const label of this.labels) {
        this.projecting.copy(label.anchor).project(this.camera);
        const x = (this.projecting.x * .5 + .5) * width, y = (-this.projecting.y * .5 + .5) * height;
        const labelKey = this.state.view === 'belts' ? this.state.reservoir : this.state.view;
        const visible = this.state.labels && label.keys.includes(labelKey) && (!label.condition || label.condition())
          && this.projecting.z > -1 && this.projecting.z < 1 && x > 5 && x < width - 5 && y > 5 && y < height - 5;
        label.node.hidden = !visible;
        label.connector.style.display = visible ? '' : 'none'; label.dot.style.display = visible ? '' : 'none';
        if (visible) {
          const left = x < width / 2;
          label.node.style.width = `${labelWidth}px`; label.node.style.left = `${left ? inset : width - inset - labelWidth}px`;
          const nearRail = left ? x < inset + labelWidth + 24 : x > width - inset - labelWidth - 24;
          const top = nearRail ? y < height / 2 ? y + 44 : y - 58 : y - 12;
          rails[left ? 0 : 1].items.push({ label, x, y, top, height: Math.max(25, label.node.offsetHeight) });
        }
      }
      for (const rail of rails) {
        rail.items.sort((a, b) => a.y - b.y);
        let edge = this.state.view === 'comet' ? 52 : 18;
        for (const item of rail.items) { item.top = Math.max(edge, item.top); edge = item.top + item.height + 12; }
        edge = height - 16;
        for (let i = rail.items.length - 1; i >= 0; i--) {
          const item = rail.items[i]; item.top = Math.min(item.top, edge - item.height); edge = item.top - 12;
          item.label.node.style.top = `${item.top}px`;
          const endX = rail.left ? inset + labelWidth + 4 : width - inset - labelWidth - 4;
          const endY = item.top + item.height / 2, elbow = rail.left ? endX + 15 : endX - 15;
          item.label.connector.setAttribute('d', `M ${item.x} ${item.y} L ${elbow} ${endY} L ${endX} ${endY}`);
          item.label.dot.setAttribute('cx', String(item.x)); item.label.dot.setAttribute('cy', String(item.y));
        }
      }
    } catch { this.fail(); }
  }
  private keyboardCamera = (event: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', '=', 'Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') { this.resetCamera(); return; }
    this.automaticCamera = false;
    const offset = this.camera.position.clone().sub(this.controls.target), sphere = new THREE.Spherical().setFromVector3(offset);
    if (event.key === 'ArrowLeft') sphere.theta -= .12;
    if (event.key === 'ArrowRight') sphere.theta += .12;
    if (event.key === 'ArrowUp') sphere.phi = Math.max(.08, sphere.phi - .12);
    if (event.key === 'ArrowDown') sphere.phi = Math.min(Math.PI - .08, sphere.phi + .12);
    if (event.key === '+' || event.key === '=') sphere.radius = Math.max(this.controls.minDistance, sphere.radius * .9);
    if (event.key === '-') sphere.radius = Math.min(this.controls.maxDistance, sphere.radius / .9);
    this.camera.position.copy(this.controls.target).add(offset.setFromSpherical(sphere)); this.controls.update(); this.requestRender();
  };
  private contextLost = (event: Event) => { event.preventDefault(); this.fail(); };
  private fail() {
    if (this.disposed || this.failed) return;
    this.failed = true; cancelAnimationFrame(this.frame); this.frame = 0;
    this.renderer.domElement.tabIndex = -1;
    for (const label of this.labels) label.node.hidden = true;
    this.leaders.style.display = 'none';
    this.onFailure();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; cancelAnimationFrame(this.frame); this.observer.disconnect();
    this.controls.removeEventListener('change', this.requestRender); this.controls.dispose();
    this.controls.removeEventListener('start', this.manualCamera);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLost);
    this.renderer.domElement.removeEventListener('keydown', this.keyboardCamera);
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    this.scene.traverse(object => {
      const drawable = object as THREE.Mesh;
      if (drawable.geometry) geometries.add(drawable.geometry);
      if (drawable.material) for (const material of Array.isArray(drawable.material) ? drawable.material : [drawable.material]) materials.add(material);
    });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
    this.renderer.dispose(); this.renderer.domElement.remove(); this.labels.forEach(l => l.node.remove()); this.leaders.remove();
  }
}
