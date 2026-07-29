/**
 * The first-parse placement gate — the coordination seam between track
 * resolution (`resolve-track`, which awaits it between fetching a media
 * playlist and parsing it) and the establishment unit that supplies the
 * policy (`establishStartMediaTime` exports `gateFirstParseOnAnchor`). It
 * lives here rather than with either behavior so the two coordinate through
 * an injected contract, never by importing each other; a playback-domain
 * contract (it names selected track ids), so not `media/`.
 * See `internal/design/spf/live-presentation-timeline-model.md`.
 */
import type { MaybeResolvedPresentation } from '../../media/types';

/** The selected v/a track ids a {@link GateFirstParse} may designate a reference track from. */
export interface GateFirstParseContext {
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
}

/**
 * Whether `trackId`'s **first** parse may place its segments now. Pure over
 * the current presentation + selection — callers re-evaluate it reactively
 * (e.g. via `when`) until it opens. Returning `false` holds the parse, not
 * the fetch: playlist bytes may arrive concurrently; only placement waits.
 */
export type GateFirstParse = (
  presentation: MaybeResolvedPresentation | undefined,
  ctx: GateFirstParseContext,
  trackId: string
) => boolean;
