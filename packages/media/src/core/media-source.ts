import type { MediaSourceObject } from './types';

/**
 * Resolve the structured source a `src` describes.
 *
 * `src` is the only identity field in the base shape, so every other option
 * carries over from `previous` — assigning `src` never drops engine
 * configuration. Returns `null` when neither a URL nor any option is set, so an
 * empty host has an empty `source`.
 *
 * Hosts with identity of their own (a Mux playback ID, say) resolve their source
 * themselves rather than calling this.
 */
export function resolveSourceObject<Source extends MediaSourceObject>(
  src: string,
  previous?: Source | null
): Source | null {
  const { src: _previousSrc, ...options } = previous ?? {};
  const source = { ...options, ...(src ? { src } : null) } as Source;
  return Object.keys(source).length > 0 ? source : null;
}
