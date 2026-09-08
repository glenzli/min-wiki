import * as THREE from 'three';
import { HORIZON_RADIUS } from '../physics/encounter.ts';

export function glowTexture(stops: [number,string][]) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  for (const [at, color] of stops) gradient.addColorStop(at, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

export function createBlackHole() {
  const group = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(HORIZON_RADIUS, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000, depthTest: false, transparent: true }));
  // Teaching silhouette: no soft gas sprite may paint across the black interior.
  // This is a visibility mask, not relativistic ray tracing. The default top
  // view separates surviving streams from this silhouette geometrically.
  core.renderOrder=100;
  group.add(core);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture([[0, '#00000000'], [.45, '#00000000'], [.51, '#b2ab9d90'], [.54, '#b1a08730'], [.7, '#6579800b'], [1, '#00000000']]),
    transparent: true, depthWrite: false,
  }));
  halo.scale.setScalar(HORIZON_RADIUS * 4);
  group.add(halo);
  return group;
}

export function createStar() {
  const group = new THREE.Group();
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
    vertexShader: `varying vec3 vNormal; varying vec3 vPosition; varying vec3 vView;
      void main() { vNormal = normalize(normalMatrix * normal); vPosition = position;
      vec4 mv = modelViewMatrix * vec4(position, 1.0); vView = -mv.xyz;
      gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uTime; uniform float uOpacity;
      varying vec3 vNormal; varying vec3 vPosition; varying vec3 vView;
      float hash(vec3 p) { return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
      float noise(vec3 p) {
        vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
          mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
          mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
      void main() {
        float n = noise(vPosition*5.0 + uTime*0.09)*0.65 + noise(vPosition*13.0-uTime*0.06)*0.35;
        float limb = pow(max(0.0,dot(normalize(vNormal),normalize(vView))),0.45);
        vec3 col = mix(vec3(1.0,0.26,0.025), vec3(1.0,0.84,0.35), n);
        col *= 0.7 + limb*0.45;
        gl_FragColor=vec4(col,uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false,
  });
  const surface = new THREE.Mesh(new THREE.SphereGeometry(2.5, 48, 32), material);
  group.add(surface);
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture([[0, '#ffbd5600'], [.25, '#ffb83e00'], [.32, '#ffb83e38'], [.48, '#fa7c1318'], [1, '#ed680000']]),
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  corona.scale.setScalar(16);
  group.add(corona);
  return { group, surface, corona };
}
