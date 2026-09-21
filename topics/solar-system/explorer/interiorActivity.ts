import * as THREE from 'three';
import type { InteriorLayer } from '../../planet-surfaces/interior.ts';
import { interiorMotion, type BodyId } from './model.ts';
import { noise } from './materialFields.ts';

/** Material textures follow a bounded streamfunction, using two blended backtraces
 * to avoid unbounded stretching. This is visual transport, not a geodynamic solution.
 * Uncertain interiors retain a static texture; energy transfer never advects matter. */
export class InteriorActivity {
  readonly group=new THREE.Group();
  private surfaces:THREE.ShaderMaterial[]=[];
  constructor(body:BodyId,layers:InteriorLayer[]) {
    const giant=['jupiter','saturn','uranus','neptune'].includes(body);
    for(const [index,layer] of layers.entries()){
      const motion=interiorMotion(body,layer);
      const kind=motion==='mantle'?1:motion==='fluid'?2:motion==='convection'?3:motion==='radiation'?4:motion==='fusion'?5:0;
      const metal=/core|metallic/.test(layer.id)&&!giant,ice=/ice/.test(layer.id);
      const mat=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{
        color:{value:new THREE.Color(layer.color)},neighbor:{value:new THREE.Color(layers[index+1]?.color??layer.color)},
        selected:{value:0},time:{value:0},kind:{value:kind},bounds:{value:new THREE.Vector2(layer.inner,layer.outer)},
        cells:{value:kind===1?7:kind===2?11:16},soft:{value:giant?1:0},materialKind:{value:ice?2:metal?1:0},
      },vertexShader:`varying vec2 pos;void main(){pos=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
        varying vec2 pos;uniform vec3 color,neighbor;uniform float selected,time,kind,cells,soft,materialKind;uniform vec2 bounds;
        ${noise}
        vec2 velocity(vec2 p){
          float r=length(p),w=bounds.y-bounds.x,s=clamp((r-bounds.x)/w,0.,1.),a=atan(p.y,p.x);
          float wave=sin(3.141593*s),phase=cells*a+.4*sin(a*3.);
          float vr=wave*wave*cos(phase)*(cells+1.2*cos(a*3.))*w/(max(r,.01)*cells);
          float vt=-3.141593*sin(6.283185*s)*sin(phase)/cells;
          return vec2(cos(a)*vr-sin(a)*vt,sin(a)*vr+cos(a)*vt);
        }
        vec2 trace(vec2 p,float duration){
          float dt=duration/7.;
          for(int j=0;j<7;j++){
            vec2 v=velocity(p),q=p-velocity(p-v*dt*.5)*dt;
            float radius=clamp(length(q),bounds.x+.0001,bounds.y-.0001);
            p=normalize(q+vec2(.0000001))*radius;
          }return p;
        }
        float textureField(vec2 p){
          vec3 q=vec3(p*23.,7.3);float broad=fbm(q);
          return .58*fbm(q*2.1+vec3(broad*3.))+.27*fbm(q*6.3)+.15*fbm(q*15.1);
        }
        void main(){
          float r=length(pos),s=clamp((r-bounds.x)/(bounds.y-bounds.x),0.,1.);
          float material=textureField(pos);
          if(kind>.5&&kind<3.5){
            float speed=kind<1.5?.035:kind<2.5?.085:.065;
            float phase=fract(time*speed),other=fract(phase+.5);
            float first=textureField(trace(pos,phase*3.5)),second=textureField(trace(pos,other*3.5));
            material=mix(first,second,abs(phase*2.-1.));
          }
          vec3 base=mix(neighbor,color,smoothstep(0.,.23,s)*soft+1.-soft);
          float grain=fbm(vec3(pos*420.,3.));
          vec3 c=base*(.28+material*1.22+grain*.12);
          if(kind>.5&&kind<3.5){
            float filament=smoothstep(.46,.63,material);
            vec3 warm=kind<1.5?vec3(.39,.22,.11):kind<2.5?vec3(.64,.40,.17):vec3(.6,.44,.27);
            vec3 cool=kind<1.5?vec3(.12,.09,.075):vec3(.19,.20,.22);
            c=mix(c,mix(cool,warm,smoothstep(.32,.64,material)),.48);
            c+=base*pow(filament,3.)*.18;
          }else if(kind>3.5){
            // Radiative diffusion/fusion brighten a fine field, not orbiting fluid parcels.
            float glow=.96+.04*sin(time*.24+material*8.);
            c=base*(.73+.6*material)*glow;
          }else{
            // Stationary mineral/facet texture keeps solid and uncertain states distinct.
            float vein=pow(1.-abs(material*2.-1.),12.);
            c*=.88+.18*grain;
            c+=base*vein*(materialKind>.5?.15:.07);
          }
          vec3 relief=normalize(vec3(-dFdx(material)*55.,-dFdy(material)*55.,1.));
          c*=.77+.23*max(0.,dot(relief,normalize(vec3(-.5,.7,1.))));
          c*=.91+.09*sqrt(max(0.,1.-r*r));
          c+=base*selected*.12;
          gl_FragColor=vec4(c,1.);
          #include <colorspace_fragment>
        }`});
      mat.userData.layer=layer.id;mat.userData.motion=motion;this.surfaces.push(mat);
      this.group.add(new THREE.Mesh(new THREE.RingGeometry(layer.inner,layer.outer,192,4),mat));
    }
  }
  update(time:number,selected:string){for(const m of this.surfaces){m.uniforms.time.value=time;m.uniforms.selected.value=m.userData.layer===selected?1:0;}}
  dispose(){this.group.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose();}});this.group.clear();}
}
