import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { AtmosphereStructureWorld } from '../structureScene.ts';
import { auroraPoint, cloudExamples, cloudSample, defaultPhenomena, makeRainSample, meteorPoint, meteorSample, phenomenonFocus, precipitationSource, rainSample, readPhenomenonQuery, windSample, writePhenomenonQuery } from '../phenomenaModel.ts';
import { expandedAltitude, expandedHeight, structureGround } from '../structureModel.ts';

test('production rain samples retain their birth cloud and land on the same visible ground/water',()=>{
  for(const world of ['earth','titan'] as const)for(const time of [0,.6,3,9,27,71]){
    const source=precipitationSource(world,time);
    for(let i=0;i<216;i++){
      const q=rainSample(world,i,time);
      assert.ok([q.x,q.y,q.z,q.top,q.ground,q.tail].every(Number.isFinite));
      assert.ok(Math.abs(q.ground-structureGround(world,q.x,q.z)-.012)<1e-12);
      assert.ok(q.y>=q.ground&&q.tail<=source.y+1e-12&&q.tail>=q.y);
      const origin=precipitationSource(world,q.born);
      assert.equal(q.sourceX,origin.x);assert.equal(q.sourceZ,origin.z);assert.equal(q.top,origin.y);
      assert.ok(q.x-q.sourceX>-.57&&q.x-q.sourceX<1.15&&Math.abs(q.z-q.sourceZ)<.30);
      assert.ok(q.x>=-4.2&&q.x<=4.2&&Math.abs(q.z)<=2.1);
      assert.deepEqual(q,rainSample(world,i,time));
    }
  }
});

test('rain becomes visible within the parent volume, then falls without shifting the whole column',()=>{
  for(const world of ['earth','titan'] as const){
    const model=new AtmosphereStructureWorld(world),cloud=model.scene.getObjectByName('illustrative-cumulus-volume') as THREE.Mesh<THREE.BoxGeometry,THREE.ShaderMaterial>;
    const texture=cloud.material.uniforms.uDensity.value as THREE.Data3DTexture,data=texture.image.data;
    for(let i=0;i<216;i++){
      const sample=rainSample(world,i,4),start=rainSample(world,i,sample.born+1e-7),origin=precipitationSource(world,start.born);
      assert.ok(start.fall<1e-6&&start.opacity<1e-6);
      const nx=(start.x-origin.x)/cloud.scale.x,ny=(origin.y-cloud.position.y)/cloud.scale.y,nz=(start.z-origin.z)/cloud.scale.z;
      assert.ok(Math.abs(ny+.279)<1e-12);
      const x=Math.round((nx+.5)*71),y=Math.round((ny+.5)*51),z=Math.round((nz+.5)*39);
      assert.ok(data[x+72*(y+52*z)]>30,`${world} drop ${i} begins in an empty voxel`);
      const older=rainSample(world,i,sample.born+.35),later=rainSample(world,i,sample.born+.75);
      assert.equal(older.born,later.born);assert.ok(later.y<older.y&&later.x>older.x);
      const current=precipitationSource(world,sample.born+.75);
      assert.ok(Math.abs(later.x-current.x)<.8); // still under the moving parent footprint
    }
    model.dispose();
  }
  const out=makeRainSample();assert.equal(rainSample('earth',4,2,out),out);assert.equal(rainSample('earth',4,5,out),out);
  const wind={x:0,y:0,z:0,alpha:0};assert.equal(windSample(3,2,false,wind),wind);assert.equal(windSample(3,5,false,wind),wind);
});

test('a rain contact appears only after that drop arrives and stays at its landing coordinate',()=>{
  let found=false;
  for(let time=0;time<4;time+=.01){
    const sample=rainSample('earth',0,time);
    if(sample.splash<.1)continue;
    const next=rainSample('earth',0,time+.001);found=true;
    assert.equal(sample.fall,1);assert.equal(sample.opacity,0);assert.equal(sample.y,sample.ground);
    assert.equal(next.born,sample.born);assert.equal(next.x,sample.x);assert.equal(next.z,sample.z);assert.equal(next.ground,sample.ground);break;
  }
  assert.equal(found,true);
  const world=new AtmosphereStructureWorld('earth');world.update('weather',1,null,3,defaultPhenomena);
  const splash=world.scene.getObjectByName('rain-contact-splashes') as THREE.Points<THREE.BufferGeometry,THREE.ShaderMaterial>;
  const opacity=splash.geometry.getAttribute('aOpacity');assert.ok(opacity.array.some(n=>n>0));assert.ok(opacity.array.some(n=>n===0));
  for(let i=0;i<36;i++)assert.ok(Math.abs(opacity.getX(i)-rainSample('earth',i*6,1).splash*.6)<1e-6);
  world.dispose();
});

test('dominant transport is directional while finite crossings and tracking stay continuous',()=>{
  assert.deepEqual(phenomenonFocus('earth','weather'),{x:-.55,y:.66,z:.25,span:1.08,width:2.85});
  for(const world of ['earth','titan'] as const){
    const id=world==='earth'?'weather':'methane-cloud',speed=cloudExamples[world][0].speed;
    const period=6.3/speed,wrap=(3-cloudExamples[world][0].x)/speed;
    for(let i=0;i<=1200;i++){
      const time=period*i/1200,frame=phenomenonFocus(world,id,time),next=phenomenonFocus(world,id,time+.001);
      assert.ok(Math.abs(next.x-frame.x)<.004);
      for(let n=0;n<216;n+=6){
        const rain=rainSample(world,n,time);if(rain.opacity<.02&&rain.splash<.02)continue;
        const born=precipitationSource(world,rain.born);
        assert.ok(born.x>=frame.x-frame.width&&born.x<=frame.x+frame.width,`${world} rain source leaves close view`);
        assert.ok(rain.x>=frame.x-frame.width&&rain.x<=frame.x+frame.width,`${world} landing leaves close view`);
        assert.ok(rain.ground>=frame.y-frame.span&&rain.top<=frame.y+frame.span);
      }
    }
    for(const time of [wrap-.001,wrap,wrap+.001]){
      assert.ok(cloudSample(world,0,time).opacity<1e-5);
      assert.ok(Math.abs(phenomenonFocus(world,id,time).x)<1e-4);
      for(let i=0;i<216;i++)assert.equal(rainSample(world,i,time).opacity,0);
    }
    const first=cloudSample(world,0,2),second=cloudSample(world,0,7);
    assert.ok(second.x-first.x>=speed*4.99);assert.deepEqual(cloudSample(world,0,2),first);
  }
});

test('phenomenon choices and independent close selections survive navigation while retaining journey parameters',()=>{
  const earth={...defaultPhenomena,weather:'dry' as const,aurora:false,meteorOutcome:'fragment' as const},titan={...defaultPhenomena,weather:'rain' as const};
  const q=writePhenomenonQuery('?lang=en&view=worlds&world=titan&journey=0.61',earth,titan,false,[{world:'earth',id:'ozone'},{world:'titan',id:'methane-cloud'}]);
  assert.equal(q.get('journey'),'0.61');assert.equal(q.get('lang'),'en');
  assert.deepEqual(readPhenomenonQuery(q.toString()),{earth,titan,clues:false,composition:false,detail:[{world:'earth',id:'ozone'},{world:'titan',id:'methane-cloud'}]});
  const invalid=readPhenomenonQuery('?detail=moon.weather,unknown.x&weatherCase=storm&entryOutcome=all-burn');assert.deepEqual(invalid.detail,[]);assert.equal(invalid.earth.weather,'rain');assert.equal(invalid.earth.meteorOutcome,'fade');
});

test('clear, cloud-only and rain cases affect actual retained cloud and precipitation objects',()=>{
  const world=new AtmosphereStructureWorld('earth');
  const rain=world.scene.getObjectByName('cloud-grown-rain')!;
  const clouds:THREE.Mesh<THREE.BoxGeometry,THREE.ShaderMaterial>[]=[];
  world.scene.traverse(o=>{if(o instanceof THREE.Mesh&&o.name==='illustrative-cumulus-volume')clouds.push(o);});
  world.update('weather',2,null,3,{...defaultPhenomena,weather:'dry'});
  assert.equal(rain.visible,false);assert.ok(clouds.every(c=>c.material.uniforms.uOpacity.value===0));
  world.update('weather',2,null,3,{...defaultPhenomena,weather:'cloud'});
  assert.equal(rain.visible,false);assert.ok(clouds[0].material.uniforms.uOpacity.value>.5);
  world.update('weather',2,null,3,{...defaultPhenomena,weather:'rain'});
  assert.equal(rain.visible,true);assert.equal(world.scene.getObjectByName('rain-contact-splashes')!.visible,true);
  const density=clouds[0].material.uniforms.uDensity.value,positions=clouds[0].geometry.getAttribute('position').array,evolution=clouds[0].material.uniforms.uEvolution.value.clone();
  world.update('weather',12,null,3,defaultPhenomena);
  assert.equal(clouds[0].material.uniforms.uDensity.value,density);assert.equal(clouds[0].geometry.getAttribute('position').array,positions);assert.notDeepEqual(clouds[0].material.uniforms.uEvolution.value,evolution);
  assert.equal(clouds[0].userData.cloudShape,'cumulus');
  world.dispose();
});

test('hiding explanation removes invisible cues while visible natural phenomena remain',()=>{
  const world=new AtmosphereStructureWorld('earth');
  world.update('weather',2,null,3,{...defaultPhenomena,clues:false});
  assert.equal(world.scene.getObjectByName('enlarged-wind-tracers')!.visible,false);
  assert.equal(world.scene.getObjectByName('cloud-grown-rain')!.visible,true);
  assert.equal(world.scene.getObjectByName('reference-meteoroid-path')!.visible,true);
  assert.equal(world.scene.getObjectByName('folded-polar-aurora-0')!.visible,true);
  world.update('ozone',2,null,25,{...defaultPhenomena,clues:false});
  assert.equal(world.scene.getObjectByName('ozone-absorption-rays')!.visible,false);
  world.update('escape',2,null,850,{...defaultPhenomena,clues:false});
  assert.equal(world.scene.getObjectByName('enlarged-bound-and-escape-paths')!.visible,false);
  world.dispose();
});

test('optional downward UV rays fade through the absorbing region without glowing balls or expanding flashes',()=>{
  const world=new AtmosphereStructureWorld('earth');
  world.update('ozone',.6,null,25,defaultPhenomena);
  const group=world.scene.getObjectByName('ozone-absorption-rays')!;assert.equal(group.children.length,5);
  const ray=world.scene.getObjectByName('attenuating-uv-ray-0') as THREE.LineSegments<THREE.BufferGeometry,THREE.ShaderMaterial>;
  const p=ray.geometry.getAttribute('position'),a=ray.geometry.getAttribute('aOpacity'),original=Array.from(a.array);
  for(let i=0;i<p.count-1;i++)assert.ok(p.getY(i)>=p.getY(i+1));
  assert.ok(p.getY(p.count-1)>expandedHeight('earth',22)-1e-6);
  assert.ok(a.getX(0)>.2&&a.getX(a.count-1)===0);
  assert.ok(group.children.every(o=>o instanceof THREE.LineSegments));
  const positions=p.array;
  world.update('ozone',3.4,null,25,defaultPhenomena);
  assert.equal(ray.geometry.getAttribute('position').array,positions);assert.notDeepEqual(Array.from(a.array),original);
  assert.equal(a.getX(a.count-1),0);
  assert.equal(world.scene.getObjectByName('reference-moist-parcel')!.visible,false);world.dispose();
});

test('meteor head, short-lived wake and optional fragments change with supplied event time',()=>{
  const world=new AtmosphereStructureWorld('earth');
  const head=world.scene.getObjectByName('retained-meteoroid') as THREE.Mesh<THREE.SphereGeometry,THREE.MeshBasicMaterial>;
  const trail=world.scene.getObjectByName('meteor-emission-trail') as THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>;
  world.update('meteor',1,null,65,defaultPhenomena);const first=head.position.clone(),array=trail.geometry.getAttribute('position').array;
  world.update('meteor',2.9,null,65,defaultPhenomena);assert.ok(head.position.distanceTo(first)>.5);assert.ok(trail.material.uniforms.uLight.value>0);assert.equal(trail.geometry.getAttribute('position').array,array);
  world.update('meteor',6,null,65,defaultPhenomena);assert.equal(head.material.opacity,0);
  assert.equal(meteorSample(6).light,0);
  assert.ok(meteorPoint(1).y>expandedHeight('earth',50)); // this fading example stays above the lower-stratospheric aircraft
  world.update('meteor',3.4,null,65,{...defaultPhenomena,meteorOutcome:'fragment'});assert.equal(world.scene.getObjectByName('retained-entry-fragment-0')!.visible,true);
  world.update('meteor',1,null,65,defaultPhenomena);assert.deepEqual(head.position,first);world.dispose();
});

test('auroral folds deform retained buffers and the particle-input alternative suppresses only aurora',()=>{
  const world=new AtmosphereStructureWorld('earth');
  const curtain=world.scene.getObjectByName('folded-polar-aurora-0') as THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>,p=curtain.geometry.getAttribute('position');
  const sky=world.scene.getObjectByName('layer-sky-backdrop') as THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>;
  world.update('aurora',0,null,180,defaultPhenomena);const first=Array.from(p.array);assert.equal(sky.material.uniforms.uNight.value,1);
  world.update('aurora',11,null,180,defaultPhenomena);assert.equal(curtain.geometry.getAttribute('position'),p);assert.notDeepEqual(Array.from(p.array),first);assert.equal(curtain.material.uniforms.uTime.value,11);
  world.update('aurora',0,null,180,defaultPhenomena);assert.deepEqual(Array.from(p.array),first);
  world.update('aurora',11,null,180,{...defaultPhenomena,aurora:false});assert.equal(curtain.visible,false);assert.equal(world.scene.getObjectByName('enlarged-magnetic-particle-paths')!.visible,false);
  assert.equal(world.scene.getObjectByName('cloud-grown-rain')!.visible,true);
  world.update('weather',11,null,3,defaultPhenomena);assert.equal(sky.material.uniforms.uNight.value,0);world.dispose();
});

test('hidden close-view aurora keeps its buffers still and catches up to supplied time when selected',()=>{
  const world=new AtmosphereStructureWorld('earth'),curtain=world.scene.getObjectByName('folded-polar-aurora-0') as THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>;
  const positions=curtain.geometry.getAttribute('position') as THREE.BufferAttribute,version=positions.version;
  for(let i=0;i<30;i++)world.update('weather',i/5,null,3,{...defaultPhenomena,detail:true});
  assert.equal(positions.version,version);assert.equal(curtain.visible,false);
  world.update('aurora',8,null,180,{...defaultPhenomena,detail:true});
  assert.ok(positions.version>version);const q=auroraPoint(0,0,8);
  assert.ok(Math.abs(positions.getX(0)-q.x)<1e-6&&Math.abs(positions.getY(0)-q.y)<1e-6&&Math.abs(positions.getZ(0)-q.z)<1e-6);
  world.dispose();
});

test('auroral arcs remain above the representative lower emission height and evolve continuously',()=>{
  const toKm=(y:number)=>expandedAltitude('earth',y);
  for(const curtain of [0,1])for(const time of [0,7,53,407])for(let i=0;i<=32;i++){
    const u=i/32,lower=auroraPoint(u,0,time,curtain),upper=auroraPoint(u,1,time,curtain);
    assert.ok(toKm(lower.y)>=100&&toKm(upper.y)<450&&upper.y>lower.y);
    const next=auroraPoint(u,.5,time+.02,curtain),now=auroraPoint(u,.5,time,curtain);
    assert.ok(Math.hypot(next.x-now.x,next.y-now.y,next.z-now.z)<.01);
    assert.deepEqual(now,auroraPoint(u,.5,time,curtain));
  }
});

test('each close framing contains its phenomenon without replacing the world or forcing foreign layers',()=>{
  for(const id of ['weather','ozone','meteor','aurora','escape']){
    const frame=phenomenonFocus('earth',id);assert.ok(frame.span>=.6&&frame.width>=2&&Number.isFinite(frame.y));
  }
  const weather=phenomenonFocus('earth','weather');assert.ok(weather.y-weather.span<0&&weather.y+weather.span>expandedHeight('earth',3));
  assert.notDeepEqual(phenomenonFocus('venus','acid-cloud'),phenomenonFocus('earth','ozone'));
  const titan=new AtmosphereStructureWorld('titan');
  titan.update('methane-cloud',2,null,null,{...defaultPhenomena,weather:'cloud'});assert.equal(titan.scene.getObjectByName('occasional-methane-rain')!.visible,false);
  titan.update('methane-cloud',2,null,null,defaultPhenomena);assert.equal(titan.scene.getObjectByName('occasional-methane-rain')!.visible,true);
  assert.equal(titan.scene.getObjectByName('cloud-grown-rain'),undefined);titan.dispose();
});

test('close observations separate the layer questions and restore their retained objects in the overview',()=>{
  const world=new AtmosphereStructureWorld('earth');
  const names={weather:'cloud-grown-rain',ozone:'enlarged-cruise-airplane',meteor:'reference-meteoroid-path',aurora:'folded-polar-aurora-0',escape:'enlarged-low-orbit-satellite'};
  const objects=Object.fromEntries(Object.entries(names).map(([id,name])=>[id,world.scene.getObjectByName(name)!]));
  const guides=world.scene.getObjectByName('earth-thermal-reference-guides')!;
  const clouds:THREE.Mesh<THREE.BoxGeometry,THREE.ShaderMaterial>[]=[];
  world.scene.traverse(o=>{if(o instanceof THREE.Mesh&&o.name==='illustrative-cumulus-volume')clouds.push(o);});
  for(const selected of Object.keys(names)){
    world.update(selected,2,null,null,{...defaultPhenomena,detail:true});
    for(const [id,object]of Object.entries(objects))assert.equal(object.visible,id===selected,`${selected}: ${id} intrudes in the close observation`);
    assert.equal(guides.visible,false);
    if(selected!=='weather')assert.ok(clouds.every(cloud=>cloud.material.uniforms.uOpacity.value===0));
  }
  world.update('ozone',2,null,null,{...defaultPhenomena,detail:false});
  assert.ok(Object.values(objects).every(object=>object.visible));assert.equal(guides.visible,true);
  for(const [id,name]of Object.entries(names))assert.equal(world.scene.getObjectByName(name),objects[id]);
  world.dispose();
  const venus=new AtmosphereStructureWorld('venus');assert.equal(venus.scene.getObjectByName('earth-thermal-reference-guides'),undefined);venus.dispose();
});

test('all geometry, instance buffers, cloud textures and glow textures retain identity and dispose once',()=>{
  const world=new AtmosphereStructureWorld('earth'),resources=new Set<THREE.BufferGeometry|THREE.Material|THREE.Texture>(),arrays=new Map<THREE.BufferGeometry,ArrayLike<number>>();
  world.scene.traverse(object=>{
    if(object instanceof THREE.Mesh||object instanceof THREE.Points||object instanceof THREE.Line){resources.add(object.geometry);arrays.set(object.geometry,object.geometry.getAttribute('position').array);}
    if(object instanceof THREE.Mesh||object instanceof THREE.Points||object instanceof THREE.Line||object instanceof THREE.Sprite){for(const material of Array.isArray(object.material)?object.material:[object.material]){resources.add(material);if('map'in material&&material.map instanceof THREE.Texture)resources.add(material.map);if(material instanceof THREE.ShaderMaterial)for(const uniform of Object.values(material.uniforms))if(uniform.value instanceof THREE.Texture)resources.add(uniform.value);}}
  });
  const bytes=world.resourceBytes;
  for(let i=0;i<80;i++)world.update(i%2?'weather':'aurora',i*.4,null,3,{...defaultPhenomena,weather:i%3?'rain':'dry'});
  assert.equal(world.resourceBytes,bytes);assert.ok(bytes<1_020_000);
  for(const [geometry,array]of arrays)assert.equal(geometry.getAttribute('position').array,array);
  const count=new Map<object,number>();for(const resource of resources)resource.addEventListener('dispose',()=>count.set(resource,(count.get(resource)??0)+1));world.dispose();world.dispose();assert.equal(count.size,resources.size);assert.ok([...count.values()].every(value=>value===1));
});

test('enlarged airplane and satellite remain at their qualified reference heights while moving',()=>{
  const world=new AtmosphereStructureWorld('earth'),plane=world.scene.getObjectByName('enlarged-cruise-airplane')!,satellite=world.scene.getObjectByName('enlarged-low-orbit-satellite')!;
  world.update('ozone',0,null,25,defaultPhenomena);const first=plane.position.clone();
  world.update('ozone',9,null,25,{...defaultPhenomena,clues:false});assert.ok(plane.position.distanceTo(first)>.3);assert.equal(plane.visible,true);
  assert.ok(Math.abs(plane.position.y+.024*plane.position.x**2+.014*plane.position.z**2-expandedHeight('earth',12))<1e-12);
  assert.ok(Math.abs(satellite.position.y+.024*satellite.position.x**2+.014*satellite.position.z**2-expandedHeight('earth',824))<1e-12);
  world.update('ozone',0,null,25,defaultPhenomena);assert.deepEqual(plane.position,first);world.dispose();
  const moon=new AtmosphereStructureWorld('moon');assert.equal(moon.scene.getObjectByName('enlarged-cruise-airplane'),undefined);assert.equal(moon.scene.getObjectByName('enlarged-low-orbit-satellite'),undefined);moon.dispose();
});
