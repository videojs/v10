/**
 * The W3C-standard set of `<video>`/`<audio>` `preload` attribute values.
 * SPF allows extended values (e.g. `'canplay'`) on `state.preload`, which
 * are *not* reflected to the DOM — predicate below is the discriminator.
 */
export type StandardPreload = 'auto' | 'metadata' | 'none';

export function isStandardPreload(value: unknown): value is StandardPreload {
  return value === 'auto' || value === 'metadata' || value === 'none';
}
