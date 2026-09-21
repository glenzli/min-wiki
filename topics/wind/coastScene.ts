import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { animateValue } from '../../src/visuals/transition.ts';
import type { Camera, WindSession } from './session.ts';
const rand=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
import { shoreline as shore, coastHeight as height, airPoint, type Obstacle } from './model.ts';
export class CoastScene {
  private world=new THREE.Scene(); private camera=new THREE.PerspectiveCamera(39,1,1,1800);
  private renderer:THREE.WebGLRenderer; private controls:OrbitControls; private observer:ResizeObserver;
  private sun=new THREE.DirectionalLight('#fff1d7',3.1);private ambient=new THREE.HemisphereLight('#d5e9ef','#75856c',2.7);
  private water:THREE.ShaderMaterial;private grass:THREE.ShaderMaterial;private air=new THREE.Group();private obstacle=new THREE.Group();
  private house=new THREE.Group();private hill:THREE.Mesh;private rotors:THREE.Group[]=[];private trees:THREE.Group[]=[];
  private particles:THREE.Points;private pathLines:THREE.Line[]=[];private arrows:THREE.Mesh[]=[];private sails:THREE.Mesh[]=[];private seeds:THREE.Points;
  private disposed=false;private cancelCamera=()=>{};private lastObstacle='';
  constructor(private canvas:HTMLCanvasElement){
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
    this.world.background=new THREE.Color('#c6dce1');this.world.fog=new THREE.FogExp2('#c6dce1',.00135);
    this.world.add(this.ambient,this.sun);this.sun.position.set(-110,190,90);
    this.camera.position.set(235,170,255);this.controls=new OrbitControls(this.camera,canvas);this.controls.target.set(0,25,0);this.controls.enableDamping=false;this.controls.enablePan=false;this.controls.minDistance=140;this.controls.maxDistance=680;this.controls.maxPolarAngle=Math.PI*.47;this.controls.addEventListener('change',this.render);this.controls.update();
    const terrain=new THREE.PlaneGeometry(1,1,180,200);terrain.rotateX(-Math.PI/2);
    const positions=terrain.attributes.position,colors=[];const sand=new THREE.Color('#cab991'),green=new THREE.Color('#70876a'),rock=new THREE.Color('#8d9180');
    for(let i=0;i<positions.count;i++){
      const u=positions.getX(i)+.5,z=positions.getZ(i)*900,x=shore(z)+u*(600-shore(z)),y=height(x,z);
      positions.setXYZ(i,x,y,z);const color=sand.clone().lerp(green,Math.min(1,u*16));if(y>18)color.lerp(rock,.4);color.multiplyScalar(.89+rand(i)*.18);colors.push(color.r,color.g,color.b);
    }
    terrain.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));terrain.computeVertexNormals();
    this.world.add(new THREE.Mesh(terrain,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1})));
    this.water=new THREE.ShaderMaterial({uniforms:{time:{value:0},wind:{value:.65},night:{value:0}},vertexShader:`uniform float time,wind; varying vec3 p; varying float ripple; varying vec3 viewPosition; void main(){p=position;float a=sin(p.x*.6+p.z*.27-time*3.)+sin(p.z*.93+p.x*.105-time*2.);ripple=a;vec3 q=p;q.y+=a*.08*abs(wind);vec4 mv=modelViewMatrix*vec4(q,1.);viewPosition=mv.xyz;gl_Position=projectionMatrix*mv;}`,fragmentShader:`uniform float night,time;varying vec3 p;varying float ripple;varying vec3 viewPosition;void main(){float depth=length(viewPosition);float wave=sin(p.x*.6+p.z*.27-time*3.)+sin(p.z*.93+p.x*.105-time*2.);float glint=pow(max(0.,sin(p.x*.57+p.z*.51+wave*.8)),24.)*.07;vec3 col=mix(vec3(.20,.43,.47),vec3(.37,.61,.61),.4+.1*wave)+glint;col*=1.-night*.45;vec3 sky=mix(vec3(.776,.863,.882),vec3(.321,.42,.51),night*.72);col=mix(col,sky,1.-exp(-depth*depth*.0000018));gl_FragColor=vec4(col,1.);}`});
    const sea=new THREE.PlaneGeometry(10000,10000,1,1);sea.rotateX(-Math.PI/2);const seaMesh=new THREE.Mesh(sea,this.water);seaMesh.position.set(-105,-.7,-70);this.world.add(seaMesh);
    const rockGeo=new THREE.DodecahedronGeometry(1,1),rockMat=new THREE.MeshStandardMaterial({color:'#929a8b',roughness:1});
    const rocks=new THREE.InstancedMesh(rockGeo,rockMat,95),dummy=new THREE.Object3D();
    for(let i=0;i<95;i++){const z=-140+rand(i+7)*280,x=shore(z)+rand(i+20)*12;dummy.position.set(x,height(x,z),z);dummy.scale.set(1+rand(i+8)*4,1+rand(i)*3,1+rand(i+4)*3);dummy.rotation.set(rand(i),rand(i+11)*6,rand(i+17));dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}this.world.add(rocks);
    const trunkMat=new THREE.MeshStandardMaterial({color:'#72624b',roughness:1}),leafMats=['#49674e','#597658','#647e57'].map(color=>new THREE.MeshStandardMaterial({color,roughness:1}));
    const leafGeo=new THREE.IcosahedronGeometry(1,2),trunkGeo=new THREE.CylinderGeometry(.45,.9,10,7);
    for(let i=0;i<31;i++){
      const x=55+rand(i+181)*110,z=-105+rand(i+193)*220,tree=new THREE.Group();tree.position.set(x,height(x,z),z);
      const trunk=new THREE.Mesh(trunkGeo,trunkMat);trunk.position.y=5;tree.add(trunk);
      for(let k=0;k<5;k++){const foliage=new THREE.Mesh(leafGeo,leafMats[k%3]);foliage.position.set((rand(i*11+k)-.5)*5,9+k*1.2,(rand(i*21+k)-.5)*4);foliage.scale.set(3+rand(i+k)*3,2+rand(i+k+2)*2,3+rand(i+k+4)*2);tree.add(foliage);}
      const scale=.65+rand(i+611)*.65;tree.scale.setScalar(scale);this.trees.push(tree);this.world.add(tree);
    }
    const grassPositions:number[]=[],grassSeeds:number[]=[];
    for(let i=0;i<1600;i++){
      const x=2+rand(i+1931)*165,z=-65+rand(i+934)*210,y=height(x,z),h=1.5+rand(i+8)*3.5;
      grassPositions.push(x-.18,y,z,x+.18,y,z,x+.8,y+h,z);grassSeeds.push(0,0,1);
    }
    const grassGeo=new THREE.BufferGeometry();grassGeo.setAttribute('position',new THREE.Float32BufferAttribute(grassPositions,3));grassGeo.setAttribute('tip',new THREE.Float32BufferAttribute(grassSeeds,1));
    this.grass=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{time:{value:0},wind:{value:.65},night:{value:0}},vertexShader:`attribute float tip;uniform float time,wind;varying float v;void main(){vec3 p=position;p.x+=tip*wind*(1.4+.6*sin(time*3.+p.x*.12+p.z*.08));v=tip;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`uniform float night;varying float v;void main(){gl_FragColor=vec4(mix(vec3(.34,.43,.24),vec3(.66,.67,.40),v)*(1.-night*.5),1.);}`});this.world.add(new THREE.Mesh(grassGeo,this.grass));
    const wall=new THREE.Mesh(new THREE.BoxGeometry(22,15,18),new THREE.MeshStandardMaterial({color:'#e3d6b8',roughness:1}));wall.position.y=7.5;this.house.add(wall);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(19,10,4),new THREE.MeshStandardMaterial({color:'#9a7662',roughness:1}));roof.rotation.y=Math.PI/4;roof.scale.z=.8;roof.position.y=20;this.house.add(roof);
    this.house.position.set(42,height(42,10),10);this.obstacle.add(this.house);
    this.hill=new THREE.Mesh(new THREE.SphereGeometry(1,48,28),new THREE.MeshStandardMaterial({color:'#82946c',roughness:1}));this.hill.scale.set(29,18,28);this.hill.position.set(42,2,10);this.obstacle.add(this.hill);this.world.add(this.obstacle);
    // A wind wheel, a sail and seed tracers inhabit the same coastal environment.
    const tower=new THREE.Group();tower.position.set(115,height(115,58),58);const pole=new THREE.Mesh(new THREE.CylinderGeometry(.65,1.7,39,10),new THREE.MeshStandardMaterial({color:'#d9d8c9',roughness:.85}));pole.position.y=19.5;tower.add(pole);
    const rotor=new THREE.Group();rotor.position.y=40;rotor.rotation.y=Math.PI/2;
    for(let k=0;k<3;k++){const blade=new THREE.Mesh(new THREE.ConeGeometry(1.4,20,5),new THREE.MeshStandardMaterial({color:'#eae7d8',roughness:.8}));const g=new THREE.Group();g.rotation.z=k*Math.PI*2/3;blade.position.y=9;g.add(blade);rotor.add(g);}tower.add(rotor);this.rotors.push(rotor);this.world.add(tower);
    const boat=new THREE.Group();boat.position.set(-79,0,60);const hull=new THREE.Mesh(new THREE.SphereGeometry(1,18,9),new THREE.MeshStandardMaterial({color:'#886951',roughness:.9}));hull.scale.set(12,2.5,4);boat.add(hull);
    const mast=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,28,8),trunkMat);mast.position.y=14;boat.add(mast);const sailGeo=new THREE.PlaneGeometry(15,23,12,12);sailGeo.translate(7.5,14,0);const sail=new THREE.Mesh(sailGeo,new THREE.MeshStandardMaterial({color:'#eee6cc',roughness:1,side:THREE.DoubleSide}));sail.rotation.y=Math.PI/2;boat.add(sail);this.sails.push(sail);this.world.add(boat);
    const airPositions=new Float32Array(300*3),airColors=new Float32Array(300*3),airGeo=new THREE.BufferGeometry();airGeo.setAttribute('position',new THREE.BufferAttribute(airPositions,3));airGeo.setAttribute('color',new THREE.BufferAttribute(airColors,3));
    this.particles=new THREE.Points(airGeo,new THREE.PointsMaterial({size:2.5,vertexColors:true,transparent:true,opacity:.95,depthWrite:false,fog:false,toneMapped:false}));this.air.add(this.particles);
    for(let lane=0;lane<4;lane++){const geo=new THREE.BufferGeometry().setFromPoints(Array.from({length:121},()=>new THREE.Vector3()));const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:'#377580',transparent:true,opacity:.5,fog:false,toneMapped:false}));this.pathLines.push(line);this.air.add(line);}
    for(let i=0;i<12;i++){const arrow=new THREE.Mesh(new THREE.ConeGeometry(1.25,4.6,7),new THREE.MeshBasicMaterial({color:'#286b7b',transparent:true,opacity:1,fog:false,toneMapped:false}));this.arrows.push(arrow);this.air.add(arrow);}this.world.add(this.air);
    const seedGeo=new THREE.BufferGeometry();seedGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(24*3),3));this.seeds=new THREE.Points(seedGeo,new THREE.PointsMaterial({color:'#fff1c6',size:1.8,transparent:true,opacity:.9,depthWrite:false}));this.world.add(this.seeds);
    this.observer=new ResizeObserver(this.resize);this.observer.observe(canvas);this.resize();
  }
  private route(u:number,lane:number,obstacle:Obstacle){
    const p=airPoint(u,lane,obstacle);return new THREE.Vector3(p.x,p.y,p.z);
  }
  draw(s:WindSession){
    const h=s.coast.heat,night=Math.max(0,-h),phase=s.coast.phase;
    this.water.uniforms.time.value=phase*14;this.water.uniforms.wind.value=h;this.water.uniforms.night.value=night;
    this.grass.uniforms.time.value=phase*18;this.grass.uniforms.wind.value=h;this.grass.uniforms.night.value=night;
    const bg=new THREE.Color('#c6dce1').lerp(new THREE.Color('#526b82'),night*.72);this.world.background=bg;(this.world.fog as THREE.FogExp2).color.copy(bg);
    this.sun.intensity=3.1-night*1.8;this.ambient.intensity=2.7-night*1.1;
    for(let i=0;i<this.trees.length;i++)this.trees[i].rotation.z=-h*(.025+.013*Math.sin(phase*22+i));
    this.rotors.forEach(r=>r.rotation.z=phase*32);
    this.sails.forEach(mesh=>{const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)/15*Math.PI)*Math.sin((p.getY(i)-2.5)/23*Math.PI)*h*4);p.needsUpdate=true;mesh.geometry.computeVertexNormals();});
    this.house.visible=s.coast.obstacle==='house';this.hill.visible=s.coast.obstacle==='hill';
    this.air.visible=s.traces;
    const pos=this.particles.geometry.attributes.position,col=this.particles.geometry.attributes.color;
    for(let i=0;i<300;i++){const lane=i%4,u=phase+(i/4|0)/75,p=this.route(u,lane,s.coast.obstacle);pos.setXYZ(i,p.x,p.y,p.z);const warm=Math.cos(u*Math.PI*2)<0,c=new THREE.Color(night>.15?(warm?'#f1cf99':'#b4e7eb'):(warm?'#bd8c50':'#317e88'));col.setXYZ(i,c.r,c.g,c.b);}
    pos.needsUpdate=true;col.needsUpdate=true;
    this.arrows.forEach((a,i)=>{const u=phase+i/12,p=this.route(u,i%4,s.coast.obstacle),next=this.route(u+.002*Math.sign(h||1),i%4,s.coast.obstacle);a.position.copy(p);a.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),next.sub(p).normalize());a.visible=Math.abs(h)>.01;});
    if(this.lastObstacle!==s.coast.obstacle){this.pathLines.forEach((line,lane)=>{const p=line.geometry.attributes.position;for(let i=0;i<=120;i++){const v=this.route(i/120,lane,s.coast.obstacle);p.setXYZ(i,v.x,v.y,v.z);}p.needsUpdate=true;});this.lastObstacle=s.coast.obstacle;}
    const seeds=this.seeds.geometry.attributes.position;for(let i=0;i<24;i++){const u=((phase+i*.618)%1+1)%1;seeds.setXYZ(i,-26+u*165,height(18,82)+5+Math.sin(u*Math.PI)*Math.abs(h)*15,82+Math.sin(i*2.4)*8);}seeds.needsUpdate=true;this.seeds.visible=Math.abs(h)>.05;
    this.render();
  }
  setCamera(view:Camera){const positions={oblique:[235,170,255],top:[0,390,18],side:[5,83,335]};const from=this.camera.position.clone(),to=new THREE.Vector3(...positions[view]);this.cancelCamera();this.cancelCamera=animateValue({from:0,to:1,duration:650,onUpdate:p=>{this.camera.position.lerpVectors(from,to,p);this.controls.update();this.render();}});}
  private resize=()=>{if(this.disposed)return;const w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.zoom=Math.min(1,this.camera.aspect/1.25);this.camera.updateProjectionMatrix();this.render();};
  private render=()=>{if(!this.disposed)this.renderer.render(this.world,this.camera);};
  dispose(){this.disposed=true;this.cancelCamera();this.observer.disconnect();this.controls.dispose();const materials=new Set<THREE.Material>(),geometries=new Set<THREE.BufferGeometry>();this.world.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Points||o instanceof THREE.Line){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());this.renderer.dispose();this.renderer.forceContextLoss();}
}
