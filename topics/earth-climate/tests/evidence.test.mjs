import test from 'node:test';
import assert from 'node:assert/strict';
import {evidenceDrawing} from '../journeyEvidence.ts';
import {parseClimateState,serializeClimateState} from '../model.ts';

test('site scopes and independent observation phases survive restoration without adding autoplay state',()=>{
 const state=parseClimateState({view:'journey',scope:'evidence',edgeDirection:'retreat',iceCover:'29.3',steps:'3',glacierPhase:'500',evidenceMode:'snow',samplePhase:'74'});
 assert.deepEqual(parseClimateState(serializeClimateState(state)),state);assert.equal(Object.keys(state).length,15);
 const invalid=parseClimateState({scope:'<script>',edgeDirection:'unknown',evidenceMode:'bad',samplePhase:'NaN'});
 assert.equal(invalid.scope,'global');assert.equal(invalid.edgeDirection,'advance');assert.equal(invalid.evidenceMode,'seaice');assert.equal(invalid.samplePhase,0);
 assert.ok(!Object.hasOwn(state,'playing'));
});

test('sea-ice source grains and retained brine remain identifiable while observations advance',()=>{
 const ids=svg=>[...svg.matchAll(/data-material-id="(A-P1-(?:ice|brine)-\d+)"/g)].map(m=>m[1]);
 const a=evidenceDrawing('seaice',0),b=evidenceDrawing('seaice',100);
 assert.deepEqual(ids(a),ids(b));assert.equal(ids(a).length,53);assert.ok(b.includes('A-P1-export-0'));
 assert.equal(evidenceDrawing('seaice',43),evidenceDrawing('seaice',43));
 assert.ok(!evidenceDrawing('snow',100).includes('A-P1-'));
});

test('sediment reveal changes visibility while retaining all clast positions instead of generating a new deposit',()=>{
 const begin=evidenceDrawing('sediment',0),mid=evidenceDrawing('sediment',50),end=evidenceDrawing('sediment',100);
 const material=svg=>svg.replace(/<rect data-observation-cover[^>]+\/>/g,'');
 assert.equal(material(begin),material(mid));assert.equal(material(begin),material(end));
 assert.ok(mid.includes('width="287"'));assert.ok(!end.includes('data-observation-cover'));
});
