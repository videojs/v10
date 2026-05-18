import type { Locale } from '@videojs/core/i18n';
import { nearestLang } from '@videojs/utils/dom';
import { isUndefined } from '@videojs/utils/predicate';

/** DOM `lang` values are untyped strings; align with core {@link Locale} at the boundary. */
export function localeFromDomLang(raw: string | undefined): Locale | undefined {
  if (isUndefined(raw) || raw.trim() === '') {
    return undefined;
  }
  return raw as Locale;
}

/**
 * Same precedence as `effectiveLocale` from `@videojs/utils/dom`; typed so the result is
 * {@link Locale} without widening from `string`.
 */
export function resolvePlayerLocale(explicit: Locale | undefined, inherited: Locale | undefined): Locale {
  if (!isUndefined(explicit) && String(explicit).trim() !== '') {
    return explicit;
  }
  if (!isUndefined(inherited) && inherited.trim() !== '') {
    return inherited;
  }
  return 'en';
}

/** Effective locale for an i18n provider element (explicit `lang` → ancestor `lang` chain → `en`). */
export function resolveProviderLocale(host: HTMLElement & { lang?: string }): Locale {
  const trimmed = host.lang?.trim();
  const explicit = trimmed ? (trimmed as Locale) : undefined;
  const root = host.parentElement ?? (typeof document !== 'undefined' ? document.documentElement : null);
  const inherited = localeFromDomLang(nearestLang(root));
  return resolvePlayerLocale(explicit, inherited);
}
