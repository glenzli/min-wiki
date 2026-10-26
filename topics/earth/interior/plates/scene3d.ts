import * as THREE from 'three';
import { createThreeStage } from '../../threeStage';
import { parsePlateCamera, type InteriorState } from '../model';
import { createPlateGeometry, frameForPlates, platePoint, type PlateFrame, type PlateSide, type PlateLayer } from './geometry';
import { plateMaterial } from './material';

type Copy = { label:string; left:string; right:string; onCamera(vector:[number,number,number]):void; onUnavailable():void };
export type PlateScene = { update(state:InteriorState):void; pause(value:boolean):void; resetCamera():void; dispose():void };
export function mountPlateScene(host:HTMLElement,initial:InteriorState,copy:Copy):PlateScene {
  const narrow=innerWidth<700||matchMedia('(pointer: coarse)').matches;
  const home:[number,number,number]=narrow?[8.8,6.8,14.4]:[6.3,4.6,10.5];
  const stage=createThreeStage(host,{label:copy.label,cameraPosition:parsePlateCamera(initial.interiorPlateCamera)??home,target:[0,-1.05,0],minDistance:7,maxDistance:28,background:'#d3dce0',onUnavailable:copy.onUnavailable});
  stage.renderer.toneMappingExposure=.87;stage.controls.minPolarAngle=.28;stage.controls.maxPolarAngle=Math.PI*.53;
  stage.scene.fog=new THREE.Fog('#d3dce0',30,70);
  let disposed=false,current=initial,lastKey='';
  const bank=new Map<string,THREE.MeshStandardMaterial>();
  function rock(kind:Parameters<typeof plateMaterial>[0],surface=false){const key=kind+surface;let value=bank.get(key);if(!value){value=plateMaterial(kind,surface);bank.set(key,value);}return value;}
  const bodies=([-1,1,0] as PlateSide[]).flatMap(side=>(['crust','mantle'] as PlateLayer[]).map(layer=>{
    const shape=createPlateGeometry(side,layer,narrow?30:48,narrow?16:28),mesh=new THREE.Mesh(shape.geometry,[rock('ocean',true),rock('ocean')]);
    mesh.name='plate-'+side+'-'+layer;stage.group.add(mesh);return{side,layer,shape,mesh};
  }));
  const base=createPlateGeometry(0,'base',40,16),baseMesh=new THREE.Mesh(base.geometry,[rock('deep'),rock('deep')]);baseMesh.name='mostly-solid-mantle';stage.group.add(baseMesh);
  const bedLines=([-1,1] as PlateSide[]).flatMap(side=>[.26,.5,.74].map(w=>{
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(61*3),3));
    const mesh=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:'#bdb49b',transparent:true,opacity:.33}));stage.group.add(mesh);return{side,w,mesh};
  }));
  const meltMaterial=new THREE.MeshStandardMaterial({color:'#be481c',emissive:'#e47924',emissiveIntensity:.38,roughness:.66});
  const pool=new THREE.Mesh(new THREE.SphereGeometry(1,44,24),meltMaterial);pool.name='local-partial-melt';stage.group.add(pool);
  const dyke=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,12,18),meltMaterial);stage.group.add(dyke);
  const fluidGeometry=new THREE.BufferGeometry();fluidGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(20*3),3));
  const fluids=new THREE.Points(fluidGeometry,new THREE.PointsMaterial({color:'#9bc5cb',size:.045,transparent:true,opacity:.8}));stage.group.add(fluids);
  const waterMaterial=new THREE.MeshPhysicalMaterial({color:'#54838c',transparent:true,opacity:.16,depthWrite:false,roughness:.25,metalness:.05,side:THREE.DoubleSide});
  const water=new THREE.Mesh(new THREE.PlaneGeometry(1,1,30,16),waterMaterial);water.rotation.x=-Math.PI/2;water.renderOrder=3;stage.group.add(water);
  const riverLines=([-1,1] as PlateSide[]).map(side=>{
    const mesh=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial({color:'#477d89',roughness:.39,metalness:.05,side:THREE.DoubleSide}));
    mesh.geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(61*2*3),3));
    const indices:number[]=[];for(let i=0;i<60;i++){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}mesh.geometry.setIndex(indices);stage.group.add(mesh);return{side,mesh};
  });
  const arrows=[-1,1].map(side=>{const arrow=new THREE.ArrowHelper(new THREE.Vector3(side,0,0),new THREE.Vector3(),.9,0x795c2e,.21,.12);stage.group.add(arrow);return arrow;});
  const labels=document.createElement('div');labels.className='interior-plate-labels';host.append(labels);
  const tags=[copy.left,copy.right].map(text=>{const el=document.createElement('span');el.textContent=text;labels.append(el);return el;});
  const anchors=[new THREE.Vector3(),new THREE.Vector3()];
  function project(){
    if(disposed)return;stage.camera.updateMatrixWorld();const box=host.getBoundingClientRect();
    tags.forEach((tag,i)=>{const p=anchors[i].clone().project(stage.camera);tag.hidden=p.z>1||Math.abs(p.x)>.94||Math.abs(p.y)>.94;tag.style.left=((p.x*.5+.5)*box.width)+'px';tag.style.top=((-p.y*.5+.5)*box.height)+'px';});
  }
  const resize=new ResizeObserver(project);resize.observe(host);stage.controls.addEventListener('change',project);
  function updateGeometry(f:PlateFrame){
    for(const body of bodies){
      body.mesh.visible=body.side!==0||f.boundary==='divergent'&&f.p>0;
      if(!body.mesh.visible)continue;
      body.shape.update(f);
      const kind=body.layer==='mantle'?'mantle':body.side===0?'new':f.boundary==='divergent'||f.boundary==='subduction'&&body.side===-1?'ocean':'continent';
      body.mesh.material=[rock(kind,true),rock(kind)];
    }
    base.update(f);
    for(const bed of bedLines){bed.mesh.visible=f.boundary==='collision'||f.boundary==='subduction'&&bed.side===1;
      if(!bed.mesh.visible)continue;const a=bed.mesh.geometry.getAttribute('position');
      for(let i=0;i<=60;i++){const point=platePoint(f,bed.side,'crust',i/60,1,bed.w);point[2]+=.006;a.setXYZ(i,...point);}a.needsUpdate=true;bed.mesh.geometry.computeBoundingSphere();
    }
    const hot=f.boundary==='divergent'?f.p:f.boundary==='subduction'?Math.max(0,(f.p-.55)/.45):0;
    pool.visible=dyke.visible=hot>0;fluids.visible=f.boundary==='subduction'&&f.p>.55;
    pool.position.set(f.boundary==='divergent'?0:1.6,f.boundary==='divergent'?-1.66:-1.32,1.83);pool.scale.set(.45*hot,.19*hot,.065);
    if(f.boundary==='divergent'){
      const end=platePoint(f,0,'crust',.5,1,.35)[1],height=end+1.66;
      dyke.position.set(0,-1.66+height/2,1.825);dyke.scale.set(.045*Math.sqrt(hot),height,.045*Math.sqrt(hot));
    }else{dyke.position.set(2.05,-.36,1.825);dyke.scale.set(.03*Math.sqrt(hot),1.54,.03*Math.sqrt(hot));dyke.rotation.z=-.43;}
    if(f.boundary==='divergent')dyke.rotation.z=0;
    const fa=fluidGeometry.getAttribute('position');for(let i=0;i<20;i++){const t=i/19,point=platePoint(f,-1,'crust',.8,1,0);fa.setXYZ(i,point[0]+t*.45+Math.sin(i*2.4)*.09,point[1]+t*.8,1.84);}fa.needsUpdate=true;fluidGeometry.computeBoundingSphere();
    water.visible=f.boundary==='subduction';
    water.position.set(f.boundary==='divergent'?0:-2.8,f.boundary==='divergent'?1.05:.59,0);water.scale.set(f.boundary==='divergent'?11.5:4.8,3.6,1);
    for(const river of riverLines){
      river.mesh.visible=f.boundary==='transform';if(!river.mesh.visible)continue;const a=river.mesh.geometry.getAttribute('position');
      for(let i=0;i<=60;i++){const u=i/60,x=river.side<0?-5+5*u:5*u,z=Math.sin(x*.7)*.4;
        for(let j=0;j<2;j++){const point=platePoint(f,river.side,'crust',u,(z+(j-.5)*.052+1.8)/3.6,0);point[1]+=.012;a.setXYZ(i*2+j,...point);}}
      a.needsUpdate=true;river.mesh.geometry.computeVertexNormals();river.mesh.geometry.computeBoundingSphere();
    }
    arrows.forEach((arrow,i)=>{const side=i===0?-1:1;arrow.visible=current.interiorMotion==='moving';const origin=platePoint(f,side,'crust',side<0?.35:.65,.85,0);arrow.position.set(origin[0],origin[1]+.28,origin[2]);arrow.setDirection(new THREE.Vector3(f.boundary==='transform'?0:f.boundary==='divergent'?side:-side,0,f.boundary==='transform'?side:0));});
    [-1,1].forEach((side,i)=>anchors[i].set(...platePoint(f,side as PlateSide,'crust',side<0?.35:.68,1,.58)));
    project();
  }
  function update(state:InteriorState){
    if(disposed)return;current=state;const f=frameForPlates(state),key=f.boundary+':'+f.p+':'+state.interiorMotion;
    if(key!==lastKey){updateGeometry(f);lastKey=key;}
    stage.canvas.dataset.plateBoundary=f.boundary;stage.canvas.dataset.plateProgress=String(state.interiorProgress);stage.canvas.dataset.plateEffective=String(f.p);stage.requestRender();
  }
  function saveCamera(){if(!disposed)copy.onCamera(stage.camera.position.toArray().map(n=>Math.round(n*10000)/10000) as [number,number,number]);}
  stage.controls.addEventListener('end',saveCamera);stage.canvas.addEventListener('keyup',saveCamera);
  update(initial);
  return{update,pause:value=>stage.setPaused(value),resetCamera(){stage.camera.position.set(...home);stage.controls.target.set(0,-1.05,0);stage.controls.update();saveCamera();stage.requestRender();},dispose(){if(disposed)return;disposed=true;resize.disconnect();stage.controls.removeEventListener('change',project);stage.controls.removeEventListener('end',saveCamera);stage.canvas.removeEventListener('keyup',saveCamera);stage.dispose();bank.forEach(material=>material.dispose());labels.remove();}};
}
