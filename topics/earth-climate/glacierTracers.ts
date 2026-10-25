import {clamp,glacierPoint,iceShape,terrainHeight,valleyBed,valleyCenter} from './glacier3d/landform';

export const GLACIER_TRACERS=Object.freeze([
  Object.freeze({id:'T1',startZ:-4.2,side:-.25,color:'#b66a25'}),
  Object.freeze({id:'T2',startZ:-3.3,side:.12,color:'#276c83'}),
  Object.freeze({id:'T3',startZ:-2.4,side:.28,color:'#98516e'}),
]);

/** Direction-only teaching snapshots; neither the displacement nor rounds calibrate a physical velocity. */
export function glacierTracers(mass:number,observationRound=0){
  const shape=iceShape(mass),round=clamp(Number.isFinite(observationRound)?observationRound:0,0,12);
  const reference=iceShape(180);
  const markers=GLACIER_TRACERS.map(source=>{
    // Fixed valley coordinates, not a fraction of the shrinking ice envelope.
    const z=source.startZ+round*.28,u=(z-shape.start)/shape.length;
    const tracked=shape.mass>0&&u>=0&&u<=1;
    const surface=glacierPoint(shape,clamp(u),source.side);
    const x=tracked?surface.x:valleyCenter(z)+source.side*.7;
    const y=tracked?surface.y:terrainHeight(x,z);
    return {...source,x,y,z,u,tracked,referenceFraction:(z-reference.start)/reference.length,
      direction:{x:valleyCenter(z+.1)-valleyCenter(z),y:valleyBed(z+.1)-valleyBed(z),z:.1}};
  });
  return {round,front:shape.end,shape,reference,markers};
}
