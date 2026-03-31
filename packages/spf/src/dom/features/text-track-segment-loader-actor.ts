import type { ActorSnapshot, SignalActor } from '../../core/actor';
import { getSegmentsToLoad } from '../../core/buffer/forward-buffer';
import type { ReadonlySignal } from '../../core/signals/primitives';
import { signal, untrack, update } from '../../core/signals/primitives';
import { SerialRunner, Task } from '../../core/task';
import type { TextTrack } from '../../core/types';
import { parseVttSegment } from '../text/parse-vtt-segment';
import type { TextTracksActor } from './text-tracks-actor';

// =============================================================================
// Types
// =============================================================================

export type TextTrackSegmentLoaderStatus = 'idle' | 'loading' | 'destroyed';

export type TextTrackSegmentLoaderSnapshot = ActorSnapshot<TextTrackSegmentLoaderStatus, object>;

export type TextTrackSegmentLoaderMessage = {
  type: 'load';
  track: TextTrack;
  currentTime: number;
};

// =============================================================================
// Implementation
// =============================================================================

/**
 * Loads VTT segments for a text track and delegates cue management to a
 * TextTracksActor. Mirrors the SegmentLoaderActor/SourceBufferActor pattern
 * for the text track equivalent.
 *
 * Planning is done in send(): segments already recorded in TextTracksActor's
 * context are skipped. Each new send() preempts in-flight work via abortAll()
 * before scheduling fresh tasks.
 */
export class TextTrackSegmentLoaderActor implements SignalActor<TextTrackSegmentLoaderStatus, object> {
  readonly #textTracksActor: TextTracksActor;
  readonly #snapshotSignal = signal<TextTrackSegmentLoaderSnapshot>({
    status: 'idle',
    context: {},
  });
  readonly #runner = new SerialRunner();

  constructor(textTracksActor: TextTracksActor) {
    this.#textTracksActor = textTracksActor;
  }

  get snapshot(): ReadonlySignal<TextTrackSegmentLoaderSnapshot> {
    return this.#snapshotSignal;
  }

  send(message: TextTrackSegmentLoaderMessage): void {
    const status = untrack(() => this.#snapshotSignal.get().status);
    if (status === 'destroyed') return;
    const { track, currentTime } = message;
    const trackId = track.id;
    const bufferedSegments = untrack(() => this.#textTracksActor.snapshot.get().context.segments[trackId] ?? []);
    const segmentsToLoad = getSegmentsToLoad(track.segments, bufferedSegments, currentTime);

    // Preempt any in-flight work before scheduling the new plan.
    this.#runner.abortAll();
    if (!segmentsToLoad.length) {
      update(this.#snapshotSignal, { status: 'idle' });
      return;
    }

    update(this.#snapshotSignal, { status: 'loading' });

    // Capture actor reference so Tasks close over it, not `this`.
    const textTracksActor = this.#textTracksActor;
    segmentsToLoad.forEach((segment) => {
      this.#runner.schedule(
        new Task(async (signal) => {
          if (signal.aborted) return;
          try {
            const cues = await parseVttSegment(segment.url);
            if (signal.aborted) return;
            textTracksActor.send({
              type: 'add-cues',
              meta: { trackId, id: segment.id, startTime: segment.startTime, duration: segment.duration },
              cues,
            });
          } catch (error) {
            // Graceful degradation: log and continue to the next segment.
            console.error('Failed to load VTT segment:', error);
          }
        })
      );
    });

    // Transition to idle when this generation's tasks all settle.
    // runner.settled is the chain tail after the tasks above; if a new send()
    // arrives and abortAll() + new scheduling advances the chain, the reference
    // will differ and the stale callback is a no-op.
    const settled = this.#runner.settled;
    settled.then(() => {
      if (this.#runner.settled !== settled) return;
      if (this.#snapshotSignal.get().status !== 'destroyed') {
        update(this.#snapshotSignal, { status: 'idle' });
      }
    });
  }

  destroy(): void {
    if (this.#snapshotSignal.get().status === 'destroyed') return;
    this.#runner.destroy();
    update(this.#snapshotSignal, { status: 'destroyed' });
  }
}
