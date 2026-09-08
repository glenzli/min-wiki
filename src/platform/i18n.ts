import i18next from 'i18next';
import english from './locales/en.json';

export type Language = 'zh-CN' | 'en';
export const LANGUAGE_KEY = 'little-encyclopedia.language';
export type TranslationValues = Record<string, string | number>;
export type Translate = (source: string, values?: TranslationValues) => string;

export function resolveLanguage(query: string | null, saved: string | null, browser = ''): Language {
  for (const value of [query, saved, browser]) {
    if (value === 'en' || value?.startsWith('en-')) return 'en';
    if (value === 'zh' || value === 'zh-CN' || value?.startsWith('zh-')) return 'zh-CN';
  }
  return 'zh-CN';
}
function initialLanguage(): Language {
  if (typeof window === 'undefined') return 'zh-CN';
  let saved: string | null = null;
  try { saved = localStorage.getItem(LANGUAGE_KEY); } catch { /* Storage is optional. */ }
  return resolveLanguage(new URL(location.href).searchParams.get('lang'), saved, navigator.language);
}
export const language = initialLanguage();
// Resources are local bundle dependencies. Initialization is synchronous: a topic's
// content and renderer always start in the same language, without an async flash.
void i18next.init({
  lng: language, fallbackLng: false, supportedLngs: ['zh-CN', 'en'],
  resources: { en: { common: english } }, defaultNS: 'common',
  initAsync: false, keySeparator: false, nsSeparator: false,
  // Callers use textContent, or topic-owned templates with trusted local data.
  interpolation: { escapeValue: false }, returnNull: false,
});
export function translator(namespace: string, messages?: Record<string, string>, locale: Language = language): Translate {
  if (messages) i18next.addResourceBundle('en', namespace, messages);
  return (source, values) => i18next.t(source, {
    lng: locale, ns: namespace === 'common' ? ['common'] : [namespace, 'common'],
    defaultValue: source, ...values,
  });
}
export const t = translator('common');

/** A language URL retains filters and anchors and works without local storage. */
export function languageHref(href: string, locale: Language = language): string {
  const url = new URL(href, 'https://local.invalid');
  url.searchParams.set('lang', locale);
  return url.pathname + url.search + url.hash;
}
export function mountLanguageControl(host: HTMLElement): void {
  const label = document.createElement('label'); label.className = 'theme-control language-control';
  const title = document.createElement('span'); title.textContent = t('语言');
  const select = document.createElement('select'); select.setAttribute('aria-label', '语言 / Language');
  for (const [value, text] of [['zh-CN', '中文'], ['en', 'English']]) {
    const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option);
  }
  select.value = language;
  select.addEventListener('change', () => {
    const next = select.value === 'en' ? 'en' : 'zh-CN';
    try { localStorage.setItem(LANGUAGE_KEY, next); } catch { /* URL remains authoritative. */ }
    // Full-page navigation matches topic lifetime ownership; no stale animation
    // callback or precomputed story can overwrite the new locale.
    location.assign(languageHref(location.href, next));
  });
  label.append(title, select); host.append(label);
}

/** Translate authored HTML once, before a page starts its dynamic controllers. */
export function translateDocument(translate: Translate = t): void {
  document.documentElement.lang = language;
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.parentElement?.closest('script, style')) continue;
    const value = node.textContent ?? '', source = value.trim();
    if (/[\u3400-\u9fff]/.test(source)) node.textContent = value.replace(source, translate(source));
  }
  for (const element of document.querySelectorAll('[aria-label], [title], [placeholder], meta[name="description"]')) {
    for (const attribute of ['aria-label', 'title', 'placeholder', 'content']) {
      const source = element.getAttribute(attribute);
      if (source && /[\u3400-\u9fff]/.test(source)) element.setAttribute(attribute, translate(source));
    }
  }
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[href^="/"]')) link.href = languageHref(link.getAttribute('href')!);
}
