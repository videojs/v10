import '@videojs/html/i18n';

import { ensureSandboxLocale, type SandboxLocaleTag } from '../i18n/sandbox-locales';
import { getInitialLocale, onLocaleChange } from '../sandbox-listener';

let locale: SandboxLocaleTag = getInitialLocale();

document.documentElement.lang = locale;

export function getSandboxHtmlLocale(): SandboxLocaleTag {
  return locale;
}

export function wrapSandboxHtmlI18n(content: string): string {
  return `<media-i18n-provider lang="${locale}">${content}</media-i18n-provider>`;
}

export async function prepareSandboxHtmlLocale(): Promise<void> {
  await ensureSandboxLocale(locale);
}

export async function applySandboxHtmlLocale(next: SandboxLocaleTag): Promise<void> {
  locale = next;
  document.documentElement.lang = locale;
  await ensureSandboxLocale(locale);
  document.querySelector('media-i18n-provider')?.setAttribute('lang', locale);
}

export function bindSandboxHtmlLocaleChange(rerender: () => void): void {
  onLocaleChange((next) => {
    if (document.querySelector('media-i18n-provider')) {
      void applySandboxHtmlLocale(next);
      return;
    }
    locale = next;
    document.documentElement.lang = locale;
    void rerender();
  });
}
