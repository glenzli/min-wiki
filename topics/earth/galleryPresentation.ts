import {mountPresentationFrame} from '../../src/platform/presentation.ts';

let choiceSequence=0;

/** Studies declare their regions; this adapter owns only Reader handles and late mounts. */
export function mountGalleryPresentations(host:HTMLElement,navigation?:HTMLElement):()=>void {
  const frames=new Map<HTMLElement,NonNullable<ReturnType<typeof mountPresentationFrame>>>();
  const navigationHome=navigation?.parentNode;
  const navigationNext=navigation?.nextSibling??null;
  function restoreNavigation() {
    if(navigation&&navigationHome&&navigation.parentNode!==navigationHome)
      navigationHome.insertBefore(navigation,navigationNext?.parentNode===navigationHome?navigationNext:null);
  }
  function placeNavigation() {
    if(!navigation)return;
    // Native hidden/disclosure owners affect layout; collapsed Reader controls do not hide the scene.
    const active=[...frames.values()].find(frame=>frame.root.getClientRects().length);
    const destination=active?.mode.toolbar.querySelector<HTMLElement>('.observation-choice-menu')??active?.notes;
    if(destination){if(navigation.parentNode!==destination)destination.append(navigation);}
    else restoreNavigation();
  }
  function mount(root:HTMLElement) {
    if(frames.has(root)||root.classList.contains('presentation-frame'))return;
    const visual=root.querySelector<HTMLElement>('[data-earth-visual]');
    if(!visual)return;
    const choices=[...root.querySelectorAll<HTMLElement>('[data-earth-choices]')];
    const choiceClass=`earth-presentation-choices-${choiceSequence++}`;
    choices.forEach(node=>node.classList.add(choiceClass));
    const frame=mountPresentationFrame({root,visual:'[data-earth-visual]',transport:'[data-earth-transport]',choices:choices.length?`.${choiceClass}`:undefined});
    if(frame)frames.set(root,frame);
  }
  function inspect(node:Element) {
    if(node.matches('[data-earth-presentation]'))mount(node as HTMLElement);
    node.querySelectorAll<HTMLElement>('[data-earth-presentation]').forEach(mount);
  }
  inspect(host);
  placeNavigation();
  const observer=new MutationObserver(records=>{
    for(const record of records)for(const node of record.addedNodes)if(node instanceof HTMLElement)inspect(node);
    for(const [root,frame] of frames)if(!host.contains(root)){
      if(navigation&&root.contains(navigation))restoreNavigation();
      frame.mode.dispose();frames.delete(root);
    }
    placeNavigation();
  });
  observer.observe(host,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open']});
  return ()=>{observer.disconnect();restoreNavigation();for(const frame of frames.values())frame.mode.dispose();frames.clear();};
}
