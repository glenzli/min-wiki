import * as THREE from 'three';
import type { World } from './model.ts';
import { structureNoise, structureTerrain } from './structureModel.ts';

const worldIndex: Record<World, number> = { earth: 0, venus: 1, mars: 2, titan: 3, moon: 4, mercury: 5 };

const terrainVertex = `
varying vec3 vP;
varying vec3 vN;
varying vec3 vWorld;
void main() {
  vP = position;
  vN = normalize(mat3(modelMatrix) * normal);
  vWorld = (modelMatrix * vec4(position, 1.)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`;

// Spatial grain stays attached to the retained surface. Only the optical
// water ripples consume time; they never move the contact surface or geology.
const terrainFragment = `
varying vec3 vP;
varying vec3 vN;
varying vec3 vWorld;
uniform float uWorld;
uniform float uSeconds;
float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float noise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x),
                 mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                 mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
}
void main() {
  vec3 p = vP, normal = normalize(vN);
  float broad = noise(p*4.3 + noise(p*2.1)*1.7);
  float grain = noise(p*36.)*.46 + noise(p*91.)*.34 + noise(p*213.)*.20;
  float rel = p.y + .024*p.x*p.x + .014*p.z*p.z;
  float steep = 1. - smoothstep(.58, .91, normal.y);
  float water = (1.-smoothstep(.0008,.014,abs(rel))) * smoothstep(.42,.88,normal.y);
  vec3 stone = mix(vec3(.105,.115,.106),vec3(.30,.31,.265),broad*.65+grain*.35);
  vec3 base = stone;
  if (uWorld < .5) {
    float wet = 1. - smoothstep(.012,.075,rel);
    float cover = smoothstep(.04,.14,rel) * (1.-smoothstep(.36,.66,rel)) * (1.-steep);
    cover *= smoothstep(.22,.63,broad+grain*.18);
    vec3 turf = mix(vec3(.055,.105,.04),vec3(.13,.18,.07),grain*.55+broad*.45);
    base = mix(stone,turf,cover*.88);
    base = mix(base,vec3(.065,.084,.07),wet*.5);
  } else if (uWorld < 1.5) {
    float folds = .5+.5*sin(p.y*47.+noise(p*8.2)*2.);
    base = mix(vec3(.135,.102,.07),vec3(.34,.275,.17),grain*.55+broad*.45);
    base *= .86 + folds*.14;
    water = 0.;
  } else if (uWorld < 2.5) {
    float dust = smoothstep(.7,.96,normal.y) * smoothstep(.28,.7,broad);
    base = mix(vec3(.19,.105,.065),vec3(.42,.25,.14),grain*.6+broad*.4);
    base = mix(base,vec3(.45,.295,.18),dust*.55);
    float ripples = .5+.5*sin(p.x*103.+p.z*41.+noise(p*9.)*2.);
    base *= .95+ripples*.05*dust;
    water = 0.;
  } else if (uWorld < 3.5) {
    base = mix(vec3(.12,.105,.065),vec3(.30,.255,.15),grain*.52+broad*.48);
    base = mix(base,vec3(.07,.075,.055),(1.-smoothstep(.01,.07,rel))*.5);
  } else {
    base = mix(vec3(.155,.16,.15),vec3(.34,.345,.31),grain*.57+broad*.43);
    if (uWorld > 4.5) base *= vec3(1.04,1.,.95);
    water = 0.;
  }
  float strata = .5+.5*sin(p.y*52.+noise(p*6.)*3.);
  float cut = (1.-smoothstep(.22,.72,normal.y)) * (1.-smoothstep(-.25,.02,p.y));
  base = mix(base,mix(vec3(.085,.076,.057),vec3(.19,.17,.13),strata),cut*.7);
  vec3 bump = vec3(noise(p*78.+vec3(9,0,0))-.5,0.,noise(p*78.+vec3(0,0,9))-.5);
  normal = normalize(normal + bump*.14);
  vec3 sun = normalize(vec3(-.45,.82,.52));
  float light = .30 + .68*max(dot(normal,sun),0.);
  vec3 color = base*light*(.92+grain*.12);
  if (water > .001) {
    float t = uSeconds;
    vec3 ripple = vec3(sin(p.x*42.+p.z*15.+t*.72)*.035+sin(p.z*91.-t*.31)*.012,
                        0., cos(p.z*37.-p.x*12.-t*.57)*.032);
    vec3 wn = normalize(normal+ripple);
    vec3 eye = normalize(cameraPosition-vWorld);
    float fresnel = pow(1.-max(dot(wn,eye),0.),4.);
    float glint = pow(max(dot(reflect(-sun,wn),eye),0.),92.);
    vec3 liquid = uWorld < .5 ? vec3(.018,.082,.095) : vec3(.035,.052,.044);
    liquid = mix(liquid,uWorld<.5?vec3(.13,.21,.245):vec3(.16,.17,.115),fresnel*.75);
    liquid += vec3(.70,.73,.65)*glint*.30;
    color = mix(color,liquid,water);
  }
  gl_FragColor = vec4(color,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

type GroundSite = { x: number; z: number; height: number; normal: THREE.Vector3; size: number; yaw: number };

function surfaceSite(heightAt: (x:number,z:number)=>number, x: number, z: number, size: number, yaw: number): GroundSite {
  const e = .012;
  const dx = (heightAt(x+e,z)-heightAt(x-e,z))/(2*e);
  const dz = (heightAt(x,z+e)-heightAt(x,z-e))/(2*e);
  return { x, z, height: heightAt(x,z), normal: new THREE.Vector3(-dx,1,-dz).normalize(), size, yaw };
}

function terrainSampler(positions:Float32Array) {
  return (x:number,z:number)=>{
    const gx=Math.max(0,Math.min(95.999999,(x/8.4+.5)*96)),gz=Math.max(0,Math.min(47.999999,(z/4.2+.5)*48));
    const i=Math.floor(gx),j=Math.floor(gz),u=gx-i,v=gz-j,a=(j*97+i)*3;
    const ha=positions[a+1],hb=positions[a+4],hc=positions[a+292],hd=positions[a+295];
    return u+v<=1?ha*(1-u-v)+hb*u+hc*v:hb*(1-v)+hc*(1-u)+hd*(u+v-1);
  };
}

function rockGeometry() {
  const geometry = new THREE.IcosahedronGeometry(1,1), positions = geometry.getAttribute('position');
  let low = Infinity;
  for (let i=0;i<positions.count;i++) {
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
    const grain=structureNoise(Math.round(x*1000)*.17+Math.round(y*1000)*.31+Math.round(z*1000)*.13);
    const h=y*(.86+grain*.20);
    positions.setXYZ(i,x*(.83+grain*.20),h,z*(.71+grain*.24));low=Math.min(low,h);
  }
  const colors = new Float32Array(positions.count*3);
  for (let i=0;i<positions.count;i++) {
    positions.setY(i,positions.getY(i)-low);
    const shade=.76+structureNoise(positions.getX(i)*17+positions.getZ(i)*31+positions.getY(i)*13)*.22;
    colors.set([shade,shade,shade*.97],i*3);
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  geometry.computeVertexNormals();geometry.computeBoundingBox();
  return geometry;
}

// Seven short, closed leaf volumes share one grounded tuft. Their maximum
// visible height is less than a tenth of a display unit, not giant grass poles.
function tuftGeometry() {
  const positions:number[]=[],indices:number[]=[];
  for(let i=0;i<7;i++) {
    const angle=i*2.399+.17,dx=Math.cos(angle),dz=Math.sin(angle);
    const h=.58+structureNoise(i+730)*.30,reach=.28+structureNoise(i+740)*.24;
    const px=-dz*.085,pz=dx*.085,tx=dx*reach,tz=dz*reach,n=positions.length/3;
    positions.push(0,0,0,tx,h,tz,tx*.6+px,h*.54,tz*.6+pz,tx*.6-px,h*.54,tz*.6-pz,tx*.6,h*.54+.025,tz*.6,tx*.6,h*.54-.025,tz*.6);
    indices.push(n,n+2,n+4,n,n+4,n+3,n,n+3,n+5,n,n+5,n+2,n+1,n+4,n+2,n+1,n+3,n+4,n+1,n+5,n+3,n+1,n+2,n+5);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  return geometry;
}

/** One fixed, illustrative landscape. No DOM, renderer, external asset or clock.
 * Visible land/water contact, retained details and atmospheric effects consume
 * structureGround; only supplied-time optical ripples change during update. */
export class StructureGround3D {
  readonly group = new THREE.Group();
  private readonly geometry = new Set<THREE.BufferGeometry>();
  private readonly materials = new Set<THREE.Material>();
  private readonly instances = new Set<THREE.InstancedMesh>();
  private readonly terrainMaterial: THREE.ShaderMaterial;
  private heightAt?: (x:number,z:number)=>number;
  private disposed = false;

  constructor(readonly world: World) {
    this.group.name=`illustrative-${world}-landscape`;
    const data=structureTerrain(world),terrain=new THREE.BufferGeometry();
    terrain.setAttribute('position',new THREE.BufferAttribute(data.positions,3));
    terrain.setAttribute('uv',new THREE.BufferAttribute(data.uv,2));
    terrain.setIndex(new THREE.BufferAttribute(data.indices,1));terrain.computeVertexNormals();
    // Narrow inlet banks are resolved by finite triangles. Detail roots sample
    // those exact triangles rather than hovering over the analytic curve.
    this.heightAt=terrainSampler(data.positions);
    this.terrainMaterial=new THREE.ShaderMaterial({vertexShader:terrainVertex,fragmentShader:terrainFragment,uniforms:{uWorld:{value:worldIndex[world]},uSeconds:{value:0}}});
    const body=new THREE.Mesh(terrain,this.terrainMaterial);body.name='structure-ground-body';this.add(body);
    this.makeRocks();
    if(world==='earth')this.makeVegetation();
  }

  private add(object: THREE.Mesh) {
    this.group.add(object);this.geometry.add(object.geometry);
    for(const material of Array.isArray(object.material)?object.material:[object.material])this.materials.add(material);
    if(object instanceof THREE.InstancedMesh)this.instances.add(object);
  }

  private makeRocks() {
    const sites:GroundSite[]=[],wanted=this.world==='earth'?72:this.world==='titan'?38:56;
    for(let i=0;i<1536&&sites.length<wanted;i++) {
      const x=-3.96+structureNoise(i*13+817)*7.92,z=-1.92+structureNoise(i*17+827)*3.84;
      const size=.025+structureNoise(i*19+837)*.071,site=surfaceSite(this.heightAt!,x,z,size,structureNoise(i+847)*Math.PI*2);
      const rel=site.height+.024*x*x+.014*z*z;
      if((this.world==='earth'||this.world==='titan')&&rel<.016)continue;
      if(site.normal.y<.78)continue;
      if(sites.some(other=>Math.hypot(other.x-x,other.z-z)<(size+other.size)*1.2))continue;
      sites.push(site);
    }
    const tint:Record<World,string>={earth:'#848b79',venus:'#8d7657',mars:'#83634e',titan:'#827553',moon:'#92958d',mercury:'#918b7e'};
    const rocks=new THREE.InstancedMesh(rockGeometry(),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96,metalness:0}),sites.length);
    const pose=new THREE.Object3D(),yaw=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),color=new THREE.Color(tint[this.world]);
    for(const [i,site]of sites.entries()) {
      pose.position.set(site.x,site.height-.014,site.z);
      pose.quaternion.setFromUnitVectors(up,site.normal);yaw.setFromAxisAngle(up,site.yaw);pose.quaternion.multiply(yaw);
      pose.scale.set(site.size,site.size*(.60+structureNoise(i+861)*.32),site.size);pose.updateMatrix();rocks.setMatrixAt(i,pose.matrix);
      rocks.setColorAt(i,color.clone().multiplyScalar(.80+structureNoise(i+871)*.32));
    }
    rocks.name='structure-ground-rocks';rocks.instanceMatrix.needsUpdate=true;if(rocks.instanceColor)rocks.instanceColor.needsUpdate=true;
    rocks.computeBoundingSphere();this.add(rocks);
  }

  private makeVegetation() {
    const sites:GroundSite[]=[];
    for(let i=0;i<2048&&sites.length<180;i++) {
      const x=-.48+structureNoise(i*23+917)*4.3,z=-1.93+structureNoise(i*29+927)*3.86;
      const site=surfaceSite(this.heightAt!,x,z,.046+structureNoise(i+937)*.033,structureNoise(i+947)*Math.PI*2);
      const rel=site.height+.024*x*x+.014*z*z;
      if(rel<.068||rel>.46||site.normal.y<.86)continue;
      sites.push(site);
    }
    const leaves=new THREE.InstancedMesh(tuftGeometry(),new THREE.MeshStandardMaterial({roughness:.92,metalness:0}),sites.length);
    const pose=new THREE.Object3D(),yaw=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),color=new THREE.Color();
    for(const [i,site]of sites.entries()) {
      pose.position.set(site.x,site.height-.004,site.z);pose.quaternion.setFromUnitVectors(up,site.normal);
      yaw.setFromAxisAngle(up,site.yaw);pose.quaternion.multiply(yaw);pose.scale.set(site.size,site.size*.8,site.size);pose.updateMatrix();leaves.setMatrixAt(i,pose.matrix);
      color.setHSL(.205+structureNoise(i+967)*.045,.26+structureNoise(i+977)*.13,.23+structureNoise(i+987)*.10);leaves.setColorAt(i,color);
    }
    leaves.name='structure-ground-vegetation';leaves.instanceMatrix.needsUpdate=true;if(leaves.instanceColor)leaves.instanceColor.needsUpdate=true;
    leaves.computeBoundingSphere();this.add(leaves);
  }

  update(seconds: number): void {
    if(this.disposed)return;
    this.terrainMaterial.uniforms.uSeconds.value=Number.isFinite(seconds)?seconds:0;
  }

  /** Exact retained typed-array payload, including instance matrices/colours.
   * Shader/driver overhead is deliberately not labelled as measured GPU memory. */
  get resourceBytes(): number {
    let bytes=0;
    for(const geometry of this.geometry) {
      for(const attribute of Object.values(geometry.attributes))bytes+=attribute.array.byteLength;
      bytes+=geometry.index?.array.byteLength??0;
    }
    for(const instance of this.instances)bytes+=instance.instanceMatrix.array.byteLength+(instance.instanceColor?.array.byteLength??0);
    return bytes;
  }

  dispose(): void {
    if(this.disposed)return;this.disposed=true;
    for(const instance of this.instances)instance.dispose();
    for(const geometry of this.geometry)geometry.dispose();
    for(const material of this.materials)material.dispose();
    this.group.clear();this.instances.clear();this.geometry.clear();this.materials.clear();this.heightAt=undefined;
  }
}
