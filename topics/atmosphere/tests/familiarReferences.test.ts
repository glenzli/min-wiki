import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { expandedHeight } from '../structureModel.ts';
import { FamiliarAtmosphereReferences } from '../familiarReferences3d.ts';

function objects(model:FamiliarAtmosphereReferences) {
  const plane=model.group.getObjectByName('enlarged-cruise-airplane'),satellite=model.group.getObjectByName('enlarged-low-orbit-satellite');
  assert.ok(plane instanceof THREE.Group&&satellite instanceof THREE.Group);return {plane,satellite};
}

function named(root:THREE.Object3D,name:string) {
  const result:THREE.Object3D[]=[];root.traverse(object=>{if(object.name===name)result.push(object);});return result;
}

function resources(model:FamiliarAtmosphereReferences) {
  const geometry=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),instances=new Set<THREE.InstancedMesh>();
  model.group.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Line) {
    geometry.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);
    if(object instanceof THREE.InstancedMesh)instances.add(object);
  }});return {geometry,materials,instances};
}

test('production airplane has shaped body/glazing, swept surfaces, cabin windows and two genuinely open engine inlets',()=>{
  const model=new FamiliarAtmosphereReferences(),{plane}=objects(model);
  for(const name of ['airplane-fuselage-with-nose','airplane-cockpit-glazing','airplane-swept-wings','airplane-horizontal-tail','airplane-vertical-tail','airplane-door-outlines','airplane-rudder-seam'])assert.ok(plane.getObjectByName(name));
  assert.equal(named(plane,'airplane-wingtip-fence').length,2);
  const windows=plane.getObjectByName('airplane-cabin-windows'),fans=plane.getObjectByName('airplane-retained-fan-blades');
  assert.ok(windows instanceof THREE.InstancedMesh&&windows.count===42);assert.ok(fans instanceof THREE.InstancedMesh&&fans.count===24);
  const nacelles=named(plane,'airplane-open-engine-nacelle'),lips=named(plane,'airplane-intake-lip'),chambers=named(plane,'airplane-recessed-fan-chamber');
  assert.equal(nacelles.length,2);assert.equal(lips.length,2);assert.equal(chambers.length,2);
  for(const nacelle of nacelles) {
    assert.ok(nacelle instanceof THREE.Mesh);const position=nacelle.geometry.getAttribute('position');let minRadius=Infinity;
    for(let i=0;i<position.count;i++)minRadius=Math.min(minRadius,Math.hypot(position.getY(i),position.getZ(i)));
    assert.ok(minRadius>.020); // annular nacelle wall leaves the center open
  }
  assert.ok(chambers.every((chamber,i)=>chamber.position.x<lips[i].position.x-.02));
  const originalPosition=plane.position.clone(),originalRotation=plane.quaternion.clone();plane.position.set(0,0,0);plane.quaternion.identity();plane.updateMatrixWorld(true);
  const size=new THREE.Box3().setFromObject(plane).getSize(new THREE.Vector3());
  assert.ok(size.x>1&&size.x<1.2);assert.ok(size.z>.9&&size.z<1.1);assert.ok(size.y>.2&&size.y<.4);
  plane.position.copy(originalPosition);plane.quaternion.copy(originalRotation);model.dispose();
});

test('generic airliner silhouette follows civil-transport proportions, with a blunt short nose, low fences and short thick nacelles',()=>{
  const model=new FamiliarAtmosphereReferences(),{plane}=objects(model),body=plane.getObjectByName('airplane-fuselage-with-nose');
  assert.ok(body instanceof THREE.Mesh);body.geometry.computeBoundingBox();
  const bounds=body.geometry.boundingBox!,size=bounds.getSize(new THREE.Vector3()),length=size.x,diameter=size.z;
  // Airbus AC A320 2-2-0 (Jul 2025) low-fence three views: 37.57 m
  // length, 3.95 m body width, 34.10 m span; these are loose silhouette
  // guards for a generic teaching object, not a claim of exact CAD parity.
  assert.ok(Math.abs(diameter/length-3.95/37.57)<.006);
  const positions=body.geometry.getAttribute('position'),rings=new Map<number,number>();
  let forwardRadius=0;
  for(let i=0;i<positions.count;i++) {
    const x=positions.getX(i),r=Math.abs(positions.getZ(i));rings.set(x,Math.max(rings.get(x)??0,r));
    if(x>=bounds.max.x-length*.05&&x<=bounds.max.x-length*.025)forwardRadius=Math.max(forwardRadius,r);
  }
  const barrel=[...rings].filter(([,r])=>r>=diameter*.49).map(([x])=>x);
  assert.ok((Math.max(...barrel)-Math.min(...barrel))/length>.60);
  assert.ok(forwardRadius>diameter*.34); // rounded radome retains width near its front
  const wing=plane.getObjectByName('airplane-swept-wings');assert.ok(wing instanceof THREE.Mesh);
  const wp=wing.geometry.getAttribute('position');
  for(let i=0;i<wp.count;i++)if(Math.abs(wp.getZ(i))<diameter*.6)assert.ok(wp.getY(i)<0);
  const fin=plane.getObjectByName('airplane-vertical-tail');assert.ok(fin instanceof THREE.Mesh);fin.geometry.computeBoundingBox();
  const tailHeight=fin.geometry.boundingBox!.getSize(new THREE.Vector3()).y;
  for(const fence of named(plane,'airplane-wingtip-fence')) {
    assert.ok(fence instanceof THREE.Mesh);fence.geometry.computeBoundingBox();const height=fence.geometry.boundingBox!.getSize(new THREE.Vector3()).y;
    assert.ok(height<diameter*.40&&height<tailHeight*.25);
  }
  for(const nacelle of named(plane,'airplane-open-engine-nacelle')) {
    assert.ok(nacelle instanceof THREE.Mesh);nacelle.geometry.computeBoundingBox();const box=nacelle.geometry.boundingBox!.getSize(new THREE.Vector3());
    assert.ok(box.x/length<.13);assert.ok(box.x/Math.max(box.y,box.z)<2);
  }
  plane.position.set(0,0,0);plane.quaternion.identity();plane.updateMatrixWorld(true);
  const overall=new THREE.Box3().setFromObject(plane).getSize(new THREE.Vector3());assert.ok(Math.abs(overall.z/length-34.10/37.57)<.035);
  const tail=plane.getObjectByName('airplane-horizontal-tail');assert.ok(tail instanceof THREE.Mesh);
  const tailBox=new THREE.Box3().setFromObject(tail),tailSpan=tailBox.getSize(new THREE.Vector3()).z;
  assert.ok(tailBox.min.z<0&&tailBox.max.z>0);assert.ok(tailSpan/length>.30&&tailSpan/length<.36);
  model.dispose();
});

test('six cockpit panes form one shoulder-height glazing belt separated only by narrow pillars',()=>{
  const model=new FamiliarAtmosphereReferences(),{plane}=objects(model),glass=plane.getObjectByName('airplane-cockpit-glazing'),body=plane.getObjectByName('airplane-fuselage-with-nose');
  assert.ok(glass instanceof THREE.Mesh&&body instanceof THREE.Mesh);
  const geometry:THREE.BufferGeometry=glass.geometry,p=geometry.getAttribute('position'),index=geometry.index!;assert.equal(geometry.groups.length,6);
  body.geometry.computeBoundingBox();geometry.computeBoundingBox();
  const bodyBounds=body.geometry.boundingBox!,diameter=bodyBounds.getSize(new THREE.Vector3()).z,length=bodyBounds.getSize(new THREE.Vector3()).x,bounds=geometry.boundingBox!;
  assert.ok(bounds.min.x>bodyBounds.max.x-length*.14&&bounds.max.x<bodyBounds.max.x-length*.02);
  assert.ok(bounds.min.y>0&&bounds.max.y<bodyBounds.max.y+diameter*.02);
  assert.ok(bounds.getSize(new THREE.Vector3()).z>diameter*.7);
  const panes=geometry.groups.map(group=>{
    assert.ok(group.count>0);const ids=new Set<number>();
    for(let i=group.start;i<group.start+group.count;i++)ids.add(index.getX(i));
    return [...ids].map(id=>new THREE.Vector3().fromBufferAttribute(p,id));
  });
  // Observe the production panes as a connected chain of near neighbors.
  // Scattered patches may still count as six panes, but fail this guard.
  const neighbors=panes.map(()=>new Set<number>());
  for(let a=0;a<panes.length;a++)for(let b=a+1;b<panes.length;b++) {
    let distance=Infinity;for(const p of panes[a])for(const q of panes[b])distance=Math.min(distance,p.distanceTo(q));
    if(distance<diameter*.025) {
      assert.ok(distance>diameter*.003,'each shared pillar has a finite width');neighbors[a].add(b);neighbors[b].add(a);
    }
  }
  assert.deepEqual(neighbors.map(n=>n.size).sort(),[1,1,2,2,2,2]);
  const seen=new Set<number>(),pending=[0];while(pending.length){const next=pending.pop()!;if(seen.has(next))continue;seen.add(next);pending.push(...neighbors[next]);}
  assert.equal(seen.size,6);model.dispose();
});

test('cockpit glazing faces outward, clears the actual nose triangles and stays visible from front and both sides',()=>{
  const model=new FamiliarAtmosphereReferences(),{plane}=objects(model),glass=plane.getObjectByName('airplane-cockpit-glazing'),body=plane.getObjectByName('airplane-fuselage-with-nose');
  assert.ok(glass instanceof THREE.Mesh&&body instanceof THREE.Mesh);assert.ok(!Array.isArray(glass.material));assert.equal(glass.material.side,THREE.FrontSide);
  plane.position.set(0,0,0);plane.quaternion.identity();model.group.updateMatrixWorld(true);
  body.geometry.computeBoundingBox();const diameter=body.geometry.boundingBox!.getSize(new THREE.Vector3()).z;
  const geometry:THREE.BufferGeometry=glass.geometry,p=geometry.getAttribute('position'),index=geometry.index!,triangles:THREE.Vector3[]=[];
  for(let i=0;i<index.count;i+=3) {
    const [a,b,c]=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(p,index.getX(i+k))),normal=b.clone().sub(a).cross(c.clone().sub(a));
    assert.ok(normal.lengthSq()>1e-18);normal.normalize();const center=a.clone().add(b).add(c).multiplyScalar(1/3);
    assert.ok(normal.dot(new THREE.Vector3(0,center.y,center.z).normalize())>.5,'front-side winding points away from the nose interior');
    triangles.push(center);
    for(const [wa,wb,wc]of [[1/3,1/3,1/3],[.8,.1,.1],[.1,.8,.1],[.1,.1,.8]]) {
      const sample=a.clone().multiplyScalar(wa).addScaledVector(b,wb).addScaledVector(c,wc);
      const ray=new THREE.Raycaster(sample.addScaledVector(normal,.02),normal.clone().negate(),0,.1),hits:THREE.Intersection[]=ray.intersectObjects([body,glass]);
      assert.equal(hits[0]?.object,glass,'glass is not hidden by the body at a face interior');
      const skin=hits.find(hit=>hit.object===body);assert.ok(skin);
      const gap=skin.distance-hits[0].distance;assert.ok(gap>diameter*.003&&gap<diameter*.02,'glazing has small positive clearance, without a floating shell');
    }
  }
  for(const [direction,minimum]of [[new THREE.Vector3(1,.1,0),2],[new THREE.Vector3(0,.1,1),3],[new THREE.Vector3(0,.1,-1),3]] as const) {
    direction.normalize();const visible=new Set<number>();
    for(const center of triangles) {
      const ray=new THREE.Raycaster(center.clone().addScaledVector(direction,.15),direction.clone().negate(),0,.3),hit:THREE.Intersection|undefined=ray.intersectObjects([body,glass])[0];
      if(hit?.object===glass&&hit.faceIndex!==undefined&&hit.faceIndex!==null) {
        const faceStart=hit.faceIndex*3,pane=geometry.groups.findIndex(group=>faceStart>=group.start&&faceStart<group.start+group.count);
        assert.notEqual(pane,-1);visible.add(pane);
      }
    }
    assert.ok(visible.size>=minimum,`visible pane count ${visible.size} from ${direction.toArray()}`);
  }
  model.dispose();
});

test('generic satellite owns framed, supported cell arrays, a black radiator and actual instrument/antenna geometry',()=>{
  const model=new FamiliarAtmosphereReferences(),{satellite}=objects(model);
  for(const name of ['satellite-thermal-insulated-bus','satellite-black-radiator','satellite-nadir-instrument-housing','satellite-nadir-instrument-aperture','satellite-communication-antenna','satellite-parabolic-reflector','satellite-secondary-antenna'])assert.ok(satellite.getObjectByName(name));
  const cells=satellite.getObjectByName('satellite-blue-solar-cells'),bars=satellite.getObjectByName('satellite-solar-cell-busbars');
  assert.ok(cells instanceof THREE.InstancedMesh&&cells.count===96&&cells.instanceColor);
  assert.ok(bars instanceof THREE.InstancedMesh&&bars.count===192);
  assert.equal(named(satellite,'satellite-solar-array-backing').length,2);assert.equal(named(satellite,'satellite-solar-array-frame').length,8);assert.equal(named(satellite,'satellite-array-support').length,4);
  assert.equal(named(satellite,'satellite-feed-support').length,3);
  const radiator=satellite.getObjectByName('satellite-black-radiator') as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
  assert.ok(radiator.material.color.getHSL({h:0,s:0,l:0}).l<.1);
  const originalPosition=satellite.position.clone(),originalRotation=satellite.quaternion.clone();satellite.position.set(0,0,0);satellite.quaternion.identity();satellite.updateMatrixWorld(true);
  const size=new THREE.Box3().setFromObject(satellite).getSize(new THREE.Vector3());assert.ok(size.x>1.25&&size.x<1.4);
  satellite.position.copy(originalPosition);satellite.quaternion.copy(originalRotation);model.dispose();
});

test('all production geometry is finite with unit normals; shaped fuselage, wings and reflector are closed and consistently outward',()=>{
  const model=new FamiliarAtmosphereReferences(),owned=resources(model);
  for(const geometry of owned.geometry) {
    const p=geometry.getAttribute('position'),n=geometry.getAttribute('normal');assert.ok(p.array.every(Number.isFinite));
    if(n)for(let i=0;i<n.count;i++)assert.ok(Math.abs(new THREE.Vector3().fromBufferAttribute(n,i).length()-1)<1e-5);
    if(geometry.index)assert.ok(geometry.index.array.every(index=>index<p.count));
  }
  for(const name of ['airplane-fuselage-with-nose','airplane-swept-wings','satellite-parabolic-reflector']) {
    const mesh=model.group.getObjectByName(name);assert.ok(mesh instanceof THREE.Mesh);const geometry=mesh.geometry,index=geometry.index!,p=geometry.getAttribute('position'),edges=new Map<string,{count:number;direction:number}>();let volume=0;
    for(let i=0;i<index.count;i+=3) {
      const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];
      for(let j=0;j<3;j++) {const a=ids[j],b=ids[(j+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`,old=edges.get(key)??{count:0,direction:0};edges.set(key,{count:old.count+1,direction:old.direction+(a<b?1:-1)});}
      const [a,b,c]=ids.map(id=>new THREE.Vector3().fromBufferAttribute(p,id));volume+=a.dot(b.cross(c))/6;
    }
    assert.ok([...edges.values()].every(edge=>edge.count===2&&edge.direction===0),name);assert.ok(volume>0,name);
  }
  model.dispose();
});

test('airplane physical +X nose follows actual position velocity through the whole ellipse and turns without inverting',()=>{
  const model=new FamiliarAtmosphereReferences(),{plane}=objects(model),period=Math.PI*2/.042,h=.001;
  let previous:THREE.Quaternion|undefined;
  for(let i=0;i<=720;i++) {
    const time=i/720*period;
    model.update(time-h);const before=plane.position.clone();model.update(time+h);const velocity=plane.position.clone().sub(before).normalize();model.update(time);
    const nose=new THREE.Vector3(1,0,0).applyQuaternion(plane.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(plane.quaternion);
    assert.ok(nose.dot(velocity)>.99999,`backward heading at ${time}`);
    assert.ok(up.dot(new THREE.Vector3(.048*plane.position.x,1,.028*plane.position.z).normalize())>.94);
    if(previous)assert.ok(previous.angleTo(plane.quaternion)<.06);
    previous=plane.quaternion.clone();
    assert.ok(Math.abs(plane.position.x-1.55*Math.sin(time*.042))<1e-12);
    assert.ok(Math.abs(plane.position.z-(.45+.50*Math.cos(time*.042)))<1e-12);
  }
  model.dispose();
});

test('airplane center stays within the bounded close-view envelope throughout its path',()=>{
  const model=new FamiliarAtmosphereReferences(),{plane}=objects(model),height=expandedHeight('earth',12);
  for(let i=0;i<=720;i++) {
    model.update(i/720*Math.PI*2/.042);
    assert.ok(Math.abs(plane.position.x)<=1.55+1e-12);
    assert.ok(plane.position.z>=-.05-1e-12&&plane.position.z<=.95+1e-12);
    assert.ok(plane.position.y>=height-.071&&plane.position.y<=height);
  }
  model.dispose();
});

test('reference heights use the same expanded mapping and full display curvature, with continuous and reversible supplied-time motion',()=>{
  const model=new FamiliarAtmosphereReferences(),{plane,satellite}=objects(model);
  for(const seconds of [-300,-1,0,1,12,37,75,120,250,500]) {
    model.update(seconds);
    for(const [object,height]of [[plane,12],[satellite,824]] as const)assert.ok(Math.abs(object.position.y+.024*object.position.x**2+.014*object.position.z**2-expandedHeight('earth',height))<1e-12);
    const first={p:plane.position.clone(),q:plane.quaternion.clone(),s:satellite.position.clone(),sq:satellite.quaternion.clone()};
    model.update(seconds+20);model.update(seconds);assert.deepEqual(plane.position,first.p);assert.deepEqual(plane.quaternion.toArray(),first.q.toArray());assert.deepEqual(satellite.position,first.s);assert.deepEqual(satellite.quaternion.toArray(),first.sq.toArray());
  }
  for(const time of [0,Math.PI/.084,Math.PI/.042,Math.PI*2/.042,Math.PI*2/.023]) {
    model.update(time-.0001);const p=plane.position.clone(),q=plane.quaternion.clone(),s=satellite.position.clone(),sq=satellite.quaternion.clone();model.update(time+.0001);
    assert.ok(plane.position.distanceTo(p)<.0001&&satellite.position.distanceTo(s)<.0001);
    assert.ok(plane.quaternion.angleTo(q)<.0001&&satellite.quaternion.angleTo(sq)<.0001);
  }
  model.update(NaN);const invalid=plane.position.clone();model.update(0);assert.deepEqual(plane.position,invalid);model.dispose();
});

test('updates retain fixed geometry, material and instance buffers, with exact resource accounting below 150 KB',()=>{
  const model=new FamiliarAtmosphereReferences(),before=resources(model),arrays=[...before.geometry].map(g=>g.getAttribute('position').array),instanceArrays=[...before.instances].map(i=>i.instanceMatrix.array),bytes=model.resourceBytes;
  let payload=0;for(const geometry of before.geometry){for(const attribute of Object.values(geometry.attributes))payload+=attribute.array.byteLength;payload+=geometry.index?.array.byteLength??0;}
  for(const instance of before.instances)payload+=instance.instanceMatrix.array.byteLength+(instance.instanceColor?.array.byteLength??0);
  assert.equal(bytes,payload);assert.ok(bytes>50_000&&bytes<150_000);assert.equal(before.instances.size,5);
  for(let i=0;i<1000;i++)model.update(i*.3);
  assert.deepEqual(resources(model),before);assert.equal(model.resourceBytes,bytes);
  assert.ok([...before.geometry].every((g,i)=>g.getAttribute('position').array===arrays[i]));assert.ok([...before.instances].every((g,i)=>g.instanceMatrix.array===instanceArrays[i]));
  for(const material of before.materials)if(material instanceof THREE.MeshStandardMaterial)assert.equal(material.map,null);
  model.dispose();
});

test('shared geometry, materials and per-instance renderer resources dispose exactly once',()=>{
  const model=new FamiliarAtmosphereReferences(),owned=resources(model),count=new Map<object,number>();
  for(const resource of owned.geometry)resource.addEventListener('dispose',()=>count.set(resource,(count.get(resource)??0)+1));
  for(const resource of owned.materials)resource.addEventListener('dispose',()=>count.set(resource,(count.get(resource)??0)+1));
  for(const resource of owned.instances)resource.addEventListener('dispose',()=>count.set(resource,(count.get(resource)??0)+1));
  model.dispose();model.dispose();model.update(99);
  assert.equal(count.size,owned.geometry.size+owned.materials.size+owned.instances.size);assert.ok([...count.values()].every(n=>n===1));assert.equal(model.group.children.length,0);assert.equal(model.resourceBytes,0);
});
