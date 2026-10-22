import type { SceneStudy } from '../../src/platform/sceneReading.ts';

const w = (zh: string, en: string) => ({ zh, en });
const charging = { title: 'NWS · Thunderstorm electrification', url: 'https://www.weather.gov/safety/lightning-science-electrification' };
const flash = { title: 'NWS · Negative cloud-to-ground flash', url: 'https://www.weather.gov/safety/lightning-science-negative-charged-flash' };
const thunder = { title: 'NWS · Thunder', url: 'https://www.weather.gov/safety/lightning-science-thunder' };
const safety = { title: 'NWS · Lightning safety', url: 'https://www.weather.gov/safety/lightning' };
const laboratory = { title: 'Saunders et al. · Cloud conditions and graupel/ice charge transfer', url: 'https://doi.org/10.1256/QJ.05.218' };

export const studies: readonly SceneStudy[] = [
  {
    title: w('先有混合相云，才有这条起电路径', 'This charging pathway begins in a mixed-phase cloud'),
    child: w('云里不只有水滴。小冰晶、较大的霰和过冷水滴受到气流带动，运动方式不同，才有机会相遇。先跟住一对带枝的冰晶和圆粒状的霰。', 'A cloud contains more than droplets. Small ice crystals, larger graupel and supercooled droplets move differently in an updraft and can meet. Follow one branching crystal and one rimed graupel particle.'),
    theory: w('霰是冰粒收集并冻结过冷水滴后形成的较松软粒子。雷暴主要起电区常有快速上升气流、过冷水滴、冰晶与霰共存。小冰晶较容易被上升气流带走，较大霰可悬留或相对下落；两者的相对运动增加接触机会。水滴参与这些环境与结凇过程，但图中没有把每次碰撞都当成一次闪电。', 'Graupel forms as supercooled droplets collect and freeze on ice, producing a relatively soft rimed particle. The main storm charging region commonly combines strong updrafts, supercooled droplets, ice crystals and graupel. Small ice is more readily carried upward, while larger graupel may be suspended or fall relative to it. Their different motions allow contact. Droplets contribute to this environment and riming; the view does not turn each contact into a flash.'),
    evidence: w('NWS 的主要起电区示意把气流、混合相粒子和相对运动连在一起。三维局部用于分辨运动与遮挡；它不是探测器拍到的云内体积，也没有测量粒径。', 'The NWS charging explanation connects updrafts, mixed-phase particles and their relative motion. This local 3D view makes motion and depth legible; it is not an observed cloud volume or a particle-size measurement.'),
    limits: w('冰晶枝形、霰表面、水滴与气流线分别放大。这里是开放的云内空气区域，没有容器或云壳；位置与进度没有米或秒的标定。外景云中的相同暖冷电荷编码仍然适用。', 'Crystal branches, rimed surfaces, droplets and airflow are separately enlarged. This is an open region of cloud air, without a vessel or shell; positions and progress are not calibrated in meters or seconds. The exterior retains the same warm and cool charge coding.'),
    sources: [charging, laboratory],
  },
  {
    title: w('接触交换电荷，运动差异扩大分离', 'Contact transfers charge; different motion separates it'),
    child: w('先接触，再分开。这里选的一种起电情形让小冰晶带正电、霰带负电；冰晶升得更高，霰留在中下部。颜色和正负号帮助追踪，真实电荷看不见。', 'Contact comes before separation. In this selected charging case, ice becomes positive and graupel negative. Ice moves higher while graupel remains lower. Colors and signs help us follow charge; charge itself is invisible.'),
    theory: w('非感应碰撞起电与粒子输送共同形成电荷分区。本例选用 NWS 教学中常见的上正、中下负结构，并在外景保留小型底部正区及地面感应电荷。真实雷暴的起电细节、极性和层次更复杂；碰撞不是对所有温度、含水量都适用的固定正负规则。较弱分离对照只保留较小空间分离，不从符号数量推算库仑、电场或闪电概率。', 'Non-inductive contact charging and particle transport work together to form charge regions. This case selects the common NWS upper-positive and mid/lower-negative structure; the exterior also retains a small lower positive pocket and induced ground charge. Real charging details, polarity and layers are more complex. Contact does not impose one polarity rule for every temperature or water content. The weaker case retains less spatial separation, without deriving coulombs, field strength or flash probability from symbol counts.'),
    evidence: w('NWS 将碰撞转移、上升输送、霰的不同运动和地面感应分开说明。图中稳定的粒子身份与区域符号对应这一因果顺序，不是实测电子轨迹。', 'NWS distinguishes charge transfer, upward transport, different graupel motion and induction at the ground. Stable particle identities and region signs follow that causal sequence rather than measured electron paths.'),
    limits: w('“持续分离”和“较弱分离”是选定的定性案例，不是普适的击穿阈值，也不能判断一朵真实云是否会放电。云内局部仅呈现主分离机制，底部正区在外景中示意。', 'Sustained and weaker separation are selected qualitative cases, not universal breakdown thresholds or a test for whether a real cloud will discharge. The interior shows the main separation mechanism; the small lower positive pocket is shown in the exterior.'),
    sources: [charging, laboratory],
  },
  {
    title: w('负地闪：先导分支与向上连接', 'A negative ground flash: branching leader and upward connection'),
    child: w('把视线带回同一朵云下面。微弱先导一步步向下分叉；靠近地面时，向上的连接通道才逐渐伸出。还没接通，不能提前画出明亮回击。', 'Return to the space below the same cloud. A faint leader branches downward in steps. An upward connecting channel develops as it nears the ground. The bright return stroke cannot begin before they connect.'),
    theory: w('强局部电场可支持先导通过电离和加热发展导电通道。负地闪的分步先导通常分叉，地面较高物体附近可出现向上的正连接通道。连接之前两端存在间隙；只有建立连续通道后才进入本页回击阶段。固定支路并不表示每个支路都接地；没有接通的支路不新增地面落点。', 'A strong local electric field can support a leader that develops a conducting channel through ionization and heating. Negative stepped leaders branch, and upward positive connecting channels may develop near tall grounded objects. A gap remains until attachment; only a continuous path admits this view’s return stroke. The fixed branches do not all reach ground, and unattached branches create no extra ground contacts.'),
    evidence: w('高速摄影可以分辨肉眼难以分开的先导和回击。NWS 的负地闪资料解释了分步发展、向上连接与接通过程；这三件事不能合成一根同时亮起的线。', 'High-speed photography separates leader and return-stroke development that the unaided eye cannot resolve. NWS describes stepping, upward connection and attachment; these cannot be replaced by a line that lights everywhere at once.'),
    limits: w('通道来自稳定的教学几何，没有求解电场、击穿或真实先导速度。塔仅用作同一接通锚点，不提供户外安全范围或建筑防雷设计。', 'The stable teaching path does not solve electric fields, breakdown or real leader speed. The tower is an attachment anchor, without an outdoor safety radius or building lightning-protection design.'),
    sources: [flash, charging],
  },
  {
    title: w('回击沿接通的原通道向上发展', 'The return stroke develops upward along the connected path'),
    child: w('现在两端在塔上方同一点接通。明亮前沿沿已经建立的通道向云发展，空气很快受热。回拖一点，接通前的通道仍然微弱；它们始终是同一路径。', 'Both ends now meet at the same point above the tower. A bright front develops toward the cloud along the established path and rapidly heats the air. Seek back slightly: before attachment, that same path remains faint.'),
    theory: w('回击的强电流与发光前沿沿已连接的先导通道迅速向上发展。这是前沿传播方向，不表示所有电荷或空气都以同一方向、同一速度运动。强烈加热使通道周围空气快速膨胀，产生压力扰动；雷声已经在这次放电中产生，不是等到远处观察者听见时才开始。', 'The strong current and luminosity front develop rapidly upward along the attached leader channel. This is a propagating front, not a claim that all charge or air moves in one direction at one speed. Intense heating rapidly expands air around the channel and produces pressure disturbances. Thunder is generated during the discharge, rather than starting when a distant observer hears it.'),
    evidence: w('NWS 的负地闪与雷声说明分别支持沿通道发展的回击、空气快速受热和雷声的产生。外景材料只平顺亮起一次，并跟随同一回击状态衰减。', 'The NWS negative-flash and thunder explanations support return-stroke propagation, rapid air heating and sound production. Exterior materials brighten smoothly once and decay with that same return-stroke state.'),
    limits: w('本页只展示一次回击，省略可能重复利用通道的后续回击。亮度是受光插画，不是电流、温度或照度读数；播放刻意大幅慢放。', 'One return stroke is shown, omitting later strokes that may reuse a channel. Brightness is illustrative lighting rather than current, temperature or illuminance data. Playback is deliberately slowed greatly.'),
    sources: [flash, thunder],
  },
  {
    title: w('同一次放电，光和声音到达时间不同', 'One discharge, different arrival times for light and sound'),
    child: w('闪光几乎立刻到达室内，声音还在传播。固定气温，把距离加倍，再比较到达时间；也可以固定距离，只改变气温。圆弧帮助观察，雷声的来源其实是整条通道周围的空气。', 'The flash reaches the indoor observer almost immediately while sound is still traveling. Hold temperature fixed and double distance; then hold distance fixed and change temperature. The arc is a visual guide; real thunder comes from air around the whole channel.'),
    theory: w('干空气中声速可用气温的一阶近似估计，延迟为声音传播时间减去光传播时间。在本页范围内光传播时间极短；距离加倍时延迟加倍，气温升高时近似声速增大。真实通道各段离观察者不同远，风、温度分层与地形也会改变传播，因而雷声可能持续成隆隆声。', 'A first-order temperature approximation estimates dry-air sound speed. Delay is sound travel time minus light travel time. Light travel time is tiny here; doubling distance doubles this model’s delay, while warmer air increases its approximate sound speed. Real channel segments lie at different distances, and wind, temperature layering and terrain alter propagation, helping thunder rumble.'),
    formula: 'Δt = d/cₛ − d/c ; cₛ ≈ 331.3 + 0.606T',
    terms: w('d 用米，cₛ 与 c 用米每秒，T 用摄氏度，Δt 用秒。温度控制仅用于声速近似，不改变云内起电情境。末段从闪光时刻重新计入传播秒数；页面播放仍压缩等待。', 'd is in meters, cₛ and c in meters per second, T in Celsius and Δt in seconds. Temperature changes only the sound-speed approximation, without changing the charging case. The last segment restarts a travel-time clock at the flash; playback still compresses the wait.'),
    evidence: w('NWS 用光声到达时间差解释估距，并说明长通道各段声音会先后到达。声音速度公式只是本页的干空气近似，没有以圆弧位置推算真实响度。', 'NWS explains distance estimation from the light–sound delay and different arrival times from channel segments. The sound-speed formula is this view’s dry-air approximation; arc position does not measure loudness.'),
    limits: w('外景距离近端经过视觉放大，云、塔、房屋、声波各自采用示意尺度。延迟不预测危险范围；听见雷声就应进入合适的坚固建筑或封闭硬顶车辆，不要在户外验证本模型。', 'Nearby distances are visually enlarged, and cloud, tower, house and wave use illustrative scales. Delay does not predict a hazard radius. If thunder is heard, enter a suitable substantial building or enclosed hard-topped vehicle; do not test the model outdoors.'),
    sources: [thunder, safety],
  },
];

export const limitedStudy: SceneStudy = {
  title: w('对照：接触之后，电荷没有充分分开', 'Comparison: contact without strong spatial separation'),
  child: w('粒子仍会相遇并交换电荷，但这个选定案例的分离较弱。本次演示没有接出负地闪，也没有由它产生的回击与雷声。换回持续分离，保持相同进度比较。', 'Particles still meet and exchange charge, but separation is weaker in this selected case. This demonstration produces no negative ground flash, return stroke or associated thunder. Switch back to sustained separation at the same progress to compare.'),
  theory: w('接触起电与宏观电荷分离不是同一件事。带电粒子若没有足够的差异输送，电荷区域可以较混合。本页用两个定性案例让“碰撞就一定闪电”的误解可被观察；分支选择没有计算起始概率，也没有宣称达到某个普适电场阈值。真实雷暴还可能在云内或其他位置放电。', 'Contact charging and macroscopic charge separation are different. Without sufficiently different transport, charged particles may remain more mixed. Two qualitative cases expose the misconception that every collision must make lightning. The branch does not calculate initiation probability or assert a universal field threshold. A real storm may still discharge within the cloud or elsewhere.'),
  evidence: w('NWS 先说明碰撞与输送形成分区，再说明局部放电和连接过程。这里保留这些必要环节之间的区别，不用一个“安全指数”代替它们。', 'NWS describes contact and transport before local discharge and attachment. This comparison retains the distinction between those steps, without replacing them with a safety index.'),
  limits: w('“未演示地闪”只属于本次教学情境，不是对真实云或户外位置的安全结论。距离、气温和声速关系仍可查看，但本次没有发出的声波，也没有到达倒计时。', 'No ground flash here describes this teaching case, not the safety of a real cloud or outdoor location. Distance, temperature and the sound-speed relation remain available, but no wave or arrival countdown is generated in this case.'),
  sources: [charging, flash, safety],
};
