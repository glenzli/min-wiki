import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readerCoverage} from '../scripts/reader-coverage.mjs';

test('Reader coverage keeps unmigrated child and unlisted routes pending',()=>{
  const catalog={topics:[{id:'parent',status:'published'},{id:'child',parentTopic:'parent',status:'published'},{id:'held',listed:false,status:'published'},{id:'next',status:'published'},{id:'draft',status:'draft'}]};
  const result=readerCoverage(catalog,{entries:[{id:'parent'}]});
  assert.equal(result.published,4);assert.deepEqual(result.migrated,['parent']);
  assert.deepEqual(result.pendingOwners,['next']);
  assert.deepEqual(result.pendingRoutes.map(topic=>topic.id),['child','held','next']);
});
test('Reader coverage rejects orphan entries and duplicate migration identities',()=>{
  const catalog={topics:[{id:'one',status:'published'},{id:'draft',status:'draft'}]};
  assert.throws(()=>readerCoverage(catalog,{entries:[{id:'draft'}]}),/not a published topic/);
  assert.throws(()=>readerCoverage(catalog,{entries:[{id:'one'},{id:'one'}]}),/Duplicate/);
});
