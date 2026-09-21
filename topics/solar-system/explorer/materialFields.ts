/** Shared procedural optical fields used by global clouds and the local cloud volume. */
export const noise = `
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return .55*n3(p)+.27*n3(p*2.03)+.12*n3(p*4.01)+.06*n3(p*8.09);}
`;
// The source map supplies broad weather structure; procedural detail adds optical
// depth, never claims a current forecast. Rotate in 3D so the seam and poles stay continuous.
export const earthField = `
vec3 cloudCoordinate(vec3 p,float time,float level){
  float lat=asin(clamp(p.y,-1.,1.));
  float a=time*(.0022+.0024*sin(lat*5.))*(1.+level*.13);
  return vec3(cos(a)*p.x-sin(a)*p.z,p.y,sin(a)*p.x+cos(a)*p.z);
}
vec2 sphereUV(vec3 p){return vec2(.5-atan(p.z,p.x)/6.283185,.5+asin(clamp(p.y,-1.,1.))/3.141593);}
float cloudCoverage(vec3 p,float time,float level){
  vec3 q=cloudCoordinate(p,time,level);
  float map=texture2D(uCloud,sphereUV(q)).r;
  float detail=fbm(q*180.+vec3(0.,level*9.,0.));
  float high=fbm(q*vec3(125.,410.,125.)+level*7.);
  return level>1.5?smoothstep(.24,.66,map)*smoothstep(.43,.65,high)*.36:
    smoothstep(.1,.75,map+(detail-.5)*.24)*mix(1.,.57,level);
}
`;
