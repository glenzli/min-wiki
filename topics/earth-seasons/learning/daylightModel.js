import {calcSubsolarLatitude,calcDaylightHours,calcNoonSolarAltitude} from '../data/seasonsData.js';
import {cityIllumination} from '../physics/solarGeometry.js';
const rad=x=>x*Math.PI/180;
export function daylightExperiment(latitude,orbit,tilt) {
 const declination=calcSubsolarLatitude(orbit,tilt);
 return {latitude,tilt,declination,daylight:calcDaylightHours(latitude,declination),
   noonAltitude:calcNoonSolarAltitude(latitude,declination)};
}
// The experiment starts at local solar noon; one turn returns to noon.
export function lightAtDayProgress(model,progress) {
 const delta=rad(model.declination), hourAngle=progress*Math.PI*2;
 return cityIllumination(model.latitude,0,{x:Math.cos(delta)*Math.cos(hourAngle),y:Math.sin(delta),z:-Math.cos(delta)*Math.sin(hourAngle)});
}
export function daylightDifference(model) {
 if(model.daylight===null)return '极点的太阳在地平线附近，不能按普通日出日落计算。';
 const difference=model.daylight-12;
 if(Math.abs(difference)<.05)return '黄色和蓝色一样长：白昼与黑夜各约 12 小时。';
 return `比不倾斜时，白天${difference>0?'多':'少'}了约 ${Math.abs(difference).toFixed(1)} 小时。`;
}
// View the Sun-axis meridian from a slight elevation. This is a local explanatory
// view, so the Sun always stays on the left as the orbital phase changes.
export function latitudeCirclePoint(model,progress) {
 const phi=rad(model.latitude),delta=rad(model.declination),h=progress*2*Math.PI;
 const x=-Math.cos(phi)*Math.cos(h),y=Math.sin(phi),z=Math.cos(phi)*Math.sin(h);
 const worldX=x*Math.cos(delta)-y*Math.sin(delta),worldY=x*Math.sin(delta)+y*Math.cos(delta);
 const elevation=.35;
 return {x:worldX,y:worldY*Math.cos(elevation)-z*Math.sin(elevation),depth:worldY*Math.sin(elevation)+z*Math.cos(elevation)};
}
