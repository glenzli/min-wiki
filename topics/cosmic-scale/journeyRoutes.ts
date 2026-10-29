import copy from './journeyContent.json';
import {progressFor,stops} from './model.ts';
import type {Chapter} from './explorationNavigation.ts';
import type {GalacticCase} from './galacticModel.ts';

export type Copy={zh:string;en:string};
export const lessonRoutes=['sky','inward','outward','flight'] as const;
export type LessonRoute=typeof lessonRoutes[number];
export type LessonSelection={route:LessonRoute;step:string};
export type LessonStep={id:string;name:Copy;chapter:Chapter;selected?:GalacticCase;home?:number;scale?:number;origin?:'earth'|'sun';ground?:boolean;parent?:string};
export const routeNames:Record<LessonRoute,Copy>=copy.routes;
export const galaxyNames=copy.galaxyNames;
export const lessonSteps:Record<LessonRoute,readonly LessonStep[]>={
 sky:[{id:'night',name:copy.steps['sky:night'],chapter:'sky',selected:'sky',ground:true},{id:'stars',name:copy.steps['sky:stars'],chapter:'sky',selected:'orion'},{id:'milky',name:copy.steps['sky:milky'],chapter:'galaxies',selected:'milky-way'},{id:'neighbours',name:copy.steps['sky:neighbours'],chapter:'galaxies',selected:'galaxy-comparison'}],
 inward:[{id:'galaxy',name:copy.steps['inward:galaxy'],chapter:'zoom',scale:stops[3]!},{id:'clusters',parent:'galaxy',name:copy.steps['inward:clusters'],chapter:'galaxies',selected:'star-cluster'},{id:'nearby',name:copy.steps['inward:nearby'],chapter:'zoom',scale:stops[2]!},{id:'solar',name:copy.steps['inward:solar'],chapter:'zoom',scale:stops[1]!},{id:'families',parent:'solar',name:copy.steps['inward:families'],chapter:'systems',selected:'trappist-1'},{id:'sun',parent:'solar',name:copy.steps['inward:sun'],chapter:'zoom',scale:0,origin:'sun'},{id:'sizes',parent:'solar',name:copy.steps['inward:sizes'],chapter:'compare'},{id:'moon',name:copy.steps['inward:moon'],chapter:'zoom',scale:progressFor(600_000)},{id:'earth',name:copy.steps['inward:earth'],chapter:'zoom',scale:0}],
 outward:[{id:'galaxy',name:copy.steps['outward:galaxy'],chapter:'galaxies',selected:'milky-way'},{id:'group',name:copy.steps['outward:group'],chapter:'homes',home:2},{id:'cluster',name:copy.steps['outward:cluster'],chapter:'homes',home:3},{id:'flows',name:copy.steps['outward:flows'],chapter:'homes',home:4},{id:'web',name:copy.steps['outward:web'],chapter:'homes',home:5},{id:'observable',name:copy.steps['outward:observable'],chapter:'homes',home:6}],
 flight:[{id:'continuous',name:copy.steps['flight:continuous'],chapter:'zoom'}],
};
export const stepInRoute=(selection:LessonSelection)=>lessonSteps[selection.route].find(step=>step.id===selection.step)??lessonSteps[selection.route][0]!;
export const scaleParent=(selection:LessonSelection)=>{const selected=stepInRoute(selection);return selected.parent?lessonSteps[selection.route].find(step=>step.id===selected.parent)!:selected;};
/** Preserve every legacy view. The lesson groups its meaning without rewriting the saved science. */
export function lessonForView(chapter:Chapter,selected:GalacticCase,home=0):LessonSelection{
 if(chapter==='zoom')return {route:'flight',step:'continuous'};
 if(chapter==='compare')return {route:'inward',step:'sizes'};
 if(chapter==='systems')return {route:'inward',step:'families'};
 if(chapter==='homes')return home===0?{route:'inward',step:'families'}:{route:'outward',step:home===1?'galaxy':home===2?'group':home===3?'cluster':home===4?'flows':home===5?'web':'observable'};
 if(selected==='star-cluster')return {route:'inward',step:'clusters'};
 if(selected==='local-group')return {route:'outward',step:'group'};
 return {route:'sky',step:selected==='sky'?'night':selected==='orion'?'stars':selected==='milky-way'?'milky':'neighbours'};
}
export function readLesson(p:URLSearchParams,chapter:Chapter,selected:GalacticCase,home=0):LessonSelection{
 const route=p.get('trail') as LessonRoute,step=p.get('scene');
 if(lessonRoutes.includes(route)&&lessonSteps[route].some(item=>item.id===step))return {route,step:step!};
 if(!p.has('mode')&&!p.has('scale')&&!p.has('origin'))return {route:'sky',step:'night'};
 return lessonForView(chapter,selected,home);
}
export function saveLesson(p:URLSearchParams,lesson:LessonSelection){p.set('trail',lesson.route);p.set('scene',lesson.step);}

/** All copied labels live together; invisible light is distinguished from a rendered locator. */
export const journeyCopy=copy.ui;

/** Captions follow the actual scene, including comparisons outside the continuous ruler. */
export function lessonCue(selection:LessonSelection,language:string){
 const words=journeyCopy[language==='en'?'en':'zh'];
 if(selection.route==='inward')return ({families:words.families,moon:words.moonCue,sun:words.sun,clusters:words.clusters,sizes:words.sizes} as Record<string,string>)[selection.step]??words.inward;
 if(selection.route==='sky')return ({night:words.night,stars:words.stars,milky:words.milky,neighbours:words.neighbours} as Record<string,string>)[selection.step]??words.night;
 return words[selection.route];
}
