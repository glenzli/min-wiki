import { createCloudTexture } from '../../src/visuals/cloudTexture.ts';
import { CanvasSurface } from '../../src/visuals/canvasSurface.ts';
import { nearGroundRotation, rotationStrength, smooth, traceBottom } from './model.ts';
import type { Settings } from './model.ts';
import { t } from './i18n.ts';
const noise=(i:number)=>{const v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v);};
export class TopicScene {
  private cloudTexture=createCloudTexture({bounds:[-449, -280, 902, 205],lobes:[[-9,-217,375,24],[-90,-211,166,44],[88,-204,173,39],[-157,-159,128,49],[56,-152,125,57],[-33,-112,99,23],[263,-213,156,12]],seed:103});
  private surface: CanvasSurface; private p=0; private view='annotated';
  private settings: Settings={shear:.8,updraft:.85,condensation:true};
  constructor(canvas:HTMLCanvasElement){this.surface=new CanvasSurface(canvas);this.surface.onResize(()=>this.draw(this.p,this.settings,this.view));}
  draw(progress:number,settings:Settings,view='annotated'){
    this.p=progress;this.settings=settings;this.view=view;
    const s=this.surface,c=s.begin('#bdced2','#e6ddbe'),strength=rotationStrength(settings),tilt=smooth(.18,.58,progress)*Math.min(1,settings.updraft*1.4),ground=nearGroundRotation(progress,settings),bottom=traceBottom(progress,settings),cx=21,cy=40*(1-tilt)+(bottom-145)/2*tilt;
    const natural=view==='natural';
    const label=(text:string,x:number,y:number,width=190)=>s.label(text,x,y,{color:'#324f5a',background:'#f0f3e9e8',width});
    const glow=c.createRadialGradient(290,45,0,260,35,300);glow.addColorStop(0,'#fff4c299');glow.addColorStop(1,'#fff5d000');s.ellipse(260,35,300,260,glow);
    // Haze separates a distant ridge, woodland, and textured foreground fields.
    s.path([[-470,131],[-340,111],[-253,119],[-191,97],[-125,108],[-67,128],[7,118],[95,126],[191,108],[271,124],[370,102],[470,117],[470,280],[-470,280]],'#99aea0');
    s.path([[-470,146],[-359,138],[-261,146],[-182,134],[-92,142],[13,137],[90,145],[198,134],[306,142],[470,131],[470,300],[-470,300]],'#849576');
    const field=c.createLinearGradient(0,132,0,285);field.addColorStop(0,'#a5ad88');field.addColorStop(1,'#5f7862');s.path([[-470,152],[-308,144],[-183,151],[-66,141],[47,143],[196,150],[312,144],[470,151],[470,310],[-470,310]],field);
    s.path([[-365,278],[-185,212],[-120,180],[-82,145],[-77,145],[-109,184],[-173,221],[-289,278]],'#beb79455');
    for(let i=0;i<250;i++){const x=-440+noise(i+3)*880,y=150+noise(i+89)*137,a=(y-150)/150;s.path([[x,y],[x+2+noise(i)*4,y-2-a*7]],undefined,`rgba(47,77,58,${.08+a*.23})`,.7+a);}
    for(let i=0;i<90;i++){const x=-440+noise(i+781)*880,y=139+noise(i+900)*6,r=1+noise(i)*3;s.ellipse(x,y-r,r,r*1.5,'#536f6266');}
    // The broad storm has a ragged anvil and overlapping shaded cloud masses, never a cone.
    // Rain curtains thin at their irregular edges and disappear into the distant ground haze.
    c.save();c.filter='blur(8px)';
    for(let i=0;i<22;i++){
      const u=i/21,x=-278+u*184,top=-117+noise(i+43)*16;
      const rain=c.createLinearGradient(0,top,0,143);rain.addColorStop(0,'#405e7444');rain.addColorStop(1,'#9eaca100');
      c.globalAlpha=Math.sin(u*Math.PI)*(.55+noise(i+60)*.25);c.fillStyle=rain;c.fillRect(x-9,top,18,143-top);
    }
    c.restore();
    for(let i=0;i<90;i++){const u=(noise(i+12)+progress*(1.8+noise(i)*.5))%1,x=-259+noise(i+321)*148-u*18,y=-103+u*243;s.path([[x,y],[x-1.5,y+8+noise(i)*12]],undefined,'#52748c32',.8);}
    const grow=smooth(.49,.86,progress);
    if(settings.condensation&&strength>=.4&&grow>0){
      const tip=-96+grow*189,center=(u:number)=>cx+Math.sin(u*4.4+progress*1.3)*11*u+Math.sin(u*9.2)*3*u;
      const width=(u:number)=>3+(1-u)**2.1*47+(1-grow)*13*u;
      const points:[number,number][]=[];
      for(let i=0;i<=65;i++){const u=i/65;points.push([center(u)-width(u)*(1+.08*Math.sin(u*17+1))*(1-smooth(.94,1,u)*.86), -110+(tip+110)*u]);}
      for(let i=65;i>=0;i--){const u=i/65;points.push([center(u)+width(u)*(1+.09*Math.sin(u*13))*(1-smooth(.94,1,u)*.86), -110+(tip+110)*u]);}
      const funnel=c.createLinearGradient(cx-48,0,cx+49,0);funnel.addColorStop(0,'#42596966');funnel.addColorStop(.22,'#5f7680c0');funnel.addColorStop(.53,'#a9b9b2c7');funnel.addColorStop(.76,'#687e84b3');funnel.addColorStop(1,'#667c8133');c.save();c.shadowColor='#82919788';c.shadowBlur=7;s.path(points,funnel);c.restore();
      c.save();c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();
      for(let j=0;j<80;j++){const u=noise(j),a=j*2.39+progress*23,y=-111+(tip+111)*u,x=center(u)+Math.sin(a+u*16)*width(u);s.path([[x,y],[x+Math.cos(a)*5,y-10-noise(j+8)*13]],undefined,j%3?'#dbe1d321':'#2c4d621c',.5+noise(j+2)*2);}
      c.restore();
    }
    const cloud=this.cloudTexture;c.drawImage(cloud.canvas,cloud.x,cloud.y,cloud.width,cloud.height);
    // Trajectories remain aloft until the selected near-ground stage; cloud visibility is independent.
    if(!natural){const angle=-Math.PI/2*tilt,length=180*(1-tilt)+(bottom+145)*tilt;
      for(let strand=0;strand<5;strand++){
        const pts:[number,number][]=[];
        for(let i=0;i<80;i++){const u=i/79,a=u*Math.PI*5.2+strand*1.3+progress*21*(.2+settings.shear),r=(37-Math.min(1,ground/.3)*21+u*(20+Math.min(1,ground/.3)*20))*(.25+settings.shear*.75)*(1+.06*Math.sin(u*14+strand)),ax=(u-.5)*length,tr=Math.sin(a)*r;pts.push([cx+ax*Math.cos(angle)-tr*Math.sin(angle),cy+ax*Math.sin(angle)+tr*Math.cos(angle)]);}
        c.save();c.globalAlpha=settings.shear*(.23+settings.updraft*.18);s.path(pts,undefined,strand%2?'#eff2dd':'#34586f',1.3);c.restore();
      }
    }
    if(ground>.25)for(let i=0;i<140;i++){const a=i*2.4-progress*32,u=(noise(i+390)+progress*2)%1,r=7+u*45*ground,x=cx+Math.cos(a)*r,y=140-Math.sin(a)*r*.16-u*25;const fog=c.createRadialGradient(x,y,0,x,y,4+noise(i)*7);fog.addColorStop(0,`rgba(112,97,69,${.1+.24*(1-u)})`);fog.addColorStop(1,'#75654900');s.ellipse(x,y,7+noise(i)*9,3+noise(i)*5,fog);}
    if(natural){s.end();return;}
    s.arrow(-340,65,-283,65,'#39778c',2.5);s.arrow(-340,-47,-280+settings.shear*92,-47,'#39778c',2.5);label(t('高处风'),-281,-78,155);label(t('近地风'),-282,99,155);
    if(settings.updraft>.02){s.arrow(162,119,162-settings.updraft*27,119-settings.updraft*222,'#b77832',3);label(t('上升气流'),249,-17,175);}
    s.arrow(-144,-75,-117,114,'#477a9e',2.4);label(t('雷暴云'),230,-201,160);
    if(progress>.8&&ground>.25)label(settings.condensation?t('漏斗云不一定延伸到地面'):t('云隐藏了，旋转空气仍在'),32,197,470);else label(t('气流轨迹示意'),45,197,300);
    s.end();
  }
  dispose(){this.surface.dispose();}
}
