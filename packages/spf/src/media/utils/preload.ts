/**
 * The W3C-standard set of `<video>`/`<audio>` `preload` attribute values. SPF allows extended values (e.g. `'canplay'`)
 * on `state.preload`, which are _not_ reflected to the DOM — predicate below is the discriminator.
 */
export type StandardPreload = 'auto' | 'metadata' | 'none';

export function isStandardPreload(value: unknown): value is StandardPreload {
  return value === 'auto' || value === 'metadata' || value === 'none';
}

/**
 * Default `preload` value used as the fallback across behaviors (`syncPreload`, `resolvePresentation`,
 * `isBlockingPreload`). SPF's own default, deliberately independent of the `<video>`/`<audio>` element's implicit
 * default — that one is UA policy and browser-dependent (`'metadata'` Chromium, `'auto'` WebKit), never a source.
 */
export const DEFAULT_PRELOAD = 'metadata';

/**
 * True when the preload value blocks initial resolution / loading. Falsy values (undefined, empty) fall back to
 * `defaultPreload` (default `DEFAULT_PRELOAD`); the resolved value blocks iff it is `'none'`.
 */
export function isBlockingPreload(
  preload: string | undefined,
  defaultPreload: StandardPreload = DEFAULT_PRELOAD
): boolean {
  return (preload || defaultPreload) === 'none';
}
