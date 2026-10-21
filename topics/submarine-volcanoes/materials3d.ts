import * as THREE from 'three';
import { seed, WATER_Y } from './geometry3d.ts';

export type OceanUniforms = ReturnType<typeof oceanUniforms>;
export const oceanUniforms = () => ({ deep: { value: 0 }, clock: { value: .08 }, cutaway: { value: 0 } });

/** A small periodic volume, owned and disposed by each scene. No external assets. */
export function stoneNoise() {
  const size = 32, data = new Uint8Array(size ** 3);
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const lattice = (x: number, y: number, z: number, period: number) => {
    const a = Math.floor(x), b = Math.floor(y), c = Math.floor(z), fx = smooth(x - a), fy = smooth(y - b), fz = smooth(z - c);
    let value = 0;
    for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const index = (a + dx) % period + period * ((b + dy) % period + period * ((c + dz) % period));
      value += seed(index, 680 + period) * (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz);
    }
    return value;
  };
  for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = x + size * (y + size * z);
    const value = .50 * lattice(x / 8, y / 8, z / 8, 4) + .30 * lattice(x / 4, y / 4, z / 4, 8)
      + .20 * lattice(x, y, z, 32);
    data[i] = Math.round(255 * value);
  }
  const texture = new THREE.Data3DTexture(data, size, size, size);
  texture.format = THREE.RedFormat; texture.type = THREE.UnsignedByteType;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.RepeatWrapping;
  texture.unpackAlignment = 1; texture.needsUpdate = true;
  return texture;
}

const NOISE = /* glsl */`
uniform highp sampler3D uStone;
float grain(vec3 p){return texture(uStone,p*.03125).r;}
float fbm(vec3 p){return .58*grain(p)+.28*grain(p*2.13+9.)+.14*grain(p*4.31-7.);}
float filteredGrain(vec3 p){float footprint=max(length(dFdx(p)),length(dFdy(p)));return mix(grain(p),.5,smoothstep(.65,2.8,footprint));}
`;

const WATER = /* glsl */`
float submergedPath(vec3 p) {
  float distanceToEye=length(p-cameraPosition), water=${WATER_Y.toFixed(4)};
  if(p.y>=water && cameraPosition.y>=water)return 0.;
  float start=0.,end=1.;
  if(cameraPosition.y>=water)start=(water-cameraPosition.y)/(p.y-cameraPosition.y);
  if(p.y>=water)end=(water-cameraPosition.y)/(p.y-cameraPosition.y);
  if(uCutaway>.5){
    if(p.z>=0. && cameraPosition.z>=0.)return 0.;
    if(cameraPosition.z>=0.)start=max(start,-cameraPosition.z/(p.z-cameraPosition.z));
    if(p.z>=0.)end=min(end,-cameraPosition.z/(p.z-cameraPosition.z));
  }
  return distanceToEye*max(0.,end-start);
}
vec3 attenuate(vec3 color,vec3 p,float deep) {
  vec3 transmission=exp(-vec3(.145,.062,.040)*submergedPath(p)*(1.+deep*.42));
  vec3 scatter=mix(vec3(.012,.067,.083),vec3(.0011,.0035,.0052),deep);
  return color*transmission+scatter*(1.-transmission);
}
`;

/** Opaque glassy basalt, fragment-rich tuff, and exposed rock use one water path.
 * Heat occupies narrow fractures, rather than turning an entire pillow orange. */
export function stoneMaterial(noise: THREE.Data3DTexture, ocean: OceanUniforms, kind: 'basalt' | 'tuff' | 'section' | 'pillow' | 'magma' = 'basalt', variation = .5) {
  const heat = { value: 0 };
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .92, metalness: 0, side: THREE.DoubleSide });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { uStone: { value: noise }, uDeep: ocean.deep, uClock: ocean.clock, uHeat: heat, uCutaway: ocean.cutaway });
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOceanWorld;varying vec3 vStoneLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvStoneLocal=position;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec4 oceanPosition=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          oceanPosition=instanceMatrix*oceanPosition;
        #endif
        vOceanWorld=(modelMatrix*oceanPosition).xyz;`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vOceanWorld;varying vec3 vStoneLocal;uniform float uDeep;uniform float uClock;uniform float uHeat;uniform float uCutaway;
      ${NOISE}${WATER}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 samplePoint=${kind === 'pillow' || kind === 'magma' ? 'vStoneLocal' : 'vOceanWorld'};
        vec3 mineralPoint=samplePoint+vec3(${(variation * 21).toFixed(4)},${(variation * 13).toFixed(4)},0.);
        float coarse=fbm(mineralPoint*7.2), meso=fbm(mineralPoint*27.), grit=filteredGrain(mineralPoint*185.);
        float pits=smoothstep(.63,.83,filteredGrain(mineralPoint*94.));
        float fracture=(1.-smoothstep(.009,.037,abs(fbm(mineralPoint*11.+coarse*2.)-.51)))*smoothstep(.43,.61,grain(mineralPoint*4.7));
        ${kind === 'pillow' ? `
          float warp=(fbm(mineralPoint*13.)-.5)*.25;
          float f1=abs(dot(samplePoint,vec3(.29,.44,.78))-.24+warp);
          float f2=abs(dot(samplePoint,vec3(-.62,.57,.32))+.16+warp*.7);
          float f3=abs(dot(samplePoint,vec3(.71,.23,-.48))-.34-warp*.9);
          float joints=1.-smoothstep(.006,.026,min(f1,min(f2,f3)));
          fracture=joints*smoothstep(.42,.60,grain(mineralPoint*17.))*smoothstep(-.1,.55,samplePoint.y);
        ` : ''}
        vec3 basalt=mix(vec3(.014,.016,.015),vec3(.064,.068,.059),smoothstep(.24,.76,coarse));
        float rind=smoothstep(.45,.70,grain(mineralPoint*8.3));
        basalt=mix(basalt,basalt*vec3(.67,.65,.61),rind*.48);
        basalt=mix(basalt,vec3(.063,.047,.031),smoothstep(.65,.81,grain(mineralPoint*3.7))*.23);
        ${kind === 'tuff' ? 'basalt=mix(vec3(.052,.041,.029),vec3(.19,.15,.094),coarse);basalt=mix(basalt,vec3(.018,.019,.017),pits*.65);' : ''}
        ${kind === 'section' ? `basalt=mix(vec3(.045,.048,.043),vec3(.19,.164,.126),${variation.toFixed(4)});basalt*=.55+coarse*.9;` : ''}
        basalt*=.85+.29*grit;basalt*=1.-pits*.38;basalt*=1.-fracture*.48;
        ${kind === 'magma' ? 'basalt=mix(vec3(.024,.020,.017),vec3(.093,.055,.024),coarse);' : ''}
        diffuseColor.rgb*=basalt;
        float hot=${kind === 'magma' ? 'smoothstep(.46,.66,coarse)*.8+.12*fracture' : 'fracture'}*uHeat;
        float rockRelief=.0027*(grit-.5)+.011*(meso-.5)-.0055*fracture-.0028*pits;
        float glassPatch=smoothstep(.60,.75,grain(mineralPoint*8.))*smoothstep(.40,.60,coarse);
        float shallowLight=(1.-uDeep)*exp(-max(0.,${WATER_Y.toFixed(4)}-vOceanWorld.y)*.8);
        float caustic=pow(max(0.,sin(vOceanWorld.x*5.+sin(vOceanWorld.z*4.)+uClock*6.)*sin(vOceanWorld.z*5.7+vOceanWorld.x*1.8)),10.);
        diffuseColor.rgb*=1.+shallowLight*caustic*.16;
      `)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec3 dx=dFdx(-vViewPosition),dy=dFdy(-vViewPosition),r1=cross(dy,normal),r2=cross(normal,dx);
        float det=dot(dx,r1);
        normal=normalize(abs(det)*normal-sign(det)*(dFdx(rockRelief)*r1+dFdy(rockRelief)*r2));`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor=${kind === 'pillow' ? '.86+.10*grit-glassPatch*.38' : kind === 'tuff' ? '.83+.14*grit' : '.75+.15*meso+.08*grit'};`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance+=mix(vec3(.82,.012,.0003),vec3(4.4,.19,.002),clamp(hot,0.,1.))*hot*2.;`)
      .replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb=attenuate(gl_FragColor.rgb,vOceanWorld,uDeep);\n#include <tonemapping_fragment>');
  };
  material.customProgramCacheKey = () => `ocean-rock-${kind}-${variation}`;
  return { material, heat };
}

export function waterMaterial(noise: THREE.Data3DTexture, ocean: OceanUniforms) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uStone: { value: noise }, uDeep: ocean.deep, uClock: ocean.clock, uCutaway: ocean.cutaway },
    vertexShader: 'varying vec3 vWater;void main(){vec4 p=modelMatrix*vec4(position,1.);vWater=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',
    fragmentShader: /* glsl */`varying vec3 vWater;uniform float uDeep;uniform float uClock;uniform float uCutaway;${NOISE}
      void main(){
        if(uCutaway>.5 && vWater.z>0.)discard;
        vec3 view=normalize(cameraPosition-vWater);
        float t=uClock*3.;vec2 p=vWater.xz;
        float footprint=max(length(dFdx(p)),length(dFdy(p)));
        float swell=1.-smoothstep(.8,2.6,footprint),medium=1.-smoothstep(.12,.45,footprint),fine=1.-smoothstep(.035,.13,footprint);
        float warp=fbm(vec3(p*.71,t*.14))*3.5;
        float a=dot(p,vec2(.71,.38))+warp+t*.43,b=dot(p,vec2(-1.53,.82))-warp*.6-t*.71;
        float c=dot(p,vec2(3.27,2.11))+warp*1.4+t*1.12,d=dot(p,vec2(-7.6,5.31))+warp+t*1.71;
        float e=dot(p,vec2(16.1,-11.7))+warp*2.1-t*2.21;
        vec2 slope=swell*(vec2(.71,.38)*.014*cos(a)+vec2(-.88,.47)*.013*cos(b))
          +medium*(vec2(.84,.54)*.012*cos(c)+vec2(-.82,.57)*.008*cos(d))
          +fine*vec2(.81,-.59)*.006*cos(e);
        vec3 n=normalize(vec3(-slope.x,1.,-slope.y));
        float fresnel=.0204+.9796*pow(1.-abs(dot(view,n)),5.);
        vec3 reflected=reflect(-view,n);
        vec3 sky=mix(vec3(.23,.29,.30),vec3(.085,.15,.19),smoothstep(.04,.85,abs(reflected.y)));
        float sun=pow(max(0.,dot(reflect(-normalize(vec3(-.5,.85,.6)),n),view)),80.+fine*100.)*.45*(1.-uDeep);
        vec3 waterColor=mix(vec3(.006,.041,.053),sky,fresnel)+sun*vec3(.61,.59,.49);
        waterColor=mix(waterColor,vec3(.002,.010,.015)+sky*fresnel*.10,uDeep);
        gl_FragColor=vec4(waterColor,mix(.17,.98,smoothstep(.045,.68,fresnel)));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

export function oceanBackground(ocean: OceanUniforms) {
  return new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    uniforms: { uDeep: ocean.deep, uCutaway: ocean.cutaway },
    vertexShader: 'varying vec3 vWorld;void main(){vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',
    fragmentShader: /* glsl */`varying vec3 vWorld;uniform float uDeep;uniform float uCutaway;
      void main(){vec3 d=normalize(vWorld-cameraPosition);vec3 c;
        if(cameraPosition.y<${WATER_Y.toFixed(4)}) {
          float light=pow(max(0.,d.y),2.);c=mix(vec3(.008,.033,.046),vec3(.035,.155,.183),light);
          c=mix(c,vec3(.0015,.006,.012)+light*.008,uDeep);
        }else{c=mix(vec3(.22,.29,.31),vec3(.095,.16,.205),smoothstep(-.05,.8,d.y));}
        if(uCutaway>.5 && cameraPosition.z>0. && d.z<0.){
          float planeY=cameraPosition.y-d.y*cameraPosition.z/d.z;
          if(planeY>${WATER_Y.toFixed(4)})c=mix(vec3(.22,.29,.31),vec3(.095,.16,.205),smoothstep(0.,8.,planeY-${WATER_Y.toFixed(4)}));
          else c=mix(vec3(.024,.12,.15),vec3(.006,.027,.043),smoothstep(0.,11.,${WATER_Y.toFixed(4)}-planeY))*(1.-uDeep*.86);
        }
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

/** Finite particles in water and condensation in air are separate density fields.
 * Source depth terminates every ray at the real rock surface. */
export function plumeMaterial(noise: THREE.Data3DTexture, ocean: OceanUniforms) {
  const uniforms = { uStone: { value: noise }, uDeep: ocean.deep, uClock: ocean.clock, uCutaway: ocean.cutaway,
    uParcels: { value: Array.from({ length: 16 }, () => new THREE.Vector4(0, 0, 0, .01)) },
    uAxes: { value: Array.from({ length: 16 }, () => new THREE.Vector3(1, 1, 1)) },
    uDensity: { value: new Float32Array(16) }, uMin: { value: new THREE.Vector3() }, uMax: { value: new THREE.Vector3() },
    uDepth: { value: null as THREE.DepthTexture | null }, uResolution: { value: new THREE.Vector2(1, 1) },
    uInverse: { value: new THREE.Matrix4() }, uSteps: { value: 36 },
    uLamp: { value: new THREE.Vector3() }, uLampTarget: { value: new THREE.Vector3() } };
  const material = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, blending: THREE.NoBlending, uniforms,
    vertexShader: 'void main(){gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: /* glsl */`
      uniform vec4 uParcels[16];uniform vec3 uAxes[16];uniform float uDensity[16];uniform vec3 uMin;uniform vec3 uMax;
      uniform sampler2D uDepth;uniform vec2 uResolution;uniform mat4 uInverse;uniform int uSteps;
      uniform vec3 uLamp;uniform vec3 uLampTarget;
      uniform float uDeep;uniform float uClock;uniform float uCutaway;${NOISE}${WATER}
      float envelope(vec3 p,bool water){float density=0.;
        for(int i=0;i<16;i++){
          if((i<8)!=water || uDensity[i]<.001)continue;
          vec3 q=(p-uParcels[i].xyz)/(max(.01,uParcels[i].w)*uAxes[i]);
          density+=pow(max(0.,1.-dot(q,q)),1.45)*uDensity[i];
        }return density;}
      float field(vec3 p){bool water=p.y<${WATER_Y.toFixed(4)};
        if(water && uCutaway>.5 && p.z>0.)return 0.;
        float base=envelope(p,water);if(base<.003)return 0.;
        vec3 drift=p*38.-vec3(uClock*4.,uClock*31.,uClock*1.7);
        vec3 warp=vec3(grain(drift*.63),grain(drift*.63+11.),grain(drift*.63+23.))-.5;
        vec3 curl=vec3(sin(p.y*7.4-uClock*6.),.2*sin(p.x*8.1),cos(p.y*6.8-uClock*5.))*min(.075,max(0.,p.y-uParcels[0].y)*.11);
        base=envelope(p+warp*.16+curl,water);
        float roll=smoothstep(.36,.63,fbm(drift+warp*9.5));
        float flecks=grain(drift*3.1+roll*4.);
        float torn=max(0.,base*(.30+roll*1.8)-.22-(1.-flecks)*.18)+base*.012;
        float source=water?(1.-smoothstep(.10,.46,length(p-uParcels[0].xyz))):0.;
        return mix(torn,base*.85,source*.85);}
      void main(){
        vec2 uv=gl_FragCoord.xy/uResolution;
        vec4 nearP=uInverse*vec4(uv*2.-1.,-1.,1.);vec3 direction=normalize(nearP.xyz/nearP.w-cameraPosition);
        vec3 a=(uMin-cameraPosition)/direction,b=(uMax-cameraPosition)/direction;
        vec3 n=min(a,b),f=max(a,b);
        float start=max(0.,max(n.x,max(n.y,n.z))),end=min(f.x,min(f.y,f.z));
        float depth=texture2D(uDepth,uv).r;vec4 stopP=uInverse*vec4(uv*2.-1.,depth*2.-1.,1.);
        end=min(end,length(stopP.xyz/stopP.w-cameraPosition));
        if(end<=start){gl_FragColor=vec4(0.);return;}
        float stride=(end-start)/float(uSteps),jitter=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
        vec4 sum=vec4(0.);
        for(int i=0;i<48;i++){if(i>=uSteps)break;
          vec3 p=cameraPosition+direction*(start+(float(i)+jitter)*stride);
          float d=field(p);if(d<.008)continue;
          bool water=p.y<${WATER_Y.toFixed(4)};
          vec3 lampRay=normalize(uLamp-p),lightRay=normalize(mix(vec3(-.5,.85,.6),lampRay,uDeep));
          float shadowDensity=.65*envelope(p+lightRay*.20,water)+.35*envelope(p+lightRay*.46,water);
          float shade=exp(-shadowDensity*2.4);
          float beam=smoothstep(.67,.88,dot(normalize(p-uLamp),normalize(uLampTarget-uLamp)));
          float lamp=beam*min(1.2,20./max(1.,dot(uLamp-p,uLamp-p)));
          float illumination=mix(.78,.10+lamp*.95,uDeep);
          vec3 color=water?mix(vec3(.012,.020,.021),vec3(.25,.28,.24),shade):mix(vec3(.055,.063,.061),vec3(.62,.62,.56),shade);
          color*=illumination;
          color=attenuate(color,p,uDeep);
          float alpha=1.-exp(-d*stride*2.7);sum.rgb+=(1.-sum.a)*alpha*color;sum.a+=(1.-sum.a)*alpha;
          if(sum.a>.985)break;
        }gl_FragColor=sum;
      }`,
  });
  return { material, uniforms };
}

export function compositeMaterial(scene: THREE.Texture, plume: THREE.Texture) {
  return new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
    uniforms: { uScene: { value: scene }, uPlume: { value: plume } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: /* glsl */`varying vec2 vUv;uniform sampler2D uScene;uniform sampler2D uPlume;
      void main(){vec4 cloud=texture2D(uPlume,vUv);vec3 scene=texture2D(uScene,vUv).rgb;
        gl_FragColor=vec4(scene*(1.-cloud.a)+cloud.rgb,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}
