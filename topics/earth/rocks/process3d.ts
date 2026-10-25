import * as THREE from 'three';
import {createThreeStage} from '../threeStage';
import {rockMaterial} from './rockMaterial';
import {PARCEL_CELLS,parcelFrame} from './parcelFrame';
import {frameStates,type RockSession} from './model';

/** One local material window. Batches and progress come from the rock owner. */
export function mountRockProcess(host:HTMLElement,label:string,onUnavailable:()=>void){
  const stage=createThreeStage(host,{label,cameraPosition:innerWidth<650?[3.3,2.5,6.4]:[2.8,2.2,4.9],target:[0,-.5,0],minDistance:3.5,maxDistance:10,background:'#e5e3d9',onUnavailable});
  stage.renderer.toneMappingExposure=.88;stage.controls.maxPolarAngle=Math.PI*.51;
  stage.scene.fog=new THREE.Fog('#e5e3d9',12,26);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(24,24),new THREE.MeshStandardMaterial({color:'#a7a292',roughness:1}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-1.04;stage.group.add(ground);
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
  const ctx=shadowCanvas.getContext('2d')!,gradient=ctx.createRadialGradient(64,64,8,64,64,64);gradient.addColorStop(0,'rgba(40,43,35,.42)');gradient.addColorStop(.5,'rgba(40,43,35,.16)');gradient.addColorStop(1,'rgba(40,43,35,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(4.1,3.2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-1.035;stage.group.add(shadow);
  const granite=rockMaterial('granite'),sand=rockMaterial('sandstone');
  const chips=PARCEL_CELLS.map(cell=>{
    const shape=new THREE.Shape();cell.polygon.forEach((p,i)=>i?shape.lineTo(p.x,p.y):shape.moveTo(p.x,p.y));shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:.78,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.008,bevelThickness:.008,curveSegments:1});
    const pos=geometry.getAttribute('position');
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),round=Math.max(.2,1-(x*x*.25+y*y*.46));
      pos.setXYZ(i,x-cell.center.x,y-cell.center.y,z*round-.37+Math.sin(x*19+y*13)*.006);
    }
    geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,granite);mesh.userData.materialBatch=cell.id;stage.group.add(mesh);return mesh;
  });
  const meltMat=new THREE.MeshStandardMaterial({color:'#722a15',emissive:'#e84907',emissiveIntensity:.6,roughness:.38,metalness:0});
  const meltGeometry=new THREE.SphereGeometry(1,72,32),base=meltGeometry.getAttribute('position').array.slice();
  const pool=new THREE.Mesh(meltGeometry,meltMat);pool.position.y=-.78;pool.scale.set(1.44,.23,.95);stage.group.add(pool);
  const cement=new THREE.Mesh(new THREE.BoxGeometry(2.2,.33,.72,12,2,4),sand);cement.position.y=-.79;stage.group.add(cement);
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-3,-.98,-.4),new THREE.Vector3(-1,-.97,-.6),new THREE.Vector3(1,-.97,.35),new THREE.Vector3(3,-.97,.6)]);
  const water=new THREE.Mesh(new THREE.TubeGeometry(curve,64,.19,8,false),new THREE.MeshPhysicalMaterial({color:'#577f83',roughness:.25,transparent:true,opacity:.62,metalness:.08}));water.scale.y=.1;water.position.y=-.88;stage.group.add(water);
  const trails=Array.from({length:18},(_,i)=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(.017,6,4),new THREE.MeshBasicMaterial({color:'#dfebe2',transparent:true,opacity:.45}));mesh.scale.set(6,.28,1);stage.group.add(mesh);return mesh;});
  let disposed=false;
  function update(session:RockSession){
    if(disposed)return;const f=parcelFrame(session),state=frameStates(session),kinds={coarse:0,fine:7,loose:0,cemented:2,foliated:6,melt:0};
    granite.userData.from.value=kinds[state.from.texture];granite.userData.to.value=kinds[state.to.texture];granite.userData.blend.value=state.amount;
    chips.forEach((mesh,i)=>{
      const p=f.cells[i];mesh.position.set(p.x,p.y,p.z);
      // Released fracture pieces tumble onto their own faces instead of staying as upright slices.
      mesh.rotation.set(-f.loose*(.45+(i%5)*.19)+p.rotation*.35,f.loose*Math.sin(i*2.39996)*1.7,p.rotation*.6);
      mesh.scale.setScalar(Math.max(.001,p.scale));
      mesh.material=granite;mesh.visible=f.molten<.999;
      if(f.loose>0){
        const vertices=mesh.geometry.getAttribute('position'),q=new THREE.Vector3();let bottom=Infinity;
        for(let j=0;j<vertices.count;j++){q.fromBufferAttribute(vertices,j).multiplyScalar(Math.max(.001,p.scale)).applyQuaternion(mesh.quaternion);bottom=Math.min(bottom,q.y);}
        const settle=f.loose*f.loose;mesh.position.y=mesh.position.y*(1-settle)+(-1.025-bottom)*settle;
      }
      if(f.molten>0)mesh.position.y=mesh.position.y*(1-f.molten)-.7*f.molten;

    });
    pool.visible=f.molten>0;pool.scale.y=.23*Math.max(.02,f.molten);
    const clock=session.cursor+(session.process?session.progress/100:0);
    const p=meltGeometry.getAttribute('position');
    for(let i=0;i<p.count;i++){const x=base[i*3],y=base[i*3+1],z=base[i*3+2];p.setXYZ(i,x*(1+.03*Math.sin(z*8+clock*6.4)),y+.055*Math.sin(x*11+z*7-clock*8)*Math.max(0,y),z);}
    p.needsUpdate=true;meltGeometry.computeVertexNormals();
    cement.visible=f.cement>0;cement.scale.y=Math.max(.001,f.cement);
    water.visible=session.process==='transport';trails.forEach((mesh,i)=>{mesh.visible=water.visible;const t=(i/18+f.transport*.85)%1,q=curve.getPoint(t);mesh.position.set(q.x,q.y+.035,q.z+(i%3-1)*.08);});
    stage.canvas.dataset.materialId=f.materialId;stage.canvas.dataset.process=session.process??'rest';stage.canvas.dataset.progress=String(session.progress);stage.canvas.dataset.materialBatches=String(chips.length);stage.requestRender();
  }
  return {update,pause:()=>stage.setPaused(true),resume:()=>stage.setPaused(false),reset:()=>stage.resetCamera(),dispose(){if(disposed)return;disposed=true;stage.dispose();}};
}
