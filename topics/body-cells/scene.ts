import { clamp,muscleState,nerveSignal,barrierParticle,MUSCLE_APPARATUS,DEFAULT_MUSCLE,FORCE_ARROW_SCALE,type MuscleOptions,type CellKind } from './model.ts';
type Translator=(source:string)=>string;
const defs=`<defs>
  <linearGradient id="background" x2=".4" y2="1"><stop stop-color="#fafbf6"/><stop offset="1" stop-color="#e9ede5"/></linearGradient>
  <radialGradient id="epithelial" cx=".35" cy=".2" r=".85"><stop stop-color="#f5dcd1"/><stop offset=".6" stop-color="#e2bdb3"/><stop offset="1" stop-color="#c99e9e"/></radialGradient>
  <radialGradient id="cell-nucleus" cx=".32" cy=".28" r=".8"><stop stop-color="#c0acc6"/><stop offset=".6" stop-color="#927d9d"/><stop offset="1" stop-color="#776581"/></radialGradient>
  <linearGradient id="muscle" x2="0" y2="1"><stop stop-color="#b97c80"/><stop offset=".16" stop-color="#e4b6ac"/><stop offset=".4" stop-color="#edc6b9"/><stop offset=".72" stop-color="#d09892"/><stop offset="1" stop-color="#ab6c77"/></linearGradient>
  <linearGradient id="myelin" x2="0" y2="1"><stop stop-color="#ad9a78"/><stop offset=".17" stop-color="#ddcfa9"/><stop offset=".42" stop-color="#f3e9ca"/><stop offset=".7" stop-color="#d8c69e"/><stop offset="1" stop-color="#ae9672"/></linearGradient>
  <radialGradient id="soma" cx=".3" cy=".24" r=".9"><stop stop-color="#eee1c6"/><stop offset=".62" stop-color="#d7bf9c"/><stop offset="1" stop-color="#b99d80"/></radialGradient>
  <linearGradient id="connective" x2="0" y2="1"><stop stop-color="#ecdfcd"/><stop offset=".5" stop-color="#d2c3aa"/><stop offset="1" stop-color="#b4a58d"/></linearGradient>
  <filter id="cell-shadow" x="-20%" y="-25%" width="140%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#665751" flood-opacity=".1"/></filter>
</defs>`;
const text=(x:number,y:number,value:string,size=18)=>`<text x="${x}" y="${y}" text-anchor="middle" fill="#504c45" font-size="${size}" font-weight="${size>16?650:450}">${value}</text>`;
function epithelial(progress:number,t:Translator){
  // A continuous, layered epidermis: flatter at the surface, taller at its base.
  // These profiles illustrate differentiation; they do not count real tissue layers.
  const rows=[{y:211,h:14},{y:243,h:23},{y:286,h:25},{y:334,h:27},{y:385,h:27}];
  const layers=rows.map(({y,h},row)=>Array.from({length:11},(_,col)=>{
    const x=23+col*91+(row%2?43:0),lean=((col*7+row*3)%9)-4;
    const outline=`M-47 ${-h*.5}Q-35 ${-h-3} -8 ${-h}Q22 ${-h-2} 43 ${-h*.55}Q52 0 43 ${h*.65}Q19 ${h+3} -8 ${h}Q-35 ${h+2} -47 ${h*.45}Q-53 0 -47 ${-h*.5}Z`;
    return `<g transform="translate(${x} ${y}) rotate(${lean/3})"><path d="${outline}" fill="url(#epithelial)" stroke="#b58e91" stroke-width="1.35"/>
      <path d="M-36 ${-h*.5}Q-15 ${-h*.82} 17 ${-h*.62}" fill="none" stroke="#fff4e8" stroke-width="1.4" opacity=".7"/>
      ${row===0?`<path d="M-29 -2Q-4 -6 28 -1M-23 5Q0 2 34 5" fill="none" stroke="#bb9690" stroke-width=".7" opacity=".5"/>`:`<ellipse cx="${lean}" cy="1" rx="${row===1?18:13}" ry="${row===1?5:row===4?15:11}" fill="url(#cell-nucleus)" stroke="#927889" stroke-width=".7"/><path d="M${lean-7} -3q5-5 12-1m-11 8q5 3 11-1" stroke="#d9c6d7" stroke-width=".8" fill="none" opacity=".65"/><circle cx="${lean+4}" cy="3" r="2.1" fill="#73617b" opacity=".7"/>`}
    </g>`;
  }).join('')).join('');
  const grains=Array.from({length:8},(_,i)=>{const s=barrierParticle(i,progress);return `<g transform="translate(${s.x} ${s.y}) rotate(${i*47})"><ellipse rx="8" ry="5.5" fill="#8ba091" stroke="#667e73" stroke-width="1.2"/><ellipse cx="-2" cy="-1" rx="3.5" ry="1.6" fill="#c5d2bf" opacity=".75"/><path d="M-7-3l-3-2m14 1 3-2M-3 4l-1 3" stroke="#667e73" stroke-width=".8" stroke-linecap="round"/></g>`;}).join('');
  const surface='M35 193Q490 172 945 193V411Q490 396 35 411Z';
  return `${text(490,68,t('皮肤表面：层层相接的保护'))}<defs><clipPath id="epidermis-section"><path d="${surface}"/></clipPath></defs>
    <path d="${surface}" fill="#dcb9b0"/><g clip-path="url(#epidermis-section)">${layers}</g>
    <path d="M35 193Q490 172 945 193" stroke="#c1a59a" stroke-width="5" fill="none"/><path d="M35 190Q490 169 945 190" stroke="#f4e8d9" stroke-width="1.7" fill="none"/>
    ${grains}<path d="M35 411Q490 396 945 411" stroke="#b8aa94" stroke-width="3" fill="none"/>
    <g stroke="#bcb59e" stroke-opacity=".4" stroke-width="1.2" fill="none">${Array.from({length:6},(_,i)=>`<path d="M32 ${430+i*8}C188 ${411+i*5} 273 ${469-i*6} 478 ${438+i*4}S769 ${419+i*9} 948 ${443+i*5}"/>`).join('')}</g>
    ${text(229,510,t('表面细胞逐渐角化'),16)}${text(737,510,t('深处有活细胞持续更新'),16)}`;
}
function muscle(progress:number,t:Translator,options:MuscleOptions){
  const s=muscleState(progress,options),width=s.length,a=MUSCLE_APPARATUS;
  const height=43*Math.sqrt(s.restLength/width);
  // Keep the same repeat units and nuclei as the fiber shortens and relaxes.
  const bands=Array.from({length:3},(_,i)=>`<g transform="translate(${s.left} ${174+i*49+(43-height)/2})"><rect data-muscle-fibre="${i}" width="${width}" height="${height}" rx="20" fill="url(#muscle)" stroke="#a5666c"/>
    ${Array.from({length:34},(_,j)=>`<path data-muscle-band="${i}-${j}" d="M${13+(j+.5)*(width-26)/34} 4v35" stroke="#905a64" stroke-opacity=".34" stroke-width="${(width-26)/34*.24}"/><path d="M${13+(j+.7)*(width-26)/34} 4v35" stroke="#ffe0c0" stroke-opacity=".5" stroke-width="1.6"/>`).join('')}
    <g stroke="#985f6b" stroke-width=".6" opacity=".28">${[.3,.48,.66,.8].map(f=>`<path d="M16 ${height*f}H${width-16}"/>`).join('')}</g>
    ${[.12,.48,.84].map(f=>`<g transform="translate(${width*f} ${i%2?height-7:7})"><ellipse rx="12" ry="3.7" fill="url(#cell-nucleus)" stroke="#9e798a" stroke-width=".7"/><path d="M-7-1q6-2 13 1" stroke="#d6bccc" stroke-width=".8" fill="none"/></g>`).join('')}<path d="M22 8H${width-24}" stroke="#ffe3cd" stroke-width="1.3" opacity=".65"/></g>`).join('');
  const left=490-s.sarcomereSpan/2,right=490+s.sarcomereSpan/2;
  const spring=Array.from({length:25},(_,i)=>{
    const x=s.junction+8+(a.springAnchor-s.junction-16)*i/24;
    return `${i?'L':'M'}${x} ${241+(i===0||i===24?0:i%2?8:-8)}`;
  }).join(' ');
  const force=(id:string,value:number,direction:number,y:number,color:string)=>{
    const end=s.junction+direction*value*FORCE_ARROW_SCALE;
    return `<g data-force="${id}" data-force-value="${value}" opacity="${value>1e-8?1:0}"><path d="M${s.junction} ${y}H${end}" stroke="${color}" stroke-width="3"/><path d="M${end-direction*7} ${y-5}L${end} ${y}L${end-direction*7} ${y+5}" fill="none" stroke="${color}" stroke-width="2.5"/></g>`;
  };
  const clampArt=s.mode==='isometric'?`<g data-endpoint-clamp="true"><rect x="${s.junction-12}" y="221" width="24" height="40" rx="4" fill="#8b9697" stroke="#53686e" stroke-width="2"/><path d="M${s.junction} 261V336M${s.junction-28} 336H${s.junction+28}" stroke="#758389" stroke-width="5"/><path d="M${s.junction-23} 339l-6 7m18-7-6 7m18-7-6 7m18-7-6 7" stroke="#758389" stroke-width="1.5"/></g>`:'';
  return `<g data-muscle-mode="${s.mode}" data-muscle-length="${s.length}" data-muscle-tension="${s.tension}">${text(490,46,t('肌肉、连接组织与外部弹性负载'))}
    <path d="M130 191V290M122 191v99" stroke="#758389" stroke-width="5"/><path d="M118 196l-12 11m12 9-12 11m12 9-12 11m12 9-12 11m12 9-12 11M910 203v76m8-76v76" stroke="#758389" stroke-width="2"/>
    <path data-tendon="left" d="M130 238C160 238 165 174 185 174L185 315C164 315 160 244 130 244Z" fill="url(#connective)" stroke="#a59883" stroke-width="1.5"/>
    <path data-tendon="right" d="M${s.right} 174C${s.right+18} 174 ${s.junction-10} 238 ${s.junction} 238V244C${s.junction-10} 244 ${s.right+18} 315 ${s.right} 315Z" fill="url(#connective)" stroke="#a59883" stroke-width="1.5"/>
    <g stroke="#9c907b" stroke-width=".75" fill="none" opacity=".5">${[0,1,2,3,4].map(i=>`<path d="M132 241Q159 241 183 ${184+i*29}M${s.right} ${184+i*29}Q${s.junction-18} 241 ${s.junction-1} 241"/>`).join('')}</g>
    <g filter="url(#cell-shadow)">${bands}</g>
    <path data-load-spring="true" d="M${s.junction} 241H${s.junction+8}${spring.replace(/^M/,'L')}L${a.springAnchor} 241" fill="none" stroke="#56817c" stroke-width="${2+s.load}" stroke-linejoin="round"/>
    ${clampArt}<circle data-force-junction="true" cx="${s.junction}" cy="241" r="4" fill="#eff3e4" stroke="#657779" stroke-width="2"/>
    <path d="M${s.junction} 150V214" fill="none" stroke="#9aaca5" stroke-dasharray="3 5"/>
    ${force('muscle',s.tension,-1,92,'#a76269')}${force('spring',s.springForce,1,116,'#56817c')}${force('clamp',s.clampForce,1,140,'#586b84')}
    <path d="M${s.left} 153H${s.right}" stroke="#8c7469" stroke-dasharray="4 6"/>
    ${text(137,330,t('固定端'),15)}${text(850,316,t('外部弹簧'),15)}
    <circle cx="${(s.left+s.right)/2}" cy="241" r="17" fill="none" stroke="#b39363" stroke-width="1.5" stroke-dasharray="4 4"/><path d="M${(s.left+s.right)/2-12} 260L445 356M${(s.left+s.right)/2+12} 260L535 356" stroke="#ac9181" stroke-dasharray="4 5"/>
    <rect x="168" y="363" width="644" height="120" rx="20" fill="#f7f6ed" stroke="#cfd3c5"/>
    <path data-z-discs="true" d="M${left} 382v81M${right} 382v81" stroke="#786479" stroke-width="5"/>
    ${[398,420,442].map(y=>`<path d="M${left} ${y}h178M${right} ${y}h-178" stroke="#c17e6b" stroke-width="4"/><path d="M385 ${y+8}H595" stroke="#9c8ba4" stroke-width="8" stroke-linecap="round"/>`).join('')}
    ${text(490,516,t('放大同一纤维的代表肌节：细丝长度不变'),16)}</g>`;
}
function neuron(progress:number,t:Translator){
  const s=nerveSignal(progress);
  // Curved, tapering dendrites branch away from the single axon.
  const dendrites=[
    ['M207 226C177 208 167 186 162 157S153 118 132 96','M162 157C139 153 123 138 111 117M155 134C171 123 176 104 173 88'],
    ['M194 240C167 236 140 224 117 205S91 168 66 169','M117 205C99 210 80 206 61 195M92 181C95 165 88 149 77 138'],
    ['M188 259C156 258 142 272 115 278S83 274 58 285','M115 278C108 295 92 306 77 308M88 278C76 267 63 265 48 267'],
    ['M203 279C174 300 173 318 153 343S135 372 110 384','M153 343C130 339 113 347 99 361M139 365C146 385 139 399 130 413'],
    ['M225 281C232 312 249 326 253 354S251 391 264 411','M253 354C272 360 282 376 287 392M251 332C264 321 267 309 264 298'],
    ['M231 216C244 194 245 175 241 150S236 120 246 99','M241 150C260 142 269 126 272 110M239 130C223 123 217 108 219 94'],
  ];
  const branches=dendrites.map(([stem,twigs])=>`<path d="${stem}" fill="none" stroke="#b39a7e" stroke-width="7" stroke-linecap="round"/><path d="${stem}" fill="none" stroke="#e3d2b6" stroke-width="3.8" stroke-linecap="round"/><path d="${twigs}" fill="none" stroke="#b6a087" stroke-width="2.3" stroke-linecap="round"/>`).join('');
  const sheath=Array.from({length:7},(_,i)=>`<g transform="translate(${335+i*67} 240)"><rect width="56" height="29" rx="14.5" fill="url(#myelin)" stroke="#ad9a7c" stroke-width="1.1"/>
    <path d="M8 6Q4 15 8 23M13 4Q9 15 13 25M43 4q4 11 0 21M48 6q4 9 0 17" stroke="#b39f7c" stroke-width=".9" fill="none" opacity=".65"/>
    <path d="M16 7H39" stroke="#fff5d9" stroke-width="2" stroke-linecap="round" opacity=".75"/>
    <ellipse cx="26" cy="26" rx="7" ry="2.5" fill="#9c8a90" opacity=".7"/></g>`).join('');
  const spark=progress>0&&progress<.8?`<ellipse data-signal="axon" cx="${s.x}" cy="254" rx="17" ry="14" fill="#e7b95c" opacity=".65"/><circle cx="${s.x}" cy="254" r="4.5" fill="#fff2bd" stroke="#d3ab5c"/>`:'';
  const soma='M191 227C192 211 204 203 217 210C228 213 239 200 250 217C260 229 254 242 265 252C278 264 260 278 246 279C231 279 223 296 210 289C196 283 200 274 186 269C171 263 174 245 186 238Z';
  return `${text(490,52,t('神经元：结构连得远，信号传得快'))}<g filter="url(#cell-shadow)">${branches}
    <path d="M253 254H828q18 0 23-15m-23 15 23 14" stroke="#ad9276" stroke-width="9" stroke-linecap="round" fill="none"/><path d="M266 252H822" stroke="#e7d2b3" stroke-width="3" fill="none"/>
    ${sheath}<path d="${soma}" fill="url(#soma)" stroke="#ab927e" stroke-width="1.5"/>
    <path d="M190 239q4-23 23-22m26 2q14 4 13 19M188 259q0 13 15 16" fill="none" stroke="#f7edd5" stroke-width="1.4" opacity=".6"/>
    <ellipse cx="218" cy="250" rx="22" ry="25" fill="url(#cell-nucleus)" stroke="#927b93" stroke-width="1.1"/>
    <path d="M209 234q12-5 18 4m-22 10q9-8 23 0m-24 9q11 8 22 2" stroke="#d3bfd1" stroke-width="1" fill="none" opacity=".65"/>
    <circle cx="222" cy="248" r="6" fill="#816c8a"/><path d="M199 226q8-6 16-3m24 47q10-2 13-9" stroke="#a99085" stroke-width="1.4" fill="none"/>
    <g fill="#d3b996" stroke="#ab927e" stroke-width="1"><ellipse cx="853" cy="238" rx="9" ry="6" transform="rotate(-25 853 238)"/><ellipse cx="853" cy="269" rx="9" ry="6" transform="rotate(25 853 269)"/></g>
    <g fill="#f6e8cc" opacity=".8"><circle cx="851" cy="236" r="1.6"/><circle cx="856" cy="239" r="1.5"/><circle cx="851" cy="267" r="1.6"/><circle cx="856" cy="270" r="1.5"/></g></g>
    ${spark}<path d="M888 211C877 230 878 274 888 297" stroke="#b39d92" stroke-width="8" fill="none"/><path d="M903 217C894 235 895 274 903 291" stroke="#e1d4bd" stroke-width="6" fill="none"/>
    <g stroke="#a58d83" stroke-width="1.7" fill="none"><path d="M882 240h5m-6 14h5m-3 14h5"/></g>
    ${Array.from({length:5},(_,i)=>`<circle cx="${853+s.transmitter*28}" cy="${236+i*8}" r="2.6" fill="#ac8357" opacity="${s.transmitter>0?1:0}"/>`).join('')}
    <circle cx="901" cy="254" r="16" fill="#e5ba59" opacity="${s.response*.55}"/>
    <g data-scene-labels>${text(214,443,t('细胞体'),16)}${text(520,397,t('有髓鞘的轴突'),16)}${text(843,397,t('突触'),16)}<path d="M217 420v-110M520 374v-100M843 374l23-83" fill="none" stroke="#acaa98" stroke-width="1" stroke-dasharray="3 5"/>
    ${text(490,510,t('信号沿膜传播，再把信息传给下一个细胞'),16)}</g>`;
}
export function renderCell(kind:CellKind,progress:number,t:Translator,options:MuscleOptions=DEFAULT_MUSCLE){
  return defs+`<rect width="980" height="550" fill="url(#background)"/>`+(kind==='barrier'?epithelial(clamp(progress),t):kind==='muscle'?muscle(clamp(progress),t,options):neuron(clamp(progress),t));
}
