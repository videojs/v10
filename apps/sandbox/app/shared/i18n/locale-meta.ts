import { SHIPPED_LOCALE_TAGS } from '@videojs/core/i18n';

/** Shipped locale packs (picker + CDN loaders). */
export const SANDBOX_SHIPPED_LOCALE_TAGS = ['en', ...SHIPPED_LOCALE_TAGS] as const;

export type SandboxShippedLocaleTag = (typeof SANDBOX_SHIPPED_LOCALE_TAGS)[number];

/**
 * Chrome Translator API tags (desktop).
 * @see https://developer.chrome.com/docs/ai/translator-api#supported_languages
 */
const CHROME_TRANSLATOR_LOCALE_TAGS = [
  'ar',
  'bg',
  'bn',
  'cs',
  'da',
  'de',
  'el',
  'en',
  'es',
  'fi',
  'fr',
  'hi',
  'hr',
  'hu',
  'id',
  'it',
  'iw',
  'ja',
  'kn',
  'ko',
  'lt',
  'mr',
  'nl',
  'no',
  'pl',
  'pt',
  'ro',
  'ru',
  'sk',
  'sl',
  'sv',
  'ta',
  'te',
  'th',
  'tr',
  'uk',
  'vi',
  'zh',
  'zh-Hant',
] as const;

const shippedSandboxLocaleSet = new Set<string>(SANDBOX_SHIPPED_LOCALE_TAGS);

export type SandboxBrowserLocaleTag = Extract<
  (typeof CHROME_TRANSLATOR_LOCALE_TAGS)[number],
  Exclude<(typeof CHROME_TRANSLATOR_LOCALE_TAGS)[number], SandboxShippedLocaleTag | 'en'>
>;

/**
 * Locales with no Video.js pack — Chrome Translator only, excluding tags we already ship.
 * Derived from {@link CHROME_TRANSLATOR_LOCALE_TAGS} so unsupported tags never appear in the picker.
 */
export const SANDBOX_BROWSER_LOCALE_TAGS: readonly SandboxBrowserLocaleTag[] = CHROME_TRANSLATOR_LOCALE_TAGS.filter(
  (tag): tag is SandboxBrowserLocaleTag => tag !== 'en' && !shippedSandboxLocaleSet.has(tag)
);

/** All tags exposed in the sandbox language picker. */
export type SandboxLocaleTag = SandboxShippedLocaleTag | SandboxBrowserLocaleTag;

export const SANDBOX_LOCALE_TAGS: readonly SandboxLocaleTag[] = [
  ...SANDBOX_SHIPPED_LOCALE_TAGS,
  ...SANDBOX_BROWSER_LOCALE_TAGS,
];

export const DEFAULT_SANDBOX_LOCALE: SandboxLocaleTag = 'en';

const LANGUAGE_NAMES = new Intl.DisplayNames('en', { type: 'language' });

export function sandboxLocaleLabel(tag: string): string {
  return LANGUAGE_NAMES.of(tag) ?? tag;
}

export function isSandboxBrowserLocale(tag: string): tag is SandboxBrowserLocaleTag {
  return (SANDBOX_BROWSER_LOCALE_TAGS as readonly string[]).includes(tag);
}

export type SandboxLocaleOption = {
  value: SandboxLocaleTag;
  label: string;
};

export type SandboxLocaleOptionGroup = {
  label: string;
  options: SandboxLocaleOption[];
};

function localeOptions(tags: readonly SandboxLocaleTag[]): SandboxLocaleOption[] {
  return [...tags]
    .map((tag) => ({
      value: tag,
      label: sandboxLocaleLabel(tag),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'en'));
}

/** Flat list (legacy); prefer {@link SANDBOX_LOCALE_OPTION_GROUPS} in the picker. */
export const SANDBOX_LOCALE_OPTIONS = localeOptions(SANDBOX_LOCALE_TAGS);

export const SANDBOX_LOCALE_OPTION_GROUPS: SandboxLocaleOptionGroup[] = [
  { label: 'Built-in packs', options: localeOptions(SANDBOX_SHIPPED_LOCALE_TAGS) },
  { label: 'Browser API only', options: localeOptions(SANDBOX_BROWSER_LOCALE_TAGS) },
];
