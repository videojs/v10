import '@videojs/html/i18n';
import { syncDocumentLocale } from '../i18n/document-locale';
import { ensureSandboxLocale, type SandboxLocaleTag } from '../i18n/sandbox-locales';
import { getInitialLocale, onLocaleChange } from '../sandbox-listener';

let locale: SandboxLocaleTag = getInitialLocale();
let localeApplySeq = 0;

syncDocumentLocale(locale);

export function wrapSandboxHtmlI18n(content: string): string {
  return `<media-i18n>${content}</media-i18n>`;
}

export async function prepareSandboxHtmlLocale(): Promise<void> {
  await ensureSandboxLocale(locale);
}

export async function applySandboxHtmlLocale(next: SandboxLocaleTag): Promise<void> {
  const seq = ++localeApplySeq;

  await ensureSandboxLocale(next);

  if (seq !== localeApplySeq) return;

  locale = next;
  syncDocumentLocale(locale);
}

export function bindSandboxHtmlLocaleChange(rerender: () => void): void {
  onLocaleChange((next) => {
    if (document.querySelector('media-i18n')) {
      void applySandboxHtmlLocale(next);
      return;
    }

    const seq = ++localeApplySeq;

    void (async () => {
      await ensureSandboxLocale(next);

      if (seq !== localeApplySeq) return;

      locale = next;
      syncDocumentLocale(locale);
      rerender();
    })();
  });
}
