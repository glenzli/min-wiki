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
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float gasNoise(vec3 p){
        vec3 cell=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(cell),hash(cell+vec3(1,0,0)),f.x),mix(hash(cell+vec3(0,1,0)),hash(cell+vec3(1,1,0)),f.x),f.y),
          mix(mix(hash(cell+vec3(0,0,1)),hash(cell+vec3(1,0,1)),f.x),mix(hash(cell+vec3(0,1,1)),hash(cell+vec3(1,1,1)),f.x),f.y),f.z);
      }
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
        for(int i=0;i<176;i++){
          float radius=length(p);
          if(radius<1.02){color+=(1.0-alpha)*vec3(.001,.002,.004);alpha=1.0;break;}
          if(radius>14.1&&dot(p,velocity)>0.0)break;
          float step=clamp(radius*.070,.035,.82);
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
              float lanes=.50+.27*noise(vec2(log(r)*19.0+sin(angle*4.0)*.34,angle*8.0-motion))+.16*noise(vec2(r*12.0,angle*23.0-motion*1.45));
              float heat=pow(3.0/r,.72);
              vec3 tint=mix(vec3(.72,.13,.025),vec3(2.4,1.52,.65),heat);
              vec3 orbital=normalize(vec3(-hit.y,hit.x,0.0));
              float doppler=clamp(1.0-.45*dot(normalize(velocity),orbital),.48,1.52);
              vec3 emission=tint*lanes*pow(doppler,2.2)*pow(3.0/r,1.05)*uStrength;
              float opacity=smoothstep(3.0,3.42,r)*(1.0-smoothstep(9.1,11.0,r))*min(1.0,uStrength*2.0)*density;
              if(!uUseEmission){
                // A steadily fed disk has continuous gas structure, not etched rings.
                // Wrap angular texture coordinates on a cylinder to avoid an atan seam.
                float phase=angle+uTime*.75/pow(r/3.0,1.5);
                vec3 flow=vec3(cos(phase)*3.4,sin(phase)*3.4,log(r)*12.0);
                float cloud=gasNoise(flow),detail=gasNoise(flow*2.7+vec3(0,0,uTime*.025));
                float structure=.60+.48*cloud+.20*detail;
                float heat=pow(3.0/r,.75);
                vec3 warm=mix(vec3(.60,.18,.055),vec3(1.55,1.12,.65),heat);
                float radial=pow(3.0/r,1.3)*smoothstep(3.0,3.7,r);
                emission=warm*structure*radial*pow(doppler,1.6)*uStrength;
                opacity=smoothstep(3.0,3.16,r)*(1.0-smoothstep(9.0,11.0,r))*min(1.0,uStrength*2.0);
              }
              // Transient debris maps keep their existing first-hit projection.
              if(uUseEmission){color=emission*opacity;alpha=opacity;break;}
              // Continue through feathered edges so rays that later enter the hole
              // still occlude background guides and gas. Never punch holes in its shadow.
              color+=(1.0-alpha)*emission*opacity;
              alpha+=(1.0-alpha)*opacity;
              if(alpha>.995)break;
            }
          }
          p=next;
        }
        if(alpha<.002)discard;
        gl_FragColor=vec4(color/max(alpha,.001),alpha);
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
