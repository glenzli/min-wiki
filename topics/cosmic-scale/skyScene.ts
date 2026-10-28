import * as THREE from 'three';
import catalogue from './skyCatalogue.json';
import copy from './skyContent.json';
import { galacticObjects } from './galacticModel.ts';
import { SKY_SUN, M31_DIRECTION, add, mul, galacticDirection, milkyObserver, groundObserver, milkyTravelProgress, earthSkyOpacity, orionObserver, orionPosition, parallaxDistance, skyDirection, smooth, type SkyCase, type SkyState, type Vec3, type Observer } from './skyModel.ts';
import { trappistPlanets, solarPlanets, wholeOrbitRadius, systemPlanetPosition, MERCURY_AU, planetPosition, systemFraming } from './planetarySystems.ts';
import {createSolarPhotosphereMaterial} from './solarPhotosphere3d.ts';
import mercuryMap from '../solar-system/assets/2k_mercury.webp';
import venusMap from '../solar-system/assets/2k_venus_atmosphere.webp';
import earthMap from '../solar-system/assets/2k_earth_daymap.webp';
import marsMap from '../solar-system/assets/2k_mars.webp';
import jupiterMap from '../solar-system/assets/2k_jupiter.webp';
import saturnMap from '../solar-system/assets/2k_saturn.webp';
import uranusMap from '../solar-system/assets/2k_uranus.webp';
import neptuneMap from '../solar-system/assets/2k_neptune.webp';

type Words = typeof copy.en;
type Sample = { position: Vec3; color: string; radius: number; alpha: number };
type Entry = { root: THREE.Group; samples: Sample[]; planets?: THREE.Mesh[]; systems?: THREE.Group[]; stars?: THREE.Mesh[]; orbits?: THREE.LineLoop[][]; saturn?:THREE.Mesh; layout?:boolean };
const solarMaps=[mercuryMap,venusMap,earthMap,marsMap,jupiterMap,saturnMap,uranusMap,neptuneMap];
const V = (p: Vec3) => new THREE.Vector3(...p);
const rounded = (n: number) => String(Math.round(n / 10) * 10);

/** Stable emissive/absorbing disk reconstruction. It shares the existing Galactic basis and Sun. */
function milkyLightVolume() {
  const material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 worldP;void main(){worldP=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(worldP,1.);}',
    fragmentShader: `varying vec3 worldP;
      float detail(vec3 p){return .5+.22*sin(p.x*27.+sin(p.y*19.)*2.)*sin(p.y*31.+p.z*11.)+.12*sin(p.x*71.-p.y*83.+sin(p.y*41.));}
      void main(){
        vec3 ro=cameraPosition,rd=normalize(worldP-ro),inv=1./rd;
        vec3 nearV=(-vec3(1.5)-ro)*inv,farV=(vec3(1.5)-ro)*inv;
        vec3 mn=min(nearV,farV),mx=max(nearV,farV);
        float enter=max(0.,max(mn.x,max(mn.y,mn.z))),leave=min(mx.x,min(mx.y,mx.z));
        if(leave<=enter)discard;
        float stepSize=(leave-enter)/48.,transmission=1.;vec3 light=vec3(0.);
        for(int i=0;i<48;i++){
          vec3 p=ro+rd*(enter+(float(i)+.5)*stepSize);float r=length(p.xy),grain=detail(p);
          float edge=1.-smoothstep(.86,1.05,r);
          float disk=exp(-r*2.1)*exp(-abs(p.z)/.038)*edge*(.55+.65*grain);
          float bulge=exp(-dot(p/vec3(.22,.14,.12),p/vec3(.22,.14,.12)));
          float dust=exp(-abs(p.z)/.006)*edge*(.25+.75*grain)*exp(-r*1.4);
          vec3 emission=disk*vec3(.45,.54,.66)*2.2+bulge*vec3(1.,.77,.48)*1.1;
          light+=transmission*emission*stepSize;transmission*=exp(-dust*stepSize*5.5);
        }
        gl_FragColor=vec4(vec3(1.)-exp(-light*2.7),.90);
      }` });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), material); mesh.renderOrder = -1; return mesh;
}

/** Retained spatial populations, one on-demand renderer and a projection-equivalent Canvas fallback. */
export class SkyScene {
  private world = new THREE.Scene();
  private perspective = new THREE.PerspectiveCamera(60, 1, .000005, 10000);
  private orthographic = new THREE.OrthographicCamera(-1, 1, 1, -1, .00001, 20);
  private camera: THREE.Camera = this.perspective;
  private canvas = document.createElement('canvas');
  private overlay = document.createElement('canvas');
  private fallback = document.createElement('canvas');
  private renderer?: THREE.WebGLRenderer;
  private entries = new Map<SkyCase, Entry>();
  private observer: ResizeObserver;
  private active = false;
  private lost = false;
  private disposed = false;
  private last?: { selected: SkyCase; state: SkyState; zoom: number; yaw: number; pitch: number };
  private hits: { x: number; y: number; index: number }[] = [];
  private labelBoxes: { x: number; y: number; w: number }[] = [];
  private textures = new Map<number,THREE.Texture>();
  constructor(private host: HTMLElement, private words: Words, private language: string, private failure: (failed: boolean) => void) {
    for (const canvas of [this.canvas, this.fallback, this.overlay]) { canvas.setAttribute('aria-hidden', 'true'); host.append(canvas); }
    this.overlay.className = 'sky-labels';
    this.world.add(new THREE.AmbientLight('#9ba9c0', .55));
    this.prepare();
    this.observer = new ResizeObserver(() => { if (this.active && this.last) this.draw(this.last.selected, this.last.state, this.last.zoom, this.last.yaw, this.last.pitch); });
    this.observer.observe(host);
  }
  private prepare() {
    this.canvas.addEventListener('webglcontextlost', this.contextLost);
    this.canvas.addEventListener('webglcontextrestored', this.contextRestored);
    try { this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'low-power' }); this.renderer.setClearColor('#030812'); this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.lost = false; this.failure(false); }
    catch { this.renderer = undefined; this.lost = true; this.failure(true); }
  }
  private contextLost = (e: Event) => { e.preventDefault(); this.lost = true; this.failure(true); this.redraw(); };
  private contextRestored = () => { if (this.disposed) return; this.lost = false; this.failure(false); this.redraw(); };
  private redraw() { if (this.last) this.draw(this.last.selected, this.last.state, this.last.zoom, this.last.yaw, this.last.pitch); }
  retry() {
    if (this.disposed) return;
    this.canvas.removeEventListener('webglcontextlost', this.contextLost); this.canvas.removeEventListener('webglcontextrestored', this.contextRestored);
    this.renderer?.dispose(); this.renderer?.forceContextLoss();
    const next = document.createElement('canvas'); next.setAttribute('aria-hidden', 'true'); this.canvas.replaceWith(next); this.canvas = next; this.prepare(); this.redraw();
  }
  setActive(active: boolean) { this.active = active; }
  targets() { return this.hits; }
  pick(x: number, y: number) { return this.hits.filter(p => Math.hypot(p.x - x, p.y - y) <= 22).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0]?.index; }
  private points(root: THREE.Group, samples: Sample[], absorb = false) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(samples.flatMap(s => [...s.position]), 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(samples.flatMap(s => { const c = new THREE.Color(s.color); return [c.r, c.g, c.b]; }), 3));
    geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(samples.map(s => s.radius), 1));
    geometry.setAttribute('aAlpha', new THREE.Float32BufferAttribute(samples.map(s => s.alpha), 1));
    const material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, vertexColors: true, blending: absorb ? THREE.NormalBlending : THREE.AdditiveBlending,
      uniforms: { dpr: { value: 1 } },
      vertexShader: 'attribute float aSize;attribute float aAlpha;uniform float dpr;varying vec3 tint;varying float alpha;void main(){tint=color;alpha=aAlpha;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*dpr;}',
      fragmentShader: 'varying vec3 tint;varying float alpha;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float a=(exp(-r*r*5.)*.55+exp(-r*r*65.)*.8)*(1.-smoothstep(.7,1.,r));gl_FragColor=vec4(tint,a*alpha);}' });
    const mesh=new THREE.Points(geometry, material);mesh.renderOrder=absorb?2:0;root.add(mesh);
  }
  private texture(index:number){
    const cached=this.textures.get(index);if(cached)return cached;
    const texture=new THREE.TextureLoader().load(solarMaps[index]!,()=>{if(!this.disposed)this.redraw();});
    texture.colorSpace=THREE.SRGBColorSpace;this.textures.set(index,texture);return texture;
  }
  private entry(selected: SkyCase) {
    const cached = this.entries.get(selected);
    if (cached) { this.entries.delete(selected); this.entries.set(selected, cached); return cached; }
    while (this.entries.size >= 2) { const key = this.entries.keys().next().value!; this.release(this.entries.get(key)!); this.entries.delete(key); }
    const e: Entry = { root: new THREE.Group(), samples: [] };
    if (selected === 'sky') {
      e.root.add(milkyLightVolume());
      const dust: Sample[]=[];
      for (const cloud of galacticObjects('milky-way')[0]!.clouds) {
        for (let j = 0; j < cloud.positions.length; j += 3) {
          const r = cloud.colors[j]!, g = cloud.colors[j + 1]!, b = cloud.colors[j + 2]!;
          const sample={ position: [cloud.positions[j]!, cloud.positions[j + 1]!, cloud.positions[j + 2]!] as Vec3, color: cloud.part==='dust'?'#040812':new THREE.Color(r, g, b).getStyle(), radius: cloud.part==='dust'?22:cloud.mist ? 76 : cloud.part === 'halo' ? 3.5 : cloud.part === 'bulge' ? 3 : 2.5, alpha: cloud.part==='dust'?.10:cloud.mist ? .022 : cloud.part === 'halo' ? .75 : .26 };
          (cloud.part==='dust'?dust:e.samples).push(sample);
        }
      }
      this.points(e.root, e.samples);
      this.points(e.root,dust,true);
    } else if (selected === 'orion') {
      e.samples = catalogue.orion.map(star => ({ position: orionPosition(star.ra, star.dec, parallaxDistance(star.parallax, star.error).ly), color: star.color, radius: 22 - star.magnitude * 2, alpha: 1 }));
      this.points(e.root, e.samples);
    } else {
      e.planets=[];e.systems=[];e.stars=[];e.orbits=[];
      for(let family=0;family<2;family++){
        const system=new THREE.Group();e.root.add(system);e.systems.push(system);e.orbits.push([]);
        const starMaterial=family===0?createSolarPhotosphereMaterial():new THREE.ShaderMaterial({
          uniforms:{tint:{value:new THREE.Color('#ef9e6a')}},
          vertexShader:'varying vec3 n;varying vec3 p;void main(){p=position;n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
          fragmentShader:'uniform vec3 tint;varying vec3 n;varying vec3 p;void main(){float grain=sin(p.x*97.+sin(p.z*49.)*2.)*sin(p.y*83.+sin(p.x*57.))*sin(p.z*71.);float limb=.54+.46*pow(abs(n.z),.5);gl_FragColor=vec4(tint*(limb*(.91+.09*grain)),1.);}'
        });
        const star=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),starMaterial);system.add(star);e.stars.push(star);
        const light=new THREE.PointLight(family?'#ffbb92':'#fff3d6',2.7,.6,0);light.position.z=.006;system.add(light);
        const count=family?7:8;
        for(let i=0;i<count;i++){
          const geometry=new THREE.BufferGeometry().setFromPoints(Array.from({length:192},()=>new THREE.Vector3()));
          const orbit=new THREE.LineLoop(geometry,new THREE.LineBasicMaterial({color:family?'#718da9':'#9ca6ac',transparent:true,opacity:.46}));system.add(orbit);e.orbits[family]!.push(orbit);
          const material=new THREE.MeshStandardMaterial({map:family?null:this.texture(i),color:family?['#a89581','#a69a89','#aeb1ad','#858c83','#a79d8d','#8c969e','#acaaa6'][i]:'#ffffff',roughness:.92});
          if(family)material.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 rockP;').replace('#include <begin_vertex>','#include <begin_vertex>\nrockP=position;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 rockP;').replace('#include <color_fragment>','#include <color_fragment>\nfloat rock=sin(rockP.x*21.+sin(rockP.z*17.)*2.)*sin(rockP.y*29.+sin(rockP.x*13.));diffuseColor.rgb*=.84+.16*rock;');};
          const planet=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),material);planet.rotation.set(.1,i*.34,.08);system.add(planet);e.planets.push(planet);
          if(!family&&i===5){e.saturn=new THREE.Mesh(new THREE.RingGeometry(1.35,2.1,64),new THREE.MeshStandardMaterial({color:'#baa987',transparent:true,opacity:.62,side:THREE.DoubleSide,depthWrite:false,roughness:1}));e.saturn.rotation.x=.4;system.add(e.saturn);}
        }
      }
    }
    this.world.add(e.root); this.entries.set(selected, e); return e;
  }
  private setObserver(observer: Observer, aspect: number, zoom: number) {
    this.camera = this.perspective; this.perspective.position.copy(V(observer.eye)); this.perspective.up.copy(V(observer.up)); this.perspective.fov = observer.fov; this.perspective.aspect = aspect; this.perspective.zoom = zoom;
    this.perspective.lookAt(V(observer.target)); this.perspective.updateProjectionMatrix(); this.perspective.updateMatrixWorld();
  }
  draw(selected: SkyCase, state: SkyState, zoom: number, yaw = 0, pitch = .45) {
    this.last = { selected, state: { ...state }, zoom, yaw, pitch };
    if (!this.active || this.disposed || document.hidden) return;
    const width = this.host.clientWidth, height = this.host.clientHeight; if (width < 1 || height < 1) return;
    const dpr = Math.min(2, devicePixelRatio || 1), aspect = width / height, e = this.entry(selected);
    for (const entry of this.entries.values()) entry.root.visible = entry === e;
    e.root.rotation.set(0, 0, 0);
    if (selected === 'sky') this.setObserver(state.view==='ground'?groundObserver(aspect):milkyObserver(state.milkyProgress, state.direction, aspect), aspect, zoom);
    else if (selected === 'orion') this.setObserver(orionObserver(state.orionProgress, aspect), aspect, zoom);
    else {
      const whole=state.systemWhole,close=!whole&&state.systemClose,span=systemFraming(close),portrait=aspect<1.25;
      this.camera=this.orthographic;const halfH=whole?(portrait?1.04:.52):close?span*Math.max(1,1/aspect):portrait?1.01:.49;
      this.orthographic.left=-halfH*aspect/zoom;this.orthographic.right=halfH*aspect/zoom;this.orthographic.top=halfH/zoom;this.orthographic.bottom=-halfH/zoom;
      this.orthographic.position.set(0,0,4);this.orthographic.lookAt(0,0,0);this.orthographic.updateProjectionMatrix();this.orthographic.updateMatrixWorld();
      if(e.layout!==whole){
        e.orbits!.forEach((orbits,family)=>orbits.forEach((orbit,i)=>{const r=whole?wholeOrbitRadius(family?'trappist':'solar',i):family?trappistPlanets[i]!.au:solarPlanets[i]!.au;const a=orbit.geometry.getAttribute('position') as THREE.BufferAttribute;
          for(let k=0;k<a.count;k++)a.setXYZ(k,r*Math.cos(k*Math.PI*2/a.count),r*Math.sin(k*Math.PI*2/a.count),0);a.needsUpdate=true;orbit.geometry.computeBoundingSphere();}));e.layout=whole;
      }
      e.systems!.forEach((system,family)=>{
        system.visible=!close||family===1;system.position.set(close?0:portrait?0:family?.52:-.52,close?0:portrait?family?-.50:.50:0,0);system.rotation.set(pitch,0,yaw);
        e.stars![family]!.scale.setScalar(whole?(family?.032:.042):close?.0029:family?.008:.021);
        e.orbits![family]!.forEach((orbit,i)=>orbit.visible=whole||family===1||i===0);
      });
      e.planets!.forEach((planet,index)=>{const family=index<8?'solar':'trappist',i=index<8?index:index-8,body=family==='solar'?solarPlanets[i]!:trappistPlanets[i]!;
        planet.visible=whole||index===0||index>=8;planet.position.set(...systemPlanetPosition(family,i,state.systemDays,whole));
        planet.scale.setScalar(whole?(family==='solar'?.013*Math.pow(body.earthRadius,.22):.013*Math.sqrt(body.earthRadius)):(close?.00115:.0034)*Math.sqrt(body.earthRadius));
      });
      const saturn=e.planets![5]!;e.saturn!.visible=whole;e.saturn!.position.copy(saturn.position);e.saturn!.scale.copy(saturn.scale);
    }
    e.root.updateMatrixWorld(true); this.world.updateMatrixWorld(true);
    for (const canvas of [this.overlay, this.fallback]) if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) { canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); }
    e.root.traverse(object => { if (object instanceof THREE.Points) (object.material as THREE.ShaderMaterial).uniforms.dpr!.value = dpr; });
    const gpu = !!this.renderer && !this.lost; this.canvas.hidden = !gpu; this.fallback.hidden = gpu;
    if (gpu) {
      try { this.renderer!.setPixelRatio(dpr); this.renderer!.setSize(width, height, false); this.renderer!.render(this.world, this.camera); }
      catch { this.lost = true; this.failure(true); this.canvas.hidden = true; this.fallback.hidden = false; this.drawFallback(e, width, height, dpr); }
    } else this.drawFallback(e, width, height, dpr);
    this.annotations(e, selected, state, width, height, dpr);
  }
  private project(point: Vec3, width: number, height: number, owner?: THREE.Object3D) {
    const v = V(point); if (owner) v.applyMatrix4(owner.matrixWorld);
    const view = v.clone().applyMatrix4(this.camera.matrixWorldInverse), p = v.project(this.camera);
    return { x: (p.x + 1) * width / 2, y: (1 - p.y) * height / 2, visible: view.z < 0 && p.z > -1 && p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1 };
  }
  private drawFallback(e: Entry, width: number, height: number, dpr: number) {
    const c = this.fallback.getContext('2d')!; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.fillStyle = '#030812'; c.fillRect(0, 0, width, height);
    c.globalCompositeOperation = 'screen';
    const step = e.samples.length > 100 ? 3 : 1;
    for (let i = 0; i < e.samples.length; i += step) {
      const s = e.samples[i]!, p = this.project(s.position, width, height); if (!p.visible) continue;
      c.globalAlpha = s.alpha; c.fillStyle = s.color; c.beginPath(); c.arc(p.x, p.y, s.radius > 50 ? 9 : Math.max(.65, s.radius * .11), 0, Math.PI * 2); c.fill();
    }
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    if (e.systems) for (const [i, owner] of e.systems.entries()) {
      if(!owner.visible)continue;
      c.strokeStyle='#718da970';for(const orbit of e.orbits![i]!){if(!orbit.visible)continue;const a=orbit.geometry.getAttribute('position');this.line(c,Array.from({length:a.count},(_,j)=>[a.getX(j),a.getY(j),a.getZ(j)] as Vec3),width,height,owner);}
      const bodies=[e.stars![i]!,...(i?e.planets!.slice(8):e.planets!.slice(0,8)).filter(body=>body.visible)];
      for (const body of bodies) { const p = this.project([0, 0, 0], width, height, body); if (!p.visible) continue; const r = Math.max(2, body.scale.x / (this.orthographic.right - this.orthographic.left) * width), g = c.createRadialGradient(p.x - r * .3, p.y - r * .3, 0, p.x, p.y, r); g.addColorStop(0, body === e.stars![i] ? '#ffe1ab' : '#c1b5a2'); g.addColorStop(1, '#302e2c'); c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill(); }
    }
  }
  private line(c: CanvasRenderingContext2D, points: readonly Vec3[], width: number, height: number, owner?: THREE.Object3D) {
    c.beginPath(); let started = false;
    for (const v of points) { const p = this.project(v, width, height, owner); if (!p.visible) { started = false; continue; } if (started) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); started = true; } c.stroke();
  }
  private label(c: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, height: number, color = '#dbe6ef', anchor?:{x:number;y:number}) {
    const w = Math.min(width - 24, c.measureText(text).width + 12); x = Math.max(12 + w / 2, Math.min(width - 12 - w / 2, x)); y = Math.max(32, Math.min(height - 18, y));
    const offsets=[0,24,-24,48,-48,72,-72,96,-96,120,-120,144,-144];
    const candidate=offsets.map(d=>y+d).find(yy=>yy>=24&&yy<=height-12&&!this.labelBoxes.some(b=>Math.abs(b.x-x)<(b.w+w)/2+5&&Math.abs(b.y-yy)<24));
    if(candidate===undefined)return;y=candidate;this.labelBoxes.push({ x, y, w });
    if(anchor&&Math.hypot(anchor.x-x,anchor.y-y)>22){c.strokeStyle='#93acc05c';c.lineWidth=.7;c.beginPath();c.moveTo(anchor.x,anchor.y);c.lineTo(x,y-5);c.stroke();}
    c.fillStyle = '#040b17da'; c.fillRect(x - w / 2, y - 15, w, 22); c.fillStyle = color; c.textAlign = 'center'; c.fillText(text, x, y, w - 10);
  }
  private ring(c: CanvasRenderingContext2D, x: number, y: number, radius = 9) { c.strokeStyle = '#ffe0a1'; c.lineWidth = 1.4; c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.stroke(); }
  /** Ground silhouettes locate the introductory sky window; they are not mapped terrain. */
  private earthHorizon(c: CanvasRenderingContext2D,width:number,height:number,opacity:number){
    if(opacity<=0)return;
    c.save();c.globalAlpha=opacity;
    const haze=c.createLinearGradient(0,height*.64,0,height);
    haze.addColorStop(0,'#14243200');haze.addColorStop(.6,'#101c2855');haze.addColorStop(1,'#08101799');
    c.fillStyle=haze;c.fillRect(0,height*.64,width,height*.36);
    for(let layer=0;layer<3;layer++){
      c.beginPath();c.moveTo(0,height);
      for(let x=0;x<=width+8;x+=8){const u=x/width;
        const ridge=Math.sin(u*8.1+layer*2.4)*.021+Math.sin(u*19.6+layer*.7)*.012+Math.sin(u*43.1+1.7)*.003;
        c.lineTo(x,height*(.79+layer*.055+ridge*(1-layer*.16)));
      }
      c.lineTo(width,height);c.closePath();c.fillStyle=['#0c1720','#071019','#03090f'][layer]!;c.fill();
    }
    c.restore();
  }
  private annotations(e: Entry, selected: SkyCase, state: SkyState, width: number, height: number, dpr: number) {
    const c = this.overlay.getContext('2d')!, w = this.words;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, width, height); c.font = `${width < 600 ? 11 : 13}px system-ui`; this.hits = []; this.labelBoxes = [];
    if (selected === 'sky') {
      const external = state.view==='ground'?0:milkyTravelProgress(state.milkyProgress), sun = this.project(SKY_SUN, width, height);
      const ground=earthSkyOpacity(state.view);this.earthHorizon(c,width,height,ground);
      if (external > .04 && sun.visible) { this.ring(c, sun.x, sun.y); this.label(c, w.sun, sun.x, sun.y + 26, width, height, '#ffe0a1'); c.strokeStyle = '#ffe0a1ad'; c.setLineDash([6, 5]); this.line(c, [SKY_SUN, add(SKY_SUN, mul(skyDirection(state.direction), .95))], width, height); c.setLineDash([]); }
      // The direction is catalogued; the diffuse patch is an enlarged recognition illustration.
      if (state.view!=='ground' && state.direction === 'andromeda' && external < .07) {
        const p = this.project(add(SKY_SUN, mul(M31_DIRECTION, .6)), width, height);
        if (p.visible) {
          c.save(); c.translate(p.x, p.y); c.rotate(-.6); c.scale(3.6, 1);
          const g = c.createRadialGradient(0, 0, 0, 0, 0, 12); g.addColorStop(0, '#fff1c3cc'); g.addColorStop(.3, '#c6c8c14a'); g.addColorStop(1, '#a8bfd000'); c.fillStyle = g; c.fillRect(-13, -13, 26, 26); c.restore(); this.ring(c, p.x, p.y, 25); this.label(c, w.m31, p.x, p.y - 38, width, height, '#ffe0a1');
        }
        const foreground = catalogue.andromedaForeground.map(s => this.project(add(SKY_SUN, mul(galacticDirection(s.ra, s.dec), .6)), width, height));
        if (state.lines) { c.strokeStyle = '#99bbd279'; c.setLineDash([3, 5]); c.beginPath(); foreground.forEach((p, i) => { if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); }); c.stroke(); c.setLineDash([]); }
        foreground.forEach((p, i) => { if (!p.visible) return; c.fillStyle = '#e3e9f5'; c.beginPath(); c.arc(p.x, p.y, i < 2 ? 2 : 1.4, 0, Math.PI * 2); c.fill(); if (i === 1) this.label(c, catalogue.andromedaForeground[i]!.name[this.language === 'en' ? 'en' : 'zh'], p.x, p.y + 24, width, height); });
      }
      this.label(c, ground>.01 ? w.earthSky : external < .05 ? state.direction === 'pole' ? w.pole : state.direction === 'andromeda' ? w.foreground : w.band : w.sightline, width / 2, height - 24, width, height);
    } else if (selected === 'orion') {
      const p = smooth(state.orionProgress), stars = e.samples.map(s => this.project(s.position, width, height));
      if (state.lines) { c.strokeStyle = '#a5bedc79'; c.lineWidth = 1; for (const [a, b] of catalogue.orionLines) this.line(c, [e.samples[a!]!.position, e.samples[b!]!.position], width, height); }
      if (p > .03) {
        c.strokeStyle = '#8da2ba28'; c.setLineDash([3, 7]); for (const s of e.samples) this.line(c, [[0, 0, 0], s.position], width, height); c.setLineDash([]);
        const earth = this.project([0, 0, 0], width, height); if (earth.visible) { this.ring(c, earth.x, earth.y, 7); this.label(c, w.earth, earth.x, earth.y + 24, width, height, '#ffe0a1'); }
        c.strokeStyle = '#8da2ba79'; this.line(c, [[0, -230, 0], [0, -230, 2200]], width, height);
        for (let d = 500; d <= 2000; d += 500) { const t = this.project([0, -230, d], width, height); if (t.visible) { c.fillStyle = '#aec0d2'; c.fillRect(t.x - 3, t.y - 3, 6, 1); this.label(c, `${d} ${w.ly}`, t.x, t.y + 21, width, height); } }
        const s = catalogue.orion[state.star]!, range = parallaxDistance(s.parallax, s.error);
        c.strokeStyle = '#ffe0a1bb'; c.lineWidth = 3; this.line(c, [orionPosition(s.ra, s.dec, range.nearLy), orionPosition(s.ra, s.dec, range.farLy)], width, height); c.lineWidth = 1;
      }
      // Put the selected star first so its name survives narrow layouts.
      for (const i of [state.star, ...stars.map((_, i) => i).filter(i => i !== state.star)]) {
        const point = stars[i]!, s = catalogue.orion[i]!; if (!point.visible) continue;
        this.hits.push({ x: point.x, y: point.y, index: i });
        if (i === state.star) this.ring(c, point.x, point.y, 12);
        if(p>.2&&i!==state.star&&i!==1&&i!==3)continue;
        if(width<500&&p<=.2&&i!==state.star&&i>1&&i<5)continue;
        this.label(c, `${s.name[this.language === 'en' ? 'en' : 'zh']}${p > .12 ? ` · ${rounded(parallaxDistance(s.parallax, s.error).ly)} ${w.ly}` : ''}`, point.x + (i % 2 ? -35 : 35), point.y + (i < 2 ? -21 : 25), width, height, i === state.star ? '#ffe0a1' : '#dbe6ef',point);
      }
    } else {
      const portrait=width/height<1.25,whole=state.systemWhole,close=!whole&&state.systemClose;
      e.systems!.forEach((owner,family)=>{if(!owner.visible)return;const center=this.project([0,0,0],width,height,owner);
        const title=whole?family?w.trappistWhole:w.solarWhole:family?w.trappistLabel:w.solarLabel;
        const titleY=whole?center.y-.405/(this.orthographic.top-this.orthographic.bottom)*height:portrait&&!close?Math.max(56,center.y-height*.20):56;
        this.label(c,title,center.x,titleY,width,height,family?'#ffd0ad':'#ffe4aa');
      });
      e.planets!.forEach((body,index)=>{const family=index<8?0:1,owner=e.systems![family]!;if(!body.visible||!owner.visible)return;
        if(!whole&&family===0)return; // Mercury is the reference in the common-AU comparison.
        const p=this.project([0,0,0],width,height,body);if(!p.visible)return;this.hits.push({x:p.x,y:p.y,index});
        const chosen=state.systemOwner==='solar'&&whole?state.solarPlanet:state.planet+8,selected=index===chosen;
        if(selected)this.ring(c,p.x,p.y,11);
        if(whole||close||selected){const name=family?trappistPlanets[index-8]!.id:solarPlanets[index]!.name[this.language==='en'?'en':'zh'];this.label(c,name,p.x+(index%2?-20:20),p.y-15,width,height,selected?'#ffe0a1':'#c5d5e3',p);}
      });
      if(whole){this.label(c,w.wholeLayout,width/2,height-20,width,height);return;}
      const owner=e.systems![1]!,ruler=close?.02:.1,start:Vec3=[0,-.065,0],end:Vec3=[ruler,-.065,0];
      if(close){c.strokeStyle='#c2d4e7';this.line(c,[start,end],width,height,owner);const p=this.project(end,width,height,owner);if(p.visible)this.label(c,`${ruler} AU`,p.x,p.y+20,width,height);}
      else{const y=height-47,length=ruler/(this.orthographic.right-this.orthographic.left)*width;c.strokeStyle='#c2d4e7';c.beginPath();c.moveTo(24,y);c.lineTo(24+length,y);c.stroke();this.label(c,`${ruler} AU`,24+length/2,y-8,width,height);}
      this.label(c,close?w.mercuryOutside:w.mercury,width/2,height-20,width,height);
    }
  }
  private release(e: Entry) {
    this.world.remove(e.root);
    e.root.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(m => m.dispose()); } });
    e.root.clear();
  }
  dispose() {
    if (this.disposed) return; this.disposed = true; this.active = false; this.observer.disconnect();
    this.canvas.removeEventListener('webglcontextlost', this.contextLost); this.canvas.removeEventListener('webglcontextrestored', this.contextRestored);
    this.entries.forEach(e => this.release(e)); this.entries.clear(); this.textures.forEach(t=>t.dispose());this.textures.clear();this.renderer?.dispose(); this.renderer?.forceContextLoss(); this.canvas.remove(); this.overlay.remove(); this.fallback.remove(); this.last = undefined; this.hits = [];
  }
}
