import * as THREE from 'three';
import { RING_BANDS, SATURN_RADIUS_KM, localRingParticle, ringPosition, type RingView } from './ringsModel.ts';
/** Ring geometry shares the planet's radius. Particle close-up has an explicit enlarged local scale. */
export class SaturnRings {
  readonly group=new THREE.Group();
  private disk=new THREE.Group();
  private patch=new THREE.Group();
  private particles:THREE.InstancedMesh;
  private tracers:THREE.Mesh[]=[];
  private dummy=new THREE.Object3D();
  private mode:RingView='bands';
  constructor(){
    this.group.add(this.disk,this.patch);
    for(const band of RING_BANDS){
      const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
        uniforms:{tint:{value:new THREE.Color(band.color)},density:{value:band.opacity}},
        vertexShader:'varying float radius; void main(){radius=length(position.xy);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:`varying float radius;uniform vec3 tint;uniform float density;
          float stripe(float f){return sin(radius*f)*(1.-smoothstep(.7,3.,fwidth(radius)*f));}
          void main(){float grain=.73+.12*stripe(130.)+.08*stripe(531.)+.07*stripe(1700.);
          gl_FragColor=vec4(tint*(.8+.2*grain),density*grain);#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`.replace(';#include',';\n#include')});
      const mesh=new THREE.Mesh(new THREE.RingGeometry(band.inner/SATURN_RADIUS_KM,band.outer/SATURN_RADIUS_KM,256,4),material);
      mesh.rotation.x=-Math.PI/2;this.disk.add(mesh);
    }
    for(const [i,r] of [95000,130000].entries()){
      const color=i===0?'#ffd777':'#86e7f5';
      const points=Array.from({length:193},(_,j)=>new THREE.Vector3(...ringPosition(r,0,j/192*Math.PI*2)));
      const path=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:true,opacity:.3}));path.position.y=.012;path.userData.tracer=true;this.disk.add(path);
      const marker=new THREE.Mesh(new THREE.SphereGeometry(.042,20,12),new THREE.MeshBasicMaterial({color}));marker.userData.tracer=true;this.disk.add(marker);this.tracers.push(marker);
    }
    this.particles=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:'#dfe8e7',roughness:.8,metalness:0,flatShading:true}),460);
    this.particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.particles.frustumCulled=false;this.patch.add(this.particles);
    for(let i=0;i<460;i++)this.particles.setColorAt(i,new THREE.Color().setHSL(.11+(i%7)*.008,.03+(i%5)*.018,.48+(i%11)*.035));
  }
  update(time:number,mode:RingView,tilt:THREE.Quaternion){
    this.mode=mode;this.disk.visible=mode!=='particles';this.patch.visible=mode==='particles';this.disk.quaternion.copy(tilt);
    this.disk.children.forEach(o=>{if(o.userData.tracer)o.visible=mode==='motion';});
    this.tracers.forEach((o,i)=>{o.position.set(...ringPosition(i===0?95000:130000,time*.6));o.position.y=.035;});
    if(mode==='particles')for(let i=0;i<460;i++){
      const [x,y,z]=localRingParticle(i,time),fade=THREE.MathUtils.smoothstep(3.5-Math.abs(z),0,.4);
      const size=(.025+Math.pow((Math.sin(i*31.7)+1)/2,5)*.15)*fade;
      this.dummy.position.set(x,y,z);this.dummy.rotation.set(i*.7,i*1.3,i*.31);this.dummy.scale.set(size,size*(.55+(i%4)*.12),size*.8);this.dummy.updateMatrix();this.particles.setMatrixAt(i,this.dummy.matrix);
    }
    this.particles.instanceMatrix.needsUpdate=true;
  }
  labels(){
    if(this.mode==='particles')return [];
    if(this.mode==='motion')return this.tracers.map((o,i)=>({id:i===0?'inner':'outer',position:o.position.clone().applyQuaternion(this.disk.quaternion)}));
    return RING_BANDS.filter(b=>this.mode==='bands'||b.id==='cassini').map((b,i)=>({id:b.id,position:new THREE.Vector3(...ringPosition((b.inner+b.outer)/2,0,this.mode==='gap'?0:[2.9,1.7,0,-1.2,.8][i]!)).applyQuaternion(this.disk.quaternion)}));
  }
  dispose(){this.group.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){o.geometry.dispose();(o.material as THREE.Material).dispose();}});this.group.clear();}
}
