import type { Planet } from '../data/planetsData.ts';
import * as THREE from 'three';
import mercury from '../assets/2k_mercury.jpg';
import venus from '../assets/2k_venus_atmosphere.jpg';
import earth from '../assets/2k_earth_daymap.jpg';
import clouds from '../assets/2k_earth_clouds.jpg';
import mars from '../assets/2k_mars.jpg';
import jupiter from '../assets/2k_jupiter.jpg';
import saturn from '../assets/2k_saturn.jpg';
import uranus from '../assets/2k_uranus.jpg';
import neptune from '../assets/2k_neptune.jpg';
import moon from '../assets/2k_moon.jpg';
import rings from '../assets/2k_saturn_ring_alpha.png';
const urls: Record<string,string>={mercury,venus,earth,mars,jupiter,saturn,uranus,neptune,moon};

// Topic-local texture ownership: URLs are bundled, asynchronous loads are bounded by
// the page lifetime, and a failed image retains the planet's identifiable base color.
export class PlanetMaterials {
  loader!: THREE.TextureLoader;
  textures!: Set<THREE.Texture>;
  disposed!: boolean;
  anisotropy!: number;

 constructor(renderer: THREE.WebGLRenderer) {this.loader=new THREE.TextureLoader();this.textures=new Set();this.disposed=false;this.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
 load(url: string,ready: (() => void) | undefined = undefined,color=true) {
  const texture=this.loader.load(url,()=>{if(this.disposed){texture.dispose();return;}ready?.();},undefined,()=>{if(!this.disposed)console.warn('Planet texture unavailable:',url);});
  texture.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
  texture.anisotropy=this.anisotropy;texture.wrapS=THREE.RepeatWrapping;
  this.textures.add(texture);return texture;
 }
 planet(data: Planet) {
  const uniforms={uMap:{value:null as THREE.Texture | null},uReady:{value:0},uCloudMap:{value:null as THREE.Texture | null},uCloudReady:{value:0},uBaseColor:{value:new THREE.Color(data.colorHex)},uLightPos:{value:new THREE.Vector3()},uComparison:{value:0},uTime:{value:0},uAtmosphere:{value:data.id==='earth'?1:['venus','uranus','neptune'].includes(data.id)?.25:0}};
  uniforms.uMap.value=this.load(urls[data.id],()=>{uniforms.uReady.value=1;});
  if(data.id==='earth')uniforms.uCloudMap.value=this.load(clouds,()=>{uniforms.uCloudReady.value=1;},false);
  return new THREE.ShaderMaterial({uniforms,
   vertexShader:`varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorld;
    void main(){vUv=uv;vNormal=normalize(mat3(modelMatrix)*normal);vec4 p=modelMatrix*vec4(position,1.0);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
   fragmentShader:`uniform sampler2D uMap; uniform sampler2D uCloudMap; uniform float uReady; uniform float uCloudReady; uniform vec3 uBaseColor; uniform vec3 uLightPos; uniform float uComparison; uniform float uAtmosphere;
    varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorld;
    void main(){
     vec3 albedo=uReady>.5?texture2D(uMap,vUv).rgb:uBaseColor;
     if(uCloudReady>.5){float cloud=texture2D(uCloudMap,vUv).r;albedo=mix(albedo,vec3(.94,.97,1.0),pow(cloud,1.35)*.78);}
     vec3 n=normalize(vNormal),viewDir=normalize(cameraPosition-vWorld),lightDir=normalize(uLightPos-vWorld);
     float sunlight=max(0.0,dot(n,lightDir));
     float comparisonLight=.48+.52*max(0.0,dot(n,normalize(viewDir+vec3(-.3,.4,0.0))));
     float illumination=mix(.075+sunlight*.925,comparisonLight,uComparison);
     vec3 color=albedo*illumination;
     float rim=pow(1.0-max(0.0,dot(n,viewDir)),3.5);
     color+=vec3(.10,.27,.44)*rim*uAtmosphere*mix(sunlight,.7,uComparison);
     gl_FragColor=vec4(color,1.0);
     #include <colorspace_fragment>
    }`
  });
 }
 moon(){return new THREE.MeshStandardMaterial({map:this.load(moon),roughness:1,metalness:0});}
 ring(){return new THREE.MeshBasicMaterial({map:this.load(rings),transparent:true,side:THREE.DoubleSide,depthWrite:false,opacity:.9});}
 dispose(){this.disposed=true;for(const texture of this.textures)texture.dispose();this.textures.clear();}
}
