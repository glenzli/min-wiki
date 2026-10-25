import * as THREE from 'three';

const functions = /* glsl */`
varying vec3 vGlacierPoint;
varying vec3 vGlacierNormal;
float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float n3(vec3 p){
 vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
 float a=mix(h3(i),h3(i+vec3(1,0,0)),f.x),b=mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x);
 float c=mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),d=mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x);
 return mix(mix(a,b,f.y),mix(c,d,f.y),f.z);
}
float fb(vec3 p){return n3(p)*.57+n3(p*2.07+13.7)*.28+n3(p*4.13+7.9)*.15;}
`;

function shaderMaterial(kind: string, roughness: number, colour: string, bump: string) {
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness, metalness: 0 });
  material.onBeforeCompile = shader => {
    shader.vertexShader = `varying vec3 vGlacierPoint;\nvarying vec3 vGlacierNormal;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlacierPoint=position;vGlacierNormal=normal;');
    shader.fragmentShader = functions + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n${colour}`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      {
      vec3 p=vGlacierPoint;float relief=${bump};
      vec3 q0=dFdx(-vViewPosition),q1=dFdy(-vViewPosition);
      vec3 r0=cross(q1,normal),r1=cross(normal,q0);float det=dot(q0,r0);
      vec3 gradient=sign(det)*(dFdx(relief)*r0+dFdy(relief)*r1);
      normal=normalize(abs(det)*normal-gradient);
      }
    `);
  };
  material.customProgramCacheKey = () => `glacier-original-${kind}-3`;
  return material;
}

export function terrainMaterial() {
  return shaderMaterial('terrain', .96, /* glsl */`
    vec3 p=vGlacierPoint;
    float broad=fb(p*1.6),grit=n3(p*75.0),seam=abs(n3(p*vec3(6.0,3.0,6.0))-.5);
    vec3 stone=mix(vec3(.17,.19,.185),vec3(.34,.32,.28),broad);
    float slope=normalize(vGlacierNormal).y;
    stone*=.8+grit*.27;stone=mix(stone,stone*.65,(1.0-smoothstep(.003,.012,seam))*(1.0-smoothstep(.55,.85,slope)));
    stone*=.76+.3*fb(p*vec3(18.0,2.2,18.0));
    float green=smoothstep(.58,.91,slope)*(1.0-smoothstep(.5,1.35,p.y))*smoothstep(.4,.75,broad);
    stone=mix(stone,vec3(.22,.27,.14),green*.75);
    float snowLine=2.45+fb(p*1.3)*.55;
    float snow=smoothstep(snowLine-.13,snowLine+.12,p.y)*smoothstep(.57,.86,slope);
    stone=mix(stone,vec3(.82,.9,.92)*(.93+grit*.07),snow);
    diffuseColor.rgb*=stone;
  `, 'n3(p*88.0)*.0019+fb(p*vec3(17.0,31.0,17.0))*.008');
}

export function cutMaterial() {
  return shaderMaterial('cut', 1, /* glsl */`
    vec3 p=vGlacierPoint;float grain=n3(p*73.0),bed=sin(p.y*31.0+fb(p*.8)*3.5);
    diffuseColor.rgb*=mix(vec3(.13,.16,.16),vec3(.24,.25,.225),grain*.5+bed*.09+.28);
  `, 'n3(p*70.0)*.002');
}

export function iceMaterial() {
  const material = shaderMaterial('ice', .43, /* glsl */`
    vec3 p=vGlacierPoint;float grain=n3(p*155.0),cloud=fb(p*4.8);
    vec3 ice=mix(vec3(.4,.67,.73),vec3(.77,.9,.92),cloud*.7+grain*.15);
    float snowfall=(1.0-smoothstep(-3.5,-1.8,p.z))*smoothstep(.45,.85,normalize(vGlacierNormal).y);
    ice=mix(ice,vec3(.9,.94,.92),snowfall*.78);
    float threads=abs(n3(p*vec3(3.0,1.0,19.0))-.5);
    float hairline=(1.0-smoothstep(.002,.009,threads))*smoothstep(-3.4,-.8,p.z);
    ice=mix(ice,vec3(.19,.4,.48),hairline*.23);
    diffuseColor.rgb*=ice;
  `, 'n3(p*125.0)*.0008+fb(p*vec3(21.0,7.0,16.0))*.003');
  return material;
}

export function debrisMaterial() {
  return shaderMaterial('debris', .99, /* glsl */`
    vec3 p=vGlacierPoint;float grit=n3(p*120.0),stones=n3(p*31.0);
    diffuseColor.rgb*=mix(vec3(.17,.16,.13),vec3(.39,.34,.25),grit*.5+stones*.5);
  `, 'n3(p*130.0)*.0025+n3(p*37.0)*.007');
}

export function waterMaterial() {
  return shaderMaterial('water', .27, /* glsl */`
    vec3 p=vGlacierPoint;float ripple=n3(p*vec3(19.0,1.0,52.0));
    diffuseColor.rgb*=mix(vec3(.12,.37,.4),vec3(.39,.65,.66),ripple);
  `, 'n3(p*vec3(18.0,1.0,70.0))*.0012');
}
