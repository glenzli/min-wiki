import * as THREE from 'three';
import { seed } from './magmaGeometry.ts';
import { CRUST_PERIOD } from './meltTransport.ts';

// Object-space noise stays attached to the rock when the camera moves.
const NOISE = /* glsl */`
float hash3(vec3 p) { p = fract(p * .3183099 + vec3(.13,.27,.41)); p *= 17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise3(vec3 p) {
  vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p) { return .57*noise3(p)+.28*noise3(p*2.07+3.1)+.15*noise3(p*4.13+7.7); }
`;

export function rockTexture() {
  const size = 256, data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const value = Math.round(80 + seed(i + 430) * 120);
    data.set([value, value, value, 255], i * 4);
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true; texture.needsUpdate = true;
  return texture;
}

export function rockMaterial(texture: THREE.Texture, section = false, facies = .5) {
  const material = new THREE.MeshStandardMaterial({ color: '#777064', roughness: .96,
    bumpMap: texture, bumpScale: section ? .004 : .12, side: THREE.DoubleSide });
  material.onBeforeCompile = shader => {
    shader.uniforms.uFacies = { value: facies };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRock;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRock = position;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vRock; uniform float uFacies;\n${NOISE}\n${section ? CELLS : ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float coarse = fbm(vRock * 1.8);
        float grit = noise3(vRock * 65.);
        ${section ? `
          vec2 joints=vRock.xy*2.1+vec2(fbm(vRock*4.1),fbm(vRock*3.7+8.))*1.3;
          vec2 distances=cellDistances(joints);
          float fracture=(1.-smoothstep(.008,.026,distances.y-distances.x))*smoothstep(.23,.64,coarse);
          float inclusions=smoothstep(.54,.73,noise3(vRock*23.));
          vec3 stone=mix(vec3(.055,.060,.058),vec3(.16,.128,.093),uFacies);
          stone=mix(stone,vec3(.045,.044,.041),inclusions*(.2+.35*uFacies));
          stone*=.57+.54*coarse+.28*grit;
          stone*=1.-fracture*.64;
          float rockRelief=.0012*noise3(vRock*95.)+.006*fbm(vRock*17.)-.005*fracture;
          diffuseColor.rgb = stone;
        ` : `
          vec3 basalt = mix(vec3(.045,.041,.036),vec3(.17,.14,.105),coarse);
          float beds = smoothstep(.57,.77,noise3(vec3(vRock.x*.75,vRock.y*10.,vRock.z*.75)));
          basalt = mix(basalt,vec3(.21,.14,.085),beds*.38);
          basalt *= .73 + .45*grit;
          diffuseColor.rgb = basalt;
        `}
      `);
    if (section) shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      vec3 rockDx=dFdx(-vViewPosition),rockDy=dFdy(-vViewPosition);
      vec3 rockR1=cross(rockDy,normal),rockR2=cross(normal,rockDx);
      float rockDet=dot(rockDx,rockR1);
      normal=normalize(abs(rockDet)*normal-sign(rockDet)*(dFdx(rockRelief)*rockR1+dFdy(rockRelief)*rockR2));
    `);
  };
  material.customProgramCacheKey = () => section ? 'volcano-section-solid-v3' : 'volcano-basalt-v1';
  return material;
}

const CELLS = /* glsl */`
vec2 cellHash(vec2 p) {
  vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));q+=dot(q,q.yzx+33.33);
  return fract((q.xx+q.yz)*q.zy);
}
vec2 cellDistances(vec2 p) {
  vec2 tile=floor(p),local=fract(p);float first=10.,second=10.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
    vec2 offset=vec2(float(x),float(y));
    float d=length(offset+.14+.72*cellHash(tile+offset)-local);
    if(d<first){second=first;first=d;}else if(d<second)second=d;
  }
  return vec2(first,second);
}
`;

/** Fixed crystals enclose locally shearing melt. Detail phase is optional and
 * illustrative: neither the crystal framework nor the storage body circulates. */
export function storageMaterial(texture: THREE.Texture, sheet = false) {
  const heat = { value: .6 }, detailPhase = { value: 0 }, detail = { value: 0 };
  const material = new THREE.MeshStandardMaterial({ color: '#39332b', roughness: .84,
    bumpMap: texture, bumpScale: .008, emissive: '#ffffff', emissiveIntensity: 1 });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { uStorageHeat: heat, uStorageDetailPhase: detailPhase, uStorageDetail: detail });
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vStorage; varying vec2 vStorageUV;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvStorage=position; vStorageUV=uv;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vStorage; varying vec2 vStorageUV;
      uniform float uStorageHeat; uniform float uStorageDetailPhase; uniform float uStorageDetail;${NOISE}
      float crystalGap(vec3 p){
        vec3 tile=floor(p),local=fract(p);float a=10.,b=10.;
        for(int z=-1;z<=1;z++)for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
          vec3 offset=vec3(float(x),float(y),float(z)),cell=tile+offset;
          vec3 point=.15+.7*vec3(hash3(cell),hash3(cell+17.3),hash3(cell+41.7));
          float d=length(offset+point-local);
          if(d<a){b=a;a=d;}else if(d<b)b=d;
        }
        return b-a;
      }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 stonePoint=vStorage*vec3(7.,9.,7.);
        vec3 warp=vec3(fbm(stonePoint*.4),fbm(stonePoint*.4+7.1),fbm(stonePoint*.4+19.7));
        vec3 fineWarp=vec3(noise3(stonePoint*9.),noise3(stonePoint*9.+7.),noise3(stonePoint*9.+19.));
        float gap=crystalGap(stonePoint+warp*1.6+fineWarp*.09);
        float rich=fbm(stonePoint*.75+warp);
        float melt=(1.-smoothstep(.008,.12,gap))*smoothstep(.30,.63,rich);
        melt=max(melt,smoothstep(.52,.72,rich)*.67);
        ${sheet ? 'melt=max(melt,.36+.27*rich);' : ''}
        float grain=noise3(stonePoint*9.);
        // The framework and connected melt mask stay fixed in object space.
        // Broad unequal folds travel through the connected molten pockets;
        // their dark brows and leading lips can be tracked across seconds.
        vec2 liquidPoint=${sheet ? 'vec2(vStorageUV.x*16.,vStorageUV.y*5.)' : 'vec2(stonePoint.y*.55+stonePoint.x*.23,stonePoint.x*.55+stonePoint.z*.25)'};
        float liquidShear=liquidPoint.x-uStorageDetailPhase*3.+.8*sin(liquidPoint.y+warp.y);
        float liquidFold=pow(.5+.5*cos(liquidShear),4.);
        float liquidThread=pow(.5+.5*cos(liquidShear+.65),9.);
        float liquidMask=smoothstep(.18,.56,melt)*uStorageDetail;
        float storageRelief=(1.-melt)*(.005+.003*grain)+liquidMask*.045*(liquidFold+.25*liquidThread);
        vec3 crystal=mix(vec3(.027,.029,.028),vec3(.10,.079,.056),rich)*(.65+.35*grain);
        diffuseColor.rgb=mix(crystal,vec3(.19,.024,.003),.2+melt*.45);
        vec3 fluid=mix(vec3(.30,.033,.003),vec3(.050,.009,.002),liquidFold*(1.-liquidThread*.75));
        diffuseColor.rgb=mix(diffuseColor.rgb,fluid,liquidMask*.85);
      `)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=mix(.93,.44,melt)+liquidMask*(.15*liquidFold-.09*liquidThread);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec3 dx=dFdx(-vViewPosition),dy=dFdy(-vViewPosition),r1=cross(dy,normal),r2=cross(normal,dx);
        float det=dot(dx,r1);
        normal=normalize(abs(det)*normal-sign(det)*(dFdx(storageRelief)*r1+dFdy(storageRelief)*r2));
      `)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 hot=mix(vec3(.35,.007,.0003),vec3(2.5,.22,.004),smoothstep(.34,.96,melt));
        totalEmissiveRadiance=(hot*pow(melt,1.15)*mix(1.,1.-.80*liquidFold+1.1*liquidThread,liquidMask)+vec3(.085,.004,.0004))*uStorageHeat;
      `);
  };
  material.customProgramCacheKey = () => sheet ? 'volcano-intrusive-sheet-v3' : 'volcano-mush-solid-v3';
  return { material, heat, detailPhase, detail };
}

/** Unequal crust rafts reveal connected molten seams. The episode positions the
 * crust; optional detail phase shears only exposed liquid along the existing UV path. */
export function lavaMaterial(texture: THREE.Texture, pool = false) {
  const heat = { value: 1 }, time = { value: 0 }, detailPhase = { value: 0 }, detail = { value: 0 };
  const material = new THREE.MeshStandardMaterial({ color: '#302b29', roughness: .91,
    emissive: '#e8480a', emissiveIntensity: 1, bumpMap: texture, bumpScale: .006, side: THREE.DoubleSide });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { uHeat: heat, uLavaClock: time, uLavaDetailPhase: detailPhase, uLavaDetail: detail });
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLava; varying vec2 vLavaUV;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLava=position; vLavaUV=uv;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      uniform float uHeat; uniform float uLavaClock; uniform float uLavaDetailPhase; uniform float uLavaDetail;
      varying vec3 vLava; varying vec2 vLavaUV;
      ${NOISE}\n${CELLS}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float travel=max(0.,min(uLavaClock,.85)-.42)*3.8;
        vec2 flowPoint=${pool ? 'vLava.xy*2.9-vec2(travel*.24,travel*.08)' : 'vec2(vLavaUV.x*2.6-travel,(vLavaUV.y-.5)*1.4)'};
        vec2 warped=flowPoint+vec2(fbm(vec3(flowPoint*.9,2.)),fbm(vec3(flowPoint*.9,7.)))*.85;
        warped+=.10*vec2(noise3(vec3(flowPoint*17.,4.)),noise3(vec3(flowPoint*19.,9.)));
        vec2 cells=cellDistances(warped*2.15);
        float crustGrain=fbm(vec3(warped*5.5,3.));
        float grit=noise3(vec3(warped*74.,8.));
        float seam=(1.-smoothstep(.006,.025+.15*crustGrain,cells.y-cells.x))*(.3+.7*smoothstep(.3,.7,crustGrain));
        ${pool ? 'float channel=0.; float banks=1.;' : `
          float center=.5+.09*sin(vLavaUV.x*5.1)+.06*(crustGrain-.5);
          float channelWidth=.075+.16*fbm(vec3(flowPoint*3.1,5.));
          float channel=(1.-smoothstep(channelWidth*.25,channelWidth,abs(vLavaUV.y-center)+.045*(grit-.5)))*(.35+.65*smoothstep(.25,.7,crustGrain));
          float banks=smoothstep(0.,.16,vLavaUV.y)*(1.-smoothstep(.84,1.,vLavaUV.y));
        `}
        ${pool ? 'float exposed=seam*.85;' : `
          float distanceCooling=1.-exp(-vLavaUV.x*.5);
          float localTear=smoothstep(.49,.75,fbm(vec3(warped*2.9,14.)))*smoothstep(.34,.72,crustGrain);
          float exposed=max(seam*.50,channel*.20*localTear)*banks*(1.-distanceCooling*.52);
        `}
        float lavaMelt=exposed*pow(max(0.,uHeat),.7);
        // UV.x is distance from the vent along this terrain-bound flow.
        // Positive phase moves liquid downstream without moving either bank or crust.
        vec2 liquidPoint=${pool ? 'vec2(vLava.x*4.8+vLava.y*.6,vLava.y*3.5)' : 'vec2(vLavaUV.x*7.,vLavaUV.y*4.)'};
        float liquidShear=liquidPoint.x-uLavaDetailPhase*3.+.7*sin(liquidPoint.y+crustGrain);
        float liquidFold=pow(.5+.5*cos(liquidShear),4.);
        float liquidThread=pow(.5+.5*cos(liquidShear+.65),9.);
        float liquidMask=smoothstep(.10,.65,lavaMelt)*uLavaDetail;
        float lavaRelief=(1.-seam)*(.013+.026*crustGrain+.007*grit)+liquidMask*.035*(liquidFold+.25*liquidThread);
        vec3 rind=mix(vec3(.018,.021,.021),vec3(.064,.068,.063),crustGrain)*(.62+.55*grit);
        diffuseColor.rgb=mix(rind,vec3(.32,.045,.006),lavaMelt*.65);
        diffuseColor.rgb=mix(diffuseColor.rgb,mix(vec3(.36,.045,.004),vec3(.045,.009,.002),liquidFold*(1.-liquidThread*.75)),liquidMask*.8);
      `)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=mix(.94,.34,lavaMelt)-liquidMask*(.02+.055*liquidFold);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec3 lavaDx=dFdx(-vViewPosition),lavaDy=dFdy(-vViewPosition);
        vec3 lavaR1=cross(lavaDy,normal),lavaR2=cross(normal,lavaDx);
        float lavaDet=dot(lavaDx,lavaR1);
        normal=normalize(abs(lavaDet)*normal-sign(lavaDet)*(dFdx(lavaRelief)*lavaR1+dFdy(lavaRelief)*lavaR2));
      `)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 heatColor=mix(vec3(.35,.006,.0003),vec3(3.8,.52,.009),smoothstep(.15,.95,lavaMelt));
        totalEmissiveRadiance=heatColor*lavaMelt*(.65+.55*crustGrain)*mix(1.,1.-.8*liquidFold+liquidThread,liquidMask);
      `);
  };
  material.customProgramCacheKey = () => pool ? 'volcano-pool-v5' : 'volcano-lava-v5';
  return { material, heat, time, detailPhase, detail };
}

/** Mobile dark crust over a hot interior, with localized tears and rolled lips.
 * Surface crust cools first: this is uncalibrated appearance, not thermometry.
 * See USGS: /observatories/hvo/news/volcano-watch-how-do-lava-flows-cool-and-how-long-does-it-take
 * and /news/volcano-watch-pahoehoe-and-aa-lava-flows. The two flow types are not
 * prescribed by this display. Underground sheets retain their earlier material. */
export function transportMaterial(surface = true) {
  const heat = { value: .5 };
  const material = new THREE.MeshStandardMaterial({ color: '#8f240b', roughness: .47,
    emissive: '#ffffff', emissiveIntensity: 1, side: THREE.DoubleSide });
  material.onBeforeCompile = shader => {
    shader.uniforms.uTransportHeat = heat;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
      attribute vec2 meltWave; varying vec2 vTransport; varying vec2 vMeltWave;
      ${surface ? 'attribute vec4 meltCrust; varying vec4 vCrust;' : ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvTransport=uv; vMeltWave=meltWave;${surface ? 'vCrust=meltCrust;' : ''}`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      uniform float uTransportHeat; varying vec2 vTransport; varying vec2 vMeltWave; ${NOISE}
      ${surface ? `
        varying vec4 vCrust;
        // The irregular cells repeat only over the complete bounded material
        // phase. Unequal seeds and shear replace uniformly spaced scales.
        vec3 skinCells(vec2 p){
          vec2 tile=floor(p),local=fract(p);float first=10.,second=10.,identity=0.;
          for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
            vec2 offset=vec2(float(x),float(y)),cell=tile+offset;
            vec3 key=vec3(mod(cell.x,6.),cell.y,3.7);
            vec2 site=.14+.72*vec2(hash3(key),hash3(key+17.3));
            float d=length(offset+site-local);
            if(d<first){second=first;first=d;identity=hash3(key+43.1);}else if(d<second)second=d;
          }
          return vec3(first,second,identity);
        }` : ''}`)
      .replace('#include <color_fragment>', surface ? `#include <color_fragment>
        float angle=vCrust.x*6.28318530718/${CRUST_PERIOD};
        vec2 skinPoint=vec2(vCrust.x*6./${CRUST_PERIOD},vCrust.y*3.6);
        skinPoint+=vec2(.11*sin(angle*2.+vCrust.y*7.)+.08*sin(angle*5.-vCrust.y*3.),.14*sin(angle*3.+vCrust.y*7.)+.07*cos(angle*7.-vCrust.y*11.));
        vec3 cells=skinCells(skinPoint);
        float broad=fbm(vec3(cos(angle)*3.,sin(angle)*3.,vCrust.y*7.));
        float grain=noise3(vec3(cos(angle)*39.,sin(angle)*39.,vCrust.y*43.));
        float age=clamp(vCrust.z+(1.-min(1.,uTransportHeat))*.35,0.,1.);
        float mobile=clamp(vCrust.w,0.,1.);
        float gap=cells.y-cells.x,width=mix(.078,.014,age),aa=max(fwidth(gap),.001);
        float fissure=(1.-smoothstep(max(0.,width-aa),width+aa,gap))*min(1.,width/aa);
        float tear=smoothstep(.42,.75,broad+vMeltWave.y*.24-age*.12);
        float curl=smoothstep(.18,.72,vMeltWave.y)*smoothstep(.38,.78,broad+cells.z*.22)*(1.-smoothstep(.04,.19,gap));
        // A minority of unequal plates pull open into broad, curved mouths.
        // Their dark rolled rim and recessed hot floor travel with the skin.
        float windowSeed=smoothstep(.54+age*.06,.74+age*.08,cells.z);
        float mouthDistance=cells.x+.06*sin(angle*5.+vCrust.y*7.)+.04*(grain-.5);
        float mouth=(1.-smoothstep(.20,.43,mouthDistance))*windowSeed*(.72+.28*smoothstep(.15,.7,vMeltWave.y));
        mouth*=1.-smoothstep(.70,.94,vMeltWave.x)*(1.-vMeltWave.y)*.55;
        float contactRing=smoothstep(.015,.18,mouth)*(1.-smoothstep(.28,.60,mouth));
        float openFloor=mouth*smoothstep(.06,.28,mouth);
        float edge=smoothstep(0.,.17,vTransport.y)*(1.-smoothstep(.83,1.,vTransport.y));
        float aperture=max(max(fissure*tear,curl*.8),openFloor*.95)*smoothstep(.02,.65,mobile)*edge*(1.-age*.45);
        float fixedGrain=noise3(vec3(vTransport.x*31.,vTransport.y*39.,12.));
        vec3 fixedRind=mix(vec3(.018,.021,.021),vec3(.052,.056,.052),fixedGrain);
        vec3 shell=mix(vec3(.019,.022,.021),vec3(.075,.080,.073),.35+.45*grain+.2*cells.z);
        shell*=(.82+.18*age)*(1.-contactRing*.42);
        diffuseColor.rgb=mix(fixedRind,shell,smoothstep(0.,.30,mobile));
        vec3 cavity=mix(vec3(.09,.007,.0008),vec3(.50,.06,.004),.25+.75*sqrt(max(0.,openFloor)));
        diffuseColor.rgb=mix(diffuseColor.rgb,cavity,aperture*.85);
        float fixedRelief=.004*(.35+.65*fixedGrain);
        float movingRelief=.004*(.35+.65*grain)+.007*cells.z*(1.-smoothstep(.02,.09,gap))-.018*mouth+.006*curl;
        float skinRelief=mix(fixedRelief,movingRelief,smoothstep(0.,.30,mobile));
      ` : `#include <color_fragment>
        float brow=smoothstep(.08,.8,vMeltWave.x)*(1.-vMeltWave.y*.82);
        float edge=smoothstep(0.,.13,vTransport.y)*(1.-smoothstep(.87,1.,vTransport.y));
        float grain=fbm(vec3(vTransport.x*13.,vTransport.y*8.,4.));
        vec3 fluid=mix(vec3(.30,.030,.003),vec3(.58,.09,.009),vMeltWave.y);
        diffuseColor.rgb=mix(vec3(.055,.017,.006),mix(fluid,vec3(.045,.009,.002),brow*.86),edge)*(.8+.25*grain);
      `)
      .replace('#include <roughnessmap_fragment>', surface
        ? '#include <roughnessmap_fragment>\nroughnessFactor=mix(.92,.93-.22*(.4*cells.z+.2*grain),smoothstep(0.,.30,mobile))-aperture*.3;'
        : '#include <roughnessmap_fragment>\nroughnessFactor=.34+.29*brow;')
      .replace('#include <emissivemap_fragment>', surface ? `#include <emissivemap_fragment>
        float floorVariation=clamp(aperture*(.55+.45*broad)+vMeltWave.y*.12,0.,1.);
        vec3 exposedHeat=mix(vec3(1.4,.022,.0004),vec3(4.5,.44,.004),smoothstep(.04,.65,floorVariation));
        totalEmissiveRadiance=exposedHeat*aperture*(1.-contactRing*.55)*uTransportHeat;
      ` : `#include <emissivemap_fragment>
        vec3 lip=mix(vec3(.78,.025,.001),vec3(3.6,.55,.012),vMeltWave.y);
        totalEmissiveRadiance=lip*(1.-brow*.82)*edge*uTransportHeat;
      `);
    if (surface) shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      vec3 skinDx=dFdx(-vViewPosition),skinDy=dFdy(-vViewPosition),skinR1=cross(skinDy,normal),skinR2=cross(normal,skinDx);
      float skinDet=dot(skinDx,skinR1);
      normal=normalize(abs(skinDet)*normal-sign(skinDet)*(dFdx(skinRelief)*skinR1+dFdy(skinRelief)*skinR2));
    `);
  };
  material.customProgramCacheKey = () => surface ? 'volcano-crusted-transport-v3' : 'volcano-transport-intrusive-v1';
  return { material, heat };
}

/** Static heterogeneity depicts crystal-bearing melt without inventing an
 * observable underground circulation. The existing pressure controls its heat. */
export function magmaMaterial(texture: THREE.Texture, variation = 1) {
  const material = new THREE.MeshStandardMaterial({ color: '#4b2014', emissive: '#d84006', emissiveIntensity: 1,
    roughness: .85, bumpMap: texture, bumpScale: .012 });
  material.onBeforeCompile = shader => {
    shader.uniforms.uMagmaVariation={value:variation};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vMagma;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvMagma=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\nuniform float uMagmaVariation; varying vec3 vMagma;\n${NOISE}`)
      .replace('#include <color_fragment>',`#include <color_fragment>
        vec3 magmaPoint=vMagma*vec3(2.8,9.,5.);
        vec3 magmaWarp=vec3(fbm(magmaPoint*.47),fbm(magmaPoint*.47+8.1),fbm(magmaPoint*.47+17.2));
        float magmaMix=fbm(magmaPoint+magmaWarp*3.2);
        float molten=mix(.65,smoothstep(.18,.79,magmaMix),uMagmaVariation);
        float fineCrystals=noise3(magmaPoint*12.);
        diffuseColor.rgb=mix(vec3(.028,.016,.011),vec3(.28,.037,.005),molten)*(.8+.2*fineCrystals);
      `)
      .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
        totalEmissiveRadiance*=mix(vec3(.09,.012,.002),vec3(2.8,1.45,.32),pow(molten,1.3))*(.35+.8*molten);
      `);
  };
  material.customProgramCacheKey=()=> 'volcano-crystal-melt-v2';
  return material;
}

let cloudNoiseBytes: Uint8Array<ArrayBuffer> | undefined;
function cloudNoiseTexture() {
  const size=64;
  if(!cloudNoiseBytes){
    // One immutable 256 KiB periodic field per module. Each scene owns and
    // disposes its GPU texture, while later scenes reuse the CPU preparation.
    cloudNoiseBytes=new Uint8Array(size**3);
    const hash=(x:number,y:number,z:number,period:number)=>{
      x=(x%period+period)%period;y=(y%period+period)%period;z=(z%period+period)%period;
      let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647);
      h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;
    };
    const sample=(x:number,y:number,z:number,period:number)=>{
      const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
      const curve=(n:number)=>n*n*(3-2*n),a=curve(x-ix),b=curve(y-iy),c=curve(z-iz);
      let value=0;
      for(let dz=0;dz<2;dz++)for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)
        value+=hash(ix+dx,iy+dy,iz+dz,period)*(dx?a:1-a)*(dy?b:1-b)*(dz?c:1-c);
      return value;
    };
    for(let z=0;z<size;z++)for(let y=0;y<size;y++)for(let x=0;x<size;x++)
      cloudNoiseBytes[x+size*(y+size*z)]=Math.round(255*(.57*sample(x/8,y/8,z/8,8)+.28*sample(x/4+3,y/4+7,z/4+11,16)+.15*sample(x/2+19,y/2+5,z/2+13,32)));
  }
  const texture=new THREE.Data3DTexture(cloudNoiseBytes,size,size,size);
  texture.format=THREE.RedFormat;texture.type=THREE.UnsignedByteType;
  texture.minFilter=texture.magFilter=THREE.LinearFilter;
  texture.wrapS=texture.wrapT=texture.wrapR=THREE.RepeatWrapping;texture.unpackAlignment=1;texture.needsUpdate=true;
  return texture;
}

/** Low-resolution radiance integration, composited over the scene's full
 * resolution depth. The fixed parcel schedule still owns all ash motion. */
export function ashMaterial() {
  const noise=cloudNoiseTexture();
  const parcels = Array.from({ length: 12 }, () => new THREE.Vector4());
  const densities = new Float32Array(12);
  const uniforms = { uParcels: { value: parcels }, uDensities: { value: densities },
    uMin: { value: new THREE.Vector3() }, uMax: { value: new THREE.Vector3() }, uClock: { value: 0 },
    uResolution: { value: new THREE.Vector2(1,1) }, uSceneDepth: { value: null as THREE.DepthTexture | null },
    uInverseViewProjection: { value: new THREE.Matrix4() }, uSteps: { value: 48 },uNoise:{value:noise} };
  const material = new THREE.ShaderMaterial({ transparent: false, depthWrite: false, depthTest: false,
    blending: THREE.NoBlending, side: THREE.BackSide, uniforms,
    vertexShader: /* glsl */`varying vec3 vWorld; void main(){vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader: /* glsl */`
      varying vec3 vWorld; uniform vec4 uParcels[12]; uniform float uDensities[12];
      uniform vec3 uMin; uniform vec3 uMax; uniform float uClock;
      uniform vec2 uResolution;uniform sampler2D uSceneDepth;uniform mat4 uInverseViewProjection;uniform int uSteps;
      uniform highp sampler3D uNoise;
      float cloudNoise(vec3 p){return texture(uNoise,p*.08).r;}
      float cloudFbm(vec3 p){return .72*cloudNoise(p)+.28*cloudNoise(p*2.17+7.3);}
      float envelope(vec3 p) {
        float total=0.;
        for(int i=0;i<12;i++) {
          vec3 q=(p-uParcels[i].xyz)/max(.001,uParcels[i].w);
          q.y*=1.05+.13*sin(float(i)*2.7);
          total+=max(0.,1.-dot(q,q))*uDensities[i];
        }
        return total;
      }
      float field(vec3 p) {
        float coarse=envelope(p); if(coarse<.035)return 0.;
        vec3 advected=p*1.7-vec3(uClock*1.3,uClock*8.,uClock*.7);
        vec3 warp=vec3(cloudNoise(advected*.6),cloudNoise(advected*.6+13.7),cloudNoise(advected*.6+29.1))-.5;
        coarse=envelope(p+warp*1.5);
        float rolling=cloudFbm(advected+warp*2.4);
        float detail=cloudNoise(advected*5.3+warp*3.);
        // Density erodes the envelope on several scales; it does not shade a
        // smooth sphere or change the identity/trajectory of an emitted parcel.
        float billows=clamp((rolling-.25)*2.,0.,1.);
        return max(0.,min(coarse,1.65)-(.22+(1.-billows)*1.35+detail*.20))*4.;
      }
      void main(){
        vec3 direction=normalize(vWorld-cameraPosition);
        vec3 a=(uMin-cameraPosition)/direction,b=(uMax-cameraPosition)/direction;
        vec3 nearV=min(a,b),farV=max(a,b);
        float nearT=max(max(nearV.x,nearV.y),nearV.z),farT=min(min(farV.x,farV.y),farV.z);
        if(farT<max(0.,nearT)) discard;
        nearT=max(nearT,0.);
        vec2 uv=gl_FragCoord.xy/uResolution;
        float sceneDepth=texture2D(uSceneDepth,uv).r;
        vec4 scenePoint=uInverseViewProjection*vec4(uv*2.-1.,sceneDepth*2.-1.,1.);
        farT=min(farT,length(scenePoint.xyz/scenePoint.w-cameraPosition));
        if(farT<=nearT)discard;
        float stepSize=(farT-nearT)/float(uSteps);
        // Fixed screen dither suppresses marching bands without frame flicker.
        float jitter=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
        vec4 sum=vec4(0.);
        vec3 sunDirection=normalize(vec3(-.7,1.,.6));
        for(int i=0;i<64;i++){
          if(i>=uSteps)break;
          vec3 p=cameraPosition+direction*(nearT+(float(i)+jitter)*stepSize);
          float density=field(p); if(density<.008)continue;
          float optical=.24*field(p+sunDirection*.20)+.65*field(p+sunDirection*.65)+.8*envelope(p+sunDirection*1.65);
          float sunlight=exp(-optical*2.0);
          float rim=pow(max(0.,dot(direction,sunDirection)),3.);
          vec3 shade=vec3(.016,.020,.026)+vec3(.43,.37,.29)*sunlight*(.75+.35*rim);
          float opacity=1.-exp(-density*stepSize*2.1);
          sum.rgb+=(1.-sum.a)*opacity*shade;sum.a+=(1.-sum.a)*opacity;
          if(sum.a>.985)break;
        }
        gl_FragColor=sum;
      }
    `,
  });
  return { material, uniforms, noise };
}

export function ashComposite(background: THREE.Texture, ash: THREE.Texture) {
  return new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
    uniforms: { uBackground: { value: background }, uAsh: { value: ash } },
    vertexShader: 'varying vec2 vScreen;void main(){vScreen=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: /* glsl */`varying vec2 vScreen;uniform sampler2D uBackground;uniform sampler2D uAsh;
      void main(){vec4 ash=texture2D(uAsh,vScreen);vec3 background=texture2D(uBackground,vScreen).rgb;
        gl_FragColor=vec4(background*(1.-ash.a)+ash.rgb,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

export function skyMaterial() {
  return new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vSky;void main(){vSky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: /* glsl */`varying vec3 vSky;void main(){
      float h=normalize(vSky).y;
      vec3 c=mix(vec3(.12,.15,.17),vec3(.025,.04,.055),smoothstep(-.08,.65,h));
      gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
}
