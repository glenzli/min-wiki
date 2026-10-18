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

本轮采用更严格的编辑与绘图标准，判断记录在唯一登记表 \`wiki.json\` 的 \`review\` 字段。完成稿须同时具备清楚且精细的关键图形、完整的核心解释、有意义的对照和可读的操作路径；任何一项存在阻断性短板就保留草稿，不用模型丰富、长说明或测试数量抵消粗糙绘图。合适的二维示意可以达到标准，不要求所有题都写实或使用三维。这是编辑判断，不等于独立科学审稿或上线批准。

共 ${owners.length} 个独立主题（${listedOwners} 个目录主题、${owners.length-listedOwners} 个保留直达主题），以及 ${children.length} 个整合后的兼容入口。独立主题为 **${plan.owners.complete.length} 个完成稿、${plan.owners.draft.length} 个草稿**；按全部路由计为 **${plan.complete.length} 个完成稿、${plan.draft.length} 个草稿**。\`listed:false\` 与稿件质量无关，完成稿也可以继续不列入目录。

## 观察范围与判断方法

- 本轮重新查看 ${owners.length} 个独立主题的桌面首屏，并在可直接操作的条目查看进度或条件变化；没有把无可操作控件、重启或短暂播放算作完整的条件对照。人体、细胞、叶片及新降稿项目另查看关键局部与阶段，范围见[严格视觉复审记录](strict-visual-review-20261018.md)。
- 主体的形态、组织层次、材料边缘、连接与接触应足以解释当前对象；只有通用色块、机械重复模板或过小的关键结构，不因按钮可用而通过。细节须有依据，不能为了精美编造内部结构或运动。
- 复用未修改模型、内容与既有路由验证；本轮没有重新逐参数、逐来源和遍历所有分支进行独立科学审校。新增绘图另检查中英桌面及390px页面，局部精修不自动提升整题状态。过渡截图只作为中间态。

## 值得保留的做法

地月让两个观察位置共享同一月面；影子和浮力能围绕一个变量做对照；开花植物明确不同物种间的接力；程序与消息传输把“动作发生”与“目标完成”分开。叶片的对象与区室连续性也应保留，但它不能代替组织绘图质量的验收。

这轮有12个原完成稿降为草稿：叶片、花色、变态发育、蚂蚁、鱼鳃、鸭蹼、仙人掌、微生物、洗手、疼痛、味嗅觉和消化。主要问题是生物形态过于概括、关键组织或接触界面偏小，以及不同尺度的精细度不一致。叶片、细胞和消化已精修部分绘图，仍需按表中事项完成整题验收。原有13个草稿继续保留；菜单已收起不表示主线和绘图问题已经解决。

## 完成稿

${heading}
${table('complete')}

## 草稿

草稿表的“下一步”是重新评为完成稿前应优先完成的事项。局部重画后须复核所属学习路径和关键分支，不因单张画面变好而升级整个综合主题。

${heading}
${table('draft')}

## 整合入口

兼容入口不是另一个独立项目。它们继续进入相应章节；状态随所属主题一致，避免同步时把同一工作区拆成互相矛盾的成熟度。

| 入口 | 所属主题 | 稿件状态 |
| --- | --- | --- |
${children.map(entry=>`| \`${entry.id}\` | \`${entry.parentTopic}\` | ${entry.review.status==='complete'?'完成稿':'草稿'} |`).join('\n')}

## 状态与同步

\`status:published\` 保留现有可访问路由；\`review.status:complete|draft\` 只表示稿件成熟度。调整成熟度不删除旧链接。本地预览保留两种稿件：默认目录与缩略图只显示非草稿，草稿集中到独立草稿箱；完成稿不显示状态标签，草稿条目标题保留“草稿”文字。

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
