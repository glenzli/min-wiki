import test from 'node:test';
import assert from 'node:assert/strict';
import { composition } from '../model.ts';

test('boiling never removes the represented chemical hazard', () => {
  for (const stage of ['before', 'after']) {
    const state = composition('chemical', stage);
    assert.equal(state.chemicalWarning, true);
    assert.equal(state.boilingRemovesChemicalHazard, false);
  }
});
test('microbial scenario distinguishes possible pathogens from inactivation', () => {
  assert.equal(composition('microbial', 'before').pathogenSymbol, 'possible');
  assert.equal(composition('microbial', 'after').pathogenSymbol, 'inactivated');
});
test('all scenarios retain minerals after boiling', () => {
  for (const scenario of ['normal', 'microbial', 'chemical']) {
    assert.equal(composition(scenario, 'after').mineralsRemain, true);
  }
});
test('normal diagram does not claim a measured zero pathogen count', () => {
  assert.equal(composition('normal', 'after').pathogenSymbol, 'not-shown');
  assert.equal('safeToDrink' in composition('normal', 'after'), false);
});

import { treatmentFrame, particleMotion } from '../model.ts';
test('continuous treatment keeps minerals and chemical warning across every conceptual frame',()=>{
 for(let k=0;k<=100;k++){
  const p=k/100,chemical=treatmentFrame('chemical',p),microbial=treatmentFrame('microbial',p);
  assert.equal(chemical.chemicalRemains,true);assert.equal(chemical.mineralsRemain,true);
  assert.ok(microbial.inactivation>=0&&microbial.inactivation<=1);
  assert.equal('safeToDrink' in microbial,false);
 }
 assert.equal(treatmentFrame('microbial',0).inactivation,0);
 assert.equal(treatmentFrame('microbial',1).inactivation,1);
 assert.deepEqual(treatmentFrame('microbial',1),treatmentFrame('microbial',20));
});
test('the same particles follow bounded reversible paths rather than respawning',()=>{
 for(let i=0;i<70;i++){
  assert.deepEqual(particleMotion(i,0),{dx:0,dy:0});
  for(let k=0;k<=100;k++){const m=particleMotion(i,k/100);assert.ok(Math.abs(m.dx)<=8&&Math.abs(m.dy)<=6);}
  assert.deepEqual(particleMotion(i,1),particleMotion(i,10));
 }
});
