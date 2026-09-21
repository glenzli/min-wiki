import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RegionalAtmosphere } from './regionalAtmosphere.ts';
import { InteriorActivity } from './interiorActivity.ts';
import { SaturnRings } from './ringsScene.ts';
import { ringView } from './ringsModel.ts';
import { ActivityBody } from './activity.ts';
import { siteFor, siteNormal, type ObservationSite, descentState, worldFor, SATELLITES, moonPosition, type BodyId, type ExploreView } from './model.ts';
import { TerrainPatch } from '../../planet-surfaces/terrain3d.ts';
import { INTERIORS, type InteriorProfile } from '../../planet-surfaces/interior.ts';
import { smooth } from '../../planet-surfaces/model.ts';
import { palette } from '../../planet-surfaces/surfacePainter.ts';
import sunInterior from './sun-interior.json';
export const profileFor = (id:BodyId):InteriorProfile => id==='sun'?sunInterior:INTERIORS[worldFor(id)!.id];
/** A single renderer owns globe, local terrain, descent, cutaway and satellite views.
 * The persistent terrain patch is revealed through the approach, without recreating it per frame. */
export class ExplorerScene {
  private scene=new THREE.Scene();
  private camera=new THREE.PerspectiveCamera(43,1,.0008,120);
  private renderer:THREE.WebGLRenderer;
  private controls:OrbitControls;
  private observer:ResizeObserver;
  private activity?:ActivityBody;
  private rings?:SaturnRings;
  private terrain?:TerrainPatch;
  private interior?:InteriorActivity;
  private sectionShell?:THREE.Mesh<THREE.SphereGeometry,THREE.ShaderMaterial>;
  private cloudVolume?:RegionalAtmosphere;
  private site?:ObservationSite;
  private frame=new THREE.Quaternion();
  private fill=new THREE.DirectionalLight('#fff3dc',2.2);
  private pin=new THREE.Mesh(new THREE.RingGeometry(.030,.040,40),new THREE.MeshBasicMaterial({color:'#ffe5a1',side:THREE.DoubleSide,transparent:true,depthWrite:false}));
  private local(x:number,y:number,z:number){return new THREE.Vector3(x,y,z).applyQuaternion(this.frame);}

  private section=new THREE.Group();
  private satellites=new THREE.Group();
  private moonMeshes:THREE.Mesh[]=[];
  private stars:THREE.Points;
  private marker=new THREE.Mesh(new THREE.SphereGeometry(.023,16,12),new THREE.MeshBasicMaterial({color:'#fff4ae',depthTest:false}));
  private body?:BodyId;
  private view:ExploreView='globe';
  private progress=0;
  private time=0;
  private disposed=false;
  private lost=false;
  private framing=1;
  onFailure?:()=>void;
  onInteraction?:()=>void;
  constructor(private canvas:HTMLCanvasElement) {
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
    this.controls=new OrbitControls(this.camera,canvas);this.controls.enableDamping=true;this.controls.enablePan=false;
    this.controls.addEventListener('start',()=>this.onInteraction?.());
    this.scene.add(this.fill,new THREE.AmbientLight('#d9e5ec',.65));
    this.scene.add(new THREE.HemisphereLight('#f1f4ef','#3d332d',1.6));
    const sun=new THREE.DirectionalLight('#fff5db',2.6);sun.position.set(-3,6,5);this.scene.add(sun);
    const pts=new Float32Array(450*3);
    for(let i=0;i<450;i++){const z=Math.sin(i*137.5)*.99,a=i*2.39996,r=Math.sqrt(1-z*z);pts.set([r*Math.cos(a)*40,z*40,r*Math.sin(a)*40],i*3);}
    this.stars=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(pts,3)),new THREE.PointsMaterial({color:'#cedcd9',size:.035,transparent:true,opacity:.65}));
    this.scene.add(this.stars,this.section,this.satellites,this.pin);this.pin.renderOrder=10;this.marker.renderOrder=20;
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);
    canvas.addEventListener('webglcontextlost',this.contextLost);canvas.addEventListener('keydown',this.keyDown);this.resize();
  }
  private contextLost=(e:Event)=>{e.preventDefault();this.lost=true;this.onFailure?.();};
  private keyDown=(e:KeyboardEvent)=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key)||this.view==='descent')return;
    e.preventDefault();this.onInteraction?.();const up=new THREE.Quaternion().setFromUnitVectors(this.camera.up,new THREE.Vector3(0,1,0));const offset=this.camera.position.clone().sub(this.controls.target).applyQuaternion(up),s=new THREE.Spherical().setFromVector3(offset);
    s.theta+=e.key==='ArrowLeft'?-.12:e.key==='ArrowRight'?.12:0;s.phi=Math.max(.1,Math.min(Math.PI-.1,s.phi+(e.key==='ArrowUp'?-.1:e.key==='ArrowDown'?.1:0)));
    s.radius=Math.max(this.controls.minDistance,Math.min(this.controls.maxDistance,s.radius*(e.key==='+'?.9:e.key==='-'?1.1:1)));
    this.camera.position.copy(new THREE.Vector3().setFromSpherical(s).applyQuaternion(up.invert()).add(this.controls.target));this.controls.update();
  };
  private resize(){if(this.disposed)return;const w=Math.max(1,this.canvas.clientWidth),h=Math.max(1,this.canvas.clientHeight);this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.fitCamera();}
  private fitCamera(){
    const next=this.view==='rings'?Math.max(1,1.2/this.camera.aspect):this.view==='moons'?Math.max(1,1.45/this.camera.aspect):this.view==='globe'&&['saturn','uranus'].includes(this.body??'')?Math.max(1.8,1.8/this.camera.aspect):1;
    this.camera.position.sub(this.controls.target).multiplyScalar(next/this.framing).add(this.controls.target);this.framing=next;
  }
  private clearGroup(group:THREE.Group){group.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){o.geometry.dispose();(o.material as THREE.Material).dispose();}});group.clear();}
  private rebuild(id:BodyId,site:ObservationSite){
    this.site=site;
    if(this.rings){this.scene.remove(this.rings.group);this.rings.dispose();this.rings=undefined;}
    if(id==='saturn'){this.rings=new SaturnRings();this.scene.add(this.rings.group);}
    if(this.cloudVolume){this.scene.remove(this.cloudVolume.mesh);this.cloudVolume.dispose();this.cloudVolume=undefined;}
    if(this.activity){this.scene.remove(this.activity.group);this.activity.dispose();}
    if(this.terrain){this.scene.remove(this.terrain.group);this.terrain.dispose();this.terrain=undefined;}
    if(this.interior){this.section.remove(this.interior.group);this.interior.dispose();}
    this.section.remove(this.marker);this.clearGroup(this.section);this.clearGroup(this.satellites);this.moonMeshes=[];
    this.activity=new ActivityBody(id);this.scene.add(this.activity.group);
    if(['earth','jupiter','saturn','uranus','neptune'].includes(id)){this.cloudVolume=new RegionalAtmosphere(id,this.activity.cloudTexture);this.scene.add(this.cloudVolume.mesh);}
    const world=worldFor(id);
    if(world?.surface){this.terrain=new TerrainPatch(world,site.terrain);this.terrain.group.scale.setScalar(.003);this.scene.add(this.terrain.group);}
    const profile=profileFor(id);
    this.interior=new InteriorActivity(id,profile.layers);this.section.add(this.interior.group);
    for(const layer of profile.layers){
      const edge=new THREE.EllipseCurve(0,0,layer.outer,layer.outer,0,Math.PI*2,false,0).getPoints(180);
      const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(edge),layer.uncertain?new THREE.LineDashedMaterial({color:'#e9ddc4',dashSize:.025,gapSize:.022,transparent:true,opacity:.16}):new THREE.LineBasicMaterial({color:'#efdfc0',transparent:true,opacity:['jupiter','saturn','uranus','neptune'].includes(id)?.08:.16}));line.position.z=.002;line.computeLineDistances();this.section.add(line);
    }
    const geometry=new THREE.SphereGeometry(1,128,80,Math.PI,Math.PI),uv=geometry.getAttribute('uv');
    for(let i=0;i<uv.count;i++)uv.setX(i,.5+uv.getX(i)*.5);
    const shellMaterial=this.activity.globe.material.clone();shellMaterial.side=THREE.DoubleSide;
    // Texture uniforms are borrowed from ActivityBody; only this material is owned here.
    for(const key of ['uMap','uCloud'])shellMaterial.uniforms[key].value=this.activity.globe.material.uniforms[key].value;
    this.sectionShell=new THREE.Mesh(geometry,shellMaterial);this.section.add(this.sectionShell,this.marker);
    (SATELLITES[id]??[]).forEach((moon,i)=>{
      const radius=2.5+i*.65;const points=Array.from({length:161},(_,j)=>new THREE.Vector3(Math.cos(j/160*Math.PI*2)*radius,0,Math.sin(j/160*Math.PI*2)*radius));
      this.satellites.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#667c87',transparent:true,opacity:.45})));
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(.045+Math.sqrt(moon.radius/2632)*.08,24,16),new THREE.MeshStandardMaterial({color:moon.id==='titan'?'#d6ac65':moon.id==='io'?'#d9c06d':'#aeb8b8',roughness:.9}));
      mesh.userData.id=moon.id;this.satellites.add(mesh);this.moonMeshes.push(mesh);
    });
  }
  set(id:BodyId,view:ExploreView,progress:number,time=this.time,siteKey?:string){
    const site=siteFor(id,siteKey),siteChanged=this.site?.id!==site.id||this.body!==id;
    const changed=siteChanged||this.view!==view||(view==='rings'&&ringView(progress)!==ringView(this.progress));if(siteChanged)this.rebuild(id,site);this.body=id;this.view=view;this.progress=progress;
    const tilt=view==='moons'?0:id==='uranus'?1.70:id==='saturn'?.47:0;
    const obliquity=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),tilt);
    this.frame.copy(obliquity).multiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...siteNormal(site.latitude,site.longitude))));
    this.activity!.group.quaternion.copy(obliquity);
    this.fill.position.copy(this.local(-2,4,2));
    if(this.terrain){this.terrain.group.quaternion.copy(this.frame);this.terrain.group.position.copy(this.local(0,1.007,0));}
    if(this.cloudVolume){this.cloudVolume.mesh.quaternion.copy(this.frame);this.cloudVolume.mesh.position.copy(this.local(0,id==='earth'?1.045:1.01,0));}
    this.pin.position.copy(this.local(0,1.047,0));this.pin.quaternion.copy(this.frame).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2));
    if(changed){this.camera.up.set(0,1,0);this.framing=1;this.controls.minAzimuthAngle=view==='section'?-1.1:-Infinity;this.controls.maxAzimuthAngle=view==='section'?1.1:Infinity;this.controls.target.set(0,0,0);this.controls.minDistance=1.6;this.controls.maxDistance=9;this.controls.maxPolarAngle=Math.PI;
      this.camera.position.set(view==='section'?-.6:0,view==='section'?.25:1.1,view==='moons'?15:view==='section'?3.3:4.1);
      if(view==='moons'){this.camera.position.set(0,9,10);this.controls.maxDistance=24;}
      if(view==='rings'){this.camera.position.set(0,4.8,6);this.controls.maxDistance=14;
        if(ringView(progress)==='gap'){this.controls.target.set(1.96,0,0).applyQuaternion(obliquity);this.camera.position.set(1.96,1.8,1.1).applyQuaternion(obliquity);this.controls.minDistance=.8;}
        if(ringView(progress)==='particles'){this.camera.position.set(0,2.8,6);this.controls.minDistance=1;this.controls.maxDistance=12;}
      }
      if(view==='globe'){this.camera.position.copy(this.local(0,3.65,.65));this.camera.up.copy(this.local(0,0,-1));}
      if(view==='landscape'){this.camera.up.copy(this.local(0,1,0));this.camera.position.copy(this.local(.012,1.034,.025));this.controls.target.copy(this.local(0,1.009,-.035));this.controls.minDistance=.025;this.controls.maxDistance=.11;this.controls.maxPolarAngle=1.35;}

      this.fitCamera();this.controls.update();}
    this.draw(time);
  }
  draw(time:number){
    if(this.disposed||this.lost||!this.body||!this.activity)return;this.time=time;
    const descent=this.view==='descent',near=this.view==='landscape',p=near?1:descent?this.progress:0;
    const state=descentState(this.body,p),world=worldFor(this.body),solid=state.solid;
    this.controls.enabled=!descent;this.activity.group.visible=this.view!=='section'&&!(this.view==='rings'&&ringView(this.progress)==='particles');
    this.activity.setRingsVisible(this.view!=='rings');
    if(this.rings){this.rings.group.visible=this.view==='rings';if(this.rings.group.visible)this.rings.update(time,ringView(this.progress),this.activity.group.quaternion);}
    this.section.visible=this.view==='section';this.satellites.visible=this.view==='moons';
    this.pin.visible=this.view==='globe'||(descent&&p<.32);
    // The selected regional patch stays on the same body-fixed tangent frame at every height.
    const reveal=solid?smooth(.32,.65,p):0;
    if(this.terrain){this.terrain.group.visible=reveal>0;this.terrain.group.traverse(o=>{if(o instanceof THREE.Mesh){const m=o.material as THREE.MeshStandardMaterial;m.transparent=reveal<1||!!m.userData.liquid||!!m.userData.feather;m.opacity=reveal;m.needsUpdate=false;}});if(reveal>0)this.terrain.animate(time);}
    const opacity=1;
    this.activity.update(time,opacity,solid?opacity:1,p);
    this.stars.visible=p<.6||['mercury','moon'].includes(this.body);
    const haze=state.haze;const sky=world?palette[world.id].sky[1]: '#bd622b';
    this.scene.background=new THREE.Color('#050b14').lerp(new THREE.Color(sky),haze);
    this.scene.fog=p>.45?new THREE.Fog(new THREE.Color(sky),.05+(1-p)*2,.25+(1-p)*5):null;
    if(['mercury','moon'].includes(this.body))this.scene.fog=null;
    if(descent){
      const altitude=state.altitude+(solid?.013:0);
      this.camera.up.copy(this.local(0,1,0));
      this.camera.position.copy(this.local(0,1+altitude,altitude*.32));
      const horizon=smooth(.5,1,p);
      this.camera.lookAt(this.local(0,horizon*(solid?1.007:.988),-horizon*.055));
    }else this.controls.update();
    this.cloudVolume?.update(time,p,this.camera.position,this.activity.group.quaternion);
    if(this.view==='section'){
      if(this.sectionShell)this.sectionShell.material.uniforms.uTime.value=time;
      const r=1-this.progress;this.marker.position.set(-r*.65,r*.76,.04);
      const active=profileFor(this.body).layers.find(l=>this.progress<1-l.inner)??profileFor(this.body).layers.at(-1)!;
      this.interior?.update(time,active.id);
    }
    if(this.view==='moons')(SATELLITES[this.body]??[]).forEach((moon,i)=>this.moonMeshes[i].position.set(...moonPosition(moon,i,time*.16)));
    this.canvas.dataset.site=this.site?.id??'';this.canvas.dataset.body=this.body;this.canvas.dataset.view=this.view;this.canvas.dataset.progress=this.progress.toFixed(4);this.canvas.dataset.activityTime=time.toFixed(3);
    this.renderer.render(this.scene,this.camera);
  }
  labels(){const points=this.view==='rings'?this.rings?.labels()??[]:this.moonMeshes.map(mesh=>({id:mesh.userData.id as string,position:mesh.position}));return points.map(point=>{const p=point.position.clone().project(this.camera);return{id:point.id,x:(p.x+1)*.5,y:(1-p.y)*.5,visible:p.z>-1&&p.z<1&&Math.abs(p.x)<1&&Math.abs(p.y)<1};});}
  dispose(){if(this.disposed)return;this.disposed=true;this.observer.disconnect();this.controls.dispose();this.canvas.removeEventListener('webglcontextlost',this.contextLost);this.canvas.removeEventListener('keydown',this.keyDown);this.activity?.dispose();this.rings?.dispose();this.cloudVolume?.dispose();this.terrain?.dispose();if(this.interior){this.section.remove(this.interior.group);this.interior.dispose();}this.pin.geometry.dispose();this.pin.material.dispose();this.section.remove(this.marker);this.clearGroup(this.section);this.clearGroup(this.satellites);this.marker.geometry.dispose();this.marker.material.dispose();this.stars.geometry.dispose();(this.stars.material as THREE.Material).dispose();this.renderer.dispose();}
}
