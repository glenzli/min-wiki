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
    for(const key of ['loose','molten','cement','banded'])assert.equal(before[key],after[key]);
    for(let i=0;i<24;i++)for(const key of ['x','y','z','rotation','scale'])assert.ok(Math.abs(before.cells[i][key]-after.cells[i][key])<1e-12,`${id}/${i}/${key}`);
  }
});
test('weathering opens a retained parcel, while staying leaves its pose unchanged at every fraction',()=>{
  const initial=parseRockState({}),weather=chooseProcess(initial,'weather');
  assert.equal(parcelFrame(weather).loose,0);assert.equal(parcelFrame({...weather,progress:100}).loose,1);
  const stay=chooseProcess(initial,'stay');assert.deepEqual(parcelFrame(stay).cells,parcelFrame({...stay,progress:100}).cells);
  assert.deepEqual(parcelFrame({...weather,progress:61}),parcelFrame({...weather,progress:61}));
});
