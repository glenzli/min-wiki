import * as THREE from 'three';
import { createThreeStage } from '../earth/threeStage.ts';
import { DETAIL, SMALL_DETAIL, buildCutEdge, buildTerrain, createIceGeometry, materialShape, updateIceEnvelope, updateIceTop, updateMoraine, updateRiver } from './glacier3d/geometry';
import { cutMaterial, debrisMaterial, iceMaterial, terrainMaterial, waterMaterial } from './glacier3d/materials';
import {GLACIER_TRACERS,glacierTracers} from './glacierTracers';

/** Original hypothetical valley; the scalar budget changes one glacier, not the fixed terrain. */
export function mountGlacier3D(host: HTMLElement, label: string, onUnavailable: () => void) {
  const stage = createThreeStage(host, {
    label, cameraPosition: [3.1, 7.6, 16.5], target: [0, 1.25, -.65], minDistance: 8, maxDistance: 24,
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
  land.castShadow = true; land.receiveShadow = true; cut.receiveShadow = true;
  stage.group.add(land, cut);
  const topGeometry = createIceGeometry(tier).geometry;
  const ice = iceMaterial(); ice.vertexColors = true;
  const top = new THREE.Mesh(topGeometry, ice);
  const envelope = new THREE.Mesh(new THREE.BufferGeometry(), iceMaterial());
  top.castShadow = true; top.receiveShadow = true; envelope.receiveShadow = true;
  const debris = debrisMaterial(); debris.side = THREE.DoubleSide;
  const moraineLeft = new THREE.Mesh(new THREE.BufferGeometry(), debris), moraineRight = new THREE.Mesh(new THREE.BufferGeometry(), debris);
  const stream = new THREE.Mesh(new THREE.BufferGeometry(), waterMaterial());
  const iceGroup = new THREE.Group(); iceGroup.add(top, envelope, moraineLeft, moraineRight, stream); stage.group.add(iceGroup);
  const tracerGeometry=new THREE.ConeGeometry(.105,.28,3,1);tracerGeometry.rotateX(Math.PI/2);
  const tracerMesh=new THREE.InstancedMesh(tracerGeometry,new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false}),GLACIER_TRACERS.length);stage.group.add(tracerMesh);
  const labels=GLACIER_TRACERS.map(source=>{const span=document.createElement('span');span.className='climate-tracer-label';span.dataset.tracerId=source.id;span.style.setProperty('--tracer-color',source.color);host.append(span);return span;});
  const matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),position=new THREE.Vector3(),direction=new THREE.Vector3(),one=new THREE.Vector3(1,1,1),projected=new THREE.Vector3();
  let disposed = false, previous = NaN,previousRound=NaN,resizeFrame=0,currentTracers=glacierTracers(60,0);
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
  function update(mass: number,observationRound=0) {
    if (disposed) return;
    const shape = materialShape(mass);
    const nextTracers=glacierTracers(shape.mass,observationRound),massChanged=shape.mass!==previous;
    if (!massChanged&&nextTracers.round===previousRound) return;
    previous = shape.mass;previousRound=nextTracers.round;currentTracers=nextTracers;iceGroup.visible = shape.mass > 0;
    if (massChanged&&shape.mass > 0) {
      updateIceTop(topGeometry, tier, shape); updateIceEnvelope(envelope.geometry, tier, shape);
      updateMoraine(moraineLeft.geometry, tier, shape, -1); updateMoraine(moraineRight.geometry, tier, shape, 1);
      updateRiver(stream.geometry, tier, shape);
    }
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
    if(massChanged)stage.renderer.shadowMap.needsUpdate = true;
    stage.requestRender();
  }
  update(60);
  return {
    update,
    pause() { stage.setPaused(true); },
    resume() { stage.setPaused(false); },
    dispose() { if (disposed) return; disposed = true;cancelAnimationFrame(resizeFrame);observer.disconnect();stage.controls.removeEventListener('change',locateTracers);labels.forEach(label=>label.remove());events.abort(); for (const light of lights) if (light instanceof THREE.DirectionalLight) light.shadow.dispose(); stage.dispose(); },
  };
}
