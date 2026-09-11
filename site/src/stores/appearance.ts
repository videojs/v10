import { atom, onMount, type WritableAtom } from 'nanostores';

import { ACCENT_KEY, THEME_KEY, TONE_KEY } from '@/consts';

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export const ACCENTS = ['orange', 'gold', 'magenta', 'red'] as const;
export const TONES = ['soft', 'deep'] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type Accent = (typeof ACCENTS)[number];
export type Tone = (typeof TONES)[number];

/** Page background per resolved theme and tone, mirrored into the `theme-color` meta tag for browser chrome. */
const THEME_COLORS = {
  light: '#ebe4c1',
  deep: '#151414',
  soft: '#1e1d1d',
} as const;

// Storage is absent during server rendering; every access goes through this optional handle.
const storage: Storage | undefined = globalThis.localStorage;

function readStored<T extends string>(key: string, valid: readonly T[], fallback: T): T {
  const value = storage?.getItem(key);

  // SAFETY: `includes` has just confirmed the string is one of the allowed literals.
  return value && (valid as readonly string[]).includes(value) ? (value as T) : fallback;
}

/**
 * Appearance preferences: theme, accent colour, and how deep the dark surfaces go.
 *
 * `ThemeInit.astro` applies the stored values to `<html>` before first paint. These atoms pick them up on first
 * subscription, so server-rendered controls match the client's first render and the stored choice arrives as an update,
 * then keep the document and storage in sync as the user changes them.
 */
function preferenceAtom<T extends string>(key: string, valid: readonly T[], fallback: T): WritableAtom<T> {
  const store = atom<T>(fallback);

  onMount(store, () => {
    store.set(readStored(key, valid, fallback));

    return store.listen((value) => {
      try {
        storage?.setItem(key, value);
      } catch {
        // Storage may be full or disabled; the in-memory value still drives the page.
      }

      applyAppearance();
    });
  });

  return store;
}

export const themePreference = preferenceAtom<ThemePreference>(THEME_KEY, THEME_PREFERENCES, 'system');
export const accent = preferenceAtom<Accent>(ACCENT_KEY, ACCENTS, 'orange');
export const tone = preferenceAtom<Tone>(TONE_KEY, TONES, 'soft');

export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference !== 'system') return preference;

  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Write the current preferences onto the document. Idempotent, so it can run on any change. */
export function applyAppearance(): void {
  const root = globalThis.document?.documentElement;
  if (!root) return;

  const theme = resolveTheme(themePreference.get());
  const currentTone = tone.get();

  root.classList.toggle('dark', theme === 'dark');
  root.dataset.accent = accent.get();
  root.dataset.tone = currentTone;

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? THEME_COLORS[currentTone] : THEME_COLORS.light);
}

// Follow the OS while the preference is "system".
onMount(themePreference, () => {
  const media = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
  if (!media) return;

  const onChange = () => {
    if (themePreference.get() === 'system') applyAppearance();
  };

  media.addEventListener('change', onChange);

  return () => media.removeEventListener('change', onChange);
});
