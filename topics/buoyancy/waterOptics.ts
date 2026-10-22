import * as THREE from 'three';

type ScalarUniform = { value: number };

export type WaterOptics = {
  side: THREE.MeshPhysicalMaterial;
  surface: THREE.MeshPhysicalMaterial;
  floorLight: THREE.MeshBasicMaterial;
  materials: THREE.Material[];
};

// Three r170 projects a refracted ray into its opaque transmission buffer. Its
// default incident direction assumes a perspective camera; parallel rays must
// remain parallel across the orthographic lab's water plane.
const transmissionFragment = THREE.ShaderChunk.transmission_fragment.replace(
  'vec3 v = normalize( cameraPosition - pos );',
  `vec3 v = isOrthographic
    ? inverseTransformDirection(vec3(0.0, 0.0, 1.0), viewMatrix)
    : normalize(cameraPosition - pos);`,
);

function physicalWater(thickness: number, roughness: number) {
  return new THREE.MeshPhysicalMaterial({
    color: '#ffffff', metalness: 0, roughness, transmission: 1, opacity: 1,
    ior: 1.333, thickness, attenuationColor: new THREE.Color('#c5edf2'),
    // Restrained display tint separates the water from the pale tabletop;
    // this distance is an art parameter, not measured pure-water absorption.
    attenuationDistance: 1.2, specularIntensity: 1, envMapIntensity: 1,
    transparent: false, depthWrite: true, side: THREE.FrontSide,
  });
}

/** Water uses the renderer's shared opaque transmission buffer, not nested
 * ray tracing. Local optical slab thickness is intentionally modest: the
 * normalized side geometry has a changing vertical model scale. The caller
 * retains the level, horizontal surface/cavity geometry and finite clock. */
export function createWaterOptics(_waterLevel: ScalarUniform, ripple: ScalarUniform): WaterOptics {
  const side = physicalWater(.16, .035);
  side.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <transmission_fragment>', transmissionFragment);
  };
  side.customProgramCacheKey = () => 'buoyancy-water-volume-transmission-v7';

  const surface = physicalWater(.22, .025);
  surface.onBeforeCompile = shader => {
    shader.uniforms.waterOpticalRipple = ripple;
    shader.vertexShader = `varying vec3 vWaterWorld;\n${shader.vertexShader}`
      .replace('#include <begin_vertex>', /* glsl */`
        #include <begin_vertex>
        vWaterWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
      `);
    shader.fragmentShader = /* glsl */`
      varying vec3 vWaterWorld;
      uniform float waterOpticalRipple;
      ${shader.fragmentShader}
    `
      .replace('#include <normal_fragment_maps>', /* glsl */`
        #include <normal_fragment_maps>
        // Perturb optical normals during the existing finite entry transition.
        // At rest the plane is optically flat; no permanent wave pattern is drawn.
        vec2 waterPoint = vWaterWorld.xz;
        float disturbance = clamp(waterOpticalRipple, 0.0, 1.0);
        float phase = disturbance * 2.1;
        float waveA = dot(waterPoint, vec2(4.9, 2.7)) + .42 * sin(waterPoint.y * 3.1) + phase;
        float waveB = dot(waterPoint, vec2(-2.1, 7.3)) + .51 * sin(waterPoint.x * 2.2) + 1.4 - phase * .67;
        vec2 waterSlope = vec2(4.9, 2.7 + 1.302 * cos(waterPoint.y * 3.1)) * cos(waveA)
          + vec2(-2.1 + 1.122 * cos(waterPoint.x * 2.2), 7.3) * cos(waveB) * .46;
        waterSlope *= disturbance * .0045;
        vec3 opticalNormal = normalize(vec3(-waterSlope.x, 1.0, -waterSlope.y));
        normal = normalize((viewMatrix * vec4(opticalNormal * faceDirection, 0.0)).xyz);
      `)
      .replace('#include <transmission_fragment>', transmissionFragment);
  };
  surface.customProgramCacheKey = () => 'buoyancy-water-surface-transmission-v7';

  // Preserve the scene's existing resource API, while dropping the illustrative
  // floor-light overlay. This transmission pass does not calculate caustics.
  const floorLight = new THREE.MeshBasicMaterial({
    color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, visible: false,
  });

  return { side, surface, floorLight, materials: [side, surface, floorLight] };
}
