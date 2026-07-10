import type { Locale, Translations } from '@videojs/core/i18n';
import { getBrowserTranslations } from '@videojs/core/i18n';

import { type SandboxBrowserLocaleTag, sandboxLocaleLabel } from './locale-meta';

type RegisterI18n = (locale: Locale, translations: Partial<Translations>) => void;

/** Dedupes in-flight browser model download + translation per sandbox browser-only tag. */
export function createBrowserSandboxPrefetch(register: RegisterI18n) {
  const inflight = new Map<SandboxBrowserLocaleTag, Promise<void>>();

  return async function prefetchBrowserSandboxLocale(tag: SandboxBrowserLocaleTag): Promise<void> {
    const pending = inflight.get(tag);
    if (pending) return pending;

    const task = (async () => {
      const label = sandboxLocaleLabel(tag);
      const browser = await getBrowserTranslations(tag, {
        downloadIfNeeded: true,
        onModelDownload: {
          start: () => {
            console.info(`[videojs/sandbox] Downloading browser translation model for ${label} (${tag})…`);
          },
          finish: () => {
            console.info(`[videojs/sandbox] Browser translation model ready for ${label} (${tag})`);
          },
        },
      });
      if (Object.keys(browser).length) register(tag, browser);
    })().finally(() => {
      inflight.delete(tag);
    });

    inflight.set(tag, task);
    return task;
  };
}
