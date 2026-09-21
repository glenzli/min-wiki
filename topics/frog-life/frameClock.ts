import type { FrameClock } from './controller.ts';

export interface AnimationHost {
  requestAnimationFrame(callback:(time:number)=>void):number;
  cancelAnimationFrame(id:number):void;
  performance:{now():number};
}

/** Native Window/Performance methods must retain their original receivers. */
export function browserFrameClock(host:AnimationHost):FrameClock {
  return {
    request:callback=>host.requestAnimationFrame(callback),
    cancel:id=>host.cancelAnimationFrame(id),
    now:()=>host.performance.now(),
  };
}
