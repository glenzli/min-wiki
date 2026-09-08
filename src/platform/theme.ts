import { t } from './i18n.ts';
export const THEME_KEY = 'little-encyclopedia.theme';
export const themePreference = (value: unknown): 'auto' | 'light' | 'dark' => (value === 'auto' || value === 'light' || value === 'dark') ? value : 'auto';
export function resolveTheme(preference: string, contentTheme = 'light') {
  return themePreference(preference) === 'auto' ? (contentTheme === 'dark' ? 'dark' : 'light') : preference;
}
let preference = 'auto';
export function applyTheme() {
  const root = document.documentElement;
  const theme = resolveTheme(preference, root.dataset.contentTheme);
  root.dataset.theme = theme;
  root.dataset.themePreference = preference;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#10151c' : '#f7f6f2');
  for (const select of document.querySelectorAll<HTMLSelectElement>('[data-theme-select]')) select.value = preference;
}
export function setContentTheme(theme: string) {
  document.documentElement.dataset.contentTheme = theme === 'dark' ? 'dark' : 'light';
  applyTheme();
}
export function mountThemeControl(host: HTMLElement) {
  const label = document.createElement('label');
  label.className = 'theme-control';
  const text = document.createElement('span'); text.textContent = t("外观");
  const select = document.createElement('select'); select.dataset.themeSelect = ''; select.setAttribute('aria-label', t("页面外观"));
  for (const [value, title] of [['auto',t("跟随内容")], ['light',t("浅色")], ['dark',t("深色")]]) {
    const option = document.createElement('option'); option.value=value; option.textContent=title; select.append(option);
  }
  select.value = preference;
  select.addEventListener('change', () => {
    preference = themePreference(select.value);
    try { localStorage.setItem(THEME_KEY, preference); } catch { /* Storage is optional. */ }
    applyTheme();
  });
  label.append(text, select); host.append(label);
}
if (typeof document !== 'undefined') {
  try { preference = themePreference(localStorage.getItem(THEME_KEY)); } catch { /* Use content theme. */ }
  applyTheme();
  window.addEventListener('storage', event => {
    if (event.key === THEME_KEY || event.key === null) {
      preference=themePreference(event.newValue); applyTheme();
    }
  });
  window.addEventListener('pageshow', () => {
    try { preference=themePreference(localStorage.getItem(THEME_KEY)); } catch { /* Keep session choice. */ }
    applyTheme();
  });
}
