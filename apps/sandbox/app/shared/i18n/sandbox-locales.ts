import { registerI18n } from '@videojs/html/i18n';
import { all } from '@videojs/html/i18n/locales/all';

import { createBrowserSandboxPrefetch } from './browser-sandbox-prefetch';
import {
  DEFAULT_SANDBOX_LOCALE,
  isSandboxBrowserLocale,
  SANDBOX_LOCALE_OPTION_GROUPS,
  SANDBOX_LOCALE_OPTIONS,
  SANDBOX_LOCALE_TAGS,
  type SandboxLocaleTag,
  sandboxLocaleLabel,
} from './locale-meta';

export {
  DEFAULT_SANDBOX_LOCALE,
  isSandboxBrowserLocale,
  SANDBOX_LOCALE_OPTION_GROUPS,
  SANDBOX_LOCALE_OPTIONS,
  SANDBOX_LOCALE_TAGS,
  sandboxLocaleLabel,
};
export type { SandboxLocaleTag };

const prefetchBrowserSandboxLocale = createBrowserSandboxPrefetch(registerI18n);

let activeLocale: SandboxLocaleTag | null = null;

/** Registers built-in packs or prefetches browser translations before the player renders. */
export async function ensureSandboxLocale(tag: SandboxLocaleTag): Promise<void> {
  if (tag === 'en') {
    activeLocale = 'en';
    return;
  }

  if (isSandboxBrowserLocale(tag)) {
    if (activeLocale !== tag) {
      await prefetchBrowserSandboxLocale(tag);
    }
    activeLocale = tag;
    return;
  }

  if (activeLocale === tag) {
    return;
  }

  const translations = all[tag as keyof typeof all];
  if (!translations) {
    throw new Error(`Unknown sandbox locale: ${tag}`);
  }

  registerI18n(tag, translations);
  activeLocale = tag;
}
