import * as THREE from 'three';
import { TankScene, createClayHullGeometry } from '../tankScene.ts';
import { BuoyancyScene, experimentGeometry } from '../scene.ts';
import { buoyancy } from '../model.ts';
import { orientLab, frameLab } from '../framing.ts';
import { createBasinWater, createMeniscusGeometry } from '../labGeometry.ts';

// The production draw method owns all hull vertices, cargo poses, camera
// orientation and annotation fitting. Only DOM, materials and renderer are inert.
export function tankFixture(width=1238,height=476){
 const tank=Object.create(TankScene.prototype);
 const mesh=()=>new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial());
 const line=()=>new THREE.LineLoop(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(128*3),3)),new THREE.LineBasicMaterial());
 Object.assign(tank,{disposed:false,lost:false,visible:true,held:false,opening:0,viewport:{width,height},camera:new THREE.OrthographicCamera(-4.7,4.7,3,-3,.1,70),profile:new THREE.CatmullRomCurve3([],false,'centripetal'),waterLevel:{value:0},waterMotion:{value:0},navigation:{manual:false,sync(){}},renderer:{render(){}},world:new THREE.Scene(),view:'tank',holeKey:'',support:new THREE.Group()});
 for(const name of ['wood','stone','immersion','steel','clay','waterSides','cupWater','cupSurface','cupMeniscus','cord','eye'])tank[name]=mesh();
 tank.waterSides.geometry=createBasinWater();tank.waterEdge=new THREE.LineLoop(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(129*3),3)),new THREE.LineBasicMaterial());
 tank.waterTop=new THREE.Mesh(new THREE.ShapeGeometry(),new THREE.MeshBasicMaterial());tank.contact=line();tank.ripple=line();
 tank.contactSurface=new THREE.Mesh(createMeniscusGeometry(),new THREE.MeshBasicMaterial());tank.wallMeniscus=new THREE.Mesh(createMeniscusGeometry(true),new THREE.MeshBasicMaterial());
 tank.hull=new THREE.Mesh(createClayHullGeometry(),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
 tank.cargo=Array.from({length:12},()=>{const m=mesh();m.scale.set(.29,.23,.25);return m;});
 orientLab(tank.camera);frameLab(tank.camera,width,height,false,false);
 return tank;
}
export const boatState=(capacity=1800,cargo=4)=>({experiment:'boat',object:'wood',boat:true,cargo,salt:false,depth:50,boatCapacity:capacity});
export function drawBoat(tank,state,form=1){
 const result=buoyancy(state),geometry=experimentGeometry(state,result);
 tank.draw({state,geometry,form,flooded:result.flooded,displaced:result.displaced,ripple:0});
 tank.hull.updateMatrixWorld();return {result,geometry};
}
export function visibleCargoSamples(tank,count){
 return tank.cargo.slice(0,count).map(cargo=>{
  let visible=0;
  for(const x of [-.145,0,.145])for(const z of [-.125,0,.125]){
   if(cargoTopPointVisible(tank,cargo,x,z))visible++;
  }
  return visible;
 });
}
export function cargoTopPointVisible(tank,cargo,x=0,z=0){
 const towardCamera=tank.camera.getWorldDirection(new THREE.Vector3()).negate(),point=cargo.position.clone().add(new THREE.Vector3(x,.115,z));
 const ray=new THREE.Raycaster(point.clone().addScaledVector(towardCamera,50),towardCamera.clone().negate(),0,50-.0001);
 return ray.intersectObject(tank.hull,false).length===0;
}
export function morphFixture(form){
 const scene=Object.create(BuoyancyScene.prototype),state=boatState(),result=buoyancy(state),forms=[];
 Object.assign(scene,{state,result,current:experimentGeometry(state,result),form,observation:'tank',academic:false,settled:false,svg:{parentElement:{dataset:{}},dataset:{}},tank:{available:true,setView(){scene.redraw();},draw(frame){forms.push(frame.form);}},drawSpatial(){}});
 return {scene,state,result,forms};
}
