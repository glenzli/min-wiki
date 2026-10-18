import {readFile,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;

export function reviewPlan(wiki){
  const byId=new Map(wiki.entries.map(entry=>[entry.id,entry]));
  for(const entry of wiki.entries){
    const review=entry.review;
    if(!review||!['complete','draft'].includes(review.status)||!validDate(review.reviewedOn))throw new Error('Missing or invalid editorial review: '+entry.id);
    if(entry.parentTopic){
      const parent=byId.get(entry.parentTopic);
      if(review.inherits!==entry.parentTopic||!parent?.review||parent.parentTopic||review.status!==parent.review.status)throw new Error('Editorial status must follow the integrated owner: '+entry.id);
    }else if(review.inherits||['visual','content','interaction','next'].some(key=>typeof review[key]!=='string'||!review[key].trim()))throw new Error('Incomplete review reasons: '+entry.id);
  }
  const available=wiki.entries.filter(entry=>entry.status==='published');
  const owners=available.filter(entry=>!entry.parentTopic);
  return {
    formatVersion:1,
    policy:'complete-only',
    complete:available.filter(entry=>entry.review.status==='complete').map(entry=>entry.id),
    draft:available.filter(entry=>entry.review.status==='draft').map(entry=>entry.id),
    owners:{complete:owners.filter(entry=>entry.review.status==='complete').map(entry=>entry.id),draft:owners.filter(entry=>entry.review.status==='draft').map(entry=>entry.id)},
  };
}

export function reviewReport(wiki){
  const plan=reviewPlan(wiki),owners=wiki.entries.filter(entry=>!entry.parentTopic),children=wiki.entries.filter(entry=>entry.parentTopic);
  const latestReview=owners.map(entry=>entry.review.reviewedOn).sort().at(-1);
  const listedOwners=owners.filter(entry=>entry.listed!==false).length;
  const cell=text=>text.replaceAll('|','／').replaceAll('\n',' ');
  const link=entry=>`[${cell(entry.title.zh)}](../topics/${entry.id}/${existsSync(new URL('../topics/'+entry.id+'/README.md',import.meta.url))?'README.md':'entry.zh.md'})`;
  const table=status=>owners.filter(entry=>entry.review.status===status).map(entry=>`| ${link(entry)} \`${entry.id}\` | ${['visual','content','interaction','next'].map(key=>cell(entry.review[key])).join(' | ')} |`).join('\n');
  const heading='| 主题 | 绘图与可辨识度 | 讲述与完整度 | 交互与界面 | 下一步 |\n| --- | --- | --- | --- | --- |';
  return `# Wiki 稿件质量评估 · ${latestReview}

本轮为编辑质量评估，记录在唯一登记表 \`wiki.json\` 的 \`review\` 字段。完成稿表示这轮评估认为核心问题、关键图形、条件对照和阅读路径已经成立，允许保留非阻断的改进建议；草稿表示仍有影响理解或展示的短板。它不等于人工科学审稿或上线批准，也不以测试数量、篇幅、三维效果多少判断好坏。

共 ${owners.length} 个独立主题（${listedOwners} 个目录主题、${owners.length-listedOwners} 个保留直达主题），以及 ${children.length} 个整合后的兼容入口。独立主题为 **${plan.owners.complete.length} 个完成稿、${plan.owners.draft.length} 个草稿**；按全部路由计为 **${plan.complete.length} 个完成稿、${plan.draft.length} 个草稿**。\`listed:false\` 与稿件质量无关，完成稿也可以继续不列入目录。

## 观察范围与判断方法

- 对照设计原则、专题说明、学习数据及控制器归属；逐项查看 ${owners.length} 个独立主题的真实画面和一次条件／进度／选择对照，另查看 ${children.length} 个兼容入口实际进入的章节。过渡中的截图只作为中间态，不能当作最终结果。
- 绘图重点是主体、部位、方向、尺度、对象身份和变化能否看清；合适的二维图可以达到完成稿标准。整体完成度还包括问题、因果顺序、有意义的对照、模型条件、来源与可读的操作反馈。
- 本轮不是对每条外部资料、每个科学参数和所有分支重新进行独立科学审校。已有科学限定条件继续适用；表中的“写得完整”不表示新的科学结论已获验证。

## 值得保留的做法

地月让两个观察位置共享同一月面；影子和浮力能围绕一个变量做对照；叶片保留对象与微观区室身份；开花植物明确不同物种间的接力；程序与消息传输把“动作发生”与“目标完成”分开。它们适合作为后续专题收敛的参考。

主要短板集中在两类：综合专题的多层入口和条件竞争观察注意力；部分早期独立演示的主对象太小，关键过程需要依赖旁边的长段文字。优先处理太阳系、四季、风的层级，细胞和沙粒的画面尺度，以及恒星、电池、AI 的主线组织。

## 完成稿

${heading}
${table('complete')}

## 草稿

草稿表的“下一步”是重新评为完成稿前应优先完成的事项。高质量模型或丰富资料可以保留，界面整理后仍需检查实际学习路径。

${heading}
${table('draft')}

## 整合入口

兼容入口不是另一个独立项目。它们继续进入相应章节；状态随所属主题一致，避免同步时把同一工作区拆成互相矛盾的成熟度。

| 入口 | 所属主题 | 稿件状态 |
| --- | --- | --- |
${children.map(entry=>`| \`${entry.id}\` | \`${entry.parentTopic}\` | ${entry.review.status==='complete'?'完成稿':'草稿'} |`).join('\n')}

## 状态与同步

\`status:published\` 保留现有可访问路由；\`review.status:complete|draft\` 只表示稿件成熟度。调整成熟度不删除旧链接。本地预览保留两种稿件，目录和条目标题显示状态。

- \`npm run review:prepare\`：从登记表更新本报告；不要只改生成报告。
- \`npm run review:check\`：检查每个条目的状态、理由、整合关系和报告是否同步。
- \`npm run review:plan\`：输出完成稿／草稿的机器可读清单。
- \`npm run build:sync\`：调用支持 \`--complete-only\` 的 Wiki Reader，只打包完成稿内容；草稿旧 URL 输出简短“整理中”页，正文、封面与独占演示不进入该产物。

完成稿仍可消费其他目录里共享的模型；同步选择的是内容入口，不是按文件夹粗暴删代码。\`dist/\` 为完整本地检查输出，\`sync-dist/\` 为完成稿同步输出，均由同一个 Reader 生成。宿主的旧同步脚本尚未切换到这个 Reader 产物；本轮没有执行宿主同步或线上部署。
`;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
  const wiki=JSON.parse(await readFile(resolve(root,'wiki.json'),'utf8'));
  const plan=reviewPlan(wiki),report=reviewReport(wiki),path=resolve(root,'docs/editorial-review.md');
  if(process.argv.includes('--json'))console.log(JSON.stringify(plan,null,2));
  else if(process.argv.includes('--check')){
    if(await readFile(path,'utf8').catch(()=>null)!==report)throw new Error('Editorial report is stale; run npm run review:prepare.');
    console.log(`Editorial review: ${plan.complete.length} complete, ${plan.draft.length} draft; all reasons and inherited statuses checked.`);
  }else{await writeFile(path,report);console.log('Updated docs/editorial-review.md');}
}
