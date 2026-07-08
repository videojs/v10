import type { Locale } from '@videojs/core/i18n';
import { effectiveLocale, nearestLang, resolveLocaleAttr } from '@videojs/utils/dom';

/** DOM `lang` values are untyped strings; align with core {@link Locale} at the boundary. */
export function localeFromDomLang(raw: string | undefined): Locale | undefined {
  return resolveLocaleAttr<Locale>(raw);
}

/** Delegates to {@link effectiveLocale}; result is typed as {@link Locale} for player UI. */
export function resolvePlayerLocale(explicit: Locale | undefined, inherited: Locale | undefined): Locale {
  return effectiveLocale<Locale>(explicit, inherited);
}

/** Effective locale for an i18n provider element (explicit `lang` → ancestor `lang` chain → `en`). */
export function resolveProviderLocale(host: HTMLElement & { lang?: string }): Locale {
  const explicit = localeFromDomLang(host.lang);
  const root = host.parentElement ?? (typeof document !== 'undefined' ? document.documentElement : null);
  const inherited = localeFromDomLang(nearestLang(root));
  return resolvePlayerLocale(explicit, inherited);
}
