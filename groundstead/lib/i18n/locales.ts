export const LOCALES = ['en', 'vi'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

// Paths are locale-relative and use a trailing slash, matching `trailingSlash: true`.
// localePath('vi', '') -> '/vi/', localePath('en', 'emergency/') -> '/en/emergency/'
export function localePath(locale: Locale, path = ''): string {
  const clean = path.replace(/^\/+/, '');
  if (clean !== '' && !clean.endsWith('/')) throw new Error(`path must end with "/": ${path}`);
  return `/${locale}/${clean}`;
}
