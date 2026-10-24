import * as THREE from 'three';
import { advanceVisit, createBirdVisit, createFishVisit, islandEpilogue, SEABIRD_ENTRY_SPAN, type BirdVisit, type FishVisit, type IslandVisits, type IslandEpilogue, type VisitorPose } from './islandEpilogue.ts';
import { WATER_Y, type OceanGeometryFrame, type XYZ } from './geometry3d.ts';

/** One gull and three fish share fixed meshes. No spawns, timers, textures or
 * lights; the enclosing scene supplies its existing bounded detail phase. */
export class IslandEpilogue3D {
  readonly group = new THREE.Group();
  private bird = new THREE.Group();
  private wings = [new THREE.Group(), new THREE.Group()];
  private fish: { body: THREE.Group; tail: THREE.Group; fins: THREE.Mesh[]; geometry: THREE.BufferGeometry; rest: Float32Array }[] = [];
  private wingGeometry!: THREE.BufferGeometry;
  private wingRest!: Float32Array;
  private geometries = new Set<THREE.BufferGeometry>();
  private materials = new Set<THREE.MeshStandardMaterial>();
  private birdMaterial = this.material();
  private fishMaterial = this.material();
  private frame?: OceanGeometryFrame;
  private phase = 0;
  private cutaway = false;
  private disposed = false;
  private sample?: IslandEpilogue;
  private visits?: IslandVisits;
  private camera?: THREE.PerspectiveCamera;
  private reducedMotion = false;
  get state() { return this.sample; }
  get active() { return !this.disposed && !this.cutaway && !!this.sample?.visible; }

  constructor() {
    this.group.name = 'island-passing-wildlife'; this.group.visible = false;
    this.fishMaterial.roughness=.42;this.fishMaterial.metalness=.08;
    this.bird.name = 'passing-seabird'; this.bird.scale.setScalar(.40);
    this.part(this.bird, this.ellipsoid(.23, .09, .073, '#d8ddd6', '#99a5a7'), this.birdMaterial);
    this.part(this.bird, this.ellipsoid(.067, .061, .057, '#e2e1d8'), this.birdMaterial, [.19, .050, 0]);
    const beak = new THREE.ConeGeometry(.023, .105, 8); beak.rotateZ(-Math.PI / 2);
    this.colorize(beak, '#b69b60'); this.part(this.bird, beak, this.birdMaterial, [.285, .04, 0]);
    const eye = new THREE.SphereGeometry(.009, 8, 6); this.colorize(eye, '#20292c');
    this.part(this.bird, eye, this.birdMaterial, [.225, .072, .052]);
    this.part(this.bird, eye, this.birdMaterial, [.225, .072, -.052]);
    const wing = this.wing(); this.wingGeometry = wing;
    this.wingRest = (wing.getAttribute('position').array as Float32Array).slice();
    this.wings.forEach((hinge, side) => {
      hinge.position.set(.005, .025, side ? -.065 : .065);
      const mesh = this.part(hinge, wing, this.birdMaterial); mesh.scale.z = side ? -1 : 1;
      this.bird.add(hinge);
    });
    this.part(this.bird, this.fin([[-.15,.02,-.055],[-.36,.025,-.09],[-.34,.025,.09],[-.15,.02,.055]], '#b6c0bf'), this.birdMaterial);
    this.group.add(this.bird);

    const body = this.fishBody();
    const tail = this.fin([[0,0,0],[-.24,.15,0],[-.20,0,0],[-.24,-.15,0]], '#788e91');
    const dorsal = this.fin([[-.22,.05,0],[-.08,.23,0],[.21,.07,0]], '#758b8d');
    const pectoral = this.fin([[.12,0,0],[-.11,-.07,.20],[-.04,-.035,0]], '#9baca8');
    for (let i = 0; i < 3; i++) {
      const bodyGroup = new THREE.Group(), tailGroup = new THREE.Group();
      bodyGroup.name = `passing-fish-${i}`; bodyGroup.scale.setScalar([.32,.27,.30][i]);
      const geometry = i === 0 ? body : body.clone();
      this.part(bodyGroup, geometry, this.fishMaterial); this.part(bodyGroup, dorsal, this.fishMaterial);
      const left = this.part(bodyGroup, pectoral, this.fishMaterial);
      const right = this.part(bodyGroup, pectoral, this.fishMaterial); right.scale.z = -1;
      left.rotation.x = .08; right.rotation.x = -.08;
      tailGroup.position.x = -.43; this.part(tailGroup, tail, this.fishMaterial); bodyGroup.add(tailGroup);
      this.part(bodyGroup, eye, this.fishMaterial, [.36, .034, .056]);
      this.part(bodyGroup, eye, this.fishMaterial, [.36, .034, -.056]);
      this.fish.push({body:bodyGroup,tail:tailGroup,fins:[left,right],geometry,
        rest:(geometry.getAttribute('position').array as Float32Array).slice()}); this.group.add(bodyGroup);
    }
  }

  private material() {
    const material = new THREE.MeshStandardMaterial({vertexColors:true, roughness:.68, metalness:0,
      side:THREE.DoubleSide, transparent:true, opacity:1, depthWrite:true});
    this.materials.add(material); return material;
  }
  private colorize(geometry: THREE.BufferGeometry, color: string) {
    const c = new THREE.Color(color), colors = new Float32Array(geometry.getAttribute('position').count * 3);
    for(let i=0;i<colors.length;i+=3) colors.set([c.r,c.g,c.b],i);
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3)); return geometry;
  }
  private part(parent: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.MeshStandardMaterial, position?: [number,number,number]) {
    this.geometries.add(geometry); const mesh = new THREE.Mesh(geometry,material);
    if(position) mesh.position.set(...position); parent.add(mesh); return mesh;
  }
  private ellipsoid(x: number,y: number,z: number,color: string, back?: string) {
    const geometry = new THREE.SphereGeometry(1,20,12); geometry.scale(x,y,z); this.colorize(geometry,color);
    if(back) {
      const p=geometry.getAttribute('position'),c=geometry.getAttribute('color'),shade=new THREE.Color(back);
      for(let i=0;i<p.count;i++) if(p.getY(i)>y*.35) c.setXYZ(i,shade.r,shade.g,shade.b);
    }
    return geometry;
  }
  private fin(points: [number,number,number][],color: string) {
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));
    const indices:number[]=[]; for(let i=1;i<points.length-1;i++) indices.push(0,i,i+1);
    g.setIndex(indices); this.colorize(g,color); g.computeVertexNormals(); return g;
  }
  private wing() {
    const points:number[]=[],colors:number[]=[],indices:number[]=[];
    const grey=new THREE.Color('#b9c3c4'),tip=new THREE.Color('#38474e'),white=new THREE.Color('#d9dcd5');
    const span=24,chord=6;
    for(let side=0;side<2;side++) for(let i=0;i<=span;i++) for(let j=0;j<=chord;j++) {
      const t=i/span,v=j/chord;
      const width=(.25-.18*t)*Math.pow(Math.sin((1-t)*Math.PI/2),.34);
      const feather=t>.70? .018*Math.sin(t*54)*Math.pow(v,3):0;
      points.push(.12-.29*t-v*width+feather,
        .027*Math.sin(t*Math.PI)-.026*t*t+(side? -1:1)*.006*Math.sin(v*Math.PI)*Math.sin(t*Math.PI),t*.69);
      const c=(side?white:grey).clone().lerp(tip,THREE.MathUtils.smoothstep(t,.76,.93)*(.55+.45*v)); colors.push(c.r,c.g,c.b);
      const at=side*(span+1)*(chord+1)+i*(chord+1)+j;
      if(i<span&&j<chord) {
        const a=at,b=at+chord+1;
        indices.push(...(side?[a,a+1,b,a+1,b+1,b]:[a,b,a+1,a+1,b,b+1]));
      }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  private fishBody() {
    const g=new THREE.SphereGeometry(1,24,12),p=g.getAttribute('position');
    const colors=new Float32Array(p.count*3),belly=new THREE.Color('#dde2d6'),back=new THREE.Color('#81999d');
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      p.setXYZ(i,x*.48,y*.14*(1+.16*x),z*.085);
      const c=belly.clone().lerp(back,THREE.MathUtils.smoothstep(y,-.15,.6)); colors.set([c.r,c.g,c.b],i*3);
    }
    g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.computeVertexNormals();return g;
  }
  private pose(object: THREE.Group,pose: VisitorPose) {
    object.position.set(...pose.position);object.rotation.set(pose.bank,pose.heading,pose.pitch,'YXZ');object.visible=pose.visible;
  }
  private birdVisit(index: number): BirdVisit {
    const visit = createBirdVisit(index), camera = this.camera;
    if (!camera) return visit;
    camera.updateMatrixWorld();
    const edge = (side: number): XYZ => {
      const direction = new THREE.Vector3(side * 1.30, .23, .5).unproject(camera).sub(camera.position).normalize();
      const distance = (visit.altitude-camera.position.y)/direction.y;
      return Number.isFinite(distance) && distance > 0 && distance < 150
        ? camera.position.clone().addScaledVector(direction,distance).toArray() as XYZ
        : [side*40,visit.altitude,0];
    };
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
    const endAngle = visit.start + visit.orbitSpan * visit.direction;
    const towardRight = -visit.radius[0]*Math.sin(endAngle)*visit.direction*right.x
      + visit.radius[1]*Math.cos(endAngle)*visit.direction*right.z;
    visit.entry = edge(index % 3 === 1 ? 1 : -1);
    visit.exit = edge(towardRight > 0 ? 1 : -1);
    return visit;
  }
  private fishVisit(index: number): FishVisit {
    const visit = createFishVisit(index), camera = this.camera;
    if (!camera) return visit;
    camera.updateMatrixWorld();
    const across = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0).setY(0).normalize();
    if (across.lengthSq()<.5) across.set(1,0,0);
    const offshore = new THREE.Vector3(-across.z,0,across.x);
    if (offshore.dot(camera.position)<0) offshore.negate();
    const center = offshore.multiplyScalar(3.7 + .12*Math.sin(index*2.7));center.y=WATER_Y-.22;
    visit.center=center.toArray() as XYZ;visit.across=across.toArray() as XYZ;
    visit.halfWidth=Math.max(6,camera.position.distanceTo(center)*Math.tan(camera.fov*Math.PI/360)*camera.aspect*1.65);
    return visit;
  }
  draw(frame: OceanGeometryFrame, camera?: THREE.PerspectiveCamera) {
    if(this.disposed)return;
    this.camera=camera;
    const eligible = islandEpilogue(frame,this.phase).visible;
    if(!eligible) this.visits=undefined;
    else if(!this.visits) this.visits={bird:this.birdVisit(0),fish:this.fishVisit(0)};
    this.frame=frame;this.updatePhase(this.phase);
  }
  updatePhase(phase: number) {
    if(this.disposed||!this.frame)return;
    const nextPhase=((phase%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
    if(this.visits && !this.cutaway && !this.reducedMotion) {
      const delta=(nextPhase-this.phase+Math.PI*2)%(Math.PI*2);
      this.visits.bird=advanceVisit(this.visits.bird,delta,index=>this.birdVisit(index));
      this.visits.fish=advanceVisit(this.visits.fish,delta,index=>this.fishVisit(index));
    }
    this.phase=nextPhase;
    const visits=this.reducedMotion && this.visits ? {
      bird:{...this.visits.bird,age:SEABIRD_ENTRY_SPAN+1.5},
      fish:{...this.visits.fish,age:this.visits.fish.duration*.5,count:3}
    } : this.visits;
    this.sample=islandEpilogue(this.frame,this.reducedMotion?0:nextPhase,visits);
    this.group.visible=this.active;if(!this.active)return;
    this.birdMaterial.opacity=1;this.fishMaterial.opacity=this.sample.opacity;
    this.pose(this.bird,this.sample.bird);this.wings[0].rotation.x=this.sample.bird.flex;this.wings[1].rotation.x=-this.sample.bird.flex;
    if(this.sample.bird.visible) {
      const wingPosition=this.wingGeometry.getAttribute('position') as THREE.BufferAttribute;
      for(let i=0;i<wingPosition.count;i++) {
        const x=this.wingRest[i*3],y=this.wingRest[i*3+1],z=this.wingRest[i*3+2],t=z/.69;
        const bend=this.sample.bird.tip*t*t;
        wingPosition.setXYZ(i,x-bend*.035,y+bend*.32,z);
      }
      wingPosition.needsUpdate=true;this.wingGeometry.computeVertexNormals();
    }
    this.fish.forEach((fish,i)=>{
      const pose=this.sample!.fish[i];this.pose(fish.body,pose);
      if(!pose.visible)return;
      const p=fish.geometry.getAttribute('position') as THREE.BufferAttribute;
      for(let j=0;j<p.count;j++) {
        const x=fish.rest[j*3],s=THREE.MathUtils.clamp((.48-x)/.91,0,1);
        p.setXYZ(j,x,fish.rest[j*3+1],fish.rest[j*3+2]+.035*s*s*Math.sin(pose.tip-s*4));
      }
      p.needsUpdate=true;fish.geometry.computeVertexNormals();
      fish.tail.position.z=.035*Math.sin(pose.tip-4);fish.tail.rotation.y=pose.flex;
      fish.fins.forEach((fin,side)=>{fin.rotation.x=(side?-1:1)*(.1+.10*Math.sin(pose.tip*.5+i));});
    });
  }
  setCutaway(cutaway: boolean) {this.cutaway=cutaway;if(this.frame)this.updatePhase(this.phase);}
  setReducedMotion(reduced: boolean) {
    if(this.disposed||this.reducedMotion===reduced)return false;
    this.reducedMotion=reduced;
    if(this.frame)this.updatePhase(this.phase);
    return true;
  }
  dispose() {
    if(this.disposed)return;this.disposed=true;this.group.visible=false;
    for(const g of this.geometries)g.dispose();for(const m of this.materials)m.dispose();
    this.group.clear();this.frame=undefined;this.sample=undefined;this.visits=undefined;this.camera=undefined;
  }
}
