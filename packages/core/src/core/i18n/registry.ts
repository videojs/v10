import en from './locales/en';
import type { Locale, Translations } from './types';

const registry = new Map<Locale, Partial<Translations>>();
const subscribers = new Set<() => void>();

function notify(): void {
  for (const cb of subscribers) {
    cb();
  }
}

function normalizeLocaleTag(tag: Locale): Locale {
  return tag.trim().replaceAll('_', '-').toLowerCase();
}

/** Strip unicode locale extension sequences (`-u-…`) before any private-use `-x-` block. */
function stripUnicodeExtensions(tag: Locale): Locale {
  const xIdx = tag.indexOf('-x-');
  const beforePrivateUse = xIdx === -1 ? tag : tag.slice(0, xIdx);
  const uIdx = beforePrivateUse.indexOf('-u-');
  if (uIdx === -1) {
    return tag;
  }
  return tag.slice(0, uIdx) + (xIdx === -1 ? '' : tag.slice(xIdx));
}

function chineseFallback(segments: string[]): Locale | undefined {
  if (segments[0] !== 'zh') {
    return undefined;
  }

  const script = segments.find((segment) => segment === 'hant' || segment === 'hans');
  return script === 'hant' ? 'zh-tw' : script === 'hans' ? 'zh-cn' : undefined;
}

/** Registry map key: normalized tag with unicode extensions removed (same base as {@link findLocaleKeys}). */
export function getCanonicalLocaleKey(locale: Locale): Locale {
  return stripUnicodeExtensions(normalizeLocaleTag(locale));
}

/**
 * Most-specific-first BCP 47 lookup tags (normalized). Always ends with `en` when missing from the truncated chain.
 *
 * @example `es-419-u-nu-latn` → `['es-419', 'es', 'en']`
 */
export function findLocaleKeys(locale: Locale): Locale[] {
  const base = getCanonicalLocaleKey(locale);
  if (!base) {
    return ['en'];
  }

  const segments = base.split('-').filter(Boolean);
  const chain: Locale[] = [];

  for (let len = segments.length; len >= 1; len--) {
    chain.push(segments.slice(0, len).join('-'));
  }

  const zhFallback = chineseFallback(segments);
  const zhIndex = chain.indexOf('zh');
  if (zhFallback && zhIndex !== -1) {
    chain.splice(zhIndex, 0, zhFallback);
  }

  const out: Locale[] = [];
  const seen = new Set<string>();
  for (const tag of chain) {
    if (!seen.has(tag)) {
      seen.add(tag);
      out.push(tag);
    }
  }
  if (!seen.has('en')) {
    out.push('en');
  }

  return out;
}

function mergeI18nTranslations(chain: Locale[]): Translations {
  const merged: Partial<Translations> = {};
  for (let i = chain.length - 1; i >= 0; i--) {
    const tag = chain[i]!;
    const layer = registry.get(tag);
    if (layer) {
      Object.assign(merged, layer);
    }
  }
  return merged as Translations;
}

/**
 * Register or merge translation strings for a BCP 47 locale tag.
 *
 * @param locale - BCP 47 tag (normalized to lowercase; unicode extensions stripped for the registry key).
 * @param translations - Partial map of opaque keys to translated strings; merges with any existing layer for the tag.
 * @public
 */
export function registerI18n(locale: Locale, translations: Partial<Translations>): void {
  const tag = getCanonicalLocaleKey(locale);
  const existing = registry.get(tag) ?? {};
  registry.set(tag, { ...existing, ...translations });
  notify();
}

/**
 * Return the merged translation map for a locale, walking the BCP 47 lookup chain to English defaults.
 *
 * @param locale - BCP 47 tag to resolve (e.g. `es-MX`, `zh-Hant-HK`).
 * @public
 */
export function getI18nTranslations(locale: Locale): Translations {
  return mergeI18nTranslations(findLocaleKeys(locale));
}

/**
 * Subscribe to global registry mutations (for example after `registerI18n` or browser translation prefetch).
 *
 * @param callback - Invoked when any locale layer changes.
 * @public
 */
export function onI18nRegistryChange(callback: () => void): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

/**
 * Whether an exact locale tag has been registered via `registerI18n` (not whether lazy packs exist).
 *
 * @param locale - BCP 47 tag to test.
 * @public
 */
export function hasRegisteredLocale(locale: Locale): boolean {
  return registry.has(getCanonicalLocaleKey(locale));
}

/** Restores the registry to built-in English only (test isolation). */
export function resetI18nRegistry(): void {
  registry.clear();
  subscribers.clear();
  registry.set('en', { ...en });
}

registry.set('en', { ...en });
