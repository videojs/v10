import en from './locales/en';
import type { Translations } from './types';

const registry = new Map<string, Partial<Translations>>();
const subscribers = new Set<() => void>();

function notify(): void {
  for (const cb of subscribers) {
    cb();
  }
}

function normalizeLocaleTag(tag: string): string {
  return tag.trim().replaceAll('_', '-').toLowerCase();
}

/** Strip unicode locale extension sequences (`-u-…`) before any private-use `-x-` block. */
function stripUnicodeExtensions(tag: string): string {
  const xIdx = tag.indexOf('-x-');
  const beforePrivateUse = xIdx === -1 ? tag : tag.slice(0, xIdx);
  const uIdx = beforePrivateUse.indexOf('-u-');
  if (uIdx === -1) {
    return tag;
  }
  return tag.slice(0, uIdx) + (xIdx === -1 ? '' : tag.slice(xIdx));
}

/** Registry map key: normalized tag with unicode extensions removed (same base as {@link localeLookupChain}). */
function canonicalLocaleRegistryKey(locale: string): string {
  return stripUnicodeExtensions(normalizeLocaleTag(locale));
}

/**
 * Most-specific-first BCP 47 lookup tags (normalized). Always ends with `en` when missing from the truncated chain.
 *
 * @example `es-419-u-nu-latn` → `['es-419', 'es', 'en']`
 */
export function localeLookupChain(locale: string): string[] {
  const base = canonicalLocaleRegistryKey(locale);
  if (!base) {
    return ['en'];
  }

  const segments = base.split('-').filter(Boolean);
  const chain: string[] = [];

  for (let len = segments.length; len >= 1; len--) {
    chain.push(segments.slice(0, len).join('-'));
  }

  const out: string[] = [];
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

function mergeLookupChain(chain: string[]): Translations {
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

export function registerI18n(locale: string, translations: Partial<Translations>): void {
  const tag = canonicalLocaleRegistryKey(locale);
  const existing = registry.get(tag) ?? {};
  registry.set(tag, { ...existing, ...translations });
  notify();
}

export function getI18nTranslations(locale: string): Translations {
  return mergeLookupChain(localeLookupChain(locale));
}

export function onI18nRegistryChange(callback: () => void): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

export function hasRegisteredI18n(locale: string): boolean {
  return registry.has(canonicalLocaleRegistryKey(locale));
}

/** Restores the registry to built-in English only (test isolation). */
export function resetI18nRegistryForTesting(): void {
  registry.clear();
  subscribers.clear();
  registry.set('en', { ...en });
}

registry.set('en', { ...en });
