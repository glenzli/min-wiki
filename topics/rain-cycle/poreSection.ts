import { clamp, waterParcel, type Settings } from './watershedModel.ts';
import { smooth, spatialWatershedState, stableNoise } from './watershedGeography.ts';

/** A section of the parent batch, unlike the separate groundwater budget below.
 * Fixed grains leave continuous gaps; tracers use those gaps without crossing grains. */
export function poreTracer(progress:number,id:number,settings:Settings){
 const p=clamp(progress),parcel=waterParcel(p,id,settings);
 const lane=id%8,x=55+lane*37,travel=smooth((p-.64)/.36);
 return {id,pool:parcel.pool,x:x+Math.sin(travel*Math.PI*6+lane)*1.3,y:62+travel*(145+(id*37%5)*7)};
}
export function poreSection(progress:number,settings:Settings,tracer:number){
 const state=spatialWatershedState(progress,settings),particles=state.parcels.filter(p=>p.pool==='soil');
 const grains=Array.from({length:63},(_,id)=>{const col=id%9,row=Math.floor(id/9),x=36+col*37,y=80+row*29;return `<ellipse data-soil-grain="${id}" cx="${x}" cy="${y}" rx="${10+stableNoise(id+61)*3}" ry="${8+stableNoise(id+17)*3}" transform="rotate(${stableNoise(id+90)*30-15} ${x} ${y})" fill="${row%3===0?'#b7aa8f':'#a99d85'}" stroke="#827d6c" stroke-width="1"/>`;}).join('');
 const dots=particles.map(p=>{const d=poreTracer(progress,p.id,settings);return `<circle data-batch-water="${p.id}" cx="${d.x}" cy="${d.y}" r="3.2" fill="#2b97c0" stroke="#d9f1f2" stroke-width=".6"/>${p.id===tracer?`<circle cx="${d.x}" cy="${d.y}" r="7" fill="none" stroke="#ac7c27" stroke-width="2"/>`:''}`;}).join('');
 const surface=settings.surface==='paved'?'<path d="M18 51H362V61H18Z" fill="#8c9695"/><path d="M18 54H362" stroke="#d1d7d3" stroke-width="1" stroke-dasharray="25 3"/>':`<path d="M18 56Q90 53 170 58T362 56V63H18Z" fill="${settings.surface==='clay'?'#ad8d73':'#9c9c73'}"/>`;
 return {scene:`<defs><linearGradient id="batch-soil" x2="0" y2="1"><stop stop-color="#e8e1ce"/><stop offset="1" stop-color="#d6ceba"/></linearGradient></defs><rect width="380" height="290" fill="#e5efeb"/><path d="M18 61H362V275H18Z" fill="url(#batch-soil)"/>${surface}${grains}${dots}<path d="M18 275H362" stroke="#8f8d7e" stroke-width="3"/>`,soil:state.pools.soil,surface:state.pools.surface,runoff:progress>.64?state.pools.river+state.pools.lake+state.pools.ocean:0};
}
