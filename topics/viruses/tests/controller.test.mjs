import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { microbialHref, readWorkspace } from '../../microbes-everywhere/workspaceModel.ts';

test('legacy virus entry only redirects; detailed renderer remains consumed by the unified workspace', () => {
 const main=readFileSync(new URL('../main.ts',import.meta.url),'utf8');
 assert.ok(main.includes("microbialHref('viruses', location.search, import.meta.env.BASE_URL, location.hash)"));
 assert.ok(!main.includes('mountScene'));
 const renderer=readFileSync(new URL('../../microbes-everywhere/workspaceRenderer.ts',import.meta.url),'utf8');
 assert.ok(renderer.includes("import('../viruses/scene')"));
});
test('legacy host and camera links enter the corresponding bounded virus case', () => {
 const url=new URL(microbialHref('viruses','?lang=en&chapter=bacteria&host=defended&view=inside&p=4','/wiki/','#notes'),'https://example.test');
 const state=readWorkspace(url.search);assert.equal(state.chapter,'viruses');assert.equal(state.host,'defended');assert.equal(state.view,'inside');assert.equal(state.viruses.defended,2);assert.equal(url.hash,'#notes');assert.equal(url.pathname,'/wiki/topics/microbes-everywhere/');
});
