import * as THREE from 'three';
import { seed, WATER_Y } from './geometry3d.ts';

export type OceanUniforms = ReturnType<typeof oceanUniforms>;
export const oceanUniforms = () => ({ deep: { value: 0 }, clock: { value: .08 }, detailPhase: { value: 0 }, cutaway: { value: 0 }, emergence: { value: 0 } });

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
export function stoneMaterial(noise: THREE.Data3DTexture, ocean: OceanUniforms, kind: 'basalt' | 'tuff' | 'section' | 'pillow' | 'magma' | 'feeder' | 'flow' | 'pillow-flow' | 'extruded' | 'ejecta' = 'basalt', variation = .5, pillowVariant = 0) {
  const heat = { value: 0 };
  const flowLength = { value: 1 };
  const flowFront = { value: 1 };
  const flowFeed = { value: 0 };
  const outletCover = { value: 0 };
  const outletDirection = { value: new THREE.Vector2(1, 0) };
  const molten = ['pillow', 'magma', 'feeder', 'flow', 'pillow-flow', 'extruded', 'ejecta'].includes(kind);
  const lip = .29 + seed(pillowVariant, 306) * .28;
  const lipPhase = seed(pillowVariant, 302) * Math.PI * 2;
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .92, metalness: 0, side: THREE.DoubleSide });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { uStone: { value: noise }, uDeep: ocean.deep, uClock: ocean.clock, uDetailPhase: ocean.detailPhase, uHeat: heat, uCutaway: ocean.cutaway, uIslandEmergence: ocean.emergence,
      uRockVariation: { value: variation }, uPillowLip: { value: new THREE.Vector2(lip, lipPhase) }, uFlowLength: flowLength, uFlowFront: flowFront, uFlowFeed: flowFeed,
      uOutletCover: outletCover, uOutletDirection: outletDirection });
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\nvarying vec3 vOceanWorld;varying vec3 vStoneLocal;varying vec2 vMeltUV;uniform float uDetailPhase;uniform float uHeat;uniform vec2 uPillowLip;uniform float uFlowLength;${kind === 'flow' ? 'attribute float oceanQuench;attribute float oceanDistance;attribute float oceanFlowStage;varying float vQuench;varying float vDistance;varying float vFlowStage;' : ''}${kind === 'pillow-flow' ? 'attribute float oceanQuench;attribute float oceanDistance;varying float vQuench;varying float vDistance;uniform float uFlowFront;uniform float uFlowFeed;' : ''}${kind === 'ejecta' ? 'attribute float oceanHeat;attribute float oceanQuench;attribute float oceanFreshFace;varying float vShardHeat;varying float vFreshFace;' : ''}${kind === 'extruded' ? 'attribute float oceanPoolSkin;varying float vPoolSkin;' : ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vStoneLocal=position;vMeltUV=uv;
        ${kind === 'pillow-flow' ? 'vQuench=oceanQuench;vDistance=oceanDistance;' : ''}
        ${kind === 'flow' ? 'vQuench=oceanQuench;vDistance=oceanDistance;vFlowStage=oceanFlowStage;' : ''}
        ${kind === 'ejecta' ? 'vShardHeat=oceanHeat;vFreshFace=mix(1.,oceanFreshFace,oceanQuench);' : ''}
        ${kind === 'extruded' ? 'vPoolSkin=oceanPoolSkin;' : ''}
        ${kind === 'pillow' ? `
          if(uHeat>.001){
          float lipX=uPillowLip.x+.09*sin(atan(position.z,position.y)*3.+uPillowLip.y);
          float lipMobility=(1.-smoothstep(.08,.25,abs(position.x-lipX)))*smoothstep(-.04,.28,position.y)*clamp(uHeat,0.,1.);
          float fold=sin(position.z*9.-uDetailPhase*2.)+.35*sin(position.z*17.+position.x*5.-uDetailPhase*3.);
          transformed+=normal*.018*lipMobility*fold;
          }
        ` : kind === 'pillow-flow' ? `
          if(uHeat>.001){
          float top=smoothstep(.05,.75,sin(uv.x*6.2831853));
          float ends=smoothstep(0.,.09,oceanDistance)*(1.-smoothstep(uFlowFront-.065,uFlowFront,oceanDistance));
          float fedSkin=uFlowFeed*(1.-smoothstep(.24,.90,abs(cos(uv.x*6.2831853))));
          float mobility=max(1.-smoothstep(.35,.94,oceanQuench),fedSkin*.82)*top*ends*clamp(uHeat,0.,1.);
          float fold=sin(oceanDistance*14.-uDetailPhase*2.+.55*sin(oceanDistance*5.-uDetailPhase))+.36*sin(oceanDistance*25.-uDetailPhase*3.+uv.x*2.);
          transformed.y+=.032*mobility*fold;
          }
        ` : kind === 'flow' ? `
          if(uHeat>.001){
          float distance=oceanDistance;
          float endMask=smoothstep(0.,.10,distance)*(1.-smoothstep(uFlowLength-.10,uFlowLength,distance));
          float side=abs(sin(uv.x*6.2831853)),top=smoothstep(.25,.60,cos(uv.x*6.2831853));
          float mobility=(1.-smoothstep(.38,.91,side))*top;
          float fold=sin(distance*15.-uDetailPhase*2.+.55*sin(distance*5.-uDetailPhase))+.38*sin(distance*27.-uDetailPhase*3.+side*2.);
          // Underwater relief stays below .017 scene units; the entire
          // terrain-facing half and the seated banks remain fixed.
          transformed.y+=mix(.012,.022,oceanFlowStage)*clamp(uHeat,0.,1.)*(1.-oceanQuench)*endMask*mobility*fold;
          }
        ` : ''}`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec4 oceanPosition=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          oceanPosition=instanceMatrix*oceanPosition;
        #endif
        vOceanWorld=(modelMatrix*oceanPosition).xyz;`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vOceanWorld;varying vec3 vStoneLocal;varying vec2 vMeltUV;uniform float uDeep;uniform float uClock;uniform float uDetailPhase;uniform float uHeat;uniform float uCutaway;uniform float uRockVariation;uniform vec2 uPillowLip;uniform float uIslandEmergence;uniform float uFlowLength;
      ${kind === 'flow' ? 'varying float vQuench;varying float vDistance;varying float vFlowStage;uniform float uFlowFeed;' : ''}
      ${kind === 'pillow-flow' ? 'varying float vQuench;varying float vDistance;uniform float uFlowFeed;' : ''}
      ${kind === 'ejecta' ? 'varying float vShardHeat;varying float vFreshFace;' : ''}
      ${kind === 'extruded' ? 'varying float vPoolSkin;uniform float uOutletCover;uniform vec2 uOutletDirection;' : ''}
      ${NOISE}${WATER}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 samplePoint=${molten ? 'vStoneLocal' : 'vOceanWorld'};
        vec3 mineralPoint=samplePoint+vec3(uRockVariation*21.,uRockVariation*13.,0.);
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
        ${kind === 'section' ? 'basalt=mix(vec3(.045,.048,.043),vec3(.19,.164,.126),uRockVariation);basalt*=.55+coarse*.9;' : ''}
        basalt*=.85+.29*grit;basalt*=1.-pits*.38;basalt*=1.-fracture*.48;
        ${kind === 'magma' ? 'basalt=mix(vec3(.024,.020,.017),vec3(.093,.055,.024),coarse);' : ''}
        float wetBand=${['section', 'magma', 'feeder'].includes(kind) ? '0.' : `uIslandEmergence*exp(-pow((vOceanWorld.y-${WATER_Y.toFixed(4)}+.025)/.12,2.))*(.65+.35*coarse)`};
        basalt*=1.-wetBand*.48;
        // The solid framework and exposed melt domain stay material-attached.
        // Only detail inside those openings consumes the bounded 2pi phase.
        float meltMask=0.,liquidDetail=1.,liquidRelief=0.,crustRelief=0.,exposureHeat=uHeat${kind === 'ejecta' ? '*vShardHeat' : kind === 'flow' ? '*(1.-vQuench*.78)' : ''};
        if(exposureHeat>.001){
        ${kind === 'pillow' ? `
          float lipX=uPillowLip.x+.09*sin(atan(samplePoint.z,samplePoint.y)*3.+uPillowLip.y);
          float lipBand=1.-smoothstep(.035,.13,abs(samplePoint.x-lipX));
          float tornLip=lipBand*smoothstep(-.05,.27,samplePoint.y)*smoothstep(.30,.55,meso);
          meltMask=max(fracture*.72,tornLip);
        ` : kind === 'pillow-flow' ? `
          float distance=vDistance,top=smoothstep(-.1,.7,sin(vMeltUV.x*6.2831853));
          float drift=distance*14.-uDetailPhase*2.+.55*sin(distance*5.-uDetailPhase);
          vec3 moving=vec3(sin(drift)*3.6,cos(drift)*3.6,cos(vMeltUV.x*6.2831853)*5.);
          float staticRafts=fbm(vec3(sin(distance*14.)*3.6,cos(distance*14.)*3.6,cos(vMeltUV.x*6.2831853)*5.)+uRockVariation*17.);
          float center=1.-smoothstep(.20,.88,abs(cos(vMeltUV.x*6.2831853)));
          float fedSkin=uFlowFeed*center;
          float mobility=max(1.-smoothstep(.38,.96,vQuench),fedSkin*.85);
          float rafts=mix(staticRafts,fbm(moving+uRockVariation*17.),mobility);
          float skinAge=vQuench*(1.-fedSkin*.76);
          float cover=smoothstep(.41-skinAge*.13,.58-skinAge*.15,rafts);
          float tears=1.-smoothstep(.009,.032,abs(rafts-.49));
          float liquid=(1.-cover)*(1.-smoothstep(.72,1.,skinAge));
          // The active interior keeps opening a connected irregular strip;
          // quenched banks and unequal floating rafts retain its thickness.
          float openFold=fedSkin*(.14+.20*(1.-cover));
          meltMask=(liquid*.84+openFold+tears*(.035+.18*mobility))*top;
          basalt*=mix(1.,.60,cover*top);
        ` : kind === 'magma' ? `
          float crystals=smoothstep(.53,.68,meso+.10*(grit-.5));
          meltMask=smoothstep(.39,.57,coarse)*(1.-crystals*.94);
        ` : kind === 'feeder' ? 'meltMask=.32+.58*smoothstep(.38,.61,fbm(vec3(samplePoint.x*60.,vMeltUV.y*140.,samplePoint.z*20.)));'
          : kind === 'flow' ? `
            float flowSide=abs(sin(vMeltUV.x*6.2831853));
            float top=smoothstep(.02,.42,cos(vMeltUV.x*6.2831853));
            float distance=vDistance;
            float drift=distance*13.-uDetailPhase*2.+.65*sin(distance*5.-uDetailPhase+flowSide);
            // Closed phase coordinates transport unequal cold rafts downstream.
            // Outer banks remain quenched; bright exposure is in torn seams.
            vec3 raftPoint=vec3(sin(drift)*5.1,cos(drift)*5.1,sin(vMeltUV.x*6.2831853)*6.5+sin(drift*2.)*.7);
            float rafts=fbm(raftPoint+uRockVariation*17.);
            float banks=smoothstep(.60,.97,flowSide);
            float seam=1.-smoothstep(.012,.045,abs(rafts-.49));
            float opening=smoothstep(.50,.62,rafts);
            meltMask=(seam*.44+opening*.70)*(1.-banks*.96)*(.65+.35*meso);
            // A dark quenched skin can still enclose hot lava. Only narrow
            // tears expose that interior; wet rock does not glow as a sheet.
            meltMask=mix(meltMask,(fracture*.30+seam*.16)*(1.-banks*.96),smoothstep(.65,1.,vQuench));
            // A lobate underwater body develops a dark rind from the older
            // root toward the newly arrived head. Supply can split a narrow
            // upper seam without repainting every old lobe as fresh lava.
            float liveCore=uFlowFeed*(1.-smoothstep(.12,.72,flowSide));
            float skinAge=vQuench*(1.-liveCore*.44);
            float stillRafts=fbm(vec3(sin(distance*13.)*5.1,cos(distance*13.)*5.1,sin(vMeltUV.x*6.2831853)*6.5)+uRockVariation*17.);
            float skinRafts=mix(stillRafts,rafts,max(1.-vQuench,liveCore*.7));
            float darkRind=smoothstep(.40-skinAge*.12,.56-skinAge*.12,skinRafts);
            float tornSkin=1.-smoothstep(.008,.032,abs(skinRafts-.49));
            float newSkin=(1.-darkRind)*(1.-smoothstep(.36,.96,skinAge));
            float feedSplit=1.-smoothstep(.016,.048,abs((skinRafts-.5)*.65+sin(vMeltUV.x*6.2831853)*.28));
            float splitWindows=smoothstep(.54,.88,.5+.5*sin(distance*10.+uRockVariation*21.+.8*sin(distance*2.7)));
            feedSplit*=splitWindows;
            float wetMelt=(newSkin*.88+tornSkin*(.035+liveCore*.24)+liveCore*((1.-darkRind)*.22+feedSplit*.40))*(1.-banks);
            meltMask=mix(wetMelt,meltMask,vFlowStage)*top;
            exposureHeat=uHeat*mix(max(1.-vQuench*.78,uFlowFeed*.68),1.-vQuench*.78,vFlowStage);
            basalt*=mix(1.,mix(.58,1.,smoothstep(.35,.60,rafts)),(1.-banks)*clamp(exposureHeat,0.,1.));
          `
          : kind === 'extruded' ? `
            // The perimeter and underside stay quenched and seated in the rim.
            // Only inner skin is advected; geometry owns its bounded relief.
            float poolRadius=clamp(vMeltUV.x,0.,1.);
            // Cartesian attachment avoids interpolating the 0/1 angular seam.
            vec2 poolPoint=samplePoint.xz*3.6;
            float bank=smoothstep(.58,.98,poolRadius);
            vec3 drift=vec3(poolPoint*5.4+vec2(cos(uDetailPhase),sin(uDetailPhase))*.52,
              .7*sin(uDetailPhase*2.+poolPoint.x*1.7));
            float rafts=fbm(drift+vec3(uRockVariation*17.));
            float cover=smoothstep(.38,.59,rafts+.07*sin(poolPoint.y*7.+poolPoint.x*4.));
            float tears=1.-smoothstep(.012,.044,abs(rafts-.50));
            meltMask=vPoolSkin*(1.-bank)*((1.-cover)*.82+tears*.28);
            // Initial underwater effusion is mostly hidden by a bulging rind.
            // Its asymmetric opening faces the connected downslope outflow.
            float outletAlong=dot(samplePoint.xz,uOutletDirection);
            float outletAcross=dot(samplePoint.xz,vec2(-uOutletDirection.y,uOutletDirection.x));
            float tongue=1.-smoothstep(.055,.125,abs(outletAcross+(rafts-.5)*.07));
            float mouth=smoothstep(-.09,.035,outletAlong)*(1.-smoothstep(.16,.27,outletAlong));
            float wetOpening=tongue*mouth*(.55+.38*(1.-cover));
            float wetMask=vPoolSkin*(1.-bank)*(wetOpening+tears*.06);
            meltMask=mix(meltMask,wetMask,uOutletCover);
            basalt*=mix(1.,.63,cover*(1.-bank)*vPoolSkin);
          `
          : kind === 'ejecta' ? `
            // Exposed fracture faces retain unequal hot pockets, not a uniform
            // orange outline around every detached piece of cold rind.
            float freshPockets=smoothstep(.30,.67,meso+.25*(coarse-.5));
            meltMask=vFreshFace*freshPockets*(.18+.58*meso);
          ` : ''}
        vec2 cycle=vec2(cos(uDetailPhase),sin(uDetailPhase));
        float along=${kind === 'feeder' ? 'vMeltUV.y*28.' : kind === 'pillow-flow' ? 'vDistance*14.' : kind === 'flow' ? 'vDistance*13.' : 'samplePoint.x*9.+samplePoint.z*4.'};
        float shear=.5+.5*sin(along-uDetailPhase*2.+(meso-.5)*5.);
        float turnover=fbm(mineralPoint*16.+vec3(cycle*3.2,sin(uDetailPhase*2.)*2.));
        liquidDetail=.52+.30*shear+.18*turnover;
        liquidRelief=(shear-.5)*.018+(turnover-.5)*.014;
        }
        ${kind === 'flow' ? `
          // Extrusion wrinkles stay on the retained rind when supply stops.
          // Material normal detail adds no displacement to the terrain contact.
          float solidTop=smoothstep(.02,.55,cos(vMeltUV.x*6.2831853))*(1.-vFlowStage);
          float wrinklePhase=vDistance*42.+sin(vMeltUV.x*6.2831853)*4.+(meso-.5)*7.;
          float resolved=1.-smoothstep(.6,2.5,fwidth(wrinklePhase));
          float wrinkle=.5+.5*sin(wrinklePhase);
          float scored=smoothstep(.78,.97,wrinkle)*smoothstep(.32,.60,meso)*resolved;
          basalt*=1.-solidTop*scored*.28;
          crustRelief=solidTop*((wrinkle-.5)*.007*resolved-scored*.005)*(1.-meltMask);
        ` : ''}
        diffuseColor.rgb*=basalt;
        float hot=meltMask*exposureHeat*liquidDetail*${kind === 'magma' || kind === 'feeder' ? '2.2' : '1.15'};
        float rockRelief=.0027*(grit-.5)+.011*(meso-.5)-.0055*fracture-.0028*pits+crustRelief+liquidRelief*meltMask*clamp(exposureHeat,0.,1.);
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
        roughnessFactor=${kind === 'pillow' ? '.86+.10*grit-glassPatch*.38' : kind === 'pillow-flow' ? '.54+.21*meso+.08*grit-glassPatch*.20' : kind === 'flow' ? 'mix(.60+.23*meso+.08*grit-glassPatch*.18,.75+.15*meso+.08*grit,vFlowStage)' : kind === 'tuff' ? '.83+.14*grit' : '.75+.15*meso+.08*grit'}-wetBand*.30;
        ${molten ? 'roughnessFactor=mix(roughnessFactor,.30,meltMask*clamp(exposureHeat,0.,1.));' : ''}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 moltenColor=mix(vec3(.9,.012,.0001),vec3(3.2,.42,.006),smoothstep(.16,.82,hot));
        totalEmissiveRadiance+=moltenColor*hot*${kind === 'pillow-flow' ? '.95' : kind === 'flow' ? '1.15' : '1.6'};`)
      .replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb=attenuate(gl_FragColor.rgb,vOceanWorld,uDeep);\n#include <tonemapping_fragment>');
  };
  // Variation is per-material uniform data. Cold and active instances can share
  // the compiled program while keeping their own heat, grain and broken lip.
  material.customProgramCacheKey = () => `ocean-rock-${kind}-molten-v12`;
  return { material, heat, flowLength, flowFront, flowFeed, outletCover, outletDirection };
}

export function waterMaterial(noise: THREE.Data3DTexture, ocean: OceanUniforms) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uStone: { value: noise }, uDeep: ocean.deep, uClock: ocean.clock, uCutaway: ocean.cutaway, uIslandEmergence: ocean.emergence },
    vertexShader: 'varying vec3 vWater;void main(){vec4 p=modelMatrix*vec4(position,1.);vWater=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',
    fragmentShader: /* glsl */`varying vec3 vWater;uniform float uDeep;uniform float uClock;uniform float uCutaway;uniform float uIslandEmergence;${NOISE}
      void main(){
        if(uCutaway>.5 && vWater.z>0.)discard;
        vec3 view=normalize(cameraPosition-vWater);
        float t=uClock*3.;vec2 p=vWater.xz;
        float footprint=max(length(dFdx(p)),length(dFdy(p)));
        float swell=1.-smoothstep(.8,2.6,footprint),medium=1.-smoothstep(.12,.45,footprint),fine=1.-smoothstep(.035,.13,footprint);
        float warp=fbm(vec3(p*.71,t*.14))*3.5;
        // Local, separately seeded phase variation breaks long locked bands.
        // Filtering follows the existing footprint; mean surface stays fixed.
        vec2 localWarp=(vec2(filteredGrain(vec3(p*7.1,t*.19)),filteredGrain(vec3(p.yx*8.3+11.,t*.17+7.)))-.5)*2.4*medium;
        float a=dot(p,vec2(.71,.38))+warp+t*.43,b=dot(p,vec2(-1.53,.82))-warp*.6-t*.71;
        float c=dot(p,vec2(3.27,2.11))+warp*1.4+localWarp.x+t*1.12,d=dot(p,vec2(-7.6,5.31))+warp+localWarp.y+t*1.71;
        float e=dot(p,vec2(16.1,-11.7))+warp*2.1+localWarp.x*.7-localWarp.y*.5-t*2.21;
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
        float teachingOpacity=mix(.17,.98,smoothstep(.045,.68,fresnel));
        float seaOpacity=max(teachingOpacity,.93+.07*fresnel);
        gl_FragColor=vec4(waterColor,mix(teachingOpacity,seaOpacity,uIslandEmergence));
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
  const uniforms = { uStone: { value: noise }, uDeep: ocean.deep, uClock: ocean.clock, uCutaway: ocean.cutaway, uIslandEmergence: ocean.emergence,
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
      uniform float uDeep;uniform float uClock;uniform float uCutaway;uniform float uIslandEmergence;${NOISE}${WATER}
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
        return mix(torn,base*.85,source*.85)*(water && cameraPosition.y>=${WATER_Y.toFixed(4)} ? 1.-uIslandEmergence*.93 : 1.);}
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
