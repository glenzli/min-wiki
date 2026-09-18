import { t } from './i18n.ts';
import type { EruptionStyle,VolcanoStatus } from './model.ts';

export const STYLE_NOTES:Record<EruptionStyle,{title:string;body:string;watch:string}>={
 flow:{title:t('以熔岩流为主'),body:t('这组岩浆较容易流动，气体较容易释放。看它沿山坡摊开，亮色熔岩之间逐渐长出暗色硬壳。'),watch:t('重点看：前缘走多远、流道有多宽，以及表壳下的余热。')},
 fountain:{title:t('以熔岩喷泉为主'),body:t('容易流动的岩浆也能被膨胀气体带向空中。较粗的熔滴沿弧线落回山坡，周围仍可有熔岩流。'),watch:t('重点看：喷泉高度、熔滴落点，与贴地熔岩的区别。')},
 ash:{title:t('富含火山灰的爆发'),body:t('这组条件更容易使岩浆碎裂。细灰随上升气体卷入空气，形成不断扩展的灰云，较粗的碎块则先落下。'),watch:t('重点看：灰柱扩展、向一侧漂移，以及细灰落在更远的地方。')},
};
export const STATUS_NOTES:Record<VolcanoStatus,{title:string;body:string;past:string;present:string;future:string;evidence:string;limit:string}>={
 erupting:{title:t('正在喷发：此刻确实有物质喷出'),body:t('熔岩、火山灰或其他碎屑正在出来，是当前喷发的证据。喷发可以以流动为主，也可以以爆发为主。'),past:t('有过喷发记录'),present:t('此刻正在喷发'),future:t('何时结束要继续观察'),evidence:t('看实际喷出物，并结合地震、地表形变、气体与热观测。单独一缕白气不等于岩浆正在喷出。'),limit:t('“活火山”并不等于每天都在喷；目前正在喷发只是其中一种状态。')},
 dormant:{title:t('休眠期：现在安静，仍可能再喷'),body:t('“休眠”常用来描述火山喷发之间的安静时期。过去的喷发层、年代和地下活动线索，让科学家仍把它看作可能再次喷发的系统。'),past:t('留下过去喷发的岩层'),present:t('目前没有喷发'),future:t('仍可能再次喷发'),evidence:t('一起研究岩层年代、历史记录、地震、形变和气体；安静很久也不能只靠外观宣布它“死了”。'),limit:t('“休眠”的用法并不完全统一，很多休眠火山仍属于广义的活火山；没有统一的几年倒计时。')},
 extinct:{title:t('被认为已熄灭：不再预期喷发'),body:t('“死火山”通常指科学家根据地质历史和供浆背景，认为不太可能再次喷发的火山。它是一种有依据、也可能修订的判断。'),past:t('较久远的火山活动'),present:t('目前没有喷发'),future:t('依据现有证据，不预期再喷'),evidence:t('需要较完整的地质年代和构造、岩浆供给背景，不能用山上长草、没有烟或某个固定年数代替。'),limit:t('长得安静不等于已熄灭；一处旧喷口不再活动，也不保证整个火山区不会出现新喷口。')},
};
