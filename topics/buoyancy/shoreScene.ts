import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { JourneyFrame } from './journeyModel.ts';
import { createMetalGeometry, updateMetalGeometry, createMetalEnvelopeGeometry, updateMetalEnvelopeGeometry, metalDimensions, metalProfile } from './metalGeometry.ts';
import { createPebbleShape } from './specimenGeometry.ts';
import { createSpecimenMaterials } from './specimenMaterials.ts';
import { createWaterContactSampler, type WaterContactSampler, type WaterContact } from './waterContact.ts';
import { createShoreEnvironment, createShoreLightTexture, shoreBankZ, SHORE_GROUND_GLSL, type ShoreEnvironment } from './shoreEnvironment.ts';

type View = 'oblique' | 'front' | 'top';
type Specimen = {
  root: THREE.Group;
  mesh: THREE.Mesh;
  parcel: THREE.Group;
  parcelMesh: THREE.Mesh;
  outline: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  envelope: THREE.BufferGeometry;
  contact: WaterContactSampler;
  materials: THREE.Material[];
};
type Uniform<T> = { value: T };

/** A retained length of round timber, with bark around the cylindrical side
 * and uneven split end grain. This is not the old rectangular lab block. */
function roundLogGeometry() {
  const geometry = new THREE.CylinderGeometry(.5, .5, 1, 112, 28, false);
  geometry.rotateZ(Math.PI / 2);
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const angle = Math.atan2(z, y), radial = Math.hypot(y, z) * 2;
    const taper = 1 + .035 * x + .021 * Math.sin(x * 5.1 + .7);
    const bark = .009 * Math.sin(angle * 17. + x * 1.8) + .006 * Math.cos(angle * 31. - x * 3.1);
    const scale = taper + bark * radial;
    const end = Math.abs(x) > .49 ? Math.sign(x) * radial
      * (.018 * Math.sin(angle * 3. + .4) + .011 * Math.cos(angle * 7. - .2)) : 0;
    position.setXYZ(i, x + end, y * scale + .012 * Math.sin(x * 4.3), z * scale + .014 * Math.sin(x * 3.9 + .5));
  }
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!, size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  geometry.translate(-center.x, -center.y, -center.z); geometry.scale(1 / size.x, 1 / size.y, 1 / size.z); geometry.translate(0, .5, 0);
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  geometry.name = 'buoyancy-round-bark-log';
  return geometry;
}

/** A bevelled coin with a closed, circular face. Its small relief is separate
 * surface detail; the lathed outer disc is also the water-replacement body. */
function coinGeometry() {
  const profile: [number, number][] = [[0, .01], [.458, .01], [.486, .07], [.5, .20],
    [.5, .80], [.486, .93], [.458, .99], [0, .99]];
  const geometry = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 128);
  geometry.name = 'buoyancy-bevelled-brass-coin';
  return geometry;
}

function waterGeometry() {
  const across = 100, along = 68, positions: number[] = [], indices: number[] = [];
  for (let j = 0; j <= along; j++) for (let i = 0; i <= across; i++) {
    const x = (i / across - .5) * 30;
    const bank = shoreBankZ(x);
    // At this contour the ground is at the water level. The water opens out
    // beyond all visible edges; there are no aquarium walls or base plates.
    const back = bank - .20, z = THREE.MathUtils.lerp(back, 15, j / along);
    positions.push(x, 0, z);
    if (i < across && j < along) {
      const a = j * (across + 1) + i, b = a + across + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  geometry.name = 'buoyancy-open-shore-water-surface';
  return geometry;
}

/** Retained shore illustration. All physical state and the only process clock
 * belong to the journey model/controller; this owner renders supplied frames,
 * camera gestures and resize events only. Optical treatment is illustrative. */
export class ShoreScene {
  private readonly world = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-4, 4, 2.6, -2.6, .1, 80);
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private observer: ResizeObserver | null = null;
  private environment: THREE.WebGLRenderTarget | null = null;
  private surroundings: ShoreEnvironment | null = null;
  private readonly geometries = new Set<THREE.BufferGeometry>();
  private readonly materials = new Set<THREE.Material>();
  private readonly textures = new Set<THREE.Texture>();
  private readonly specimens = new Map<'log' | 'stone' | 'coin' | 'metal', Specimen>();
  private readonly waterY = { value: 0 };
  private readonly focus = { value: 0 };
  private readonly ripplePhase = { value: 0 };
  private readonly rippleAmount = { value: 0 };
  private readonly holeEnabled = { value: 0 };
  private readonly holeRadius = { value: 0 };
  private readonly holeDimensions = { value: new THREE.Vector2(1, 1) };
  private readonly bodyInverse = { value: new THREE.Matrix4() };
  private readonly clipping = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  private parcelMaterial!: THREE.MeshPhysicalMaterial;
  private parcelOutlineMaterial!: THREE.MeshBasicMaterial;
  private cap!: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>;
  private water!: THREE.Mesh;
  private contactLine!: THREE.LineLoop<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private contactRibbon!: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>;
  private readonly ripples: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[] = [];
  private shadow!: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private cargo!: THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  private frame: JourneyFrame | null = null;
  private viewport = { width: 800, height: 500 };
  private disposed = false;
  private lost = false;
  private ready = false;
  private syncingCamera = false;
  private lastForm = NaN;
  private view: View = 'oblique';

  get available(): boolean { return this.ready && !this.disposed && !this.lost; }
  get canvas(): HTMLCanvasElement | null { return this.renderer?.domElement ?? null; }

  static create(host: HTMLElement, onUnavailable?: () => void, onProjectionChange?: () => void): ShoreScene {
    return new ShoreScene(host, onUnavailable, onProjectionChange);
  }

  private geometry<T extends THREE.BufferGeometry>(geometry: T): T { this.geometries.add(geometry); return geometry; }
  private material<T extends THREE.Material>(material: T): T { this.materials.add(material); return material; }
  private mesh<G extends THREE.BufferGeometry, M extends THREE.Material>(geometry: G, material: M, parent: THREE.Object3D = this.world): THREE.Mesh<G, M> {
    const value = new THREE.Mesh(geometry, material); parent.add(value); return value;
  }

  private constructor(
    private readonly host: HTMLElement,
    private readonly onUnavailable?: () => void,
    private readonly onProjectionChange?: () => void,
  ) {
    try {
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
      this.renderer = renderer;
      renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.8));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .98;
      renderer.localClippingEnabled = true;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      const canvas = renderer.domElement;
      canvas.className = 'buoyancy-shore-canvas'; canvas.setAttribute('aria-hidden', 'true');
      Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', touchAction: 'pan-y' });
      this.host.append(canvas);
      canvas.addEventListener('webglcontextlost', this.handleContextLost);
      // Capture before OrbitControls so an ordinary wheel keeps scrolling the
      // Reader; intentional pinch/modifier-wheel still changes observation.
      canvas.addEventListener('wheel', this.handleWheelCapture, { capture: true, passive: true });
      this.world.background = new THREE.Color('#ccdfda');
      this.prepareLighting(renderer);
      this.surroundings = createShoreEnvironment(); this.world.add(this.surroundings.group);
      this.surroundings.geometries.forEach(value => this.geometries.add(value));
      this.surroundings.materials.forEach(value => this.materials.add(value));
      this.prepareSpecimens(); this.prepareWater(); this.prepareContact();
      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.enableDamping = false; this.controls.autoRotate = false; this.controls.enablePan = false;
      this.controls.enableZoom = true; this.controls.rotateSpeed = .56; this.controls.zoomSpeed = .7;
      this.controls.minPolarAngle = .04; this.controls.maxPolarAngle = 1.49;
      this.controls.minAzimuthAngle = -.85; this.controls.maxAzimuthAngle = .85;
      this.controls.minZoom = .78; this.controls.maxZoom = 1.6;
      this.controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
      this.controls.touches.ONE = THREE.TOUCH.ROTATE; this.controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
      this.controls.addEventListener('change', this.handleCameraChange);
      this.ready = true; this.setView('oblique');
      this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host);
      this.resize();
    } catch (error) {
      console.warn('Buoyancy shore renderer unavailable', error);
      this.lost = true; this.releaseGPU(); this.onUnavailable?.();
    }
  }

  private prepareLighting(renderer: THREE.WebGLRenderer): void {
    const lightTexture = createShoreLightTexture(); this.textures.add(lightTexture);
    const generator = new THREE.PMREMGenerator(renderer);
    try { this.environment = generator.fromEquirectangular(lightTexture); } finally { generator.dispose(); }
    this.world.environment = this.environment.texture; this.world.environmentIntensity = .69;
    this.world.add(new THREE.HemisphereLight('#e5f4ff', '#80918b', .94));
    const sun = new THREE.DirectionalLight('#fff7e9', 2.25); sun.position.set(-4.8, 9, 6.5);
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 7, bottom: -7, near: .1, far: 25 });
    sun.shadow.bias = -.0002; sun.shadow.normalBias = .022; sun.shadow.radius = 4; sun.shadow.intensity = .24;
    this.world.add(sun);
    const fill = new THREE.DirectionalLight('#c5e8ee', .42); fill.position.set(4, 3, -5); this.world.add(fill);
  }

  private prepareSpecimens(): void {
    const finishes = createSpecimenMaterials(this.waterY, () => this.render());
    finishes.materials.forEach(value => this.materials.add(value)); finishes.textures.forEach(value => this.textures.add(value));
    const wood = Array.isArray(finishes.wood) ? finishes.wood[0] : finishes.wood;
    // Round timber needs a complete bark circumference, rather than a broad
    // photographed split face that can make a floating cylinder read as a plank.
    wood.onBeforeCompile = shader => {
      shader.uniforms.specimenGrain = { value: finishes.textures[0] };
      shader.uniforms.specimenWaterLevel = this.waterY;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          varying vec3 vSpecimenPoint;
          varying vec3 vSpecimenNormal;
          varying float vSpecimenHeight;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vSpecimenPoint=position-vec3(0.,.5,0.);
          vSpecimenNormal=normal;
          vSpecimenHeight=(modelMatrix*vec4(position,1.)).y;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform highp sampler3D specimenGrain;
          uniform float specimenWaterLevel;
          varying vec3 vSpecimenPoint;
          varying vec3 vSpecimenNormal;
          varying float vSpecimenHeight;
          float logNoise(vec3 p){return texture(specimenGrain,(p+vec3(8.7,2.1,15.3))/32.).r;}`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec3 p=vSpecimenPoint;
          float end=smoothstep(.70,.91,abs(normalize(vSpecimenNormal).x));
          float barkPatch=logNoise(p*vec3(4.,15.,15.));
          float scales=logNoise(p*vec3(74.,133.,133.));
          float angle=atan(p.z,p.y);
          float fissure=pow(.5+.5*sin(angle*24.+barkPatch*6.+sin(p.x*7.)*.8),12.);
          vec3 bark=mix(vec3(.085,.049,.024),vec3(.22,.135,.066),barkPatch);
          bark*=.91+scales*.16-fissure*.13;
          float radial=length(p.yz)+.009*sin(angle*3.+.4)+.007*(barkPatch-.5);
          float growth=sin(radial*115.+sin(angle*5.)*.37);
          float ring=smoothstep(.57,.93,growth)*(1.-smoothstep(.45,1.4,fwidth(radial*115.)));
          vec3 endgrain=mix(vec3(.36,.207,.083),vec3(.52,.335,.15),barkPatch);
          endgrain*=1.-ring*.26;
          float wet=1.-smoothstep(specimenWaterLevel-.014,specimenWaterLevel+.008,vSpecimenHeight);
          diffuseColor.rgb*=mix(bark,endgrain,end)*mix(1.,.84,wet);`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          roughnessFactor=mix(.84,.38,1.-smoothstep(specimenWaterLevel-.014,specimenWaterLevel+.008,vSpecimenHeight));`);
    };
    wood.customProgramCacheKey = () => 'buoyancy-round-shore-bark-v2';
    for (const material of [wood, finishes.stone, finishes.metal]) {
      const previous = material.onBeforeCompile;
      material.onBeforeCompile = (shader, renderer) => {
        previous(shader, renderer);
        shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
          float shoreWet=1.-smoothstep(specimenWaterLevel-.014,specimenWaterLevel+.006,vSpecimenHeight);
          outgoingLight=mix(outgoingLight,outgoingLight*vec3(.57,.89,1.06)+vec3(.008,.024,.029),shoreWet*.46);
          #include <opaque_fragment>`);
      };
    }
    this.parcelMaterial = this.material(new THREE.MeshPhysicalMaterial({
      color: '#16a6cf', emissive: '#086780', emissiveIntensity: .26, metalness: .06, roughness: .18,
      clearcoat: .7, clearcoatRoughness: .09, envMapIntensity: .75, transparent: true,
      opacity: .78, side: THREE.DoubleSide, depthWrite: false, clippingPlanes: [this.clipping],
    }));
    this.parcelOutlineMaterial = this.material(new THREE.MeshBasicMaterial({
      color: '#9cecff', transparent: true, opacity: .6, depthWrite: false,
      side: THREE.BackSide, clippingPlanes: [this.clipping],
    }));
    const add = (key: 'log' | 'stone' | 'coin' | 'metal', geometry: THREE.BufferGeometry,
      material: THREE.Material, envelope: THREE.BufferGeometry = geometry) => {
      this.geometry(geometry); this.geometry(envelope);
      const root = new THREE.Group(), parcel = new THREE.Group(); this.world.add(root, parcel);
      const mesh = this.mesh(geometry, material, root); mesh.castShadow = mesh.receiveShadow = true; mesh.renderOrder = 8;
      const parcelMesh = this.mesh(envelope, this.parcelMaterial, parcel); parcelMesh.renderOrder = 24;
      const outline = this.mesh(envelope, this.parcelOutlineMaterial, parcel);
      outline.scale.set(1.009, 1.009, 1.009); outline.renderOrder = 23;
      root.visible = parcel.visible = false;
      material.transparent = true; material.depthWrite = true;
      this.specimens.set(key, { root, mesh, parcel, parcelMesh, outline, geometry, envelope,
        contact: createWaterContactSampler(envelope, 128), materials: [material] });
    };
    const log = roundLogGeometry();
    const stone = createPebbleShape(); stone.translate(0, .5, 0);
    add('log', log, wood); add('stone', stone, finishes.stone);
    const brass = this.material(new THREE.MeshPhysicalMaterial({
      color: '#c89236', metalness: .87, roughness: .29, clearcoat: .23, envMapIntensity: 1.18,
      anisotropy: .2, anisotropyRotation: .3,
    }));
    this.attachFineMetal(brass); add('coin', coinGeometry(), brass);
    const coin = this.specimens.get('coin')!;
    const emboss = this.material(new THREE.MeshStandardMaterial({ color: '#dbaa50', metalness: .86, roughness: .32, transparent: true }));
    coin.materials.push(emboss);
    for (const [radius, thickness] of [[.423, .005], [.384, .003], [.26, .003]] as const) {
      const ring = this.mesh(this.geometry(new THREE.TorusGeometry(radius, thickness, 8, 128)), emboss, coin.root);
      ring.rotation.x = -Math.PI / 2; ring.scale.z = 6; ring.position.y = 1.008; ring.renderOrder = 8;
    }
    const boss = this.mesh(this.geometry(new THREE.CylinderGeometry(.112, .13, .045, 48)), emboss, coin.root);
    boss.position.y = 1.007; boss.renderOrder = 8;
    const ribs = new THREE.InstancedMesh(this.geometry(new THREE.BoxGeometry(.013, .44, .006)), emboss, 96);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 96; i++) {
      const angle = i / 96 * Math.PI * 2;
      dummy.position.set(Math.cos(angle) * .5, .5, Math.sin(angle) * .5);
      dummy.rotation.set(0, -angle + Math.PI / 2, 0); dummy.updateMatrix(); ribs.setMatrixAt(i, dummy.matrix);
    }
    ribs.renderOrder = 8; coin.root.add(ribs);
    finishes.metal.side = THREE.DoubleSide; finishes.metal.roughness = .26; finishes.metal.envMapIntensity = 1.28;
    add('metal', createMetalGeometry(), finishes.metal, createMetalEnvelopeGeometry());
    const cargoMaterial = this.material(new THREE.MeshStandardMaterial({ color: '#8d7761', metalness: .3, roughness: .54, transparent: true }));
    this.cargo = new THREE.InstancedMesh(this.geometry(new RoundedBoxGeometry(1, 1, 1, 4, .08)), cargoMaterial, 8);
    this.cargo.castShadow = this.cargo.receiveShadow = true; this.cargo.renderOrder = 9;
    this.specimens.get('metal')!.root.add(this.cargo);
  }

  private attachFineMetal(material: THREE.MeshPhysicalMaterial): void {
    material.onBeforeCompile = shader => {
      shader.uniforms.shoreWaterY = this.waterY;
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCoinLocal;\nvarying float vCoinWorldY;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCoinLocal=position; vCoinWorldY=(modelMatrix*vec4(position,1.)).y;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCoinLocal;\nvarying float vCoinWorldY;\nuniform float shoreWaterY;')
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          float brushed=sin(length(vCoinLocal.xz)*850.+sin(vCoinLocal.x*110.)*.23);
          roughnessFactor+=brushed*.018;
          roughnessFactor=mix(roughnessFactor,.19,1.-smoothstep(shoreWaterY-.02,shoreWaterY+.01,vCoinWorldY));`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          float patina=.97+.03*sin(vCoinLocal.x*78.+vCoinLocal.z*43.)*sin(vCoinLocal.z*91.);
          diffuseColor.rgb*=patina;`);
    };
    material.customProgramCacheKey = () => 'buoyancy-brass-coin-v1';
  }

  private prepareWater(): void {
    const material = this.material(new THREE.MeshPhysicalMaterial({
      color: '#1e7994', metalness: .02, roughness: .075, clearcoat: .7, clearcoatRoughness: .055,
      envMapIntensity: .7, transparent: true, opacity: .20, depthWrite: false, side: THREE.DoubleSide,
    }));
    material.onBeforeCompile = shader => {
      const uniforms: Record<string, Uniform<unknown>> = {
        shoreWaterY: this.waterY, shoreFocus: this.focus, shoreRipplePhase: this.ripplePhase,
        shoreRippleAmount: this.rippleAmount, shoreHoleEnabled: this.holeEnabled, shoreHoleRadius: this.holeRadius,
        shoreHoleDimensions: this.holeDimensions, shoreBodyInverse: this.bodyInverse,
      };
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vShoreWater;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvShoreWater=(modelMatrix*vec4(transformed,1.)).xyz;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vShoreWater;
        uniform float shoreWaterY,shoreFocus,shoreRipplePhase,shoreRippleAmount,shoreHoleEnabled,shoreHoleRadius;
        uniform vec2 shoreHoleDimensions;
        uniform mat4 shoreBodyInverse;
        ${SHORE_GROUND_GLSL}`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          if(shoreHoleEnabled>.5){
            vec3 local=(shoreBodyInverse*vec4(vShoreWater.x,shoreWaterY,vShoreWater.z,1.)).xyz;
            if(length(local.xz/shoreHoleDimensions)<shoreHoleRadius) discard;
          }`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          vec2 p=vShoreWater.xz;
          float radius=length(p),offset=radius-(.45+shoreRipplePhase*2.1);
          float ring=sin(offset*19.)*exp(-offset*offset/.16)*shoreRippleAmount;
          // A fixed, low-amplitude surface field supplies fine specular facets;
          // only the supplied journey progress can move the contact ripple.
          vec2 slope=vec2(cos(p.x*8.1+p.y*2.7),sin(p.y*7.3-p.x*2.3))*.012;
          slope+=p/max(radius,.001)*ring*.012;
          vec3 opticalNormal=normalize(vec3(-slope.x,1.,-slope.y));
          normal=normalize((viewMatrix*vec4(opticalNormal*faceDirection,0.)).xyz);`)
        .replace('#include <opaque_fragment>', `
          float grazing=pow(1.-abs(dot(normal,geometryViewDir)),4.);
          float window=exp(-dot(vShoreWater.xz/vec2(3.3,2.8),vShoreWater.xz/vec2(3.3,2.8)));
          // The central optical window keeps sinking specimens legible. It
          // changes neither the model's water boundary nor its displacement.
          vec2 opticalPoint=vShoreWater.xz;
          // A few isolated broad reflections, with no tiled dash field.
          float a=opticalPoint.y-(2.9+.11*sin(opticalPoint.x*2.3)+.04*sin(opticalPoint.x*5.1));
          float b=opticalPoint.y-(-1.45+.08*sin(opticalPoint.x*2.1)+.035*sin(opticalPoint.x*4.7));
          float c=opticalPoint.y-(4.9+.12*sin(opticalPoint.x*1.8));
          float glint=exp(-pow(a/.035,2.))*exp(-pow((opticalPoint.x+3.7)/1.1,6.))
            +exp(-pow(b/.031,2.))*exp(-pow((opticalPoint.x-3.1)/1.0,6.))
            +exp(-pow(c/.046,2.))*exp(-pow((opticalPoint.x-.5)/1.3,6.));
          float depth=shoreOpticalDepth(opticalPoint,shoreWaterY);
          float deep=smoothstep(.1,2.2,depth);
          vec3 waterColour=mix(vec3(.10,.34,.36),vec3(.012,.115,.185),deep);
          outgoingLight=(waterColour+totalSpecular*.18)*(1.-shoreFocus*.18);
          outgoingLight+=vec3(.40,.62,.66)*glint*.27;
          diffuseColor.a=(.12+deep*.18+grazing*.16)*(1.-window*.10)+shoreFocus*.035+glint*.09;
          #include <opaque_fragment>`);
    };
    material.customProgramCacheKey = () => 'buoyancy-open-water-window-v1';
    this.water = this.mesh(this.geometry(waterGeometry()), material); this.water.renderOrder = 18;
    const shadowMaterial = this.material(new THREE.ShaderMaterial({
      uniforms: { strength: { value: .12 } }, transparent: true, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec2 vUv;uniform float strength;void main(){vec2 p=vUv*2.-1.;float a=exp(-dot(p,p)*3.7)*strength;gl_FragColor=vec4(.10,.23,.21,a);}',
    }));
    this.shadow = this.mesh(this.geometry(new THREE.PlaneGeometry(1, 1)), shadowMaterial);
    this.shadow.rotation.x = -Math.PI / 2; this.shadow.renderOrder = 2;
  }

  private prepareContact(): void {
    const makeLine = (color: string, opacity: number) => {
      const geometry = this.geometry(new THREE.BufferGeometry());
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(128 * 3), 3));
      const line = new THREE.LineLoop(geometry, this.material(new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false })));
      line.frustumCulled = false; line.renderOrder = 28; line.visible = false; this.world.add(line); return line;
    };
    this.contactLine = makeLine('#d8f6f2', .96);
    for (let i = 0; i < 2; i++) {
      const geometry = this.geometry(new THREE.BufferGeometry());
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(128 * 2 * 3), 3));
      geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(128 * 2 * 2), 2));
      const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
      const indices: number[] = [];
      for (let j = 0; j < 128; j++) {
        uv.setXY(j * 2, j / 128, 0); uv.setXY(j * 2 + 1, j / 128, 1);
        const a = j * 2, b = (j + 1) % 128 * 2; indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
      geometry.setIndex(indices);
      const material = this.material(new THREE.MeshBasicMaterial({ color: '#def6ef', transparent: true, opacity: .62 - i * .18, side: THREE.DoubleSide, depthWrite: false }));
      material.onBeforeCompile = shader => {
        shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWaveEdge;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWaveEdge=uv.y;');
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vWaveEdge;')
          .replace('#include <opaque_fragment>', 'diffuseColor.a*=sin(vWaveEdge*3.14159265);\n#include <opaque_fragment>');
      };
      material.customProgramCacheKey = () => 'buoyancy-soft-contact-wave-v1';
      const wave = this.mesh(geometry, material); wave.renderOrder = 28; wave.frustumCulled = false; wave.visible = false; this.ripples.push(wave);
    }
    const ribbon = this.geometry(new THREE.BufferGeometry());
    ribbon.setAttribute('position', new THREE.BufferAttribute(new Float32Array(128 * 2 * 3), 3));
    const indices: number[] = [];
    for (let i = 0; i < 128; i++) { const a = i * 2, b = (i + 1) % 128 * 2; indices.push(a, b, a + 1, a + 1, b, b + 1); }
    ribbon.setIndex(indices);
    this.contactRibbon = this.mesh(ribbon, this.material(new THREE.MeshPhysicalMaterial({
      color: '#8ed4de', roughness: .06, metalness: .05, transparent: true, opacity: .30, depthWrite: false, side: THREE.DoubleSide,
    })));
    this.contactRibbon.renderOrder = 27; this.contactRibbon.frustumCulled = false;
    const cap = this.geometry(new THREE.BufferGeometry());
    cap.setAttribute('position', new THREE.BufferAttribute(new Float32Array(129 * 3), 3));
    const capIndices: number[] = [];
    for (let i = 0; i < 128; i++) capIndices.push(0, (i + 1) % 128 + 1, i + 1);
    cap.setIndex(capIndices); cap.computeVertexNormals();
    this.cap = this.mesh(cap, this.material(new THREE.MeshPhysicalMaterial({
      color: '#26bfdf', emissive: '#126e84', emissiveIntensity: .22, roughness: .13,
      transparent: true, opacity: .65, depthWrite: false, side: THREE.DoubleSide, metalness: .03, clearcoat: .6,
    })));
    this.cap.renderOrder = 25; this.cap.frustumCulled = false; this.cap.visible = false;
  }

  update(frame: JourneyFrame): void {
    if (!this.available) return;
    this.frame = frame; this.waterY.value = frame.waterY; this.clipping.constant = frame.waterY;
    const key = frame.kind === 'boat' || frame.kind === 'metal' ? 'metal' : frame.kind;
    const specimen = this.specimens.get(key)!;
    const form = key === 'metal' ? frame.body.form : 0;
    if (key === 'metal' && form !== this.lastForm) {
      updateMetalGeometry(specimen.geometry, form); updateMetalEnvelopeGeometry(specimen.envelope, form);
      specimen.contact = createWaterContactSampler(specimen.envelope, 128); this.lastForm = form;
    }
    const metal = metalDimensions(form);
    const sx = key === 'metal' ? frame.body.width / metal.width : frame.body.width;
    const sy = key === 'metal' ? frame.body.height / metal.height : frame.body.height;
    const sz = key === 'metal' ? frame.body.depth / metal.depth : frame.body.depth;
    for (const item of this.specimens.values()) { item.root.visible = item === specimen && frame.body.opacity > .001; item.parcel.visible = item === specimen && frame.parcel.opacity > .001; }
    for (const root of [specimen.root, specimen.parcel]) {
      root.position.set(0, frame.body.bottom, 0); root.rotation.set(0, 0, frame.body.tilt);
      root.scale.set(sx, sy, sz); root.updateMatrixWorld(true);
    }
    for (const material of specimen.materials) material.opacity = frame.body.opacity;
    this.parcelMaterial.opacity = frame.parcel.opacity * .78;
    this.parcelOutlineMaterial.opacity = frame.parcel.opacity * .59;
    // A dry cabin also excludes water. A flooded cabin already contains water,
    // so its replacement shows just the retained steel material shell.
    const parcelGeometry = key === 'metal' && frame.hydro.flooded ? specimen.geometry : specimen.envelope;
    specimen.parcelMesh.geometry = specimen.outline.geometry = parcelGeometry;
    this.focus.value = frame.parcel.opacity; this.surroundings?.setTeachingFocus(frame.parcel.opacity);
    this.water.position.y = frame.waterY;
    this.ripplePhase.value = frame.settings.progress;
    this.rippleAmount.value = Math.sin(frame.settings.progress * Math.PI) ** 2;
    this.bodyInverse.value.copy(specimen.root.matrixWorld).invert();
    this.holeDimensions.value.set(metal.width / 2, metal.depth / 2);
    this.holeEnabled.value = 0;
    if (key === 'metal' && form > .95 && !frame.hydro.flooded && frame.parcel.opacity < .99) {
      const localLevel = (frame.waterY - frame.body.bottom) / sy;
      if (localLevel > metalProfile(form, 0).top && localLevel < metalProfile(form, 1).top) {
        let lo = 0, hi = 1;
        for (let i = 0; i < 26; i++) { const mid = (lo + hi) / 2; if (metalProfile(form, mid).top < localLevel) lo = mid; else hi = mid; }
        this.holeRadius.value = lo; this.holeEnabled.value = 1;
      }
    }
    this.updateCargo(specimen, key === 'metal' && form === 1 ? frame.settings.cargo : 0, form, frame.body.opacity);
    const contact = specimen.contact.sample(specimen.parcel, frame.waterY);
    this.updateContact(contact, frame);
    this.shadow.position.set(0, frame.floorY + .012, 0);
    this.shadow.scale.set(frame.body.width * 1.65, frame.body.depth * 1.7, 1);
    this.shadow.material.uniforms.strength.value = (.045 + .11 * Math.exp(-Math.max(0, frame.body.bottom - frame.floorY) * 1.8)) * frame.body.opacity;
    this.fit(); this.render();
  }

  private updateCargo(specimen: Specimen, count: number, form: number, opacity: number): void {
    if (specimen !== this.specimens.get('metal')) { this.cargo.count = 0; return; }
    const dims = metalDimensions(form), width = dims.width * .135, depth = dims.depth * .16, height = .19;
    const dummy = new THREE.Object3D(); this.cargo.count = Math.min(8, Math.max(0, count)); this.cargo.material.opacity = opacity;
    for (let i = 0; i < this.cargo.count; i++) {
      const column = i % 4, row = Math.floor(i / 4);
      const x = (column - 1.5) * width * 1.1, z = (row - .5) * depth * 1.14;
      let floor = -Infinity;
      for (const dx of [-width / 2, width / 2]) for (const dz of [-depth / 2, depth / 2]) {
        const radius = Math.hypot((x + dx) / (dims.width / 2), (z + dz) / (dims.depth / 2));
        floor = Math.max(floor, metalProfile(form, Math.min(1, radius)).top);
      }
      dummy.position.set(x, floor + height / 2 + .006, z); dummy.scale.set(width, height, depth); dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix(); this.cargo.setMatrixAt(i, dummy.matrix);
    }
    this.cargo.instanceMatrix.needsUpdate = true;
  }

  private updateContact(contact: WaterContact | null, frame: JourneyFrame): void {
    const show = !!contact && (frame.body.opacity + frame.parcel.opacity > .001);
    this.contactLine.visible = this.contactRibbon.visible = show;
    this.cap.visible = !!contact && frame.parcel.opacity > .001 && !frame.hydro.flooded;
    for (const line of this.ripples) line.visible = show;
    if (!contact) return;
    const linePositions = this.contactLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    const ribbonPositions = this.contactRibbon.geometry.getAttribute('position') as THREE.BufferAttribute;
    const capPositions = this.cap.geometry.getAttribute('position') as THREE.BufferAttribute;
    capPositions.setXYZ(0, contact.center.x, frame.waterY + .009, contact.center.y);
    for (let i = 0; i < 128; i++) {
      const x = contact.points[i * 3], z = contact.points[i * 3 + 2];
      const dx = x - contact.center.x, dz = z - contact.center.y, distance = Math.max(.001, Math.hypot(dx, dz));
      linePositions.setXYZ(i, x + dx / distance * .012, frame.waterY + .014, z + dz / distance * .012);
      ribbonPositions.setXYZ(i * 2, x, frame.waterY + .012, z);
      ribbonPositions.setXYZ(i * 2 + 1, x + dx / distance * .034, frame.waterY + .003, z + dz / distance * .034);
      capPositions.setXYZ(i + 1, x, frame.waterY + .009, z);
      this.ripples.forEach((wave, j) => {
        const amount = .12 + j * .17 + this.ripplePhase.value * .24 * this.rippleAmount.value;
        const position = wave.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let edge = 0; edge < 2; edge++) {
          const offset = amount + (edge - .5) * .031;
          position.setXYZ(i * 2 + edge, x + dx / distance * offset, frame.waterY + .016, z + dz / distance * offset);
        }
      });
    }
    linePositions.needsUpdate = ribbonPositions.needsUpdate = capPositions.needsUpdate = true;
    this.contactRibbon.geometry.computeVertexNormals(); this.cap.geometry.computeVertexNormals();
    this.cap.material.opacity = frame.parcel.opacity * .65;
    this.contactLine.material.color.set(frame.parcel.opacity > .5 ? '#a9ecff' : '#d3f4ee');
    this.ripples.forEach((line, i) => {
      line.geometry.getAttribute('position').needsUpdate = true;
      line.material.opacity = (.72 - i * .23) * (.88 + this.rippleAmount.value * .12) * (1 - frame.parcel.opacity * .48);
    });
  }

  setView(view: View): void {
    if (!this.available || !this.controls) return;
    this.view = view; this.syncingCamera = true;
    const target = new THREE.Vector3(0, -.48, 0); this.controls.target.copy(target);
    const offsets: Record<View, [number, number, number]> = { oblique: [5.4, 5.6, 10.3], front: [0, 1.35, 13], top: [.01, 14, .06] };
    this.camera.position.copy(target).add(new THREE.Vector3(...offsets[view]));
    this.camera.zoom = 1; this.controls.update(); this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
    this.syncingCamera = false; this.fit(); this.render(); this.onProjectionChange?.();
  }

  private fit(): void {
    const ratio = this.viewport.width / this.viewport.height;
    const minWidth = this.viewport.width < 560 ? 5.7 : 6.7;
    const maxBodyWidth = this.frame ? Math.max(2.6, this.frame.body.width) : 3.1;
    const height = Math.max(this.view === 'top' ? 5.6 : 4.65, Math.max(minWidth, maxBodyWidth * 1.85) / ratio);
    this.camera.left = -height * ratio / 2; this.camera.right = height * ratio / 2;
    this.camera.top = height / 2; this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
  }

  project(point: [number, number, number]): { x: number; y: number } {
    const projected = new THREE.Vector3(...point).project(this.camera);
    return { x: (projected.x + 1) * this.viewport.width / 2, y: (1 - projected.y) * this.viewport.height / 2 };
  }

  resize(): void {
    if (!this.available || !this.renderer) return;
    const width = Math.max(1, this.host.clientWidth), height = Math.max(1, this.host.clientHeight);
    this.viewport = { width, height }; this.renderer.setSize(width, height, false); this.fit(); this.render(); this.onProjectionChange?.();
  }

  private readonly handleWheelCapture = (event: WheelEvent): void => {
    if (!event.ctrlKey && !event.metaKey) event.stopImmediatePropagation();
  };
  private readonly handleCameraChange = (): void => {
    if (this.syncingCamera || !this.available) return;
    this.camera.updateMatrixWorld(); this.render(); this.onProjectionChange?.();
  };
  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault(); if (this.disposed || this.lost) return;
    this.lost = true; this.controls && (this.controls.enabled = false);
    if (this.canvas) this.canvas.hidden = true;
    this.onUnavailable?.();
  };

  private render(): void {
    if (!this.available || !this.renderer) return;
    try { this.renderer.render(this.world, this.camera); }
    catch (error) { console.warn('Buoyancy shore render failed', error); this.handleContextLost(new Event('webglcontextlost')); }
  }

  private releaseGPU(): void {
    this.observer?.disconnect(); this.observer = null;
    if (this.controls) { this.controls.removeEventListener('change', this.handleCameraChange); this.controls.dispose(); this.controls = null; }
    const canvas = this.renderer?.domElement;
    canvas?.removeEventListener('webglcontextlost', this.handleContextLost);
    canvas?.removeEventListener('wheel', this.handleWheelCapture, { capture: true });
    this.geometries.forEach(value => value.dispose()); this.materials.forEach(value => value.dispose()); this.textures.forEach(value => value.dispose());
    this.geometries.clear(); this.materials.clear(); this.textures.clear();
    this.environment?.dispose(); this.environment = null; this.world.environment = null;
    if (this.renderer) { this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove(); this.renderer = null; }
    this.world.clear();
  }

  dispose(): void {
    if (this.disposed) return; this.disposed = true; this.ready = false; this.releaseGPU();
  }
}
