import * as THREE from 'three';
import { noise, field, smooth, type World } from './model.ts';
import { palette, seed } from './surfacePainter.ts';

/** Representative relief, never a measured map. One stable height field feeds meshes and rocks. */
export function terrainHeight(world: World, x: number, z: number): number {
  const n = noise(x * 21, z * 21), fine = noise(x * 77 + 47, z * 77);
  if (!world.surface) return .28 * n + fine * .1;
  if (world.id === 'mercury') {
    let h = n * .55 + fine * .12;
    for (const [cx, cz, r] of [[0, 0, 3.7], [-6, -4, 2.1], [6, 6, 2.4]]) {
      const radius = Math.hypot(x - cx!, z - cz!) / r!;
      h += -1.15 * Math.exp(-(radius ** 4) * 2.5) + .66 * Math.exp(-(((radius - 1) / .14) ** 2));
    }
    return h;
  }
  if (world.id === 'venus') return n * .4 + fine * .12 + 2.8 * Math.exp(-((x + 1) ** 2 + (z + 3) ** 2) / 23);
  if (world.id === 'mars') {
    const plateau = smooth(-.03, .21, noise(x * 9 - 360, z * 9 + 27));
    return plateau * 2.1 + n * .3 + fine * .09 + (1 - plateau) * Math.sin(x * 2.5 + z * 1.1 + n * 4) * .1;
  }
  if (world.id === 'earth') return n * 2.1 + x * .09 + z * .025;
  if (world.id === 'titan') return n * .82 + x * .07 + z * .022;
  return n * .65 + fine * .17 - .28;
}

function groundColor(world: World, x: number, z: number, height: number) {
  const base = palette[world.id].rock;
  const c = new THREE.Color().setRGB(base[0] / 255, base[1] / 255, base[2] / 255, THREE.SRGBColorSpace);
  const grain = field(x * 13, z * 13), n = noise(x * 45, z * 45);
  if (!world.surface) {
    const bands = .5 + .28 * Math.sin(z * 1.6 + n * 3);
    c.lerp(new THREE.Color(world.id === 'neptune' ? '#bfdde2' : '#f0dbc0'), bands);
  } else if (world.id === 'mars') c.lerp(new THREE.Color('#694c3f'), (Math.sin(height * 19) * .5 + .5) * .21);
  else if (world.id === 'earth') c.lerp(new THREE.Color('#476147'), smooth(.1, .7, height) * .74);
  else if (world.id === 'cancri') c.set('#473833');
  return c.multiplyScalar(.88 + n * .16 + grain * .06);
}

export class TerrainPatch {
  readonly group = new THREE.Group();
  private water?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private cloudSheets: THREE.Mesh[] = [];
  constructor(readonly world: World) {
    const geometry = new THREE.PlaneGeometry(70, 70, 240, 240);
    geometry.rotateX(-Math.PI / 2);
    const vertices = geometry.getAttribute('position'), colors = new Float32Array(vertices.count * 3);
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), z = vertices.getZ(i), h = terrainHeight(world, x, z);
      vertices.setY(i, h);
      const color = groundColor(world, x, z, h); color.toArray(colors, i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geometry.computeVertexNormals();
    const grain = new Uint8Array(128 * 128 * 4);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const i = (y * 128 + x) * 4, value = 128 + field(x * .31, y * .31) * 65 + (seed(i + 21) - .5) * 35;
      grain[i] = grain[i + 1] = grain[i + 2] = value; grain[i + 3] = 255;
    }
    const bump = new THREE.DataTexture(grain, 128, 128, THREE.RGBAFormat);
    bump.wrapS = bump.wrapT = THREE.RepeatWrapping; bump.repeat.set(20, 20);
    bump.minFilter = bump.magFilter = THREE.LinearFilter; bump.needsUpdate = true;
    const ground = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: 0,
      bumpMap: world.surface ? bump : null, bumpScale: world.surface ? .037 : 0 }));
    if (!world.surface) bump.dispose();
    this.group.add(ground);
    if (world.liquid !== 'none') {
      const molten = world.liquid === 'silicate-melt';
      const liquid = new THREE.MeshStandardMaterial({ color: molten ? '#f67425' : world.id === 'earth' ? '#357c8c' : '#53503c',
        emissive: molten ? '#ed5010' : '#000000', emissiveIntensity: molten ? .75 : 0,
        roughness: molten ? .5 : .27, metalness: molten ? .1 : .25, transparent: !molten, opacity: molten ? 1 : .92 });
      if (molten) {
        // A static, coherent crust/melt field: orbiting changes perspective, not its pattern.
        const pixels = new Uint8Array(512 * 512 * 4), dark = new THREE.Color('#4f2115'), hot = new THREE.Color('#ff871e');
        for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
          const n = noise(x * 2.1, y * 2.1), fine = field(x * .18, y * .18);
          const fresh = smooth(-.3, .4, n + fine * .18), color = dark.clone().lerp(hot, fresh).convertLinearToSRGB();
          const i = (y * 512 + x) * 4; pixels[i] = color.r * 255; pixels[i + 1] = color.g * 255; pixels[i + 2] = color.b * 255; pixels[i + 3] = 255;
        }
        const melt = new THREE.DataTexture(pixels, 512, 512, THREE.RGBAFormat);
        melt.colorSpace = THREE.SRGBColorSpace; melt.wrapS = melt.wrapT = THREE.RepeatWrapping;
        melt.repeat.set(1, 1); melt.minFilter = melt.magFilter = THREE.LinearFilter; melt.needsUpdate = true;
        liquid.map = melt; liquid.emissiveMap = melt; liquid.color.set('#ffffff'); liquid.emissive.set('#ff9c36'); liquid.emissiveIntensity = .35;
      }
      const plane = new THREE.PlaneGeometry(70, 70, 96, 96); plane.rotateX(-Math.PI / 2);
      this.water = new THREE.Mesh(plane, liquid); this.water.position.y = .04; this.group.add(this.water);
    }
    if (!world.surface) this.addClouds();
    else if (world.liquid === 'none') {
      const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
      const rockMaterial = new THREE.MeshStandardMaterial({ color: world.id === 'mercury' ? '#888278' : world.id === 'mars' ? '#735547' : '#87704c', roughness: 1 });
      const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, 145), dummy = new THREE.Object3D();
      for (let i = 0; i < 145; i++) {
        const x = (seed(i + 17) - .5) * 37, z = (seed(i + 216) - .5) * 37, r = .035 + seed(i + 87) ** 5 * .34;
        dummy.position.set(x, terrainHeight(world, x, z) + r * .23, z);
        dummy.rotation.set(seed(i) * 2, seed(i + 9) * 6, seed(i + 21)); dummy.scale.set(r * 1.2, r * .63, r);
        dummy.updateMatrix(); rocks.setMatrixAt(i, dummy.matrix);
      }
      this.group.add(rocks);
    }
    this.animate(0);
  }
  private addClouds() {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
    const c = canvas.getContext('2d')!, data = c.createImageData(256, 128);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 256; x++) {
      const n = noise(x * 2, y * 4.3), a = smooth(.03, .42, n);
      const index = (y * 256 + x) * 4;
      data.data[index] = 230; data.data[index + 1] = 233; data.data[index + 2] = 219; data.data[index + 3] = a * 140;
    }
    c.putImageData(data, 0, 0); const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    for (let i = 0; i < 3; i++) {
      const geometry = new THREE.PlaneGeometry(68, 68, 24, 24); geometry.rotateX(-Math.PI / 2);
      const p = geometry.getAttribute('position');
      for (let j = 0; j < p.count; j++) p.setY(j, .45 + i * .38 + noise(p.getX(j) * 25, p.getZ(j) * 25 + i * 170) * .3);
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: texture, transparent: true, opacity: .62 - i * .1, depthWrite: false, side: THREE.DoubleSide }));
      mesh.rotation.y = i * .11; this.cloudSheets.push(mesh); this.group.add(mesh);
    }
  }
  animate(time: number) {
    if (this.water) {
      const p = this.water.geometry.getAttribute('position');
      for (let i = 0; i < p.count; i++) p.setY(i, Math.sin(p.getX(i) * 2.6 + time * .7) * Math.sin(p.getZ(i) * 1.4 - time * .35) * .024);
      p.needsUpdate = true; this.water.geometry.computeVertexNormals();
    }
    this.cloudSheets.forEach((cloud, i) => { cloud.position.x = Math.sin(time * .035 + i) * .45; });
  }
  dispose() {
    const textures = new Set<THREE.Texture>();
    this.group.traverse(object => { if (object instanceof THREE.Mesh) {
      object.geometry.dispose(); const material = object.material as THREE.MeshStandardMaterial;
      if (material.map) textures.add(material.map); if (material.bumpMap) textures.add(material.bumpMap); if (material.emissiveMap) textures.add(material.emissiveMap); material.dispose();
    } });
    textures.forEach(texture => texture.dispose()); this.group.clear();
  }
}
