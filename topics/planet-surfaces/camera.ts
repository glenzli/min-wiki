import { clamp, type View } from './model.ts';

export type CameraPose = { yaw: number; pitch: number; distance: number };
export type Angle = 'front' | 'oblique' | 'overhead';
export function cameraPreset(view: View, angle: Angle = 'oblique'): CameraPose {
  if (view === 'landscape') return angle === 'front' ? { yaw: .12, pitch: .22, distance: 20 }
    : angle === 'overhead' ? { yaw: .3, pitch: 1.15, distance: 23 } : { yaw: -.58, pitch: .42, distance: 19 };
  return angle === 'front' ? { yaw: 0, pitch: .03, distance: 3.4 }
    : angle === 'overhead' ? { yaw: .15, pitch: .78, distance: 3.4 } : { yaw: view === 'section' ? -.85 : -.57, pitch: .3, distance: 3.4 };
}
export function boundPose(view: View, pose: CameraPose): CameraPose {
  const landscape = view === 'landscape';
  return { yaw: view === 'section' ? clamp(pose.yaw, -1.15, 1.15) : Number.isFinite(pose.yaw) ? pose.yaw : 0,
    pitch: clamp(pose.pitch, landscape ? .14 : -.75, landscape ? 1.35 : 1.1),
    distance: clamp(pose.distance, landscape ? 12 : 2.6, landscape ? 31 : 6.5) };
}
/** A camera moves around persistent geometry; no image translation or per-frame randomness. */
export function tourPose(view: View, origin: CameraPose, seconds: number): CameraPose {
  const time = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  return boundPose(view, { ...origin,
    yaw: view === 'section' ? origin.yaw * Math.cos(time * .19) + .7 * Math.sin(time * .19) : origin.yaw + time * .18,
    pitch: origin.pitch + Math.sin(time * .22) * (view === 'landscape' ? .08 : .045) });
}
export function cameraPosition(pose: CameraPose): [number, number, number] {
  return [Math.sin(pose.yaw) * Math.cos(pose.pitch) * pose.distance,
    Math.sin(pose.pitch) * pose.distance, Math.cos(pose.yaw) * Math.cos(pose.pitch) * pose.distance];
}
