import type { Translate } from '../../src/platform/i18n.ts';
/** Topic-local study fragment, translated before insertion. Only the active fragment is attached. */
export function studyHost(html:string,translate:Translate):HTMLElement {
  const root=document.createElement('section');root.className='plant-study';root.innerHTML=html;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  for(let node=walker.nextNode();node;node=walker.nextNode()){const raw=node.textContent??'',source=raw.trim();if(source)node.textContent=raw.replace(source,translate(source));}
  for(const node of root.querySelectorAll('[aria-label],[title]'))for(const key of ['aria-label','title']){const value=node.getAttribute(key);if(value)node.setAttribute(key,translate(value));}
  return root;
}
