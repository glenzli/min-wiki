import { type FlightSnapshot } from './model.ts';
export type Point = readonly [number, number];
export type FlowRoute = {
 start: Point; upstreamControl: Point; leadingControl: Point; surfaceStart: Point;
 surfaceControl: Point; trailingControl: Point; trailing: Point;
 downstreamControl: Point; exitControl: Point; exit: Point; separated: boolean;
};
/** Qualitative route geometry; no velocity/pressure field is solved. Screen +y is down. */
export function flowRoute(s: Pick<FlightSnapshot, 'pathAngle' | 'angleOfAttack' | 'cl' | 'stalled'>, side: -1 | 1, offset: number): FlowRoute {
 const alpha = s.angleOfAttack * Math.PI / 180;
 // First construct the whole route in the incoming-air frame: its +x axis is the flow.
 const wingToFlow = (x: number, y: number): Point => [x*Math.cos(alpha)-y*Math.sin(alpha), x*Math.sin(alpha)+y*Math.cos(alpha)];
 const toScreen = ([x,y]: Point): Point => [480+x*Math.cos(s.pathAngle)-y*Math.sin(s.pathAngle),225+x*Math.sin(s.pathAngle)+y*Math.cos(s.pathAngle)];
 const separated = side < 0 && s.stalled;
 const leading = wingToFlow(-187, side*offset);
 const surfaceStart = wingToFlow(-125,side<0?-47-offset:27+offset);
 const surfaceControl = wingToFlow(20,separated?-110-offset:side<0?-46-offset:24+offset);
 const trailingControl = wingToFlow(120,separated?-100-offset:side<0?-20-offset:20+offset);
 const trailing = wingToFlow(177,separated?-85-offset:side*offset);
 // Positive lift turns outgoing flow downward relative to incoming flow, even during ascent.
 // The slope factor is an illustrative drawing choice, not a computed downwash angle.
 const downwashSlope = .18*s.cl, exit: Point = [425,trailing[1]+(425-trailing[0])*downwashSlope];
 return {
  start:toScreen([-425,leading[1]]),upstreamControl:toScreen([-325,leading[1]]),leadingControl:toScreen(leading),surfaceStart:toScreen(surfaceStart),
  surfaceControl:toScreen(surfaceControl),trailingControl:toScreen(trailingControl),trailing:toScreen(trailing),
  downstreamControl:toScreen([trailing[0]+65,trailing[1]+65*downwashSlope]),
  exitControl:toScreen([335,exit[1]-90*downwashSlope]),exit:toScreen(exit),separated,
 };
}
