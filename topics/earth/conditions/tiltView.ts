import type { EarthSimulation } from '../../earth-seasons/physics/earthSimulation.ts';
import { tiltOutcome } from './model.ts';

type Selection={tilt:number;season:number;city:string};
/** Owns the lazy, static-condition daylight lens. Geometry stays in Seasons.
 * Camera settling and gestures are bounded presentation frames, not a climate clock.
 */
export class TiltViewport {
  private scene?:EarthSimulation;
  private pending=false;private failed=false;private disposed=false;
  private selection:Selection={tilt:23.44,season:.25,city:'beijing'};
  private key='';private frames=0;
  constructor(private host:HTMLElement,private status:(status:'loading'|'ready'|'failed')=>void){}
  get state(){return this.failed?'failed':this.scene?'ready':this.pending?'loading':'idle';}
  set(selection:Selection){
    this.selection={...selection};const key=JSON.stringify(selection);
    if(key!==this.key){this.key=key;this.apply();this.frames=180;}
    if(!this.scene&&!this.pending&&!this.failed)void this.prepare();
  }
  private async prepare(){
    this.pending=true;this.status('loading');
    try{
      const {EarthSimulation}=await import('../../earth-seasons/physics/earthSimulation.ts');
      if(this.disposed)return;
      this.scene=new EarthSimulation(this.host);this.scene.selectScenario('daynight');this.scene.setView('sun');
      this.scene.showEarthLatitudeReferences(false);
      this.scene.subsolarMarkerVisible=false;this.scene.selectedCityOnly=true;
      const canvas=this.scene.renderer.domElement;canvas.tabIndex=0;
      canvas.setAttribute('role','img');canvas.setAttribute('aria-label',this.host.getAttribute('aria-label')??'');
      canvas.addEventListener('keydown',e=>{
        if(!this.scene||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key))return;
        e.preventDefault();this.scene.view='free';this.scene.cameraTransition=false;
        const target=this.scene.controls.target,offset=this.scene.camera.position.clone().sub(target),r=offset.length();
        let theta=Math.atan2(offset.x,offset.z),phi=Math.acos(Math.max(-1,Math.min(1,offset.y/r)));
        theta+=e.key==='ArrowLeft'?-.12:e.key==='ArrowRight'?.12:0;phi=Math.max(.1,Math.min(Math.PI-.1,phi+(e.key==='ArrowUp'?-.12:e.key==='ArrowDown'?.12:0)));
        const radius=Math.max(this.scene.controls.minDistance,Math.min(this.scene.controls.maxDistance,r*(e.key==='+'?.9:e.key==='-'?1.1:1)));
        this.scene.camera.position.set(radius*Math.sin(phi)*Math.sin(theta),radius*Math.cos(phi),radius*Math.sin(phi)*Math.cos(theta)).add(target);this.scene.controls.update();this.frames=90;
      });
      this.scene.controls.addEventListener('change',()=>{this.frames=Math.max(this.frames,40);});
      this.scene.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.failed=true;this.status('failed');});
      this.apply();this.frames=180;this.status('ready');
    }catch{this.failed=true;this.status('failed');}
    finally{this.pending=false;}
  }
  private apply(){
    if(!this.scene)return;const f=tiltOutcome(this.selection.tilt,this.selection.season,this.selection.city);
    this.scene.isPlaying=false;this.scene.currentTiltDeg=f.tilt;this.scene.targetTiltDeg=f.tilt;
    this.scene.orbitProgress=f.season;this.scene.rotationProgress=f.rotation;this.scene.selectCity(f.city.id);
    this.scene.cameraTransition=true;
    const canvas=this.scene.renderer.domElement;canvas.dataset.observedTilt=String(f.tilt);canvas.dataset.observedCity=f.city.id;canvas.dataset.observedSeason=String(f.season);
  }
  draw(dt:number){if(this.scene&&!this.failed&&!this.disposed&&this.frames>0){this.frames--;this.scene.update(Math.max(1/120,dt));}}
  resize(){this.frames=90;}
  retry(){this.scene?.dispose();this.scene=undefined;this.failed=false;void this.prepare();}
  dispose(){this.disposed=true;this.scene?.dispose();}
}
