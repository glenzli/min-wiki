import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {parseFragment} from 'parse5';

const read=name=>readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
const data=JSON.parse(read('learning.json')),english=JSON.parse(read('locales/en.json'));
const common=JSON.parse(readFileSync(new URL('../../../src/platform/locales/en.json',import.meta.url),'utf8'));
const han=/[\u3400-\u9fff]/;

test('small-bodies owns complete equivalent-language learning and narration contracts',()=>{
  assert.equal(data.topicId,'small-bodies');assert.equal(data.version,1);
  for(const locale of ['zh','en']){
    const c=data[locale];assert.equal(c.academic.length,3);assert.equal(c.narration.length,4);
    for(const key of ['question','observe','misconception','boundary'])assert.ok(c[key].trim().length>20);
    for(const note of c.academic){assert.ok(note.title);assert.ok(note.body.length>100)}
    for(const segment of c.narration){for(const field of ['label','text','cue'])assert.ok(segment[field].trim());assert.ok(!/<\/?[a-z][^>]*>/i.test(segment.text))}
    if(locale==='en')assert.equal(han.test(JSON.stringify(c)),false);
    const page=read(`entry.${locale}.md`);assert.ok(page.includes('<!-- wiki-learning:start -->'));assert.ok(page.includes('<!-- wiki-learning:end -->'));
    for(const note of c.academic)assert.ok(page.includes(note.body));
    assert.equal(read(`narration.${locale}.txt`),c.narration.map(s=>s.text.trim()).join('\n\n')+'\n');
    assert.ok(!read(`narration.${locale}.txt`).includes(c.narration[0].cue));
  }
  assert.ok(data.references.length>=8);
  for(const r of data.references){assert.equal(new URL(r.url).protocol,'https:');assert.ok(/nasa\.gov|esa\.int/.test(new URL(r.url).hostname))}
});

test('topic UI, image alternative and dynamic text have complete English translations',()=>{
  const messages=new Set(),unexpected=[];
  const check=source=>{if(han.test(source))messages.add(source)};
  function html(node){if(node.nodeName==='#text')check(node.value.trim());for(const a of node.attrs??[])if(['aria-label','title','placeholder','alt'].includes(a.name))check(a.value);for(const c of node.childNodes??[])html(c)}
  html(parseFragment(read('reader.html')));
  for(const file of ['main.ts','model.ts','scene.ts']){
    const ast=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true);
    function visit(node){
      if((ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))&&han.test(node.text)){
        if(ts.isCallExpression(node.parent)&&node.parent.expression.getText(ast)==='t'&&node.parent.arguments[0]===node)check(node.text);
        else unexpected.push(`${file}: ${node.text}`);
      }
      ts.forEachChild(node,visit);
    }visit(ast);
  }
  assert.deepEqual(unexpected,[]);
  for(const source of messages)assert.ok(english[source]||common[source],`Missing translation: ${source}`);
  const vars=s=>[...s.matchAll(/\{\{(.*?)\}\}/g)].map(m=>m[1]).sort();
  for(const [source,target] of Object.entries(english)){assert.ok(target.trim());assert.equal(han.test(target),false);assert.deepEqual(vars(target),vars(source))}
});

test('all scene studies use valid Chinese/English pairs and specific scientific sources',()=>{
  const ast=ts.createSourceFile('study.ts',read('study.ts'),ts.ScriptTarget.Latest,true);let pairs=0;
  function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='w'){
    assert.equal(node.arguments.length,2);const [zh,en]=node.arguments;assert.ok(ts.isStringLiteral(zh)&&ts.isStringLiteral(en));assert.ok(han.test(zh.text));assert.ok(en.text.trim());assert.equal(han.test(en.text),false);pairs++;
  }ts.forEachChild(node,visit)}visit(ast);assert.ok(pairs>=15);
});

test('registration proposal stays a draft review, and fallback and related navigation are declared',()=>{
  const entry=JSON.parse(read('catalog-entry.json'));
  assert.equal(entry.id,'small-bodies');assert.equal(entry.status,'published');assert.equal(entry.review.status,'draft');
  assert.equal(entry.document.template,'topics/small-bodies/reader.html');assert.equal(entry.document.entry,'topics/small-bodies/main.ts');
  const html=read('reader.html');for(const id of ['universe-guide','meteors','solar-system'])assert.ok(html.includes(`/topics/${id}/`));
  assert.ok(html.includes('./fallback.svg'));assert.ok(read('fallback.svg').includes('<svg'));
});
