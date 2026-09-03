import { getTextDirection } from '@videojs/utils/i18n';

let pinnedDirection: 'ltr' | 'rtl' | undefined;

export function syncDocumentLocale(locale: string): void {
  if (typeof document === 'undefined') return;

  document.documentElement.lang = locale;
  document.documentElement.dir = pinnedDirection ?? getTextDirection(locale);
}

/** Pin the document's direction regardless of locale, or hand it back to the locale with `auto`. */
export function setDocumentDirection(direction: 'auto' | 'ltr' | 'rtl'): void {
  pinnedDirection = direction === 'auto' ? undefined : direction;

  if (typeof document === 'undefined') return;

  document.documentElement.dir = pinnedDirection ?? getTextDirection(document.documentElement.lang || 'en');
}
