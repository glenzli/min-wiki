import * as THREE from 'three';
import { createThreeStage } from '../earth/threeStage.ts';
import { DETAIL, SMALL_DETAIL, buildCutEdge, buildTerrain, createIceGeometry, materialShape, updateIceEnvelope, updateIceTop, updateMoraine, updateRiver } from './glacier3d/geometry';
import { cutMaterial, debrisMaterial, iceMaterial, terrainMaterial, waterMaterial } from './glacier3d/materials';
import {glacierPoint,iceShape,terrainHeight,noise2,LAND_BOUNDS} from './glacier3d/landform';
import {GLACIER_TRACERS,glacierTracers} from './glacierTracers';

/** Original hypothetical valley; the scalar budget changes one glacier, not the fixed terrain. */
export function mountGlacier3D(host: HTMLElement, label: string, onUnavailable: () => void) {
  const stage = createThreeStage(host, {
    label, cameraPosition: [1.3, 5.2, 9.2], target: [0, .9, -.5], minDistance: 4.5, maxDistance: 24,
    background: '#e4ebe9', onUnavailable,
  });
  const tier = matchMedia('(pointer: coarse)').matches || innerWidth < 700 ? SMALL_DETAIL : DETAIL;
  stage.controls.minPolarAngle = .24; stage.controls.maxPolarAngle = Math.PI * .46;
  stage.renderer.toneMappingExposure = .94;
  stage.renderer.shadowMap.enabled = true;
  stage.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.renderer.shadowMap.autoUpdate = false;
  stage.scene.fog = new THREE.Fog('#e4ebe9', 24, 47);
  const lights = stage.scene.children.filter(object => object instanceof THREE.Light) as THREE.Light[];
  for (const light of lights) {
    if (light instanceof THREE.HemisphereLight) { light.color.set('#dce8ed'); light.groundColor.set('#626451'); light.intensity = 1.3; }
    else if (light instanceof THREE.DirectionalLight) {
      if (light.position.x < 0) {
        light.position.set(-5.5, 11, 7); light.color.set('#fff0d3'); light.intensity = 2.45;
        light.castShadow = true; light.shadow.mapSize.set(512, 512);
        light.shadow.camera.left = -8; light.shadow.camera.right = 8; light.shadow.camera.top = 9; light.shadow.camera.bottom = -7;
        light.shadow.camera.near = 1; light.shadow.camera.far = 30; light.shadow.bias = -.00045; light.shadow.normalBias = .025;
      }
      else { light.position.set(5, 4, -5); light.color.set('#b7d2df'); light.intensity = .65; }
    }
  }
  const land = new THREE.Mesh(buildTerrain(tier), terrainMaterial());
  const cut = new THREE.Mesh(buildCutEdge(tier), cutMaterial());
  cut.visible=false;
  land.castShadow = true; land.receiveShadow = true; cut.receiveShadow = true;
  stage.group.add(land, cut);
  // A quiet, lower-detail horizon grounds the fixed observation valley.
  const farGeometry=new THREE.PlaneGeometry(65,65,72,72);farGeometry.rotateX(-Math.PI/2);
  const farPositions=farGeometry.getAttribute('position');
  for(let i=0;i<farPositions.count;i++){
    const x=farPositions.getX(i),z=farPositions.getZ(i),edge=Math.max(Math.abs(x)/4.6,Math.abs(z)/5.8),blend=Math.min(1,Math.max(0,(edge-1)*.8));
    const ridge=Math.pow(1-Math.abs(noise2(x*.21+17,z*.19)*2-1),2)*4.5+noise2(x*.4,z*.3)*1.3;
    farPositions.setY(i,LAND_BOUNDS.base+blend*ridge);
  }
  farGeometry.computeVertexNormals();const horizon=new THREE.Mesh(farGeometry,terrainMaterial());stage.group.add(horizon);

  const topGeometry = createIceGeometry(tier).geometry;
  const ice = iceMaterial(); ice.vertexColors = true;
  const top = new THREE.Mesh(topGeometry, ice);
  const envelope = new THREE.Mesh(new THREE.BufferGeometry(), iceMaterial());
  top.castShadow = true; top.receiveShadow = true; envelope.receiveShadow = true;
  const debris = debrisMaterial(); debris.side = THREE.DoubleSide;
  const moraineLeft = new THREE.Mesh(new THREE.BufferGeometry(), debris), moraineRight = new THREE.Mesh(new THREE.BufferGeometry(), debris);
  const stream = new THREE.Mesh(new THREE.BufferGeometry(), waterMaterial());
  const iceGroup = new THREE.Group(); iceGroup.add(top, envelope, moraineLeft, moraineRight, stream); stage.group.add(iceGroup);
  const tracerGeometry=new THREE.IcosahedronGeometry(.07,1);tracerGeometry.scale(1.6,.6,1);
  const tracerMesh=new THREE.InstancedMesh(tracerGeometry,new THREE.MeshStandardMaterial({color:'#5b6258',roughness:.94}),GLACIER_TRACERS.length);stage.group.add(tracerMesh);
  const labels=GLACIER_TRACERS.map(source=>{const span=document.createElement('span');span.className='climate-tracer-label';span.dataset.tracerId=source.id;span.style.setProperty('--tracer-color',source.color);host.append(span);return span;});
  const snowGeometry=new THREE.BufferGeometry(),snowPositions=new Float32Array(180*3);
  snowGeometry.setAttribute('position',new THREE.BufferAttribute(snowPositions,3));
  const snow=new THREE.Points(snowGeometry,new THREE.PointsMaterial({color:'#f9ffff',size:.035,sizeAttenuation:true,transparent:true,opacity:.7,depthWrite:false}));stage.group.add(snow);
  const rubble=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.065,0),debrisMaterial(),72);stage.group.add(rubble);
  const rubbleMatrix=new THREE.Matrix4(),rubblePosition=new THREE.Vector3(),rubbleRotation=new THREE.Quaternion(),rubbleSize=new THREE.Vector3();
  const matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),position=new THREE.Vector3(),direction=new THREE.Vector3(),one=new THREE.Vector3(1,1,1),projected=new THREE.Vector3();
  let disposed = false, previous = NaN,previousRound=NaN,previousSnow=NaN,previousLoss=NaN,resizeFrame=0,currentTracers=glacierTracers(60,0);
  function locateTracers(){
    if(disposed)return;stage.camera.updateMatrixWorld();
    currentTracers.markers.forEach((marker,i)=>{
      projected.set(marker.x,marker.y+.10,marker.z).project(stage.camera);
      labels[i].style.left=`${(projected.x*.5+.5)*100}%`;labels[i].style.top=`${(-projected.y*.5+.5)*100}%`;
    });
  }
  stage.controls.addEventListener('change',locateTracers);
  const observer=new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(locateTracers);});observer.observe(host);
  const events = new AbortController();
  const resumeVisible = () => { if (!document.hidden && host.getClientRects().length) stage.setPaused(false); };
  for (const name of ['pointerdown', 'wheel', 'keydown']) stage.canvas.addEventListener(name, resumeVisible, { signal: events.signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stage.setPaused(true); else resumeVisible(); }, { signal: events.signal });
  function update(mass: number,observationRound=0,accumulation=4,ablation=7) {
    if (disposed) return;
    const shape = materialShape(mass);
    const nextTracers=glacierTracers(shape.mass,observationRound),massChanged=shape.mass!==previous;
    if (!massChanged&&nextTracers.round===previousRound&&accumulation===previousSnow&&ablation===previousLoss) return;
    previousSnow=accumulation;previousLoss=ablation;
    previous = shape.mass;previousRound=nextTracers.round;currentTracers=nextTracers;iceGroup.visible = shape.mass > 0;
    if (shape.mass > 0) {
      updateIceTop(topGeometry, tier, shape,observationRound); updateIceEnvelope(envelope.geometry, tier, shape,observationRound);
      updateMoraine(moraineLeft.geometry, tier, shape, -1); updateMoraine(moraineRight.geometry, tier, shape, 1);
      updateRiver(stream.geometry, tier, shape);
    }
    for(let i=0;i<180;i++){
      const z=-4.9+noise2(i*7,3)*2.35,x=(noise2(i,8)-.5)*2.0,base=terrainHeight(x,z),phase=(noise2(i,4)+observationRound*.23)%1;
      snowPositions.set([x,base+.12+(1-phase)*2.0,z],i*3);
    }
    snow.visible=accumulation>0;snowGeometry.setDrawRange(0,Math.round(Math.min(10,Math.max(0,accumulation))*18));snowGeometry.getAttribute('position').needsUpdate=true;
    for(let i=0;i<72;i++){
      const u=.3+(i%36)/36*.69,v=(i<36?-1:1)*(.91+noise2(i,6)*.08),p=glacierPoint(shape,u,v);
      rubblePosition.set(p.x,p.y+.016,p.z);const r=.35+noise2(i,2)*1.2;rubbleSize.set(r,r*.6,r*1.2);rubbleRotation.setFromEuler(new THREE.Euler(i*.81,i*.34,i*.15));rubbleMatrix.compose(rubblePosition,rubbleRotation,rubbleSize);rubble.setMatrixAt(i,rubbleMatrix);
    }
    rubble.visible=shape.mass>0;rubble.instanceMatrix.needsUpdate=true;rubble.computeBoundingSphere();
    currentTracers.markers.forEach((marker,i)=>{
      position.set(marker.x,marker.y+.10,marker.z);direction.set(marker.direction.x,marker.direction.y,marker.direction.z).normalize();
      quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),direction);matrix.compose(position,quaternion,one);tracerMesh.setMatrixAt(i,matrix);
      tracerMesh.setColorAt(i,new THREE.Color(marker.tracked?marker.color:'#9ba1a2'));
      labels[i].textContent=marker.id+(marker.tracked?'':'†');labels[i].dataset.tracked=String(marker.tracked);
    });
    tracerMesh.instanceMatrix.needsUpdate=true;if(tracerMesh.instanceColor)tracerMesh.instanceColor.needsUpdate=true;tracerMesh.computeBoundingSphere();locateTracers();
    stage.canvas.dataset.glacierMass = String(shape.mass);
    stage.canvas.dataset.glacierEnd = shape.end.toFixed(4);
    stage.canvas.dataset.detailTier = tier === DETAIL ? 'detailed' : 'small';
    stage.canvas.dataset.glacierRound=String(currentTracers.round);stage.canvas.dataset.glacierTracers=JSON.stringify(currentTracers.markers.map(m=>({id:m.id,z:m.z,tracked:m.tracked})));
    stage.renderer.shadowMap.needsUpdate = true;
    stage.requestRender();
  }
  update(60);
  return {
    update,
    pause() { stage.setPaused(true); },
    resume() { stage.setPaused(false); },
    dispose() { if (disposed) return; disposed = true;cancelAnimationFrame(resizeFrame);observer.disconnect();stage.controls.removeEventListener('change',locateTracers);labels.forEach(label=>label.remove());events.abort();tracerMesh.dispose();rubble.dispose(); for (const light of lights) if (light instanceof THREE.DirectionalLight) light.shadow.dispose(); stage.dispose(); },
  };
}
