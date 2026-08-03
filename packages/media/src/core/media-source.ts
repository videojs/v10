/**
 * Resolve the structured source a `src` describes.
 *
 * `src` is the only field describing which source to play, so everything else
 * carries over from `previous` — assigning `src` never drops the options saying
 * how to play it. Returns `null` when neither a URL nor any option is set, so an
 * empty host has an empty `source`.
 *
 * Hosts with identity of their own (a Mux playback ID, say) resolve their source
 * themselves rather than calling this.
 */
export function resolveSourceObject<Source extends { src?: string | undefined }>(
  src: string,
  previous?: Source | null
): Source | null {
  const { src: _previousSrc, ...options } = previous ?? {};
  const source = { ...options, ...(src ? { src } : null) } as Source;
  return Object.keys(source).length > 0 ? source : null;
}
