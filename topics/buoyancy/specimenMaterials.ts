import * as THREE from 'three';

export type SpecimenMaterials = {
  wood: THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];
  stone: THREE.MeshStandardMaterial;
  clay: THREE.MeshStandardMaterial;
  hull: THREE.MeshStandardMaterial;
  metal: THREE.MeshPhysicalMaterial;
  cargo: THREE.MeshStandardMaterial;
  materials: THREE.Material[];
  textures: THREE.Texture[];
};

type Finish = 'wood' | 'stone' | 'clay' | 'hull' | 'metal' | 'cargo';
type WoodPhotographs = {
  colour: THREE.Texture;
  height: THREE.Texture;
  roughness: THREE.Texture;
  ready: { value: number };
  stopLoading: () => void;
};

/** Local derivatives of Poly Haven's CC0 photographed wood. Image requests
 * have no permission to update the material after its owner is disposed. */
function createWoodPhotographs(onReady?: () => void): WoodPhotographs {
  const colour = new THREE.Texture(), height = new THREE.Texture(), roughness = new THREE.Texture();
  const ready = { value: 0 };
  let disposed = false, loaded = 0;
  const stopLoading = () => { disposed = true; ready.value = 0; };
  const files: [THREE.Texture, string][] = [
    [colour, new URL('./assets/wood-table-001-color.webp', import.meta.url).href],
    [height, new URL('./assets/wood-table-001-height.webp', import.meta.url).href],
    [roughness, new URL('./assets/wood-table-001-roughness.webp', import.meta.url).href],
  ];
  for (const [texture, url] of files) {
    texture.name = url.slice(url.lastIndexOf('/') + 1);
    texture.colorSpace = texture === colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 4;
    texture.addEventListener('dispose', stopLoading);
    // Source/contract checks can import and instantiate the factory in Node.
    // Browser image loading is deliberately kept out of that environment.
    if (typeof document === 'undefined') continue;
    new THREE.ImageLoader().load(url, image => {
      if (disposed) return;
      texture.image = image;
      texture.needsUpdate = true;
      loaded++;
      if (loaded === files.length) {
        ready.value = 1;
        onReady?.();
      }
    }, undefined, () => {
      // Keep the complete procedural material if any local image fails.
    });
  }
  return { colour, height, roughness, ready, stopLoading };
}

/** One small, periodic grain volume. Surface colour and relief share its sites. */
function createGrainVolume() {
  const size = 32, data = new Uint8Array(size ** 3);
  let state = 0x4b1d52a7;
  for (let i = 0; i < data.length; i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    data[i] = Math.round((state >>> 0) / 0xffffffff * 255);
  }
  const texture = new THREE.Data3DTexture(data, size, size, size);
  texture.name = 'buoyancy-specimen-grain';
  texture.format = THREE.RedFormat;
  texture.type = THREE.UnsignedByteType;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.RepeatWrapping;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return texture;
}

const surfaceFunctions = /* glsl */`
uniform highp sampler3D specimenGrain;
uniform float specimenWaterLevel;
varying vec3 vSpecimenPoint;
varying vec3 vSpecimenNormal;
varying vec2 vSpecimenUV;
varying float vSpecimenHeight;

float specimenNoise(vec3 p) {
  // Linear volume sampling is continuous across all faces, including end grain.
  return texture(specimenGrain, (p + vec3(8.7, 2.1, 15.3)) / 32.).r;
}
float specimenFine(vec3 p) {
  float footprint = max(length(dFdx(p)), length(dFdy(p)));
  return mix(specimenNoise(p), .5, smoothstep(.65, 1.8, footprint));
}
float specimenCloud(vec3 p) {
  return .61 * specimenNoise(p) + .27 * specimenNoise(p * 2.09 + 7.1)
    + .12 * specimenNoise(p * 4.31 - 4.7);
}

// A surface-gradient bump keeps the shading attached to rounded and irregular
// geometry without requiring UV seams or changing its illustrative silhouette.
vec3 specimenBump(vec3 point, vec3 normal, float height, float face) {
  vec3 dx = dFdx(point), dy = dFdy(point);
  vec3 rx = cross(dy, normal), ry = cross(normal, dx);
  float determinant = dot(dx, rx) * face;
  vec3 gradient = sign(determinant) * (dFdx(height) * rx + dFdy(height) * ry);
  return normalize(max(abs(determinant), 1.e-10) * normal - gradient);
}
`;

const photographedTimber = /* glsl */`
  if (specimenWoodReady > .5) {
    vec3 p = vSpecimenPoint;
    // A continuous radial coordinate wraps the four long faces and their
    // bevels. The photographed fibres run along local X; at either cut end,
    // the same radial field becomes growth rings instead of lengthwise grain.
    // This crop stays inside the source tile, avoiding all six decal seams.
    float bend = .012 * sin(p.x * 3.2 + .4);
    vec2 section = vec2(p.y + .66 + bend, p.z * .94 + .24);
    float radius = length(section);
    vec2 woodUV = vec2(.13 + radius * .45, .50 + p.x * .78);
    vec3 photograph = texture2D(specimenWoodColour, woodUV).rgb;
    float photographicHeight = texture2D(specimenWoodHeight, woodUV).r;
    float photographicRoughness = texture2D(specimenWoodRoughness, woodUV).r;
    specimenColour = photograph;
    specimenRelief = (photographicHeight - .5) * .0024;
    // The source is a finished tabletop. Its measured grain is retained,
    // while a deliberately matte finish represents the illustrative sample.
    specimenRoughness = .66 + photographicRoughness * .22;
  }
`;

const finishes: Record<Finish, string> = {
  wood: /* glsl */`
    vec3 p = vSpecimenPoint;
    float end = pow(abs(normalize(vSpecimenNormal).x), 8.);
    float curl = specimenCloud(vec3(p.x * 1.6, p.y * 3.4, p.z * 3.4));
    // A nearby, slowly bending trunk axis makes the same growth layers form
    // cathedral grain on the broad faces and curved rings on the cut ends.
    // One small branch distorts those fibres locally rather than painting on
    // an unrelated knot or repeating equally spaced bands across the block.
    vec3 branchPoint = (p - vec3(.16, .10, .49)) / vec3(.24, .18, .32);
    float branch = exp(-dot(branchPoint, branchPoint));
    float along = p.x + .12;
    vec2 across = vec2(p.y + .64 + .42 * along * along,
      p.z * .94 + .24 + .105 * sin(p.x * 2.9 + .2));
    float radial = length(across) + (curl - .5) * .075 + branch * .145;
    float growth = radial * 39. + specimenCloud(vec3(radial * 7.1, p.x * 1.1, 4.3)) * 3.8;
    float late = smoothstep(.76, .985, sin(growth));
    late *= 1. - smoothstep(.4, 1.5, fwidth(growth));
    vec3 fibres = vec3(p.x, p.y + branch * .10 + .025 * sin(p.x * 4.7), p.z);
    float fibre = specimenFine(fibres * vec3(5.2, 171., 171.));
    float streak = specimenNoise(fibres * vec3(1.5, 39., 39.));
    float pore = smoothstep(.68, .88, specimenFine(fibres * vec3(23., 214., 214.)));
    vec3 timber = mix(vec3(.40, .205, .078), vec3(.60, .375, .174), .24 + curl * .67);
    timber *= 1. - late * mix(.21, .26, end);
    timber *= .92 + streak * .13 + (fibre - .5) * .06;
    timber *= 1. - branch * .10;
    timber *= 1. - pore * .11;
    specimenColour = timber;
    specimenRelief = (fibre - .5) * .00065 - pore * .00055 - late * .00022;
    specimenRoughness = .70 + pore * .10 + (1. - fibre) * .065;
  `,
  stone: /* glsl */`
    vec3 p = vSpecimenPoint + vec3(1.9, 3.1, 6.7);
    float cloud = specimenCloud(p * 4.1);
    float mineral = specimenFine(p * 67.);
    float fine = specimenFine(p * 169.);
    float pale = smoothstep(.60, .80, mineral);
    float dark = 1. - smoothstep(.20, .37, specimenFine(p * 91.));
    float pit = smoothstep(.70, .87, specimenFine(p * 137.));
    vec3 rock = mix(vec3(.155, .171, .163), vec3(.335, .348, .317), cloud);
    rock = mix(rock, vec3(.45, .443, .386), pale * .50);
    rock = mix(rock, vec3(.067, .078, .075), dark * .43);
    rock *= .93 + fine * .14;
    rock *= 1. - pit * .20;
    specimenColour = rock;
    specimenRelief = (cloud - .5) * .006 + (mineral - .5) * .0026
      + (fine - .5) * .00065 - pit * .0012;
    specimenRoughness = clamp(.78 + fine * .14 + pit * .08 - pale * .04, .72, .97);
  `,
  clay: /* glsl */`
    vec3 p = vSpecimenPoint;
    float knead = specimenCloud(p * 5.1 + vec3(4.2, 1.7, 9.3));
    float fine = specimenFine(p * 153.);
    float pore = smoothstep(.71, .88, specimenFine(p * 219.));
    vec3 earth = mix(vec3(.405, .166, .084), vec3(.485, .228, .123), knead);
    earth *= .97 + fine * .055;
    earth *= 1. - pore * .075;
    specimenColour = earth;
    specimenRelief = (knead - .5) * .00065 + (fine - .5) * .00045 - pore * .0005;
    specimenRoughness = .80 + pore * .10 + (1. - fine) * .065;
  `,
  hull: /* glsl */`
    // The hull's authored positions already contain its current world height.
    // Its retained profile/angle UVs keep clay grains fixed while it moves or
    // reshapes, and close the angular seam without a duplicated decal edge.
    float angle = vSpecimenUV.x * 2.094395102;
    vec3 p = vec3(cos(angle) * .62, vSpecimenUV.y * .71, sin(angle) * .62);
    float knead = specimenCloud(p * 5.1 + vec3(4.2, 1.7, 9.3));
    float fine = specimenFine(p * 153.);
    float pore = smoothstep(.71, .88, specimenFine(p * 219.));
    vec3 earth = mix(vec3(.405, .166, .084), vec3(.485, .228, .123), knead);
    earth *= .97 + fine * .055;
    earth *= 1. - pore * .075;
    specimenColour = earth;
    specimenRelief = (knead - .5) * .00065 + (fine - .5) * .00045 - pore * .0005;
    specimenRoughness = .80 + pore * .10 + (1. - fine) * .065;
  `,
  metal: /* glsl */`
    vec3 p = vSpecimenPoint;
    float brushing = specimenFine(vec3(p.x * 4., p.y * 244., p.z * 157.));
    float satin = specimenCloud(p * 8.7);
    specimenColour = vec3(.56, .61, .64) * (.95 + satin * .07 + (brushing - .5) * .035);
    specimenRelief = (brushing - .5) * .00019;
    specimenRoughness = .24 + brushing * .075 + satin * .025;
  `,
  cargo: /* glsl */`
    vec3 p = vSpecimenPoint;
    float brushing = specimenFine(vec3(p.x * 5.1, p.y * 191., p.z * 133.));
    float satin = specimenCloud(p * 7.9 + vec3(4.1, 9.2, 1.7));
    specimenColour = vec3(.66, .428, .174) * (.94 + satin * .10 + (brushing - .5) * .04);
    specimenRelief = (brushing - .5) * .00018;
    specimenRoughness = .29 + brushing * .07 + satin * .03;
  `,
};

function attachFinish<T extends THREE.MeshStandardMaterial>(
  material: T,
  kind: Finish,
  grain: THREE.Data3DTexture,
  waterLevel: { value: number },
  photographs?: WoodPhotographs,
) {
  const wet = {
    wood: { darken: .86, roughness: .43 },
    stone: { darken: .76, roughness: .50 },
    clay: { darken: .90, roughness: .61 },
    hull: { darken: .90, roughness: .61 },
    metal: { darken: .98, roughness: .22 },
    cargo: { darken: .98, roughness: .26 },
  }[kind];
  material.name = `buoyancy-${kind}`;
  material.onBeforeCompile = shader => {
    shader.uniforms.specimenGrain = { value: grain };
    shader.uniforms.specimenWaterLevel = waterLevel;
    if (photographs) {
      shader.uniforms.specimenWoodColour = { value: photographs.colour };
      shader.uniforms.specimenWoodHeight = { value: photographs.height };
      shader.uniforms.specimenWoodRoughness = { value: photographs.roughness };
      shader.uniforms.specimenWoodReady = photographs.ready;
    }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vSpecimenPoint;
        varying vec3 vSpecimenNormal;
        varying vec2 vSpecimenUV;
        varying float vSpecimenHeight;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vSpecimenPoint = position;
        vSpecimenNormal = normal;
        vSpecimenUV = uv;`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vSpecimenHeight = (modelMatrix * vec4(transformed, 1.)).y;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${surfaceFunctions}
        ${photographs ? `uniform sampler2D specimenWoodColour;
          uniform sampler2D specimenWoodHeight;
          uniform sampler2D specimenWoodRoughness;
          uniform float specimenWoodReady;` : ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 specimenColour = vec3(1.);
        float specimenRelief = 0.;
        float specimenRoughness = roughness;
        ${photographs ? `if (specimenWoodReady < .5) { ${finishes[kind]} }` : finishes[kind]}
        ${photographs ? photographedTimber : ''}
        float specimenWet = 1. - smoothstep(specimenWaterLevel - .014, specimenWaterLevel + .008, vSpecimenHeight);
        diffuseColor.rgb *= specimenColour * mix(1., ${wet.darken.toFixed(3)}, specimenWet);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(specimenRoughness, ${wet.roughness.toFixed(3)}, specimenWet);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        normal = specimenBump(-vViewPosition, normal, specimenRelief, faceDirection);`);
  };
  material.customProgramCacheKey = () => `buoyancy-specimen-${kind}-${photographs ? 'photo-v1' : 'v2'}`;
  return material;
}

/** Topic-owned, nonmetric surface detail. The caller owns every returned GPU
 * resource and the water-level uniform; this factory has no animation clock. */
export function createSpecimenMaterials(waterLevel: { value: number }, onReady?: () => void): SpecimenMaterials {
  const grain = createGrainVolume();
  const photographs = createWoodPhotographs(onReady);
  const standard = (kind: Finish, options: THREE.MeshStandardMaterialParameters) =>
    attachFinish(new THREE.MeshStandardMaterial({ color: '#ffffff', ...options }), kind, grain, waterLevel);
  const wood = attachFinish(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .76, envMapIntensity: .55 }),
    'wood', grain, waterLevel, photographs);
  wood.addEventListener('dispose', photographs.stopLoading);
  const stone = standard('stone', { roughness: .88, envMapIntensity: .38 });
  const clay = standard('clay', { roughness: .87, envMapIntensity: .35 });
  const hull = standard('hull', { roughness: .87, envMapIntensity: .35, vertexColors: true, side: THREE.DoubleSide });
  const metal = attachFinish(new THREE.MeshPhysicalMaterial({
    color: '#ffffff', metalness: .96, roughness: .29,
    envMapIntensity: 1.1, anisotropy: .38, anisotropyRotation: 0,
  }), 'metal', grain, waterLevel);
  const cargo = standard('cargo', { metalness: .88, roughness: .34, envMapIntensity: 1.05 });
  return {
    wood, stone, clay, hull, metal, cargo,
    materials: [wood, stone, clay, hull, metal, cargo],
    textures: [grain, photographs.colour, photographs.height, photographs.roughness],
  };
}
