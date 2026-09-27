import * as THREE from 'three';
import { anchorForScale, cameraFrameScale, AU_KM, LIGHT_YEAR_KM as LY, EARTH_RADIUS_KM, SUN_CENTER_DISTANCE_KM, scaleState, ruler, viewPoint, viewTilt, smooth, SUN_RADIUS_KM, type Origin } from './model.ts';
import { GalaxyVolume } from './galaxy.ts';
import { MacroScene } from './macroScene.ts';
import data from './content.json';
import earthMap from '../solar-system/assets/2k_earth_daymap.jpg';
import cloudMap from '../solar-system/assets/2k_earth_clouds.jpg';
import moonMap from '../solar-system/assets/2k_moon.jpg';

type Layers={disk:boolean;bulge:boolean;halo:boolean;dark:boolean};
import { ORBIT_RADII_AU as ORBITS } from './model.ts';
const RADII=[2439.7,6051.8,6371,3389.5,69911,58232,25362,24622];
const COLORS=['#a99e8b','#e4c6a2','#68b8e8','#c58160','#d3b38b','#dec391','#a0d9e1','#7295ed'];
const GALAXIES=[[-SUN_CENTER_DISTANCE_KM,0,50000*LY],[2.3e6*LY,Math.sqrt(2.5**2-2.3**2)*1e6*LY,100000*LY],[1.45e6*LY,-Math.sqrt(2.7**2-1.45**2)*1e6*LY,30000*LY]];
// Sample markers reveal that the group has many smaller members. Their placement is illustrative.
const DWARF_SAMPLES=[[-.64,.24],[-.47,-.36],[-.22,.52],[.31,-.42],[.43,.35],[.08,.72],[.91,-.66],[1.20,.83],[1.77,.25],[1.90,1.30],[2.13,.47],[2.58,.99],[2.80,.31],[2.47,-.10]] as const;
const random=(n:number)=>{const f=Math.sin(n*127.13+88.3)*43758.54;return f-Math.floor(f);};

/** Orthographic physical geometry plus a separately sized, readable annotation layer. */
export class CosmicScene {
  private renderer:THREE.WebGLRenderer;
  private world=new THREE.Scene();
  private camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,100);
  private wrapper=document.createElement('div');
  private overlay=document.createElement('canvas');
  private c:CanvasRenderingContext2D;
  private observer:ResizeObserver;
  private last?:[number,number,Layers,Origin];
  private disposed=false;
  private lost=false;
  private textures:THREE.Texture[]=[];
  private sphere=new THREE.SphereGeometry(1,64,40);
  private earth=new THREE.Group();
  private moon:THREE.Mesh;
  private sun:THREE.Mesh;
  private planets:THREE.Mesh[]=[];
  private orbits:THREE.LineLoop[]=[];
  private moonOrbit:THREE.LineLoop;
  private galaxies=[new GalaxyVolume(1),new GalaxyVolume(5),new GalaxyVolume(11)];
  private macro=new MacroScene();
  private dark:THREE.Mesh;
  private neighborhood:THREE.Points;
  private wideNeighborhood:THREE.Points;
  constructor(private canvas:HTMLCanvasElement,private text:(v:{zh:string;en:string})=>string,private failure:(failed:boolean)=>void=()=>{},private onFraming:(widthKm:number)=>void=()=>{},private formatDistance:(km:number)=>string=km=>String(km)){
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
    this.renderer.setClearColor('#030812');this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
    this.wrapper.className='cosmic-view';canvas.before(this.wrapper);this.wrapper.append(canvas,this.overlay);
    this.overlay.className='cosmic-labels';this.overlay.setAttribute('aria-hidden','true');
    this.c=this.overlay.getContext('2d')!;
    this.camera.position.z=20;
    const light=new THREE.DirectionalLight('#fff3df',2.5);light.position.set(-3,1.6,4);this.world.add(light,new THREE.AmbientLight('#7997b4',.45));
    const load=(url:string)=>{
      const texture=new THREE.TextureLoader().load(url,loaded=>{if(this.disposed)loaded.dispose();else if(this.last)this.draw(...this.last);},undefined,()=>{if(!this.disposed)this.failure(true);});
      texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());this.textures.push(texture);return texture;
    };
    const globe=new THREE.Mesh(this.sphere,new THREE.MeshStandardMaterial({map:load(earthMap),roughness:.95}));
    globe.rotation.set(0,.5,.16);this.earth.add(globe);
    const clouds=load(cloudMap),cloud=new THREE.Mesh(this.sphere,new THREE.MeshStandardMaterial({map:clouds,alphaMap:clouds,transparent:true,opacity:.8,depthWrite:false}));
    cloud.scale.setScalar(1.008);cloud.rotation.copy(globe.rotation);this.earth.add(cloud);
    const atmosphere=new THREE.Mesh(this.sphere,new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,
      vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalMatrix*normal;v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
      fragmentShader:'varying vec3 n;varying vec3 v;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(v))),3.);gl_FragColor=vec4(.12,.45,1.,rim*.5);}'}));
    atmosphere.scale.setScalar(1.025);this.earth.add(atmosphere);this.world.add(this.earth);
    this.moon=new THREE.Mesh(this.sphere,new THREE.MeshStandardMaterial({map:load(moonMap),roughness:1}));this.world.add(this.moon);
    this.sun=new THREE.Mesh(this.sphere,new THREE.ShaderMaterial({
      vertexShader:'varying vec3 p;varying vec3 n;void main(){p=position;n=normalMatrix*normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'varying vec3 p;varying vec3 n;void main(){vec3 q=floor(p*220.);float g=fract(sin(dot(q,vec3(12.9898,78.233,37.719)))*43758.5453);float limb=.65+.35*abs(normalize(n).z);gl_FragColor=vec4(vec3(1.,.65,.25)*(.85+.15*g)*limb,1.);}'}));this.world.add(this.sun);
    ORBITS.forEach((_,i)=>{const planet=new THREE.Mesh(this.sphere,new THREE.MeshStandardMaterial({color:COLORS[i],roughness:1}));this.planets.push(planet);this.world.add(planet);this.orbits.push(this.makeOrbit('#668caa'));});
    this.moonOrbit=this.makeOrbit('#91b9bf');
    this.galaxies.forEach(g=>this.world.add(g.root));
    this.dark=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),new THREE.MeshBasicMaterial({color:'#80b6cf',wireframe:true,transparent:true,opacity:.045,depthWrite:false}));this.world.add(this.dark);
    // Two bounded sampling levels keep the local field populated without showing
    // a Sun-centered sphere as the camera backs into the wider galactic disk.
    const makeField=(positions:number[],colors:number[])=>{
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
      const points=new THREE.Points(geometry,new THREE.PointsMaterial({size:1.5,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:.65,depthWrite:false,blending:THREE.AdditiveBlending}));
      this.world.add(points);return points;
    };
    const nearbyPositions:number[]=[],nearbyColors:number[]=[];
    for(let i=0;i<6000;i++){
      const r=Math.cbrt(random(i*5))*1.5,a=random(i*5+1)*Math.PI*2,h=random(i*5+2)*2-1,q=Math.sqrt(1-h*h);
      nearbyPositions.push(r*q*Math.cos(a),-r*q*Math.sin(a),r*h*.35);
      const b=(.45+.5*random(i*5+3))*(1-smooth((r-1)/.5));nearbyColors.push(b*.8,b*.9,b);
    }
    this.neighborhood=makeField(nearbyPositions,nearbyColors);
    const widePositions:number[]=[],wideColors:number[]=[];
    for(let i=0;i<40000;i++){
      const r=Math.sqrt(random(i*5+92000))*12,a=random(i*5+92001)*Math.PI*2,h=random(i*5+92002)*2-1;
      widePositions.push(r*Math.cos(a),-r*Math.sin(a),h*(.12+.02*r));
      const b=.38+.54*random(i*5+92003);wideColors.push(b*.8,b*.9,b);
    }
    this.wideNeighborhood=makeField(widePositions,wideColors);
    this.observer=new ResizeObserver(()=>{if(this.last&&!document.hidden)this.draw(...this.last);});this.observer.observe(this.wrapper);
    canvas.addEventListener('webglcontextlost',this.contextLost);canvas.addEventListener('webglcontextrestored',this.contextRestored);
  }
  private contextLost=(event:Event)=>{event.preventDefault();this.lost=true;this.failure(true);};
  private contextRestored=()=>{this.lost=false;this.failure(false);if(this.last)this.draw(...this.last);};
  private makeOrbit(color:string){
    const points=Array.from({length:256},(_,i)=>new THREE.Vector3(Math.cos(i/256*Math.PI*2),-Math.sin(i/256*Math.PI*2),0));
    const geometry=new THREE.BufferGeometry().setFromPoints(points),colors=points.flatMap(p=>{const c=new THREE.Color(color).multiplyScalar(.45+.55*(p.y+1)/2);return [c.r,c.g,c.b];});
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const line=new THREE.LineLoop(geometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.55,depthWrite:false}));this.world.add(line);return line;
  }
  draw(progress:number,tilt:number,layers:Layers,origin:Origin="earth"){
    this.last=[progress,tilt,{...layers},origin];if(this.disposed||this.lost)return;
    const width=this.wrapper.clientWidth;if(!width)return;
    const height=this.wrapper.clientHeight||300,dpr=Math.min(2,devicePixelRatio||1);
    if(this.canvas.width!==Math.floor(width*dpr)||this.canvas.height!==Math.floor(height*dpr)){
      this.renderer.setPixelRatio(dpr);this.renderer.setSize(width,height,false);this.overlay.width=Math.floor(width*dpr);this.overlay.height=Math.floor(height*dpr);
    }
    this.camera.top=height/width;this.camera.bottom=-height/width;this.camera.updateProjectionMatrix();
    const c=this.c;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,width,height);
    const framing=cameraFrameScale(progress,width,height),half=scaleState(progress).halfWidth*framing,angle=viewTilt(progress,tilt)*Math.PI/2;
    this.onFraming(half*2);
    const point=(x:number,y=0,z=0):[number,number,number]=>{const p=viewPoint(x,y,z,progress,tilt,origin);return [p[0]/framing,p[1]/framing,p[2]/framing];};
    const screen=(x:number,y=0,z=0):[number,number]=>{const p=point(x,y,z);return [width/2*(1+p[0]),height/2-width/2*p[1]];};
    const body=(object:THREE.Object3D,x:number,y:number,radius:number)=>{
      const p=point(x,y),r=radius/half;object.visible=r*width/2>.35&&Math.abs(p[0])<1+r&&Math.abs(p[1])<height/width+r;
      object.position.set(...p);object.scale.setScalar(r);
    };
    body(this.earth,0,0,EARTH_RADIUS_KM);body(this.sun,-AU_KM,0,SUN_RADIUS_KM);body(this.moon,384400*.8,384400*.6,1737.4);
    const orbit=(object:THREE.LineLoop,center:number,radius:number)=>{
      const r=radius/half;object.visible=r>.008&&r<20;object.position.set(...point(center));object.scale.setScalar(r);object.rotation.x=angle;
      (object.material as THREE.LineBasicMaterial).opacity=.55*smooth((r-.008)/.025)*(1-smooth((r-8)/12));
    };
    orbit(this.moonOrbit,0,384400);
    ORBITS.forEach((a,i)=>{orbit(this.orbits[i]!,-AU_KM,a*AU_KM);body(this.planets[i]!,-AU_KM+Math.cos(i*.9)*a*AU_KM,Math.sin(i*.9)*a*AU_KM,RADII[i]!);if(i===2)this.planets[i]!.visible=false;});
    const fade=smooth((Math.log10(half/LY)-2.3)/1.4);
    const logHalfLy=Math.log10(half/LY);
    const localFade=smooth((logHalfLy-1.1)/.8)*(1-smooth((logHalfLy-2.78)/.5));
    const wideFade=smooth((logHalfLy-2.7)/.6)*(1-smooth((logHalfLy-3.7)/.5));
    const localField=(field:THREE.Points,opacity:number,size:number)=>{
      field.visible=opacity>.001&&layers.disk;field.position.set(...point(0));field.scale.setScalar(1000*LY/half);field.rotation.x=angle;
      const material=field.material as THREE.PointsMaterial;material.opacity=opacity*.7;material.size=size;
    };
    localField(this.neighborhood,localFade,1.5-.3*smooth((logHalfLy-2.5)/.8));
    localField(this.wideNeighborhood,wideFade,1.2-.2*smooth((logHalfLy-3)/1));
    this.galaxies.forEach((g,i)=>{
      const [x,y,radius]=GALAXIES[i]!,r=radius!/half;g.root.visible=fade>0&&r*width/2>.5;
      g.root.position.set(...point(x!,y!));g.root.scale.setScalar(r);
      g.root.rotation.set(i===0?angle:(.47+i*.12)*Math.PI/2,0,i===0?0:i*.7);
      if(g.root.visible)g.update(r*width/2,dpr,fade,i===0?layers:{disk:true,bulge:true,halo:false});
    });
    this.dark.visible=layers.dark&&scaleState(progress).galaxy;this.dark.position.copy(this.galaxies[0]!.root.position);this.dark.scale.setScalar(200000*LY/half);
    this.renderer.render(this.world,this.camera);
    // Constant-screen-size locators are intentionally separate from physical bodies.
    const labels:{value:string;x:number;y:number}[]=[];
    const label=(value:string,x:number,y:number)=>{if(x>=-20&&x<=width+20&&y>=-20&&y<=height+20)labels.push({value,x,y});};
    const marker=(x:number,y:number,cross=false,color='#bddfdb')=>{
      if(x<5||x>width-5||y<5||y>height-50)return;c.strokeStyle=color;c.lineWidth=1;c.beginPath();
      if(cross){c.moveTo(x-6,y);c.lineTo(x+6,y);c.moveTo(x,y-6);c.lineTo(x,y+6);}else c.arc(x,y,3,0,Math.PI*2);c.stroke();
    };
    const macroCenter=scaleState(progress,origin).centerX;
    this.macro.draw(c,width,height,half/LY,scaleState(progress).halfWidth/LY,(x,y)=>[width/2+(x*1e6*LY-macroCenter)/half*width/2,height/2-y*1e6*LY/half*width/2],label,this.text);
    const ep=screen(0),sp=screen(-AU_KM),anchor=origin==='earth'?ep:sp;
    const bodyPixels=(origin==='earth'?EARTH_RADIUS_KM:SUN_RADIUS_KM)/half*width/2;
    if(bodyPixels<5){
      const regionBlend=smooth((Math.log10(half/LY)-10.1)/.6);
      if(regionBlend<1){c.save();c.globalAlpha=1-regionBlend;marker(...anchor,true);c.restore();}
      if(regionBlend>.01&&anchor[0]>8&&anchor[0]<width-8&&anchor[1]>8&&anchor[1]<height-50){
        c.save();c.globalAlpha=regionBlend;c.strokeStyle='#ffe29aaa';c.lineWidth=1.5;c.beginPath();c.arc(...anchor,8,0,Math.PI*2);c.stroke();c.fillStyle='#ffe29a';c.beginPath();c.arc(...anchor,2.3,0,Math.PI*2);c.fill();c.restore();
      }
    }
    label(this.text(data.ui[anchorForScale(progress,origin)]),anchor[0],anchor[1]+Math.max(bodyPixels+20,23));
    const other=origin==='earth'?sp:ep;
    if(half<AU_KM*400&&Math.hypot(anchor[0]-other[0],anchor[1]-other[1])>35){
      const otherPixels=(origin==='earth'?SUN_RADIUS_KM:EARTH_RADIUS_KM)/half*width/2;
      if(otherPixels<4)marker(...other,false,origin==='earth'?'#ffcf80':'#bddfdb');
      label(this.text(origin==='earth'?data.ui.sun:data.ui.earth),other[0],other[1]+Math.max(20,otherPixels+16));
    }
    const moonPixels=384400/half*width/2;if(moonPixels>35&&moonPixels<width){const p=screen(384400*.8,384400*.6);if(1737.4/half*width/2<3)marker(...p);label(this.text(data.ui.moon),p[0],p[1]+18);}
    if(half>AU_KM*.15&&half<AU_KM*350)ORBITS.forEach((a,i)=>{if(i===2)return;const p=screen(-AU_KM+Math.cos(i*.9)*a*AU_KM,Math.sin(i*.9)*a*AU_KM);if(RADII[i]!/half*width/2<3)marker(...p);if(a*AU_KM/half*width/2>35)label(this.text(data.planets[i]!),p[0],p[1]+19);});
    if(half>LY*.5&&half<300*LY)for(const [x,y,key]of [[3.8,Math.sqrt(4.25**2-3.8**2),'proxima'],[-7,-Math.sqrt(8.6**2-7**2),'sirius']] as const){const p=screen(x*LY,y*LY);marker(...p);label(this.text(data.ui[key]),p[0],p[1]+22);}
    if(half>30000*LY&&half<12e6*LY){const p=screen(-SUN_CENTER_DISTANCE_KM);label(this.text(data.ui.milky),p[0],p[1]-Math.min(height*.3,50000*LY/half*width/2)-18);}
    if(half>200000*LY&&half<12e6*LY)for(const i of [1,2]){const [x,y,r]=GALAXIES[i]!,p=screen(x!,y!);label(this.text(i===1?data.ui.andromeda:data.ui.triangulum),p[0],p[1]+Math.max(24,r!/half*width/2));}
    if(half>1.1e6*LY&&half<12e6*LY){
      c.save();c.globalAlpha=smooth((half/LY-1.1e6)/.9e6);
      for(const [x,y] of DWARF_SAMPLES){const [px,py]=screen(x*1e6*LY,y*1e6*LY);if(px<8||px>width-8||py<10||py>height-65)continue;
        const glow=c.createRadialGradient(px,py,0,px,py,6);glow.addColorStop(0,'#d4e8e999');glow.addColorStop(1,'#91c1d000');c.fillStyle=glow;c.beginPath();c.arc(px,py,6,0,Math.PI*2);c.fill();
        c.strokeStyle='#e2eac7b3';c.lineWidth=1;c.beginPath();c.arc(px,py,2.5,0,Math.PI*2);c.stroke();
      }
      c.restore();
      const [lx,ly]=screen(-.47e6*LY,-.36e6*LY);label(this.text(data.ui.dwarfSamples),lx-18,ly+28);
    }
    c.font='12px system-ui';c.textAlign='center';
    const boxes:{x:number;y:number;w:number}[]=[];
    for(const l of labels){
      const w=c.measureText(l.value).width+12,x=Math.max(w/2+8,Math.min(width-w/2-8,l.x));let y=Math.max(20,Math.min(height-65,l.y));
      for(let attempt=0;attempt<5&&boxes.some(b=>Math.abs(b.x-x)<(b.w+w)/2+3&&Math.abs(b.y-y)<20);attempt++)y-=22;
      if(y<16)continue;boxes.push({x,y,w});c.fillStyle='#030812bb';c.fillRect(x-w/2,y-13,w,19);c.fillStyle='#d1e0e8';c.fillText(l.value,x,y);
    }
    const length=ruler(half*.4),pixels=length/half*width/2;
    c.strokeStyle='#afcdc6';c.lineWidth=1.5;c.beginPath();c.moveTo(24,height-24);c.lineTo(24+pixels,height-24);c.moveTo(24,height-29);c.lineTo(24,height-19);c.moveTo(24+pixels,height-29);c.lineTo(24+pixels,height-19);c.stroke();
    c.fillStyle='#dce8e3';c.textAlign='left';c.fillText(this.formatDistance(length),24,height-37);
    if(width>600){c.textAlign='right';c.fillStyle='#859aa8';c.fillText(this.text(data.ui.marker),width-24,height-23);}
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;this.observer.disconnect();this.canvas.removeEventListener('webglcontextlost',this.contextLost);this.canvas.removeEventListener('webglcontextrestored',this.contextRestored);
    this.galaxies.forEach(g=>g.dispose());
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
    this.world.traverse(object=>{const mesh=object as THREE.Mesh;if(mesh.geometry)geometries.add(mesh.geometry);if(mesh.material)for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])materials.add(m);});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.textures.forEach(t=>t.dispose());
    this.renderer.dispose();this.renderer.forceContextLoss();this.last=undefined;this.overlay.remove();
  }
}
