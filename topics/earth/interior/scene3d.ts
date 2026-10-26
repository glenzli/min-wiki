import * as THREE from 'three';
import { createThreeStage, type ThreeStage } from '../threeStage';
import { EARTH, type InteriorLayer, type InteriorState } from './model';

export interface InteriorScene {
  update: (state: InteriorState) => void;
  pause: (paused: boolean) => void;
  resetCamera: () => void;
  dispose: () => void;
}
type CameraState = Pick<InteriorState, 'interiorYaw' | 'interiorPitch' | 'interiorZoom'>;
type SceneCopy = { label: string; onUnavailable: () => void; onCamera: (camera: CameraState) => void };
const phiStart = Math.PI / 2, phiLength = Math.PI * 1.5;
const rad = Math.PI / 180;

/** Half-annulus on either radial wedge face, with radii in one common unit. */
export function cutFaceGeometry(inner: number, outer: number, azimuth: number, segments: number): THREE.BufferGeometry {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = -Math.PI / 2 + Math.PI * i / segments;
    for (const radius of [inner, outer]) {
      const horizontal = Math.cos(theta) * radius, y = Math.sin(theta) * radius;
      const x = -Math.cos(azimuth) * horizontal, z = Math.sin(azimuth) * horizontal;
      positions.push(x, y, z);
      uvs.push((x - z + 1) / 2, (y + 1) / 2);
    }
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function materialTexture(kind: InteriorLayer, size: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(size, size);
  const colors: Record<InteriorLayer, [number, number, number]> = {
    crust: [89, 69, 53], mantle: [166, 93, 54], outerCore: [202, 145, 62], innerCore: [228, 194, 121], lithosphere: [56, 86, 93],
  };
  const base = colors[kind];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const grain = Math.sin(x * 29.31 + y * 63.73) * Math.sin(x * 13.79 - y * 17.19);
    const broad = Math.sin(u * Math.PI * 14 + Math.sin(v * Math.PI * 7) * .7) * .5 + Math.sin(v * Math.PI * 18 + u * 5) * .3;
    const fine = kind === 'mantle' || kind === 'crust' ? grain * 11 + broad * 2.2 : grain * 4 + broad * 1.6;
    const i = (y * size + x) * 4;
    image.data[i] = Math.max(0, Math.min(255, base[0] + fine));
    image.data[i + 1] = Math.max(0, Math.min(255, base[1] + fine * .8));
    image.data[i + 2] = Math.max(0, Math.min(255, base[2] + fine * .65));
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function cameraPosition(state: CameraState): [number, number, number] {
  const distance = 4.4 * 100 / state.interiorZoom;
  return [Math.sin(state.interiorYaw * rad) * Math.cos(state.interiorPitch * rad) * distance,
    Math.sin(state.interiorPitch * rad) * distance,
    Math.cos(state.interiorYaw * rad) * Math.cos(state.interiorPitch * rad) * distance];
}

export function mountInteriorScene(host: HTMLElement, initial: InteriorState, copy: SceneCopy): InteriorScene {
  let disposed = false, current = initial;
  const stage: ThreeStage = createThreeStage(host, { label: copy.label, cameraPosition: cameraPosition(initial), minDistance: 2.75, maxDistance: 7.3334, background: '#102630', onUnavailable: copy.onUnavailable });
  const narrow = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
  const widthSegments = narrow ? 64 : 96, heightSegments = narrow ? 40 : 64;
  const faceSegments = narrow ? 72 : 112, textureSize = narrow ? 256 : 512;
  stage.controls.minPolarAngle = 25 * rad; stage.controls.maxPolarAngle = 155 * rad;
  stage.renderer.toneMappingExposure = 1.04;
  host.dataset.interiorGeometry = narrow ? 'compact' : 'detailed';
  host.dataset.interiorModel = 'true-radius-cutaway';
  const materialSets = new Map<InteriorLayer, THREE.MeshStandardMaterial[]>();
  const mantleOuter = (EARTH.radiusKm - EARTH.referenceContinentalCrustKm) / EARTH.radiusKm;
  const coreOuter = EARTH.coreRadiusKm / EARTH.radiusKm, innerOuter = EARTH.innerCoreRadiusKm / EARTH.radiusKm;
  const shells: [InteriorLayer, number, number][] = [
    ['crust', mantleOuter, 1], ['mantle', coreOuter, mantleOuter], ['outerCore', innerOuter, coreOuter], ['innerCore', 0, innerOuter],
  ];
  const loader = new THREE.TextureLoader();
  let earthTexture: THREE.Texture | undefined;
  for (const [layer, inside, outside] of shells) {
    const texture = materialTexture(layer, textureSize);
    const metallic = layer === 'innerCore' || layer === 'outerCore';
    const faceMaterial = new THREE.MeshStandardMaterial({ map: texture, bumpMap:texture,bumpScale:metallic?.0025:.008,roughness: metallic ? .35 : .94, metalness: metallic ? .58 : 0, side: THREE.DoubleSide });
    const sphereMaterial = faceMaterial.clone();
    if (layer === 'crust') {
      sphereMaterial.roughness = .83; sphereMaterial.color.set('#ffffff');
      // The returned texture is attached immediately, so disposal also covers an in-flight load.
      earthTexture = loader.load(new URL('../../earth-moon/assets/2k_earth_daymap.webp', import.meta.url).href, texture => {
        if (disposed) { texture.dispose(); return; }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(4, stage.renderer.capabilities.getMaxAnisotropy());
        sphereMaterial.needsUpdate = true; stage.requestRender();
      }, undefined, () => { if (!disposed) copy.onUnavailable(); });
      earthTexture.colorSpace = THREE.SRGBColorSpace;
      sphereMaterial.map = earthTexture;
    }
    const geometry = new THREE.SphereGeometry(outside, widthSegments, heightSegments, phiStart, phiLength);
    const uv = geometry.getAttribute('uv');
    // SphereGeometry otherwise stretches a complete equirectangular map into 270 degrees.
    for (let i = 0; i < uv.count; i++) uv.setX(i, (phiStart + uv.getX(i) * phiLength) / (2 * Math.PI));
    uv.needsUpdate = true;
    const surface = new THREE.Mesh(geometry, sphereMaterial); surface.name = `${layer}-spherical-shell`;
    stage.group.add(surface);
    for (const angle of [0, Math.PI / 2]) {
      const face = new THREE.Mesh(cutFaceGeometry(inside, outside, angle, faceSegments), faceMaterial);
      face.name = `${layer}-radial-section`; stage.group.add(face);
    }
    materialSets.set(layer, [faceMaterial, sphereMaterial]);
  }
  // Two fine dashed section guides show a mechanical classification, not extra material.
  const lithosphereGuide = new THREE.Group();
  const lithoRadius = (EARTH.radiusKm - EARTH.referenceLithosphereKm) / EARTH.radiusKm;
  for (const angle of [0, Math.PI / 2]) {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 120; i++) {
      const theta = -Math.PI / 2 + i / 120 * Math.PI;
      points.push(new THREE.Vector3(-Math.cos(angle) * Math.cos(theta) * lithoRadius - Math.sin(angle) * .0015, Math.sin(theta) * lithoRadius, Math.sin(angle) * Math.cos(theta) * lithoRadius + Math.cos(angle) * .0015));
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineDashedMaterial({ color: 0xe6f6f4, dashSize: .035, gapSize: .018, transparent: true, opacity: .8 }));
    line.computeLineDistances(); line.renderOrder = 5; lithosphereGuide.add(line);
  }
  stage.group.add(lithosphereGuide);
  // A locator is deliberately nonmetric, exactly as in the companion 2D section.
  const marker = new THREE.Mesh(new THREE.SphereGeometry(.013, 16, 12), new THREE.MeshBasicMaterial({ color: 0xe9faff }));
  marker.renderOrder = 6; stage.group.add(marker);
  const radiusLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, .002), new THREE.Vector3(-.72, .694, .002)]), new THREE.LineDashedMaterial({ color: 0xd3e4df, dashSize: .025, gapSize: .018, transparent: true, opacity: .7 }));
  radiusLine.computeLineDistances(); radiusLine.renderOrder = 5; stage.group.add(radiusLine);
  const axis = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1.06, 0), new THREE.Vector3(0, 1.06, 0)]), new THREE.LineBasicMaterial({ color: 0x789396, transparent: true, opacity: .45 }));
  stage.group.add(axis);

  function update(state: InteriorState) {
    if (disposed) return;
    current = state;
    const radius = (EARTH.radiusKm - state.interiorDepth) / EARTH.radiusKm;
    marker.position.set(-.72 * radius, .694 * radius, .003);
    lithosphereGuide.visible = state.interiorLens === 'mechanical';
    for (const [layer, materials] of materialSets) for (const material of materials) {
      material.emissive.set(layer === state.interiorLayer ? '#5b3213' : '#000000');
      material.emissiveIntensity = layer === state.interiorLayer ? .14 : 0;
    }
    stage.requestRender();
  }
  function saveCamera() {
    if (disposed) return;
    const offset = stage.camera.position.clone().sub(stage.controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    const yaw = ((Math.round(spherical.theta / rad) + 180) % 360 + 360) % 360 - 180;
    const pitch = Math.max(-65, Math.min(65, Math.round(90 - spherical.phi / rad)));
    const zoom = Math.max(60, Math.min(160, Math.round(440 / spherical.radius)));
    if (yaw !== current.interiorYaw || pitch !== current.interiorPitch || zoom !== current.interiorZoom) copy.onCamera({ interiorYaw: yaw, interiorPitch: pitch, interiorZoom: zoom });
  }
  stage.controls.addEventListener('end', saveCamera);
  stage.canvas.addEventListener('keyup', saveCamera);
  update(initial);
  return {
    update,
    pause: value => stage.setPaused(value),
    resetCamera() {
      const position = cameraPosition({ interiorYaw: -45, interiorPitch: 23, interiorZoom: 100 });
      stage.camera.position.set(...position); stage.controls.target.set(0, 0, 0); stage.controls.update(); stage.requestRender(); saveCamera();
    },
    dispose() {
      if (disposed) return; disposed = true;
      stage.controls.removeEventListener('end', saveCamera); stage.canvas.removeEventListener('keyup', saveCamera);
      stage.dispose();
    },
  };
}
