export type SoundChapter = 'source' | 'ear' | 'compare';
export function readSoundChapter(search: string): SoundChapter {
  const value = new URLSearchParams(search).get('chapter');
  return value === 'ear' || value === 'compare' ? value : 'source';
}
export function soundHref(chapter: SoundChapter, search = '', hash = '') {
  const params = new URLSearchParams(search); params.set('chapter', chapter);
  return '/topics/sound-vibrations/?' + params.toString() + hash;
}
const bound = (n: number, min: number, max: number, fallback: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : fallback));
/** Common experimental conditions; ear position remains qualitative, not an anatomical frequency calibration. */
export function soundConditions(tension: number, amplitude: number) {
  const tensionValue = bound(tension, 1, 4, 1), amplitudeValue = bound(amplitude, 10, 50, 28);
  return { tension: tensionValue, amplitude: amplitudeValue, frequency: 196 * Math.sqrt(tensionValue),
    pitch: Math.log2(Math.sqrt(tensionValue)), strength: (amplitudeValue - 10) / 40 };
}
/** Same time axis and amplitude scale make frequency and amplitude independently testable. */
export function comparisonSample(milliseconds: number, tension: number, amplitude: number, medium: 'air' | 'vacuum' = 'air') {
  const c = soundConditions(tension, amplitude);
  const source = c.amplitude / 50 * Math.sin(2 * Math.PI * c.frequency * milliseconds / 1000);
  return { source, transmitted: medium === 'air' ? source : 0 };
}
