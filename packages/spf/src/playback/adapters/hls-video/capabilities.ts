import {
  errorCapability,
  liveCapability,
  type MediaCapabilityDescriptor,
  type MediaSourceCapability,
  remotePlaybackCapability,
  sourceCapability,
  streamTypeCapability,
} from '@videojs/media';

/**
 * EXPLORATION (see #2573): the adapter's refinement of the canonical source capability.
 *
 * This adapter's `preload` mirrors IDL reflection, where `''` marks "unset" — a deliberate deviation from the
 * canonical descriptor's `'metadata'` fallback. Refining the descriptor encodes that deviation exactly once, where the
 * old hand-written defaults object let the two drift silently.
 */
export const hlsVideoSourceCapability = {
  ...sourceCapability,
  props: { ...sourceCapability.props, preload: { fallback: '' } },
} as const satisfies MediaCapabilityDescriptor<MediaSourceCapability>;

/**
 * EXPLORATION: the surface this adapter owns, declared as data — manifest-as-metadata.
 *
 * These members are implemented by the mixin rather than composed by `createMediaHost`, but declaring them keeps the
 * manifest an honest description of the official API: `supportsMediaCapability` answers for `stream-type`/`live`/
 * `error` even though the host composition dropped them, and `getMediaCapabilityEvents` derives the full event
 * vocabulary. What is deliberately NOT declared is `engine` — an exposed member that is not yet official API, and the
 * manifest is where that line is drawn.
 */
export const hlsVideoMediaCapabilities = [
  hlsVideoSourceCapability,
  remotePlaybackCapability,
  streamTypeCapability,
  liveCapability,
  errorCapability,
] as const;
