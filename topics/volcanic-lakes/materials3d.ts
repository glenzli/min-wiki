import * as THREE from 'three';
import { seed, WALL_SITES } from './geometry3d.ts';

/** Topic-owned procedural textures; no external image or measured rock sample. */
export function stoneNoise() {
  const size = 256, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4, grain = seed(x * 17 + y * 631);
    const ridge = Math.sin(x * .24 + Math.sin(y * .075) * 2) * .14;
    const value = Math.round(122 + grain * 73 + ridge * 76);
    pixels.set([value, value, value, 255], i);
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true; texture.needsUpdate = true; texture.repeat.set(7, 7);
  return texture;
}
export function lakeUniforms() {
  return { uWaterLevel: { value: -10 }, uWaterValid: { value: 0 }, uBasinRadius: { value: 4.5 }, uWithdrawal: { value: 0 }, uSubsidence: { value: 0 }, uCaldera: { value: 1 } };
}
export type LakeUniforms = ReturnType<typeof lakeUniforms>;
export const LAYER_FACIES = [0, 1, 0, 2, 1, 3, 0, 1, 2, 3, 1] as const;
const noiseGLSL = `
float lakeHash(vec3 p){p=fract(p*.3183099+vec3(.17,.29,.41));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float lakeNoise(vec3 p){vec3 b=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(lakeHash(b),lakeHash(b+vec3(1,0,0)),f.x),mix(lakeHash(b+vec3(0,1,0)),lakeHash(b+vec3(1,1,0)),f.x),f.y),mix(mix(lakeHash(b+vec3(0,0,1)),lakeHash(b+vec3(1,0,1)),f.x),mix(lakeHash(b+vec3(0,1,1)),lakeHash(b+vec3(1,1,1)),f.x),f.y),f.z);}
float lakeFbm(vec3 p){return .57*lakeNoise(p)+.28*lakeNoise(p*2.07)+.15*lakeNoise(p*4.13);}
`;

const cellsGLSL = `
vec2 lakeCellHash(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));q+=dot(q,q.yzx+33.33);return fract((q.xx+q.yz)*q.zy);}
vec2 lakeCells(vec2 p){vec2 b=floor(p),f=fract(p);float a=10.,c=10.;
for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 d=vec2(float(x),float(y));float r=length(d+.14+.72*lakeCellHash(b+d)-f);if(r<a){c=a;a=r;}else if(r<c)c=r;}return vec2(a,c);}
`;
const crystalGapGLSL = `
float lakeCrystalGap(vec3 p){vec3 b=floor(p),f=fract(p);float a=10.,c=10.;
  for(int z=-1;z<=1;z++)for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
    vec3 d=vec3(float(x),float(y),float(z)),cell=b+d;
    vec3 q=.15+.7*vec3(lakeHash(cell),lakeHash(cell+17.3),lakeHash(cell+41.7));float r=length(d+q-f);
    if(r<a){c=a;a=r;}else if(r<c)c=r;
  }return c-a;
}
`;
const freshWallGLSL = `
float lakeFreshWall(vec3 p){
  if(uCaldera<.5)return 0.;
  float a=atan(p.z,p.x),outline=1.+.047*cos(a*3.+.8)+.028*sin(a*5.-.6)+.016*cos(a*7.+1.4);
  float u=length(p.xz)/(uBasinRadius*outline),f=0.;
  ${WALL_SITES.map(site => `{
    float delta=atan(sin(a-(${site.angle.toFixed(4)})),cos(a-(${site.angle.toFixed(4)})));
    f+=smoothstep(${site.start.toFixed(4)},${Math.min(.995, site.start + .17).toFixed(4)},uSubsidence)*exp(-pow(abs(delta)/${site.width.toFixed(4)},4.));
  }`).join('')}
  return clamp(f,0.,1.)*smoothstep(.855,.88,u)*(1.-smoothstep(.985,1.015,u));
}
`;
export function rockMaterial(texture: THREE.Texture, uniforms: LakeUniforms, facies = -1, deposit = false) {
  const section = facies >= 0, damage = facies === 4;
  const material = new THREE.MeshStandardMaterial({ color: '#6c716b', roughness: .97, bumpMap: texture, bumpScale: section ? .004 : .022, side: THREE.DoubleSide });
  if (deposit) { material.polygonOffset = true; material.polygonOffsetFactor = -1; material.polygonOffsetUnits = -1; }
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms); shader.uniforms.uFacies = { value: damage ? .55 : .22 + facies * .12 };
    shader.vertexShader = `${deposit ? 'attribute float depth;varying float vTalusDepth;' : ''}attribute vec3 materialPosition;varying vec3 vLakeStone;varying vec3 vLakeWorld;\n${shader.vertexShader}`.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvLakeWorld=(modelMatrix*vec4(transformed,1.)).xyz;vLakeStone=materialPosition;').replace('#include <begin_vertex>', '#include <begin_vertex>\n' + (deposit ? 'vTalusDepth=depth;' : ''));
    shader.fragmentShader = `${deposit ? 'varying float vTalusDepth;' : ''}varying vec3 vLakeStone;varying vec3 vLakeWorld;uniform float uWaterLevel,uWaterValid,uBasinRadius,uFacies,uSubsidence,uCaldera;\n${noiseGLSL}\n${cellsGLSL}\n${freshWallGLSL}\n${shader.fragmentShader}`.replace('#include <color_fragment>', `#include <color_fragment>
      ${deposit ? 'if(vTalusDepth<.002)discard;' : ''}
      vec3 rockPoint=${section ? 'vLakeStone' : 'vLakeWorld'};
      float macro=lakeFbm(rockPoint*1.7),grain=lakeNoise(rockPoint*65.);
      ${section ? `
        vec2 cells=lakeCells(vLakeStone.xy*${damage ? '4.3' : '2.35'}+vec2(lakeFbm(vLakeStone*4.1),lakeFbm(vLakeStone*3.7+8.))*1.3);
        float fracture=(1.-smoothstep(.008,.035,cells.y-cells.x))*smoothstep(.2,.62,macro);
        float clasts=smoothstep(.49,.7,lakeNoise(vLakeStone*21.));
        vec3 stone=mix(vec3(.095,.102,.096),vec3(.17,.146,.117),uFacies);
        stone=mix(stone,vec3(.048,.052,.047),clasts*${damage ? '.46' : '.25'});
        stone*=.64+.51*macro+.25*grain;stone*=1.-fracture*${damage ? '.47' : '.34'};
        float rockRelief=.0017*lakeNoise(vLakeStone*95.)+.008*lakeFbm(vLakeStone*17.)-.005*fracture;
        diffuseColor.rgb=stone;
      ` : `
        float fragments=lakeNoise(floor(rockPoint*17.));
        float rockRelief=.007*lakeFbm(rockPoint*13.)+.0025*lakeNoise(rockPoint*61.);
        diffuseColor.rgb*=.61+macro*.57+grain*.20+fragments*.13;
        diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.16,.92,.76),smoothstep(.58,.78,macro)*.33);
      `}
      float fresh=lakeFreshWall(vLakeWorld)*smoothstep(.18,.66,lakeFbm(vLakeWorld*2.3));
      vec2 cutCells=lakeCells(vec2(vLakeWorld.x+vLakeWorld.z*.64,vLakeWorld.y)*3.1+vec2(lakeFbm(vLakeWorld*2.1),lakeFbm(vLakeWorld*3.3+7.)));
      float shortJoint=(1.-smoothstep(.009,.035,cutCells.y-cutCells.x))*smoothstep(.42,.69,lakeFbm(vLakeWorld*5.));
      vec3 freshStone=mix(vec3(.14,.155,.15),vec3(.24,.25,.225),macro)*(.76+.28*grain)*(1.-shortJoint*.32);
      diffuseColor.rgb=mix(diffuseColor.rgb,freshStone,fresh*.72);rockRelief+=fresh*(.004*lakeFbm(vLakeWorld*19.)-.0035*shortJoint);
      float shore=(1.-smoothstep(uWaterLevel+.018,uWaterLevel+.14,vLakeWorld.y))*(1.-smoothstep(uBasinRadius,uBasinRadius*1.12,length(vLakeWorld.xz)))*uWaterValid;
      diffuseColor.rgb*=1.-shore*.30;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      vec3 rockDx=dFdx(-vViewPosition),rockDy=dFdy(-vViewPosition),r1=cross(rockDy,normal),r2=cross(normal,rockDx);
      float det=dot(rockDx,r1);vec3 bent=abs(det)*normal-sign(det)*(dFdx(rockRelief)*r1+dFdy(rockRelief)*r2);
      if(dot(bent,bent)>1.e-15)normal=normalize(bent);
    `);
  };
  material.customProgramCacheKey = () => `lake-solid-rock-${facies}-${deposit}-v6-cut-relief`;
  return material;
}

/** Unmelted support is the same source stratum/material as the adjacent host.
 * Only irregular local melt-bearing lobes alter it. The geometry owner cuts
 * real layer contacts; this shader never paints a rectangular reservoir wall. */
export function supportMaterial(texture: THREE.Texture, uniforms: LakeUniforms, facies: number) {
  const material = rockMaterial(texture, uniforms, facies), compileRock = material.onBeforeCompile;
  material.emissive.set('#ffffff'); material.emissiveIntensity = 1;
  material.onBeforeCompile = function(shader, renderer) {
    compileRock.call(this, shader, renderer);
    shader.uniforms.uWithdrawal = uniforms.uWithdrawal;
    shader.fragmentShader = shader.fragmentShader.replace(cellsGLSL, `${crystalGapGLSL}\n${cellsGLSL}`)
      .replace('uniform float uWaterLevel,uWaterValid,uBasinRadius,uFacies,uSubsidence,uCaldera;', 'uniform float uWaterLevel,uWaterValid,uBasinRadius,uFacies,uSubsidence,uCaldera,uWithdrawal;')
      .replace('diffuseColor.rgb*=1.-shore*.30;', `diffuseColor.rgb*=1.-shore*.30;
        vec3 supportPoint=vLakeStone*vec3(6.8,8.6,6.8);
        float lobeA=length((vLakeStone-vec3(-.95,-.55,-.5))*vec3(.53,.40,.47));
        float lobeB=length((vLakeStone-vec3(1.05,-1.1,-.75))*vec3(.62,.47,.53));
        float lobeC=length((vLakeStone-vec3(2.25,-2.35,-.25))*vec3(1.05,1.15,.86));
        float edge=min(min(lobeA,lobeB),lobeC)+.38*(lakeFbm(supportPoint*.13)-.5)+.12*(lakeFbm(supportPoint*.32)-.5);
        float supportRegion=1.-smoothstep(.63,1.12,edge),supportMelt=0.;
        if(supportRegion>.001){
          vec3 warp=vec3(lakeFbm(supportPoint*.4),lakeFbm(supportPoint*.4+7.1),lakeFbm(supportPoint*.4+19.7));
          float rich=lakeFbm(supportPoint*.75+warp),gap=lakeCrystalGap(supportPoint+warp*1.6);
          float melt=(1.-smoothstep(.009,.115,gap))*smoothstep(.30+uWithdrawal*.055,.63+uWithdrawal*.04,rich);
          melt=max(melt,smoothstep(.53,.73,rich)*.64)*(1.-uWithdrawal*.28)+.045;
          supportMelt=melt*supportRegion;
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.21,.029,.004),supportMelt*.62);
          rockRelief+=.002*supportMelt;
        }
      `)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.43,supportMelt);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 hot=mix(vec3(.33,.007,.0004),vec3(2.4,.23,.005),smoothstep(.32,.96,supportMelt));
        totalEmissiveRadiance=hot*pow(supportMelt,1.2)*(.78-uWithdrawal*.48);
      `);
  };
  material.customProgramCacheKey = () => `lake-layered-support-${facies}-v1`;
  return material;
}

/** The closed body retains crystalline framework and interstitial melt after
 * withdrawal. These static grains do not imply measured melt fraction or flow. */
export function reservoirMaterial(texture: THREE.Texture, uniforms: LakeUniforms, sheet = false) {
  const material = new THREE.MeshStandardMaterial({ color: '#39342c', roughness: .87, bumpMap: texture, bumpScale: .006, emissive: '#ffffff', emissiveIntensity: 1 });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `attribute vec3 materialPosition;varying vec3 vLakeStone;varying vec3 vLakeWorld;\n${shader.vertexShader}`.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvLakeWorld=(modelMatrix*vec4(transformed,1.)).xyz;vLakeStone=materialPosition;');
    shader.fragmentShader = `varying vec3 vLakeStone;varying vec3 vLakeWorld;uniform float uWithdrawal;\n${noiseGLSL}\n${crystalGapGLSL}
      ${shader.fragmentShader}`.replace('#include <color_fragment>', `#include <color_fragment>
      vec3 stonePoint=vLakeStone*vec3(6.8,8.6,6.8);
      vec3 warp=vec3(lakeFbm(stonePoint*.4),lakeFbm(stonePoint*.4+7.1),lakeFbm(stonePoint*.4+19.7));
      float rich=lakeFbm(stonePoint*.75+warp),gap=lakeCrystalGap(stonePoint+warp*1.6);
      float melt=(1.-smoothstep(.009,.115,gap))*smoothstep(.30+uWithdrawal*.055,.63+uWithdrawal*.04,rich);
      melt=max(melt,smoothstep(.53,.73,rich)*.64)*(1.-uWithdrawal*.28)+.045;
      ${sheet ? 'melt=max(melt,.39+.23*rich);float region=1.;' : `
        vec3 rockPoint=vLakeStone;
        float lobeA=length((rockPoint-vec3(-.95,-.55,-.5))*vec3(.53,.40,.47));
        float lobeB=length((rockPoint-vec3(1.05,-1.1,-.75))*vec3(.62,.47,.53));
        float lobeC=length((rockPoint-vec3(2.25,-2.35,-.25))*vec3(1.05,1.15,.86));
        float edge=min(min(lobeA,lobeB),lobeC)+.38*(lakeFbm(stonePoint*.13)-.5)+.12*(lakeFbm(stonePoint*.32)-.5);
        float region=1.-smoothstep(.63,1.12,edge);melt=melt*region+.003;
      `}
      float fine=lakeNoise(stonePoint*9.);float crystalRelief=(1.-melt)*(.004+.003*fine);
      vec3 crystal=mix(vec3(.033,.035,.032),vec3(.105,.082,.059),rich)*(.67+.33*fine);
      diffuseColor.rgb=mix(crystal*1.7,vec3(.21,.029,.004),melt*.6);
    `).replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=mix(.94,.43,melt);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      vec3 dx=dFdx(-vViewPosition),dy=dFdy(-vViewPosition),r1=cross(dy,normal),r2=cross(normal,dx);float det=dot(dx,r1);
      vec3 bent=abs(det)*normal-sign(det)*(dFdx(crystalRelief)*r1+dFdy(crystalRelief)*r2);if(dot(bent,bent)>1.e-15)normal=normalize(bent);
    `).replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      vec3 hot=mix(vec3(.33,.007,.0004),vec3(2.4,.23,.005),smoothstep(.32,.96,melt));
      totalEmissiveRadiance=(hot*pow(melt,1.2)+vec3(.01,.002,.0004)*region)*(.78-uWithdrawal*.48);
    `);
  };
  material.customProgramCacheKey = () => sheet ? 'lake-intrusive-sheet-v3-material' : 'lake-mush-solid-v4-contact-region';
  return material;
}

export function waterSectionMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {}, side: THREE.DoubleSide,
    vertexShader: `attribute float depth;varying float vDepth;varying vec3 vWorld;
      void main(){vDepth=depth;vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying float vDepth;varying vec3 vWorld;
      void main(){float absorption=1.-exp(-vDepth*1.6);vec3 col=mix(vec3(.055,.19,.21),vec3(.006,.035,.075),absorption);
      col+=vec3(.025,.045,.038)*exp(-vDepth*22.);col*=.97+.03*sin(vWorld.x*15.+vWorld.y*21.);gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  });
}

/** Reflector supplies a real reflected view of this basin, with bounded target
 * size. The tint follows depth; tiny ripples sample geological time and pause. */
export const lakeReflectorShader = {
  name: 'VolcanicLakeWater',
  uniforms: { color: { value: new THREE.Color('#3f8a91') }, tDiffuse: { value: null }, textureMatrix: { value: new THREE.Matrix4() }, uPhase: { value: 0 } },
  vertexShader: `uniform mat4 textureMatrix;attribute float depth;varying float vDepth;varying vec4 vReflection;varying vec3 vWorld;
    #include <common>
    #include <clipping_planes_pars_vertex>
    void main(){vDepth=depth;vReflection=textureMatrix*vec4(position,1.);vWorld=(modelMatrix*vec4(position,1.)).xyz;
      vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
      #include <clipping_planes_vertex>
    }`,
  fragmentShader: `uniform vec3 color;uniform sampler2D tDiffuse;uniform float uPhase;varying float vDepth;varying vec4 vReflection;varying vec3 vWorld;
    #include <common>
    #include <clipping_planes_pars_fragment>
    void main(){
      #include <clipping_planes_fragment>
      vec4 uv=vReflection;float waves=sin(vWorld.x*12.+vWorld.z*9.+uPhase*32.)*.5+sin(vWorld.z*21.-vWorld.x*7.+uPhase*19.)*.3;
      uv.xy+=vec2(waves,-waves*.34)*.0012*uv.w;
      vec3 reflected=texture2DProj(tDiffuse,uv).rgb;
      float absorption=1.-exp(-vDepth*1.55);vec3 water=mix(vec3(.06,.17,.15),vec3(.006,.04,.08),absorption);
      vec3 eye=normalize(cameraPosition-vWorld);float fresnel=pow(1.-clamp(eye.y,0.,1.),3.);
      vec3 col=mix(water,reflected,.11+fresnel*.39);
      col+=vec3(.035,.055,.05)*pow(max(0.,waves),12.)*(.08+fresnel*.12);
      gl_FragColor=vec4(col,mix(.30,.96,smoothstep(.015,1.2,vDepth)));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

export function skyMaterial() {
  return new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    uniforms: {}, vertexShader: 'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 vDirection;void main(){vec3 dir=normalize(vDirection);float h=smoothstep(-.12,.8,dir.y);
      vec3 sky=mix(vec3(.78,.81,.76),vec3(.26,.47,.62),h);float sun=pow(max(0.,dot(dir,normalize(vec3(-.6,.55,.36)))),180.);
      sky+=vec3(1.,.76,.42)*sun*.65;gl_FragColor=vec4(sky,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
}
