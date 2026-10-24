/** Bounded visible transport on an already supplied lava/dike surface.
 * The phase moves folds within that surface; it cannot extend a flow or a tip. */
const TAU = Math.PI * 2;
const CENTER_A = .055, CENTER_B = .025, FREQUENCY_A = 1.7, FREQUENCY_B = 4.3;
export const MELT_HALF_WIDTH = .18;
export const MELT_SPACING = .9;
export const MELT_PHASE_TRAVEL = 3;
/** Period of the illustrative transported skin, not a physical length scale. */
export const CRUST_PERIOD = 2.4;
export const meltChannelCenter = (distance: number) => .5 + CENTER_A * Math.sin(distance * FREQUENCY_A) + CENTER_B * Math.sin(distance * FREQUENCY_B);
export const MELT_CHANNEL_GLSL = `
float meltChannelCenter(float distance){return .5+${CENTER_A}*sin(distance*${FREQUENCY_A})+${CENTER_B}*sin(distance*${FREQUENCY_B});}
`;
const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));

const meltCarrier = (distance: number, across: number, phase: number) => distance * TAU / MELT_SPACING - phase * MELT_PHASE_TRAVEL + .7 * Math.sin(across * 4.7 + distance * .7);
const smooth = (low: number, high: number, value: number) => { const u = clamp((value - low) / (high - low)); return u * u * (3 - 2 * u); };
// Unequal, overlapping compression scales avoid a train of identical folds.
// Advecting the same scalar field carries each irregular brow and curled lip.
const crustShape = (s: number, across: number) => {
  const angle = s * TAU / CRUST_PERIOD;
  return clamp(.5 + .27 * Math.sin(angle * 2 + across * 3.7) + .18 * Math.sin(angle * 5 - across * 5.6) + .11 * Math.cos(angle * 3 + across * 7.4));
};

interface SourceSurface { positions: ArrayLike<number>; uvs: ArrayLike<number> }

/** A fixed-size nested ribbon. Source buffers remain untouched; only these
 * owned position/wave buffers change. Output stays between the source banks. */
export class MeltTransport {
  readonly positions: Float32Array;
  readonly uvs: Float32Array;
  readonly waves: Float32Array;
  /** Surface only: advected skin s/v, relative rind thickness, mobile fraction. */
  readonly crust?: Float32Array;
  readonly indices: number[] = [];
  private source: SourceSurface;
  private readonly guides: Float32Array;
  private readonly across = 8;
  private readonly rows: number;

  private constructor(source: SourceSurface, private readonly kind: 'surface' | 'sheet', private readonly face = 1) {
    this.source = source;
    this.rows = kind === 'surface' ? source.uvs.length / 2 / 11 : (source.positions.length / 3 - 2) / 8;
    this.positions = new Float32Array(this.rows * (this.across + 1) * 3);
    this.uvs = new Float32Array(this.rows * (this.across + 1) * 2);
    this.waves = new Float32Array(this.rows * (this.across + 1) * 2);
    if (kind === 'surface') this.crust = new Float32Array(this.rows * (this.across + 1) * 4);
    this.guides = new Float32Array(this.rows * 4);
    for (let row = 0; row < this.rows - 1; row++) for (let j = 0; j < this.across; j++) {
      const a = row * (this.across + 1) + j, b = a + this.across + 1;
      this.indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
    this.setSource(source); this.update(0, 1);
  }

  static surface(source: SourceSurface) { return new MeltTransport(source, 'surface'); }
  static sheet(source: SourceSurface, face: -1 | 1) { return new MeltTransport(source, 'sheet', face); }

  setSource(source: SourceSurface) {
    this.source = source;
    let distance = 0;
    for (let row = 0; row < this.rows; row++) {
      if (this.kind === 'surface') {
        this.guides[row * 4] = source.uvs[row * 11 * 2];
        continue;
      }
      const a = Math.max(0, row - 1), b = Math.min(this.rows - 1, row + 1);
      // Broad sheet faces follow the original positive path, including a
      // fractional advancing tip. The normal is local to that same path.
      const dx = this.center(b, 0) - this.center(a, 0), dy = this.center(b, 1) - this.center(a, 1);
      const length = Math.hypot(dx, dy) || 1;
      if (row) distance += Math.hypot(this.center(row, 0) - this.center(row - 1, 0), this.center(row, 1) - this.center(row - 1, 1));
      this.guides.set([distance, this.face * dy / length, -this.face * dx / length, 0], row * 4);
    }
  }

  private center(row: number, axis: number) {
    let sum = 0;
    for (let side = 0; side < 8; side++) sum += this.source.positions[(row * 8 + side) * 3 + axis];
    return sum / 8;
  }

  /** Does not allocate or mutate the input surface on a detail frame. */
  update(phase: number, mobility: number) {
    const moving = clamp(mobility), total = this.guides[(this.rows - 1) * 4];
    for (let row = 0; row < this.rows; row++) {
      const distance = this.guides[row * 4], endFade = clamp(distance / .15) * clamp((total - distance) / .16);
      for (let j = 0; j <= this.across; j++) {
        const across = j / this.across, envelope = Math.sin(Math.PI * across) ** 2;
        let crest=0,lip=0,shear=0;
        const skinS = distance - (moving > 0 ? phase * CRUST_PERIOD / TAU : 0);
        let thickness = 0, slip = 0;
        if (this.kind === 'surface') {
          const shape = crustShape(skinS, across);
          crest = smooth(.42, .87, shape);
          lip = clamp((crustShape(skinS - .045, across) - crustShape(skinS + .045, across)) * 4);
          shear = (crustShape(skinS, across + .18) - crustShape(skinS, across - .18)) * .027 * envelope * endFade * moving;
          slip = (shape - .5) * .045 * envelope * endFade * moving;
          const downstream = total > 0 ? distance / total : 0, margin = Math.abs(across - .5) * 2;
          thickness = clamp(.16 + downstream * .47 + margin ** 1.4 * .30 + (1 - moving) * .23);
        }else{
          // The surface branch replaces these sheet-only waves with its crust
          // field. Do not evaluate and immediately discard the trigonometry.
          const carrier=meltCarrier(distance,across,phase);
          crest=Math.pow(.5+.5*Math.cos(carrier),4);lip=Math.pow(.5+.5*Math.cos(carrier+.65),9);
          shear=Math.sin(carrier*.5+phase*1.5)*Math.sin(carrier)*.025*envelope*endFade*moving;
        }
        const v = this.kind === 'surface'
          ? meltChannelCenter(distance) + (across - .5) * MELT_HALF_WIDTH * 2 + shear
          : .13 + across * .74 + shear;
        const vertex = row * (this.across + 1) + j, offset = vertex * 3;
        if (this.kind === 'surface') {
          const sample = clamp(v) * 10, index = Math.min(9, Math.floor(sample)), fraction = sample - index;
          const sourceRow = clamp(row + slip * (this.rows - 1) / Math.max(total, .001), 0, this.rows - 1);
          const rowA = Math.min(this.rows - 2, Math.floor(sourceRow)), rowB = rowA + 1, rowFraction = sourceRow - rowA;
          for (let axis = 0; axis < 3; axis++) {
            const a0 = this.source.positions[(rowA * 11 + index) * 3 + axis], a1 = this.source.positions[(rowA * 11 + index + 1) * 3 + axis];
            const b0 = this.source.positions[(rowB * 11 + index) * 3 + axis], b1 = this.source.positions[(rowB * 11 + index + 1) * 3 + axis];
            const a = a0 + (a1 - a0) * fraction, b = b0 + (b1 - b0) * fraction;
            this.positions[offset + axis] = a + (b - a) * rowFraction;
          }
          this.positions[offset + 1] += .002 + (.006 + thickness * .012 + crest * .058 + lip * .026) * envelope * endFade * moving;
          const at = vertex * 4, skin = this.crust!;
          skin[at] = skinS; skin[at + 1] = across + shear * 2;
          skin[at + 2] = thickness; skin[at + 3] = envelope * endFade * moving;
        } else {
          const sideA = this.face > 0 ? 7 : 3, sideB = this.face > 0 ? 0 : 4;
          const rise = .002 + (.003 + crest * .014 + lip * .004) * envelope * endFade * moving;
          for (let axis = 0; axis < 3; axis++) {
            const a = this.source.positions[(row * 8 + sideA) * 3 + axis], b = this.source.positions[(row * 8 + sideB) * 3 + axis];
            this.positions[offset + axis] = a + (b - a) * v + this.guides[row * 4 + axis + 1] * rise;
          }
        }
        this.uvs[vertex * 2] = distance; this.uvs[vertex * 2 + 1] = across;
        this.waves[vertex * 2] = crest * envelope * endFade * moving;
        this.waves[vertex * 2 + 1] = lip * envelope * endFade * moving;
      }
    }
  }
}
