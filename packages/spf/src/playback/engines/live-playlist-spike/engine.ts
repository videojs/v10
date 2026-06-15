/**
 * **POC SPIKE** — a composition that *just handles playlists*.
 *
 * The smallest engine that exercises the live foundation
 * ([live-presentation-modeling.md](../../../../../internal/design/spf/live-presentation-modeling.md)):
 * resolve the multivariant manifest, pick a video rendition, then reload that
 * track's media playlist on a target-duration cadence, merging snapshots — no
 * MSE, no SourceBuffers, no segment fetching, no DOM. Point it at a live stream
 * and observe `state.presentation` evolve (segments append / roll off;
 * duration / streamType / live edge derivable from the resolved track).
 *
 * Drive it via `onSignalsReady`: set `presentation = { url }`. Selection and
 * reloading then run on their own.
 */
import {
  type Composition,
  type ContextSignals,
  createComposition,
  type StateSignals,
} from '../../../core/composition/create-composition';
import { makeShareSignals, type ShareSignalsConfig } from '../../../core/composition/share-signals';
import { parseMultivariantPlaylist } from '../../../media/hls/parse-multivariant';
import { pickHighestResolutionVideoTrack, type TrackPicker } from '../../../media/primitives/select-tracks';
import type { MaybeResolvedPresentation } from '../../../media/types';
import { reloadVideoTrack } from '../../behaviors/reload-track';
import { type ParsePresentation, resolvePresentation } from '../../behaviors/resolve-presentation';
import { type SelectVideoTrackConfig, selectVideoTrack } from '../../behaviors/select-tracks';

export interface LivePlaylistSpikeState {
  presentation?: MaybeResolvedPresentation;
  selectedVideoTrackId?: string;
  preload?: 'auto' | 'metadata' | 'none';
  loadActivated?: boolean;
}

export type LivePlaylistSpikeContext = Record<never, never>;

export type LivePlaylistSpikeSignals = {
  state: StateSignals<LivePlaylistSpikeState>;
  context: ContextSignals<LivePlaylistSpikeContext>;
};

export interface LivePlaylistSpikeConfig extends ShareSignalsConfig<LivePlaylistSpikeState, LivePlaylistSpikeContext> {
  /** Video-track picker handed to `selectVideoTrack`. Default: max resolution. */
  picker?: TrackPicker<SelectVideoTrackConfig>;
  /** Multivariant parser. Defaults to the HLS multivariant-playlist parser. */
  parsePresentation?: ParsePresentation;
}

const shareSignals = makeShareSignals<LivePlaylistSpikeState, LivePlaylistSpikeContext>();

export function createLivePlaylistSpikeEngine(
  config: LivePlaylistSpikeConfig = {}
): Composition<LivePlaylistSpikeState, LivePlaylistSpikeContext> {
  const finalConfig = {
    ...config,
    picker: config.picker ?? pickHighestResolutionVideoTrack,
    parsePresentation: config.parsePresentation ?? parseMultivariantPlaylist,
  };

  return createComposition([resolvePresentation, selectVideoTrack, reloadVideoTrack, shareSignals], {
    config: finalConfig,
    // Spike skips the preload gate — resolve as soon as a url is set.
    initialState: { loadActivated: true },
  });
}
