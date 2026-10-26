import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {PARCEL_CELLS} from '../parcelFrame.ts';
import {createParcelGeometries} from '../parcelGeometry.ts';

test('fracture batches are closed full-volume chunks with stable source coordinates',()=>{
  const first=createParcelGeometries(),second=createParcelGeometries();
  assert.equal(first.geometries.length,24);let volume=0,triangles=0;
  first.geometries.forEach((geometry,id)=>{
    const positions=geometry.getAttribute('position'),origins=geometry.getAttribute('rockOrigin'),center=PARCEL_CELLS[id].center;
    assert.ok(positions.count>12);assert.equal(positions.count%3,0);assert.deepEqual(positions.array,second.geometries[id].getAttribute('position').array);
    const a=new Vector3(),b=new Vector3(),c=new Vector3();let signedVolume=0;
    for(let i=0;i<positions.count;i++){
      assert.ok(Number.isFinite(positions.getX(i))&&Number.isFinite(positions.getY(i))&&Number.isFinite(positions.getZ(i)));
      assert.ok(Math.abs(positions.getX(i)+center.x-origins.getX(i))<2e-7);
      assert.ok(Math.abs(positions.getY(i)+center.y-origins.getY(i))<2e-7);
      assert.ok(Math.abs(positions.getZ(i)+center.z-origins.getZ(i))<2e-7);
    }
    for(let i=0;i<positions.count;i+=3){a.fromBufferAttribute(positions,i);b.fromBufferAttribute(positions,i+1);c.fromBufferAttribute(positions,i+2);signedVolume+=a.dot(b.cross(c))/6;}
    assert.ok(signedVolume>.01,`batch ${id} has a closed outward volume`);volume+=signedVolume;triangles+=positions.count/3;
    const size=geometry.boundingBox.getSize(new Vector3());assert.ok(Math.min(size.x,size.y,size.z)/Math.max(size.x,size.y,size.z)>.2,`batch ${id} is volumetric`);
  });
  assert.ok(volume>3.8&&volume<4.5);assert.ok(triangles<5000);
  [...first.geometries,...second.geometries].forEach(geometry=>geometry.dispose());
});
