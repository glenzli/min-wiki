import test from 'node:test';
import assert from 'node:assert/strict';
import { comparison,meanDensity,readPair } from '../comparisonModel.ts';
import { readFileSync } from 'node:fs';
const earth={massKg:5.972e24,radiusKm:6371},jupiter={massKg:1.898e27,radiusKm:69911};
test('mass, diameter and mean density remain separate measurements',()=>{assert.ok(Math.abs(meanDensity(earth.massKg,earth.radiusKm)-5.513)<.01);assert.ok(comparison(earth,jupiter,'mass').ratio>300);assert.ok(comparison(earth,jupiter,'diameter').ratio<11);assert.ok(comparison(earth,jupiter,'density').ratio<1);assert.equal(comparison(earth,earth,'mass').ratio,1);});
test('puffy exoplanet reverses the Jupiter size and mass rankings',()=>{const data=JSON.parse(readFileSync(new URL('../comparison.json',import.meta.url)));const p=data.extras.find(p=>p.id==='wasp39');assert.ok(comparison(jupiter,p,'diameter').ratio>1);assert.ok(comparison(jupiter,p,'mass').ratio<1);assert.ok(comparison(jupiter,p,'density').ratio<1);assert.ok(data.extras.every(p=>p.source.startsWith('https://science.nasa.gov/')));});
test('comparison selection rejects unknown identifiers and measures',()=>{assert.deepEqual(readPair('?compareA=bad&compareB=bad&metric=volume',['earth','neptune']),{left:'earth',right:'neptune',metric:'diameter'});});

