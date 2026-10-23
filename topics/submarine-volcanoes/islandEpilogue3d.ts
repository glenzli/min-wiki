import * as THREE from 'three';
import { islandEpilogue, SEABIRD_ENTRY_SPAN, type BirdArrival, type IslandEpilogue, type VisitorPose } from './islandEpilogue.ts';
import { WATER_Y, type OceanGeometryFrame, type XYZ } from './geometry3d.ts';

/** One gull and three fish share fixed meshes. No spawns, timers, textures or
 * lights; the enclosing scene supplies its existing bounded detail phase. */
export class IslandEpilogue3D {
  readonly group = new THREE.Group();
  private bird = new THREE.Group();
  private wings = [new THREE.Group(), new THREE.Group()];
  private fish: { body: THREE.Group; tail: THREE.Group }[] = [];
  private geometries = new Set<THREE.BufferGeometry>();
  private materials = new Set<THREE.MeshStandardMaterial>();
  private birdMaterial = this.material();
  private fishMaterial = this.material();
  private frame?: OceanGeometryFrame;
  private phase = 0;
  private cutaway = false;
  private disposed = false;
  private sample?: IslandEpilogue;
  private arrival?: BirdArrival;
  private reducedMotion = false;
  get state() { return this.sample; }
  get active() { return !this.disposed && !this.cutaway && !!this.sample?.visible; }

  constructor() {
    this.group.name = 'island-passing-wildlife'; this.group.visible = false;
    this.bird.name = 'passing-seabird'; this.bird.scale.setScalar(.40);
    this.part(this.bird, this.ellipsoid(.23, .10, .085, '#d1d4cf', '#8c979b'), this.birdMaterial);
    this.part(this.bird, this.ellipsoid(.072, .070, .063, '#e0ded1'), this.birdMaterial, [.19, .055, 0]);
    const beak = new THREE.ConeGeometry(.023, .105, 8); beak.rotateZ(-Math.PI / 2);
    this.colorize(beak, '#b69b60'); this.part(this.bird, beak, this.birdMaterial, [.285, .04, 0]);
    const eye = new THREE.SphereGeometry(.009, 8, 6); this.colorize(eye, '#20292c');
    this.part(this.bird, eye, this.birdMaterial, [.225, .072, .052]);
    this.part(this.bird, eye, this.birdMaterial, [.225, .072, -.052]);
    const wing = this.wing();
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
      this.part(bodyGroup, body, this.fishMaterial); this.part(bodyGroup, dorsal, this.fishMaterial);
      const left = this.part(bodyGroup, pectoral, this.fishMaterial);
      const right = this.part(bodyGroup, pectoral, this.fishMaterial); right.scale.z = -1;
      left.rotation.x = .08; right.rotation.x = -.08;
      tailGroup.position.x = -.43; this.part(tailGroup, tail, this.fishMaterial); bodyGroup.add(tailGroup);
      this.fish.push({body:bodyGroup,tail:tailGroup}); this.group.add(bodyGroup);
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
    const colors=new Float32Array(p.count*3),belly=new THREE.Color('#d2d8ca'),back=new THREE.Color('#516e73');
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      p.setXYZ(i,x*.48,y*.14*(1+.16*x),z*.085);
      const c=belly.clone().lerp(back,THREE.MathUtils.smoothstep(y,-.15,.6)); colors.set([c.r,c.g,c.b],i*3);
    }
    g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.computeVertexNormals();return g;
  }
  private pose(object: THREE.Group,pose: VisitorPose) {
    object.position.set(...pose.position);object.rotation.set(pose.bank,pose.heading,0,'YXZ');
  }
  draw(frame: OceanGeometryFrame, camera?: THREE.PerspectiveCamera) {
    if(this.disposed)return;
    const eligible = islandEpilogue(frame,this.phase).visible;
    if(!eligible) this.arrival=undefined;
    else if(!this.arrival) {
      let entry: XYZ = [-12,WATER_Y+2.65,1];
      if(camera) {
        camera.updateMatrixWorld();
        const direction=new THREE.Vector3(-1.18,.25,.5).unproject(camera).sub(camera.position).normalize();
        const distance=(WATER_Y+2.65-camera.position.y)/direction.y;
        if(Number.isFinite(distance)&&distance>0&&distance<150) entry=camera.position.clone().addScaledVector(direction,distance).toArray() as XYZ;
      }
      this.arrival={entry,phase:this.phase,age:this.reducedMotion?SEABIRD_ENTRY_SPAN:0};
    }
    this.frame=frame;this.updatePhase(this.phase);
  }
  updatePhase(phase: number) {
    if(this.disposed||!this.frame)return;
    if(this.arrival) this.arrival.age=Math.min(SEABIRD_ENTRY_SPAN,this.arrival.age+(phase-this.phase+Math.PI*2)%(Math.PI*2));
    this.phase=phase;this.sample=islandEpilogue(this.frame,phase,this.arrival);
    this.group.visible=this.active;if(!this.active)return;
    this.birdMaterial.opacity=1;this.fishMaterial.opacity=this.sample.opacity;
    this.pose(this.bird,this.sample.bird);this.wings[0].rotation.x=this.sample.bird.flex;this.wings[1].rotation.x=-this.sample.bird.flex;
    this.fish.forEach((fish,i)=>{this.pose(fish.body,this.sample!.fish[i]);fish.tail.rotation.y=this.sample!.fish[i].flex;});
  }
  setCutaway(cutaway: boolean) {this.cutaway=cutaway;this.group.visible=this.active;}
  setReducedMotion(reduced: boolean) {
    if(this.disposed||this.reducedMotion===reduced)return false;
    this.reducedMotion=reduced;
    if(reduced&&this.arrival)this.arrival.age=SEABIRD_ENTRY_SPAN;
    if(this.frame)this.updatePhase(this.phase);
    return true;
  }
  dispose() {
    if(this.disposed)return;this.disposed=true;this.group.visible=false;
    for(const g of this.geometries)g.dispose();for(const m of this.materials)m.dispose();
    this.group.clear();this.frame=undefined;this.sample=undefined;
  }
}
