import * as THREE from 'three';
import { noise, earthField } from './materialFields.ts';
import { smooth } from '../../planet-surfaces/model.ts';
import type { BodyId } from './model.ts';

/** A bounded, body-fixed cloud volume adds parallax and obscuration during approach.
 * Density is a persistent advected field, not a new random image at each altitude. */
export class RegionalAtmosphere {
  readonly mesh:THREE.Mesh<THREE.BoxGeometry,THREE.ShaderMaterial>;
  constructor(private body:BodyId,cloudMap:THREE.Texture|null=null){
    const tint=body==='earth'?'#ecf0f2':body==='uranus'?'#a0c6c9':body==='neptune'?'#95b9c5':body==='saturn'?'#d5c09b':'#c9c2ad';
    const material=new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,depthWrite:false,depthTest:false,uniforms:{uEarth:{value:body==='earth'?1:0},uCloud:{value:cloudMap},toBody:{value:new THREE.Matrix4()},time:{value:0},opacity:{value:0},eye:{value:new THREE.Vector3()},tint:{value:new THREE.Color(tint)}},vertexShader:`
      varying vec3 localPoint;void main(){localPoint=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
    `,fragmentShader:`
      precision highp float;
      varying vec3 localPoint;uniform vec3 eye,tint;uniform float time,opacity;
      uniform float uEarth;uniform sampler2D uCloud;uniform mat4 toBody;
      ${noise}${earthField}
      void main(){
        vec3 ray=normalize(localPoint-eye),halfSize=vec3(.13,.045,.13);
        vec3 inv=1./(ray+vec3(.000001)),t0=(-halfSize-eye)*inv,t1=(halfSize-eye)*inv;
        vec3 lo=min(t0,t1),hi=max(t0,t1);
        float start=max(0.,max(lo.x,max(lo.y,lo.z))),end=min(hi.x,min(hi.y,hi.z));
        if(end<=start)discard;
        float stepSize=(end-start)/28.;vec4 sum=vec4(0.);
        float coverage=1.;
        if(uEarth>.5){vec3 center=normalize((toBody*vec4(0.,0.,0.,1.)).xyz);coverage=cloudCoverage(center,time,0.);}

        for(int i=0;i<28;i++){
          vec3 p=eye+ray*(start+(float(i)+.5)*stepSize);
          vec3 flow=p*52.+vec3(time*.14*(.8+p.y*8.),time*.018,time*.04);
          float billow=n3(flow)*.82+n3(flow*3.1)*.18;
          float edge=(1.-smoothstep(.075,.13,max(abs(p.x),abs(p.z))))*(1.-smoothstep(.026,.045,abs(p.y)));
          float density=smoothstep(.42,.7,billow)*edge;
          if(uEarth>.5){float deck=exp(-pow((p.y+.014)/.014,2.));density*=coverage*deck*2.;}

          float a=1.-exp(-density*stepSize*58.);
          float shade=n3(flow+vec3(-.35,.55,.2))*.82+n3((flow+vec3(-.35,.55,.2))*3.1)*.18;
          float lit=clamp(.7+(billow-shade)*2.5,.18,1.);
          vec3 color=tint*(.23+.8*lit)*(.76+.24*smoothstep(-.03,.04,p.y));
          sum.rgb+=(1.-sum.a)*a*color;sum.a+=(1.-sum.a)*a;
        }
        if(sum.a<.001)discard;
        gl_FragColor=vec4(sum.rgb/sum.a,sum.a*opacity);
        #include <colorspace_fragment>
      }
    `});
    this.mesh=new THREE.Mesh(new THREE.BoxGeometry(.26,.09,.26),material);this.mesh.renderOrder=6;
  }
  update(time:number,progress:number,camera:THREE.Vector3,planetFrame=new THREE.Quaternion()){
    this.mesh.visible=progress>.4;
    if(!this.mesh.visible)return;
    this.mesh.material.uniforms.time.value=time;
    this.mesh.material.uniforms.opacity.value=smooth(.4,.75,progress)*.93;
    this.mesh.updateMatrixWorld(true);
    this.mesh.material.uniforms.toBody.value.makeRotationFromQuaternion(planetFrame.clone().invert()).multiply(this.mesh.matrixWorld);
    this.mesh.material.uniforms.eye.value.copy(this.mesh.worldToLocal(camera.clone()));
  }
  dispose(){this.mesh.geometry.dispose();this.mesh.material.dispose();}
}
