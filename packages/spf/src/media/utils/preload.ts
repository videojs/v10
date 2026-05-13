/**
 * The W3C-standard set of `<video>`/`<audio>` `preload` attribute values.
 * SPF allows extended values (e.g. `'canplay'`) on `state.preload`, which
 * are *not* reflected to the DOM — predicate below is the discriminator.
 */
export type StandardPreload = 'auto' | 'metadata' | 'none';

export function isStandardPreload(value: unknown): value is StandardPreload {
  return value === 'auto' || value === 'metadata' || value === 'none';
}

/**
 * True when the preload value blocks initial resolution / loading.
 * Falsy values (undefined, empty) fall back to `defaultPreload` (default
 * `'metadata'`); the resolved value blocks iff it is `'none'`.
 */
export function isBlockingPreload(preload: string | undefined, defaultPreload: StandardPreload = 'metadata'): boolean {
  return (preload || defaultPreload) === 'none';
}
