import { getTextDirection } from '@videojs/utils/i18n';

export function syncDocumentLocale(locale: string): void {
  if (typeof document === 'undefined') return;

  document.documentElement.lang = locale;
  document.documentElement.dir = getTextDirection(locale);
}
