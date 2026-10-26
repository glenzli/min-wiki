import * as THREE from 'three';
import { createThreeStage } from '../../threeStage';
import { beddingPoint, createBlockGeometry, createContinentGeometry, grainGeometry, materialCells, type MutableGeometry } from './geometry';
import { eventDrop, faultX, fieldNoise, lerp, riftFrame, riftLongitude, type RiftScale, type RiftState } from './model';

type SceneCopy = { label: string; labels: { site: string; fault: string; parcel: string; intrusion: string }; onUnavailable(): void; onCamera(scale: RiftScale, vector: [number,number,number]): void };
export type RiftScene = { update(state: RiftState): void; pause(value: boolean): void; resetCamera(): void; dispose(): void };
const cameras: Record<RiftScale,[number,number,number]> = { global:[.6,1.2,7.5],region:[5.4,4.2,7.4],material:[2.5,1.8,5.8] };
const noise = (x:number,y:number) => {const value=Math.sin(x*127.1+y*311.7)*43758.5453123;return(value-Math.floor(value))*2-1;};

/** Stable authored color/bump maps. No downloaded landscape, scan or museum asset. */
function texture(kind: 'land'|'cut'|'mantle'|'ocean'|'grain', size: number) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d')!;
  const image=ctx.createImageData(size,size), colors={land:[118,123,92],cut:[135,112,86],mantle:[89,95,84],ocean:[25,70,88],grain:[205,209,196]}[kind];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size,v=y/size;
    const strata=kind==='cut'?fieldNoise(u*2,(v+fieldNoise(u*3,8)*.013)*79)*14+fieldNoise(u*3,v*23)*6:0;
    const broad=fieldNoise(u*7,v*7)*.7+fieldNoise(u*18+19,v*18)*.3;
    const grit=noise(x,y)*8+fieldNoise(u*46,v*46)*6;
    const change=(kind==='ocean'?broad*3:broad*9+grit)+strata;
    const i=(y*size+x)*4;for(let c=0;c<3;c++)image.data[i+c]=Math.max(0,Math.min(255,colors[c]+change));image.data[i+3]=255;
  }
  ctx.putImageData(image,0,0);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;
  return map;
}

function lineObject(points:number, color:number, dashed=false) {
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(points*3),3));
  return new THREE.Line(geometry,dashed?new THREE.LineDashedMaterial({color,dashSize:.08,gapSize:.045,transparent:true,opacity:.85}):new THREE.LineBasicMaterial({color,transparent:true,opacity:.88}));
}
function fillLine(line:THREE.Line, positions:[number,number,number][]) {
  const attr=line.geometry.getAttribute('position');positions.forEach((v,i)=>attr.setXYZ(i,...v));attr.needsUpdate=true;line.geometry.computeBoundingSphere();if(line.material instanceof THREE.LineDashedMaterial)line.computeLineDistances();
}

function parcelRockMaterial(colour:number){
  const material=new THREE.MeshStandardMaterial({color:colour,roughness:.94,metalness:0});
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vParcelPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvParcelPoint=position;');
    shader.fragmentShader='varying vec3 vParcelPoint;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      float gh(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float gn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(gh(i),gh(i+vec3(1,0,0)),f.x),mix(gh(i+vec3(0,1,0)),gh(i+vec3(1,1,0)),f.x),f.y),mix(mix(gh(i+vec3(0,0,1)),gh(i+vec3(1,0,1)),f.x),mix(gh(i+vec3(0,1,1)),gh(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float gg(vec3 p){return gn(p*29.)*.5+gn(p*93.)*.3+gn(p*240.)*.2;}
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat grain=gg(vParcelPoint);diffuseColor.rgb*=.56+grain*.8;diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*.35,smoothstep(.68,.78,gn(vParcelPoint*85.))*.6);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      vec3 q0=dFdx(-vViewPosition),q1=dFdy(-vViewPosition),n0=cross(q1,normal),n1=cross(normal,q0);float det=dot(q0,n0),b=gg(vParcelPoint)*.009;
      normal=normalize(abs(det)*normal-sign(det)*(dFdx(b)*n0+dFdy(b)*n1));
    `);
  };material.customProgramCacheKey=()=> 'rift-origin-batch-grain-1';return material;
}

export function mountRiftScene(host:HTMLElement, initial:RiftState, copy:SceneCopy):RiftScene {
  let disposed=false,current=initial,scale: RiftScale=initial.scale;
  const narrow=innerWidth<700||matchMedia('(pointer: coarse)').matches;
  const stage=createThreeStage(host,{label:copy.label,cameraPosition:initial.camera[scale]??cameras[scale],target:[0,0,0],minDistance:3,maxDistance:16,background:'#12272e',onUnavailable:()=>copy.onUnavailable()});
  stage.camera.fov=narrow?40:34;stage.camera.updateProjectionMatrix();stage.renderer.toneMappingExposure=.91;
  stage.controls.minPolarAngle=.3;stage.controls.maxPolarAngle=Math.PI*.81;
  const globalGroup=new THREE.Group(),regionGroup=new THREE.Group(),materialGroup=new THREE.Group();stage.group.add(globalGroup,regionGroup,materialGroup);
  regionGroup.position.y=.47;
  const maps={land:texture('land',narrow?256:512),cut:texture('cut',narrow?256:512),mantle:texture('mantle',256),ocean:texture('ocean',256),grain:texture('grain',256)};
  maps.land.repeat.set(1.6,1.6);maps.cut.repeat.set(1.2,1);maps.mantle.repeat.set(2,2);
  const earth=new THREE.Mesh(new THREE.SphereGeometry(1.805,narrow?64:96,narrow?40:56),new THREE.MeshStandardMaterial({map:maps.ocean,roughness:.57,metalness:.08}));globalGroup.add(earth);
  const continentMaterial=new THREE.MeshStandardMaterial({vertexColors:true,map:maps.grain,bumpMap:maps.land,bumpScale:.0015,roughness:.96,side:THREE.DoubleSide});
  const continents=[createContinentGeometry(-1,narrow?36:64,narrow?24:40),createContinentGeometry(1,narrow?36:64,narrow?24:40)];
  for(const geometry of continents)globalGroup.add(new THREE.Mesh(geometry.geometry,continentMaterial));
  const basinStrip=createContinentGeometry(0,40,8);
  const strip=new THREE.Mesh(basinStrip.geometry,new THREE.MeshStandardMaterial({map:maps.land,color:0x9f9d78,roughness:1,side:THREE.DoubleSide}));globalGroup.add(strip);
  const globalTrace=lineObject(48,0xf0d28d,true);globalGroup.add(globalTrace);
  const markerGeometry=new THREE.SphereGeometry(.032,12,8), markerMaterial=new THREE.MeshBasicMaterial({color:0xf5d491});
  const siteMarker=new THREE.Mesh(markerGeometry,markerMaterial);siteMarker.position.set(Math.sin(riftLongitude(.5))*1.88,0,Math.cos(riftLongitude(.5))*1.88);globalGroup.add(siteMarker);

  const terrainMaterials=[
    new THREE.MeshStandardMaterial({map:maps.land,bumpMap:maps.land,bumpScale:.045,roughness:.97}),
    new THREE.MeshStandardMaterial({map:maps.cut,bumpMap:maps.cut,bumpScale:.025,roughness:.97}),
  ];
  const lithMaterials=[
    new THREE.MeshStandardMaterial({map:maps.mantle,roughness:.94,color:0xb4b8a3}),
    new THREE.MeshStandardMaterial({map:maps.mantle,bumpMap:maps.mantle,bumpScale:.035,roughness:.95,color:0xb0ab8e}),
  ];
  const asthenoMaterial=new THREE.MeshStandardMaterial({map:maps.mantle,roughness:.96,color:0x8d9888});
  const mutable:MutableGeometry[]=[];
  for(const block of ['left','basin','right'] as const)for(const layer of ['crust','lithosphere'] as const){
    const shape=createBlockGeometry(block,layer,narrow?18:32,narrow?20:34);mutable.push(shape);
    const mesh=new THREE.Mesh(shape.geometry,layer==='crust'?terrainMaterials:lithMaterials);mesh.name=`Rift-A-${block}-${layer}`;regionGroup.add(mesh);
  }
  const astheno=createBlockGeometry('basin','asthenosphere',narrow?40:64,narrow?20:32);mutable.push(astheno);regionGroup.add(new THREE.Mesh(astheno.geometry,[asthenoMaterial,asthenoMaterial]));
  const f1=lineObject(28,0xefc578),f2=lineObject(28,0xa5c0bb);regionGroup.add(f1,f2);
  const beddingLines=Array.from({length:6},()=>lineObject(25,0xe3c5a0));for(const line of beddingLines)regionGroup.add(line);
  const water=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshStandardMaterial({map:maps.ocean,color:0x74a8aa,roughness:.45,metalness:.05,transparent:true,opacity:.78,side:THREE.DoubleSide}));water.rotation.x=-Math.PI/2;regionGroup.add(water);
  const faultSource=new THREE.Mesh(markerGeometry,markerMaterial);regionGroup.add(faultSource);
  const p1Marker=new THREE.Mesh(new THREE.SphereGeometry(.06,16,12),new THREE.MeshStandardMaterial({color:0xb8c886,emissive:0x304123,emissiveIntensity:.22,roughness:.78}));regionGroup.add(p1Marker);
  const pulseMaterial=new THREE.LineBasicMaterial({color:0xe4bf73,transparent:true,opacity:0});
  const pulses=Array.from({length:3},()=>{const line=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length:64},(_,i)=>new THREE.Vector3(Math.cos(i/64*Math.PI*2),Math.sin(i/64*Math.PI*2),0))),pulseMaterial.clone());regionGroup.add(line);return line;});
  const pathCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(.2,-1.13,1.415),new THREE.Vector3(.03,-.8,1.415),new THREE.Vector3(.15,-.44,1.415),new THREE.Vector3(.23,-.13,1.415)]);
  const magmaMaterial=new THREE.MeshStandardMaterial({color:0xb77940,emissive:0x6e260a,emissiveIntensity:.4,roughness:.72});
  const conduit=new THREE.Mesh(new THREE.TubeGeometry(pathCurve,36,.026,7,false),magmaMaterial);regionGroup.add(conduit);
  const intrusion=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),magmaMaterial.clone());regionGroup.add(intrusion);
  const solidResidue=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),new THREE.MeshStandardMaterial({color:0x7f8b69,roughness:1}));solidResidue.position.set(.13,-1.13,1.41);solidResidue.scale.set(.23,.12,.04);regionGroup.add(solidResidue);
  const riseTags=Array.from({length:4},(_,i)=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(.04,10,7),magmaMaterial);mesh.name=`P1-${17+i}`;regionGroup.add(mesh);return mesh;});

  const grainColors=[0x68735b,0x9a9c7b,0x5c6557,0xabb199,0x737c64];
  const cells=materialCells(),fineGeometry=grainGeometry(31),dropGeometry=new THREE.SphereGeometry(1,32,24);
  const tags=Array.from({length:20},(_,i)=>{
    const group=new THREE.Group();group.name=`P1-${String(i+1).padStart(2,'0')}`;group.userData.materialTag=group.name;
    const material=parcelRockMaterial(grainColors[i%5]);
    const mesh=new THREE.Mesh(cells[i].geometry,material);group.add(mesh);materialGroup.add(group);
    const residue=new THREE.Mesh(cells[i].geometry,parcelRockMaterial(grainColors[i%5]));group.add(residue);
    const outline=new THREE.Mesh(cells[i].geometry,new THREE.MeshBasicMaterial({color:0xf3cf7b,wireframe:true,transparent:true,opacity:.75}));group.add(outline);
    const fine=new THREE.InstancedMesh(fineGeometry,new THREE.MeshStandardMaterial({color:i%2?0xbac0a7:0x5a665d,map:maps.grain,roughness:.86}),8);group.add(fine);
    return{group,mesh,material,outline,fine,residue};
  });
  const journeyLine=lineObject(32,0xaab7ac,true);materialGroup.add(journeyLine);
  const matrixMaterial=new THREE.MeshStandardMaterial({color:0x414c43,roughness:.94,transparent:true,opacity:.25});
  const materialGround=new THREE.Mesh(new THREE.CylinderGeometry(1.08,1.16,.09,48),matrixMaterial);materialGround.position.set(-1.04,-.83,0);materialGround.scale.z=.78;materialGroup.add(materialGround);
  const productGround=materialGround.clone();productGround.position.x=1.18;productGround.scale.set(.66,1,.58);materialGroup.add(productGround);
  const labels=document.createElement('div');labels.className='rift-scene-labels';host.append(labels);
  const annotations=Object.fromEntries(Object.entries(copy.labels).map(([key,text])=>{const span=document.createElement('span');span.className=`rift-scene-label rift-label-${key}`;span.textContent=text;labels.append(span);return[key,span];})) as Record<keyof SceneCopy['labels'],HTMLSpanElement>;
  const anchors:Record<keyof SceneCopy['labels'],THREE.Vector3>={site:new THREE.Vector3(),fault:new THREE.Vector3(),parcel:new THREE.Vector3(),intrusion:new THREE.Vector3()};
  function projectLabels(){
    if(disposed)return;const rect=host.getBoundingClientRect();stage.camera.updateMatrixWorld();
    for(const key of Object.keys(annotations) as (keyof typeof annotations)[]){
      const siteFacing=siteMarker.position.clone().normalize().dot(stage.camera.position.clone().sub(siteMarker.position).normalize())>.02;
      const element=annotations[key],visible=key==='site'?scale==='global'&&siteFacing:key==='fault'?scale==='region':key==='parcel'?scale!=='global':scale==='region'&&!narrow&&riftFrame(current).melt>.4;
      const point=anchors[key].clone().project(stage.camera);element.hidden=!visible||point.z>1||Math.abs(point.x)>1.1||Math.abs(point.y)>1.1;
      element.style.left=`${Math.max(5,Math.min(rect.width-5,(point.x*.5+.5)*rect.width))}px`;element.style.top=`${(-point.y*.5+.5)*rect.height}px`;
    }
  }
  const labelResize=new ResizeObserver(projectLabels);labelResize.observe(host);stage.controls.addEventListener('change',projectLabels);
  const dummy=new THREE.Object3D();
  function update(state:RiftState){
    if(disposed)return;const changed=scale!==state.scale;current=state;scale=state.scale;
    globalGroup.visible=scale==='global';regionGroup.visible=scale==='region';materialGroup.visible=scale==='material';
    if(changed){stage.camera.position.set(...(state.camera[scale]??cameras[scale]));stage.controls.target.set(0,0,0);stage.controls.update();}
    const f=riftFrame(state);
    const connectedSea=f.p>.86;
    if(scale==='global'){
    for(const geometry of continents)geometry.update(f);basinStrip.update(f);
    strip.visible=!connectedSea;
    globalTrace.visible=f.extension>.02;fillLine(globalTrace,Array.from({length:48},(_,i)=>{const v=lerp(.1,.9,i/47),latitude=lerp(-.83,.83,v),longitude=riftLongitude(v);return[Math.sin(longitude)*Math.cos(latitude)*1.87,Math.sin(latitude)*1.87,Math.cos(longitude)*Math.cos(latitude)*1.87];}));
    }
    if(scale==='region'){
    for(const geometry of mutable)geometry.update(f);
    water.visible=connectedSea;water.position.set(0,-.065,.01);water.scale.set(faultX(-.065,f,'right')-faultX(-.065,f,'left')-.05,2.72,1);
    fillLine(f1,Array.from({length:28},(_,i)=>{const y=lerp(.43,-.5,i/27);return[faultX(y,f,'left'),y,1.393];}));
    fillLine(f2,Array.from({length:28},(_,i)=>{const y=lerp(.43,-.5,i/27);return[faultX(y,f,'right'),y,1.393];}));
    for(let j=0;j<2;j++)for(let block=0;block<3;block++)fillLine(beddingLines[j*3+block],Array.from({length:25},(_,i)=>beddingPoint((['left','basin','right'] as const)[block],i/24,j,f)));
    faultSource.position.set(faultX(-.04,f,'left'),-.04,1.425);faultSource.visible=state.focus==='fault';
    p1Marker.position.set(.14,-1.13+f.upwelling*.16,1.43);p1Marker.visible=state.focus!=='fault';
    for(let i=0;i<pulses.length;i++){
      const p=boundedWave(f.quake.wave,i);pulses[i].visible=state.focus==='fault'&&p>0&&p<1;
      pulses[i].position.copy(faultSource.position);pulses[i].scale.setScalar(.08+p*1.65);(pulses[i].material as THREE.LineBasicMaterial).opacity=(1-p)*.65;
    }
    conduit.visible=f.rise>.02&&state.path==='open'&&state.focus!=='fault';
    conduit.geometry.setDrawRange(0,Math.ceil(f.rise*36)*7*6);
    (conduit.material as THREE.MeshStandardMaterial).emissiveIntensity=.32*(1-f.cooled);
    (conduit.material as THREE.MeshStandardMaterial).color.setHex(f.cooled>.5?0x6f7969:0xb77940);
    intrusion.visible=f.melt>.03&&state.focus!=='fault';intrusion.position.set(.22,lerp(-1.12,state.path==='open'?-.12:-.85,f.rise),1.42);intrusion.scale.set(.21*f.melt,.055*f.melt,.045);
    (intrusion.material as THREE.MeshStandardMaterial).color.setHex(f.cooled>.5?0x6f7969:0xb77940);
    solidResidue.visible=state.focus!=='fault';
    riseTags.forEach((mesh,i)=>{const tag=f.tags[16+i];mesh.visible=tag.melt>.02&&state.focus!=='fault';const p=tag.rise;mesh.position.set(.16+Math.sin(p*Math.PI*2+i)*.025,lerp(-1.12,-.13,p),1.45);mesh.scale.setScalar(.5+tag.melt*.5);});
    }
    if(scale==='material'){
    f.tags.forEach((tag,i)=>{
      const object=tags[i],start=cells[i].center.clone().add(new THREE.Vector3(-1.05,-.1,0));
      const destination=new THREE.Vector3(1.03+(i-16)%2*.32,-.39+Math.floor((i-16)/2)*.37,((i-16)%2-.5)*.15);
      const distance=tag.rise*(state.path==='open'?1:2.6);
      object.group.position.copy(start.clone().lerp(destination,Math.min(1,distance)));
      object.group.position.y+=Math.sin(tag.rise*Math.PI)*.47;
      const partial=i>=16?Math.cbrt(tag.melt):1,molten=i>=16&&tag.crystallize<.5,fastMatrix=i>=16&&state.cooling==='fast'&&tag.crystallize>.5;
      object.mesh.geometry=molten||fastMatrix?dropGeometry:cells[i].geometry;object.mesh.scale.setScalar(partial*((molten||fastMatrix)?.23:1));object.mesh.rotation.set(0,0,0);
      object.residue.visible=i>=16&&tag.melt<.999;object.residue.position.copy(start).sub(object.group.position);object.residue.scale.setScalar(Math.cbrt(1-tag.melt));object.residue.rotation.set(0,0,0);
      object.material.color.setHex(tag.melt>.5?(tag.crystallize>.5?0x88917e:0xbe823d):grainColors[i%5]);
      object.material.emissive.setHex(tag.melt>.5&&tag.crystallize<.5?0x5d2507:0x000000);object.material.emissiveIntensity=.38*(1-tag.crystallize);
      object.material.roughness=.83-tag.melt*.22+tag.crystallize*.2;
      if(fastMatrix)object.material.color.setHex(0x4a5549);
      object.outline.visible=i===state.tag;object.outline.geometry=tag.melt>.05&&(molten||fastMatrix)?dropGeometry:cells[i].geometry;object.outline.scale.copy(tag.melt>.05||i<16?object.mesh.scale:object.residue.scale).multiplyScalar(1.025);object.outline.position.copy(tag.melt>.05||i<16?new THREE.Vector3():object.residue.position);object.outline.rotation.copy(object.mesh.rotation);
      object.fine.visible=state.cooling==='fast'&&tag.crystallize>.5;
      object.mesh.visible=i<16||tag.melt>.001;
      for(let k=0;k<8;k++){dummy.position.set((k%2-.5)*.2,(Math.floor(k/2)%2-.5)*.21,(Math.floor(k/4)-.5)*.2);dummy.rotation.set(k*.47,k*.39,k*.31);dummy.scale.setScalar(.092);dummy.updateMatrix();object.fine.setMatrixAt(k,dummy.matrix);}object.fine.instanceMatrix.needsUpdate=true;
    });
    fillLine(journeyLine,Array.from({length:32},(_,i)=>{const t=i/31;return[lerp(-.65,.85,t),.1+Math.sin(t*Math.PI)*.38,-.03];}));journeyLine.visible=f.melt>.05;
    }
    anchors.site.copy(siteMarker.position);anchors.fault.set(faultX(.35,f,'left'),.9,1.42);anchors.parcel.set(scale==='region'?.15:-1.12,scale==='region'?-.53:.82,scale==='region'?1.44:0);anchors.intrusion.set(.2,intrusion.position.y+.8,1.42);
    host.dataset.riftTrianglesBudget=narrow?'compact':'detailed';host.dataset.riftScale=scale;host.dataset.riftTags='20';stage.canvas.dataset.riftScale=scale;
    projectLabels();stage.requestRender();
  }
  function saveCamera(){if(disposed)return;const p=stage.camera.position;copy.onCamera(scale,[p.x,p.y,p.z]);}
  stage.controls.addEventListener('end',saveCamera);stage.canvas.addEventListener('keyup',saveCamera);
  function resetCamera(){stage.camera.position.set(...cameras[scale]);stage.controls.target.set(0,0,0);stage.controls.update();projectLabels();stage.requestRender();saveCamera();}
  const home=(event:KeyboardEvent)=>{if(event.key==='Home'){event.preventDefault();event.stopImmediatePropagation();resetCamera();}};stage.canvas.addEventListener('keydown',home,true);
  update(initial);
  return{update,pause:value=>stage.setPaused(value),resetCamera,dispose(){if(disposed)return;disposed=true;labelResize.disconnect();stage.controls.removeEventListener('change',projectLabels);stage.controls.removeEventListener('end',saveCamera);stage.canvas.removeEventListener('keyup',saveCamera);stage.canvas.removeEventListener('keydown',home,true);labels.remove();stage.dispose();}};
}
function boundedWave(value:number,index:number){return Math.max(0,Math.min(1,(value-index*.14)/.72));}
