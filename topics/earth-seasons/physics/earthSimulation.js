import { solarGeometry, cityIllumination, surfaceNormal } from './solarGeometry.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import dayMapUrl from '../assets/earth_atmos_2048.jpg';
import nightMapUrl from '../assets/earth_lights_2048.png';
import cloudsMapUrl from '../assets/earth_clouds_1024.png';
import {
  EARTH_CONSTANTS,
  calcSubsolarLatitude,
  calcNoonSolarAltitude,
  calcDaylightHours,
  calcSolarHeatFlux,
  MAJOR_CITIES
} from '../data/seasonsData.js';

export class EarthSimulation {
  constructor(container) {
    this.container = container;
    this.width = container.clientWidth || window.innerWidth;
    this.height = container.clientHeight || window.innerHeight;

    // Astronomical Clock & State
    this.rotationProgress = 0.0; // 0.0 ~ 1.0 (1 day = 24h)
    this.orbitProgress = 0.0; // 0.0 ~ 1.0 (1 year = 365.25d, 0.0=春分, 0.25=夏至, 0.5=秋分, 0.75=冬至)
    this.isPlaying = false;
    this.speed = 1.0;
    this.scenario = 'daynight'; // 'daynight' | 'seasons' | 'angle' | 'notilt'
    this.targetTiltDeg = EARTH_CONSTANTS.axialTiltDeg;
    this.currentTiltDeg = EARTH_CONSTANTS.axialTiltDeg;
    this.guidesVisible = true;
    this.selectedCityId = 'beijing';

    // Three.js Core
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, this.width / this.height, 0.1, 2000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxDistance = 300;
    this.controls.minDistance = 1.8;
    this.controls.addEventListener('start', () => { this.view = 'free'; this.cameraTransition = false; });
    this.view = 'standard';
    this.cameraTransition = true;

    // Camera targets
    this._camPosTarget = new THREE.Vector3(0, 1.2, 4.2);
    this._camLookTarget = new THREE.Vector3(0, 0, 0);
    this._projected = new THREE.Vector3();

    // Groups Hierarchy
    this.systemGroup = new THREE.Group();
    this.scene.add(this.systemGroup);

    // 1. Orbital System (Used in 'seasons' scenario)
    this.sunGroup = new THREE.Group();
    this.systemGroup.add(this.sunGroup);

    this.orbitCurveGroup = new THREE.Group();
    this.systemGroup.add(this.orbitCurveGroup);

    // 2. Earth Group (Contains Tilted Axis -> Earth Sphere + Atmosphere + Guides)
    this.earthAnchorGroup = new THREE.Group();
    this.systemGroup.add(this.earthAnchorGroup);

    this.axialTiltGroup = new THREE.Group();
    this.earthAnchorGroup.add(this.axialTiltGroup);

    this.earthSpinGroup = new THREE.Group();
    this.axialTiltGroup.add(this.earthSpinGroup);

    // 3. Sunbeam Angle Visualizer Group (Used in 'angle' scenario)
    this.beamGroup = new THREE.Group();
    this.systemGroup.add(this.beamGroup);

    // Assets & Textures
    this.textureLoader = new THREE.TextureLoader();
    this.loadTextures();

    // Scene Construction
    this.initLighting();
    this.initBackgroundStars();
    this.initSun();
    this.initOrbitPath();
    this.initEarthMesh();
    this.initCloudsMesh();
    this.initGuides();
    this.initCityMarkers();
    this.initSubsolarMarker();
    this.initSunbeams();

    // Resize handler
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);

    // Set initial view
    this.selectScenario('daynight');
  }

  loadTextures() {
    this.dayTexture = this.textureLoader.load(dayMapUrl);
    this.nightTexture = this.textureLoader.load(nightMapUrl);
    this.cloudsTexture = this.textureLoader.load(cloudsMapUrl);

    this.dayTexture.colorSpace = THREE.SRGBColorSpace;
    this.nightTexture.colorSpace = THREE.SRGBColorSpace;
  }

  initLighting() {
    // Ambient light: night side remains faintly identifiable
    this.ambientLight = new THREE.AmbientLight(0x101b2b, 0.35);
    this.scene.add(this.ambientLight);

    // Sun directional/point light
    this.sunDirectional = new THREE.DirectionalLight(0xfffcf0, 2.8);
    this.sunDirectional.position.set(-50, 0, 0); // Sun shines from -X in daynight close-up
    this.scene.add(this.sunDirectional);
  }

  initBackgroundStars() {
    const count = 2400;
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const u = Math.random(), v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 700 + Math.random() * 500;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const br = 0.6 + Math.random() * 0.4;
      col[i * 3] = br;
      col[i * 3 + 1] = br * (0.85 + Math.random() * 0.15);
      col[i * 3 + 2] = br * (0.9 + Math.random() * 0.1);
    }

    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const mat = new THREE.PointsMaterial({ size: 1.5, vertexColors: true, transparent: true, opacity: 0.85 });
    this.stars = new THREE.Points(geom, mat);
    this.scene.add(this.stars);
  }

  initSun() {
    // Glowing Sun sphere for seasons orbital view
    const sunGeom = new THREE.SphereGeometry(3.6, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffe680 });
    this.sunMesh = new THREE.Mesh(sunGeom, sunMat);
    this.sunGroup.add(this.sunMesh);

    // Sun corona glow
    const coronaGeom = new THREE.SphereGeometry(4.8, 32, 32);
    const coronaMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(max(0.0, 0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.2);
          gl_FragColor = vec4(1.0, 0.68, 0.2, 1.0) * intensity * 1.8;
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    this.sunCorona = new THREE.Mesh(coronaGeom, coronaMat);
    this.sunGroup.add(this.sunCorona);

    this.sunGroup.visible = false; // Hidden in close-up daynight mode
  }

  initOrbitPath() {
    // Elliptical/circular orbit path (radius ~32)
    const points = [];
    const segments = 128;
    this.orbitRadius = 32.0;

    for (let i = 0; i <= segments; i++) {
      const th = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(th) * this.orbitRadius, 0, Math.sin(th) * this.orbitRadius));
    }

    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 });
    this.orbitLine = new THREE.LineLoop(geom, mat);
    this.orbitCurveGroup.add(this.orbitLine);
    this.orbitCurveGroup.visible = false;
  }

  initEarthMesh() {
    const radius = 1.0;
    const geom = new THREE.SphereGeometry(radius, 64, 64);

    // Custom Earth Shader blending real Day texture with real Night Lights
    this.earthMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uDayMap: { value: this.dayTexture },
        uNightMap: { value: this.nightTexture },
        uSunDir: { value: new THREE.Vector3(-1, 0, 0) }, // In earthSpinGroup local space
        uCityHighlight: { value: new THREE.Vector3(0, 0, 0) },
        uHasCityHighlight: { value: 0.0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vViewPos;
        varying vec3 vSurfaceNormal;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vUv = uv;
          vPosition = position;
          vSurfaceNormal = normal;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewPos = -mvPos.xyz;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform sampler2D uDayMap;
        uniform sampler2D uNightMap;
        uniform vec3 uSunDir;
        uniform vec3 uCityHighlight;
        uniform float uHasCityHighlight;

        varying vec3 vNormal;
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vViewPos;
        varying vec3 vSurfaceNormal;

        void main() {
          vec3 n = normalize(vNormal);
          vec3 sunDir = normalize(uSunDir);

          // Sunlight dot product
          float sunDot = dot(normalize(vSurfaceNormal), sunDir);

          // Smooth twilight / terminator transition (-0.15 to +0.15)
          float dayFactor = smoothstep(-0.12, 0.12, sunDot);
          float nightFactor = 1.0 - smoothstep(-0.18, 0.08, sunDot);

          // Textures
          vec4 dayTex = texture2D(uDayMap, vUv);
          vec4 nightTex = texture2D(uNightMap, vUv);

          // Night side: faint blue-gray ambient ground + bright golden city lights
          vec3 nightBase = dayTex.rgb * 0.035;
          vec3 nightLights = nightTex.rgb * vec3(1.3, 1.12, 0.78) * 1.8;
          vec3 nightTotal = nightBase + nightLights;

          // Day side: full color + soft sun specular boost
          vec3 dayTotal = dayTex.rgb;

          // Final mix between day and night
          vec3 color = mix(nightTotal, dayTotal, dayFactor);

          // Atmospheric limb rim glow
          float viewDot = max(0.0, dot(normalize(vViewPos), n));
          float rim = pow(1.0 - viewDot, 2.8);
          color += vec3(0.22, 0.62, 1.0) * rim * 0.42 * max(0.08, dayFactor);

          // City pulse circle marker
          if (uHasCityHighlight > 0.5) {
            float dist = distance(normalize(vPosition), normalize(uCityHighlight));
            if (dist < 0.055) {
              float ring = smoothstep(0.035, 0.045, dist) - smoothstep(0.045, 0.055, dist);
              color = mix(color, vec3(1.0, 0.85, 0.2), ring * 0.95);
            }
          }

          gl_FragColor = vec4(color, 1.0);
          #include <colorspace_fragment>
        }
      `
    });

    this.earthMesh = new THREE.Mesh(geom, this.earthMaterial);
    this.earthSpinGroup.add(this.earthMesh);
  }

  initCloudsMesh() {
    const cloudsGeom = new THREE.SphereGeometry(1.014, 64, 64);
    const cloudsMat = new THREE.MeshStandardMaterial({
      map: this.cloudsTexture,
      transparent: true,
      opacity: 0.68,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.cloudsMesh = new THREE.Mesh(cloudsGeom, cloudsMat);
    this.earthSpinGroup.add(this.cloudsMesh);
  }

  initGuides() {
    this.guidesGroup = new THREE.Group();
    this.axialTiltGroup.add(this.guidesGroup);

    // 1. North-South Polar Axis Indicator Line
    const axisPoints = [new THREE.Vector3(0, -1.65, 0), new THREE.Vector3(0, 1.65, 0)];
    const axisGeom = new THREE.BufferGeometry().setFromPoints(axisPoints);
    const axisMat = new THREE.LineBasicMaterial({ color: 0x38efef, transparent: true, opacity: 0.85 });
    const axisLine = new THREE.Line(axisGeom, axisMat);
    this.guidesGroup.add(axisLine);

    // North Pole Arrow Cone
    const arrowGeom = new THREE.ConeGeometry(0.045, 0.12, 16);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x38efef });
    const arrowMesh = new THREE.Mesh(arrowGeom, arrowMat);
    arrowMesh.position.set(0, 1.70, 0);
    this.guidesGroup.add(arrowMesh);

    // 2. Latitude Reference Circles (Equator, Tropics, Polar Circles)
    const createLatRing = (latDeg, colorHex, opacity, dash = false) => {
      const rLat = Math.cos((latDeg * Math.PI) / 180.0) * 1.002;
      const yLat = Math.sin((latDeg * Math.PI) / 180.0) * 1.002;
      const pts = [];
      const segs = 96;

      for (let i = 0; i <= segs; i++) {
        const th = (i / segs) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(th) * rLat, yLat, Math.sin(th) * rLat));
      }

      const ringGeom = new THREE.BufferGeometry().setFromPoints(pts);
      const ringMat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity });
      return new THREE.LineLoop(ringGeom, ringMat);
    };

    // Equator (0°, gold)
    this.guidesGroup.add(createLatRing(0.0, 0xeab308, 0.75));
    // Tropic of Cancer (23.44°N, orange)
    this.guidesGroup.add(createLatRing(EARTH_CONSTANTS.axialTiltDeg, 0xf97316, 0.65));
    // Tropic of Capricorn (23.44°S, orange)
    this.guidesGroup.add(createLatRing(-EARTH_CONSTANTS.axialTiltDeg, 0xf97316, 0.65));
    // Arctic Circle (66.56°N, cyan)
    this.guidesGroup.add(createLatRing(EARTH_CONSTANTS.polarCircleLatitudeDeg, 0x38bdf8, 0.65));
    // Antarctic Circle (66.56°S, cyan)
    this.guidesGroup.add(createLatRing(-EARTH_CONSTANTS.polarCircleLatitudeDeg, 0x38bdf8, 0.65));
  }

  initCityMarkers() {
    this.citiesGroup = new THREE.Group();
    this.earthSpinGroup.add(this.citiesGroup);

    this.cityMeshMap = new Map();

    for (const city of MAJOR_CITIES) {
      const markerGeom = new THREE.SphereGeometry(0.024, 16, 16);
      const markerMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
      const mesh = new THREE.Mesh(markerGeom, markerMat);

      const normal = surfaceNormal(city.lat, city.lon);
      mesh.position.set(normal.x, normal.y, normal.z).multiplyScalar(1.006);

      this.citiesGroup.add(mesh);
      this.cityMeshMap.set(city.id, { city, mesh });
    }
  }

  initSubsolarMarker() {
    // Glowing golden ring on Earth surface marking Subsolar point
    const ringGeom = new THREE.RingGeometry(0.04, 0.058, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    this.subsolarRing = new THREE.Mesh(ringGeom, ringMat);
    this.earthSpinGroup.add(this.subsolarRing);
  }

  initSunbeams() {
    // Visualization of parallel rays hitting Equator vs 60°N for 'angle' scenario
    const beamMatDirect = new THREE.LineBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.75 });
    const beamMatSlant = new THREE.LineBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.75 });

    // Direct Ray (y = 0)
    const pts1 = [new THREE.Vector3(-4.5, 0, 0), new THREE.Vector3(-1.0, 0, 0)];
    this.directBeamLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts1), beamMatDirect);
    this.beamGroup.add(this.directBeamLine);

    // Slanted Ray (y = 0.866 -> 60°N)
    const ySlant = Math.sin((55 * Math.PI) / 180);
    const xSlant = -Math.cos((55 * Math.PI) / 180);
    const pts2 = [new THREE.Vector3(-4.5, ySlant, 0), new THREE.Vector3(xSlant, ySlant, 0)];
    this.slantBeamLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts2), beamMatSlant);
    this.beamGroup.add(this.slantBeamLine);

    this.beamGroup.visible = false;
  }

  selectScenario(sc) {
    this.scenario = sc;

    this.sunGroup.visible = ['seasons','notilt'].includes(sc);
    this.orbitCurveGroup.visible = ['seasons','notilt'].includes(sc);
    this.beamGroup.visible = sc === 'angle';
    this.targetTiltDeg = sc === 'notilt' ? 0 : EARTH_CONSTANTS.axialTiltDeg;
    this.currentTiltDeg = this.targetTiltDeg;
    this.setView('standard');
  }

  setView(view) {
    this.view = view;
    this.cameraTransition = true;
    this.updateCameraTarget();
  }

  updateCameraTarget() {
    const anchor = this.earthAnchorGroup.position;
    const closeDistance = ['seasons','notilt'].includes(this.scenario) ? 24 : 4.8;
    const sun = this.illumination?.sunWorld ?? {x:0,y:0,z:-1};
    if (this.view === 'north') {
      this._camLookTarget.copy(anchor);
      const axis = new THREE.Vector3(0,1,0).applyAxisAngle(new THREE.Vector3(0,0,1), THREE.MathUtils.degToRad(this.currentTiltDeg));
      this._camPosTarget.copy(anchor).addScaledVector(axis, closeDistance).add(new THREE.Vector3(0,0,.02));
    } else if (this.view === 'sun') {
      this._camLookTarget.copy(anchor);
      this._camPosTarget.copy(anchor).add(new THREE.Vector3(sun.x,sun.y,sun.z).multiplyScalar(closeDistance));
    } else if (this.view === 'standard') {
      if(['seasons','notilt'].includes(this.scenario)) {
        const distance = Math.max(105, 90 / this.camera.aspect);
        this._camPosTarget.set(0, distance * .66, distance * .75);
        this._camLookTarget.set(0,0,0);
      } else if (this.scenario === 'angle') {
        const light = new THREE.Vector3(sun.x,sun.y,sun.z);
        const side = new THREE.Vector3(-sun.z,0,sun.x);
        this._camLookTarget.copy(light).multiplyScalar(.7);
        this._camPosTarget.copy(light).multiplyScalar(1.8).addScaledVector(side,5).add(new THREE.Vector3(0,1.2,0));
      } else {
        this._camPosTarget.set(-3.8,1.2,.8);
        this._camLookTarget.set(0,0,0);
      }
    }
  }

  getCityReadout(city) {
    const light = solarGeometry(this.orbitProgress, this.rotationProgress, this.currentTiltDeg);
    return { ...cityIllumination(city.lat, city.lon, light.sunLocal),
      declination: light.declination,
      noonAltitude: calcNoonSolarAltitude(city.lat, light.declination),
      daylight: calcDaylightHours(city.lat, light.declination) };
  }

  selectCity(cityId) {
    this.selectedCityId = cityId;
    const item = this.cityMeshMap.get(cityId);

    if (item && this.earthMaterial) {
      this.earthMaterial.uniforms.uCityHighlight.value.copy(item.mesh.position);
      this.earthMaterial.uniforms.uHasCityHighlight.value = 1.0;


    }
  }

  setSolsticeTerm(fractionOfYear) {
    this.orbitProgress = fractionOfYear;
  }

  setGuidesVisible(visible) {
    this.guidesVisible = !!visible;
    this.guidesGroup.visible = this.guidesVisible;
  }

  onResize() {
    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
    if(this.view !== 'free') { this.updateCameraTarget(); this.cameraTransition = true; }
  }

  labelPosition(point) {
    this._projected.copy(point).project(this.camera);
    return {
      x: ((this._projected.x + 1) / 2) * this.container.clientWidth,
      y: ((1 - this._projected.y) / 2) * this.container.clientHeight,
      visible:
        Math.abs(this._projected.x) < 0.95 &&
        Math.abs(this._projected.y) < 0.92 &&
        this._projected.z > -1 &&
        this._projected.z < 1
    };
  }

  update(deltaSeconds) {
    const dt = Math.min(deltaSeconds, 0.1);

    this.axialTiltGroup.rotation.z = THREE.MathUtils.degToRad(this.currentTiltDeg);

    // Simulation Clock
    if (this.isPlaying) {
      if (['seasons','notilt'].includes(this.scenario)) {
        // In seasons mode, 1 year finishes in ~24s at 1x
        this.orbitProgress = (this.orbitProgress + (dt * this.speed) / 24.0) % 1.0;
        // Earth still spins on its axis (faster)
        this.rotationProgress = (this.rotationProgress + (dt * this.speed * 8.0) / 24.0) % 1.0;
      } else {
        // In daynight/angle/notilt mode, 1 day finishes in ~14s at 1x
        this.rotationProgress = (this.rotationProgress + (dt * this.speed) / 14.0) % 1.0;
      }
    }

    // 1. Earth Axial Rotation (自西向东自转 = Y 轴逆时针旋转)
    const spinAngle = this.rotationProgress * Math.PI * 2.0;
    this.earthSpinGroup.rotation.y = spinAngle;

    // Clouds rotate independently slightly faster
    this.cloudsMesh.rotation.y = spinAngle * 0.08;

    this.illumination = solarGeometry(this.orbitProgress, this.rotationProgress, this.currentTiltDeg);
    const {orbit, sunWorld, sunLocal} = this.illumination;
    this.earthAnchorGroup.scale.setScalar(['seasons','notilt'].includes(this.scenario) ? 5 : 1);
    this.earthAnchorGroup.position.set(orbit.x, orbit.y, orbit.z)
      .multiplyScalar(['seasons','notilt'].includes(this.scenario) ? this.orbitRadius : 0);
    this.earthMaterial.uniforms.uSunDir.value.set(sunLocal.x,sunLocal.y,sunLocal.z);
    this.sunDirectional.target = this.earthAnchorGroup;
    this.sunDirectional.position.copy(this.earthAnchorGroup.position)
      .add(new THREE.Vector3(sunWorld.x,sunWorld.y,sunWorld.z).multiplyScalar(50));
    this.subsolarRing.position.set(sunLocal.x,sunLocal.y,sunLocal.z).multiplyScalar(1.008);
    this.subsolarRing.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(sunLocal.x,sunLocal.y,sunLocal.z));
    this.beamGroup.quaternion.setFromUnitVectors(new THREE.Vector3(-1,0,0),new THREE.Vector3(sunWorld.x,sunWorld.y,sunWorld.z));

    if(this.view !== 'free') this.updateCameraTarget();
    const tracking = ['seasons','notilt'].includes(this.scenario) && ['north','sun'].includes(this.view);
    if (this.cameraTransition || tracking) {
      const fraction = 1 - Math.exp(-dt * 7);
      this.camera.position.lerp(this._camPosTarget, fraction);
      this.controls.target.lerp(this._camLookTarget, fraction);
      if(!tracking && this.camera.position.distanceTo(this._camPosTarget)<.003) this.cameraTransition = false;
    }
    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener('resize', this.onResize);
    this.controls.dispose();
    this.scene.traverse(object => {
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(material => material?.dispose());
    });
    [this.dayTexture, this.nightTexture, this.cloudsTexture].forEach(texture => texture?.dispose());
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
