import { effect } from '../../core/signals/effect';
import { computed, type Signal, update } from '../../core/signals/primitives';
import { createSourceBuffer } from '../../media/dom/mse/mediasource-setup';
import type { Presentation, ResolvedTrack } from '../../media/types';
import { isResolvedTrack } from '../../media/types';
import { BufferKeyByType, getSelectedTrack, type TrackSelectionState } from '../../media/utils/track-selection';
import { createSourceBufferActor, type SourceBufferActor } from '../actors/dom/source-buffer';

/**
 * Media track type for SourceBuffer setup.
 * Text tracks are excluded as they don't use MSE SourceBuffers.
 */
export type MediaTrackType = 'video' | 'audio';

const ActorKeyByType = {
  video: 'videoBufferActor',
  audio: 'audioBufferActor',
} as const satisfies Record<MediaTrackType, keyof SourceBufferOwners>;

/**
 * State shape for SourceBuffer setup.
 */
export interface SourceBufferState extends TrackSelectionState {
  presentation?: Presentation;
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
}

/**
 * Owners shape for SourceBuffer setup.
 */
export interface SourceBufferOwners {
  mediaSource?: MediaSource;
  videoBuffer?: SourceBuffer;
  audioBuffer?: SourceBuffer;
  videoBufferActor?: SourceBufferActor;
  audioBufferActor?: SourceBufferActor;
}

/**
 * Build MIME codec string from track metadata.
 *
 * @param track - Resolved track with mimeType and codecs
 * @returns MIME codec string (e.g., 'video/mp4; codecs="avc1.42E01E,mp4a.40.2"')
 *
 * @example
 * buildMimeCodec({ mimeType: 'video/mp4', codecs: ['avc1.42E01E'] })
 * // => 'video/mp4; codecs="avc1.42E01E"'
 */
export function buildMimeCodec(track: ResolvedTrack): string {
  const codecString = track.codecs?.join(',') ?? '';
  return `${track.mimeType}; codecs="${codecString}"`;
}

/**
 * Setup all needed SourceBuffers as a single coordinated operation.
 *
 * Waits until ALL media tracks in the presentation are resolved with codecs,
 * then creates every SourceBuffer in one synchronous block before setting
 * owners. This guarantees that downstream consumers (e.g. loadSegments) never
 * see a partial set of SourceBuffers — preventing the Firefox bug where
 * appending to a video SourceBuffer before the audio SourceBuffer exists
 * causes mozHasAudio to be permanently false.
 *
 * Handles video-only, audio-only, and combined presentations correctly:
 * track types are derived from the presentation rather than hardcoded.
 *
 * @example
 * const cleanup = setupSourceBuffers({ state, owners });
 */
export function setupSourceBuffers<S extends SourceBufferState, O extends SourceBufferOwners>({
  state,
  owners,
}: {
  state: Signal<S>;
  owners: Signal<O>;
}): () => void {
  // Derive which media track types this presentation actually contains
  const presentationTypesSignal = computed((): MediaTrackType[] => {
    const { presentation } = state.get();
    if (!presentation || !('selectionSets' in presentation)) return [];
    return presentation.selectionSets
      .map(({ type }) => type)
      .filter((type): type is MediaTrackType => type === 'video' || type === 'audio');
  });

  // All presentation track types must have a selected, resolved track with codecs
  const canSetupSignal = computed(() => {
    const types = presentationTypesSignal.get();
    if (!owners.get().mediaSource || types.length === 0) return false;
    const s = state.get();
    return types.every((type) => {
      const track = getSelectedTrack(s, type);
      return track && isResolvedTrack(track) && !!track.codecs?.length;
    });
  });

  // DOM-observable "already done" guard — once all presentation buffers exist in owners, setup has run
  const shouldSetupSignal = computed(() => {
    const o = owners.get();
    return presentationTypesSignal.get().every((type) => !o[BufferKeyByType[type]]);
  });

  const cleanupEffect = effect(() => {
    if (!canSetupSignal.get() || !shouldSetupSignal.get()) return;

    const s = state.get();
    const o = owners.get();

    // Create all SourceBuffers synchronously — no await between addSourceBuffer
    // calls — then set owners once so subscribers see all buffers simultaneously.
    const patch: Partial<SourceBufferOwners> = {};

    for (const type of presentationTypesSignal.get()) {
      const track = getSelectedTrack(s, type) as ResolvedTrack;
      const buffer = createSourceBuffer(o.mediaSource!, buildMimeCodec(track));
      patch[BufferKeyByType[type]] = buffer;
      patch[ActorKeyByType[type]] = createSourceBufferActor(buffer);
    }

    update(owners, patch);
  });

  return cleanupEffect;
}
