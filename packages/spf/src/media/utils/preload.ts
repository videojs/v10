/**
 * The W3C-standard set of `<video>`/`<audio>` `preload` attribute values.
 * SPF allows extended values (e.g. `'canplay'`) on `state.preload`, which
 * are *not* reflected to the DOM — predicate below is the discriminator.
 */
export type StandardPreload = 'auto' | 'metadata' | 'none';

export function isStandardPreload(value: unknown): value is StandardPreload {
  return value === 'auto' || value === 'metadata' || value === 'none';
}

const DEFAULT_BLOCKING_PRELOADS = ['none'] as const;

/**
 * True when the preload value blocks initial resolution / loading.
 * Falsy values (undefined, empty) always block; otherwise blocked iff the
 * value appears in `blockingPreloads` (default `['none']`).
 */
export function isBlockingPreload(
  preload: string | undefined,
  blockingPreloads: readonly string[] = DEFAULT_BLOCKING_PRELOADS
): boolean {
  return !preload || blockingPreloads.includes(preload);
}
