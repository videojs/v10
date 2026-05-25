import type { Locale } from '@videojs/core/i18n';
import { localeFromDomLang as domLangFromString, effectiveLocale, nearestLang } from '@videojs/utils/dom';

/** DOM `lang` values are untyped strings; align with core {@link Locale} at the boundary. */
export function localeFromDomLang(raw: string | undefined): Locale | undefined {
  const tag = domLangFromString(raw);
  return tag === undefined ? undefined : (tag as Locale);
}

/** Delegates to {@link effectiveLocale}; result is typed as {@link Locale} for player UI. */
export function resolvePlayerLocale(explicit: Locale | undefined, inherited: Locale | undefined): Locale {
  return effectiveLocale(explicit, inherited) as Locale;
}

/** Effective locale for an i18n provider element (explicit `lang` → ancestor `lang` chain → `en`). */
export function resolveProviderLocale(host: HTMLElement & { lang?: string }): Locale {
  const trimmed = host.lang?.trim();
  const explicit = trimmed ? (trimmed as Locale) : undefined;
  const root = host.parentElement ?? (typeof document !== 'undefined' ? document.documentElement : null);
  const inherited = localeFromDomLang(nearestLang(root));
  return resolvePlayerLocale(explicit, inherited);
}
