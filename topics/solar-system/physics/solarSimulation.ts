interface PlanetNode {
  data: Planet; group: THREE.Group; tiltGroup: THREE.Group;
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  ringMesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial | THREE.ShaderMaterial> | null;
  moonMesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial> | null;
  currentPos: THREE.Vector3; orbitRadius: number; visualRadius: number;
  trueLineupRadius: number; lineupX: number;
}
import type { Planet } from '../data/planetsData.ts';
import { orbitalState } from './orbits.ts';
import { PlanetMaterials } from './planetMaterials.ts';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  SUN_DATA,
  PLANETS_DATA,
  getVisualOrbitRadius,
  getVisualPlanetRadius,
  getTrueScaleLineupRadius,
  getLineupPositionX
} from '../data/planetsData.ts';

export class SolarSimulation {
  container!: HTMLElement;
  width!: number;
  height!: number;
  timeYears!: number;
  speed!: number;
  isPlaying!: boolean;
  viewMode!: string;
  modeProgress!: number;
  activeView!: string;
  selectedPlanetId!: string | null;
  guidesVisible!: boolean;
  scene!: THREE.Scene;
  perspectiveCamera!: THREE.PerspectiveCamera;
  lineupCamera!: THREE.OrthographicCamera;
  camera!: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  cameraTransition!: boolean;
  lineupHalfHeight!: number;
  renderer!: THREE.WebGLRenderer;
  controls!: OrbitControls;
  _camPosTarget!: THREE.Vector3;
  _camLookTarget!: THREE.Vector3;
  systemGroup!: THREE.Group<THREE.Object3DEventMap>;
  orbitsGroup!: THREE.Group<THREE.Object3DEventMap>;
  planetsGroup!: THREE.Group<THREE.Object3DEventMap>;
  planetNodes!: Map<string, PlanetNode>;
  planetMaterials!: PlanetMaterials;
  sunLight!: THREE.PointLight;
  sunGroup!: THREE.Group<THREE.Object3DEventMap>;
  sunMesh!: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial, THREE.Object3DEventMap>;
  sunCorona!: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial, THREE.Object3DEventMap>;
  _projected!: THREE.Vector3;

  constructor(container: HTMLElement) {
    this.container = container;
    this.width = container.clientWidth || window.innerWidth;
    this.height = container.clientHeight || window.innerHeight;

    // Simulation Clock
    this.timeYears = 0.0;
    this.speed = 1.0;
    this.isPlaying = false;

    // Modes & View settings
    this.viewMode = 'orbit'; // 'orbit' | 'lineup'
    this.modeProgress = 0.0; // 0.0 = orbit, 1.0 = lineup
    this.activeView = 'perspective'; // 'perspective' | 'top' | 'lineup' | 'follow'
    this.selectedPlanetId = null;
    this.guidesVisible = true;

    // Three.js Core
    this.scene = new THREE.Scene();
    this.perspectiveCamera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.5, 3000);
    this.lineupCamera = new THREE.OrthographicCamera(-170,170,110,-110,.1,3000);
    this.camera = this.perspectiveCamera;
    this.cameraTransition = true;
    this.lineupHalfHeight = 110;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxDistance = 600;
    this.controls.minDistance = 4;
    this.controls.minZoom = .4;
    this.controls.maxZoom = 20;
    this.controls.addEventListener('start', () => { this.activeView = 'free'; this.cameraTransition = false; });

    // Camera targets
    this._camPosTarget = new THREE.Vector3(0, 75, 140);
    this._camLookTarget = new THREE.Vector3(0, 0, 0);

    // Groups
    this.systemGroup = new THREE.Group();
    this.scene.add(this.systemGroup);

    this.orbitsGroup = new THREE.Group();
    this.systemGroup.add(this.orbitsGroup);

    this.planetsGroup = new THREE.Group();
    this.systemGroup.add(this.planetsGroup);

    // Planet nodes cache
    this.planetNodes = new Map();

    // Init
    this.initLighting();
    this.initBackgroundStars();
    this.planetMaterials = new PlanetMaterials(this.renderer);
    this.initSun();
    this.initPlanets();
    this.initOrbits();

    // Listeners
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);

    // Initial camera position
    this.setCameraView('perspective');
  }

  initLighting() {
    // Ambient fill so planet night sides remain faintly readable
    const ambient = new THREE.AmbientLight(0x1a2638, 0.45);
    this.scene.add(ambient);

    // Core point light from the Sun
    this.sunLight = new THREE.PointLight(0xfff5e6, 3.2, 1200, 0.85);
    this.scene.add(this.sunLight);
  }

  initBackgroundStars() {
    const starCount = 3600;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 900 + Math.random() * 600;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Star spectral tints
      const rnd = Math.random();
      if (rnd < 0.25) {
        colors[i * 3] = 0.75; colors[i * 3 + 1] = 0.88; colors[i * 3 + 2] = 1.0; // blue-white
      } else if (rnd < 0.70) {
        colors[i * 3] = 0.98; colors[i * 3 + 1] = 0.96; colors[i * 3 + 2] = 0.94; // warm white
      } else {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.82; colors[i * 3 + 2] = 0.55; // amber
      }
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 1.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });

    const starPoints = new THREE.Points(geom, starMaterial);
    this.scene.add(starPoints);
  }

  initSun() {
    this.sunGroup = new THREE.Group();
    this.systemGroup.add(this.sunGroup);

    // Sun Photosphere Sphere
    const sunGeom = new THREE.SphereGeometry(7.5, 48, 48);
    const sunMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vPosition;

        float hash(vec3 p) {
          return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
        }
        float noise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
            mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
            f.z
          );
        }

        void main() {
          float n1 = noise(vPosition * 1.5 + vec3(uTime * 0.15, -uTime * 0.1, 0.0));
          float n2 = noise(vPosition * 4.0 - vec3(0.0, uTime * 0.25, uTime * 0.15)) * 0.45;
          float n = n1 * 0.7 + n2 * 0.3;

          vec3 sunAmber     = vec3(1.0, 0.58, 0.15);
          vec3 sunGold      = vec3(1.0, 0.84, 0.30);
          vec3 sunHighlight = vec3(1.0, 0.98, 0.70);

          vec3 col = mix(sunAmber, sunGold, n);
          col = mix(col, sunHighlight, pow(n, 2.2) * 0.35);

          float mu = max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
          float limb = 0.68 + 0.32 * pow(mu, 0.65);
          col *= limb;

          float rim = pow(1.0 - mu, 2.5);
          col += vec3(1.0, 0.75, 0.3) * rim * 0.5;

          gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
        }
      `
    });

    this.sunMesh = new THREE.Mesh(sunGeom, sunMat);
    this.sunGroup.add(this.sunMesh);

    // Sun Corona & Outer Atmospheric Glow
    const coronaGeom = new THREE.SphereGeometry(10.2, 48, 48);
    const coronaMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vec3 viewDir = normalize(vViewPosition);
          float viewDot = abs(dot(vNormal, viewDir));
          float limb = clamp(1.0 - viewDot, 0.0, 1.0);

          float corona = pow(limb, 1.8);
          vec3 flameCore = vec3(1.0, 0.86, 0.40);
          vec3 flameRim  = vec3(0.92, 0.25, 0.04);
          vec3 col = mix(flameRim, flameCore, smoothstep(0.1, 0.8, corona));

          gl_FragColor = vec4(col * corona * 1.5, corona * 0.85);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide
    });

    this.sunCorona = new THREE.Mesh(coronaGeom, coronaMat);
    this.sunGroup.add(this.sunCorona);
  }

  initPlanets() {
    const sphereGeom = new THREE.SphereGeometry(1, 80, 64);

    for (const data of PLANETS_DATA) {
      const pGroup = new THREE.Group();
      this.planetsGroup.add(pGroup);

      // Planet Tilt Wrapper (to tilt along axial inclination)
      const tiltGroup = new THREE.Group();
      tiltGroup.rotation.z = THREE.MathUtils.degToRad(data.axialTiltDeg);
      pGroup.add(tiltGroup);

      // Custom Planet Material with distinct features
      const pMat = this.planetMaterials.planet(data);
      const pMesh = new THREE.Mesh(sphereGeom, pMat);
      tiltGroup.add(pMesh);

      // Rings for Saturn & Uranus
      let ringMesh = null;
      if (data.rings) {
        ringMesh = this.createRingsMesh(data);
        tiltGroup.add(ringMesh);
      }

      // Moon for Earth
      let moonMesh = null;
      if (data.hasMoon) {
        const moonGeom = new THREE.SphereGeometry(1, 32, 24);
        const moonMat = this.planetMaterials.moon();
        moonMesh = new THREE.Mesh(moonGeom, moonMat);
        pGroup.add(moonMesh);
      }

      // Cache node reference
      this.planetNodes.set(data.id, {
        data,
        group: pGroup,
        tiltGroup,
        mesh: pMesh,
        ringMesh,
        moonMesh,
        currentPos: new THREE.Vector3(),
        orbitRadius: getVisualOrbitRadius(data.semiMajorAxisAU),
        visualRadius: getVisualPlanetRadius(data.relativeEarthDiameter),
        trueLineupRadius: getTrueScaleLineupRadius(data.diameterKm / 12742),
        lineupX: getLineupPositionX(data.index)
      });
    }
  }

  createRingsMesh(data: Planet) {
    const innerR = data.ringInnerRatio;
    const outerR = data.ringOuterRatio;
    if (innerR === undefined || outerR === undefined) throw new Error(`Missing ring dimensions: ${data.id}`);
    const ringGeom = new THREE.RingGeometry(innerR, outerR, 160);
    const positions=ringGeom.attributes.position,uvs=ringGeom.attributes.uv;
    for(let i=0;data.id === 'saturn' && i<positions.count;i++) {
      const radius=Math.hypot(positions.getX(i),positions.getY(i));
      uvs.setXY(i,(radius-innerR)/(outerR-innerR),.5);
    }
    uvs.needsUpdate=true;
    ringGeom.rotateX(-Math.PI / 2);

    const isSaturn = data.id === 'saturn';

    const ringMat = isSaturn ? this.planetMaterials.ring() : new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(isSaturn ? 0xd4af37 : 0x73c7c2) },
        uOpacity: { value: isSaturn ? 0.85 : 0.45 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          float r = length(vUv - vec2(0.5)) * 2.0;
          // Concentric Cassini divisions and ringlets
          float ringlet = sin(r * 50.0) * 0.2 + 0.8;
          // Cassini Division dark gap
          float cassini = smoothstep(0.68, 0.72, r) * (1.0 - smoothstep(0.72, 0.76, r));
          float alpha = uOpacity * ringlet * (1.0 - cassini * 0.85);

          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    return new THREE.Mesh(ringGeom, ringMat);
  }

  initOrbits() {
    for (const data of PLANETS_DATA) {
      const radius = getVisualOrbitRadius(data.semiMajorAxisAU);
      const points = [];
      const segments = 120;

      for (let i = 0; i <= segments; i++) {
        const state = orbitalState(data, i / segments * data.orbitalPeriodYears);
        const scale = radius / data.semiMajorAxisAU;
        points.push(new THREE.Vector3(state.x, state.y, state.z).multiplyScalar(scale));
      }

      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color(data.colorHex),
        transparent: true,
        opacity: 0.28
      });

      const orbitLine = new THREE.LineLoop(geom, mat);
      this.orbitsGroup.add(orbitLine);
    }
  }

  setCameraView(viewName: string, planetId: string | null = null) {
    this.activeView = viewName;
    this.cameraTransition = true;
    if (planetId) this.selectedPlanetId = planetId;
    if (this.viewMode === 'lineup') {
      const node = viewName === 'follow' && this.selectedPlanetId ? this.planetNodes.get(this.selectedPlanetId) : null;
      const x = node ? node.lineupX : viewName === 'planets' ? 0 : -106;
      this._camLookTarget.set(x,0,0);
      this._camPosTarget.set(x,140,420);
      this.lineupHalfHeight = node ? Math.max(1.5,node.trueLineupRadius*1.55) : viewName === 'planets' ? 18 : 110;
      this.lineupCamera.zoom = 1;
      this.fitLineupProjection();
    } else if (viewName === 'top') {
      this._camPosTarget.set(0,400,0.1);
      this._camLookTarget.set(0,0,0);
    } else if (viewName === 'inner') {
      this._camPosTarget.set(0,68,80);
      this._camLookTarget.set(0,0,0);
    } else if (viewName === 'outer') {
      this._camPosTarget.set(-45,190,350);
      this._camLookTarget.set(0,0,0);
    } else if (viewName === 'follow' && this.selectedPlanetId) {
      const node = this.planetNodes.get(this.selectedPlanetId);
      if(node) {
        const dist=Math.max(8,node.visualRadius*4.5);
        this._camPosTarget.copy(node.currentPos).add(new THREE.Vector3(dist*.7,dist*.4,dist*.9));
        this._camLookTarget.copy(node.currentPos);
      }
    } else {
      this._camPosTarget.set(-35,170,335);
      this._camLookTarget.set(0,0,0);
    }
  }

  fitLineupProjection() {
    const aspect = this.width / this.height;
    const halfWidth = this.activeView === 'planets' ? 66 : this.activeView === 'follow' ? 0 : 170;
    const h = Math.max(this.lineupHalfHeight,halfWidth/aspect);
    Object.assign(this.lineupCamera, {left:-h*aspect,right:h*aspect,top:h,bottom:-h});
    this.lineupCamera.updateProjectionMatrix();
  }

  labelPosition(point: THREE.Vector3) {
    if (!this._projected) this._projected = new THREE.Vector3();
    this._projected.copy(point).project(this.camera);
    return {
      x: ((this._projected.x + 1) / 2) * this.container.clientWidth,
      y: ((1 - this._projected.y) / 2) * this.container.clientHeight,
      visible: Math.abs(this._projected.x) < 0.95 && Math.abs(this._projected.y) < 0.92 && this._projected.z > -1 && this._projected.z < 1
    };
  }

  setViewMode(mode: string) {
    this.viewMode = mode;
    const nextCamera = mode === 'lineup' ? this.lineupCamera : this.perspectiveCamera;
    if(nextCamera !== this.camera) {
      nextCamera.position.copy(this.camera.position);
      this.camera = nextCamera;
      this.controls.object = nextCamera;
      this.cameraTransition = true;
    }
  }

  selectPlanet(planetId: string) {
    this.selectedPlanetId = planetId;
    if (planetId) {
      this.setCameraView('follow', planetId);
    }
  }

  setGuidesVisible(visible: boolean) {
    this.guidesVisible = !!visible;
    this.orbitsGroup.visible = this.guidesVisible;
  }

  onResize() {
    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || window.innerHeight;
    this.perspectiveCamera.aspect = this.width / this.height;
    this.perspectiveCamera.updateProjectionMatrix();
    this.fitLineupProjection();
    this.renderer.setSize(this.width, this.height);
  }

  update(deltaSeconds: number) {
    const dt = Math.min(deltaSeconds, 0.1);

    if (this.isPlaying) {
      // 1 earth year completes in ~12 seconds at 1x speed
      this.timeYears += (dt * this.speed) / 12.0;
    }

    // Smooth transition between Orbit Mode (0.0) and Lineup Mode (1.0)
    const targetModeProgress = this.viewMode === 'lineup' ? 1.0 : 0.0;
    this.modeProgress = THREE.MathUtils.lerp(this.modeProgress, targetModeProgress, dt * 4.0);

    // Update Sun Shaders & Scale
    const simTime = this.timeYears * 10.0;
    if (this.sunMesh?.material?.uniforms) {
      this.sunMesh.material.uniforms.uTime.value = simTime;
    }
    if (this.sunCorona?.material?.uniforms) {
      this.sunCorona.material.uniforms.uTime.value = simTime;
    }

    // In lineup mode, sun shifts to the left and scales up to demonstrate true solar dominance
    const sunLineupX = -166.0;
    const sunCurrentX = THREE.MathUtils.lerp(0.0, sunLineupX, this.modeProgress);
    const sunCurrentScale = THREE.MathUtils.lerp(1.0, getTrueScaleLineupRadius(SUN_DATA.diameterKm / 12742) / 7.5, this.modeProgress);
    this.sunGroup.position.set(sunCurrentX, 0, 0);
    this.sunGroup.scale.setScalar(sunCurrentScale);
    this.sunLight.position.copy(this.sunGroup.position);
    this.sunCorona.visible = this.modeProgress < 0.85;

    // Orbits fade out during lineup mode
    this.orbitsGroup.visible = this.guidesVisible && (this.modeProgress < 0.85);

    // Update all 8 Planets
    for (const [id, node] of this.planetNodes) {
      const data = node.data;

      const state = orbitalState(data, this.timeYears);
      const orbitScale = node.orbitRadius / data.semiMajorAxisAU;
      const lineupPos = new THREE.Vector3(node.lineupX,0,0);
      const orbitPos = new THREE.Vector3(state.x,state.y,state.z).multiplyScalar(orbitScale);

      // Slerp / Lerp between orbit and lineup
      node.currentPos.lerpVectors(orbitPos, lineupPos, this.modeProgress);
      node.group.position.copy(node.currentPos);

      // 3. Size Transition: Visual Size vs. True Physical Scale Size
      const currentRadius = THREE.MathUtils.lerp(node.visualRadius, node.trueLineupRadius, this.modeProgress);
      node.mesh.scale.setScalar(currentRadius);

      // Rings scale with planet radius
      if (node.ringMesh) {
        node.ringMesh.scale.setScalar(currentRadius);
      }

      // Moon orbit around Earth
      if (node.moonMesh) {
        const moonAngle = this.timeYears * Math.PI * 2 * 13.4; // ~13.4 lunar months per year
        const moonDist = currentRadius * 2.6;
        node.moonMesh.position.set(
          Math.cos(moonAngle) * moonDist,
          0,
          -Math.sin(moonAngle) * moonDist
        );
        node.moonMesh.scale.setScalar(currentRadius * 0.27);
      }

      // 4. Axial Rotation on its own axis
      // Axial tilts > 90° already encode retrograde axes. Preserve that
      // direction rather than applying the signed period a second time.
      const rotSpeed = 365.25 / (Math.abs(data.rotationHours) / 24.0);
      node.mesh.rotation.y = this.timeYears * rotSpeed * Math.PI * 2;

      // Update shader uniforms
      if (node.mesh.material.uniforms) {
        node.mesh.material.uniforms.uTime.value = simTime;
        node.mesh.material.uniforms.uComparison.value = this.modeProgress;
        node.mesh.material.uniforms.uLightPos.value.copy(this.sunGroup.position);
      }
    }

    // Camera follow update if tracking a planet
    if (this.viewMode !== 'lineup' && this.activeView === 'follow' && this.selectedPlanetId) {
      const targetNode = this.planetNodes.get(this.selectedPlanetId);
      if (targetNode) {
        const dist = Math.max(9.5, targetNode.mesh.scale.x * 5.2);
        this._camPosTarget.copy(targetNode.currentPos).add(new THREE.Vector3(dist * 0.7, dist * 0.45, dist * 0.95));
        this._camLookTarget.copy(targetNode.currentPos);
      }
    }

    const tracking = this.viewMode !== 'lineup' && this.activeView === 'follow';
    if(this.cameraTransition || tracking) {
      const blend = 1 - Math.exp(-dt * 7);
      this.camera.position.lerp(this._camPosTarget,blend);
      this.controls.target.lerp(this._camLookTarget,blend);
      if(!tracking && this.camera.position.distanceTo(this._camPosTarget)<.005) this.cameraTransition = false;
    }
    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener('resize', this.onResize);
    this.controls.dispose();
    this.scene.traverse(object => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points)) return;
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(material => material?.dispose());
    });
    this.planetMaterials.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
