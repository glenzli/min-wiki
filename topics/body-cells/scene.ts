import { clamp,muscleState,nerveSignal,barrierParticle,MUSCLE_APPARATUS,DEFAULT_MUSCLE,FORCE_ARROW_SCALE,type MuscleOptions,type CellKind } from './model.ts';
type Translator=(source:string)=>string;
const defs=`<defs>
  <linearGradient id="background" x2=".7" y2="1"><stop stop-color="#f4f1e5"/><stop offset="1" stop-color="#e2e4d3"/></linearGradient>
  <radialGradient id="epithelial" cx=".3" cy=".24"><stop stop-color="#f8dcc5"/><stop offset=".68" stop-color="#d8ae9d"/><stop offset="1" stop-color="#b88388"/></radialGradient>
  <radialGradient id="cell-nucleus" cx=".3" cy=".3"><stop stop-color="#b091ae"/><stop offset=".65" stop-color="#836787"/><stop offset="1" stop-color="#695771"/></radialGradient>
  <linearGradient id="muscle" x2="0" y2="1"><stop stop-color="#f1c7b6"/><stop offset=".25" stop-color="#dba291"/><stop offset=".6" stop-color="#cc877f"/><stop offset="1" stop-color="#a8646c"/></linearGradient>
  <linearGradient id="myelin" x2="0" y2="1"><stop stop-color="#f8e3a7"/><stop offset=".3" stop-color="#d5bc7b"/><stop offset=".6" stop-color="#ecd698"/><stop offset="1" stop-color="#ab955f"/></linearGradient>
  <radialGradient id="soma" cx=".35" cy=".3"><stop stop-color="#e9d1ab"/><stop offset="1" stop-color="#bb986f"/></radialGradient>
  <filter id="cell-shadow" x="-30%" y="-50%" width="170%" height="220%"><feDropShadow dx="1" dy="5" stdDeviation="5" flood-color="#665751" flood-opacity=".18"/></filter>

</defs>`;
const text=(x:number,y:number,value:string,size=18)=>`<text x="${x}" y="${y}" text-anchor="middle" fill="#504c45" font-size="${size}" font-weight="${size>16?650:450}">${value}</text>`;
function epithelial(progress:number,t:Translator){
  const layers=Array.from({length:4},(_,row)=>Array.from({length:10},(_,col)=>{
    const x=58+col*92+(row%2?40:0),y=206+row*49,flat=1-row*.09;
    return `<g transform="translate(${x} ${y})"><path d="M-45 -14Q-20 -28 25 -19L48 3Q28 29-22 22L-48 8Z" fill="url(#epithelial)" stroke="#b88d89" stroke-width="2"/>${row>0?`<ellipse rx="15" ry="${10/flat}" fill="url(#cell-nucleus)"/><ellipse cx="-4" cy="-2" rx="4" ry="3" fill="#d4b9c5" opacity=".5"/>`:''}<path d="M-32 -13Q-6 -20 19 -13" fill="none" stroke="#fff2dc" stroke-width="2" opacity=".5"/></g>`;
  }).join('')).join('');
  const grains=Array.from({length:8},(_,i)=>{const s=barrierParticle(i,progress);return `<g transform="translate(${s.x} ${s.y}) rotate(${i*47})"><ellipse rx="9" ry="6" fill="#83987e" stroke="#697d66"/><path d="M-7-4l-4-4m13 0 4-5M-4 5l-3 5" stroke="#697d66"/></g>`;}).join('');
  return `${text(490,68,t('皮肤表面：层层相接的保护'))}<path d="M35 193Q490 172 944 193" stroke="#d3b497" stroke-width="19" fill="none"/><path d="M34 189Q490 168 945 189" stroke="#faf0d7" stroke-width="3" fill="none"/>${layers}${grains}<path d="M35 411Q490 396 945 411" stroke="#c3ba96" stroke-width="4" fill="none"/><g stroke="#b9b19a" stroke-opacity=".4" fill="none">${Array.from({length:8},(_,i)=>`<path d="M32 ${429+i*8}Q250 ${389+i*13} 484 ${440+i*6}T948 ${426+i*9}"/>`).join('')}</g>${text(229,510,t('表面细胞逐渐角化'),16)}${text(737,510,t('深处有活细胞持续更新'),16)}`;
}
function muscle(progress:number,t:Translator,options:MuscleOptions){
  const s=muscleState(progress,options),width=s.length,a=MUSCLE_APPARATUS;
  const height=43*Math.sqrt(s.restLength/width);
  // Keep the same repeat units and nuclei as the fiber shortens and relaxes.
  const bands=Array.from({length:3},(_,i)=>`<g transform="translate(${s.left} ${174+i*49+(43-height)/2})"><rect data-muscle-fibre="${i}" width="${width}" height="${height}" rx="20" fill="url(#muscle)" stroke="#a5666c"/>
    ${Array.from({length:34},(_,j)=>`<path data-muscle-band="${i}-${j}" d="M${13+(j+.5)*(width-26)/34} 4v35" stroke="#905a64" stroke-opacity=".34" stroke-width="${(width-26)/34*.24}"/><path d="M${13+(j+.7)*(width-26)/34} 4v35" stroke="#ffe0c0" stroke-opacity=".5" stroke-width="1.6"/>`).join('')}
    ${[.12,.48,.84].map(f=>`<ellipse cx="${width*f}" cy="${i%2?35:8}" rx="12" ry="4" fill="#8b6a83"/>`).join('')}<path d="M22 8H${width-24}" stroke="#ffdfc3" stroke-width="2" opacity=".5"/></g>`).join('');
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
    <path data-tendon="left" d="M130 238C160 238 165 174 185 174L185 315C164 315 160 244 130 244Z" fill="#d3bf9e" stroke="#a38f75" stroke-width="1.5"/>
    <path data-tendon="right" d="M${s.right} 174C${s.right+18} 174 ${s.junction-10} 238 ${s.junction} 238V244C${s.junction-10} 244 ${s.right+18} 315 ${s.right} 315Z" fill="#d3bf9e" stroke="#a38f75" stroke-width="1.5"/>
    <g filter="url(#cell-shadow)">${bands}</g>
    <path data-load-spring="true" d="M${s.junction} 241H${s.junction+8}${spring.replace(/^M/,'L')}L${a.springAnchor} 241" fill="none" stroke="#56817c" stroke-width="${2+s.load}" stroke-linejoin="round"/>
    ${clampArt}<circle data-force-junction="true" cx="${s.junction}" cy="241" r="4" fill="#eff3e4" stroke="#657779" stroke-width="2"/>
    <path d="M${s.junction} 150V214" fill="none" stroke="#9aaca5" stroke-dasharray="3 5"/>
    ${force('muscle',s.tension,-1,92,'#a76269')}${force('spring',s.springForce,1,116,'#56817c')}${force('clamp',s.clampForce,1,140,'#586b84')}
    <path d="M${s.left} 153H${s.right}" stroke="#8c7469" stroke-dasharray="4 6"/>
    ${text(137,330,t('固定端'),15)}${text(850,316,t('外部弹簧'),15)}
    <circle cx="${(s.left+s.right)/2}" cy="241" r="17" fill="none" stroke="#b39363" stroke-width="1.5" stroke-dasharray="4 4"/><path d="M${(s.left+s.right)/2-12} 260L445 356M${(s.left+s.right)/2+12} 260L535 356" stroke="#ac9181" stroke-dasharray="4 5"/>
    <rect x="168" y="363" width="644" height="120" rx="20" fill="#fff7e6" stroke="#d4c5ad"/>
    <path data-z-discs="true" d="M${left} 382v81M${right} 382v81" stroke="#786479" stroke-width="5"/>
    ${[398,420,442].map(y=>`<path d="M${left} ${y}h178M${right} ${y}h-178" stroke="#c17e6b" stroke-width="4"/><path d="M385 ${y+8}H595" stroke="#9c8ba4" stroke-width="8" stroke-linecap="round"/>`).join('')}
    ${text(490,516,t('放大同一纤维的代表肌节：细丝长度不变'),16)}</g>`;
}
function neuron(progress:number,t:Translator){
  const s=nerveSignal(progress);
  const branches=Array.from({length:8},(_,i)=>{const a=(i/8)*Math.PI*2,x=221+Math.cos(a)*89,y=254+Math.sin(a)*96;return `<path d="M221 254Q${221+Math.cos(a)*30} ${254+Math.sin(a)*50} ${x} ${y}m0 0l${Math.cos(a-.7)*42} ${Math.sin(a-.7)*38}m${-Math.cos(a-.7)*42} ${-Math.sin(a-.7)*38}l${Math.cos(a+.7)*37} ${Math.sin(a+.7)*35}" fill="none" stroke="#b89b77" stroke-width="5" stroke-linecap="round"/>`;}).join('');
  const sheath=Array.from({length:7},(_,i)=>`<g transform="translate(${335+i*67} 243)"><rect width="56" height="23" rx="11" fill="url(#myelin)" stroke="#b39c67"/><path d="M10 4v15m7-16v17m8-17v17m8-17v17m8-16v15" stroke="#a58e5f" stroke-width=".8" opacity=".35"/></g>`).join('');
  const spark=progress>0&&progress<.8?`<ellipse data-signal="axon" cx="${s.x}" cy="254" rx="17" ry="14" fill="#f2c359" opacity=".8"/><circle cx="${s.x}" cy="254" r="5" fill="#fff4c7"/>`:'';
  return `${text(490,68,t('神经元：结构连得远，信号传得快'))}<g filter="url(#cell-shadow)">${branches}<path d="M259 254H828q18 0 23-15m-23 15 23 14" stroke="#aa8961" stroke-width="10" stroke-linecap="round" fill="none"/>${sheath}<path d="M183 218Q183 195 211 209L238 203Q262 223 258 243L270 264Q261 287 238 283L214 301Q193 297 194 279L175 263Q163 240 183 218Z" fill="url(#soma)" stroke="#aa8961" stroke-width="2"/><ellipse cx="218" cy="250" rx="23" ry="26" fill="url(#cell-nucleus)"/><ellipse cx="211" cy="241" rx="7" ry="8" fill="#bba0b9" opacity=".6"/></g>${spark}<path d="M886 216Q877 254 886 291" stroke="#a9988c" stroke-width="10" fill="none"/><path d="M903 224Q897 254 903 284" stroke="#ead7b7" stroke-width="7" fill="none"/>
    ${Array.from({length:5},(_,i)=>`<circle cx="${853+s.transmitter*28}" cy="${236+i*8}" r="3" fill="#b58a5c" opacity="${s.transmitter>0?1:0}"/>`).join('')}
    <circle cx="901" cy="254" r="16" fill="#e5ba59" opacity="${s.response*.55}"/>
    ${text(214,397,t('细胞体'),16)}${text(520,397,t('有髓鞘的轴突'),16)}${text(843,397,t('突触'),16)}<path d="M217 374v-70M520 374v-107M843 374l23-87" fill="none" stroke="#aa9880" stroke-dasharray="3 5"/>
    ${text(490,495,t('信号沿膜传播，再把信息传给下一个细胞'),16)}`;
}
export function renderCell(kind:CellKind,progress:number,t:Translator,options:MuscleOptions=DEFAULT_MUSCLE){
  return defs+`<rect width="980" height="550" rx="24" fill="url(#background)"/>`+(kind==='barrier'?epithelial(clamp(progress),t):kind==='muscle'?muscle(clamp(progress),t,options):neuron(clamp(progress),t));
}
