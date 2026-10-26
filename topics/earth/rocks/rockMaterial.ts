import {MeshStandardMaterial} from 'three';
import type {SpecimenId} from './model';
const ids: Record<SpecimenId, number> = { granite: 0, basalt: 1, sandstone: 2, limestone: 3, slate: 4, marble: 5, gneiss: 6 };
const shaderFunctions = /* glsl */`
varying vec3 vRockPoint;
varying vec3 vRockStructure;
uniform float uRockKind;
uniform float uRockTo;
uniform float uRockBlend;
vec3 rockHash(vec3 p) {
  p = vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));
  return fract(sin(p)*43758.5453123);
}
float rockNoise(vec3 p) {
  vec3 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
  float a=mix(rockHash(i).x,rockHash(i+vec3(1,0,0)).x,f.x);
  float b=mix(rockHash(i+vec3(0,1,0)).x,rockHash(i+vec3(1,1,0)).x,f.x);
  float c=mix(rockHash(i+vec3(0,0,1)).x,rockHash(i+vec3(1,0,1)).x,f.x);
  float d=mix(rockHash(i+vec3(0,1,1)).x,rockHash(i+vec3(1,1,1)).x,f.x);
  return mix(mix(a,b,f.y),mix(c,d,f.y),f.z);
}
vec3 rockCell(vec3 p) {
  vec3 base=floor(p), f=fract(p); float nearest=20.0, second=20.0, identity=0.0;
  for(int z=-1;z<=1;z++)for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++) {
    vec3 offset=vec3(float(x),float(y),float(z));
    vec3 hash=rockHash(base+offset);
    vec3 diff=offset+0.13+hash*0.74-f;
    float d=dot(diff,diff);
    if(d<nearest){second=nearest;nearest=d;identity=hash.x;}else if(d<second){second=d;}
  }
  return vec3(identity,sqrt(nearest),max(0.0,sqrt(second)-sqrt(nearest)));
}
vec3 rockColour(vec3 p,float kind) {
  // Display-only added cement: separate from the retained source batches and
  // from a whole sandstone specimen. No cement mineral or volume is predicted.
  if(kind>7.5)return mix(vec3(.4,.34,.24),vec3(.6,.53,.39),rockNoise(p*68.0))*(.92+.08*rockNoise(p*260.0));
  if(kind>6.5)return mix(vec3(.51,.39,.34),vec3(.79,.7,.64),rockNoise(p*80.0))*(.9+.1*rockNoise(p*230.0));
  float grit=rockNoise(p*115.0), cloud=rockNoise(p*7.5), fine=rockNoise(p*310.0);
  if(kind<0.5) {
    vec3 c=rockCell(p*14.0+vec3(cloud*.65));
    vec3 base=c.x<.16?vec3(.075,.09,.083):c.x<.42?vec3(.52,.54,.51):c.x<.7?vec3(.76,.59,.51):vec3(.82,.79,.68);
    float mica=step(.81,rockNoise(p*49.0))*step(.65,c.x);
    base=mix(base,vec3(.14,.17,.15),mica*.7);
    base*=.85+.25*grit;
    base=mix(base,base*.64,1.0-smoothstep(.004,.035,c.z));
    return base;
  }
  if(kind<1.5) {
    float pore=smoothstep(.79,.86,rockNoise(p*33.0));
    vec3 base=mix(vec3(.105,.13,.13),vec3(.25,.28,.25),grit*.55);
    float lath=step(.77,rockNoise(p*vec3(85.0,240.0,100.0)));
    return mix(base,vec3(.45,.47,.4),lath*.52)*(1.0-pore*.72);
  }
  if(kind<2.5) {
    vec3 c=rockCell(p*20.0);
    float bed=sin((p.y+sin(p.z*4.0)*.022)*30.0);
    float radius=.36+.13*c.x;
    float grain=1.0-smoothstep(radius-.025,radius+.035,c.y);
    vec3 body=mix(vec3(.58,.37,.2),vec3(.83,.67,.44),c.x*.65+grit*.28);
    body*=.9+.1*bed;
    vec3 cement=mix(vec3(.43,.34,.23),vec3(.58,.46,.3),cloud*.6+fine*.25);
    float pore=(1.0-grain)*smoothstep(.73,.86,rockNoise(p*95.0));
    return mix(cement,body,grain)*(1.0-pore*.37)*(.94+fine*.12);
  }
  if(kind<3.5) {
    vec3 c=rockCell(p*9.0);
    float shell=abs(c.y-.35);
    float fossil=(1.0-smoothstep(.018,.047,shell))*step(.65,c.x)*smoothstep(.15,.35,rockNoise(p*14.0));
    vec3 base=mix(vec3(.47,.46,.36),vec3(.66,.63,.5),grit*.5+cloud*.4);
    return mix(base,vec3(.82,.78,.61),fossil*.85);
  }
  if(kind<4.5) {
    float cleavage=sin((p.y+rockNoise(p*.8)*.015)*400.0);
    vec3 base=mix(vec3(.17,.23,.25),vec3(.31,.37,.37),grit*.6);
    return base*(.86+.14*smoothstep(-.9,.7,cleavage));
  }
  if(kind<5.5) {
    vec3 c=rockCell(p*22.0);
    float vein=abs(sin(p.x*8.0+p.y*4.0+rockNoise(p*2.3)*7.0));
    vec3 base=mix(vec3(.69,.72,.67),vec3(.92,.9,.8),c.x*.6+grit*.25);
    base=mix(base,vec3(.37,.43,.42),1.0-smoothstep(.015,.085,vein));
    return base*(.9+.1*smoothstep(.002,.04,c.z));
  }
  float folded=p.y*24.0+sin(p.x*3.0+p.z*1.5)*1.6+sin(p.z*6.0)*.8+rockNoise(p*2.4)*4.7;
  vec3 grain=rockCell(p*27.0);
  float band=smoothstep(-.4,.3,sin(folded+grain.x*.5));
  vec3 base=mix(vec3(.17,.22,.2),vec3(.59,.57,.48),band);
  return base*(.75+.23*grain.x+.2*grit)+vec3(fine*.025);
}
float rockHeight(vec3 p,float kind) {
  if(kind>7.5)return rockNoise(p*105.0)*.0012;
  if(kind>6.5)return rockNoise(p*140.0)*.0018;
  float fine=rockNoise(p*140.0)*.0007+rockNoise(p*48.0)*.001;
  if(kind<.5) return fine+rockCell(p*14.0).z*.009;
  if(kind<1.5) return fine-smoothstep(.76,.87,rockNoise(p*33.0))*.014;
  if(kind<2.5) {vec3 c=rockCell(p*20.0);return fine+(1.0-smoothstep(.335+.13*c.x,.395+.13*c.x,c.y))*.0035;}
  if(kind<3.5) return fine*.6;
  if(kind<4.5) return fine*.4+sin(p.y*400.0)*.0007;
  if(kind<5.5) return fine*.35+rockCell(p*22.0).z*.003;
  return fine+sin(p.y*36.0+sin(p.x*4.5+p.z*2.0)*1.7)*.0015;
}
`;

export function rockMaterial(specimen: SpecimenId,coordinates:'local'|'origin'|'world'='local'): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ color: 0xffffff, roughness: specimen === 'marble' ? .51 : specimen === 'slate' ? .68 : .86, metalness: 0 });
  material.userData.from={value:ids[specimen]};material.userData.to={value:ids[specimen]};material.userData.blend={value:0};
  material.onBeforeCompile = shader => {
    shader.uniforms.uRockKind=material.userData.from;shader.uniforms.uRockTo=material.userData.to;shader.uniforms.uRockBlend=material.userData.blend;
    const world='(modelMatrix*vec4(position,1.0)).xyz';
    shader.vertexShader = `${coordinates==='origin'?'attribute vec3 rockOrigin;\n':''}varying vec3 vRockPoint;\nvarying vec3 vRockStructure;\n${shader.vertexShader}`.replace('#include <begin_vertex>', `#include <begin_vertex>\nvRockPoint = ${coordinates==='origin'?'rockOrigin':coordinates==='world'?world:'position'};\nvRockStructure=${coordinates==='local'?'position':world};`);
    shader.fragmentShader = shaderFunctions + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec3 pointFrom=uRockKind>5.5&&uRockKind<6.5?vRockStructure:vRockPoint;
      vec3 pointTo=uRockTo>5.5&&uRockTo<6.5?vRockStructure:vRockPoint;
      diffuseColor.rgb *= mix(rockColour(pointFrom,uRockKind),rockColour(pointTo,uRockTo),uRockBlend);`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      vec3 q0 = dFdx(-vViewPosition), q1 = dFdy(-vViewPosition);
      float bump = mix(rockHeight(pointFrom,uRockKind),rockHeight(pointTo,uRockTo),uRockBlend);
      vec3 n0 = cross(q1, normal), n1 = cross(normal, q0);
      float determinant = dot(q0, n0);
      vec3 gradient = sign(determinant) * (dFdx(bump)*n0 + dFdy(bump)*n1);
      normal = normalize(abs(determinant)*normal - gradient);
    `);
  };
  material.customProgramCacheKey = () => `earth-rock-${specimen}-${coordinates}-3`;
  return material;
}

