import '@videojs/html/i18n';

import { ensureSandboxLocale, type SandboxLocaleTag } from '../i18n/sandbox-locales';
import { getInitialLocale, onLocaleChange } from '../sandbox-listener';

let locale: SandboxLocaleTag = getInitialLocale();
let localeApplySeq = 0;

document.documentElement.lang = locale;

export function wrapSandboxHtmlI18n(content: string): string {
  return `<media-i18n>${content}</media-i18n>`;
}

export async function prepareSandboxHtmlLocale(): Promise<void> {
  await ensureSandboxLocale(locale);
}

export async function applySandboxHtmlLocale(next: SandboxLocaleTag): Promise<void> {
  const seq = ++localeApplySeq;
  locale = next;
  document.documentElement.lang = locale;
  await ensureSandboxLocale(locale);
  if (seq !== localeApplySeq) return;
}

export function bindSandboxHtmlLocaleChange(rerender: () => void): void {
  onLocaleChange((next) => {
    if (document.querySelector('media-i18n')) {
      void applySandboxHtmlLocale(next);
      return;
    }
    const seq = ++localeApplySeq;
    locale = next;
    document.documentElement.lang = locale;
    void (async () => {
      await ensureSandboxLocale(locale);
      if (seq !== localeApplySeq) return;
      rerender();
    })();
  });
}
