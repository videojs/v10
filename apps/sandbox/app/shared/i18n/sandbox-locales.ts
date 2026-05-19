import { BUILT_IN_LOCALES, registerI18n } from '@videojs/html/i18n';
import { all } from '@videojs/html/i18n/all';

/** Locales available in the sandbox language picker (includes v8 aliases). */
export const SANDBOX_LOCALE_TAGS = ['en', ...BUILT_IN_LOCALES, 'pt', 'zh'] as const;

export type SandboxLocaleTag = (typeof SANDBOX_LOCALE_TAGS)[number];

export const DEFAULT_SANDBOX_LOCALE: SandboxLocaleTag = 'en';

type LoadedLocalePackTag = keyof typeof all;

let activeLocale: SandboxLocaleTag | null = null;

/** Registers built-in copy for non-English tags (English uses the default registry layer). */
export function ensureSandboxLocale(tag: SandboxLocaleTag): void {
  if (tag === 'en') {
    activeLocale = 'en';
    return;
  }

  if (activeLocale === tag) {
    return;
  }

  const translations = all[tag as LoadedLocalePackTag];
  if (!translations) {
    throw new Error(`Unknown sandbox locale: ${tag}`);
  }

  registerI18n(tag, translations);
  activeLocale = tag;
}

const LANGUAGE_NAMES = new Intl.DisplayNames('en', { type: 'language' });

/** v8 `np` is not a valid BCP 47 tag (Nepali is `ne`). */
const LOCALE_LABEL_OVERRIDES: Partial<Record<SandboxLocaleTag, string>> = {
  np: 'Nepali',
};

export function sandboxLocaleLabel(tag: SandboxLocaleTag): string {
  return LOCALE_LABEL_OVERRIDES[tag] ?? LANGUAGE_NAMES.of(tag) ?? tag;
}

export const SANDBOX_LOCALE_OPTIONS = [...SANDBOX_LOCALE_TAGS]
  .map((tag) => ({
    value: tag,
    label: sandboxLocaleLabel(tag),
  }))
  .sort((a, b) => a.label.localeCompare(b.label, 'en'));
