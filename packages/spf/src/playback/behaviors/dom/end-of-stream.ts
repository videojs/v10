/**
 * **Drive each `open → ended` transition of the MediaSource.** Calls
 * `MediaSource.endOfStream()` once the temporally last segments of all
 * selected non-text tracks are fully appended and the user has reached
 * them — letting the browser finalize duration and fire `ended` on the
 * media element.
 *
 * Re-fires on every subsequent `open → ended → open` cycle. Per the MSE
 * spec, `appendBuffer()` after `endOfStream()` transitions the MediaSource
 * back to `'open'`; seek-back replays and back-buffer refills that re-load
 * earlier segments take this path, so the behavior must call
 * `endOfStream()` again once the last segments are reappended. The reactor's
 * `'preconditions-unmet'` ↔ `'eos-ready'` cycle *is* the re-arm mechanism:
 * a successful `endOfStream()` flips `mediaSourceReadyState` to `'ended'`,
 * which exits `'eos-ready'`; the next `'open'` re-evaluates preconditions
 * and may re-enter.
 *
 * The entry resolves the MSE-spec preconditions in order before mutating
 * the MediaSource:
 *
 * 1. **MediaElement metadata** — `waitForMediaElementMetadata` defers until
 *    `readyState >= HAVE_METADATA`. Chromium throws DEMUXER_ERROR if
 *    `endOfStream()` is called before metadata is parsed.
 * 2. **All SourceBuffers idle** — `waitForSourceBuffersReady` defers per
 *    the MSE-spec rule that `endOfStream()` cannot be called while any
 *    buffer has `updating === true`.
 * 3. **Buffered-range clamp** — `getMaxBufferedEnd` sets the final
 *    duration from actual container timestamps (more accurate than the
 *    playlist-derived value for both shorter-than-declared and
 *    longer-than-declared assets). `endOfStream()` only clamps up
 *    implicitly; setting it explicitly here keeps the final value
 *    deterministic.
 *
 * The buffer-set helpers operate across `mediaSource.sourceBuffers` (the
 * canonical aggregate), so the behavior composes uniformly across
 * audio-only, video-only, and mixed configurations.
 *
 * `currentTime` gates state entry: it must have reached the last segment's
 * `startTime`. Without this, back-buffer `remove()`/`appendBuffer()` work
 * during the middle of playback briefly re-opens the MediaSource (the
 * spec's `'ended' → 'open'` transition fires on either mutation), which
 * would otherwise drive a spurious `'eos-ready'` re-entry.
 *
 * Source-identity-driven via `state.presentation`. State-exit cleanup
 * (`controller.abort()`) cancels any in-flight wait on source unload,
 * presentation replace, or behavior destroy.
 *
 * Concurrent with `updateMediaSourceDuration`, which writes the initial
 * `mediaSource.duration` from `presentation.duration`; this behavior
 * writes the final value from the buffered end. The two domains don't
 * overlap (initial-from-playlist vs final-from-container-timestamps).
 */
import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { computed, type ReadonlySignal } from '../../../core/signals/primitives';
import { waitForMediaElementMetadata } from '../../../media/dom/mediaelement-setup';
import { getMaxBufferedEnd, waitForSourceBuffersReady } from '../../../media/dom/mse/duration';
import { hasLastSegmentLoaded } from '../../../media/dom/mse/end-of-stream';
import type { MaybeResolvedPresentation } from '../../../media/types';
import { isResolvedTrack } from '../../../media/types';
import { getSelectedTrack, type TrackSelectionState } from '../../../media/utils/track-selection';
import type { SourceBufferActor } from '../../actors/dom/source-buffer';

export interface EndOfStreamState extends Omit<TrackSelectionState, 'selectedTextTrackId'> {
  presentation?: MaybeResolvedPresentation;
  currentTime?: number;
  /** Reactive mirror of `mediaSource.readyState` — updated via DOM events. */
  mediaSourceReadyState?: MediaSource['readyState'];
}

export interface EndOfStreamContext {
  mediaSource?: MediaSource;
  mediaElement?: HTMLMediaElement | undefined;
  videoBufferActor?: SourceBufferActor;
  audioBufferActor?: SourceBufferActor;
}

type EndOfStreamFsmState = 'preconditions-unmet' | 'eos-ready';

function deriveState(
  presentation: MaybeResolvedPresentation | undefined,
  mediaSource: MediaSource | undefined,
  mediaSourceReadyState: MediaSource['readyState'] | undefined,
  selectedVideoTrackId: string | undefined,
  selectedAudioTrackId: string | undefined,
  videoBufferActor: SourceBufferActor | undefined,
  audioBufferActor: SourceBufferActor | undefined,
  currentTime: number | undefined
): EndOfStreamFsmState {
  if (!mediaSource || !presentation || mediaSourceReadyState !== 'open') {
    return 'preconditions-unmet';
  }

  const hasVideo = !!selectedVideoTrackId;
  const hasAudio = !!selectedAudioTrackId;

  // A selected track must have its actor available before its last segment
  // can be appended. Without one the selected-tracks-vs-buffers wiring isn't
  // yet complete; bail and wait.
  if (hasVideo && !videoBufferActor) return 'preconditions-unmet';
  if (hasAudio && !audioBufferActor) return 'preconditions-unmet';

  // Buffer actors must be idle. The actor stays in 'updating' for the entire
  // multi-chunk append (only flipping to 'idle' once the runner settles —
  // i.e. no more queued or in-flight tasks). `buffer.updating` alone is
  // insufficient: for chunked fMP4 streaming, `updateend` fires after each
  // chunk while the actor's for-await loop synchronously enqueues the next
  // `appendBuffer()` — so the buffer flips `!updating → updating` across a
  // microtask boundary. Entering 'eos-ready' against an updating actor
  // races the entry's `mediaSource.duration = X` write against the next
  // chunk's appendBuffer, throwing InvalidStateError.
  if (videoBufferActor?.snapshot.get().value === 'updating') return 'preconditions-unmet';
  if (audioBufferActor?.snapshot.get().value === 'updating') return 'preconditions-unmet';

  const trackState: TrackSelectionState = { presentation, selectedVideoTrackId, selectedAudioTrackId };

  // Reading actor.snapshot inside this body subscribes the surrounding
  // `computed` to each actor's snapshot signal — segment-append progress
  // drives re-evaluation.
  if (
    !hasLastSegmentLoaded(trackState, {
      video: videoBufferActor?.snapshot.get().context.segments,
      audio: audioBufferActor?.snapshot.get().context.segments,
    })
  ) {
    return 'preconditions-unmet';
  }

  // currentTime gate: prevents 'eos-ready' entry when a back-buffer
  // remove()/appendBuffer() briefly re-opens the MediaSource while the
  // user is mid-stream. HLS rendition time-alignment means any active
  // track works as the time reference.
  const refTrack =
    (hasVideo ? getSelectedTrack(trackState, 'video') : undefined) ??
    (hasAudio ? getSelectedTrack(trackState, 'audio') : undefined);
  if (refTrack && isResolvedTrack(refTrack) && refTrack.segments.length > 0) {
    const lastSeg = refTrack.segments[refTrack.segments.length - 1]!;
    if ((currentTime ?? 0) < lastSeg.startTime) return 'preconditions-unmet';
  }

  return 'eos-ready';
}

function endOfStreamSetup({
  state,
  context,
}: {
  state: {
    presentation: ReadonlySignal<EndOfStreamState['presentation']>;
    selectedVideoTrackId: ReadonlySignal<EndOfStreamState['selectedVideoTrackId']>;
    selectedAudioTrackId: ReadonlySignal<EndOfStreamState['selectedAudioTrackId']>;
    currentTime: ReadonlySignal<EndOfStreamState['currentTime']>;
    mediaSourceReadyState: ReadonlySignal<EndOfStreamState['mediaSourceReadyState']>;
  };
  context: {
    mediaSource: ReadonlySignal<EndOfStreamContext['mediaSource']>;
    mediaElement: ReadonlySignal<EndOfStreamContext['mediaElement']>;
    videoBufferActor: ReadonlySignal<EndOfStreamContext['videoBufferActor']>;
    audioBufferActor: ReadonlySignal<EndOfStreamContext['audioBufferActor']>;
  };
}): Reactor<EndOfStreamFsmState | 'destroying' | 'destroyed'> {
  const derivedStateSignal = computed(() =>
    deriveState(
      state.presentation.get(),
      context.mediaSource.get(),
      state.mediaSourceReadyState.get(),
      state.selectedVideoTrackId.get(),
      state.selectedAudioTrackId.get(),
      context.videoBufferActor.get(),
      context.audioBufferActor.get(),
      state.currentTime.get()
    )
  );

  return createMachineReactor<EndOfStreamFsmState>({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {},

      'eos-ready': {
        // entry body is auto-untracked. deriveState handles source resets
        // and the MS readyState flip from 'open' to 'ended' that
        // endOfStream() produces; this entry resolves the MSE-spec
        // preconditions and binds its cleanup (abort) to state exit +
        // destroy.
        entry: () => {
          const mediaSource = context.mediaSource.get()!;
          const mediaElement = context.mediaElement.get();
          const controller = new AbortController();

          const endStreamWhenReady = async () => {
            if (mediaElement) {
              await waitForMediaElementMetadata(mediaElement, controller.signal);
              if (controller.signal.aborted) return;
            }

            await waitForSourceBuffersReady(mediaSource.sourceBuffers, controller.signal);
            if (controller.signal.aborted) return;

            // Narrow race: another behavior (or our own previous call) could
            // have transitioned readyState out of 'open' between our wait
            // resolution and here. Re-read the DOM property to catch this.
            if (mediaSource.readyState !== 'open') return;

            // MSE spec: duration cannot be less than any buffered range, and
            // endOfStream() will only clamp up implicitly. Setting it
            // explicitly here from actual container timestamps keeps the
            // final value deterministic for assets whose declared duration
            // disagrees with the buffered end (common with CMAF).
            const bufferedEnd = getMaxBufferedEnd(mediaSource.sourceBuffers);
            if (bufferedEnd > 0) mediaSource.duration = bufferedEnd;

            mediaSource.endOfStream();
          };

          endStreamWhenReady().catch((err) => console.error('Failed to call endOfStream:', err));

          return () => controller.abort();
        },
      },
    },
  });
}

export const endOfStream = defineBehavior({
  stateKeys: ['presentation', 'selectedVideoTrackId', 'selectedAudioTrackId', 'currentTime', 'mediaSourceReadyState'],
  contextKeys: ['mediaSource', 'mediaElement', 'videoBufferActor', 'audioBufferActor'],
  setup: endOfStreamSetup,
});
