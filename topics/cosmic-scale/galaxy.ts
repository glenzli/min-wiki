import * as THREE from 'three';
export type GalaxyLayer='disk'|'bulge'|'halo'|'dust';
const random=(n:number)=>{const f=Math.sin(n*127.13+88.3)*43758.54;return f-Math.floor(f);};
/** Stable illustrative populations in units of luminous disk radius, not a star catalog. */
export function galaxyPopulation(layer:GalaxyLayer,count:number,seed=0){
  const positions=new Float32Array(count*3),colors=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const n=i*17+seed*701,u=random(n),v=random(n+1),w=random(n+2);let x=0,y=0,z=0;
    if(layer==='disk'||layer==='dust'){
      const r=(layer==='dust'?.18:.045)+(layer==='dust'?.82:.955)*Math.sqrt(u),arm=i%4,scatter=(random(n+3)+random(n+4)-1)*(layer==='dust'?.12:.48);
      const a=arm*Math.PI/2+Math.log(r)*2.05+scatter+(layer==='dust'?.12:0);
      const angle=layer==='disk'&&i%3===0?v*Math.PI*2:a;
      x=r*Math.cos(angle);y=r*Math.sin(angle);z=(w-.5)*.018*(1-r*.6);
    }else if(layer==='bulge'){
      const r=.24*Math.pow(u,.65),a=v*Math.PI*2,h=w*2-1,q=Math.sqrt(1-h*h);
      x=r*q*Math.cos(a)*(i%3===0?1.8:1);y=r*q*Math.sin(a)*.7;z=r*h*.48;
    }else{const r=.25+u*1.6,a=v*Math.PI*2,h=w*2-1,q=Math.sqrt(1-h*h);x=r*q*Math.cos(a);y=r*q*Math.sin(a);z=r*h*.7;}
    positions.set([x,-y,z],i*3);
    const warm=layer!=='disk'||i%7===0;colors.set(warm?[1,.76,.48]:[.52+.25*w,.67+.2*w,1],i*3);
  }
  return {positions,colors};
}
/** One bounded GPU population per layer; only transforms/uniforms change while zooming. */
export class GalaxyVolume {
  readonly root=new THREE.Group();
  private populations:{layer:GalaxyLayer;points:THREE.Points;material:THREE.ShaderMaterial;mist:boolean}[]=[];
  constructor(seed=0){
    for(const [layer,count,mist]of [['disk',15000,false],['disk',12000,true],['dust',3500,true],['bulge',4000,true],['halo',700,false]] as const){
      const population=galaxyPopulation(layer,count,seed),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(population.positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(population.colors,3));
      const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,blending:layer==='dust'?THREE.NormalBlending:THREE.AdditiveBlending,vertexColors:true,
        uniforms:{pointSize:{value:1},opacity:{value:1}},
        vertexShader:`uniform float pointSize;varying vec3 tint;varying float strength;void main(){tint=color;strength=${layer==='disk'||layer==='dust'?'1.-smoothstep(.65,1.,length(position.xy))':'1.'};gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=pointSize;}`,
        fragmentShader:`uniform float opacity;varying vec3 tint;varying float strength;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float a=exp(-r*r*5.)*(1.-smoothstep(.65,1.,r))*opacity*strength;gl_FragColor=vec4(${layer==='dust'?'vec3(.018,.012,.022)':'tint'},a);}`});
      const points=new THREE.Points(geometry,material);points.renderOrder=layer==='dust'?3:mist?1:2;this.root.add(points);this.populations.push({layer,points,material,mist});
    }
  }
  update(radiusPixels:number,dpr:number,opacity:number,layers:{disk:boolean;bulge:boolean;halo:boolean}){
    for(const p of this.populations){p.points.visible=p.layer==='dust'?layers.disk:layers[p.layer];
      p.material.uniforms.pointSize!.value=dpr*(p.mist?Math.max(1,Math.min(64,radiusPixels*(p.layer==='bulge'?.18:.075))):Math.max(.6,Math.min(1.2,radiusPixels/200)));
      p.material.uniforms.opacity!.value=opacity*(p.layer==='dust'?.085:p.mist?(p.layer==='bulge'?.006:.025):.48);
    }
  }
  dispose(){for(const p of this.populations){p.points.geometry.dispose();p.material.dispose();}this.root.clear();}
}
