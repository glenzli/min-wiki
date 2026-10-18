import {readCatalog} from '../src/catalog/data.mjs';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export function readerCoverage(catalog,wiki) {
  const published=catalog.topics.filter(topic=>topic.status==='published');
  const byId=new Map(published.map(topic=>[topic.id,topic]));
  const registered=new Set();
  for(const entry of wiki.entries){
    if(registered.has(entry.id))throw new Error('Duplicate Reader entry: '+entry.id);
    if(!byId.has(entry.id))throw new Error('Reader entry is not a published topic: '+entry.id);
    registered.add(entry.id);
  }
  const owners=published.filter(topic=>!topic.parentTopic&&topic.listed!==false);
  return {
    published:published.length,
    migrated:[...registered],
    pendingOwners:owners.filter(topic=>!registered.has(topic.id)).map(topic=>topic.id),
    pendingRoutes:published.filter(topic=>!registered.has(topic.id)).map(topic=>({id:topic.id,parentTopic:topic.parentTopic??null,listed:topic.listed!==false})),
  };
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
  const catalog=readCatalog(),wiki=JSON.parse(await readFile(resolve(root,'wiki.json'),'utf8'));
  const report=readerCoverage(catalog,wiki);
  if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
  else {
    console.log(`Reader: ${report.migrated.length}/${report.published} published routes migrated.`);
    console.log('Migrated: '+report.migrated.join(', '));
    console.log(`Next topic owners (${report.pendingOwners.length}): `+report.pendingOwners.join(', '));
    console.log(report.pendingRoutes.length?'Missing Reader routes: '+report.pendingRoutes.map(t=>t.id).join(', '):'All published routes use Wiki Reader.');
  }
  if(process.argv.includes('--require-all')&&report.pendingRoutes.length)process.exitCode=1;
}
