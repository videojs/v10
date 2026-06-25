/**
 * **Per-type config bundles for per-type behavior variants.**
 *
 * Each `*_TYPE_CONFIG` constant names the per-type slot keys that
 * per-type-variant setup-shape helpers consume. Variants reference the
 * shared constant at their `defineBehavior` setup body rather than
 * constructing the config inline, so the per-type identity (which state
 * slot, which context slot, which discriminant) lives in one place per
 * type.
 *
 * Variants spread their composition-time `config` over the defaults so
 * engines can layer composition-supplied additions on top (e.g. a
 * custom fetch closure, a non-default segment resolver). Defaults
 * first, engine config second.
 *
 * Helpers continue to consume their slice via the existing typed-key
 * generics (`<K extends SelectedTrackKey>` etc.); the extra fields on
 * the config object (carrying facets other helpers care about) are fine
 * under structural typing.
 */

/**
 * Type-identity bundle for video-track-typed behaviors.
 *
 * @see setupVideoBufferActors, loadVideoSegments
 */
export const VIDEO_TYPE_CONFIG = {
  type: 'video',
  selectedKey: 'selectedVideoTrackId',
  actorKey: 'videoBufferActor',
  loaderKey: 'videoSegmentLoaderActor',
} as const;

/**
 * Type-identity bundle for audio-track-typed behaviors.
 *
 * @see setupAudioBufferActors, loadAudioSegments
 */
export const AUDIO_TYPE_CONFIG = {
  type: 'audio',
  selectedKey: 'selectedAudioTrackId',
  actorKey: 'audioBufferActor',
  loaderKey: 'audioSegmentLoaderActor',
} as const;

/**
 * Type-identity bundle for text-track-typed behaviors. Text tracks have
 * no `SourceBufferActor` (MSE doesn't apply), so this bundle omits
 * `actorKey`. The `loaderKey` points at the text-track-segment-loader
 * actor (a `MessageActor` with continue-vs-preempt semantics, parallel
 * to v/a's `SegmentLoaderActor`).
 *
 * @see loadTextTrackSegments, setupTextTrackActors
 */
export const TEXT_TYPE_CONFIG = {
  type: 'text',
  selectedKey: 'selectedTextTrackId',
  loaderKey: 'textTrackSegmentLoaderActor',
} as const;
