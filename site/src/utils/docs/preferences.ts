import type { AnySupportedStyle, SupportedFramework, SupportedStyle } from '@/types/docs';
import { DEFAULT_FRAMEWORK, isValidFramework, isValidStyleForFramework } from '@/types/docs';

// Cookie name for framework (server-side redirects)
export const FRAMEWORK_COOKIE = 'vjs_docs_framework';

// LocalStorage key prefix for style (per-framework, client-side only)
export const STYLE_STORAGE_KEY_PREFIX = 'vjs_docs_style_';

// Cookie options for client-side (1 year expiration)
const COOKIE_MAX_AGE = 31536000; // 1 year in seconds
const COOKIE_OPTIONS = `max-age=${COOKIE_MAX_AGE}; path=/; samesite=lax`;

/**
 * Server-side API: Works with Astro.cookies
 */

interface NoPreference {
  framework: null;
}
interface FrameworkPreference {
  framework: SupportedFramework;
}
export type Preference = NoPreference | FrameworkPreference;

interface CookieReader {
  has(name: string): boolean;
  get(name: string): { value: string } | null | undefined;
}

export function getPreferencesServer(cookies: CookieReader): Preference {
  const frameworkCookie = cookies.has(FRAMEWORK_COOKIE) ? cookies.get(FRAMEWORK_COOKIE) : null;

  const framework = frameworkCookie && isValidFramework(frameworkCookie.value) ? frameworkCookie.value : null;
  return /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ {
    framework,
  } as Preference;
}

/**
 * Client-side API: Works with document.cookie and localStorage
 */

export function getFrameworkPreferenceClient(): SupportedFramework | null {
  const currentDocument = globalThis.document;
  if (!currentDocument) return null;

  const cookies = currentDocument.cookie.split(';').reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key) acc[key] = value;
      return acc;
    },
    /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ {} as Record<
      string,
      string
    >
  );

  const framework = cookies[FRAMEWORK_COOKIE];
  return framework && isValidFramework(framework) ? framework : DEFAULT_FRAMEWORK;
}

export function setFrameworkPreferenceClient(framework: SupportedFramework): void {
  const currentDocument = globalThis.document;
  if (!currentDocument) return;
  if (!isValidFramework(framework)) throw new Error(`Invalid framework: ${framework}`);

  currentDocument.cookie = `${FRAMEWORK_COOKIE}=${framework}; ${COOKIE_OPTIONS}`;
}

/**
 * Get style preference from localStorage for a specific framework
 */
export function getStylePreferenceClient<F extends SupportedFramework>(framework: F): SupportedStyle<F> | null {
  const currentStorage = globalThis.localStorage;
  if (!currentStorage) return null;

  const storageKey = STYLE_STORAGE_KEY_PREFIX + framework;
  const style = currentStorage.getItem(storageKey);

  if (style && isValidStyleForFramework(framework, style)) {
    return /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ style as SupportedStyle<F>;
  }
  return null;
}

/**
 * Set style preference in localStorage for a specific framework
 */
export function setStylePreferenceClient<F extends SupportedFramework>(framework: F, style: SupportedStyle<F>): void {
  const currentStorage = globalThis.localStorage;
  if (!currentStorage) return;
  if (!isValidStyleForFramework(framework, style)) {
    throw new Error(`Invalid style "${style}" for framework "${framework}"`);
  }

  const storageKey = STYLE_STORAGE_KEY_PREFIX + framework;
  currentStorage.setItem(storageKey, style);
}

/**
 * Update the DOM data-style attribute to match the current style
 */
export function updateStyleAttribute(style: AnySupportedStyle): void {
  const currentDocument = globalThis.document;
  if (!currentDocument) return;
  currentDocument.documentElement.dataset.style = style;
}
