import { noise, earthField } from './materialFields.ts';
import * as THREE from 'three';
import type { BodyId } from './model.ts';
import { PLANETS_DATA } from '../data/planetsData.ts';
import mercury from '../assets/2k_mercury.webp';
import venus from '../assets/2k_venus_atmosphere.webp';
import earth from '../assets/2k_earth_daymap.jpg';
import mars from '../assets/2k_mars.webp';
import moon from '../assets/2k_moon.jpg';
import clouds from '../assets/2k_earth_clouds.jpg';
import rings from '../assets/2k_saturn_ring_alpha.png';
const maps: Partial<Record<BodyId,string>> = {mercury,venus,earth,mars,moon};
const vertex = `varying vec2 vUv; varying vec3 vN; varying vec3 vP; varying vec3 vLocal;
void main(){vLocal=position;vUv=uv; vN=normalize(mat3(modelMatrix)*normal);vP=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vP,1.);}`;
// Spherical coordinates retain a single value at each pole. Regional vortices are
// illustrative flow patterns, not a numerical meteorological simulation.
const gasShader = `
vec3 direction(float lat,float lon){return vec3(cos(lat)*cos(lon),sin(lat),-cos(lat)*sin(lon));}
vec3 eddy(vec3 p,vec3 center,float width,float speed,vec3 dark,vec3 bright){
  vec3 east=normalize(cross(abs(center.y)>.99?vec3(0,0,1):vec3(0,1,0),center));
  vec3 north=cross(center,east);vec2 xy=vec2(dot(p,east),dot(p,north))/width;
  float r=length(xy);float angle=atan(xy.y,xy.x);
  float swirl=angle+uTime*speed/(.6+r*r)+r*4.;
  vec3 coord=center*17.+east*cos(swirl)*r*3.+north*sin(swirl)*r*3.;
  float filaments=fbm(coord*2.4);
  float arms=fbm(coord*9.+vec3(filaments*4.));
  return mix(dark,bright,.13+.59*filaments+.28*arms*smoothstep(.03,.18,r));
}
vec3 gasColor(vec3 p){
  float lat=asin(clamp(p.y,-1.,1.));
  float drift=uTime*.014*(.25+sin(lat*22.));
  vec3 q=vec3(cos(drift)*p.x-sin(drift)*p.z,p.y,sin(drift)*p.x+cos(drift)*p.z);
  float f=fbm(q*18.+vec3(0,fbm(q*34.)*1.3,0));
  float belt=.5+.19*sin(lat*28.+f*4.2)+.07*sin(lat*62.+f*5.);
  float fibers=fbm(q*vec3(145.,380.,145.)+vec3(f*4.));
  belt+=(fibers-.5)*.17;
  float polar=smoothstep(.95,1.35,abs(lat));
  vec3 col=mix(vec3(.37,.23,.15),vec3(.91,.83,.70),belt);
  if(uPlanet>.5&&uPlanet<1.5)col=mix(vec3(.57,.46,.30),vec3(.89,.80,.61),.25+belt*.65);
  if(uPlanet>1.5)col=mix(uBase*.83,uBase*1.12,.5+(belt-.5)*(uPlanet<2.5?.12:.30)+f*.12);
  if(uPlanet<.5){
    // Separate cyclones around each pole; individual centers are continuous on the sphere.
    vec3 center=vec3(0,sign(p.y),0);float distance=length(p-center);
    for(int i=0;i<8;i++){
      float count=p.y>0.?8.:5.;float angle=float(i)*6.283185/count;
      vec3 candidate=direction(sign(p.y)*1.36,angle);
      if(float(i)<count&&length(p-candidate)<distance){center=candidate;distance=length(p-candidate);}
    }
    vec3 cyclones=eddy(p,center,.12,-.16*sign(p.y),vec3(.27,.31,.32),vec3(.85,.83,.74));
    col=mix(col,cyclones,polar*(1.-smoothstep(.065,.12,distance)));
  }
  if(uPlanet<.5||uPlanet>2.5){
    vec3 center=direction(uPlanet<.5?-.383972:-.436332,-1.633628);
    vec3 east=normalize(cross(vec3(0,1,0),center)),north=cross(center,east);
    float radius=length(vec2(dot(p,east)/.23,dot(p,north)/.115));
    float spot=(1.-smoothstep(.75,1.15,radius))*smoothstep(.5,.9,dot(p,center));
    vec3 storm=eddy(p,center,.18,.19,uPlanet<.5?vec3(.43,.17,.09):uBase*.37,uPlanet<.5?vec3(.86,.56,.34):uBase*.9);
    col=mix(col,storm,spot*.95);
    if(uPlanet>2.5)col=mix(col,vec3(.81,.88,.91),exp(-pow((radius-1.25)*5.,2.))*smoothstep(.15,.7,dot(p,north)/.115)*smoothstep(.47,.65,f)*.7*smoothstep(.5,.9,dot(p,center)));
  }
  if(uPlanet>.5&&uPlanet<1.5&&p.y>.9){
    float r=length(p.xz),angle=atan(p.z,p.x);
    float jet=.235+.015*cos(angle*6.);
    float edge=exp(-pow((r-jet)/.014,2.));
    vec3 vortex=eddy(p,vec3(0,1,0),.11,-.15,vec3(.26,.35,.34),vec3(.7,.76,.65));
    col=mix(col,vortex,1.-smoothstep(.14,.20,r));
    col=mix(col,vec3(.82,.85,.71),edge*(.6+.25*sin(angle*28.+uTime*.5)));
  }
  return col*(.94+.10*fbm(q*160.));
}
`;
/** Time deforms atmospheric coordinates, not the rocky albedo beneath them.
 * Dynamics are illustrative accelerated flows, never a weather forecast or MHD solver. */
export class ActivityBody {
  readonly group = new THREE.Group();
  private ringMeshes:THREE.Mesh[]=[];
  setRingsVisible(visible:boolean){this.ringMeshes.forEach(r=>r.visible=visible);}
  readonly globe: THREE.Mesh<THREE.SphereGeometry,THREE.ShaderMaterial>;
  get cloudTexture(){return this.globe.material.uniforms.uCloud.value as THREE.Texture|null;}
  private textures: THREE.Texture[] = [];
  private materials: THREE.ShaderMaterial[] = [];
  private loops: THREE.Mesh[] = [];
  private disposed = false;
  private plasma: {mesh:THREE.Mesh; path:THREE.CatmullRomCurve3; phase:number}[] = [];
  private load(url:string,color=true) {
    const texture = new THREE.TextureLoader().load(url, t=>{if(this.disposed)t.dispose();else this.invalidate();});
    texture.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
    texture.wrapS=THREE.RepeatWrapping; texture.anisotropy=4; this.textures.push(texture); return texture;
  }
  constructor(readonly id:BodyId,private invalidate:()=>void=()=>{}) {
    const giant=['jupiter','saturn','uranus','neptune'].includes(id);
    const color=id==='neptune'?'#92bbc5':id==='uranus'?'#a4c9cb':id==='sun'?'#ffc47b':id==='moon'?'#a7a49c':id==='titan'?'#d2a15c':PLANETS_DATA.find(p=>p.id===id)?.colorHex??'#b9c4c5';
    const map=maps[id]?this.load(maps[id]!):null;
    const earthCloudMap=id==='earth'?this.load(clouds,false):null;
    const uniforms={uTime:{value:0},uOpacity:{value:1},uCloud:{value:earthCloudMap},uEarth:{value:id==='earth'?1:0},uVenus:{value:id==='venus'?1:0},uRock:{value:['mercury','mars','moon'].includes(id)?1:0},uMap:{value:map},uHasMap:{value:map?1:0},uKind:{value:id==='sun'?2:giant?1:0},uJupiter:{value:id==='jupiter'?1:0},uIce:{value:['uranus','neptune'].includes(id)?1:0},uPlanet:{value:['jupiter','saturn','uranus','neptune'].indexOf(id)},uShell:{value:0},uNear:{value:0},uBase:{value:new THREE.Color(color)}};
    const material=new THREE.ShaderMaterial({uniforms,vertexShader:vertex,transparent:true,fragmentShader:`
      uniform float uTime,uOpacity,uHasMap,uKind,uJupiter,uIce,uPlanet,uShell,uNear,uEarth,uRock,uVenus;uniform vec3 uBase;uniform sampler2D uMap,uCloud;
      varying vec2 vUv;varying vec3 vN,vP,vLocal;${noise}${earthField}${gasShader}
      void main(){vec2 albedoUv=vUv;if(uVenus>.5)albedoUv.x+=uTime*.0009;
      vec3 base=uHasMap>.5?texture2D(uMap,albedoUv).rgb:uBase;
      if(uVenus>.5)base=mix(vec3(.77,.72,.58),vec3(.94,.90,.78),dot(base,vec3(.333333)));
      vec3 p=normalize(vLocal);
      if(uKind>.5&&uKind<1.5){
        base=gasColor(p);
        float micro=fbm(p*380.+vec3(uTime*.05,0.,uTime*.018));
        base*=mix(1.,mix(.52,1.32,smoothstep(.27,.69,micro)),smoothstep(.18,.5,uNear));
      }
      vec3 lightDir=normalize(vec3(-.6,1.,1.));
      float ndl=dot(normalize(vN),lightDir);
      float light=.16+.84*max(0.,ndl);
      // Albedo is not an elevation map: fine relief is deliberately a small material cue.
      if(uRock>.5){float grain=fbm(p*520.);base*=.89+.19*grain;}
      if(uEarth>.5){
        vec3 toSun=normalize(p+lightDir*.006);
        float shadow=cloudCoverage(toSun,uTime,0.);
        base*=1.-shadow*.27*smoothstep(0.,.3,ndl);
        float ocean=(1.-smoothstep(.035,.12,base.r)) * smoothstep(.015,.07,base.b-base.r);
        vec3 halfVector=normalize(lightDir+normalize(cameraPosition-vP));
        base+=vec3(.6,.68,.7)*pow(max(0.,dot(normalize(vN),halfVector)),95.)*ocean*.5;
      }
      if(uKind>1.5){
        vec3 q=p*96.+vec3(uTime*.13,0.,uTime*.08);
        float cells=fbm(q+vec3(fbm(p*15.+uTime*.04)*3.));
        float granule=smoothstep(.22,.64,cells);
        float spot=exp(-pow(length((p-vec3(.45,.30,.84))*vec3(1.,1.6,1.))*14.,2.))+exp(-pow(length((p-vec3(-.35,.12,.93))*vec3(1.,1.4,1.))*19.,2.));
        base=mix(vec3(.63,.18,.025),vec3(1.,.77,.31),granule)*(1.-.83*clamp(spot,0.,1.));
        float limb=.42+.58*pow(max(0.,dot(normalize(vN),normalize(cameraPosition-vP))),.35);light=limb;
      }
      float alpha=uOpacity;
      if(uShell>.5){
        // The same spherical field continues through nested cloud decks. No UV pole seam.
        float cloud=.45*fbm(p*(31.+uShell*7.)+vec3(uTime*.016*uShell,0.,uTime*.009))+.55*fbm(p*290.+vec3(uTime*.05*uShell,0.,uTime*.02));
        alpha*=smoothstep(.36,.68,cloud)*(.48+.08*uShell)*smoothstep(.015,.18,abs(dot(normalize(vN),normalize(cameraPosition-vP))));
        base=mix(base,vec3(.88,.9,.86),smoothstep(.52,.75,cloud)*.35);
      }
      vec3 litColor=base*light;
      if(uKind>.5&&uKind<1.5){
        vec3 fogColor=uPlanet>1.5?uBase*.58:vec3(.54,.48,.38);
        float fog=1.-exp(-length(cameraPosition-vP)*smoothstep(.55,1.,uNear)*8.);
        litColor=mix(litColor,fogColor,fog*.85);
      }
      gl_FragColor=vec4(litColor,alpha);
      #include <colorspace_fragment>
      }`});
    this.materials.push(material);
    this.globe=new THREE.Mesh(new THREE.SphereGeometry(giant?.997:1,160,96),material);this.group.add(this.globe);
    if(giant)for(let i=0;i<3;i++) {
      const cloud=material.clone();cloud.uniforms.uShell.value=i+1;cloud.side=THREE.DoubleSide;cloud.depthWrite=false;
      this.materials.push(cloud);this.group.add(new THREE.Mesh(new THREE.SphereGeometry(1.014-i*.006,160,96),cloud));
    }
    if(id==='earth')for(let level=0;level<3;level++){
      const cm=new THREE.ShaderMaterial({vertexShader:vertex,transparent:true,depthWrite:false,side:THREE.DoubleSide,
        uniforms:{uTime:{value:0},uOpacity:{value:1},uCloud:{value:earthCloudMap},uLevel:{value:level}},fragmentShader:`
          varying vec3 vN,vP,vLocal;uniform float uTime,uOpacity,uLevel;uniform sampler2D uCloud;${noise}${earthField}
          void main(){vec3 p=normalize(vLocal),sun=normalize(vec3(-.6,1.,1.));
            float density=cloudCoverage(p,uTime,uLevel);if(density<.008)discard;
            float upstream=cloudCoverage(normalize(p+sun*.004),uTime,uLevel);
            float slope=clamp((density-upstream)*2.4,-.25,.3);
            float illumination=.14+.86*max(0.,dot(normalize(vN),sun));
            float depth=exp(-density*1.4);
            vec3 color=mix(vec3(.45,.54,.64),vec3(.98,.99,1.),.4+.6*depth+slope)*illumination;
            float alpha=1.-exp(-density*(uLevel>1.5?1.3:2.9));
            gl_FragColor=vec4(color,alpha*uOpacity);
            #include <colorspace_fragment>
          }`});
      this.materials.push(cm);this.group.add(new THREE.Mesh(new THREE.SphereGeometry(1.009+level*.003,160,96),cm));
    }
    if(id==='venus'||id==='titan') {
      const cloudMap=null;
      const cm=new THREE.ShaderMaterial({vertexShader:vertex,transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{uTime:{value:0},uOpacity:{value:1},uCloud:{value:cloudMap},uEarth:{value:0},uColor:{value:new THREE.Color(id==='venus'?'#eae1c5':'#dab77f')}},fragmentShader:`
        varying vec2 vUv;varying vec3 vN,vP;uniform float uTime,uOpacity,uEarth;uniform sampler2D uCloud;uniform vec3 uColor;${noise}
        void main(){float lat=(vUv.y-.5)*3.1416;float drift=uTime*(.001+.002*sin(lat*5.));
        vec2 uv=vec2(vUv.x+drift,vUv.y+.008*sin(vUv.x*25.+uTime*.06));
        vec3 q=vec3(cos(uv.x*6.283)*cos(lat),sin(lat),sin(uv.x*6.283)*cos(lat));
        float f=fbm(q*14.+vec3(0.,uTime*.05,0.));
        float density=uEarth>.5?texture2D(uCloud,uv).r:smoothstep(.42,.68,f)*.7;
        density*=.72+.28*sin(f*8.+uTime*.13);
        float lit=.25+.75*max(0.,dot(normalize(vN),normalize(vec3(-.6,1.,1.))));
        gl_FragColor=vec4(uColor*lit,density*uOpacity*.87*smoothstep(.015,.18,abs(dot(normalize(vN),normalize(cameraPosition-vP)))));
        #include <colorspace_fragment>
        }`});this.materials.push(cm);this.group.add(new THREE.Mesh(new THREE.SphereGeometry(id==='venus'?1.012:1.035,128,80),cm));
    }
    if(id==='earth'||id==='mars'||id==='venus'||giant){
      const rim=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uOpacity:{value:1},uTint:{value:new THREE.Color(id==='earth'?'#4c9ddf':id==='mars'?'#c89c7e':color)}},vertexShader:vertex,fragmentShader:`varying vec3 vN,vP;uniform float uOpacity;uniform vec3 uTint;void main(){float edge=pow(1.-abs(dot(normalize(vN),normalize(cameraPosition-vP))),4.);gl_FragColor=vec4(uTint,edge*.4*uOpacity);}`});
      this.materials.push(rim);this.group.add(new THREE.Mesh(new THREE.SphereGeometry(1.018,80,48),rim));
    }
    if(id==='saturn') {
      const ring=new THREE.Mesh(new THREE.RingGeometry(1.35,2.3,160),new THREE.MeshBasicMaterial({map:this.load(rings),color:'#ddcba3',side:THREE.DoubleSide,transparent:true,opacity:.85,depthWrite:false}));
      const uv=ring.geometry.getAttribute('uv'),pos=ring.geometry.getAttribute('position');
      for(let i=0;i<uv.count;i++)uv.setXY(i,(Math.hypot(pos.getX(i),pos.getY(i))-1.35)/.95,1);
      ring.rotation.x=-Math.PI/2;this.group.add(ring);this.ringMeshes.push(ring);
    }
    if(id==='uranus')for(const [i,radius] of [41838,42234,42571,44718,45661,47176,47627,48300,51149].entries()){
      // Selected narrow inner rings, km / equatorial radius. Widths enlarged for visibility.
      const r=radius/25559,width=i===8?.005:.0017;
      const ring=new THREE.Mesh(new THREE.RingGeometry(r-width,r+width,192),new THREE.MeshBasicMaterial({color:'#778481',side:THREE.DoubleSide,transparent:true,opacity:i===8?.58:.30,depthWrite:false}));
      ring.rotation.x=-Math.PI/2;this.group.add(ring);this.ringMeshes.push(ring);
    }
    if(id==='sun') {
      const glow=new THREE.Mesh(new THREE.SphereGeometry(1.08,64,48),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,vertexShader:vertex,fragmentShader:`varying vec3 vN,vP;void main(){float f=pow(1.-abs(dot(normalize(vN),normalize(cameraPosition-vP))),3.);gl_FragColor=vec4(1.,.35,.035,f*.38);}`}));this.group.add(glow);
    }
    if(id==='sun') for(let j=0;j<7;j++) {
      const angle=j*.87,points:THREE.Vector3[]=[];
      for(let k=0;k<=48;k++){const a=k/48*Math.PI;const x=Math.cos(a)*.13,y=1+Math.sin(a)*(.12+j%3*.055);points.push(new THREE.Vector3(x,y,0));}
      const loop=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,.006,6,false),new THREE.MeshBasicMaterial({color:'#ff7e39',transparent:true,opacity:.8}));
      loop.rotation.z=angle;loop.rotation.y=j*.9;this.loops.push(loop);this.group.add(loop);
      for(let n=0;n<9;n++){const bead=new THREE.Mesh(new THREE.SphereGeometry(.008,8,6),new THREE.MeshBasicMaterial({color:'#ffd393',transparent:true,opacity:.8}));loop.add(bead);this.plasma.push({mesh:bead,path:new THREE.CatmullRomCurve3(points),phase:n/9+j*.031});}
    }
  }
  update(time:number,opacity=1,cloudOpacity=opacity,near=0) {
    this.materials.forEach(m=>{m.uniforms.uTime.value=time;if(m.uniforms.uNear)m.uniforms.uNear.value=near;m.uniforms.uOpacity.value=(m.uniforms.uLevel||m.uniforms.uShell?.value>0)?cloudOpacity:opacity;});
    this.plasma.forEach(({mesh,path,phase})=>{const p=((time*.11+phase)%1+1)%1;mesh.position.copy(path.getPoint(p));(mesh.material as THREE.MeshBasicMaterial).opacity=Math.sin(p*Math.PI)*.85*opacity;});
    this.loops.forEach((loop,i)=>{loop.scale.setScalar(1+Math.sin(time*.24+i)*.018);(loop.material as THREE.MeshBasicMaterial).opacity=(.56+.3*Math.sin(time*.35+i)**2)*opacity;});
  }
  dispose(){this.disposed=true;this.group.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose();}});this.textures.forEach(t=>t.dispose());this.group.clear();}
}
