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

import { NON_FMP4_CONTAINER_MIMES } from '../hls/parse-media-playlist';
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
 *
 * Detected non-fMP4 containers (`video/mp2t`, `audio/aac`) are asserted
 * unsupported regardless of the probe, so they're pruned before selection
 * (the type makes no pick) instead of failing/stalling deep in the pipeline.
 * Two different reasons, neither UA-based:
 *
 * - **MPEG-TS** can't be played at all here: `isTypeSupported('video/mp2t…')` is
 *   a genuine false positive on Chromium (reports `true` but appends produce no
 *   buffered range), and this engine has no TS transmux pipeline.
 * - **Raw ADTS AAC** is a *temporary* limitation. The browser genuinely
 *   supports it (Chrome/Safari decode `audio/aac`; Firefox doesn't), so it could
 *   be made playable — but our segment actors / loading behaviors / append
 *   pipeline assume every rendition has an `EXT-X-MAP` init segment (e.g. an
 *   `append-init` task with an empty URL, fMP4-shaped append handling). Until
 *   that init-segment assumption is removed, ADTS would fetch but never buffer
 *   (a silent stall), so we assert it unplayable for now. FOLLOW-UP: drop the
 *   init-required assumption in the pipeline and switch this to a bare-MIME
 *   probe (`buildMimeCodec` would project `audio/aac` with no codecs) so it
 *   plays where the browser supports it.
 *
 * Override via the engine's `canPlayTrack` config when those pipelines land.
 */
export const canPlayTrack: CanPlayTrack = (track) => {
  if (track.mimeType && NON_FMP4_CONTAINER_MIMES.has(track.mimeType)) return false;
  if (!track.mimeType || !track.codecs?.length) return true;
  const mimeCodec = buildMimeCodec({ mimeType: track.mimeType, codecs: track.codecs });
  const cached = codecSupportCache.get(mimeCodec);
  if (cached !== undefined) return cached;
  const supported = isCodecSupported(mimeCodec);
  codecSupportCache.set(mimeCodec, supported);
  return supported;
};
