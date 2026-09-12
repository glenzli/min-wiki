export type ObjectKind = 'wood' | 'stone' | 'steel' | 'clay';
export type Experiment = 'objects' | 'boat' | 'depth';
export interface Settings { experiment: Experiment; object: ObjectKind; boat: boolean; cargo: number; salt: boolean; depth: number }
export const OBJECTS = { wood: { mass: 300, volume: 600 }, stone: { mass: 500, volume: 200 }, steel: { mass: 700, volume: 90 }, clay: { mass: 600, volume: 400 } } as const;
export function buoyancy(s: Settings) {
  const density = s.salt ? 1.025 : 1;
  const cargo = Math.max(0, Math.min(12, Math.round(s.cargo)));
  const object = s.experiment === 'depth' ? { mass: 1200, volume: 1000 } : s.experiment === 'boat' ? OBJECTS.clay : OBJECTS[s.object];
  const isBoat = s.experiment === 'boat' && s.boat;
  const mass = object.mass + (s.experiment === 'boat' ? cargo * 100 : 0);
  const solidVolume = object.volume + (s.experiment === 'boat' ? cargo * 40 : 0);
  const capacity = isBoat ? 1400 : solidVolume;
  const flooded = isBoat && mass >= density * capacity;
  const held = s.experiment === 'depth';
  const floating = !held && mass < density * capacity;
  const displaced = held ? object.volume * Math.min(1, Math.max(0, s.depth / 100)) : floating ? mass / density : solidVolume;
  const force = displaced * density * 9.81 / 1000;
  const weight = mass * 9.81 / 1000;
  return { density, mass, capacity, solidVolume, displaced, force, weight, floating, flooded, held, fraction: floating ? displaced / capacity : 1, support: Math.max(0, weight - force) };
}
