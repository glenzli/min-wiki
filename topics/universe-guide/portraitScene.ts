import * as THREE from 'three';
import earthMap from '../solar-system/assets/2k_earth_daymap.webp';
import jupiterMap from '../solar-system/assets/2k_jupiter.webp';
import neptuneMap from '../solar-system/assets/2k_neptune.webp';
import moonMap from '../solar-system/assets/2k_moon.webp';
import { population, portraitLayout, randomFor } from './portraitModel.ts';
import { createStellarPortrait } from '../../src/visuals/stellarPortrait.ts';
import { createNebulaPortrait } from '../../src/visuals/nebulaPortrait.ts';
import type { Resident } from './model.ts';

const surfaceVertex = `varying vec3 vN;varying vec3 vP;varying vec3 vEye;
void main(){vN=normalize(normalMatrix*normal);vP=position;vec4 p=modelViewMatrix*vec4(position,1.);vEye=-p.xyz;gl_Position=projectionMatrix*p;}`;
const surfaceFragment = `uniform vec3 tint;uniform float compact;uniform float cutaway;
varying vec3 vN;varying vec3 vP;varying vec3 vEye;
float h(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){
 if(cutaway>.5 && vP.x>.02 && vP.z>.02)discard;
 float mu=abs(dot(normalize(vN),normalize(vEye)));
 float cells=n(vP*37.)*.6+n(vP*83.)*.3+n(vP*170.)*.1;
 float broad=n(vP*5.2),texture=mix(.6+.65*cells,.97+.05*cells,compact);
 float limb=.42+.58*pow(mu,.38);
 vec3 color=tint*texture*limb*(.93+.12*broad);
 gl_FragColor=vec4(color,1.);
 #include <colorspace_fragment>
}`;
const pointsVertex = `attribute float pointSize;attribute vec3 color;varying vec3 vColor;uniform float dpr;
void main(){vColor=color;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(pointSize*length(modelViewMatrix[0].xyz)*dpr,1.,80.);}`;
const pointsFragment = `varying vec3 vColor;uniform float opacity;
void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float a=exp(-r*r*4.)*(1.-smoothstep(.6,1.,r));gl_FragColor=vec4(vColor,a*opacity);
#include <colorspace_fragment>
}`;
type Pose = { x: number; y: number };
type Visual = { root: THREE.Group; spin: THREE.Group; bodyRadius: number; setEnergy?: (enabled: boolean) => void; dispose?: () => void; id: string };

/** Guide-owned spatial portraits: two live objects, one renderer, no simulation clock. */
export class GuidePortraitScene {
  private renderer: THREE.WebGLRenderer;
  private world = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 5000);
  private observer: ResizeObserver;
  private visuals: Visual[] = [];
  private poses = new Map<string, Pose>();
  private maps = new Map<string, THREE.Texture>();
  private glow: THREE.CanvasTexture;
  private backdrop: THREE.Points;
  private disposed = false;
  private frame = 0;
  private drag?: { id: number; x: number; y: number };
  private width = 1;
  private height = 1;
  constructor(private canvas: HTMLCanvasElement, private failed: () => void) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor('#0b111d', 1);
    this.camera.position.z = 2000;
    this.world.add(new THREE.HemisphereLight('#d3e2ff', '#18202b', 1.4));
    const sun = new THREE.DirectionalLight('#fff3dd', 2.6); sun.position.set(-900, 600, 1600); this.world.add(sun);
    const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 128;
    const ctx = glowCanvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, '#ffffffcc'); gradient.addColorStop(.33, '#ffffff75'); gradient.addColorStop(.6, '#ffffff20'); gradient.addColorStop(1, '#ffffff00');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
    this.glow = new THREE.CanvasTexture(glowCanvas);
    const random = randomFor(321), stars: number[] = [];
    for (let i = 0; i < 180; i++) stars.push(random() - .5, random() - .5, -500);
    const backgroundGeometry = new THREE.BufferGeometry(); backgroundGeometry.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
    this.backdrop = new THREE.Points(backgroundGeometry, new THREE.PointsMaterial({ color: '#a5b9d5', map: this.glow, size: 2, sizeAttenuation: false, transparent: true, opacity: .24, depthWrite: false }));
    this.world.add(this.backdrop);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas.parentElement!);
    canvas.addEventListener('pointerdown', this.pointerDown);
    canvas.addEventListener('pointermove', this.pointerMove);
    canvas.addEventListener('pointerup', this.pointerEnd);
    canvas.addEventListener('pointercancel', this.pointerEnd);
    canvas.addEventListener('keydown', this.key);
    canvas.addEventListener('webglcontextlost', this.contextLost);
    document.addEventListener('visibilitychange', this.visibility);
    this.resize();
  }
  set(item: Resident, partner: Resident, energy: boolean) {
    if (this.disposed) return;
    if (this.visuals[0]?.id !== item.id || this.visuals[1]?.id !== partner.id) {
      this.clearVisuals(); this.visuals = [this.create(item), this.create(partner)];
      for (const visual of this.visuals) this.world.add(visual.root);
      // Texture ownership is bounded by the two displayed objects, including pending loads.
      for (const [id, texture] of this.maps) if (id !== item.id && id !== partner.id) { texture.dispose(); this.maps.delete(id); }
    }
    for (const visual of this.visuals) visual.setEnergy?.(energy);
    this.layout(); this.draw();
  }
  reset() {
    for (const visual of this.visuals) this.poses.delete(visual.id);
    this.layout(); this.draw();
  }
  private create(item: Resident): Visual {
    const root = new THREE.Group(), spin = new THREE.Group(); root.add(spin);
    const visual: Visual = { root, spin, id: item.id, bodyRadius: ['star', 'white', 'neutron', 'dwarf', 'rock'].includes(item.icon) ? .85 : ['planet', 'giant', 'ice', 'moon'].includes(item.icon) ? .88 : 1 };
    const sphere = (radius: number, material: THREE.Material) => new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 40), material);
    const glow = (color: string, size = 3.3, opacity = .26) => {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
      sprite.scale.set(size, size, 1); spin.add(sprite); return sprite;
    };
    const star = (color: string, compact = false, radius = .85) => {
      const material = new THREE.ShaderMaterial({ vertexShader: surfaceVertex, fragmentShader: surfaceFragment, side: THREE.DoubleSide,
        uniforms: { tint: { value: new THREE.Color(color) }, compact: { value: compact ? 1 : 0 }, cutaway: { value: 0 } } });
      const mesh = sphere(radius, material); spin.add(mesh); glow(color, radius * 3.5, compact ? .29 : .2); return mesh;
    };
    const dots = (kind: string, count: number, opacity = .7) => {
      const samples = population(kind, count), positions: number[] = [], colors: number[] = [], sizes: number[] = [];
      for (const p of samples) { positions.push(p.x, p.y, p.z); sizes.push(p.size); const color = new THREE.Color('#91badb').lerp(new THREE.Color('#e5b499'), p.warmth); colors.push(color.r, color.g, color.b); }
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('pointSize', new THREE.Float32BufferAttribute(sizes, 1)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      const material = new THREE.ShaderMaterial({ vertexShader: pointsVertex, fragmentShader: pointsFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { dpr: { value: this.renderer.getPixelRatio() }, opacity: { value: opacity } } });
      const cloud = new THREE.Points(geometry, material); spin.add(cloud); return cloud;
    };
    const line = (points: THREE.Vector3[], color: string, opacity = .3) => {
      const result = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, transparent: true, opacity })); spin.add(result); return result;
    };
    const ring = (radius: number, color: string, opacity = .3) => line(Array.from({ length: 129 }, (_, i) => new THREE.Vector3(Math.cos(i / 128 * Math.PI * 2) * radius, 0, Math.sin(i / 128 * Math.PI * 2) * radius)), color, opacity);
    if (['star', 'white', 'neutron'].includes(item.icon)) {
      const portrait = createStellarPortrait(item.id); spin.add(portrait.group);
      visual.setEnergy = portrait.setEnergy; visual.dispose = portrait.dispose;
    } else if (['planet', 'giant', 'ice', 'moon'].includes(item.icon)) {
      const urls: Record<string, string> = { earth: earthMap, jupiter: jupiterMap, neptune: neptuneMap, moon: moonMap };
      const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 });
      spin.add(sphere(.88, material));
      let map = this.maps.get(item.id);
      if (!map) {
        map = new THREE.TextureLoader().load(urls[item.id]!, texture => {
          if (this.disposed || this.maps.get(item.id) !== texture) { texture.dispose(); return; }
          this.draw();
        }, undefined, () => { /* Lit geometry and text remain visible when a local map is unavailable. */ });
        map.colorSpace = THREE.SRGBColorSpace; this.maps.set(item.id, map);
      }
      material.map = map;
      if (item.id === 'earth' || item.id === 'neptune') glow('#639fc3', 2.2, .06);
    } else if (item.icon === 'rock' || item.icon === 'dwarf') {
      const geometry = item.icon === 'rock' ? new THREE.IcosahedronGeometry(.85, 4) : new THREE.SphereGeometry(.85, 64, 40), positions = geometry.attributes.position;
      const colors: number[] = [], v = new THREE.Vector3();
      for (let i = 0; i < positions.count; i++) {
        v.fromBufferAttribute(positions, i).normalize();
        const relief = Math.sin(v.x * 3.2 + v.z * 1.7) * Math.cos(v.y * 3.7 - v.x * .8);
        const grain = Math.sin(v.x * 71.3 + v.y * 97.1 + v.z * 43.7) * Math.sin(v.x * 133.7 - v.z * 89.3);
        const radius = .82 + relief * (item.icon === 'rock' ? .115 : .015) + grain * (item.icon === 'rock' ? .022 : .008);
        positions.setXYZ(i, v.x * radius * (item.icon === 'rock' ? 1.08 : 1), v.y * radius * (item.icon === 'rock' ? .72 : 1), v.z * radius * (item.icon === 'rock' ? .87 : 1));
        const shade = .32 + relief * .055 + grain * .08; colors.push(shade * .94, shade * .84, shade * .72);
      }
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.computeVertexNormals();
      spin.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));
    } else if (item.icon === 'cloud' || item.icon === 'remnant') {
      const portrait = createNebulaPortrait(item.id); spin.add(portrait.group); visual.dispose = portrait.dispose;
    } else if (item.icon === 'galaxy' || item.icon === 'cluster' || item.icon === 'group' || item.icon === 'universe') {
      if (item.icon === 'group') {
        const main = dots('galaxy', 1700); main.scale.setScalar(.55); main.position.set(-.35, -.1, 0);
        const companion = dots('galaxy', 1200); companion.scale.setScalar(.38); companion.position.set(.48, .3, .1); companion.rotation.z = .7;
        const third = dots('cluster', 150); third.scale.setScalar(.12); third.position.set(.4, -.55, .2);
      } else {
        dots(item.icon, item.icon === 'galaxy' ? 4200 : 2300, .85);
        if (item.icon === 'galaxy') { const bulge = glow('#f2d4ae', .5, .5); bulge.scale.y = .3; }
        if (item.icon === 'universe') { ring(1, '#a9bdd7', .25); const other = ring(1, '#a9bdd7', .2); other.rotation.z = Math.PI / 2; }
      }
      spin.rotation.x = -.55;
    } else if (item.icon === 'dust' || item.icon === 'system') {
      if (item.icon === 'dust') dots('dust', 1800, .7);
      star('#ffe4ac', false, .09);
      for (let i = 0; i < 5; i++) {
        const radius = .25 + i * .16; ring(radius, '#9faabe', .2);
        if (item.icon === 'system') { const body = sphere(.025 + i * .004, new THREE.MeshStandardMaterial({ color: ['#aaa094', '#d5bd97', '#80aac2', '#d1a394', '#b79e83'][i] })); body.position.set(Math.cos(i * 1.8) * radius, 0, Math.sin(i * 1.8) * radius); spin.add(body); }
      }
    } else if (item.icon === 'comet' || item.icon === 'meteor') {
      const positions: number[] = [], colors: number[] = [], sizes: number[] = [], random = randomFor(44);
      for (let i = 0; i < 1800; i++) {
        const t = random(), dust = i % 3 !== 0, spread = (item.icon === 'meteor' ? .025 : .035 + t * .18) * (dust ? 1 : .38);
        positions.push(-.62 + t * 1.55, .18 - t * .3 - (dust && item.icon === 'comet' ? t * t * .35 : 0) + (random() - .5) * spread, (random() - .5) * spread);
        sizes.push(item.icon === 'comet' ? .05 + random() * .09 : .008 + random() * .025); colors.push(dust ? .75 : .35, dust ? .63 : .65, dust ? .45 : .9);
      }
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('pointSize', new THREE.Float32BufferAttribute(sizes, 1)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      spin.add(new THREE.Points(geometry, new THREE.ShaderMaterial({ vertexShader: pointsVertex, fragmentShader: pointsFragment, transparent: true, depthWrite: false, blending: item.icon === 'comet' ? THREE.NormalBlending : THREE.AdditiveBlending, uniforms: { dpr: { value: this.renderer.getPixelRatio() }, opacity: { value: item.icon === 'comet' ? .14 : .3 } } })));
      const head = glow('#d8ecff', item.icon === 'comet' ? .37 : .14, .9); head.position.set(-.62, .18, 0);
      if (item.icon === 'meteor') line(Array.from({ length: 65 }, (_, i) => new THREE.Vector3(-1 + i / 32, -.7 + .16 * Math.sin(i / 64 * Math.PI), -.1)), '#65829f', .7);
    } else if (item.icon === 'black-hole') {
      spin.add(sphere(.37, new THREE.MeshBasicMaterial({ color: '#010307' })));
      for (let i = 0; i < 26; i++) ring(.43 + i * .018, i % 3 ? '#d8aa6a' : '#e5cdab', .12);
    } else if (item.icon === 'event') {
      star('#fff2d9', false, .22); dots('shell', 1200, .24); glow('#efc399', 2.4, .28);
    }
    return visual;
  }
  private layout() {
    const layout = portraitLayout(this.width, this.height, this.visuals[0]?.id, this.visuals[1]?.id);
    this.visuals.forEach((visual, index) => {
      const placement = index === 0 ? layout.primary : layout.partner;
      visual.root.position.set(placement.x, placement.y, 0); visual.root.scale.setScalar(placement.radius / visual.bodyRadius);
      const pose = this.poses.get(visual.id) ?? { x: ['galaxy', 'group', 'solar-system', 'dust', 'black-hole'].includes(visual.id) ? -.45 : .08, y: -.25 };
      visual.spin.rotation.set(pose.x, pose.y, -.06);
    });
  }
  private resize() {
    if (this.disposed) return;
    const rect = this.canvas.parentElement!.getBoundingClientRect(); this.width = Math.max(1, rect.width); this.height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75, Math.sqrt(1800000 / (this.width * this.height)));
    this.renderer.setPixelRatio(dpr); this.renderer.setSize(this.width, this.height, false);
    this.backdrop.scale.set(this.width, this.height, 1);
    this.camera.left = -this.width / 2; this.camera.right = this.width / 2; this.camera.top = this.height / 2; this.camera.bottom = -this.height / 2; this.camera.updateProjectionMatrix();
    this.world.traverse(object => { const material = (object as THREE.Points).material; if (material instanceof THREE.ShaderMaterial && material.uniforms.dpr) material.uniforms.dpr.value = dpr; });
    this.layout(); this.draw();
  }
  private rotate(dx: number, dy: number) {
    for (const visual of this.visuals) { visual.spin.rotation.y += dx; visual.spin.rotation.x = Math.max(-1.4, Math.min(1.4, visual.spin.rotation.x + dy)); this.poses.set(visual.id, { x: visual.spin.rotation.x, y: visual.spin.rotation.y }); }
    this.draw();
  }
  private pointerDown = (event: PointerEvent) => { if (event.button !== 0) return; this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY }; this.canvas.setPointerCapture(event.pointerId); this.canvas.focus({ preventScroll: true }); };
  private pointerMove = (event: PointerEvent) => { if (!this.drag || event.pointerId !== this.drag.id) return; this.rotate((event.clientX - this.drag.x) * .009, (event.clientY - this.drag.y) * .007); this.drag.x = event.clientX; this.drag.y = event.clientY; };
  private pointerEnd = () => { this.drag = undefined; };
  private key = (event: KeyboardEvent) => { const keys: Record<string, [number, number]> = { ArrowLeft: [-.15, 0], ArrowRight: [.15, 0], ArrowUp: [0, -.15], ArrowDown: [0, .15] }; if (keys[event.key]) { event.preventDefault(); this.rotate(...keys[event.key]!); } else if (event.key === 'Home') { event.preventDefault(); this.reset(); } };
  private contextLost = (event: Event) => { event.preventDefault(); if (!this.disposed) this.failed(); };
  private visibility = () => { this.drag = undefined; if (document.hidden && this.frame) { cancelAnimationFrame(this.frame); this.frame = 0; } else if (!document.hidden) this.draw(); };
  private draw() { if (this.disposed || document.hidden || this.frame) return; this.frame = requestAnimationFrame(() => { this.frame = 0; if (this.disposed) return; try { this.renderer.render(this.world, this.camera); } catch { this.failed(); } }); }
  private clearVisuals() {
    for (const visual of this.visuals) { this.world.remove(visual.root); visual.root.traverse(object => { const mesh = object as THREE.Mesh; mesh.geometry?.dispose(); const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []; for (const material of materials) material.dispose(); }); visual.dispose?.(); }
    this.visuals = [];
  }
  dispose() {
    if (this.disposed) return; this.disposed = true; if (this.frame) cancelAnimationFrame(this.frame);
    this.observer.disconnect(); this.clearVisuals(); for (const texture of this.maps.values()) texture.dispose(); this.maps.clear(); this.glow.dispose();
    this.canvas.removeEventListener('pointerdown', this.pointerDown); this.canvas.removeEventListener('pointermove', this.pointerMove); this.canvas.removeEventListener('pointerup', this.pointerEnd); this.canvas.removeEventListener('pointercancel', this.pointerEnd); this.canvas.removeEventListener('keydown', this.key); this.canvas.removeEventListener('webglcontextlost', this.contextLost); document.removeEventListener('visibilitychange', this.visibility);
    this.backdrop.geometry.dispose(); (this.backdrop.material as THREE.Material).dispose(); this.renderer.dispose(); this.renderer.forceContextLoss();
  }
}
