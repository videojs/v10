import en from './locales/en';
import { findLocaleKeys, getI18nTranslations, hasRegisteredLocale } from './registry';
import type { Locale, Translations } from './types';

type BrowserTranslatorAvailability = 'available' | 'downloadable' | 'downloading' | 'unavailable';

interface BrowserTranslatorInstance {
  translate(text: string): Promise<string>;
}

interface BrowserTranslatorMonitor {
  addEventListener(type: 'downloadprogress', listener: (event: { loaded: number }) => void): void;
}

interface BrowserTranslatorConstructor {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<BrowserTranslatorAvailability>;
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (monitor: BrowserTranslatorMonitor) => void;
  }): Promise<BrowserTranslatorInstance>;
}

export interface GetBrowserTranslationsOptions {
  /**
   * When true, call `Translator.create()` for `downloadable` / `downloading` (may download the
   * on-device model). Defaults to false — production providers only use pre-installed models.
   */
  downloadIfNeeded?: boolean;
  /** Invoked when a model download starts and when `Translator.create()` resolves. */
  onModelDownload?: {
    start?: (targetLanguage: string) => void;
    finish?: (targetLanguage: string) => void;
  };
}

const NAMED_PLACEHOLDER = /\{([^{}]+)\}/g;
const INDEX_PLACEHOLDER = /\{\s*(\d+)\s*\}/g;

/**
 * Replaces `{seconds}` with `{0}`, `{1}`, … so the Browser Translation API sees one full
 * sentence (grammar/word order preserved) while opaque numeric slots are left alone.
 */
function maskNamedPlaceholders(source: string): { masked: string; slots: readonly string[] } {
  const slots: string[] = [];
  const masked = source.replace(NAMED_PLACEHOLDER, (_, name: string) => {
    slots.push(name);
    return `{${slots.length - 1}}`;
  });
  return { masked, slots };
}

function restoreNamedPlaceholders(translated: string, slots: readonly string[]): string {
  return translated.replace(INDEX_PLACEHOLDER, (match, index: string) => {
    const name = slots[Number(index)];
    return name !== undefined ? `{${name}}` : match;
  });
}

async function translateProtectingPlaceholders(translator: BrowserTranslatorInstance, value: string): Promise<string> {
  const { masked, slots } = maskNamedPlaceholders(value);
  if (slots.length === 0) {
    return translator.translate(value);
  }
  const translated = await translator.translate(masked);
  return restoreNamedPlaceholders(translated, slots);
}

const cache = new Map<string, Partial<Translations>>();

function isEnglishLocaleTag(tag: string): boolean {
  return tag === 'en' || tag.startsWith('en-');
}

function getBrowserTranslator(): BrowserTranslatorConstructor | undefined {
  if (!('Translator' in globalThis)) return undefined;
  return (globalThis as typeof globalThis & { Translator: BrowserTranslatorConstructor }).Translator;
}

/** First non-English tag in the lookup chain used as the browser translation target. */
export function resolveBrowserTranslationTarget(locale: string): string | undefined {
  for (const tag of findLocaleKeys(locale)) {
    if (!isEnglishLocaleTag(tag)) return tag;
  }
  return undefined;
}

/** Whether to invoke the Browser Translation API for this locale after lazy built-in loading. */
export function shouldAttemptBrowserTranslation(
  locale: Locale,
  loadedLazyTags: readonly string[],
  translations?: Partial<Translations>
): boolean {
  const target = resolveBrowserTranslationTarget(locale);
  if (!target) return false;
  if (loadedLazyTags.some((tag) => !isEnglishLocaleTag(tag))) {
    return translations !== undefined && hasMissingEnglishTranslations(translations);
  }

  return !findLocaleKeys(locale).some((tag) => !isEnglishLocaleTag(tag) && hasRegisteredLocale(tag));
}

function hasMissingEnglishTranslations(translations: Partial<Translations>): boolean {
  return (Object.keys(en) as (keyof Translations)[]).some((key) => translations[key] === undefined);
}

/**
 * Translates English registry values via the on-device Browser Translation API when a pre-installed
 * model is available. Results are cached per target language tag.
 */
export async function getBrowserTranslations(
  locale: string,
  options?: GetBrowserTranslationsOptions
): Promise<Partial<Translations>> {
  const target = resolveBrowserTranslationTarget(locale);
  if (!target) return {};

  const cached = cache.get(target);
  if (cached) return cached;

  const Translator = getBrowserTranslator();
  if (!Translator) return {};

  const downloadIfNeeded = options?.downloadIfNeeded ?? false;

  const availability = await Translator.availability({
    sourceLanguage: 'en',
    targetLanguage: target,
  });
  if (availability === 'unavailable') return {};
  if (!downloadIfNeeded && availability !== 'available') return {};

  const needsDownload = downloadIfNeeded && (availability === 'downloadable' || availability === 'downloading');
  let downloadStarted = false;
  const notifyDownloadStart = (): void => {
    if (!needsDownload || downloadStarted) return;
    downloadStarted = true;
    options?.onModelDownload?.start?.(target);
  };

  notifyDownloadStart();

  const english = getI18nTranslations('en');
  const keys = Object.keys(en) as (keyof Translations)[];
  const translator = await Translator.create({
    sourceLanguage: 'en',
    targetLanguage: target,
    ...(downloadIfNeeded
      ? {
          monitor(monitor: BrowserTranslatorMonitor) {
            monitor.addEventListener('downloadprogress', notifyDownloadStart);
          },
        }
      : {}),
  });

  if (downloadStarted) {
    options?.onModelDownload?.finish?.(target);
  }

  const entries = await Promise.all(
    keys.map(async (key) => {
      const value = english[key] ?? en[key];
      if (!value) return [key, ''] as const;
      const translated = await translateProtectingPlaceholders(translator, value);
      return [key, translated] as const;
    })
  );

  const result = Object.fromEntries(entries) as Partial<Translations>;
  cache.set(target, result);
  return result;
}

/** Clears the browser translation cache (test isolation). */
export function resetBrowserTranslationCacheForTesting(): void {
  cache.clear();
}
