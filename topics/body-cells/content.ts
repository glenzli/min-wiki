import { t } from './i18n.ts';
import { muscleState, type MuscleOptions } from './model.ts';
export const explorations = [
{id:"barrier",name:t("保护表面"),subject:t("皮肤表皮"),observe:t("观察层层相接的细胞。外面的标记遇到完整表面停住了；屏障并不是只有一颗细胞在工作。"),stages:[{title:t("细胞连成层"),body:t("皮肤表皮里，许多细胞相接排列。靠外的细胞逐渐扁平、角化，参与形成保护屏障。")},
{title:t("外来颗粒遇到屏障"),body:t("这里选定的外来颗粒被完整表面挡住。皮肤不是一堵完全不透任何东西的墙，但能减少许多外来物进入与水分流失。")},
{title:t("深处不断更新"),body:t("表皮深处有细胞分裂并向表面补充。最外层角化细胞没有细胞核，不能把每一层都当成一样的活细胞。")}]},
{id:"muscle",name:t("让身体运动"),subject:t("骨骼肌纤维"),observe:t("先找到两端的连接，再比较允许缩短和固定长度。停在同一激活进度，观察长度、外部弹簧与力箭头；回长要看外面的拉力。"),stages:[{title:t("细长的肌肉纤维"),body:t("一条骨骼肌纤维就是一个很长的细胞，通常有多个细胞核。里面排着许多参与收缩的结构。")},
{title:t("内部细丝相对滑动"),body:t("收到适合的信号后，钙离子参与调节，肌动蛋白与肌球蛋白相互作用。这里仅把相对滑动放大给你看。")},
{title:t("放松，回到较长状态"),body:t("收缩需要能量；停止激活后，肌纤维可以放松。实际恢复长度还受到其他肌肉、弹性和外部负荷的影响。")}]},
{id:"neuron",name:t("传递信息"),subject:t("神经元"),observe:t("沿长长的轴突追踪亮点，再看突触附近的小点。亮点是信号位置标记，并不是在神经里奔跑的小球。"),stages:[{title:t("许多分支接收信息"),body:t("神经元有细胞体和突起。很多树突参与接收信息，轴突可以把信号传到较远的位置。")},
{title:t("信号沿膜传开"),body:t("离子通过膜上的通道，形成沿轴突传播的电变化。图中髓鞘来自其他细胞，能帮助某些轴突更快传导。")},
{title:t("把信息交给下一站"),body:t("在这个化学突触例子中，末梢释放递质。递质跨过很窄的间隙，影响下一个细胞，而不是两条神经直接接成一根水管。")}]}
] as const;

export const muscleControls = {
  title:t('比较同一激活阶段的两种约束'),
  shortening:t('允许缩短'), isometric:t('固定长度'),
  load:t('外部弹簧的软硬'), soft:t('较软'), stiff:t('较硬'),
  stiffness:t('相对刚度'),
  forces:t('看连接与拉力'), whole:t('回到肌肉全景'),
  forceView:t('同一装置的右肌腱、连接点、弹簧与固定夹具受力放大图'),
  note:t('两次对照从各自相同的预拉起点开始。改约束会暂停并保留激活进度，不表示真实装置瞬间切换。'),
  legend:t('连接点受力：玫瑰箭头向左是肌肉总张力；绿色向右是外部弹簧力；蓝灰向右是固定夹具的反力。箭头长度使用同一相对力标尺。'),
  scale:t('上方是带连接组织的肌肉与装置，下方是同一纤维中的代表肌节；放大比例不同。'),
};
/** Explanation and readout project the same force/geometry state as the SVG. */
export function muscleExplanation(progress:number, options:MuscleOptions) {
  const s=muscleState(progress,options), isometric=s.mode==='isometric';
  const title=s.phase==='rest'?t('找到两端的连接与预拉')
    :isometric?s.phase==='pull'?t('长度不变，总张力增加'):t('长度不变，总张力降低')
    :s.phase==='pull'?t('缩短，同时拉伸外部弹簧'):t('激活减弱，外部弹簧拉回');
  const child=s.phase==='rest'?t('左端固定，肌肉通过连接组织连到右边的弹簧。弹簧已经轻轻拉着它，所以还没激活时也有预张力。')
    :isometric?t('右端夹具把长度锁住，肌肉仍在产生张力。看看向右的夹具反力：没有缩短，不等于没有用力。')
    :s.phase==='pull'?t('肌肉拉着连接点向左，外面的弹簧被拉长。把弹簧调硬：同样的激活下，缩短更少，总张力更大。')
    :t('激活正在减弱，外部弹簧把连接点向右拉回。放松不是肌肉主动向外推；这里的回长依赖看得见的外部作用。');
  const question=isometric?t('两个端点不移动，为什么力箭头仍会变化？'):t('把弹簧调软，再停在同一进度：缩短量怎样变了？');
  const readout=t('相对读数：长度为起点的 {{length}}%；总张力 {{tension}}；外部弹簧力 {{spring}}；夹具反力 {{clamp}}。',{
    length:(100*s.length/s.restLength).toFixed(1),tension:s.tension.toFixed(2),spring:s.springForce.toFixed(2),clamp:s.clampForce.toFixed(2),
  });
  const academic=isometric
    ?t('固定夹具锁住本模型的肌肉端点；不伸长的肌腱只传力。激活使有效参考长度变短，总张力增大。外部弹簧长度不变，所以新增的平衡力由夹具提供。真实肌肉与肌腱都有顺应性：整体等长并不保证每个肌节都完全不动。')
    :t('允许右端移动时，每个观察状态都满足准静态平衡：肌肉总张力等于外部弹簧力。激活缩短有效参考长度，右端移向左侧；弹簧伸长而拉力增加。这个负载不是恒力，不是等张收缩；调硬改变的是弹簧刚度，不是物体重量。');
  const formula=isometric?'T = kₘ(L − L*) = Fₑ + R; L = Lᵢ':'T = kₘ(L − L*) = Fₑ; Fₑ = kₑ(s − s₀)';
  return { state:s,title,child,question,readout,academic,formula,
    terms:t('L 是本模型的肌肉长度，L* 是随激活改变的有效参考长度；Lᵢ 是预拉起点的长度。T 为总张力，Fₑ 为外部弹簧力，R 为夹具反力；kₘ、kₑ 为教学刚度，s−s₀ 为外部弹簧伸长。'),
    boundary:t('这是慢速、无惯性的有效弹性收缩模型，使用屏幕长度与相对力单位；参数不是生理测量。起点已有被动预拉，但不把总张力拆成真实主动与被动贡献。未求解横桥、肌腱伸长、长度与速度依赖、疲劳或主动延长；最硬档也不代表过载。'),
  };
}
