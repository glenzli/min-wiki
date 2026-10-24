// Run with node --import tsx scripts/benchmark-visuals.mjs [receipt.json].
// CPU preparation only. Browser/GPU measurements use visual-performance.ts.
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {writeNebulaCloud,nebulaCloudFront} from '../topics/stars/nebulaCloud.ts';
import {writeNebulaEnvironment,NEBULA_SKY_WIDTH,NEBULA_SKY_HEIGHT} from '../topics/stars/nebulaEnvironment.ts';
import * as geometry from '../topics/volcano-eruption/eruptionGeometry.ts';
import {MeltTransport} from '../topics/volcano-eruption/meltTransport.ts';
import {PRESETS} from '../topics/volcano-eruption/model.ts';
const hash=(...arrays)=>{const h=createHash('sha256');for(const a of arrays)h.update(new Uint8Array(a.buffer,a.byteOffset,a.byteLength));return h.digest('hex');};
const measure=(run,count=3)=>{const cold=performance.now();run();const coldMs=performance.now()-cold,times=[];for(let i=0;i<count;i++){const start=performance.now();run();times.push(performance.now()-start);}return {coldMs,medianMs:times.sort((a,b)=>a-b)[Math.floor(count/2)],samplesMs:times};};
const results={};
for(const reference of ['pillars','horsehead','orion']){
  const data=new Uint8Array(64**3*4),front=reference==='orion'?undefined:nebulaCloudFront(new Uint8Array(64**3));
  results[reference]={...measure(()=>writeNebulaCloud(reference,data,64,front)),hash:hash(data,...(front?[front.distance]:[]))};
}
const sky=new Uint8Array(NEBULA_SKY_WIDTH*NEBULA_SKY_HEIGHT*4);
results.sky={...measure(()=>writeNebulaEnvironment('pillars',sky)),hash:hash(sky)};
const settings={...PRESETS.flow,landform:'composite'},branch=geometry.lavaBranches(settings)[0];
const transport=MeltTransport.surface(geometry.lavaRibbon(.7,settings,branch));
results.melt100={...measure(()=>{for(let i=0;i<100;i++)transport.update(i*.013,.82);}),hash:hash(transport.positions,transport.uvs,transport.waves,transport.crust)};
let ribbon,retained=geometry.RetainedLavaRibbon?new geometry.RetainedLavaRibbon(settings,branch):undefined;
results.matureLava120={...measure(()=>{for(let i=0;i<120;i++)ribbon=retained?retained.sample(.85+i*.0002).geometry:geometry.lavaRibbon(.85+i*.0002,settings,branch);}),hash:hash(Float64Array.from(ribbon.positions),Float64Array.from(ribbon.uvs))};
const inputs={};for(const file of ['topics/stars/nebulaCloud.ts','topics/stars/nebulaEnvironment.ts','topics/volcano-eruption/eruptionGeometry.ts','topics/volcano-eruption/meltTransport.ts'])inputs[file]=createHash('sha256').update(await readFile(file)).digest('hex');
const receipt={at:new Date().toISOString(),node:process.version,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),inputs,results};
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
