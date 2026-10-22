/** Optional false-colour location cues for Earth's invisible constituents.
 * These independently normalised envelopes are NOT mixing ratios, measured
 * concentrations, optical depths or a humidity forecast for the weather case.
 * Ozone: NOAA's broad stratospheric 15–35 km region. Water vapour: a variable
 * constituent concentrated in the lower atmosphere, distinct from cloud drops.
 * https://science.nasa.gov/earth/earth-atmosphere/earths-atmosphere-a-multi-layered-cake/
 * https://www.csl.noaa.gov/assessments/ozone/2018/twentyquestions/
 * https://www.weather.gov/source/zhu/ZHU_Training_Page/clouds/cloud_development/clouds.htm
 */
export function earthCompositionCue(km:number) {
 const h=Number.isFinite(km)?Math.max(0,km):0;
 return {
  water:Math.exp(-h/2.6),
  ozone:Math.min(1,Math.exp(-.5*((h-25)/8)**2)+.025*Math.exp(-h/8)),
 };
}
