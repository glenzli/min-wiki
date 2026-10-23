export const families = ['worlds', 'stars', 'clouds', 'systems', 'events'] as const;
export type Family = typeof families[number];
export type Kind = 'body' | 'material' | 'system' | 'event' | 'region';
export interface Word { zh: string; en: string }
export interface Resident {
  id: string; family: Family; kind: Kind; name: Word; label: Word;
  light: Word; home: Word; clue: Word; contrast: Word;
  partner: string; route: string; source: string; icon: string;
}
export function readGuide(query: string, residents: readonly Resident[]) {
  const params = new URLSearchParams(query);
  const selected = residents.find(item => item.id === params.get('object')) ?? residents[0]!;
  return { selected: selected.id, family: selected.family };
}
export function residentsIn(residents: readonly Resident[], family: Family) {
  return residents.filter(item => item.family === family);
}
/** Family is a learning arrangement; kind describes the noun. Neither is inferred from size. */
export function selectFamily(residents: readonly Resident[], selected: string, family: Family) {
  const options = residentsIn(residents, family);
  return options.find(item => item.id === selected) ?? options[0]!;
}
export function partnerOf(residents: readonly Resident[], item: Resident) {
  return residents.find(candidate => candidate.id === item.partner)!;
}
