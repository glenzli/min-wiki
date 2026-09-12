import * as THREE from 'three';
/**
 * Camera-dependent null-ray illustration around a non-spinning hole.
 * Schwarzschild spatial-ray central-force form, integrated over a finite volume.
 * Disk emissivity and Doppler contrast are stylized; no Kerr metric or background lensing.
 * shadowRadius is a display scale, independent from the topic's dynamics/absorption boundary.
 */
export class BlackHoleOptics extends THREE.Group {
    private quad: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
    private inverse = new THREE.Matrix4();
    private rootQuaternion = new THREE.Quaternion();
    private cameraQuaternion = new THREE.Quaternion();
    private cameraPosition = new THREE.Vector3();
    constructor(public shadowRadius: number) {
        super();
        const rs = shadowRadius / 2.6;
        const material = new THREE.ShaderMaterial({
            uniforms: { uCamera: { value: new THREE.Vector3() }, uInverse: { value: new THREE.Matrix4() }, uRs: { value: rs }, uTime: { value: 0 }, uStrength: { value: 0 }, uEmission: { value: null }, uEmissionExtent: { value: 20 }, uUseEmission: { value: false } },
            vertexShader: `varying vec3 vWorld;void main(){vec4 world=modelMatrix*vec4(position,1.0);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
            fragmentShader: `
      precision highp float;
      varying vec3 vWorld;
      uniform sampler2D uEmission;uniform float uEmissionExtent;uniform bool uUseEmission;
      uniform vec3 uCamera;uniform mat4 uInverse;uniform float uRs;uniform float uTime;uniform float uStrength;
      vec3 acceleration(vec3 p,float angular2){float r2=dot(p,p);return -1.5*angular2*p/(r2*r2*sqrt(r2));}
      float noise(vec2 p){return .5+.5*sin(p.x*2.1+sin(p.y*3.7)+sin(p.x*.7-p.y*1.2));}
      void main(){
        vec3 origin=uCamera/uRs;
        vec3 target=(uInverse*vec4(vWorld,1.0)).xyz/uRs;
        vec3 direction=normalize(target-origin);
        float projection=dot(origin,direction);
        vec3 impact=cross(origin,direction);
        float discriminant=196.0-dot(impact,impact);
        if(discriminant<0.0)discard;
        float entry=max(0.0,-projection-sqrt(discriminant));
        vec3 p=origin+direction*entry;
        float angular2=dot(impact,impact);
        vec3 velocity=direction;
        vec3 color=vec3(0.0);float alpha=0.0;
        for(int i=0;i<144;i++){
          float radius=length(p);
          if(radius<1.02){color=vec3(.001,.002,.004);alpha=1.0;break;}
          if(radius>14.1&&dot(p,velocity)>0.0)break;
          float step=clamp(radius*.085,.045,1.0);
          vec3 mid=p+velocity*step*.5;
          vec3 midVelocity=velocity+acceleration(p,angular2)*step*.5;
          vec3 next=p+midVelocity*step;
          velocity+=acceleration(mid,angular2)*step;
          if(p.z*next.z<=0.0&&abs(p.z-next.z)>.000001&&uStrength>.001){
            float blend=p.z/(p.z-next.z);vec3 hit=mix(p,next,blend);float r=length(hit.xy);
            if(r>3.0&&r<11.0){
              float density=uUseEmission?texture2D(uEmission,hit.xy*uRs/(2.0*uEmissionExtent)+0.5).r:1.0;
              if(density<.002){p=next;continue;}
              float angle=atan(hit.y,hit.x),motion=uTime/(.7+pow(r,.8));
              float lanes=.48+.32*noise(vec2(log(r)*23.0+sin(angle*5.0)*.4,angle*10.0-motion))+.20*noise(vec2(r*16.0,angle*31.0-motion*1.8));
              float heat=pow(3.0/r,.72);
              vec3 tint=mix(vec3(.72,.13,.025),vec3(2.4,1.52,.65),heat);
              vec3 orbital=normalize(vec3(-hit.y,hit.x,0.0));
              float doppler=clamp(1.0-.45*dot(normalize(velocity),orbital),.48,1.52);
              color=tint*lanes*pow(doppler,2.2)*pow(3.0/r,1.05)*uStrength;
              alpha=smoothstep(3.0,3.3,r)*(1.0-smoothstep(9.5,11.0,r))*min(1.0,uStrength*2.0)*density;
              break;
            }
          }
          p=next;
        }
        if(alpha<.002)discard;
        gl_FragColor=vec4(color,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
            transparent: true, depthWrite: false, side: THREE.DoubleSide,
        });
        this.quad = new THREE.Mesh(new THREE.PlaneGeometry(rs * 29, rs * 29), material);
        this.quad.frustumCulled = false;
        this.quad.renderOrder = 12;
        this.add(this.quad);
        this.quad.onBeforeRender = (_renderer, _scene, camera) => {
            this.updateWorldMatrix(true, false);
            this.inverse.copy(this.matrixWorld).invert();
            camera.getWorldPosition(this.cameraPosition).applyMatrix4(this.inverse);
            material.uniforms.uCamera.value.copy(this.cameraPosition);
            material.uniforms.uInverse.value.copy(this.inverse);
            camera.getWorldQuaternion(this.cameraQuaternion);
            this.getWorldQuaternion(this.rootQuaternion).invert();
            this.quad.quaternion.copy(this.rootQuaternion).multiply(this.cameraQuaternion);
            this.quad.updateMatrixWorld(true);
        };
    }
    setAccretion(time: number, strength: number) { this.quad.material.uniforms.uTime.value = time; this.quad.material.uniforms.uStrength.value = Math.max(0, Math.min(1, strength)); }
    // The caller owns the map and supplies coordinates in this group's plane.
    setEmissionMap(texture: THREE.Texture | null, extent = 20) {
        this.quad.material.uniforms.uEmission.value = texture;
        this.quad.material.uniforms.uEmissionExtent.value = extent;
        this.quad.material.uniforms.uUseEmission.value = texture !== null;
    }
    dispose() { this.quad.geometry.dispose(); this.quad.material.dispose(); }
}
