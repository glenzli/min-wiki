import * as THREE from 'three';
import { expandedHeight } from './structureModel.ts';

// Silhouette reference: Airbus A320 AC 2-2-0, wing-tip-fence three views
// (Jul 2025), and https://www.aircraft.airbus.com/en/aircraft/a320-family/a320ceo.
// 37.57 m length / 3.95 m width guide the barrel; the low-fence variant's
// 34.10 m span guides the wings. This remains an enlarged generic airliner.
const fuselageProfile:ReadonlyArray<readonly[number,number]>=[[-.53,.002],[-.49,.010],[-.43,.029],[-.35,.046],[-.26,.0557],[.20,.0557],[.415,.0557],[.44,.0544],[.47,.0489],[.49,.0422],[.51,.0314],[.522,.0205],[.528,.0102],[.53,.002]];

function fuselageAxisHeight(x:number) {
  return x<-.26?.012*THREE.MathUtils.smoothstep(-x,.26,.53):-.012*THREE.MathUtils.smoothstep(x,.405,.53);
}

function radiusAt(x:number) {
  for(let i=1;i<fuselageProfile.length;i++) {
    const [a,ra]=fuselageProfile[i-1],[b,rb]=fuselageProfile[i];
    if(x<=b)return THREE.MathUtils.lerp(ra,rb,Math.max(0,Math.min(1,(x-a)/(b-a))));
  }
  return fuselageProfile[fuselageProfile.length-1][1];
}

function fuselageGeometry() {
  const positions:number[]=[],colors:number[]=[],indices:number[]=[],sides=32;
  const upper=new THREE.Color('#d6dfe0'),belly=new THREE.Color('#9cabb2'),color=new THREE.Color();
  for(const [x,r]of fuselageProfile)for(let j=0;j<sides;j++) {
    const angle=j/sides*Math.PI*2,y=Math.cos(angle)*r,z=Math.sin(angle)*r;
    positions.push(x,y+fuselageAxisHeight(x),z);color.copy(upper).lerp(belly,THREE.MathUtils.smoothstep(-y/r,0,.8));colors.push(color.r,color.g,color.b);
  }
  for(let i=0;i<fuselageProfile.length-1;i++)for(let j=0;j<sides;j++) {
    const a=i*sides+j,c=i*sides+(j+1)%sides,b=a+sides,d=c+sides;indices.push(a,c,b,c,d,b);
  }
  for(const end of [0,fuselageProfile.length-1]) {
    const center=positions.length/3,x=fuselageProfile[end][0];positions.push(x,fuselageAxisHeight(x),0);colors.push(upper.r,upper.g,upper.b);
    for(let j=0;j<sides;j++) {const a=end*sides+j,b=end*sides+(j+1)%sides;indices.push(...(end===0?[center,b,a]:[center,a,b]));}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

function sweptWingsGeometry() {
  const outline:Array<readonly[number,number]>=[[.155,.043],[.105,.15],[-.075,.478],[-.123,.478],[-.105,.16],[-.075,.043]];
  const positions:number[]=[],indices:number[]=[];
  for(const side of [-1,1]) {
    const offset=positions.length/3,n=outline.length;
    for(const surface of [-1,1])for(const [x,z]of outline) {
      const center=-.035+z*.065,thickness=.008*(1-z/.8);positions.push(x,center+surface*thickness,side*z);
    }
    const orient=(a:number,b:number,c:number,outward:THREE.Vector3)=>{
      const p=new THREE.Vector3().fromArray(positions,a*3),q=new THREE.Vector3().fromArray(positions,b*3),r=new THREE.Vector3().fromArray(positions,c*3);
      if(q.sub(p).cross(r.sub(p)).dot(outward)<0)indices.push(a,c,b);else indices.push(a,b,c);
    };
    for(const face of THREE.ShapeUtils.triangulateShape(outline.map(([x,z])=>new THREE.Vector2(x,side*z)),[])) {
      orient(offset+face[0],offset+face[1],offset+face[2],new THREE.Vector3(0,-1,0));
      orient(offset+n+face[0],offset+n+face[1],offset+n+face[2],new THREE.Vector3(0,1,0));
    }
    const cx=outline.reduce((sum,p)=>sum+p[0],0)/n,cz=outline.reduce((sum,p)=>sum+p[1]*side,0)/n;
    for(let i=0;i<n;i++) {
      const j=(i+1)%n,outward=new THREE.Vector3((outline[i][0]+outline[j][0])*.5-cx,0,(outline[i][1]+outline[j][1])*.5*side-cz);
      orient(offset+i,offset+j,offset+n+i,outward);orient(offset+j,offset+n+j,offset+n+i,outward);
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

function finGeometry(points:ReadonlyArray<readonly[number,number]>,thickness:number) {
  const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false});geometry.translate(0,0,-thickness*.5);return geometry;
}

function cockpitGeometry() {
  const positions:number[]=[],indices:number[]=[],geometry=new THREE.BufferGeometry();
  // One six-pane belt around the nose shoulder. Adjacent panes share the
  // same edge layout and leave only a narrow fuselage-colored pillar.
  // Coordinates are (x, circumferential arc length), not roof rectangles.
  const arcRadius=.052,clearance=.00085,pillarHalfWidth=.00065;
  const upper:ReadonlyArray<readonly[number,number]>=[[.451,0],[.442,.63],[.424,.83],[.406,.87]];
  const lower:ReadonlyArray<readonly[number,number]>=[[.490,0],[.472,.92],[.430,1.15],[.406,1.19]];
  const signedArea=(polygon:THREE.Vector2[])=>polygon.reduce((sum,p,i)=>sum+p.cross(polygon[(i+1)%polygon.length]),0);
  const clip=(polygon:THREE.Vector2[],boundary:THREE.Vector2[],inset=0)=>{
    const winding=Math.sign(signedArea(boundary));
    for(let edge=0;edge<boundary.length&&polygon.length;edge++) {
      const a=boundary[edge],b=boundary[(edge+1)%boundary.length],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
      const distance=(p:THREE.Vector2)=>winding*(dx*(p.y-a.y)-dy*(p.x-a.x))/length-inset;
      const output:THREE.Vector2[]=[];
      for(let i=0;i<polygon.length;i++) {
        const p=polygon[i],q=polygon[(i+1)%polygon.length],dp=distance(p),dq=distance(q);
        if(dp>=-1e-12)output.push(p);
        if((dp>0&&dq<0)||(dp<0&&dq>0))output.push(p.clone().lerp(q,dp/(dp-dq)));
      }
      polygon=output;
    }
    return polygon;
  };
  for(const side of [-1,1])for(let pane=0;pane<3;pane++) {
    const point=([x,angle]:readonly[number,number])=>new THREE.Vector2(x,side*angle*arcRadius);
    const outline=[point(upper[pane]),point(upper[pane+1]),point(lower[pane+1]),point(lower[pane])];
    const window=clip(outline,outline,pillarHalfWidth),start=indices.length;
    // Clip the glazing onto the *same triangles* as the production nose.
    // Every resulting face stays outside that face with finite clearance;
    // coarse glass triangles cannot cut through the underlying curved skin.
    for(let ring=0;ring<fuselageProfile.length-1;ring++)for(let sector=-7;sector<7;sector++) {
      const [x0,r0]=fuselageProfile[ring],[x1,r1]=fuselageProfile[ring+1];
      if(x1<.405||x0>.491)continue;
      const a0=sector*Math.PI/16,a1=(sector+1)*Math.PI/16;
      const uv=[new THREE.Vector2(x0,a0*arcRadius),new THREE.Vector2(x0,a1*arcRadius),new THREE.Vector2(x1,a0*arcRadius),new THREE.Vector2(x1,a1*arcRadius)];
      const skin=[new THREE.Vector3(x0,Math.cos(a0)*r0+fuselageAxisHeight(x0),Math.sin(a0)*r0),new THREE.Vector3(x0,Math.cos(a1)*r0+fuselageAxisHeight(x0),Math.sin(a1)*r0),new THREE.Vector3(x1,Math.cos(a0)*r1+fuselageAxisHeight(x1),Math.sin(a0)*r1),new THREE.Vector3(x1,Math.cos(a1)*r1+fuselageAxisHeight(x1),Math.sin(a1)*r1)];
      for(const face of [[0,1,2],[1,3,2]]) {
        const polygon=clip(window,face.map(i=>uv[i]));if(polygon.length<3||Math.abs(signedArea(polygon))<1e-12)continue;
        const [a,b,c]=face.map(i=>uv[i]),area=b.clone().sub(a).cross(c.clone().sub(a)),offset=positions.length/3;
        for(const p of polygon) {
          const u=p.clone().sub(a).cross(c.clone().sub(a))/area,v=b.clone().sub(a).cross(p.clone().sub(a))/area;
          const position=skin[face[0]].clone().multiplyScalar(1-u-v).addScaledVector(skin[face[1]],u).addScaledVector(skin[face[2]],v),angle=p.y/arcRadius;
          position.y+=Math.cos(angle)*clearance;position.z+=Math.sin(angle)*clearance;positions.push(position.x,position.y,position.z);
        }
        for(let i=1;i<polygon.length-1;i++) {
          const ids=[offset,offset+i,offset+i+1],p=ids.map(id=>new THREE.Vector3().fromArray(positions,id*3)),normal=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0]));
          const outward=new THREE.Vector3(0,p[0].y-fuselageAxisHeight(p[0].x),p[0].z);
          if(normal.dot(outward)<0)indices.push(ids[0],ids[2],ids[1]);else indices.push(...ids);
        }
      }
    }
    geometry.addGroup(start,indices.length-start,0);
  }
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

function insulatedBusGeometry() {
  const geometry=new THREE.BoxGeometry(.265,.28,.28,4,4,4),positions=geometry.getAttribute('position'),normals=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv'),colors=new Float32Array(positions.count*3);
  for(let i=0;i<positions.count;i++) {
    const u=uv.getX(i),v=uv.getY(i),fold=Math.sin(u*Math.PI)**2*Math.sin(v*Math.PI)**2;
    const crease=(Math.sin(u*17+v*11)+Math.sin(u*29-v*13)*.4)*fold*.0012;
    positions.setXYZ(i,positions.getX(i)+normals.getX(i)*crease,positions.getY(i)+normals.getY(i)*crease,positions.getZ(i)+normals.getZ(i)*crease);
    const shade=.88+fold*.07;colors.set([shade,shade*.997,shade*.985],i*3);
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry;
}

function parabolicReflectorGeometry() {
  const positions:number[]=[],indices:number[]=[],sides=24,rings=4;
  for(const back of [false,true]) {
    const offset=positions.length/3;positions.push(0,back?-.004:0,0);
    for(let ring=1;ring<=rings;ring++)for(let j=0;j<sides;j++) {
      const r=.085*ring/rings,angle=j/sides*Math.PI*2;positions.push(Math.cos(angle)*r,.028*(r/.085)**2-(back?.004:0),Math.sin(angle)*r);
    }
    const face=(a:number,b:number,c:number)=>indices.push(...(back?[a,c,b]:[a,b,c]));
    for(let j=0;j<sides;j++)face(offset,offset+1+(j+1)%sides,offset+1+j);
    for(let ring=0;ring<rings-1;ring++)for(let j=0;j<sides;j++) {
      const a=offset+1+ring*sides+j,b=offset+1+ring*sides+(j+1)%sides,c=a+sides,d=b+sides;face(a,b,c);face(b,d,c);
    }
  }
  const stride=1+rings*sides,front=1+(rings-1)*sides,back=stride+front;
  for(let j=0;j<sides;j++) {const n=(j+1)%sides;indices.push(front+j,front+n,back+j,front+n,back+n,back+j);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

/** Generic enlarged references, not a particular aircraft/satellite model.
 * Local +X is the airplane's physical nose. Trajectories are display paths;
 * their size, speed, bank and satellite arc are not flight/orbit solutions. */
export class FamiliarAtmosphereReferences {
  readonly group=new THREE.Group();
  private readonly airplane=new THREE.Group();
  private readonly satellite=new THREE.Group();
  private readonly geometries=new Set<THREE.BufferGeometry>();
  private readonly materials=new Set<THREE.Material>();
  private readonly instances=new Set<THREE.InstancedMesh>();
  private readonly cube=new THREE.BoxGeometry(1,1,1);
  private readonly sphere=new THREE.SphereGeometry(1,10,6);
  private readonly rod=new THREE.CylinderGeometry(1,1,1,8);
  private readonly cone=new THREE.ConeGeometry(1,1,12);
  private readonly ring=new THREE.TorusGeometry(1,.085,5,20);
  private readonly forward=new THREE.Vector3();
  private readonly up=new THREE.Vector3();
  private readonly right=new THREE.Vector3();
  private readonly basis=new THREE.Matrix4();
  private readonly bank=new THREE.Quaternion();
  private readonly xAxis=new THREE.Vector3(1,0,0);
  private disposed=false;

  constructor() {
    this.group.name='enlarged-familiar-atmosphere-references';
    this.airplane.name='enlarged-cruise-airplane';this.satellite.name='enlarged-low-orbit-satellite';
    this.group.add(this.airplane,this.satellite);this.makeAirplane();this.makeSatellite();this.update(0);
  }

  private keep<T extends THREE.Mesh|THREE.Line>(object:T):T {
    this.geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])this.materials.add(material);
    if(object instanceof THREE.InstancedMesh)this.instances.add(object);return object;
  }

  private mesh(parent:THREE.Object3D,geometry:THREE.BufferGeometry,material:THREE.Material,name:string,position:readonly[number,number,number]=[0,0,0],scale:readonly[number,number,number]=[1,1,1]) {
    const mesh=this.keep(new THREE.Mesh(geometry,material));mesh.name=name;mesh.position.set(...position);mesh.scale.set(...scale);parent.add(mesh);return mesh;
  }

  private line(parent:THREE.Object3D,points:THREE.Vector3[],material:THREE.LineBasicMaterial,name:string) {
    const line=this.keep(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),material));line.name=name;parent.add(line);return line;
  }

  private strut(parent:THREE.Object3D,a:THREE.Vector3,b:THREE.Vector3,radius:number,material:THREE.Material,name:string) {
    const direction=b.clone().sub(a),mesh=this.mesh(parent,this.rod,material,name);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(radius,direction.length(),radius);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());return mesh;
  }

  private makeAirplane() {
    const plane=this.airplane,shell=new THREE.MeshStandardMaterial({color:'#c4ced1',roughness:.43,metalness:.12}),bodyMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.42,metalness:.12});
    const trim=new THREE.MeshStandardMaterial({color:'#42617a',roughness:.48,metalness:.20}),glass=new THREE.MeshStandardMaterial({color:'#17313f',roughness:.24,metalness:.32});
    const metal=new THREE.MeshStandardMaterial({color:'#9aa7ac',roughness:.31,metalness:.72}),dark=new THREE.MeshStandardMaterial({color:'#202d32',roughness:.48,metalness:.42});
    const seams=new THREE.LineBasicMaterial({color:'#75888e',transparent:true,opacity:.66});
    this.mesh(plane,fuselageGeometry(),bodyMaterial,'airplane-fuselage-with-nose');
    this.mesh(plane,cockpitGeometry(),glass,'airplane-cockpit-glazing');
    const wings=sweptWingsGeometry();this.mesh(plane,wings,shell,'airplane-swept-wings');
    this.mesh(plane,wings,shell,'airplane-horizontal-tail',[-.38,.027,0],[.65,.43,.37]);
    this.mesh(plane,finGeometry([[-.275,.035],[-.445,.205],[-.490,.205],[-.465,.022]],.010),trim,'airplane-vertical-tail');
    const winglet=finGeometry([[.014,.013],[-.013,.020],[-.031,.006],[-.029,-.014],[.008,-.013]],.004);
    for(const side of [-1,1]) {
      this.mesh(plane,winglet,shell,'airplane-wingtip-fence',[-.089,-.0039,side*.478]);
      this.mesh(plane,this.sphere,side>0?new THREE.MeshStandardMaterial({color:'#436850',roughness:.3}):new THREE.MeshStandardMaterial({color:'#894c4b',roughness:.3}),'airplane-wingtip-lens',[-.073,-.002,side*.479],[.003,.003,.004]);
    }
    const windows=this.keep(new THREE.InstancedMesh(this.sphere,glass,42)),pose=new THREE.Object3D();
    for(const [sideIndex,side]of [-1,1].entries())for(let i=0;i<21;i++) {
      const x=-.285+i*.0305,y=.015,r=radiusAt(x),localY=y-fuselageAxisHeight(x);pose.position.set(x,y,side*(Math.sqrt(r*r-localY*localY)+.0007));pose.scale.set(.0068,.0082,.0017);pose.updateMatrix();windows.setMatrixAt(sideIndex*21+i,pose.matrix);
    }
    windows.name='airplane-cabin-windows';windows.instanceMatrix.needsUpdate=true;plane.add(windows);
    const doorLines:THREE.Vector3[]=[],wingLines:THREE.Vector3[]=[];
    for(const side of [-1,1]) {
      for(const x of [-.33,.355]) {
        const path=[[-.010,-.028],[.010,-.028],[.010,.031],[-.010,.031],[-.010,-.028]];
        for(let i=0;i<path.length-1;i++)for(const [dx,y]of [path[i],path[i+1]]) {const r=radiusAt(x+dx),localY=y-fuselageAxisHeight(x+dx);doorLines.push(new THREE.Vector3(x+dx,y,side*(Math.sqrt(Math.max(0,r*r-localY*localY))+.001)));}
      }
      for(const [a,b]of [[[-.064,.11],[-.114,.43]],[[-.043,.11],[-.095,.43]]] as const)for(const [x,z]of [a,b])wingLines.push(new THREE.Vector3(x,-.034+z*.065+.008*(1-z/.8),side*z));
    }
    this.line(plane,doorLines,seams,'airplane-door-outlines');this.line(plane,wingLines,seams,'airplane-flap-panel-seams');
    this.line(plane,[new THREE.Vector3(-.448,.055,.006),new THREE.Vector3(-.479,.194,.006)],seams,'airplane-rudder-seam');
    const nacelleProfile=[new THREE.Vector2(.0225,-.058),new THREE.Vector2(.031,-.033),new THREE.Vector2(.034,.017),new THREE.Vector2(.032,.050),new THREE.Vector2(.030,.056),new THREE.Vector2(.026,.056),new THREE.Vector2(.025,.034),new THREE.Vector2(.0215,-.033),new THREE.Vector2(.0205,-.058),new THREE.Vector2(.0225,-.058)];
    const nacelle=new THREE.LatheGeometry(nacelleProfile,20);nacelle.rotateZ(-Math.PI/2);
    const pylon=finGeometry([[.045,-.027],[.096,-.027],[.176,-.071],[.113,-.075]],.012);
    const fans=this.keep(new THREE.InstancedMesh(this.cube,metal,24));
    for(const [sideIndex,side]of [-1,1].entries()) {
      const z=side*.18,y=-.095,x=.155;
      this.mesh(plane,pylon,shell,'airplane-engine-pylon',[0,0,z]);
      this.mesh(plane,nacelle,shell,'airplane-open-engine-nacelle',[x,y,z]);
      const intake=this.mesh(plane,this.ring,metal,'airplane-intake-lip',[x+.055,y,z],[.0295,.0295,.0295]);intake.rotation.y=Math.PI/2;
      const chamber=this.mesh(plane,this.rod,dark,'airplane-recessed-fan-chamber',[x+.025,y,z],[.023,.004,.023]);chamber.rotation.z=-Math.PI/2;
      const exhaust=this.mesh(plane,this.rod,dark,'airplane-exhaust-core',[x-.057,y,z],[.018,.003,.018]);exhaust.rotation.z=-Math.PI/2;
      const spinner=this.mesh(plane,this.cone,metal,'airplane-fan-spinner',[x+.041,y,z],[.006,.016,.006]);spinner.rotation.z=-Math.PI/2;
      for(let i=0;i<12;i++) {const angle=i/12*Math.PI*2;pose.position.set(x+.033,y+Math.cos(angle)*.0125,z+Math.sin(angle)*.0125);pose.rotation.set(angle,0,0);pose.scale.set(.0022,.015,.004);pose.updateMatrix();fans.setMatrixAt(sideIndex*12+i,pose.matrix);}
    }
    fans.name='airplane-retained-fan-blades';fans.instanceMatrix.needsUpdate=true;plane.add(fans);
  }

  private makeSatellite() {
    const sat=this.satellite,white=new THREE.MeshStandardMaterial({color:'#bac5c7',vertexColors:true,roughness:.55,metalness:.28});
    const metal=new THREE.MeshStandardMaterial({color:'#a7b4bb',roughness:.34,metalness:.74}),dark=new THREE.MeshStandardMaterial({color:'#1d282e',roughness:.74,metalness:.16});
    const cellsMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.32,metalness:.36}),barsMaterial=new THREE.MeshStandardMaterial({color:'#a7b5b0',roughness:.41,metalness:.64});
    const glass=new THREE.MeshStandardMaterial({color:'#172b3b',roughness:.19,metalness:.42});
    this.mesh(sat,insulatedBusGeometry(),white,'satellite-thermal-insulated-bus');
    for(const y of [-.144,.144])this.mesh(sat,this.cube,metal,'satellite-bus-edge-rail',[0,y,0],[.278,.008,.288]);
    this.mesh(sat,this.cube,dark,'satellite-black-radiator',[.054,.005,.145],[.108,.205,.007]);
    for(let i=0;i<6;i++)this.mesh(sat,this.cube,dark,'satellite-radiator-louver',[.054,-.076+i*.032,.151],[.111,.004,.007]);
    const cells=this.keep(new THREE.InstancedMesh(this.cube,cellsMaterial,96)),busbars=this.keep(new THREE.InstancedMesh(this.cube,barsMaterial,192)),pose=new THREE.Object3D(),color=new THREE.Color();
    for(const [sideIndex,side]of [-1,1].entries()) {
      const panelX=side*.44;
      this.mesh(sat,this.cube,dark,'satellite-solar-array-backing',[panelX,0,-.005],[.438,.368,.009]);
      for(const y of [-.188,.188])this.mesh(sat,this.cube,metal,'satellite-solar-array-frame',[panelX,y,.002],[.45,.009,.018]);
      for(const x of [-.222,.222])this.mesh(sat,this.cube,metal,'satellite-solar-array-frame',[panelX+x,0,.002],[.009,.382,.018]);
      this.mesh(sat,this.cube,metal,'satellite-deployment-arm',[side*.18,0,-.016],[.132,.018,.022]);
      this.mesh(sat,this.rod,metal,'satellite-array-hinge',[side*.158,0,-.017],[.017,.072,.017]);
      for(const y of [-.085,.085])this.strut(sat,new THREE.Vector3(side*.13,y,-.05),new THREE.Vector3(side*.23,y*1.45,-.009),.004,metal,'satellite-array-support');
      for(let row=0;row<8;row++)for(let column=0;column<6;column++) {
        const index=sideIndex*48+row*6+column,x=panelX+(column-2.5)*.071,y=(row-3.5)*.044;
        pose.position.set(x,y,.003);pose.rotation.set(0,0,0);pose.scale.set(.066,.039,.004);pose.updateMatrix();cells.setMatrixAt(index,pose.matrix);
        color.setHSL(.592+((row+column)%3)*.008,.46,.245+((row*3+column)%5)*.008);cells.setColorAt(index,color);
        for(let line=0;line<2;line++) {pose.position.set(x+(line-.5)*.028,y,.0058);pose.scale.set(.0013,.036,.001);pose.updateMatrix();busbars.setMatrixAt(index*2+line,pose.matrix);}
      }
    }
    cells.name='satellite-blue-solar-cells';busbars.name='satellite-solar-cell-busbars';cells.instanceMatrix.needsUpdate=true;busbars.instanceMatrix.needsUpdate=true;if(cells.instanceColor)cells.instanceColor.needsUpdate=true;sat.add(cells,busbars);
    const fasteners=this.keep(new THREE.InstancedMesh(this.sphere,metal,12));
    for(let i=0;i<12;i++) {pose.position.set((i%3-1)*.105,(Math.floor(i/3)-1.5)*.072,.142);pose.rotation.set(0,0,0);pose.scale.set(.0045,.0045,.002);pose.updateMatrix();fasteners.setMatrixAt(i,pose.matrix);}
    fasteners.name='satellite-panel-fasteners';fasteners.instanceMatrix.needsUpdate=true;sat.add(fasteners);
    this.mesh(sat,this.rod,metal,'satellite-nadir-instrument-housing',[0,-.166,.026],[.040,.055,.040]);
    this.mesh(sat,this.rod,glass,'satellite-nadir-instrument-aperture',[0,-.197,.026],[.032,.008,.032]);
    const instrumentRim=this.mesh(sat,this.ring,metal,'satellite-instrument-rim',[0,-.201,.026],[.035,.035,.035]);instrumentRim.rotation.x=Math.PI/2;
    const dishGroup=new THREE.Group();dishGroup.name='satellite-communication-antenna';dishGroup.position.set(-.070,-.018,.179);dishGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(0,-.45,.89).normalize());sat.add(dishGroup);
    this.mesh(dishGroup,parabolicReflectorGeometry(),metal,'satellite-parabolic-reflector');
    this.mesh(dishGroup,this.cone,white,'satellite-antenna-feed',[0,.077,0],[.008,.019,.008]);
    for(let i=0;i<3;i++) {const a=i/3*Math.PI*2;this.strut(dishGroup,new THREE.Vector3(Math.cos(a)*.077,.022,Math.sin(a)*.077),new THREE.Vector3(0,.072,0),.0019,metal,'satellite-feed-support');}
    this.strut(sat,new THREE.Vector3(-.075,.144,-.055),new THREE.Vector3(-.075,.257,-.055),.0028,dark,'satellite-secondary-antenna');
  }

  private orient(object:THREE.Object3D,x:number,z:number,dx:number,dz:number,bank:number) {
    this.forward.set(dx,-.048*x*dx-.028*z*dz,dz).normalize();
    this.up.set(.048*x,1,.028*z).normalize();this.right.crossVectors(this.forward,this.up).normalize();this.up.crossVectors(this.right,this.forward).normalize();
    this.basis.makeBasis(this.forward,this.up,this.right);object.quaternion.setFromRotationMatrix(this.basis);
    if(bank!==0){this.bank.setFromAxisAngle(this.xAxis,bank);object.quaternion.multiply(this.bank);}
  }

  update(seconds:number):void {
    if(this.disposed)return;const time=Number.isFinite(seconds)?seconds:0;
    const rate=.042,theta=time*rate,s=Math.sin(theta),c=Math.cos(theta),rx=1.55,rz=.50,x=rx*s,z=.45+rz*c,dx=rx*rate*c,dz=-rz*rate*s;
    this.airplane.position.set(x,expandedHeight('earth',12)-.024*x*x-.014*z*z,z);
    const turnRate=-rx*rz*rate/(rx*rx*c*c+rz*rz*s*s),bank=Math.max(-.34,Math.min(.34,turnRate*2.4));
    this.orient(this.airplane,x,z,dx,dz,bank);
    const orbitAngle=time*.023+.7,ox=2.45*Math.sin(orbitAngle),oz=.18+.58*Math.cos(orbitAngle),odx=2.45*.023*Math.cos(orbitAngle),odz=-.58*.023*Math.sin(orbitAngle);
    this.satellite.position.set(ox,expandedHeight('earth',824)-.024*ox*ox-.014*oz*oz,oz);this.orient(this.satellite,ox,oz,odx,odz,0);
  }

  /** Retained typed-array bytes, including all instance matrices and colours;
   * driver/program/object overhead is not presented as measured GPU memory. */
  get resourceBytes():number {
    let bytes=0;for(const geometry of this.geometries){for(const attribute of Object.values(geometry.attributes))bytes+=attribute.array.byteLength;bytes+=geometry.index?.array.byteLength??0;}
    for(const instance of this.instances)bytes+=instance.instanceMatrix.array.byteLength+(instance.instanceColor?.array.byteLength??0);return bytes;
  }

  dispose():void {
    if(this.disposed)return;this.disposed=true;for(const instance of this.instances)instance.dispose();for(const geometry of this.geometries)geometry.dispose();for(const material of this.materials)material.dispose();this.group.clear();this.airplane.clear();this.satellite.clear();this.instances.clear();this.geometries.clear();this.materials.clear();
  }
}
