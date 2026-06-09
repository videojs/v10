/**
 * Capability probing — the engine's foundation for asking the browser what it
 * can actually decode before committing a rendition to the pipeline.
 *
 * Today this is the synchronous codec half: `canPlayTrack` answers "can this
 * environment play this track?" by building the track's MIME codec string and
 * passing it to `MediaSource.isTypeSupported` (via `isCodecSupported`). It's the
 * DOM implementation of the DOM-free `CanPlayTrack` predicate the
 * track-switching hard-constraint pre-pass consumes — injected through engine
 * config so the (DOM-free) behavior never imports a DOM API directly.
 *
 * Results are memoized by built MIME string: codec support is a pure function
 * of (codec, environment) and never changes after load, so probing is lazy
 * (per candidate, at constraint-apply time) but each unique MIME is asked once.
 *
 * Future cluster-D phases (async `requestMediaKeySystemAccess` key-system
 * probing, `SourceBuffer.changeType()` availability) extend this surface; the
 * async ones land as a state-slot writer behavior rather than a config
 * predicate, since their verdict resolves asynchronously.
 */

import type { CanPlayTrack } from '../types';
import { buildMimeCodec, isCodecSupported } from './mse/mediasource-setup';

const codecSupportCache = new Map<string, boolean>();

/**
 * Whether the environment can decode `track`, by codec. Builds the track's
 * MIME codec string and checks `MediaSource.isTypeSupported`, memoized by MIME.
 * A track without enough to probe — no `mimeType`, or no declared `codecs`
 * (CODECS is optional per the HLS spec) — is unprobeable and passes through as
 * playable (`true`) rather than being dropped; the late `createSourceBuffer`
 * check stays as the backstop for those.
 */
export const canPlayTrack: CanPlayTrack = (track) => {
  if (!track.mimeType || !track.codecs?.length) return true;
  const mimeCodec = buildMimeCodec({ mimeType: track.mimeType, codecs: track.codecs });
  const cached = codecSupportCache.get(mimeCodec);
  if (cached !== undefined) return cached;
  const supported = isCodecSupported(mimeCodec);
  codecSupportCache.set(mimeCodec, supported);
  return supported;
};
