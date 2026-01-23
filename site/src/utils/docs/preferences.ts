import type { AstroCookies } from 'astro';
import type { AnySupportedStyle, SupportedFramework, SupportedStyle } from '@/types/docs';
import { isValidFramework, isValidStyleForFramework } from '@/types/docs';

// Cookie names
export const FRAMEWORK_COOKIE = 'vjs_docs_framework';
export const STYLE_COOKIE = 'vjs_docs_style';

// Cookie options for client-side (1 year expiration)
const COOKIE_MAX_AGE = 31536000; // 1 year in seconds
const COOKIE_OPTIONS = `max-age=${COOKIE_MAX_AGE}; path=/; samesite=lax`;

/**
 * Server-side API: Works with Astro.cookies
 */

interface NoPreference {
  framework: null;
  style: null;
}
interface NoStylePreference {
  framework: SupportedFramework;
  style: null;
}
interface FullPreference {
  framework: SupportedFramework;
  style: AnySupportedStyle;
}
export type Preference = NoPreference | NoStylePreference | FullPreference;

export function getPreferencesServer(cookies: AstroCookies): Preference {
  const frameworkCookie = cookies.has(FRAMEWORK_COOKIE) ? cookies.get(FRAMEWORK_COOKIE) : null;
  const styleCookie = cookies.has(STYLE_COOKIE) ? cookies.get(STYLE_COOKIE) : null;

  const framework = frameworkCookie && isValidFramework(frameworkCookie.value) ? frameworkCookie.value : null;
  const style =
    styleCookie && framework && isValidStyleForFramework(framework, styleCookie.value) ? styleCookie.value : null;
  return { framework, style } as Preference;
}

/**
 * Client-side API: Works with document.cookie
 */

export function getPreferenceClient(): Preference {
  if (typeof document === 'undefined') return { framework: null, style: null };

  const cookies = document.cookie.split(';').reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key) acc[key] = value;
      return acc;
    },
    {} as Record<string, string>
  );

  const framework =
    cookies[FRAMEWORK_COOKIE] && isValidFramework(cookies[FRAMEWORK_COOKIE]) ? cookies[FRAMEWORK_COOKIE] : null;
  const style =
    framework && cookies[STYLE_COOKIE] && isValidStyleForFramework(framework, cookies[STYLE_COOKIE])
      ? cookies[STYLE_COOKIE]
      : null;

  return { framework, style } as Preference;
}

export function setPreferenceClient<T extends SupportedFramework>(framework: T, style: SupportedStyle<T>) {
  if (typeof document === 'undefined') return;
  if (!isValidFramework(framework)) throw new Error(`Invalid framework: ${framework}`);
  if (!isValidStyleForFramework(framework, style))
    throw new Error(`Invalid style "${style}" for framework "${framework}"`);

  document.cookie = `${FRAMEWORK_COOKIE}=${framework}; ${COOKIE_OPTIONS}`;
  document.cookie = `${STYLE_COOKIE}=${style}; ${COOKIE_OPTIONS}`;
}
