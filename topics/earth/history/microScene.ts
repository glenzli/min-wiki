import * as THREE from 'three';
import type {JourneyFrame} from './journeyModel.ts';

type EvidenceKind=JourneyFrame['evidenceKind'];
type Family={root:THREE.Group;update?:(frame:JourneyFrame)=>void};
const clamp=(value:number)=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
const noise=(x:number,y:number,z=0)=>{const n=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return n-Math.floor(n);};
const smooth=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
function surfaceNoise(x:number,y:number,seed=0){
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
  const a=noise(ix,iy,seed)*(1-sx)+noise(ix+1,iy,seed)*sx,b=noise(ix,iy+1,seed)*(1-sx)+noise(ix+1,iy+1,seed)*sx;
  return a*(1-sy)+b*sy;
}
const surfaceGLSL=`
varying vec3 vEvidencePoint;
float evidenceHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float evidenceNoise(vec3 p){
  vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(mix(evidenceHash(i),evidenceHash(i+vec3(1,0,0)),f.x),mix(evidenceHash(i+vec3(0,1,0)),evidenceHash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(evidenceHash(i+vec3(0,0,1)),evidenceHash(i+vec3(1,0,1)),f.x),mix(evidenceHash(i+vec3(0,1,1)),evidenceHash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
vec3 evidenceCell(vec3 p){
  vec3 base=floor(p),f=fract(p);float first=20.0,second=20.0,identity=0.0;
  for(int z=-1;z<=1;z++)for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
    vec3 offset=vec3(float(x),float(y),float(z)),cell=base+offset;
    vec3 jitter=vec3(evidenceHash(cell),evidenceHash(cell+11.0),evidenceHash(cell+29.0));
    vec3 d=offset+.15+jitter*.7-f;float distance=dot(d,d);
    if(distance<first){second=first;first=distance;identity=evidenceHash(cell+43.0);}else if(distance<second)second=distance;
  }
  return vec3(identity,sqrt(first),max(0.0,sqrt(second)-sqrt(first)));
}
`;

/** Enlarged authored evidence examples. Display units are neither specimen size
 * nor a shared scale between grains, cells, rock records and the parent Earth.
 * The parent owns the only stage, camera, lighting, clock and scientific text. */
export function createHistoryMicroScene(options:{compact:boolean}){
  const group=new THREE.Group();group.name='history-micro-evidence';
  group.userData.representation='enlarged-authored-evidence';
  group.userData.measuredScale=false;
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
  const keepGeometry=<T extends THREE.BufferGeometry>(geometry:T)=>{geometries.add(geometry);return geometry;};
  const keepMaterial=<T extends THREE.Material>(material:T)=>{materials.add(material);return material;};
  const material=(color:string,roughness=.82,metalness=0)=>keepMaterial(new THREE.MeshStandardMaterial({color,roughness,metalness}));
  const rock=(color:string)=>{
    const result=material(color);
    result.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 vEvidencePoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvEvidencePoint=position;');
      shader.fragmentShader=surfaceGLSL+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float evidenceFine=evidenceNoise(vEvidencePoint*136.0),evidenceGrain=evidenceNoise(vEvidencePoint*38.0);
        float evidenceCloud=evidenceNoise(vEvidencePoint*5.7);
        diffuseColor.rgb*=.8+.13*evidenceCloud+.13*evidenceGrain+.08*evidenceFine;`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        float evidenceRelief=evidenceGrain*.0019+evidenceFine*.00055;
        vec3 eq0=dFdx(-vViewPosition),eq1=dFdy(-vViewPosition),en0=cross(eq1,normal),en1=cross(normal,eq0);
        float edeterminant=dot(eq0,en0);
        vec3 egradient=sign(edeterminant)*(dFdx(evidenceRelief)*en0+dFdy(evidenceRelief)*en1);
        normal=normalize(abs(edeterminant)*normal-egradient);`);
    };
    result.customProgramCacheKey=()=> 'history-evidence-stone-2';return result;
  };
  const add=(parent:THREE.Object3D,geometry:THREE.BufferGeometry,paint:THREE.Material,name:string)=>{
    const mesh=new THREE.Mesh(keepGeometry(geometry),paint);mesh.name=name;parent.add(mesh);return mesh;
  };
  const family=(kind:EvidenceKind)=>{const root=new THREE.Group();root.name=`evidence-${kind}`;root.visible=false;root.userData.evidenceKind=kind;group.add(root);return root;};
  const unitSphere=keepGeometry(new THREE.SphereGeometry(1,options.compact?10:14,options.compact?7:10));
  const pebbleGeometry=keepGeometry(new THREE.IcosahedronGeometry(1,1));
  const ball=(parent:THREE.Object3D,paint:THREE.Material,radius:number,position:readonly[number,number,number],name:string)=>{
    const mesh=add(parent,unitSphere,paint,name);mesh.scale.setScalar(radius);mesh.position.set(...position);return mesh;
  };
  const pebble=(parent:THREE.Object3D,paint:THREE.Material,scale:readonly[number,number,number],position:readonly[number,number,number],name:string)=>{
    const mesh=add(parent,pebbleGeometry,paint,name);mesh.scale.set(...scale);mesh.position.set(...position);mesh.rotation.set(position[0]*1.3,position[1]*.7,position[2]*2.1);return mesh;
  };
  const tube=(parent:THREE.Object3D,points:readonly(readonly[number,number,number])[],radius:number,paint:THREE.Material,name:string)=>{
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    return add(parent,new THREE.TubeGeometry(curve,options.compact?10:16,radius,options.compact?5:7,false),paint,name);
  };
  // A closed slab with a genuinely recessed front surface, not a decal over a
  // solid front face. Its opposite face and four edges close the specimen.
  function reliefSlab(width:number,height:number,depth:number,front:(x:number,y:number)=>number,tint?:(x:number,y:number)=>THREE.Color){
    const nx=options.compact?48:80,ny=options.compact?34:56,positions:number[]=[],colors:number[]=[],indices:number[]=[];
    const backColor=tint?.(width,height)??new THREE.Color('#ffffff');
    for(let back=0;back<2;back++)for(let iy=0;iy<=ny;iy++)for(let ix=0;ix<=nx;ix++){
      const x=(ix/nx-.5)*width,y=(iy/ny-.5)*height;
      const edgeX=Math.abs(x)/(width*.5),edgeY=Math.abs(y)/(height*.5);
      const px=x*Math.sqrt(1-.14*edgeY**6)*(1+.025*Math.sin(y*8+x*3)),py=y*Math.sqrt(1-.12*edgeX**6)*(1+.025*Math.sin(x*8.2));
      const chip=.006*(surfaceNoise(x*12,y*12)-.5)+.003*(surfaceNoise(x*33+5,y*33+7,11)-.5);
      positions.push(px,py,back?-depth/2+chip:front(x,y)+chip);const color=back?backColor:tint?.(x,y)??backColor;colors.push(color.r,color.g,color.b);
      if(ix<nx&&iy<ny){const a=back*(nx+1)*(ny+1)+iy*(nx+1)+ix,b=a+nx+1;if(back)indices.push(a,b,a+1,a+1,b,b+1);else indices.push(a,a+1,b,a+1,b+1,b);}
    }
    const offset=(nx+1)*(ny+1),edge:number[]=[];
    for(let x=0;x<=nx;x++)edge.push(x);
    for(let y=1;y<=ny;y++)edge.push(y*(nx+1)+nx);
    for(let x=nx-1;x>=0;x--)edge.push(ny*(nx+1)+x);
    for(let y=ny-1;y>0;y--)edge.push(y*(nx+1));
    for(let i=0;i<edge.length;i++){const a=edge[i],b=edge[(i+1)%edge.length];indices.push(a,a+offset,b,b,a+offset,b+offset);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
  }
  function band(parent:THREE.Object3D,bottom:number,thickness:number,paint:THREE.Material,name:string,wave=.045,width=2.16){
    const shape=new THREE.Shape(),count=options.compact?20:32;
    const surface=(x:number)=>wave*Math.cos(x*3.1)+wave*.24*Math.sin(x*9.2);
    for(let i=0;i<=count;i++){const x=(i/count-.5)*width,y=bottom+thickness+surface(x);i?shape.lineTo(x,y):shape.moveTo(x,y);}
    for(let i=count;i>=0;i--){const x=(i/count-.5)*width;shape.lineTo(x,bottom+surface(x));}shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:.72,bevelEnabled:false,steps:1,curveSegments:1}),p=geometry.getAttribute('position'),contacts:number[]=[];
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i)-.36;
      contacts.push(bottom+surface(x));
      const outline=.84+.15*Math.exp(-(((y+.45)/.35)**4));
      p.setXYZ(i,x*outline*(1+.025*Math.sin(y*17+z*7))+.012*Math.sin(z*15+y*23),y,z);
    }
    geometry.setAttribute('evidenceBedContact',new THREE.Float32BufferAttribute(contacts,1));geometry.computeVertexNormals();
    return add(parent,geometry,paint,name);
  }
  function matLayer(low:(x:number,z:number)=>number,high:(x:number,z:number)=>number){
    const nx=options.compact?16:32,nz=options.compact?6:10,positions:number[]=[],indices:number[]=[],count=(nx+1)*(nz+1);
    for(let upper=0;upper<2;upper++)for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
      const x=(i/nx-.5)*2.12,z=(j/nz-.5)*.92,px=x*(1+.035*Math.sin(z*7+x*2)),pz=z*(1+.08*Math.cos(x*3.3));
      positions.push(px,upper?high(px,pz):low(px,pz),pz);
      if(i<nx&&j<nz){const a=upper*count+j*(nx+1)+i,b=a+nx+1;if(upper)indices.push(a,b,a+1,a+1,b,b+1);else indices.push(a,a+1,b,a+1,b+1,b);}
    }
    const edge:number[]=[];for(let i=0;i<=nx;i++)edge.push(i);for(let j=1;j<=nz;j++)edge.push(j*(nx+1)+nx);for(let i=nx-1;i>=0;i--)edge.push(nz*(nx+1)+i);for(let j=nz-1;j>0;j--)edge.push(j*(nx+1));
    for(let i=0;i<edge.length;i++){const a=edge[i],b=edge[(i+1)%edge.length];indices.push(a,a+count,b,b,a+count,b+count);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);
    // A freshly exposed section keeps a cut-face normal at each lamina edge;
    // averaging the upper/lower faces there would create false black gaps.
    const faceted=geometry.toNonIndexed();geometry.dispose();faceted.computeVertexNormals();return faceted;
  }
  const plinth=add(group,new THREE.CylinderGeometry(1.31,1.35,.09,options.compact?56:80),material('#65706b',.85,.03),'specimen-support');plinth.position.y=-.88;
  const families={} as Record<EvidenceKind,Family>;

  // A representative mixed meteorite fragment supplies a material comparison,
  // never a removed sample of Earth's core or a reconstruction of all meteorites.
  {
    const root=family('meteorite'),silicate=rock('#817968'),compileMeteorite=silicate.onBeforeCompile;
    silicate.onBeforeCompile=(shader,renderer)=>{
      compileMeteorite(shader,renderer);
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec3 meteoritePoint=vEvidencePoint;
        vec3 grain=evidenceCell(meteoritePoint*7.5+vec3(evidenceNoise(meteoritePoint*7.0)*.35));
        float metalGrain=step(.61,grain.x)*(1.0-smoothstep(.27+.06*grain.x,.4+.06*grain.x,grain.y))*smoothstep(.003,.025,grain.z);
        float cutFace=smoothstep(.265,.279,meteoritePoint.z);
        vec3 silicateColour=mix(vec3(.27,.27,.22),vec3(.41,.39,.31),evidenceNoise(meteoritePoint*21.0));
        vec3 metalColour=mix(vec3(.48,.5,.47),vec3(.62,.63,.58),evidenceNoise(meteoritePoint*32.0));
        vec3 cutColour=mix(silicateColour,metalColour,metalGrain);
        diffuseColor.rgb=mix(vec3(.13,.14,.115),cutColour,cutFace);`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(.88,.44,metalGrain*cutFace);');
      shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=metalGrain*cutFace*.46;');
    };
    silicate.customProgramCacheKey=()=> 'history-meteorite-embedded-field-1';
    const fragment=new THREE.IcosahedronGeometry(1,options.compact?3:4),p=fragment.getAttribute('position');
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=1+.095*Math.sin(x*5.7+y*7+z*3)+.035*Math.sin(z*13-y*9);p.setXYZ(i,x*1.05*r,y*.84*r,Math.min(z*.67,.28));}fragment.computeVertexNormals();
    const specimen=add(root,fragment,silicate,'meteorite-cut-fragment');specimen.position.y=.03;
    specimen.userData.materialId='retained-mixed-meteorite-fragment';
    families.meteorite={root};
  }

  // A half crystal reveals qualitative nested growth zones in an observation
  // face. These are not luminescence intensities, isotope spots or dated rings.
  {
    const root=family('zircon'),host=rock('#6c7069');
    const matrix=add(root,reliefSlab(1.9,.64,.78,(x,y)=>.36+.025*Math.sin(x*7+y*8)),host,'zircon-host');matrix.position.set(0,-.51,-.03);
    const crystal=new THREE.Group();crystal.position.set(-.08,.02,.39);crystal.rotation.z=-.14;root.add(crystal);
    const vertices=[[-.32,-.55,0],[.32,-.55,0],[.32,.43,0],[-.32,.43,0],[-.32,-.55,-.5],[.32,-.55,-.5],[.32,.43,-.5],[-.32,.43,-.5],[0,.97,0]];
    const faces=[[0,1,2],[0,2,3],[3,2,8],[4,7,6],[4,6,5],[0,4,5],[0,5,1],[0,3,7],[0,7,4],[1,5,6],[1,6,2],[3,8,7],[7,8,6],[6,8,2]],positions:number[]=[];
    faces.forEach(face=>face.forEach(i=>positions.push(...vertices[i])));
    const habit=new THREE.BufferGeometry();habit.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));habit.computeVertexNormals();add(crystal,habit,material('#a3763f',.4,.04),'zircon-square-prism-section');
    const section=new THREE.Shape();[[-.32,-.55],[.32,-.55],[.32,.43],[0,.97],[-.32,.43]].forEach(([x,y],j)=>j?section.lineTo(x,y):section.moveTo(x,y));section.closePath();
    const zonePaint=rock('#c9ad79'),compileZone=zonePaint.onBeforeCompile;
    zonePaint.onBeforeCompile=(shader,renderer)=>{
      compileZone(shader,renderer);shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec3 zp=vEvidencePoint;float envelope=max(abs(zp.x)/.32,max((.1-zp.y)/.65,(zp.y-.1+1.6875*abs(zp.x))/.87));
        float irregular=.022*evidenceNoise(zp*22.0)+.006*sin(zp.y*28.0+zp.x*17.0);
        float growthZone=.5+.5*sin((envelope+irregular)*71.0);
        float zoneMix=smoothstep(.2,.82,growthZone);
        diffuseColor.rgb=mix(vec3(.47,.36,.23),vec3(.56,.43,.29),zoneMix)*(.91+.09*evidenceNoise(zp*95.0));`);
    };
    zonePaint.roughness=.48;zonePaint.customProgramCacheKey=()=> 'history-zircon-qualitative-zones-2';
    const zone=add(crystal,new THREE.ShapeGeometry(section),zonePaint,'zircon-qualitative-zones');zone.position.z=.006;zone.userData.measured=false;
    families.zircon={root};
  }

  {
    const root=family('microbial'),sediment=rock('#918267'),lamina=rock('#a49673'),mat=rock('#596949');mat.roughness=.66;
    const thickness=[.085,.065,.102,.072,.095,.075,.057],levels=[0];for(const h of thickness)levels.push(levels[levels.length-1]+h);
    const boundary=(level:number,x:number,z:number)=>-.79+levels[level]+.12*Math.exp(-x*x*1.5-z*z*2)+.025*Math.sin(x*5+z*2)+.008*Math.sin(x*17-z*11)*level/7;
    for(let i=0;i<7;i++)add(root,matLayer((x,z)=>boundary(i,x,z),(x,z)=>boundary(i+1,x,z)),i===6?mat:i%2?sediment:lamina,`mat-lamina-${i}`);
    const cellPaint=material('#4f7055',.55),membrane=keepMaterial(new THREE.MeshPhysicalMaterial({color:'#9ab294',roughness:.4,transparent:true,opacity:.33,depthWrite:false}));
    for(let i=0;i<21;i++){
      const cluster=Math.floor(i/7),angle=i*2.399963,r=.035+.15*Math.sqrt((i%7+.5)/7),x=[-.58,.04,.61][cluster]+Math.cos(angle)*r,z=[-.1,.19,-.06][cluster]+Math.sin(angle)*r*.7;
      const radius=.034+(i%4)*.006,y=boundary(7,x,z)+radius*.48;
      const cell=ball(root,membrane,radius,[x,y,z],`mat-cell-envelope-${i}`);cell.scale.y*=.74;cell.rotation.y=i*.61;
      const body=ball(cell,cellPaint,.8,[0,.12,0],`mat-cell-body-${i}`);body.userData.species='unspecified';
    }
    families.microbial={root};
  }

  {
    const root=family('iron'),silica=rock('#747e79'),oxide=rock('#804733'),thickness=[.07,.13,.085,.12,.09,.135];
    const fineLaminae=(paint:THREE.MeshStandardMaterial)=>{
      const compile=paint.onBeforeCompile;paint.onBeforeCompile=(shader,renderer)=>{
        compile(shader,renderer);shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
          float fineLamina=.5+.5*sin(vEvidencePoint.y*230.0+evidenceNoise(vEvidencePoint*25.0)*2.4);
          float mineralPatch=smoothstep(.67,.85,evidenceNoise(vEvidencePoint*17.0));
          diffuseColor.rgb*=(.84+.1*evidenceNoise(vEvidencePoint*11.0)+.06*fineLamina)*(1.0-mineralPatch*.28);`);
      };paint.customProgramCacheKey=()=> 'history-fine-iron-laminae-1';return paint;
    };
    fineLaminae(silica);fineLaminae(oxide);
    let bottom=-.81;for(let i=0;i<6;i++){band(root,bottom,thickness[i],i%2?silica:oxide,`existing-iron-band-${i}`,.025);bottom+=thickness[i];}
    const depositFraction={value:1},depositPaint=fineLaminae(rock('#8d5038')),compileDeposit=depositPaint.onBeforeCompile;
    depositPaint.onBeforeCompile=(shader,renderer)=>{
      compileDeposit(shader,renderer);shader.uniforms.evidenceDepositFraction=depositFraction;
      shader.vertexShader='uniform float evidenceDepositFraction; attribute float evidenceBedContact;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        transformed.y=evidenceBedContact+(position.y-evidenceBedContact)*evidenceDepositFraction;`);
    };
    depositPaint.customProgramCacheKey=()=> 'history-evidence-deposit-2';
    band(root,-.18,.14,depositPaint,'new-illustrative-precipitate',.025);
    // The water context has no solid box. These small retained batches code an
    // illustrative transfer to the bed, not counted ions or measured floc sizes.
    const suspended=material('#72928b',.74),precipitated=material('#945436',.85),tags:THREE.Mesh[]=[];suspended.transparent=true;suspended.opacity=.42;
    for(let i=0;i<18;i++){
      const x=-.86+noise(i,7)*1.72,y=.12+noise(i,17)*.67,z=-.12+noise(i,3)*.36,size=.018+(i%4)*.004;
      const tag=pebble(root,suspended,[size*1.35,size*.7,size],[x,y,z],`iron-source-batch-${i}`);tag.userData.sourcePosition=[x,y,z];tags.push(tag);
    }
    families.iron={root,update(frame){
      const phase=clamp(frame.progress);depositFraction.value=.06+.94*phase;
      tags.forEach((tag,i)=>{const [x,y,z]=tag.userData.sourcePosition as number[];const t=smooth((i%6)*.045,.72+(i%4)*.05,phase),bedTop=-.18+.025*Math.cos(x*3.1)+.006*Math.sin(x*9.2)+.14*depositFraction.value;tag.position.set(x,y+(bedTop+.018-y)*t,z);tag.material=t>.78?precipitated:suspended;});
    }};
  }

  {
    const root=family('fossil'),impression=new THREE.Group(),shells=new THREE.Group();root.add(impression,shells);
    const paint=rock('#ffffff');paint.vertexColors=true;
    const body=(x:number,y:number)=>{const center=.035*Math.sin(y*3.2),extent=.32*Math.pow(Math.max(0,1-(y/.64)**2),.62)*(1+y*.12);return (1-smooth(extent-.009,extent+.009,Math.abs(x-center)))*(1-smooth(.61,.65,Math.abs(y)));};
    const ribs=(x:number,y:number)=>Math.cos((y+.2*Math.abs(x))*61);
    const tint=(x:number,y:number)=>new THREE.Color('#9c927c').lerp(new THREE.Color('#615c49'),body(x,y)*(.57+.17*ribs(x,y)));
    const slab=add(impression,reliefSlab(2.12,1.42,.34,(x,y)=>{
      const axis=Math.exp(-(((x-.035*Math.sin(y*3.2))/.025)**2)),mask=body(x,y);
      return .17-mask*(.046+.011*ribs(x,y))+mask*axis*.022;
    },tint),paint,'bilateral-soft-body-impression');slab.position.y=-.05;slab.rotation.z=.09;
    const shellRelief=(x:number,y:number)=>{
      let value=0;for(const cx of [-.57,.47]){const dx=x-cx,dy=y+.08,r=Math.hypot(dx,dy),angle=Math.atan2(dx,dy);const fan=(1-smooth(.39,.44,r))*smooth(-.12,.04,dy);value=Math.max(value,fan*(.5+.5*Math.cos(angle*16)));}return value;
    };
    const shellPaint=rock('#ffffff');shellPaint.vertexColors=true;
    const shellSlab=add(shells,reliefSlab(2.12,1.42,.34,(x,y)=>.17-shellRelief(x,y)*.032,(x,y)=>new THREE.Color('#9c967f').lerp(new THREE.Color('#736b54'),shellRelief(x,y)*.65)),shellPaint,'marine-shell-record-example');shellSlab.position.y=-.05;shellSlab.rotation.z=-.07;
    families.fossil={root,update(frame){const soft=frame.stationId==='cambrian';impression.visible=soft;shells.visible=!soft;}};
  }

  {
    const root=family('till'),bed=material('#ffffff');bed.vertexColors=true;
    const groove=(x:number,y:number)=>{let value=0;for(let i=0;i<10;i++){const offset=-.46+i*.102+Math.sin(i*3.1)*.018;value+=Math.exp(-(((y-x*.11-offset)/(.009+(i%3)*.003))**2))*(.009+(i%4)*.003);}return value;};
    const slab=add(root,reliefSlab(2.18,1.22,.46,(x,y)=>.23-groove(x,y),(x,y)=>new THREE.Color('#9b9d91').multiplyScalar(.92+.08*noise(x*54,y*54))),bed,'striated-bedrock-example');slab.position.y=-.02;slab.rotation.z=-.09;
    const till=add(root,new THREE.BoxGeometry(2.12,.35,.66),rock('#88816b'),'unsorted-till-matrix');till.position.set(0,-.65,.01);
    const paints=[rock('#a3977c'),rock('#5e6b69'),rock('#b6aea0')];
    for(let i=0;i<12;i++){const size=.05+(i%5)*.028;pebble(root,paints[i%3],[size*1.25,size*.8,size],[-.92+i*.165,-.59+(i%3)*.04,.35],`retained-till-clast-${i}`);}
    families.till={root};
  }

  {
    const root=family('forest'),soil=add(root,new THREE.BoxGeometry(2.2,.92,.72),rock('#71634d'),'rooted-soil-example');soil.position.set(0,-.375,-.13);
    const wood=rock('#817257'),rootPaint=rock('#a79a74'),trunk=add(root,new THREE.CylinderGeometry(.16,.23,.91,options.compact?12:18),wood,'representative-trunk');trunk.position.set(-.12,.55,-.02);
    const collar=ball(root,wood,.25,[-.12,.11,-.02],'root-trunk-contact');collar.scale.y*=.52;
    for(let i=0;i<6;i++){
      const side=i%2?1:-1,x=side*(.38+Math.floor(i/2)*.25),y=-.16-Math.floor(i/2)*.16;
      tube(root,[[-.12,.12,.05],[side*.16,-.07,.12],[x*.64,y*.64,.23],[x,y,.245]],.028+(2-Math.floor(i/2))*.008,rootPaint,`root-axis-${i}`);
      tube(root,[[x*.64,y*.64,.23],[x*.8,y-.08,.245],[x+side*.13,y-.24,.245]],.011,rootPaint,`root-fine-branch-${i}`);
    }
    // A plain cut surface locates the woody volume without adding dated rings
    // or reconstructing Cairo's particular fossil tree species.
    const cut=add(root,new THREE.CircleGeometry(.16,options.compact?18:28),material('#baaa84',.85),'trunk-cut-surface');cut.rotation.x=-Math.PI/2;cut.position.set(-.12,1.008,-.02);
    families.forest={root};
  }

  {
    const root=family('impact'),matrix=add(root,new THREE.BoxGeometry(2.16,1.18,.6),rock('#665f56'),'impact-associated-breccia-example');matrix.position.y=-.12;
    const paints=[rock('#a19a89'),rock('#7a8078'),rock('#c2b8a0')];
    for(let i=0;i<22;i++){
      const x=-.92+(i%6)*.35+.05*Math.sin(i*7),y=-.53+Math.floor(i/6)*.27,size=.095+(i%4)*.022;
      const fragment=pebble(root,paints[i%3],[size*1.28,size,.045],[x,y,.31],`breccia-angular-clast-${i}`);fragment.userData.diagnosticImpactSignature=false;
    }
    const glass=material('#333d3a',.3,.04);
    for(let i=0;i<5;i++)pebble(root,glass,[.08,.055,.065],[-.72+i*.36,.5+(i%2)*.014,.06],`associated-glassy-fragment-${i}`);
    families.impact={root};
  }

  {
    const root=family('modern'),grainPaints=[rock('#9b8d71'),rock('#c1b399'),rock('#777f70')],grains:THREE.Mesh[]=[];
    const support=add(root,new THREE.BoxGeometry(2.24,.1,.65),rock('#857761'),'modern-sediment-support');support.position.y=-.785;
    for(let i=0;i<17;i++){
      const row=Math.floor(i/6),x=-.94+(i%6)*.36+row*.065,y=-.55+row*.38,size=.18+(i%3)*.026;
      const grain=pebble(root,grainPaints[i%3],[size*1.13,size*.9,size*.88],[x,y,(i%2)*.1],`modern-mineral-grain-${i}`);grain.userData.materialId=`modern-${i}`;grains.push(grain);
    }
    const water=keepMaterial(new THREE.MeshPhysicalMaterial({color:'#7da9ae',roughness:.18,transparent:true,opacity:.6,depthWrite:false}));
    for(let i=0;i<4;i++)tube(root,[[-.76+i*.43,-.24,.13],[-.62+i*.43,-.3,.21],[-.48+i*.43,-.22,.15]],.047,water,`qualitative-pore-water-${i}`);
    const microbe=material('#6f8361',.6);
    for(let i=0;i<7;i++){const cell=ball(root,microbe,.046,[-.71+i*.21,-.24+(i%2)*.1,.25],`modern-pore-cell-${i}`);cell.scale.multiply(new THREE.Vector3(1.5,.65,.7));cell.rotation.z=i*.71;cell.userData.species='unspecified';}
    families.modern={root};
  }
  let disposed=false;
  function update(frame:JourneyFrame){
    if(disposed)return;
    for(const [kind,item]of Object.entries(families))item.root.visible=kind===frame.evidenceKind;
    const active=families[frame.evidenceKind];active?.update?.(frame);
    group.userData.evidenceKind=frame.evidenceKind;group.userData.stationId=frame.stationId;group.userData.progress=clamp(frame.progress);
  }
  function dispose(){
    if(disposed)return;disposed=true;group.removeFromParent();
    for(const geometry of geometries)geometry.dispose();for(const paint of materials)paint.dispose();group.clear();
  }
  return {group,update,dispose};
}
