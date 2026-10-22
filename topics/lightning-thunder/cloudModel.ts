/** A reversible teaching reconstruction, not a cloud-microphysics or electric-field solver. */
export type ChargingCondition = 'sustained' | 'limited';
export type Vec3 = readonly [number, number, number];
export type CloudParticle = {
  id: string;
  kind: 'ice' | 'graupel' | 'droplet';
  position: Vec3;
  charge: -1 | 0 | 1;
  size: number;
};
export const CLOUD_PAIR_COUNT = 12;
export const CLOUD_DROPLET_COUNT = 28;
// Visual reaches along the encounter normal, in uncalibrated drawing units.
// Actual production cap/pole geometry and the SVG skeleton share these supports.
export const ICE_CONTACT_RADIUS = .25;
export const GRAUPEL_CONTACT_RADIUS = .24;
/** Fixed crystal shafts/twigs, shared by the 3D buffers and SVG fallback. */
export const iceCrystalSegments = Array.from({ length: 6 }, (_, j) => {
  const angle = j * Math.PI / 3 + Math.PI / 2, dx = Math.sin(angle), dy = Math.cos(angle);
  return [
    { start: [(ICE_CONTACT_RADIUS - .32) * dx, (ICE_CONTACT_RADIUS - .32) * dy], end: [ICE_CONTACT_RADIUS * dx, ICE_CONTACT_RADIUS * dy], top: .022, bottom: .031 },
    ...[-1, 1].map(side => {
      const x = Math.sin(angle + side * .75), y = Math.cos(angle + side * .75);
      return { start: [dx * .16 - x * .015, dy * .16 - y * .015], end: [dx * .16 + x * .095, dy * .16 + y * .095], top: .013, bottom: .018 };
    }),
  ];
}).flat();
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { const u = clamp(x); return u * u * (3 - 2 * u); };
const noise = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const cloudEncounters = Array.from({ length: CLOUD_PAIR_COUNT }, (_, i) => ({
  pair: i, progress: .28 * (.30 + noise(i + 101) * .15),
}));

export function chargeState(progress: number, condition: ChargingCondition = 'sustained') {
  const p = clamp(progress), strength = condition === 'limited' ? .34 : 1;
  return {
    separation: smooth((p - .09) / .19) * strength,
    field: smooth((p - .16) / .18) * strength,
    // The selected cases deliberately differ. This is not a computed breakdown threshold.
    flashEnabled: condition === 'sustained',
  };
}

/** Stable identities meet once, then move apart; seeking never re-rolls their geometry. */
export function cloudFrame(progress: number, condition: ChargingCondition = 'sustained') {
  const p = clamp(progress), q = clamp(p / .28), strength = condition === 'limited' ? .34 : 1;
  const particles: CloudParticle[] = [];
  let contacts = 0;
  for (let i = 0; i < CLOUD_PAIR_COUNT; i++) {
    const x = (noise(i + 11) - .5) * 3.9, y = (noise(i + 41) - .5) * 1.5;
    const z = (noise(i + 71) - .5) * 2.6, contact = cloudEncounters[i].progress / .28;
    const approach = smooth(q / contact), after = smooth((q - contact) / (1 - contact));
    const transferred = p >= cloudEncounters[i].progress;
    if (transferred) contacts++;
    const eddy = Math.sin(p * 14 + i * 2.7) * .055 * after;
    // Opposing surfaces meet without replacing one particle with another.
    const iceX = x - ICE_CONTACT_RADIUS - (1 - approach) * .50 - after * .30 + eddy;
    const graupelX = x + GRAUPEL_CONTACT_RADIUS + (1 - approach) * .26 + after * .24 + eddy;
    particles.push({ id: `ice-${i}`, kind: 'ice', charge: transferred ? 1 : 0, size: ICE_CONTACT_RADIUS,
      position: [iceX, y - (1 - approach) * 1.0 + after * 2.1 * strength, z + after * .15] });
    particles.push({ id: `graupel-${i}`, kind: 'graupel', charge: transferred ? -1 : 0, size: GRAUPEL_CONTACT_RADIUS,
      position: [graupelX, y + (1 - approach) * .75 - after * 1.55 * strength, z - after * .15] });
  }
  for (let i = 0; i < CLOUD_DROPLET_COUNT; i++) {
    const start = (noise(i + 201) - .5) * 3.8;
    particles.push({ id: `droplet-${i}`, kind: 'droplet', charge: 0, size: .035 + noise(i + 301) * .025,
      position: [start + Math.sin(q * 2.3 + i) * .12, -2.3 + noise(i + 251) * 4 + q * .72 * strength, (noise(i + 281) - .5) * 3.1] });
  }
  return { ...chargeState(p, condition), progress: p, particles, contacts,
    phase: q < .30 ? 'approach' : q < .47 ? 'contact' : q < .94 ? 'separate' : 'layered',
  } as const;
}
export type CloudFrame = ReturnType<typeof cloudFrame>;
