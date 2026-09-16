import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { narrationText, narrationStoryboard } from '../src/platform/learning/model.ts';

const output = resolve(process.argv[2] ?? '/tmp/mini-wiki-narration');
const catalog = JSON.parse(readFileSync(new URL('../content/catalog.json', import.meta.url), 'utf8'));
const english = JSON.parse(readFileSync(new URL('../src/platform/locales/en.json', import.meta.url), 'utf8'));
mkdirSync(output, { recursive: true });
const index = [];
const rows = [];
for (const topic of catalog.topics.filter(topic => topic.status === 'published')) {
  const learning = JSON.parse(readFileSync(new URL(`../topics/${topic.id}/learning.json`, import.meta.url), 'utf8'));
  for (const language of ['zh', 'en']) {
    const content = learning[language];
    const filename = `${topic.id}.${language}.txt`;
    writeFileSync(resolve(output, filename), narrationText(content));
    writeFileSync(resolve(output, `${topic.id}.${language}.storyboard.txt`), narrationStoryboard(content));
    index.push({ topicId: topic.id, title: language === 'zh' ? topic.title : english[topic.title], language,
      file: filename, storyboard: `${topic.id}.${language}.storyboard.txt`, segments: content.narration.length });
  }
  rows.push(`| ${topic.title} | [中文](${topic.id}.zh.txt) · [English](${topic.id}.en.txt) | [中文](${topic.id}.zh.storyboard.txt) · [English](${topic.id}.en.storyboard.txt) |`);
}
writeFileSync(resolve(output, 'index.json'), JSON.stringify(index, null, 2) + '\n');
writeFileSync(resolve(output, 'README.md'), '# 小小百科 · 解说稿 / Narration\n\n纯口播文件只包含朗读正文。分镜文件包含不需朗读的画面提示。两种语言均由各专题 learning.json 导出。\n\nSpoken files contain only narration. Storyboards also include visual directions, which should not be synthesized.\n\n| 专题 / Topic | 口播 / Narration | 分镜 / Storyboard |\n| --- | --- | --- |\n' + rows.join('\n') + '\n');
console.log(`Exported ${index.length} narration scripts and storyboards to ${output}`);
