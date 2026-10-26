import test from 'node:test';
import assert from 'node:assert/strict';
import {PARCEL_CELLS,parcelFrame} from '../parcelFrame.ts';
import {parseRockState,chooseProcess,finishStep,availableProcesses,currentRock} from '../model.ts';

test('material partitions keep all batch identities with finite nonempty fracture polygons',()=>{
  assert.equal(PARCEL_CELLS.length,24);assert.equal(new Set(PARCEL_CELLS.map(c=>c.id)).size,24);
  for(const cell of PARCEL_CELLS){assert.ok(cell.polygon.length>=3);for(const p of cell.polygon)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));}
});
test('every permitted step joins its committed endpoint without replacing the material or its pose',()=>{
  let state=parseRockState({});
  for(const id of ['weather','transport','lithify','heat','melt','slowCool','uplift','stay']){
    assert.ok(availableProcesses(currentRock(state)).includes(id));
    const final={...chooseProcess(state,id),progress:100};const before=parcelFrame(final);state=finishStep(final);const after=parcelFrame(state);
    assert.equal(before.materialId,after.materialId);
    for(const key of ['loose','molten','cement','banded','matrix','water','flow'])assert.equal(before[key],after[key]);
    for(let i=0;i<24;i++)for(const key of ['x','y','z','rotation','scale','settled','lift'])assert.ok(Math.abs(before.cells[i][key]-after.cells[i][key])<1e-12,`${id}/${i}/${key}`);
  }
});
test('transport retains a different deposited position, and lithification packs rather than reassembles the original stone',()=>{
  const weathered=finishStep({...chooseProcess(parseRockState({}),'weather'),progress:100});
  const slope=parcelFrame(weathered),transport=chooseProcess(weathered,'transport'),preview=parcelFrame({...transport,progress:63});
  assert.deepEqual(preview,parcelFrame({...transport,progress:63}));
  const deposited=finishStep({...transport,progress:100}),basin=parcelFrame(deposited);
  assert.ok(basin.cells.every((p,i)=>p.x>slope.cells[i].x+.6));
  const cemented=finishStep({...chooseProcess(deposited,'lithify'),progress:100}),packed=parcelFrame(cemented);
  assert.equal(packed.matrix,1);assert.ok(packed.cells.every(p=>p.settled===1));
  assert.ok(packed.cells.every((p,i)=>Math.abs(p.x-basin.cells[i].x)<.2));
  const heated=finishStep({...chooseProcess(cemented,'heat'),progress:100});
  assert.deepEqual(parcelFrame(heated).cells,packed.cells);assert.equal(parcelFrame(heated).matrix,1);
});
test('weathering opens a retained parcel, while staying leaves its pose unchanged at every fraction',()=>{
  const initial=parseRockState({}),weather=chooseProcess(initial,'weather');
  assert.equal(parcelFrame(weather).loose,0);assert.equal(parcelFrame({...weather,progress:100}).loose,1);
  const stay=chooseProcess(initial,'stay');assert.deepEqual(parcelFrame(stay).cells,parcelFrame({...stay,progress:100}).cells);
  assert.deepEqual(parcelFrame({...weather,progress:61}),parcelFrame({...weather,progress:61}));
});
