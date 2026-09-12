import * as THREE from 'three';
import { compartmentPigments, leafRGB, mix, smooth } from './model.ts';
import type { Pigments } from './model.ts';

/** Topic-owned cutaway geometry; no timeline or biological state is held here. */
export class LeafMicroScene {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(33, 1.65, .1, 50);
  private groups = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
  private chlorophyll: THREE.InstancedMesh;
  private carotenoids: THREE.InstancedMesh;
  private stroma: THREE.InstancedMesh;
  private streams: THREE.InstancedMesh;
  private membranes: THREE.MeshStandardMaterial[] = [];
  private greenBodies: THREE.MeshStandardMaterial[] = [];
  private vacuoleMaterial: THREE.MeshPhysicalMaterial;
  private vacuoleDetailMaterial: THREE.MeshPhysicalMaterial;
  private anthocyanins: THREE.InstancedMesh;
  private cellAnthocyanins: THREE.InstancedMesh;
  private chloroplasts: THREE.Object3D[] = [];
  private proteinPositions: THREE.Vector3[] = [];
  private yellowPositions: THREE.Vector3[] = [];
  private helper = new THREE.Object3D();
  private color = new THREE.Color();
  private lastWidth = 0;
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.canvas = this.renderer.domElement;
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene.add(new THREE.HemisphereLight(0xffffe3, 0x304537, 1.7));
    const key = new THREE.DirectionalLight(0xfff4d1, 2.8); key.position.set(-4, 6, 7); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xa9d8ad, 2); rim.position.set(4, 2, -4); this.scene.add(rim);
    this.camera.zoom=1.48;this.camera.updateProjectionMatrix();
    this.scene.add(...this.groups);
    const cell = this.groups[0], organelle = this.groups[1];
    const wall = new THREE.MeshPhysicalMaterial({color:0x98b67b,roughness:.48,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false});
    this.organicCell(cell, [0,0,0], [2.55,1.88,1.07], wall);
    const membrane = new THREE.MeshPhysicalMaterial({color:0xc2db9b,roughness:.35,transparent:true,opacity:.1,side:THREE.BackSide,depthWrite:false});
    this.organicCell(cell,[0,0,0],[2.42,1.76,1.01],membrane);
    this.vacuoleMaterial = new THREE.MeshPhysicalMaterial({color:0xd4e8b2,roughness:.3,transparent:true,opacity:.44,depthWrite:false,clearcoat:.5});
    this.organicCell(cell,[.12,.04,-.1],[1.77,1.29,.69],this.vacuoleMaterial, .7);
    // The nucleolus and dispersed chromatin are inside a double nuclear envelope,
    // not protruding through the front as an eye-like lump (NCBI Bookshelf NBK9915).
    const nuclearEnvelope = new THREE.MeshPhysicalMaterial({color:0xb9afb8,roughness:.68,transparent:true,opacity:.4,depthWrite:false,side:THREE.DoubleSide});
    this.ellipsoid(cell,[-1.72,-.64,.12],[.32,.29,.26],nuclearEnvelope);
    this.ellipsoid(cell,[-1.72,-.64,.12],[.3,.271,.242],new THREE.MeshPhysicalMaterial({color:0xc6bbc5,roughness:.78,transparent:true,opacity:.2,depthWrite:false,side:THREE.BackSide}));
    this.ellipsoid(cell,[-1.78,-.61,.16],[.078,.065,.066],new THREE.MeshStandardMaterial({color:0x827586,roughness:.9}));
    const chromatinMaterial = new THREE.MeshStandardMaterial({color:0x8e8295,roughness:.9,transparent:true,opacity:.65});
    for(let strand=0;strand<5;strand++) {
      const points=Array.from({length:31},(_,i)=>{
        const a=i/30*Math.PI*2;
        return new THREE.Vector3(-1.72+.22*Math.cos(a+strand*.7),-.64+.18*Math.sin(a*2+strand),.12+.1*Math.sin(a*3+strand*.8));
      });
      cell.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),45,.006,5,false),chromatinMaterial));
    }
    for(let i=0;i<14;i++) {
      const a=i*Math.PI*2/14 + Math.sin(i*2.3)*.055, group=new THREE.Group();group.position.set(Math.cos(a)*2.08,Math.sin(a)*1.48,.08+Math.sin(i*2)*.13);group.rotation.z=a+Math.PI/2+Math.sin(i*3)*.14;group.scale.setScalar(.88+(Math.sin(i*4.1)*.5+.5)*.22);
      const material=new THREE.MeshStandardMaterial({color:0x517b34,roughness:.47});this.greenBodies.push(material);
      this.ellipsoid(group,[0,0,0],[.29,.14,.13],material);
      for(let j=-2;j<=2;j++) this.ellipsoid(group,[j*.08,0,.115],[.022,.075,.022],new THREE.MeshStandardMaterial({color:0x9dac59,roughness:.6}));
      group.visible = i !== 8; // Leave cytoplasmic space around the nucleus.
      cell.add(group);this.chloroplasts.push(group);
    }
    this.streams = this.particles(150,0x91ae6b,.014);cell.add(this.streams);
    this.cellAnthocyanins = this.particles(95,0x982450,.019);cell.add(this.cellAnthocyanins);
    // A separate liquid compartment: no thylakoids or chlorophyll are placed inside it.
    const vacuole = this.groups[2];
    this.vacuoleDetailMaterial = new THREE.MeshPhysicalMaterial({color:0xe2e8c7,roughness:.33,transparent:true,opacity:.28,side:THREE.BackSide,depthWrite:false,clearcoat:.3});
    this.organicCell(vacuole,[0,0,-.08],[2.17,1.42,.79],this.vacuoleDetailMaterial,.85);
    const tonoplast = new THREE.MeshStandardMaterial({color:0x9b956c,roughness:.52,transparent:true,opacity:.65});
    const edge = Array.from({length:97},(_,i)=>{const a=i/96*Math.PI*2,r=1+.068*Math.sin(3*a+1.4)+.038*Math.cos(5*a-.9);return new THREE.Vector3(2.17*Math.cos(a)*r+.05*Math.sin(a)**2,1.42*Math.sin(a)*r,.02);});
    vacuole.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge,true),110,.019,7,true),tonoplast));
    this.anthocyanins=this.particles(175,0xa52259,.031);vacuole.add(this.anthocyanins);
    // Remaining plastids are shown beyond the vacuolar membrane, in surrounding cytoplasm.
    for(let i=0;i<3;i++) {
      const group=new THREE.Group();group.position.set(-1.8+i*1.57,-1.62+Math.sin(i)*.03,-.22);group.rotation.z=-.3+i*.38;
      const mat=new THREE.MeshStandardMaterial({color:0x637d39,roughness:.58});this.greenBodies.push(mat);
      this.ellipsoid(group,[0,0,0],[.35,.16,.13],mat);
      for(let j=-2;j<=2;j++)this.ellipsoid(group,[j*.1,0,.105],[.025,.09,.022],new THREE.MeshStandardMaterial({color:0xb2b672,roughness:.6}));
      vacuole.add(group);
    }
    // A transparent envelope exposes the membrane network, rather than suggesting free-floating green molecules.
    const envelope = new THREE.MeshPhysicalMaterial({color:0xa5c776,roughness:.28,transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide,clearcoat:.7});
    this.ellipsoid(organelle,[0,0,0],[2.57,1.02,1.24],envelope);
    const inner = new THREE.MeshPhysicalMaterial({color:0xbcd395,roughness:.4,transparent:true,opacity:.1,depthWrite:false,side:THREE.BackSide});
    this.ellipsoid(organelle,[0,0,0],[2.49,.97,1.17],inner);
    const centers: THREE.Vector3[]=[];
    for(let i=0;i<7;i++) {
      const x=[-1.85,-1.24,-.62,.04,.68,1.27,1.84][i], z=[.23,-.36,.39,-.21,.3,-.34,.13][i], y=-.28+Math.sin(i*2.2)*.045;centers.push(new THREE.Vector3(x,y,z));
      const mat=new THREE.MeshStandardMaterial({color:0x65813a,roughness:.54,metalness:.02});this.membranes.push(mat);
      for(let j=0;j<6+(i%2);j++) {
        const yy=y+j*.105;
        const disc=new THREE.Mesh(new THREE.CylinderGeometry(.28,.29,.065,40),mat);disc.position.set(x,yy,z);organelle.add(disc);
        const edge=new THREE.Mesh(new THREE.TorusGeometry(.279,.012,5,40),new THREE.MeshStandardMaterial({color:0x9ba65c,roughness:.5}));edge.rotation.x=Math.PI/2;edge.position.set(x,yy+.026,z);organelle.add(edge);
        for(let k=0;k<12;k++) {const a=k/12*Math.PI*2;this.proteinPositions.push(new THREE.Vector3(x+Math.cos(a)*.263,yy+.018,z+Math.sin(a)*.263));}
        for(let k=0;k<3;k++){const a=k*2.1+j;this.yellowPositions.push(new THREE.Vector3(x+Math.cos(a)*.272,yy+.021,z+Math.sin(a)*.272));}
      }
    }
    for(let i=0;i<centers.length-1;i++) for(let row=0;row<2;row++) {
      const a=centers[i].clone().add(new THREE.Vector3(.22,row*.24,0)),b=centers[i+1].clone().add(new THREE.Vector3(-.22,row*.24,0));
      const curve=new THREE.CatmullRomCurve3([a,a.clone().lerp(b,.35).add(new THREE.Vector3(0,-.1,.06)),a.clone().lerp(b,.68).add(new THREE.Vector3(0,.08,-.04)),b]);
      organelle.add(new THREE.Mesh(new THREE.TubeGeometry(curve,16,.028,7,false),this.membranes[i]));
    }
    this.chlorophyll=this.particles(this.proteinPositions.length,0x245d28,.029);organelle.add(this.chlorophyll);
    this.carotenoids=this.particles(this.yellowPositions.length,0xd9aa35,.032);organelle.add(this.carotenoids);
    this.stroma=this.particles(220,0x9da96d,.012);organelle.add(this.stroma);
    this.ellipsoid(organelle,[1.15,-.45,.48],[.42,.18,.25],new THREE.MeshStandardMaterial({color:0xece3bd,roughness:.55}));
    const dna=Array.from({length:65},(_,i)=>{const a=i/64*Math.PI*2;return new THREE.Vector3(-1.1+Math.cos(a)*(.28+Math.sin(a*3)*.06),-.49+Math.sin(a*2)*.035,.57+Math.sin(a)*.18);});
    organelle.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(dna,true),70,.012,5,true),new THREE.MeshStandardMaterial({color:0xb6ba8a,roughness:.65})));
  }
  private particles(count:number,color:number,radius:number) {return new THREE.InstancedMesh(new THREE.SphereGeometry(radius,7,5),new THREE.MeshStandardMaterial({color,roughness:.65}),count);}
  private ellipsoid(parent:THREE.Object3D,position:number[],scale:number[],material:THREE.Material) {
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),material);mesh.position.set(position[0],position[1],position[2]);mesh.scale.set(scale[0],scale[1],scale[2]);parent.add(mesh);return mesh;
  }
  private organicCell(parent: THREE.Object3D, position: number[], scale: number[], material: THREE.Material, amount = 1) {
    const mesh = this.ellipsoid(parent, position, scale, material);
    const vertices = mesh.geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
      const a = Math.atan2(y, x), planar = Math.hypot(x, y);
      const radius = 1 + amount * planar * (.08 * Math.sin(3 * a + 1.4) + .045 * Math.cos(5 * a - .9));
      vertices.setXYZ(i, x * radius + amount * .06 * y * y, y * radius + amount * .035 * x, z * (1 + amount * .045 * x));
    }
    mesh.geometry.computeVertexNormals(); mesh.geometry.computeBoundingSphere();
    return mesh;
  }
  private place(mesh:THREE.InstancedMesh,index:number,x:number,y:number,z:number,size=1) {this.helper.position.set(x,y,z);this.helper.scale.setScalar(size);this.helper.updateMatrix();mesh.setMatrixAt(index,this.helper.matrix);}
  render(level:number,p:Pigments,time:number,width:number) {
    const targetWidth=Math.min(1200,Math.max(450,Math.round(width))), height=Math.round(targetWidth/1.65);
    if(targetWidth!==this.lastWidth){this.lastWidth=targetWidth;this.renderer.setSize(targetWidth,height,false);}
    this.groups[0].visible=level===2;this.groups[1].visible=level===3;this.groups[2].visible=level===4;
    const base=leafRGB(compartmentPigments(p,'chloroplast')); this.color.setRGB(base[0]/255,base[1]/255,base[2]/255,THREE.SRGBColorSpace);
    for(const material of [...this.membranes,...this.greenBodies])material.color.copy(this.color);
    const vac=mix([212,232,178],[156,30,79],p.anthocyanins);this.vacuoleMaterial.color.setRGB(vac[0]/255,vac[1]/255,vac[2]/255,THREE.SRGBColorSpace);this.vacuoleMaterial.opacity=.35+p.anthocyanins*.42;
    const liquid=mix([236,241,214],[182,41,89],p.anthocyanins);this.vacuoleDetailMaterial.color.setRGB(liquid[0]/255,liquid[1]/255,liquid[2]/255,THREE.SRGBColorSpace);this.vacuoleDetailMaterial.opacity=.28+p.anthocyanins*.38;
    const red=compartmentPigments(p,'vacuole').anthocyanins;
    for(const [mesh,rx,ry,rz] of [[this.anthocyanins,1.91,1.21,.57],[this.cellAnthocyanins,1.5,1.05,.48]] as const) {
      for(let i=0;i<mesh.count;i++) {
        const a=i*2.399+time*.013,r=((i+.5)/mesh.count)**(1/3),z=Math.sin(i*5.7),radial=Math.sqrt(1-z*z),threshold=((i*37)%173)/173;
        this.place(mesh,i,Math.cos(a)*radial*rx*r,Math.sin(a)*radial*ry*r,z*rz*r+.12,smooth(threshold-.06,threshold+.06,red));
      }
      mesh.instanceMatrix.needsUpdate=true;
    }
    for(let i=0;i<this.chloroplasts.length;i++){const a=i*Math.PI*2/14+Math.sin(i*2.3)*.055+Math.sin((i===2?0:time)*.11+i)*.025;const r=1+.06*Math.sin(3*a+1.4)+.03*Math.cos(5*a-.9);this.chloroplasts[i].position.x=Math.cos(a)*2.03*r;this.chloroplasts[i].position.y=Math.sin(a)*1.44*r;}
    for(let i=0;i<150;i++){const a=i*2.399+time*.025,r=1+(i%4)*.016;this.place(this.streams,i,Math.cos(a)*2.16*r,Math.sin(a)*1.55*r,Math.sin(i*4)*.4);}
    this.streams.instanceMatrix.needsUpdate=true;
    this.proteinPositions.forEach((v,i)=>{const threshold=((i*37)%601)/601;this.place(this.chlorophyll,i,v.x,v.y,v.z,smooth(threshold-.06,threshold+.06,p.chlorophyll));});this.chlorophyll.instanceMatrix.needsUpdate=true;
    this.yellowPositions.forEach((v,i)=>this.place(this.carotenoids,i,v.x,v.y,v.z,.65+p.carotenoids*.5));this.carotenoids.instanceMatrix.needsUpdate=true;
    for(let i=0;i<220;i++){const a=i*2.399+time*.006,r=((i+.5)/220)**(1/3),z=Math.sin(i*5.1),radial=Math.sqrt(1-z*z);this.place(this.stroma,i,Math.cos(a)*radial*2.32*r,Math.sin(a)*radial*.84*r,z*1.1*r); }this.stroma.instanceMatrix.needsUpdate=true;
    this.camera.position.set(level===3?.4:0,level===3?3.5:.35,level===3?8.7:9.4);this.camera.lookAt(0,0,0);
    this.renderer.render(this.scene,this.camera);return this.canvas;
  }
  anchor(name: 'wall'|'plastid'|'plastidTip'|'nucleus'|'vacuole'|'pigment'|'envelope'|'thylakoid'|'tonoplast'|'vacuolarPigment'|'outsidePlastid'): [number,number] {
    const positions = {wall:new THREE.Vector3(-2.45,.35,0),plastid:this.chloroplasts[2].position.clone(),plastidTip:this.chloroplasts[2].localToWorld(new THREE.Vector3(.29,0,0)),nucleus:new THREE.Vector3(-1.72,-.64,.12),vacuole:new THREE.Vector3(.65,-.5,.35),pigment:this.chloroplasts[12].position.clone(),envelope:new THREE.Vector3(-2.45,0,0),thylakoid:new THREE.Vector3(1.15,.35,-.38),tonoplast:new THREE.Vector3(-1.86,.58,.02),vacuolarPigment:new THREE.Vector3(.75,.6,.25),outsidePlastid:new THREE.Vector3(1.34,-1.59,-.12)};
    const v=positions[name].project(this.camera);return [v.x*265,-v.y*161];
  }
  dispose() {
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
    this.scene.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.renderer.dispose();
  }
}
