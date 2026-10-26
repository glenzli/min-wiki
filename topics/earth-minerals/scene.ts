import * as THREE from 'three';
import { createThreeStage } from '../earth/threeStage.ts';
import { diamondNetwork, graphiteSheet, parseCamera, type Network, type Point3 } from './geometry.ts';
import { exposureAt, graphiteOffset, QUARTZ_CLUSTER, quartzGrowthAt, type MineralState } from './model.ts';

export interface MineralScene {
  update(representation:'carbon'|'quartz',shear:number,exposure?:number):void;
  updateGrowth(state:Pick<MineralState,'environment'|'rate'|'supply'|'progress'>):void;
  pause():void;
  resetCamera():void;
  dispose():void;
}
export function createMineralScene(host:HTMLElement, options:{label:string;camera?:string;representation?:'carbon'|'quartz';onCamera:(value:string)=>void;onUnavailable:()=>void}):MineralScene {
  const restored=parseCamera(options.camera);
  const stage=createThreeStage(host,{label:options.label,cameraPosition:restored?.position??(options.representation==='quartz'?[4.2,3.1,7.7]:[5.8,4.3,10.7]),minDistance:3,maxDistance:18,background:'#0d1d26',onUnavailable:options.onUnavailable});
  const {group,scene,renderer}=stage;
  renderer.toneMappingExposure=.75;
  scene.children.forEach(light=>{if(light instanceof THREE.HemisphereLight)light.intensity=.65;else if(light instanceof THREE.DirectionalLight)light.intensity*=.55;});
  const pmrem=new THREE.PMREMGenerator(renderer),studio=new THREE.Scene();
  studio.background=new THREE.Color('#070b11');
  // Narrow self-authored softboxes make reflections move across real flat faces.
  for(const [x,y,z,sx,sy,intensity] of [[-4,0,4,1.4,8,4],[4,-1,0,.65,7,7],[2,-.5,-4,2.1,6,3],[0,5,0,4,2,3]]){
    const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});material.color.setScalar(intensity);
    const card=new THREE.Mesh(new THREE.PlaneGeometry(sx,sy),material);card.position.set(x,y,z);card.lookAt(0,0,0);studio.add(card);
  }
  const env=pmrem.fromScene(studio,.015);
  studio.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();(object.material as THREE.Material).dispose();}});studio.clear();pmrem.dispose();scene.environment=env.texture;
  const backdropCanvas=document.createElement('canvas');backdropCanvas.width=512;backdropCanvas.height=512;
  const backdropContext=backdropCanvas.getContext('2d')!,backdropGradient=backdropContext.createRadialGradient(220,170,25,260,240,420);
  backdropGradient.addColorStop(0,'#63736e');backdropGradient.addColorStop(.55,'#354a4c');backdropGradient.addColorStop(1,'#14262f');backdropContext.fillStyle=backdropGradient;backdropContext.fillRect(0,0,512,512);
  const backdrop=new THREE.CanvasTexture(backdropCanvas);backdrop.colorSpace=THREE.SRGBColorSpace;
  const carbon=new THREE.Group(), quartz=new THREE.Group();group.add(carbon,quartz);
  const layers:THREE.Group[]=[];
  const detail=matchMedia('(pointer:coarse)').matches||innerWidth<700?0:1;
  const sphere=new THREE.SphereGeometry(.085,detail?16:12,detail?12:8);
  const cylinder=new THREE.CylinderGeometry(.033,.033,1,detail?9:6);
  const blue=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.24,metalness:.32});
  const graphiteMat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.42,metalness:.48});
  const bonds=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.4,metalness:.15});
  function network(target:THREE.Group, data:Network, scale:number,center:Point3,atomMaterial:THREE.Material,bondMaterial:THREE.Material,highlight=-1){
    const points=data.points.map(p=>new THREE.Vector3(...p).sub(new THREE.Vector3(...center)).multiplyScalar(scale));
    const atoms=new THREE.InstancedMesh(sphere,atomMaterial,points.length),mat=new THREE.Matrix4();
    for(let i=0;i<points.length;i++){mat.makeTranslation(...points[i].toArray());atoms.setMatrixAt(i,mat);atoms.setColorAt(i,new THREE.Color(i===highlight?'#ffb636':atomMaterial===blue?'#73a8bb':'#5d7781'));} atoms.instanceMatrix.needsUpdate=true;target.add(atoms);
    const sticks=new THREE.InstancedMesh(cylinder,bondMaterial,data.edges.length),axis=new THREE.Vector3(0,1,0);
    for(let i=0;i<data.edges.length;i++){
      const [a,b]=data.edges[i],start=points[a],end=points[b],direction=end.clone().sub(start);
      const transform=new THREE.Matrix4().compose(start.clone().add(end).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(axis,direction.clone().normalize()),new THREE.Vector3(1,direction.length(),1));
      sticks.setMatrixAt(i,transform);sticks.setColorAt(i,new THREE.Color(a===highlight||b===highlight?'#ffb12f':bondMaterial===bonds?'#416d7b':'#536e78'));
    }sticks.instanceMatrix.needsUpdate=true;target.add(sticks);
  }
  const diamond=new THREE.Group();diamond.position.set(-1.9,.05,0);diamond.rotation.set(.08,-.15,.08);carbon.add(diamond);
  const diamondData=diamondNetwork(),centerIndex=diamondData.points.findIndex(p=>p[0]===3&&p[1]===3&&p[2]===5);
  network(diamond,diamondData,.35,[3.5,3.5,3.5],blue,bonds,centerIndex);
  const sheet=graphiteSheet();
  for(let i=0;i<3;i++){
    const layer=new THREE.Group();layer.position.set(1.9+(i%2)*.39,(i-1)*.92,0);carbon.add(layer);layers.push(layer);
    network(layer,sheet,.39,[1.5,0,Math.sqrt(3)*1.75],graphiteMat,graphiteMat);
  }
  // Restrained plinths locate the two abstract structures, without implying a specimen.
  const plinthMat=new THREE.MeshStandardMaterial({color:'#172d39',roughness:.75,metalness:.08});
  const plinthGeom=new THREE.CylinderGeometry(1.85,1.9,.12,64);
  for(const x of [-1.9,1.9]){const plinth=new THREE.Mesh(plinthGeom,plinthMat);plinth.position.set(x,-1.58,0);carbon.add(plinth);}

  // Procedural quartz habit. Facets and striations are authored, not scanned geometry.
  const bumpCanvas=document.createElement('canvas');bumpCanvas.width=256;bumpCanvas.height=512;
  const ctx=bumpCanvas.getContext('2d')!;ctx.fillStyle='#808080';ctx.fillRect(0,0,256,512);
  let seed=7391;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<100;i++){ctx.fillStyle=`rgba(${random()>.5?'255,255,255':'0,0,0'},${.02+random()*.08})`;ctx.fillRect(0,Math.floor(random()*512),256,1+Math.floor(random()*2));}
  const bump=new THREE.CanvasTexture(bumpCanvas);bump.wrapS=THREE.RepeatWrapping;bump.wrapT=THREE.RepeatWrapping;
  const crystalMat=new THREE.MeshPhysicalMaterial({color:'#f1f2e9',roughness:.045,metalness:0,transmission:.96,transparent:true,opacity:1,depthWrite:false,thickness:.85,ior:1.544,attenuationColor:new THREE.Color('#e4e5d9'),attenuationDistance:5,envMapIntensity:2.5,specularIntensity:1,clearcoat:1,clearcoatRoughness:.025,bumpMap:bump,bumpScale:.018,side:THREE.FrontSide});
  const facetMat=crystalMat.clone();facetMat.roughness=.055;facetMat.transmission=.93;facetMat.color.set('#eeeeed');

  // Cloudier roots and clearer tips approximate a growth-zoned visual specimen.
  // This is an optical presentation choice, not a measured chemical profile.
  for(const material of [crystalMat,facetMat]){
    material.onBeforeCompile=shader=>{
      shader.vertexShader='attribute float growthHeight; varying float vGrowthHeight;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGrowthHeight=growthHeight;');
      shader.fragmentShader='varying float vGrowthHeight;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor = mix(0.19, roughnessFactor, smoothstep(0.08,0.8,vGrowthHeight));');
      shader.fragmentShader=shader.fragmentShader.replace('#include <transmission_fragment>',THREE.ShaderChunk.transmission_fragment.replace('material.transmission = transmission;','material.transmission = transmission * mix(0.35,1.0,smoothstep(0.08,0.78,vGrowthHeight));'));
    };
    material.customProgramCacheKey=()=> 'mineral-growth-surface-v1';
  }
  function crystal(radius:number,height:number){
    const positions:number[]=[],uvs:number[]=[],groups:{start:number;count:number;materialIndex:number}[]=[];
    const base:THREE.Vector3[]=[],shoulder:THREE.Vector3[]=[];
    for(let i=0;i<6;i++){const a=i*Math.PI/3;base.push(new THREE.Vector3(radius*Math.cos(a)*.95,0,radius*Math.sin(a)*.95));shoulder.push(new THREE.Vector3(radius*Math.cos(a),height*.76+(i%2)*height*.012,radius*Math.sin(a)));}
    const tip=new THREE.Vector3(radius*.1,height,radius*.05);
    const triangle=(a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3,uv:number[])=>{positions.push(...a.toArray(),...b.toArray(),...c.toArray());uvs.push(...uv);};
    for(let i=0;i<6;i++){
      const j=(i+1)%6,start=positions.length/3;
      triangle(base[i],shoulder[i],shoulder[j],[0,0,0,1,1,1]);triangle(base[i],shoulder[j],base[j],[0,0,1,1,1,0]);
      triangle(shoulder[i],tip,shoulder[j],[0,0,.5,1,1,0]);groups.push({start,count:9,materialIndex:i%2});
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('growthHeight',new THREE.Float32BufferAttribute(positions.filter((_,i)=>i%3===1).map(y=>y/height),1));for(const g of groups)geometry.addGroup(g.start,g.count,g.materialIndex);geometry.computeVertexNormals();
    const outer=new THREE.Mesh(geometry,[crystalMat,facetMat]);
    const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,12),new THREE.LineBasicMaterial({color:'#d9f4ee',transparent:true,opacity:.018}));outer.add(edge);
    // Fine transverse growth lines lie on the prism faces, not across the tips.
    const linePositions:number[]=[];
    for(let face=0;face<6;face++)for(let row=0;row<5;row++){
      const j=(face+1)%6,f=.28+row*.063+(face%2)*.009;
      const a=base[face].clone().lerp(shoulder[face],f),b=base[j].clone().lerp(shoulder[j],f);
      const inset=.05+(row%3)*.03;const aa=a.clone().lerp(b,inset),bb=b.clone().lerp(a,inset);linePositions.push(...aa.toArray(),...bb.toArray());
    }
    const lines=new THREE.BufferGeometry();lines.setAttribute('position',new THREE.Float32BufferAttribute(linePositions,3));outer.add(new THREE.LineSegments(lines,new THREE.LineBasicMaterial({color:'#e8f4ef',transparent:true,opacity:.025,depthWrite:false})));
    return outer;
  }
  const veilCanvas=document.createElement('canvas');veilCanvas.width=128;veilCanvas.height=128;
  const veilContext=veilCanvas.getContext('2d')!,veilPixels=veilContext.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const dx=(x-64)/63,dy=(y-64)/60,edge=Math.max(0,1-dx*dx-dy*dy);
    const cloud=.5+.3*Math.sin(x*.19+Math.sin(y*.15)*3)+.2*Math.sin(y*.3+x*.1);
    const i=(y*128+x)*4;veilPixels.data[i]=255;veilPixels.data[i+1]=255;veilPixels.data[i+2]=255;veilPixels.data[i+3]=Math.round(edge*edge*Math.max(0,cloud)*150);
  }
  veilContext.putImageData(veilPixels,0,0);const veilTexture=new THREE.CanvasTexture(veilCanvas);
  const veilMaterial=new THREE.MeshBasicMaterial({color:'#f4f5e9',map:veilTexture,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false});
  const sample=new THREE.Group();sample.position.y=-1.3;quartz.add(sample);
  const crystalRoots:THREE.Group[]=[],crystalEdges:THREE.LineSegments[]=[];
  for(const specimen of QUARTZ_CLUSTER){
    const {radius:r,height:h,tilt}=specimen;
    // The attachment and identity survive every seek. Growth changes the habit
    // above this root, never the position or shape of the host-rock matrix.
    const root=new THREE.Group();root.name=`quartz-${specimen.id}`;root.userData.crystalId=specimen.id;root.position.set(specimen.base[0],specimen.base[1],specimen.base[2]);root.rotation.set(tilt*.28,random()*.2,tilt);sample.add(root);crystalRoots.push(root);
    const c=crystal(r,h);root.add(c);crystalEdges.push(c.children[0] as THREE.LineSegments);
    // Sparse internal veils resemble growth inclusions without inventing an assay.
    const veil=new THREE.Mesh(new THREE.PlaneGeometry(r*.8,h*.22,1,1),veilMaterial);veil.position.set(0,h*.42,0);veil.rotation.set(.12,random()*Math.PI,.3);root.add(veil);
    const flaws=new THREE.BufferGeometry(),flawPositions:number[]=[];
    for(let i=0;i<24;i++){const angle=random()*Math.PI*2,rr=Math.sqrt(random())*r*.55;flawPositions.push(Math.cos(angle)*rr,h*(.15+random()*.5),Math.sin(angle)*rr);}
    flaws.setAttribute('position',new THREE.Float32BufferAttribute(flawPositions,3));root.add(new THREE.Points(flaws,new THREE.PointsMaterial({color:'#e7f7eb',size:.018,transparent:true,opacity:.33,depthWrite:false})));
  }
  // A weathered host-rock surface: irregular outline, granular relief and stained veins.
  const rockCanvas=document.createElement('canvas');rockCanvas.width=512;rockCanvas.height=512;
  const rockContext=rockCanvas.getContext('2d')!,rockPixels=rockContext.createImageData(512,512);
  const hash=(x:number,y:number)=>{const v=Math.sin(x*127.1+y*311.7)*43758.5453;return v-Math.floor(v);};
  const noise=(x:number,y:number)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),sx),THREE.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),sx),sy);};
  const fbm=(x:number,y:number)=>noise(x,y)*.55+noise(x*2.07,y*2.07)*.26+noise(x*4.31,y*4.31)*.13+noise(x*9.2,y*9.2)*.06;
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const large=fbm(x/65,y/65),grain=hash(x,y),vein=Math.exp(-Math.abs(Math.sin(x/31+large*7+y/95))*38),rust=Math.max(0,noise(x/23+7,y/23)-.57)*2;
    const light=75+large*61+(grain-.5)*32-vein*36;
    const i=(y*512+x)*4;rockPixels.data[i]=Math.min(255,light+rust*34);rockPixels.data[i+1]=Math.max(0,light*.88-rust*4);rockPixels.data[i+2]=Math.max(0,light*.73-rust*17);rockPixels.data[i+3]=255;
  }
  rockContext.putImageData(rockPixels,0,0);
  const rockMap=new THREE.CanvasTexture(rockCanvas);rockMap.colorSpace=THREE.SRGBColorSpace;rockMap.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  function matrixHeight(x:number,z:number){
    const angle=Math.atan2(z/1.1,x/1.42),outline=1+.09*Math.sin(angle*3+.4)+.065*Math.sin(angle*7+1.2)+.025*Math.sin(angle*13);
    const f=Math.hypot(x/1.42,z/1.1)/outline;
    return .16+(fbm(x*3+12,z*3+5)-.5)*.25+.04*Math.sin(x*19+z*14)-Math.pow(f,5)*.26;
  }
  const rings=detail?20:13,sectors=detail?96:64,rockPositions:number[]=[],rockUV:number[]=[],rockIndices:number[]=[];
  for(let ring=0;ring<=rings;ring++)for(let j=0;j<=sectors;j++){
    const angle=j/sectors*Math.PI*2,f=ring/rings;
    const outline=1+.09*Math.sin(angle*3+.4)+.065*Math.sin(angle*7+1.2)+.025*Math.sin(angle*13);
    const x=Math.cos(angle)*1.42*f*outline,z=Math.sin(angle)*1.1*f*outline;
    const elevation=matrixHeight(x,z);
    rockPositions.push(x,elevation,z);rockUV.push(.5+x/3.4,.5+z/2.9);
    if(ring<rings&&j<sectors){const a=ring*(sectors+1)+j,b=a+sectors+1;rockIndices.push(a,a+1,b,a+1,b+1,b);}
  }
  for(let band=1;band<=2;band++){
    const currentStart=rockPositions.length/3,previousStart=band===1?rings*(sectors+1):currentStart-sectors-1;
    for(let j=0;j<=sectors;j++){
      const outer=rings*(sectors+1)+j,angle=j/sectors*Math.PI*2,shrink=band===1?.99:.78+.06*Math.sin(angle*4);
      const x=rockPositions[outer*3]*shrink,z=rockPositions[outer*3+2]*shrink,y=band===1?-.19-.035*Math.sin(angle*7):-.42-.035*Math.cos(angle*5);
      rockPositions.push(x,y,z);rockUV.push(.5+x/3.4+y*.4,.5+z/2.9+y*.28);
      if(j<sectors){const a=previousStart+j,b=currentStart+j;rockIndices.push(a,a+1,b,b,a+1,b+1);}
    }
  }
  const rockGeometry=new THREE.BufferGeometry();rockGeometry.setAttribute('position',new THREE.Float32BufferAttribute(rockPositions,3));rockGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(rockUV,2));rockGeometry.setIndex(rockIndices);rockGeometry.computeVertexNormals();
  const rootContacts=QUARTZ_CLUSTER.map(crystal=>new THREE.Vector3(crystal.base[0],crystal.base[2],crystal.radius));
  const matrixMaterial=new THREE.MeshStandardMaterial({map:rockMap,bumpMap:rockMap,bumpScale:.035,roughness:.91,metalness:.015,side:THREE.DoubleSide});
  // Local contact shading joins the visible roots to this retained matrix.
  // It follows displayed crystal size, so an empty growth start has no ghost roots.
  matrixMaterial.onBeforeCompile=shader=>{
    shader.uniforms.mineralRootContacts={value:rootContacts};
    shader.vertexShader='varying vec3 vMatrixPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvMatrixPoint=position;');
    shader.fragmentShader='varying vec3 vMatrixPoint; uniform vec3 mineralRootContacts[5];\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float contactShade=0.0;
      for(int i=0;i<5;i++){
        vec3 root=mineralRootContacts[i];
        float ring=length(vMatrixPoint.xz-root.xy)/max(.001,root.z);
        contactShade=max(contactShade,(1.0-smoothstep(.66,1.42,ring))*step(.002,root.z));
      }
      diffuseColor.rgb*=1.0-contactShade*.23;`);
  };
  const matrix=new THREE.Mesh(rockGeometry,matrixMaterial);sample.add(matrix);
  // Small attached quartz druse links the large prisms to their mineral-bearing host.
  const drusePrototype=crystal(.1,.29),druse=new THREE.InstancedMesh(drusePrototype.geometry,[crystalMat,facetMat],22);
  // The prototype's decorative children are not part of the instanced druse.
  drusePrototype.children.forEach(child=>{const mesh=child as THREE.LineSegments;mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();});
  const druseTransform=new THREE.Object3D(),druseBases:THREE.Matrix4[]=[];
  for(let i=0;i<22;i++){const angle=i*2.399963,rad=.48+random()*.65,x=Math.cos(angle)*rad,z=Math.sin(angle)*rad*.8;druseTransform.position.set(x,matrixHeight(x,z)-.018,z);druseTransform.rotation.set((random()-.5)*.5,random()*Math.PI,(random()-.5)*.5);const scale=.6+random()*.8;druseTransform.scale.set(scale,scale,scale);druseTransform.updateMatrix();druseBases.push(druseTransform.matrix.clone());druse.setMatrixAt(i,druseTransform.matrix);}druse.instanceMatrix.setUsage(THREE.DynamicDrawUsage);druse.instanceMatrix.needsUpdate=true;sample.add(druse);
  // These sparse, deliberately enlarged marks indicate transport towards faces.
  // They are not atoms, fluid-inclusion analyses or a calculated flow field.
  const transportPositions=new Float32Array(36*3),transportGeometry=new THREE.BufferGeometry();
  transportGeometry.setAttribute('position',new THREE.BufferAttribute(transportPositions,3).setUsage(THREE.DynamicDrawUsage));
  const transport=new THREE.Points(transportGeometry,new THREE.PointsMaterial({color:'#8fd4d4',size:.032,transparent:true,opacity:.58,depthWrite:false}));transport.visible=false;transport.frustumCulled=false;sample.add(transport);
  // The same cluster in an open hydrothermal fracture. Surrounding rock is only
  // a reversible display mask: no crystal is moved, resized or magically cut.
  const surround=new THREE.Group();quartz.add(surround);
  const wallMaterial=new THREE.MeshStandardMaterial({map:rockMap,bumpMap:rockMap,bumpScale:.03,roughness:.94,metalness:0,side:THREE.DoubleSide,alphaHash:true,opacity:0,depthWrite:true});
  // Connected, thick fracture walls rise from the same basal rock. Their front
  // edges are opened for observation; these are authored volumes, not excavated
  // geometry or a reconstruction of the specimen's original geological site.
  function fractureWall(width:number,depth:number,x:number,z:number,back=false){
    const geometry=new THREE.BoxGeometry(width,1,depth,detail?7:4,detail?10:6,detail?12:7),positions=geometry.getAttribute('position');
    for(let i=0;i<positions.count;i++){
      const px=positions.getX(i)+x,pz=positions.getZ(i)+z,f=positions.getY(i)+.5;
      const top=back?.45+.07*Math.sin(px*4):1.7-2.45*THREE.MathUtils.smoothstep(pz,-.85,.85);
      const edgeNoise=.035*Math.sin(px*11+pz*7)+.025*Math.sin(px*19-pz*13);
      positions.setXYZ(i,px+edgeNoise,-1.73+f*(top+1.73)+edgeNoise*.7,pz+edgeNoise*.6);
    }
    geometry.computeVertexNormals();const wall=new THREE.Mesh(geometry,wallMaterial);
    // The hashed display mask stays in the opaque pass, before transmissive
    // quartz. A later transparent pass would paint rear rock over front facets.
    wall.renderOrder=-1;surround.add(wall);
  }
  fractureWall(3.55,.58,0,-1.48,true);fractureWall(.64,2.75,-1.62,-.34);fractureWall(.64,2.75,1.62,-.34);
  const anchorPosition=exposureAt(100).anchor;
  const anchor=new THREE.Mesh(new THREE.TorusGeometry(.155,.018,6,32),new THREE.MeshBasicMaterial({color:'#f2bb5e',depthTest:false,transparent:true,opacity:.85}));anchor.rotation.x=Math.PI/2;anchor.position.set(...anchorPosition);anchor.renderOrder=8;quartz.add(anchor);
  const floor=new THREE.Mesh(new THREE.CylinderGeometry(1.8,1.86,.14,80),new THREE.MeshStandardMaterial({color:'#233a43',roughness:.6,metalness:.16}));floor.position.y=-1.8;quartz.add(floor);
  const halo=new THREE.PointLight('#e2f2ff',1.2,9,2);halo.position.set(-1,1.5,-2);quartz.add(halo);
  let representation:'carbon'|'quartz'=options.representation??'carbon',disposed=false,growthMode=false;
  const storeCamera=()=>{if(!disposed)options.onCamera(JSON.stringify({position:stage.camera.position.toArray().map(v=>Math.round(v*1e4)/1e4),target:[0,0,0]}));};
  stage.controls.addEventListener('end',storeCamera);stage.canvas.addEventListener('keyup',storeCamera);
  function present(next:'carbon'|'quartz',shear:number,exposure:number){
    if(disposed)return;
    if(representation!==next){stage.camera.position.multiplyScalar(next==='quartz'?.72:1/.72);stage.controls.update();storeCamera();}
    representation=next;scene.background=next==='quartz'?backdrop:new THREE.Color('#0d1d26');renderer.toneMappingExposure=next==='quartz'?.92:.75;carbon.visible=next==='carbon';quartz.visible=next==='quartz';
    for(let i=0;i<layers.length;i++)layers[i].position.x=1.9+(i%2)*.39+graphiteOffset(shear,i)/70;
    const mask=exposureAt(exposure);surround.visible=mask.surroundOpacity>.005;wallMaterial.opacity=mask.surroundOpacity*.68;
    for(const edge of crystalEdges)(edge.material as THREE.LineBasicMaterial).opacity=surround.visible?.12:growthMode?.07:.018;
    stage.canvas.dataset.mineralExposure=String(exposure);stage.canvas.dataset.mineralAnchor=anchorPosition.join(',');
    stage.canvas.dataset.mineralRepresentation=representation;stage.setPaused(false);stage.requestRender();
  }
  const druseScale=new THREE.Matrix4(),druseMatrix=new THREE.Matrix4();
  function scaleDruse(radius:number,height:number){
    druse.visible=height>0.00001;druseScale.makeScale(radius,height,radius);
    for(let i=0;i<druseBases.length;i++){druseMatrix.copy(druseBases[i]).multiply(druseScale);druse.setMatrixAt(i,druseMatrix);}druse.instanceMatrix.needsUpdate=true;
  }
  function update(next:'carbon'|'quartz',shear:number,exposure=100){
    if(disposed)return;
    if(growthMode){
      for(const root of crystalRoots){root.scale.set(1,1,1);root.visible=true;}
      for(let i=0;i<rootContacts.length;i++)rootContacts[i].z=QUARTZ_CLUSTER[i].radius;
      for(const edge of crystalEdges)(edge.material as THREE.LineBasicMaterial).opacity=.018;
      scaleDruse(1,1);transport.visible=false;growthMode=false;
    }
    stage.canvas.dataset.mineralMode='specimen';delete stage.canvas.dataset.mineralGrowth;
    present(next,shear,exposure);
  }
  function updateGrowth(state:Pick<MineralState,'environment'|'rate'|'supply'|'progress'>){
    if(disposed)return;
    const frame=quartzGrowthAt(state);growthMode=true;
    for(let i=0;i<crystalRoots.length;i++){
      const crystal=frame.crystals[i];crystalRoots[i].visible=crystal.visible;
      crystalRoots[i].scale.set(crystal.radiusScale,crystal.heightScale,crystal.radiusScale);
      rootContacts[i].z=QUARTZ_CLUSTER[i].radius*crystal.radiusScale;
      (crystalEdges[i].material as THREE.LineBasicMaterial).opacity=.07;
    }
    scaleDruse(frame.crystals[0].radiusScale,frame.crystals[0].heightScale);
    transport.visible=frame.enabled&&frame.budget.condition==='growing'&&state.progress<100;
    if(transport.visible){
      for(let i=0;i<36;i++){
        const target=QUARTZ_CLUSTER[i%QUARTZ_CLUSTER.length],phase=(state.progress*.022+i*.618033989)%1;
        const angle=i*2.399963,arc=Math.sin(phase*Math.PI),fromX=Math.cos(angle)*1.7,fromZ=Math.sin(angle)*1.3;
        transportPositions[i*3]=fromX*(1-phase)+target.base[0]*phase+arc*.13;
        transportPositions[i*3+1]=2.9*(1-phase)+(target.base[1]+target.height*frame.crystals[0].heightScale*.62)*phase;
        transportPositions[i*3+2]=fromZ*(1-phase)+target.base[2]*phase+arc*.18;
      }
      transportGeometry.attributes.position.needsUpdate=true;
    }
    stage.canvas.dataset.mineralMode='growth';stage.canvas.dataset.mineralGrowth=String(state.progress);
    stage.canvas.dataset.mineralCrystalIds=QUARTZ_CLUSTER.map(c=>c.id).join(',');
    stage.canvas.dataset.mineralCrystalBases=QUARTZ_CLUSTER.map(c=>c.base.join(',')).join(';');
    stage.canvas.dataset.mineralCrystalShare=String(frame.share);
    present('quartz',0,100);
  }
  return {update,updateGrowth,pause(){stage.setPaused(true);},resetCamera(){stage.camera.position.set(...(representation==='quartz'?[4.2,3.1,7.7]:[5.8,4.3,10.7]) as [number,number,number]);stage.controls.target.set(0,0,0);stage.controls.update();stage.setPaused(false);stage.requestRender();storeCamera();},dispose(){if(disposed)return;disposed=true;stage.controls.removeEventListener('end',storeCamera);stage.canvas.removeEventListener('keyup',storeCamera);env.dispose();backdrop.dispose();stage.dispose();}};
}
