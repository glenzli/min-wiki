import * as THREE from 'three';

export type ShoreEnvironment = {
  group: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  /** Quiet the riverbed during the imagined water-replacement observation. */
  setTeachingFocus(value: number): void;
};

const smooth = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Fixed ground shared by sand, submerged stones and the reed roots. It is
 * illustrative terrain, with a flat central resting patch at the model floor. */
export function shoreBankZ(x: number): number {
  return -4.3 + .28 * Math.sin(x * .72) + .12 * Math.cos(x * 1.7) + 1.65 * Math.exp(-(((x + 4.7) / 2.2) ** 2));
}

export function shoreGroundHeight(x: number, z: number): number {
  const bank = shoreBankZ(x);
  const rise = 1 - smooth(bank - 1.35, bank + 3.6, z);
  const detail = .042 * Math.sin(x * 1.4 + z * .8) * Math.sin(z * 1.2 - x * .35);
  const focal = 1 - smooth(1.6, 3.1, Math.hypot(x, z * .85));
  return -2.2 + 2.57 * rise + detail * (1 - focal);
}

/** Same terrain field for optical depth. This does not infer physical depth
 * from colour: it projects the already-authored illustrative riverbed. */
export const SHORE_GROUND_GLSL = /* glsl */`
float shoreOpticalDepth(vec2 p,float level){
  float bank=-4.3+.28*sin(p.x*.72)+.12*cos(p.x*1.7)+1.65*exp(-pow((p.x+4.7)/2.2,2.));
  float rise=1.-smoothstep(bank-1.35,bank+3.6,p.y);
  float detail=.042*sin(p.x*1.4+p.y*.8)*sin(p.y*1.2-p.x*.35);
  float focal=1.-smoothstep(1.6,3.1,length(vec2(p.x,p.y*.85)));
  return max(0.,level-(-2.2+2.57*rise+detail*(1.-focal)));
}`;

function riverbedGeometry() {
  const across = 112, along = 96, positions: number[] = [], colours: number[] = [], uv: number[] = [], indices: number[] = [];
  const dry = new THREE.Color('#b5ad96'), wet = new THREE.Color('#a3aaa2'), deep = new THREE.Color('#729b9a');
  for (let j = 0; j <= along; j++) for (let i = 0; i <= across; i++) {
    const x = (i / across - .5) * 30, z = (j / along - .5) * 27;
    const y = shoreGroundHeight(x, z), colour = wet.clone().lerp(dry, smooth(-.1, .24, y));
    colour.lerp(deep, (1 - smooth(-2.2, -.25, y)) * .58);
    const mottling = .96 + .04 * Math.sin(x * 3.6 + z * 2.1) * Math.sin(z * 4.7 - x * 1.3);
    colour.multiplyScalar(mottling);
    positions.push(x, y, z); colours.push(colour.r, colour.g, colour.b); uv.push(i / across, j / along);
    if (j < along && i < across) {
      const a = j * (across + 1) + i, b = a + across + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  geometry.name = 'shore-continuous-sand-riverbed';
  return geometry;
}

/** All decorative positions and surface fields are deterministic. This owner
 * contains the setting only; no mass, water displacement or specimen state. */
export function createShoreEnvironment(): ShoreEnvironment {
  const group = new THREE.Group(); group.name = 'open-river-shore';
  const geometries: THREE.BufferGeometry[] = [], materials: THREE.Material[] = [];
  const focus = { value: 0 };
  const ownGeometry = <T extends THREE.BufferGeometry>(geometry: T): T => { geometries.push(geometry); return geometry; };
  const ownMaterial = <T extends THREE.Material>(material: T): T => { materials.push(material); return material; };
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = group) => {
    const value = new THREE.Mesh(geometry, material); parent.add(value); return value;
  };
  const groundMaterial = ownMaterial(new THREE.MeshStandardMaterial({
    color: '#ffffff', vertexColors: true, roughness: .94, metalness: 0, envMapIntensity: .34,
  }));
  groundMaterial.onBeforeCompile = shader => {
    shader.uniforms.shoreFocus = focus;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vShoreGround;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvShoreGround = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vShoreGround;
        uniform float shoreFocus;
        float shoreHash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float shoreNoise(vec2 p) {
          vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(shoreHash(i),shoreHash(i+vec2(1.,0.)),f.x),
            mix(shoreHash(i+vec2(0.,1.)),shoreHash(i+vec2(1.,1.)),f.x),f.y);
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 p=vShoreGround.xz;
        float grain=shoreNoise(p*185.);
        float gravel=shoreNoise(p*49.);
        diffuseColor.rgb *= .94 + grain*.08 + gravel*.035;
        float submerged=1.-smoothstep(-.14,.06,vShoreGround.y);
        // Stationary light filaments hint at a clear water column. They are
        // optical illustration, not a ray-traced or animated caustics solver.
        vec2 bend=vec2(shoreNoise(p*1.5),shoreNoise(p*1.5+5.7));
        float cells=abs(sin(p.x*3.7+bend.y*3.)*sin(p.y*3.1+bend.x*3.));
        float filament=pow(1.-cells,22.);
        diffuseColor.rgb += vec3(.026,.040,.033)*filament*submerged*(1.-shoreFocus*.65);
        diffuseColor.rgb *= 1.-.19*smoothstep(.12,2.2,-vShoreGround.y);
        diffuseColor.rgb *= 1.-shoreFocus*.20*submerged;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        float relief=shoreNoise(vShoreGround.xz*113.);
        vec3 dx=dFdx(-vViewPosition),dy=dFdy(-vViewPosition);
        vec3 r1=cross(dy,normal),r2=cross(normal,dx);
        float determinant=dot(dx,r1);
        vec3 gradient=sign(determinant)*(dFdx(relief)*r1+dFdy(relief)*r2)*.00035;
        normal=normalize(max(abs(determinant),1.e-9)*normal-gradient);`);
  };
  groundMaterial.customProgramCacheKey = () => 'buoyancy-shore-sand-v1';
  const terrain = mesh(ownGeometry(riverbedGeometry()), groundMaterial); terrain.receiveShadow = true;

  // A few stable water-worn stones frame an unobstructed central resting area.
  const pebble = ownGeometry(new THREE.SphereGeometry(1, 24, 16));
  const position = pebble.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const lobes = 1 + .055 * Math.sin(x * 4.1 + z * 3.7) + .025 * Math.cos(y * 7.9 + x * 2.6);
    position.setXYZ(i, x * lobes, y * .58 * lobes, z * .79 * lobes);
  }
  pebble.computeVertexNormals();
  const stoneFinishes = ['#78877b', '#9a9b81', '#687d79', '#b3ac91'].map(color => ownMaterial(new THREE.MeshStandardMaterial({
    color, roughness: .63, metalness: 0, envMapIntensity: .48,
  })));
  const sites = [
    [-4.2, -.3, .25], [-3.7, 1.5, .18], [-2.8, 2.7, .10], [3.1, 2.8, .13],
    [4.4, 1.4, .26], [3.4, -.8, .18], [4.2, -2.3, .31], [2.8, -3.8, .24],
    [-2.2, -3.4, .17], [-3.7, -3.8, .20], [1.7, -3.6, .12], [4.9, 3.3, .12],
    [-4.8, 3.3, .12], [2.6, 3.8, .08], [-1.2, 3.5, .07], [.8, -2.5, .08],
    [-2.3, 1.7, .07], [2.4, -.6, .07], [5.4, -.8, .14], [-5.2, -2.4, .17],
    [3.1, -4.7, .18], [2.2, -4.8, .11], [-.8, -4.4, .10], [4.1, -4.5, .12],
  ];
  sites.forEach(([x, z, size], i) => {
    const value = mesh(pebble, stoneFinishes[i % stoneFinishes.length]);
    value.scale.set(size * (1.1 + i % 3 * .11), size, size);
    value.rotation.set(.07 * Math.sin(i), i * 1.731, .1 * Math.cos(i));
    value.position.set(x, shoreGroundHeight(x, z) + size * .36, z);
    value.castShadow = value.receiveShadow = true;
  });

  // Sparse reeds stay behind the teaching object and attach to real bank sites.
  const stemMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: '#6d7950', roughness: .91, side: THREE.DoubleSide }));
  const leafMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: '#7d8b53', roughness: .88, side: THREE.DoubleSide }));
  for (let i = 0; i < 11; i++) {
    const x = 3.0 + .17 * i + .13 * Math.sin(i * 2.1), z = -5.6 + .26 * Math.cos(i * 1.8);
    const y = shoreGroundHeight(x, z) - .02, height = .65 + .42 * (.5 + .5 * Math.sin(i * 1.72));
    const lean = .13 * Math.sin(i * 2.7);
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x, y, z),
      new THREE.Vector3(x + lean * .35, y + height * .55, z), new THREE.Vector3(x + lean, y + height, z + .05));
    const stem = mesh(ownGeometry(new THREE.TubeGeometry(curve, 8, .009, 5, false)), stemMaterial);
    stem.castShadow = true;
    const leafPositions: number[] = [], leafIndices: number[] = [];
    for (let j = 0; j <= 12; j++) {
      const t = j / 12, start = curve.getPoint(.30), reach = .38 + .07 * Math.sin(i), direction = i % 2 ? 1 : -1;
      const cx = start.x + direction * reach * t, cy = start.y + .42 * Math.sin(t * Math.PI * .65), cz = start.z + .07 * t;
      const width = .028 * Math.sin(t * Math.PI);
      leafPositions.push(cx, cy, cz - width, cx, cy, cz + width);
      if (j < 12) { const a = j * 2; leafIndices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const leafGeometry = new THREE.BufferGeometry();
    leafGeometry.setAttribute('position', new THREE.Float32BufferAttribute(leafPositions, 3));
    leafGeometry.setIndex(leafIndices); leafGeometry.computeVertexNormals();
    mesh(ownGeometry(leafGeometry), leafMaterial);
  }
  return { group, geometries, materials, setTeachingFocus(value) { focus.value = THREE.MathUtils.clamp(value, 0, 1); } };
}

/** Outdoor illumination only. This texture is never a visible backdrop; its
 * sky, warm sun and muted lower hemisphere give metal readable reflections. */
export function createShoreLightTexture(): THREE.DataTexture {
  const width = 256, height = 128, data = new Float32Array(width * height * 4);
  const upper = new THREE.Color('#b9dbe8'), horizon = new THREE.Color('#e0e9e8'), ground = new THREE.Color('#7f9291');
  const sun = new THREE.Vector3(-.43, .73, .53).normalize();
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const phi = y / (height - 1) * Math.PI, theta = x / width * Math.PI * 2;
    const direction = new THREE.Vector3(-Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
    const colour = direction.y >= 0 ? horizon.clone().lerp(upper, Math.sqrt(direction.y))
      : horizon.clone().lerp(ground, Math.min(1, -direction.y * 2));
    colour.multiplyScalar(.84);
    const disc = Math.exp(-(1 - direction.dot(sun)) * 2100) * 12;
    const glow = Math.exp(-(1 - direction.dot(sun)) * 36) * .19;
    colour.add(new THREE.Color(1, .92, .79).multiplyScalar(disc + glow));
    const i = (y * width + x) * 4; data[i] = colour.r; data[i + 1] = colour.g; data[i + 2] = colour.b; data[i + 3] = 1;
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType);
  texture.name = 'buoyancy-open-shore-light'; texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.LinearSRGBColorSpace; texture.needsUpdate = true;
  return texture;
}
