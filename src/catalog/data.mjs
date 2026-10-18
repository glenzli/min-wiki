import {readFileSync} from 'node:fs';
/** Editorial projection only. wiki.json is the single entry and route registry. */
export function readCatalog(){
 const wiki=JSON.parse(readFileSync(new URL('../../wiki.json',import.meta.url),'utf8'));
 return {categories:wiki.categories.map(category=>({...category,name:category.name.zh})),topics:wiki.entries.map(entry=>{
  const {id,title,summary,category,tags,duration,modes,theme,sceneTheme,status,updated,parentTopic,listed}=entry;
  return {id,title:title.zh,summary:summary.zh,category,tags,duration,modes,theme,sceneTheme,status,updated,...(parentTopic===undefined?{}:{parentTopic}),...(listed===undefined?{}:{listed})};
 })};
}
