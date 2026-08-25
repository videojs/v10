import { getTextDirection } from '@videojs/utils/i18n';

export function syncDocumentLocale(locale: string): void {
  if (!('document' in globalThis)) return;
  document.documentElement.lang = locale;
  document.documentElement.dir = getTextDirection(locale);
}
