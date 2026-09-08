import ts from 'typescript';
import { parse, parseFragment } from 'parse5';
import { readFileSync, readdirSync } from 'node:fs';

const han = /[\u3400-\u9fff]/;
const catalog = JSON.parse(readFileSync('content/catalog.json', 'utf8'));
const groups = ['common', ...catalog.topics.filter(topic => topic.status === 'published').map(topic => topic.id)];
const catalogs = Object.fromEntries(groups.map(group => [group, JSON.parse(readFileSync(
  group === 'common' ? 'src/platform/locales/en.json' : `topics/${group}/locales/en.json`, 'utf8'))]));
const missing = new Set(), unwrapped = new Set(), invalid = new Set();
let checked = 0;
function check(group, source) {
  if (!han.test(source)) return;
  checked++;
  if (!(source in catalogs[group]) && !(source in catalogs.common)) missing.add(`${group}: ${source}`);
}
for (const root of ['src', 'topics']) {
  for (const file of readdirSync(root, { recursive: true }).filter(file => file.endsWith('.ts') && !file.endsWith('i18n.ts'))) {
    const group = root === 'src' ? 'common' : file.split('/')[0];
    if (!(group in catalogs)) continue;
    const ast = ts.createSourceFile(file, readFileSync(`${root}/${file}`, 'utf8'), ts.ScriptTarget.Latest, true);
    function visit(node) {
      if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && han.test(node.text)) {
        if (ts.isCallExpression(node.parent) && node.parent.expression.getText(ast) === 't' && node.parent.arguments[0] === node) check(group, node.text);
        else unwrapped.add(`${root}/${file}: ${node.text}`);
      }
      if (ts.isTemplateExpression(node) && han.test(node.head.text + node.templateSpans.map(s => s.literal.text).join(''))) unwrapped.add(`${root}/${file}: untranslated template`);
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
}
for (const group of groups) {
  const file = group === 'common' ? 'index.html' : `topics/${group}/index.html`;
  function visit(node) {
    if (node.tagName === 'script' || node.tagName === 'style') return;
    if (node.nodeName === '#text') check(group, node.value.trim());
    for (const attr of node.attrs ?? []) if (['aria-label', 'title', 'placeholder', 'content'].includes(attr.name)) check(group, attr.value);
    for (const child of node.childNodes ?? []) visit(child);
  }
  visit(parse(readFileSync(file, 'utf8')));
}
function checkMetadata(value) {
  if (typeof value === 'string') check('common', value);
  else if (value && typeof value === 'object') Object.values(value).forEach(checkMetadata);
}
checkMetadata({...catalog, topics: catalog.topics.filter(topic => topic.status === 'published')});
const placeholders = text => [...text.matchAll(/\{\{(.*?)\}\}/g)].map(match => match[1]).sort().join('|');
function markupContract(text) {
  const result = [];
  function walk(node) {
    if (node.tagName) result.push([node.tagName, (node.attrs ?? []).filter(a => !['aria-label', 'title', 'placeholder'].includes(a.name))]);
    node.childNodes?.forEach(walk);
  }
  walk(parseFragment(text)); return JSON.stringify(result);
}
for (const [group, messages] of Object.entries(catalogs)) {
  for (const [source, target] of Object.entries(messages)) {
    if (!target.trim() || han.test(target)) invalid.add(`${group}: blank or untranslated: ${source}`);
    if (placeholders(source) !== placeholders(target)) invalid.add(`${group}: mismatched interpolation: ${source}`);
    if (/<[a-z][\s>]/i.test(source) || /<[a-z]+\s/i.test(source)) {
      if (markupContract(source) !== markupContract(target)) invalid.add(`${group}: changed template structure: ${source}`);
    }
  }
}
if (missing.size || unwrapped.size || invalid.size) {
  console.error({ missing: [...missing], unwrapped: [...unwrapped], invalid: [...invalid] });
  process.exitCode = 1;
} else console.log(`i18n: ${checked} source messages checked; all ${groups.length} English namespaces complete, with matching interpolations and template structure.`);
