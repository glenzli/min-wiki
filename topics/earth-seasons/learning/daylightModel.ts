import { t } from '../i18n.ts';
import {calcSubsolarLatitude,calcDaylightHours,calcNoonSolarAltitude} from '../data/seasonsData.ts';
import {cityIllumination} from '../physics/solarGeometry.ts';
const rad=(x: number) =>x*Math.PI/180;
export function daylightExperiment(latitude: number,orbit: number,tilt: number) {
 const declination=calcSubsolarLatitude(orbit,tilt);
 return {latitude,tilt,declination,daylight:calcDaylightHours(latitude,declination),
   noonAltitude:calcNoonSolarAltitude(latitude,declination)};
}
// The experiment starts at local solar noon; one turn returns to noon.
export function lightAtDayProgress(model: ReturnType<typeof daylightExperiment>,progress: number) {
 const delta=rad(model.declination), hourAngle=progress*Math.PI*2;
 return cityIllumination(model.latitude,0,{x:Math.cos(delta)*Math.cos(hourAngle),y:Math.sin(delta),z:-Math.cos(delta)*Math.sin(hourAngle)});
}
export function daylightDifference(model: ReturnType<typeof daylightExperiment>) {
 if(model.daylight===null)return t("极点的太阳在地平线附近，不能按普通日出日落计算。");
 const difference=model.daylight-12;
 if(Math.abs(difference)<.05)return t("黄色和蓝色一样长：白昼与黑夜各约 12 小时。");
 return t("比不倾斜时，白天{{v0}}了约 {{v1}} 小时。", {v0: difference>0?t("多"):t("少"), v1: Math.abs(difference).toFixed(1)});
}
// View the Sun-axis meridian from a slight elevation. This is a local explanatory
// view, so the Sun always stays on the left as the orbital phase changes.
export function latitudeCirclePoint(model: ReturnType<typeof daylightExperiment>,progress: number) {
 const phi=rad(model.latitude),delta=rad(model.declination),h=progress*2*Math.PI;
 const x=-Math.cos(phi)*Math.cos(h),y=Math.sin(phi),z=Math.cos(phi)*Math.sin(h);
 const worldX=x*Math.cos(delta)-y*Math.sin(delta),worldY=x*Math.sin(delta)+y*Math.cos(delta);
 const elevation=.35;
 return {x:worldX,y:worldY*Math.cos(elevation)-z*Math.sin(elevation),depth:worldY*Math.sin(elevation)+z*Math.cos(elevation)};
}
