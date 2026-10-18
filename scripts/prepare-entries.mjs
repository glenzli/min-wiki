// Content projection only: no renderer, server, site shell or deployment lives here.
import {readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),check=process.argv.includes('--check');
const wiki=JSON.parse(await readFile(resolve(root,'wiki.json'),'utf8'));
const start='<!-- wiki-learning:start -->',end='<!-- wiki-learning:end -->',outdated=[];
async function output(path,expected){const file=resolve(root,path),actual=await readFile(file,'utf8').catch(()=>null);if(actual===expected)return;if(check)outdated.push(path);else await writeFile(file,expected);}
for(const entry of wiki.entries){
 if(entry.status==='draft'||!entry.learning)continue;
 const data=JSON.parse(await readFile(resolve(root,entry.learning),'utf8'));
 if(data.version!==1||data.topicId!==entry.id)throw new Error('Learning identity mismatch: '+entry.id);
 for(const language of wiki.languages){
  const c=data[language],zh=language==='zh',dir=dirname(entry.pages[language]),parts=c.narration;
  const spoken=parts.map(p=>p.text.trim()).join('\n\n')+'\n';
  const storyboard=parts.map((p,i)=>`${String(i+1).padStart(2,'0')} · ${p.label}\n[${p.cue}]\n\n${p.text.trim()}`).join('\n\n---\n\n')+'\n';
  await output(`${dir}/narration.${language}.txt`,spoken);await output(`${dir}/narration.${language}.storyboard.txt`,storyboard);
  const lines=[c.question,'',c.observe,''];
  for(const note of c.academic)lines.push('## '+note.title,'',note.body,'');
  lines.push('## '+(zh?'容易误解的地方':'A common misconception'),'',c.misconception,'','## '+(zh?'模型边界':'Model limits'),'',c.boundary,'','## '+(zh?'资料来源':'Sources'),'',...data.references.map(s=>`- [${s.title}](${s.url})`),'','## '+(zh?'讲给孩子听':'Narration')+' {#narration}','',`[${zh?'下载纯口播稿':'Download spoken text'}](narration.${language}.txt?download) · [${zh?'下载分镜稿':'Download storyboard'}](narration.${language}.storyboard.txt?download)`,'');
  for(const part of parts)lines.push('### '+part.label,'',part.text,'',`*${zh?'画面提示':'Scene cue'}: ${part.cue}*`,'');
  const file=resolve(root,entry.pages[language]),source=await readFile(file,'utf8'),first=source.indexOf(start),last=source.indexOf(end);
  if(first<0||last<first)throw new Error('Missing projection boundaries: '+entry.pages[language]);
  await output(entry.pages[language],source.slice(0,first)+start+'\n\n'+lines.join('\n')+'\n'+end+source.slice(last+end.length));
 }
}
const resources=wiki.languages.map(locale=>locale+':{\n'+wiki.entries.filter(entry=>entry.status!=='draft'&&entry.learning).map(entry=>`  '${entry.id}':()=>import('../../../${entry.learning}?pick=version,topicId,references,${locale}'),`).join('\n')+'\n}').join(',\n');
await output('src/platform/learning/resources.ts','export const resources={\n'+resources+'\n};\n');
if(outdated.length)throw new Error('Run npm run prepare:entries after editing learning content:\n'+outdated.join('\n'));
console.log(check?'Entry projections match all authored learning documents.':'Updated entry manuscripts and narration exports.');
