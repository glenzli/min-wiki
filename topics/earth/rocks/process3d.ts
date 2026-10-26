import * as THREE from 'three';
import {createThreeStage} from '../threeStage';
import {rockMaterial} from './rockMaterial';
import {createParcelGeometries} from './parcelGeometry';
import {PARCEL_CELLS,parcelFrame} from './parcelFrame';
import {frameStates,type RockSession} from './model';

const channel=(x:number)=>Math.sin(x*.8)*.22;
const groundHeight=(x:number,z:number)=>-1.04+.013*Math.sin(x*3.8+z*2.1)-.085*Math.exp(-(((z-channel(x))/.57)**2));
function groundGeometry(){
  const geometry=new THREE.PlaneGeometry(22,22,110,110);geometry.rotateX(-Math.PI/2);
  const p=geometry.getAttribute('position');
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,groundHeight(x,z)+Math.max(0,Math.abs(z)-2)*.045);}
  geometry.computeVertexNormals();return geometry;
}
function basinMatrix(){
  const geometry=new THREE.SphereGeometry(1,64,24),p=geometry.getAttribute('position');
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),relief=1+.035*Math.sin(x*13+z*7)*Math.cos(z*11);
    p.setXYZ(i,x*1.68*relief,Math.max(-.04,y*.52)*(1+.075*Math.sin(x*11-z*5)),z*1.14*relief);
  }
  geometry.computeVertexNormals();return geometry;
}

/** One local close-up. No particle dynamics, chemical budget or geological clock is inferred. */
export function mountRockProcess(host:HTMLElement,label:string,onUnavailable:()=>void){
  const stage=createThreeStage(host,{label,cameraPosition:[2.45,2.35,4.5],target:[0,-.44,0],minDistance:3.7,maxDistance:10,background:'#e4e6dc',onUnavailable});
  stage.renderer.toneMappingExposure=.9;stage.controls.maxPolarAngle=Math.PI*.495;
  stage.scene.fog=new THREE.Fog('#e4e6dc',11,26);
  for(const light of stage.scene.children){
    if(light instanceof THREE.DirectionalLight)light.intensity*=.65;
  }
  const earth=new THREE.MeshStandardMaterial({color:'#b6b4a6',roughness:1});
  earth.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vGroundPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGroundPoint=position;');
    shader.fragmentShader='varying vec3 vGroundPoint;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=.96+.025*sin(vGroundPoint.x*137.0)*sin(vGroundPoint.z*151.0)+.025*sin(vGroundPoint.x*7.0+vGroundPoint.z*9.0);');
  };
  const ground=new THREE.Mesh(groundGeometry(),earth);stage.group.add(ground);
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
  const ctx=shadowCanvas.getContext('2d')!,gradient=ctx.createRadialGradient(64,64,8,64,64,64);
  gradient.addColorStop(0,'rgba(27,33,29,.42)');gradient.addColorStop(.45,'rgba(27,33,29,.2)');gradient.addColorStop(1,'rgba(27,33,29,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const shadowMaterial=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,opacity:.7});
  const shadowGeometry=new THREE.PlaneGeometry(3.8,2.8,36,28);shadowGeometry.rotateX(-Math.PI/2);
  const shadowPoints=shadowGeometry.getAttribute('position');
  for(let i=0;i<shadowPoints.count;i++)shadowPoints.setY(i,groundHeight(shadowPoints.getX(i),shadowPoints.getZ(i))+.004);
  const shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);stage.group.add(shadow);
  const contactShadows=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),shadowMaterial,24);stage.group.add(contactShadows);
  const granite=rockMaterial('granite','origin'),sand=rockMaterial('sandstone','world');
  const parcel=createParcelGeometries();
  const chips=parcel.geometries.map((geometry,i)=>{
    const mesh=new THREE.Mesh(geometry,granite);mesh.userData.materialBatch=PARCEL_CELLS[i].id;stage.group.add(mesh);return mesh;
  });
  const wholeSupport=groundHeight(0,0)-parcel.hullBottom+.006;
  const meltMat=new THREE.MeshStandardMaterial({color:'#381b11',emissive:'#ffffff',emissiveIntensity:1,roughness:.75,metalness:0});
  const meltPhase={value:0};
  meltMat.onBeforeCompile=shader=>{
    shader.uniforms.uMeltPhase=meltPhase;
    shader.vertexShader='varying vec3 vMeltPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvMeltPoint=position;');
    shader.fragmentShader=`varying vec3 vMeltPoint;
      uniform float uMeltPhase;
      float meltHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float meltNoise(vec3 p){
        vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(mix(meltHash(i),meltHash(i+vec3(1,0,0)),f.x),mix(meltHash(i+vec3(0,1,0)),meltHash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(meltHash(i+vec3(0,0,1)),meltHash(i+vec3(1,0,1)),f.x),mix(meltHash(i+vec3(0,1,1)),meltHash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
      float meltFbm(vec3 p){float n=0.0,a=.54;for(int i=0;i<4;i++){n+=a*meltNoise(p);p=p*2.07+vec3(7.2,3.1,8.9);a*=.46;}return n;}
      `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 meltPoint=vMeltPoint*vec3(3.2,7.0,4.7);
      vec3 warp=vec3(meltFbm(meltPoint*.62),meltFbm(meltPoint*.62+8.3),meltFbm(meltPoint*.62+17.7));
      float moltenTint=smoothstep(.17,.76,meltFbm(meltPoint+warp*3.1+vec3(uMeltPhase*.035,0.0,0.0)));
      float meltFine=meltNoise(meltPoint*13.0);
      diffuseColor.rgb=mix(vec3(.035,.017,.011),vec3(.24,.05,.012),moltenTint)*(.84+.16*meltFine);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      totalEmissiveRadiance=mix(vec3(.055,.003,.001),vec3(1.65,.37,.035),pow(moltenTint,1.65))*(.7+.3*meltFine);`);
  };
  const meltGeometry=new THREE.SphereGeometry(1,72,32),base=meltGeometry.getAttribute('position').array.slice();
  const pool=new THREE.Mesh(meltGeometry,meltMat);pool.position.y=groundHeight(0,0)+.16;pool.scale.set(1.48,.22,1.02);stage.group.add(pool);
  const cement=new THREE.Mesh(basinMatrix(),sand);cement.position.set(.72,groundHeight(.72,0)+.03,0);stage.group.add(cement);
  const ribbon=new THREE.PlaneGeometry(22,2.8,160,12);ribbon.rotateX(-Math.PI/2);
  const wp=ribbon.getAttribute('position');
  for(let i=0;i<wp.count;i++){const x=wp.getX(i),z=wp.getZ(i);wp.setXYZ(i,x,-1.045,z+channel(x));}
  ribbon.computeVertexNormals();
  const waterMaterial=new THREE.MeshPhysicalMaterial({color:'#5a9294',roughness:.24,transparent:true,opacity:.68,metalness:.04,clearcoat:.5,depthWrite:false});
  const water=new THREE.Mesh(ribbon,waterMaterial);stage.group.add(water);
  const flowMaterial=new THREE.MeshBasicMaterial({color:'#dbe8df',transparent:true,opacity:.4,depthWrite:false});
  const flowGeometry=new THREE.SphereGeometry(.012,6,4);
  const trails=Array.from({length:20},()=>{const mesh=new THREE.Mesh(flowGeometry,flowMaterial);mesh.scale.set(12,.28,1.2);stage.group.add(mesh);return mesh;});
  const dummy=new THREE.Object3D(),q=new THREE.Vector3();
  let disposed=false;
  function update(session:RockSession){
    if(disposed)return;const f=parcelFrame(session),state=frameStates(session),kinds={coarse:0,fine:7,loose:0,cemented:2,foliated:6,melt:0};
    const contextColour=(setting:string)=>new THREE.Color(setting==='deep'?'#6b746d':setting==='buried'?'#9c9f90':'#e4e6dc');
    const backdrop=contextColour(state.from.setting).lerp(contextColour(state.to.setting),state.amount);
    (stage.scene.background as THREE.Color).copy(backdrop);(stage.scene.fog as THREE.Fog).color.copy(backdrop);
    const fromKind=state.from.texture==='melt'?kinds[state.to.texture]:kinds[state.from.texture];
    const toKind=state.to.texture==='melt'?fromKind:kinds[state.to.texture];
    granite.userData.from.value=fromKind;granite.userData.to.value=toKind;granite.userData.blend.value=state.amount;
    // Added cement has its own subdued granular appearance. During the selected
    // solid-state metamorphic example it can acquire the same aggregate bands.
    sand.userData.from.value=fromKind===6?6:8;sand.userData.to.value=toKind===6?6:8;sand.userData.blend.value=state.amount;
    pool.scale.y=.28*Math.max(.001,f.molten);pool.position.y=groundHeight(0,0)+pool.scale.y*.94;
    chips.forEach((mesh,i)=>{
      const p=f.cells[i],scale=Math.max(.001,p.scale);
      mesh.rotation.set(-p.settled*(.45+(i%5)*.19)+p.rotation*.35,p.settled*Math.sin(i*2.39996)*1.7,p.rotation*.6);
      mesh.scale.setScalar(scale);mesh.position.set(p.x,0,p.z);
      const vertices=mesh.geometry.getAttribute('position');let bottom=Infinity;
      for(let j=0;j<vertices.count;j++){q.fromBufferAttribute(vertices,j).multiplyScalar(scale).applyQuaternion(mesh.quaternion);bottom=Math.min(bottom,q.y);}
      const contact=groundHeight(p.x,p.z)+.006-bottom;
      mesh.position.y=(p.y+wholeSupport)*(1-p.settled)+contact*p.settled+p.lift;
      mesh.position.y=mesh.position.y*(1-f.molten)+(pool.position.y+.01)*f.molten;
      mesh.visible=f.molten<.999;
      dummy.position.set(p.x,groundHeight(p.x,p.z)+.004,p.z);dummy.rotation.set(-Math.PI/2,0,p.rotation);
      const bounds=mesh.geometry.boundingBox!;dummy.scale.set((bounds.max.x-bounds.min.x)*scale*1.5,(bounds.max.z-bounds.min.z)*scale*1.5,1);dummy.updateMatrix();contactShadows.setMatrixAt(i,dummy.matrix);
    });
    contactShadows.instanceMatrix.needsUpdate=true;contactShadows.visible=f.molten<.999&&f.cells.some(p=>p.settled>.05);shadow.visible=f.molten>.001||f.cells.every(p=>p.settled<.05);
    pool.visible=f.molten>0;meltPhase.value=(session.cursor+state.amount)*.83;
    const p=meltGeometry.getAttribute('position');
    for(let i=0;i<p.count;i++){const x=base[i*3],y=base[i*3+1],z=base[i*3+2];p.setXYZ(i,x*(1+.035*Math.sin(z*8.1)),y+.025*Math.sin(x*11+z*7-meltPhase.value)*Math.max(0,y),z*(1+.025*Math.sin(x*7)));}
    p.needsUpdate=true;meltGeometry.computeVertexNormals();
    cement.visible=f.matrix>0;cement.scale.set(1-f.molten*.72,Math.max(.001,f.matrix)*(1-f.molten*.6),1-f.molten*.72);cement.position.x=.72*(1-f.molten*.72);
    const showWater=f.water>0||session.process==='transport';water.visible=showWater;waterMaterial.opacity=.65*Math.max(f.water,session.process==='transport'?.85:0);
    trails.forEach((mesh,i)=>{mesh.visible=showWater;const x=((i/20+f.flow*.65)%1)*7-3.5;mesh.position.set(x,-1.037,channel(x)+(i%4-1.5)*.19);mesh.rotation.y=-Math.atan(.176*Math.cos(x*.8));});
    stage.canvas.dataset.materialId=f.materialId;stage.canvas.dataset.process=session.process??'rest';stage.canvas.dataset.progress=String(session.progress);stage.canvas.dataset.materialBatches=String(chips.length);stage.requestRender();
  }
  return {update,pause:()=>stage.setPaused(true),resume:()=>stage.setPaused(false),reset:()=>stage.resetCamera(),dispose(){if(disposed)return;disposed=true;stage.dispose();}};
}
