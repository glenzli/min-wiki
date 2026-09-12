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
