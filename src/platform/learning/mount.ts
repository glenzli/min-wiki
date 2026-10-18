import {mountLearning} from '@glenzli/wiki-reader/learning';
import {language} from '../i18n.ts';
import {projectLearning} from './buildProjection.ts';
import {narrationText,narrationStoryboard,type TopicLearning} from './model.ts';
import {resources} from './resources.ts';
export async function mountTopicLearning(id:string,options:{host?:HTMLElement;signal?:AbortSignal}={}){
 const locale=language==='en'?'en':'zh';const load=(resources[locale] as Record<string,()=>Promise<{default:unknown}>>)[id];if(!load||options.signal?.aborted)return;
 const value=(await load()).default as TopicLearning;if(options.signal?.aborted)return;const data=projectLearning(value,locale);
 mountLearning({...data,spoken:narrationText(data.content),storyboard:narrationStoryboard(data.content)},options);
}
