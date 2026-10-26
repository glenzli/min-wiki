import * as THREE from 'three';
type Kind = 'ocean'|'continent'|'mantle'|'deep'|'new';
const colours:Record<Kind,string>={ocean:'#454b48',continent:'#8b8067',mantle:'#625f4c',deep:'#575549',new:'#474640'};
/** Grain is tied to retained material coordinates; colours are illustrative material cues. */
export function plateMaterial(kind: Kind, surface=false){
  const material=new THREE.MeshStandardMaterial({color:colours[kind],roughness:.96,metalness:0,side:THREE.DoubleSide});
  material.onBeforeCompile=shader=>{
    shader.vertexShader='attribute vec3 materialPoint; varying vec3 vPlateMaterial;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPlateMaterial=materialPoint;');
    shader.fragmentShader='varying vec3 vPlateMaterial;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      float ph(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float pn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(ph(i),ph(i+vec3(1,0,0)),f.x),mix(ph(i+vec3(0,1,0)),ph(i+vec3(1,1,0)),f.x),f.y),mix(mix(ph(i+vec3(0,0,1)),ph(i+vec3(1,0,1)),f.x),mix(ph(i+vec3(0,1,1)),ph(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float grain(vec3 p){return pn(p*8.)*.43+pn(p*27.)*.3+pn(p*103.)*.17+pn(p*291.)*.1;}
    `);
    const isCut=!surface&&kind==='continent';
    const soil=surface&&kind==='continent';
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+
      'vec3 p=vPlateMaterial;float g=grain(p);diffuseColor.rgb*=.56+g*.78;'+
      (isCut?'float bed=sin((p.y+pn(p*vec3(.7,1.,.7))*.03)*59.);diffuseColor.rgb*=.91+bed*.09;':'')+
      (soil?'float cover=smoothstep(.48,.7,pn(p*2.1))*smoothstep(.15,.8,p.y);diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.68,.87,.48),cover*.4);':'')+
      'diffuseColor.rgb*=1.-smoothstep(.71,.83,pn(p*73.))*.19;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      vec3 q0=dFdx(-vViewPosition),q1=dFdy(-vViewPosition);
      float bump=grain(vPlateMaterial)*.015;
      vec3 n0=cross(q1,normal),n1=cross(normal,q0);float det=dot(q0,n0);
      normal=normalize(abs(det)*normal-sign(det)*(dFdx(bump)*n0+dFdy(bump)*n1));
    `);
  };
  material.customProgramCacheKey=()=>kind+(surface?'-top':'-cut')+'-plate-1';return material;
}
