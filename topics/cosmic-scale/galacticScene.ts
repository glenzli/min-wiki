import * as THREE from 'three';
import { GALACTIC_CACHE_LIMIT, SOLAR_POSITION, CLUSTER_LOCATION, GALAXY_PAIR_UNIT, galacticObjects, type GalacticCase, type GalacticObject, type GalacticState, type StellarCloud } from './galacticModel.ts';
import content from './galacticContent.json';
import {viewZoom} from './viewNavigation.ts';
import catalogue from './skyCatalogue.json';
import {galacticStarPosition,parallaxDistance} from './skyModel.ts';

type Words = typeof content.ui.en;
type Population = { cloud: StellarCloud; mesh: THREE.Points; owner: THREE.Group };
type Entry = { root: THREE.Group; objects: GalacticObject[]; populations: Population[] };

/** Demand-rendered 3D and CPU projections share the same deterministic spatial samples. */
export class GalacticScene {
  private world = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 100);
  private canvas = document.createElement('canvas');
  private fallback = document.createElement('canvas');
  private overlay = document.createElement('canvas');
  private renderer?: THREE.WebGLRenderer;
  private cache = new Map<string, Entry>();
  private observer: ResizeObserver;
  private last?: GalacticState;
  private active = false;
  private lost = false;
  private disposed = false;
  constructor(private host: HTMLElement, private words: Words, private onFailure: (failed: boolean) => void) {
    this.camera.position.z = 8;
    this.host.classList.add('galactic-stage');
    this.canvas.setAttribute('aria-hidden', 'true'); this.fallback.setAttribute('aria-hidden', 'true'); this.overlay.setAttribute('aria-hidden', 'true');
    this.host.append(this.canvas, this.fallback, this.overlay);
    this.prepareRenderer();
    this.observer = new ResizeObserver(() => { if (this.active && this.last && !document.hidden) this.draw(this.last); });
    this.observer.observe(this.host);
  }
  private prepareRenderer() {
    this.lost = false;
    this.canvas.addEventListener('webglcontextlost', this.contextLost);
    this.canvas.addEventListener('webglcontextrestored', this.contextRestored);
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: false, antialias: true, powerPreference: 'low-power' });
      this.renderer.setClearColor('#040a14'); this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.onFailure(false);
    } catch { this.renderer = undefined; this.onFailure(true); }
  }
  private contextLost = (event: Event) => { event.preventDefault(); this.lost = true; this.onFailure(true); if (this.active && this.last) this.draw(this.last); };
  private contextRestored = () => { if (this.disposed) return; this.lost = false; this.onFailure(false); if (this.active && this.last) this.draw(this.last); };
  retry() {
    if (this.disposed) return;
    this.canvas.removeEventListener('webglcontextlost', this.contextLost); this.canvas.removeEventListener('webglcontextrestored', this.contextRestored);
    this.renderer?.dispose(); this.renderer?.forceContextLoss(); this.renderer = undefined;
    const next = document.createElement('canvas'); next.setAttribute('aria-hidden', 'true'); this.canvas.replaceWith(next); this.canvas = next;
    this.prepareRenderer(); if (this.active && this.last) this.draw(this.last);
  }
  setActive(active: boolean) { this.active = active; }
  get failed() {return !this.renderer||this.lost;}
  private entry(selected: GalacticCase,compareTo:GalacticState['compareTo']='elliptical') {
    const key=selected==='galaxy-comparison'&&compareTo!=='elliptical'?`${selected}:${compareTo}`:selected;
    const cached = this.cache.get(key);
    if (cached) { this.cache.delete(key); this.cache.set(key, cached); return cached; }
    while (this.cache.size >= GALACTIC_CACHE_LIMIT) {
      const key = this.cache.keys().next().value!; this.release(this.cache.get(key)!); this.cache.delete(key);
    }
    const entry: Entry = { root: new THREE.Group(), objects: galacticObjects(selected,compareTo), populations: [] };
    for (const object of entry.objects) {
      const owner = new THREE.Group(); owner.position.set(...object.center); owner.scale.setScalar(object.scale); owner.rotation.x = object.inclination; entry.root.add(owner);
      for (const cloud of object.clouds) {
        const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(cloud.positions, 3)); geometry.setAttribute('color', new THREE.BufferAttribute(cloud.colors, 3));
        const material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, vertexColors: true, blending: cloud.part === 'dust' ? THREE.NormalBlending : THREE.AdditiveBlending,
          uniforms: { size: { value: cloud.size }, alpha: { value: cloud.opacity } },
          vertexShader: 'uniform float size; varying vec3 tint; void main(){tint=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=size;}',
          fragmentShader: `uniform float alpha; varying vec3 tint; void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float a=exp(-r*r*4.)*(1.-smoothstep(.65,1.,r))*alpha${cloud.part==='dust'?'*clamp(tint.r,0.,1.)':''};gl_FragColor=vec4(${cloud.part === 'dust' ? 'vec3(.015,.010,.025)' : 'tint'},a);}` });
        const mesh = new THREE.Points(geometry, material); mesh.renderOrder = cloud.part === 'dust' ? 3 : 1; owner.add(mesh); entry.populations.push({ cloud, mesh, owner });
      }
    }
    this.world.add(entry.root); this.cache.set(key, entry); return entry;
  }
  private release(entry: Entry) { this.world.remove(entry.root); for (const p of entry.populations) { p.mesh.geometry.dispose(); (p.mesh.material as THREE.Material).dispose(); } entry.root.clear(); }
  draw(state: GalacticState) {
    this.last = { ...state }; if (!this.active || this.disposed || document.hidden) return;
    const width = this.host.clientWidth, height = this.host.clientHeight; if (!width || !height) return;
    const dpr = Math.min(2, devicePixelRatio || 1), aspect = width / height;
    // Reference visibility must not change magnification or reset the observer's view.
    const pair=state.selected==='galaxy-comparison'||state.selected==='star-cluster',portrait=aspect<1.25;
    const extent = pair?(portrait?1.6:1.05):1.38;
    const half = pair?Math.max(portrait?.95:2.18,extent*aspect)/viewZoom(state.zoom):extent * Math.max(1, aspect) / viewZoom(state.zoom);
    this.camera.left = -half; this.camera.right = half; this.camera.top = half / aspect; this.camera.bottom = -half / aspect; this.camera.updateProjectionMatrix();
    const current = this.entry(state.selected,state.compareTo);
    for (const entry of this.cache.values()) entry.root.visible = entry === current;
    current.root.rotation.set(pair?0:state.pitch, 0, pair?0:state.yaw);
    if(pair)current.root.children.forEach((owner,i)=>{
      const object=current.objects[i]!;
      owner.position.set(portrait?0:i?1.08:-1.08,portrait?i?-.77:.77:0,0);
      owner.scale.setScalar(state.selected==='star-cluster'?(portrait?.52:object.scale):object.scale*(portrait?.74:1));
      owner.rotation.set(state.pitch+object.inclination,0,state.yaw);
    });
    for (const p of current.populations) {
      p.mesh.visible = state.selected !== 'milky-way' && state.selected !== 'spiral' || p.cloud.part === 'population' || (p.cloud.part === 'dust' ? state.disk : state[p.cloud.part]);
      const material = p.mesh.material as THREE.ShaderMaterial;
      // Diffuse samples shrink with their projected galaxy. Fixed 32-pixel
      // mist sprites otherwise overlap into solid white arms in small comparisons.
      const projectedRadius=p.owner.scale.x*width/(this.camera.right-this.camera.left);
      material.uniforms.size!.value = p.cloud.size * dpr * Math.max(.22,Math.min(1.25,projectedRadius/210));
    }
    this.world.updateMatrixWorld(true); this.camera.updateMatrixWorld(true);
    const gpu = !!this.renderer && !this.lost;
    this.canvas.hidden = !gpu; this.fallback.hidden = gpu;
    for (const canvas of [this.fallback, this.overlay]) if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) { canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); }
    if (gpu) {
      try { this.renderer!.setPixelRatio(dpr); this.renderer!.setSize(width, height, false); this.renderer!.render(this.world, this.camera); }
      catch { this.lost = true; this.onFailure(true); this.canvas.hidden = true; this.fallback.hidden = false; this.drawFallback(current, width, height, dpr); }
    } else this.drawFallback(current, width, height, dpr);
    this.annotations(current, state, width, height, dpr);
  }
  private project(point: ArrayLike<number>, owner: THREE.Object3D, width: number, height: number): [number, number] {
    const p = new THREE.Vector3(point[0], point[1], point[2]).applyMatrix4(owner.matrixWorld).project(this.camera); return [(p.x + 1) * width / 2, (1 - p.y) * height / 2];
  }
  private drawFallback(entry: Entry, width: number, height: number, dpr: number) {
    const c = this.fallback.getContext('2d')!; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.fillStyle = '#040a14'; c.fillRect(0, 0, width, height);
    for (const { cloud, mesh, owner } of entry.populations) {
      if (!mesh.visible || cloud.part === 'dust' || cloud.mist) continue;
      // Bounded CPU projection: at most one in four star samples; sparse populations retain all markers.
      const step = cloud.positions.length > 300 ? 4 : 1; c.globalCompositeOperation = 'screen';
      for (let i = 0; i < cloud.positions.length / 3; i += step) {
        const j = i * 3, [x, y] = this.project(cloud.positions.subarray(j, j + 3), owner, width, height), color = cloud.colors.subarray(j, j + 3);
        c.fillStyle = `rgba(${Math.round(color[0]! * 255)},${Math.round(color[1]! * 255)},${Math.round(color[2]! * 255)},${cloud.opacity})`;
        c.beginPath(); c.arc(x, y, cloud.part === 'bulge' ? 1.6 : .9, 0, Math.PI * 2); c.fill();
      }
    }
    c.globalCompositeOperation = 'source-over';
  }
  private annotations(entry: Entry, state: GalacticState, width: number, height: number, dpr: number) {
    const c = this.overlay.getContext('2d')!, w = this.words; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, width, height); c.font = `${width < 500 ? 11 : 13}px system-ui`;
    const root = entry.root, labels: { text: string; point: [number, number]; priority: number; anchor?: [number, number] }[] = [];
    const label = (text: string, point: [number, number], priority = 0, anchor?: [number, number]) => labels.push({ text, point, priority, anchor });
    const line = (points: readonly (readonly number[])[], owner: THREE.Object3D, color: string, dashed = false) => {
      c.strokeStyle = color; c.lineWidth = 1; c.setLineDash(dashed ? [4, 5] : []); c.beginPath(); points.forEach((p, i) => { const [x, y] = this.project(p, owner, width, height); if (!i) c.moveTo(x, y); else c.lineTo(x, y); }); c.stroke(); c.setLineDash([]);
    };
    const ring = (p: [number, number], radius = 7, dot = true) => { c.strokeStyle = '#ffe3a0'; c.lineWidth = 1.7; c.beginPath(); c.arc(...p, radius, 0, Math.PI * 2); c.stroke(); if(dot){c.fillStyle = '#ffe3a0'; c.beginPath(); c.arc(...p, 2, 0, Math.PI * 2); c.fill();} };
    if(state.selected==='galaxy-comparison'){
      entry.root.children.forEach((owner,i)=>{const center=this.project([0,0,0],owner,width,height),r=owner.scale.x/(this.camera.top-this.camera.bottom)*height;
        label(i?state.compareTo==='spiral'?w.andromeda:state.compareTo==='irregular'?w.irregularLabel:w.m87:w.milky,[center[0],center[1]-r-23],10);
        if(i===0){const p=this.project(SOLAR_POSITION,owner,width,height);ring(p);label(w.sunLabel,[center[0]+r*.68,center[1]+r*.72],9,p);}
      });
      label(w.comparisonBoundary,[width/2,height-20],8);
      const pixels=GALAXY_PAIR_UNIT*(width/height<1.25?.74:1)/(this.camera.right-this.camera.left)*width,x=width*.08,y=height-53;
      c.strokeStyle='#c8d7dc';c.beginPath();c.moveTo(x,y);c.lineTo(x+pixels,y);c.moveTo(x,y-4);c.lineTo(x,y+4);c.moveTo(x+pixels,y-4);c.lineTo(x+pixels,y+4);c.stroke();label(w.galaxyRuler,[x+pixels/2,y-8],8);
    }
    if (state.selected === 'milky-way') { const p = this.project(SOLAR_POSITION, root, width, height); ring(p); label(w.sunLabel, [width * .77, height * .14], 10, p); }
    if(state.selected==='milky-way'&&state.sky.locateOrion){
      const positions=catalogue.orion.map(star=>this.project(galacticStarPosition(star.ra,star.dec,parallaxDistance(star.parallax,star.error).ly),root,width,height));
      const center:[number,number]=[positions.reduce((n,p)=>n+p[0],0)/positions.length,positions.reduce((n,p)=>n+p[1],0)/positions.length];
      c.fillStyle='#96ddea';for(const p of positions){c.beginPath();c.arc(...p,2,0,Math.PI*2);c.fill();}
      c.strokeStyle='#96ddea';c.setLineDash([3,4]);c.beginPath();c.arc(...center,Math.max(12,...positions.map(p=>Math.hypot(p[0]-center[0],p[1]-center[1])+5)),0,Math.PI*2);c.stroke();c.setLineDash([]);
      label(w.orionRegion,[width*.72,height*.82],11,center);
    }
    if (state.guides && (state.selected === 'milky-way' || state.selected === 'spiral')) {
      if (state.disk) {
        line(Array.from({ length: 101 }, (_, i) => [Math.cos(i * Math.PI / 50), Math.sin(i * Math.PI / 50), 0]), root, '#a2cee779', true);
        label(w.diskLabel, [width * .18, height * .84], 0, this.project([-.72, -.60, 0], root, width, height));
      }
      if (state.bulge) label(w.center, [width * .20, height * .14], 0, this.project([0, .1, .2], root, width, height));
      if (state.halo) {
        for (const vertical of [false, true]) line(Array.from({ length: 81 }, (_, i) => { const a = i * Math.PI / 40; return vertical ? [1.45 * Math.cos(a), 0, 1.20 * Math.sin(a)] : [1.45 * Math.cos(a), 1.45 * Math.sin(a), 0]; }), root, '#b0b3cb40', true);
        label(w.haloLabel, [width * .78, height * .84], 0, this.project([-1.0, .60, .72], root, width, height));
      }
      for (const [axis, end, color] of [['x', [1.2, 0, 0], '#dbba87'], ['y', [0, 1.2, 0], '#91b8d4'], ['z', [0, 0, 1.2], '#bad3af']] as const) { line([[0, 0, 0], end], root, color); label(axis, this.project(end, root, width, height)); }
    }
    if (state.selected === 'star-cluster') {
      const owner = entry.populations[0]!.owner, point = this.project(CLUSTER_LOCATION, owner, width, height); ring(point, 11, false);
      const detailOwner = entry.populations.find(p => p.owner !== owner)!.owner, detail = this.project([0, 0, 0], detailOwner, width, height);
      // Each endpoint is projected from its actual owner: camera changes cannot detach the connector.
      c.strokeStyle = '#e2d2aa77'; c.lineWidth = 1; c.setLineDash([4, 5]); c.beginPath(); c.moveTo(...point); c.lineTo(...detail); c.stroke(); c.setLineDash([]);
      label(w.clusterContext, [point[0], point[1] + 28], 5);
      const radius=detailOwner.scale.x/(this.camera.top-this.camera.bottom)*height;
      label(w.clusterDetail, [detail[0], detail[1]+radius+26], 6);
    }
    if(state.selected==='irregular'){
      label(w.irregularLabel,[width/2,height*.12],8);
      const owner=entry.populations[0]!.owner;
      if(state.guides){
        label(w.irregularYoung,[width*.74,height*.30],5,this.project([-.10,.49,0],owner,width,height));
        label(w.irregularOlder,[width*.23,height*.72],5,this.project([0,-.15,0],owner,width,height));
      }
    }
    if (state.selected === 'local-group') {
      for (const [i, name] of [w.milky, w.andromeda, w.triangulum].entries()) { const point = this.project(entry.objects[i]!.center, root, width, height); ring(point, 5); label(name, [point[0], point[1] + 25], 8 - i); }
      const dwarf = entry.populations.find(p => p.cloud.part === 'population');
      if (dwarf) for (let j = 0; j < dwarf.cloud.positions.length; j += 3) { const p = this.project(dwarf.cloud.positions.subarray(j, j + 3), dwarf.owner, width, height); c.strokeStyle = '#c8dcd587'; c.beginPath(); c.arc(...p, 3.5, 0, Math.PI * 2); c.stroke(); }
      label(w.dwarfs, [width / 2, height - 32], 2);
    }
    const boxes: { x: number; y: number; width: number }[] = [];
    for (const item of labels.sort((a, b) => b.priority - a.priority)) {
      const boxWidth = Math.min(width - 20, c.measureText(item.text).width + 14), x = Math.max(boxWidth / 2 + 10, Math.min(width - boxWidth / 2 - 10, item.point[0]));
      let y = Math.max(22, Math.min(height - 20, item.point[1]));
      for (let tries = 0; tries < 9 && boxes.some(b => Math.abs(b.x - x) < (b.width + boxWidth) / 2 + 4 && Math.abs(b.y - y) < 22); tries++) y += y > height * .5 ? -23 : 23;
      if (y < 20 || y > height - 12) continue; boxes.push({ x, y, width: boxWidth });
      if (item.anchor) { c.strokeStyle = '#dfdfb58c'; c.lineWidth = 1; c.beginPath(); c.moveTo(...item.anchor); c.lineTo(x, y - 3); c.stroke(); }
      c.fillStyle = '#06101ee8'; c.fillRect(x - boxWidth / 2, y - 15, boxWidth, 22); c.fillStyle = item.priority > 5 ? '#ffe3ae' : '#d9e9ed'; c.textAlign = 'center'; c.fillText(item.text, x, y, boxWidth - 12);
    }
  }
  dispose() { if (this.disposed) return; this.disposed = true; this.active = false; this.observer.disconnect(); this.canvas.removeEventListener('webglcontextlost', this.contextLost); this.canvas.removeEventListener('webglcontextrestored', this.contextRestored); for (const entry of this.cache.values()) this.release(entry); this.cache.clear(); this.renderer?.dispose(); this.renderer?.forceContextLoss(); this.canvas.remove(); this.fallback.remove(); this.overlay.remove(); this.last = undefined; }
}
