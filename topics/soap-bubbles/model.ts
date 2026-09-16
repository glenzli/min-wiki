export const clamp = (x:number) => Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
export const smooth = (x:number) => {const u=clamp(x);return u*u*(3-2*u);};
/** An imposed prolate shape relaxes toward a sphere at fixed enclosed volume. */
export function bubbleShape(deformation:number){
 const a=1+.6*clamp(deformation),b=1/Math.sqrt(a),e=Math.sqrt(Math.max(0,1-b*b/(a*a)));
 const relativeArea=e<1e-6?1:.5*b*b*(1+a/(b*e)*Math.asin(e));
 return {a,b,relativeVolume:a*b*b,relativeArea};
}
/** Qualitative redistribution on a closed spherical film; equal-height bands have equal area.
 * Its spherical area mean remains 430 nm. Evaporation and rupture are deliberately separate. */
export function filmThickness(height:number,drainage:number){
 const y=Math.max(-1,Math.min(1,height));
 return 430*(1+.86*clamp(drainage)*y);
}
/** Two-ray reflected intensity, normalized; one interface reverses optical phase.
 * Three sampled wavelengths in the renderer illustrate color, not calibrated colorimetry. */
export function reflectedIntensity(thicknessNm:number,wavelengthNm:number,incidentCosine=1){
 const n=1.333,cosine=clamp(incidentCosine);
 const transmittedCosine=Math.sqrt(1-(1-cosine*cosine)/(n*n));
 const phase=4*Math.PI*n*Math.max(0,thicknessNm)*transmittedCosine/Math.max(1,wavelengthNm);
 return (1-Math.cos(phase))/2;
}
export function filmColor(thicknessNm:number,incidentCosine=1){
 return [610,540,460].map(wavelength=>reflectedIntensity(thicknessNm,wavelength,incidentCosine));
}
/** The selected front-facing patch has a tilted normal even at zero global view angle. */
export function selectedIncidence(height:number,angle:number){
 return Math.max(.1,Math.sqrt(Math.max(0,1-height*height))*Math.cos(angle));
}
