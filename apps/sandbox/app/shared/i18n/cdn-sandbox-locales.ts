import { getI18nTranslations, registerI18n } from '@videojs/html/cdn/i18n';

import { createBrowserSandboxPrefetch } from './browser-sandbox-prefetch';
import { cdnLocaleLoaders } from './cdn-locale-loaders.generated';
import { isSandboxBrowserLocale, type SandboxLocaleTag } from './locale-meta';

const prefetchBrowserSandboxLocale = createBrowserSandboxPrefetch(registerI18n);

let active: SandboxLocaleTag | null = null;

/** Loads a CDN locale chunk or prefetches browser translations before the player renders. */
export async function ensureCdnSandboxLocale(tag: SandboxLocaleTag): Promise<void> {
  if (tag === 'en') {
    active = tag;
    return;
  }

  if (isSandboxBrowserLocale(tag)) {
    if (active !== tag) {
      await prefetchBrowserSandboxLocale(tag);
    }
    active = tag;
    return;
  }

  if (active === tag) {
    return;
  }

  const load = cdnLocaleLoaders[tag as keyof typeof cdnLocaleLoaders];
  if (!load) {
    throw new Error(`Unknown sandbox locale: ${tag}`);
  }

  await load();

  if (import.meta.env.DEV) {
    const registered = getI18nTranslations(tag).Play;
    const enPlay = getI18nTranslations('en').Play;
    if (registered === enPlay) {
      throw new Error(
        `[videojs/sandbox] Locale "${tag}" did not register on the CDN i18n registry (still "${enPlay}").`
      );
    }
  }

  active = tag;
}
