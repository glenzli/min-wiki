import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {WorkspaceState} from './workspaceModel';
import type {WorkspaceRenderer} from './workspaceRenderer';
import type words from './healthContent.json';
import {escaped} from './workspaceRenderer';
type Copy=typeof words.en;

/** A retained structural illustration. It owns GPU/camera resources, not biological time. */
export class Specimen3D implements WorkspaceRenderer {
 private renderer:THREE.WebGLRenderer;
 private scene=new THREE.Scene();private specimen=new THREE.Group();
 private camera=new THREE.PerspectiveCamera(34,1,.1,50);
 private controls:OrbitControls;private observer:ResizeObserver;private abort=new AbortController();
 private disposed=false;private key='';private cut=false;private fitBucket='';
 private localClip=new THREE.Plane(new THREE.Vector3(0,0,-1),.15);
 private clipping=this.localClip.clone();
 private materials=new Map<string,THREE.MeshStandardMaterial[]>();
 private texture:THREE.CanvasTexture;
 private canvas=document.createElement('canvas');private legend=document.createElement('div');
 constructor(private host:HTMLElement,private copy:Copy,private fail:()=>void){
  this.canvas.className='micro-specimen-canvas';this.canvas.tabIndex=0;this.canvas.setAttribute('role','img');this.canvas.setAttribute('aria-label',copy.ui.gesture);this.legend.className='micro-scene-legend';host.append(this.canvas,this.legend);
  this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:false,powerPreference:'low-power'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setClearColor('#e4e9e4');this.renderer.localClippingEnabled=true;
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
  this.camera.position.set(4.3,2.5,8.7);this.camera.lookAt(0,0,0);
  this.controls=new OrbitControls(this.camera,this.canvas);this.controls.enablePan=false;this.controls.enableDamping=false;this.controls.minDistance=3.2;this.controls.maxDistance=16;this.controls.rotateSpeed=.65;this.controls.saveState();
  this.scene.add(new THREE.HemisphereLight('#fff7e8','#778c8b',2.4));
  const key=new THREE.DirectionalLight('#fff9ee',3.4);key.position.set(-4,6,7);this.scene.add(key);
  const rim=new THREE.DirectionalLight('#bfd8e7',2.2);rim.position.set(5,1,-4);this.scene.add(rim,this.specimen);
  const c=document.createElement('canvas');c.width=c.height=192;const ctx=c.getContext('2d')!;ctx.fillStyle='#d7d9d2';ctx.fillRect(0,0,192,192);
  for(let i=0;i<6000;i++){const v=110+Math.floor((Math.sin(i*53.31)*43758.54%1+1)*35);ctx.fillStyle=`rgba(${v},${v},${v},.16)`;ctx.fillRect((i*83.17)%192,(i*41.71)%192,1.5,1.5);}
  this.texture=new THREE.CanvasTexture(c);this.texture.wrapS=this.texture.wrapT=THREE.RepeatWrapping;this.texture.repeat.set(3,2);
  this.controls.addEventListener('change',this.paint);
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);
  this.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();if(!this.disposed)this.fail();},{signal:this.abort.signal});
  this.canvas.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','=','Home'].includes(event.key))return;event.preventDefault();if(event.key==='Home'){this.specimen.rotation.set(0,0,0);this.controls.reset();}else if(event.key==='ArrowLeft'||event.key==='ArrowRight')this.specimen.rotation.y+=event.key==='ArrowLeft'?-.15:.15;else if(event.key==='ArrowUp'||event.key==='ArrowDown')this.specimen.rotation.x+=event.key==='ArrowUp'?-.15:.15;else this.camera.position.multiplyScalar(event.key==='-'?1.08:.93);this.controls.update();this.paint();},{signal:this.abort.signal});
  this.resize();
 }
 private material(part:string,color:string,opacity=1){const m=new THREE.MeshStandardMaterial({color,roughness:.78,metalness:0,map:this.texture,transparent:opacity<1,opacity,depthWrite:opacity===1,side:THREE.DoubleSide});const list=this.materials.get(part)??[];list.push(m);this.materials.set(part,list);return m;}
 private mesh(g:THREE.BufferGeometry,m:THREE.Material,parent=this.specimen){const mesh=new THREE.Mesh(g,m);parent.add(mesh);return mesh;}
 private tube(points:THREE.Vector3[],radius:number,m:THREE.Material,parent=this.specimen){return this.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(32,points.length*2),radius,7,false),m,parent);}
 private clear(){const geometries=new Set<THREE.BufferGeometry>();this.specimen.traverse(node=>{if(node instanceof THREE.Mesh)geometries.add(node.geometry);if(node instanceof THREE.InstancedMesh)node.dispose();});geometries.forEach(g=>g.dispose());this.materials.forEach(list=>list.forEach(m=>m.dispose()));this.materials.clear();this.specimen.clear();}
 private cell(form:WorkspaceState['form']){
  const wall=this.material('wall','#4e9b8e');
  if(form==='coccus'){this.mesh(new THREE.SphereGeometry(1.8,64,40),wall);return;}
  if(form==='spiral'){const points=Array.from({length:70},(_,i)=>{const t=i/69;return new THREE.Vector3((t-.5)*4.5,.52*Math.sin(t*Math.PI*4),.52*Math.cos(t*Math.PI*4));});this.tube(points,.44,wall);for(const p of [points[0]!,points.at(-1)!])this.mesh(new THREE.SphereGeometry(.44,24,18),wall).position.copy(p);return;}
  const capsule=(r:number,length:number)=>new THREE.CapsuleGeometry(r,length,12,52).rotateZ(Math.PI/2);
  this.mesh(capsule(.82,2.8),wall);
  this.mesh(capsule(.73,2.8),this.material('membrane','#b2b56f'));
  this.mesh(capsule(.66,2.8),this.material('cytoplasm','#acc6af',.24));
  const dna=this.material('dna','#8068a5');
  const dnaPoints=Array.from({length:170},(_,i)=>{const t=i/169;return new THREE.Vector3((t-.5)*3.1,.28*Math.sin(t*29)+.13*Math.cos(t*71),.26*Math.cos(t*29));});this.tube(dnaPoints,.035,dna);
  const ribo=this.material('ribosomes','#bd975a');const small=new THREE.SphereGeometry(.062,10,8);
  for(let i=0;i<64;i++){const x=(Math.sin(i*43.17)*437.13%1)*1.65,a=i*2.399,r=.36+((i*7)%9)*.021;const one=this.mesh(small,ribo);one.position.set(x,Math.cos(a)*r,Math.sin(a)*r);one.scale.set(1.25,.85,1);}
  const lipid=this.material('membrane','#ccd2a7');const beads=new THREE.InstancedMesh(new THREE.SphereGeometry(.025,6,5),lipid,280),matrix=new THREE.Matrix4();
  for(let i=0;i<280;i++){const x=-1.35+(i%40)/39*2.7,a=Math.floor(i/40)/7*Math.PI*2;matrix.makeTranslation(x,.736*Math.cos(a),.736*Math.sin(a));beads.setMatrixAt(i,matrix);}this.specimen.add(beads);
 }
 private virus(kind:WorkspaceState['virus']){
  const genome=this.material('dna','#ad8956');
  if(kind==='phage'){
   const head=this.mesh(new THREE.IcosahedronGeometry(1.05,1),this.material('wall','#728ba4'));head.position.y=1.1;head.scale.y=1.15;
   const sheath=this.material('sheath','#98a8b2');for(let i=0;i<15;i++){const ring=this.mesh(new THREE.TorusGeometry(.19,.05,6,18),sheath);ring.rotation.x=Math.PI/2;ring.position.y=.1-i*.065;}
   this.mesh(new THREE.CylinderGeometry(.08,.08,1.15,14),sheath).position.y=-.4;
   this.mesh(new THREE.CylinderGeometry(.43,.34,.12,6),sheath).position.y=-1.04;
   for(let i=0;i<6;i++){const a=i*Math.PI/3;this.tube([new THREE.Vector3(.26*Math.cos(a),-1.02,.26*Math.sin(a)),new THREE.Vector3(.8*Math.cos(a),-.96,.8*Math.sin(a)),new THREE.Vector3(1.12*Math.cos(a),-1.55,1.12*Math.sin(a))],.028,sheath);}
   this.tube(Array.from({length:140},(_,i)=>{const t=i/139;return new THREE.Vector3(.65*Math.cos(t*29),.42+t*1.3,.65*Math.sin(t*29));}),.031,genome);return;
  }
  if(kind==='influenza'){
   this.mesh(new THREE.SphereGeometry(1.57,64,44),this.material('membrane','#9d849b')).scale.set(1.2,1,.96);
   this.mesh(new THREE.SphereGeometry(1.48,56,36),this.material('matrix','#b2bdc1')).scale.set(1.2,1,.96);
   const protein=this.material('surface','#7a849f');const group=new THREE.Group();this.specimen.add(group);
   for(let i=0;i<105;i++){const y=1-2*(i+.5)/105,a=i*2.399963,r=Math.sqrt(1-y*y),normal=new THREE.Vector3(r*Math.cos(a),y,r*Math.sin(a));const stem=this.mesh(new THREE.CylinderGeometry(.045,.035,.29,7),protein,group);stem.position.copy(normal.clone().multiplyScalar(1.71));stem.position.x*=1.2;stem.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);const cap=this.mesh(new THREE.SphereGeometry(.105,9,7),protein,group);cap.position.copy(normal.clone().multiplyScalar(1.88));cap.position.x*=1.2;cap.scale.set(1,.75,1);}
   for(let strand=0;strand<8;strand++){const a=(strand-1)*Math.PI*2/7,x=strand===0?0:Math.cos(a)*.64,z=strand===0?0:Math.sin(a)*.64;this.tube(Array.from({length:70},(_,i)=>{const t=i/69;return new THREE.Vector3(x+.085*Math.cos(t*34+strand)+.05*Math.sin(t*5),-.95+t*(1.7+(strand%3)*.12),z+.085*Math.sin(t*34+strand));}),.037,genome);}
  }else{
   const capsid=this.material('wall','#738eab');this.mesh(new THREE.IcosahedronGeometry(1.69,3),capsid);
   const knob=this.material('surface','#8ba4ba');const g=new THREE.SphereGeometry(.16,10,8);
   for(let i=0;i<92;i++){const y=1-2*(i+.5)/92,a=i*2.399963,r=Math.sqrt(1-y*y);const m=this.mesh(g,knob);m.position.set(r*Math.cos(a)*1.75,y*1.75,r*Math.sin(a)*1.75);m.scale.set(1.1,.8,1);}
   this.tube(Array.from({length:210},(_,i)=>{const t=i/209;const p=new THREE.Vector3(.85*Math.sin(t*33)+.23*Math.sin(t*79+1),.88*Math.cos(t*17)+.16*Math.sin(t*59),.72*Math.sin(t*21+1)+.18*Math.cos(t*49));if(p.length()>1.2)p.normalize().multiplyScalar(1.2);return p;}),.034,genome);
  }
 }
 render(state:WorkspaceState){
  if(this.disposed)return;const key=state.chapter==='bacteria'?`bacteria:${state.form}`:`virus:${state.virus}`;
  if(this.key!==key){this.clear();this.key=key;this.fitBucket='';if(state.chapter==='bacteria')this.cell(state.form);else this.virus(state.virus);this.fit();}
  this.cut=state.cutaway&&(state.chapter!=='bacteria'||state.form==='rod');
  const viral=state.chapter==='viruses',focus=viral?(this.cut?'dna':'surface'):state.part;
  for(const [part,list]of this.materials)for(const material of list){const internal=['dna','ribosomes','cytoplasm'].includes(part);material.clippingPlanes=internal?[]:this.cut?[this.clipping]:[];material.emissive.set(part===focus?'#25312e':'#000000');material.emissiveIntensity=.2;material.visible=!internal||this.cut;material.needsUpdate=true;}
  const legendKeys=state.chapter==='bacteria'?(state.form==='rod'?['wall','membrane','dna','ribosomes']:['outline']):state.virus==='influenza'?['membrane','surfaceProtein','genome']:['capsid','genome'];
  this.legend.innerHTML=legendKeys.map(part=>`<span data-legend="${part}"><i></i>${escaped(this.copy.legend[part as keyof Copy['legend']])}</span>`).join('');
  this.canvas.setAttribute('aria-label',`${state.chapter==='bacteria'?this.copy.forms[state.form]:this.copy.viruses[state.virus]}. ${this.copy.ui.gesture}`);
  this.canvas.dataset.specimen=key;this.canvas.dataset.cutaway=String(this.cut);this.canvas.dataset.hasRibosomes=String(!viral&&state.form==='rod');this.resize();
 }
 reset(){this.specimen.rotation.set(0,0,0);this.controls.reset();this.paint();}
 private fit(){if(!this.key)return;const bucket=`${this.key}:${this.camera.aspect<1.4}`;if(bucket===this.fitBucket)return;this.fitBucket=bucket;const rod=this.key==='bacteria:rod';const distance=rod?(this.camera.aspect<1.4?8.6:5.1):(this.camera.aspect<1.1?8.4:7.0);this.camera.position.normalize().multiplyScalar(distance);this.controls.update();this.controls.saveState();}
 private resize(){if(this.disposed)return;const rect=this.host.getBoundingClientRect();const width=Math.max(1,rect.width),height=Math.max(280,rect.height-(this.legend.getBoundingClientRect().height||40));this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.fit();this.paint();}
 private paint=()=>{if(!this.disposed){this.specimen.updateMatrixWorld(true);this.clipping.copy(this.localClip).applyMatrix4(this.specimen.matrixWorld);this.renderer.render(this.scene,this.camera);}};
 pause(){} // Structural observation has no free-running clock or delayed camera callback.
 dispose(){if(this.disposed)return;this.disposed=true;this.abort.abort();this.observer.disconnect();this.controls.removeEventListener('change',this.paint);this.controls.dispose();this.clear();this.texture.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.canvas.remove();this.legend.remove();}
}
