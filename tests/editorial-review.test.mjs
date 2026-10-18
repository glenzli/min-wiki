import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {reviewPlan,reviewReport} from '../scripts/editorial-review.mjs';

const wiki=JSON.parse(await readFile(new URL('../wiki.json',import.meta.url),'utf8'));

test('all entries have reasoned editorial maturity without losing their published routes',()=>{
  const plan=reviewPlan(wiki);
  assert.equal(plan.complete.length+plan.draft.length,wiki.entries.length);
  assert.equal(new Set([...plan.complete,...plan.draft]).size,wiki.entries.length);
  assert.ok(wiki.entries.every(entry=>entry.status==='published'));
  for(const entry of wiki.entries.filter(entry=>entry.parentTopic)){
    assert.equal(entry.review.status,wiki.entries.find(owner=>owner.id===entry.parentTopic).review.status);
    assert.equal(plan.complete.includes(entry.id),plan.complete.includes(entry.parentTopic));
  }
  // Discovery is an independent choice: an unlisted entry can be a complete manuscript.
  assert.ok(wiki.entries.some(entry=>entry.listed===false&&plan.complete.includes(entry.id)));
  assert.ok(wiki.entries.some(entry=>entry.listed!==false&&plan.draft.includes(entry.id)));
});

test('missing reasons, missing reviews and inconsistent integrated status cannot pass review',()=>{
  let changed=structuredClone(wiki);delete changed.entries[0].review;
  assert.throws(()=>reviewPlan(changed),/Missing or invalid/);
  changed=structuredClone(wiki);const owner=changed.entries.find(entry=>!entry.parentTopic);owner.review.visual=' ';
  assert.throws(()=>reviewPlan(changed),/Incomplete review reasons/);
  changed=structuredClone(wiki);const child=changed.entries.find(entry=>entry.parentTopic);child.review.status=child.review.status==='draft'?'complete':'draft';
  assert.throws(()=>reviewPlan(changed),/must follow the integrated owner/);
});

test('the checked editorial report is exactly projected from the manifest',async()=>{
  assert.equal(await readFile(new URL('../docs/editorial-review.md',import.meta.url),'utf8'),reviewReport(wiki));
});

test('a partial review reports its actual date and scope rather than repeating a previous full audit',()=>{
  const changed=structuredClone(wiki);
  for(const entry of changed.entries)entry.review.reviewedOn='2026-10-18';
  const owner=changed.entries.find(entry=>!entry.parentTopic);
  owner.review.reviewedOn='2026-10-20';
  const report=reviewReport(changed);
  assert.match(report,/最新复审为 \*\*2026-10-20\*\*，该日更新 \*\*1 个独立主题\*\*/);
  assert.match(report,/\]\(strict-visual-review-20261020\.md\)/);
  assert.ok(!report.includes('strict-visual-review-20261018.md'));
  assert.ok(!report.includes('这轮有12个原完成稿降为草稿'));
});
