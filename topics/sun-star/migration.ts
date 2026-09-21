/** Keep authored query state and language; this legacy entry maps precisely to the Sun chapter. */
export function stellarDestination(search:string,hash=''){
  const params=new URLSearchParams(search);params.set('chapter','sun');
  return '/topics/stars/?'+params.toString()+hash;
}
